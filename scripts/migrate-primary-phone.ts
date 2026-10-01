/**
 * Updates production MongoDB: site settings phones + hardcoded tel:/display text in pages.
 * Run: npx tsx scripts/migrate-primary-phone.ts
 */
import mongoose from "mongoose";
import { BUSINESS_PHONES } from "@/lib/constants";
import { Page, Service, ServiceArea, SiteSettings } from "@/models";
import { loadEnv, log } from "./seed/helpers";

const LEGACY_PRIMARY_TEL = "tel:+15182900675";
const LEGACY_ALT_TEL = "tel:+19144832266";
const LEGACY_PRIMARY_DISPLAY = "(518) 290-0675";
const LEGACY_ALT_DISPLAY = "(914) 483-2266";

function swapPhoneStrings(value: string): string {
  return value
    .replaceAll(LEGACY_PRIMARY_TEL, BUSINESS_PHONES.primary.link)
    .replaceAll(LEGACY_ALT_TEL, BUSINESS_PHONES.alternate.link)
    .replaceAll(LEGACY_PRIMARY_DISPLAY, BUSINESS_PHONES.primary.display)
    .replaceAll(LEGACY_ALT_DISPLAY, BUSINESS_PHONES.alternate.display);
}

function deepSwapPhones<T>(value: T): T {
  if (typeof value === "string") {
    return swapPhoneStrings(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSwapPhones(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = deepSwapPhones(child);
    }
    return out as T;
  }
  return value;
}

async function migrateSiteSettings(): Promise<void> {
  log("SiteSettings", "updating phone fields");
  await SiteSettings.findOneAndUpdate(
    { singletonKey: "singleton" },
    {
      $set: {
        primaryPhoneDisplay: BUSINESS_PHONES.primary.display,
        primaryPhoneLink: BUSINESS_PHONES.primary.link,
        alternatePhoneDisplay: BUSINESS_PHONES.alternate.display,
        alternatePhoneLink: BUSINESS_PHONES.alternate.link,
      },
    },
    { upsert: false }
  );
}

async function migrateCollectionPhones(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- migration script scans arbitrary collections
  model: mongoose.Model<any>
): Promise<void> {
  log(label, "scanning for legacy phone strings");
  const docs = await model.find({}).lean();
  let updated = 0;
  for (const doc of docs) {
    const next = deepSwapPhones(doc);
    if (JSON.stringify(next) !== JSON.stringify(doc)) {
      await model.replaceOne({ _id: doc._id }, next);
      updated += 1;
    }
  }
  log(label, `patched ${updated} document(s)`);
}

async function main(): Promise<void> {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local and retry.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    await migrateSiteSettings();
    await migrateCollectionPhones("Pages", Page);
    await migrateCollectionPhones("Services", Service);
    await migrateCollectionPhones("ServiceAreas", ServiceArea);
    log("Done", "primary phone is now 914-483-2266; 518-290-0675 is alternate");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
