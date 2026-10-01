/**
 * One-time diagnostic for "invalid email or password" on admin login.
 *
 * Run it the same way you run the dev server / seed script:
 *   npx tsx scripts/diagnose-admin-login.ts
 *
 * It never prints your real password — only whether it matches — so it's
 * safe to paste the output back for troubleshooting. Delete this file once
 * you're done with it.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { AdminUser } from "../src/models";

const ROOT = resolve(__dirname, "..");

// Mirrors Next.js's real .env precedence for "next dev" (NODE_ENV=development):
// .env.development.local > .env.local > .env.development > .env
// First file wins per key; later files never override an already-set key.
function loadEnvNextStyle(): void {
  const files = [
    ".env.development.local",
    ".env.local",
    ".env.development",
    ".env",
  ];

  for (const file of files) {
    const envPath = resolve(ROOT, file);
    if (!existsSync(envPath)) continue;

    const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function maskUri(uri: string): string {
  try {
    // mongodb+srv://user:pass@host/db?params  ->  mongodb+srv://user:***@host/db
    const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (!match) return "<could not parse URI shape>";
    const [, scheme, user, , rest] = match;
    return `${scheme}${user}:***@${rest.split("?")[0]}`;
  } catch {
    return "<unparseable>";
  }
}

async function main() {
  loadEnvNextStyle();

  const mongoUri = process.env.MONGODB_URI;
  const adminEmailEnv = process.env.ADMIN_EMAIL;
  const adminPasswordEnv = process.env.ADMIN_PASSWORD;

  console.log("=== Environment resolved (Next.js dev precedence) ===");
  console.log("MONGODB_URI:", mongoUri ? maskUri(mongoUri) : "NOT SET");
  console.log(
    "ADMIN_EMAIL:",
    adminEmailEnv ? `[${adminEmailEnv}]` : "NOT SET"
  );
  console.log(
    "ADMIN_PASSWORD:",
    adminPasswordEnv
      ? `set, length ${adminPasswordEnv.length}${
          adminPasswordEnv !== adminPasswordEnv.trim()
            ? "  <-- HAS LEADING/TRAILING WHITESPACE"
            : ""
        }`
      : "NOT SET"
  );

  if (!mongoUri) {
    console.log("\nCannot continue: MONGODB_URI is not set in any .env file.");
    return;
  }

  console.log("\n=== Connecting ===");
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to database:", mongoose.connection.name);

  console.log("\n=== All AdminUser documents in this database ===");
  const all = await AdminUser.find().lean();
  if (all.length === 0) {
    console.log(
      "No AdminUser documents exist in this database at all — run `npm run seed` first."
    );
  } else {
    for (const doc of all) {
      console.log(
        `- email:[${doc.email}] active:${doc.active} role:${doc.role} hash:${doc.passwordHash.slice(
          0,
          7
        )}...(len ${doc.passwordHash.length})`
      );
    }
  }

  if (adminEmailEnv && adminPasswordEnv) {
    console.log(
      "\n=== Testing ADMIN_EMAIL / ADMIN_PASSWORD from .env against this database ==="
    );
    const lookupEmail = adminEmailEnv.toLowerCase().trim();
    const match = await AdminUser.findOne({
      email: lookupEmail,
      active: true,
    });

    if (!match) {
      console.log(
        `No active admin found for [${lookupEmail}] (this is exactly what the login API sees). Compare this bracketed value against the bracketed emails listed above — any difference (case, space, extra character) is the bug.`
      );
    } else {
      const passwordOk = await bcrypt.compare(
        adminPasswordEnv.trim(),
        match.passwordHash
      );
      console.log(
        `Found matching admin [${match.email}]. Password from .env ${
          passwordOk ? "MATCHES" : "DOES NOT MATCH"
        } the stored hash.`
      );
      if (!passwordOk) {
        console.log(
          "This means the password you have in .env right now is not the one that was actually seeded. Re-run `npm run seed` with the current .env value, or update ADMIN_PASSWORD to the one you originally seeded with."
        );
      } else {
        console.log(
          "\nThe .env credentials are valid against this database. If the browser login still fails, the mismatch is between what you're TYPING into the form and what's in this .env file — retype both fields manually (no autofill/paste) and try again."
        );
      }
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
