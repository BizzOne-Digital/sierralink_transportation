import nodemailer from "nodemailer";
import { loadEnv } from "./seed/helpers";
import {
  getSmtpConfig,
  smtpAuthHint,
} from "../src/lib/email/smtp-config";
import {
  getBookingNotificationRecipients,
  uniqueEmails,
} from "../src/lib/email/recipients";
import { getSiteSettings } from "../src/lib/repositories/site-settings";
import connectDB from "../src/lib/db/connect";

async function main() {
  loadEnv();

  const config = getSmtpConfig();
  if (!config) {
    console.error("Missing SMTP env vars. Required:");
    console.error("  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM");
    process.exit(1);
  }

  let sitePrimaryEmail: string | undefined;
  try {
    await connectDB();
    const site = await getSiteSettings();
    sitePrimaryEmail = site?.primaryEmail;
  } catch {
    // DB optional for SMTP test
  }

  const recipients = uniqueEmails([
    ...getBookingNotificationRecipients(),
    sitePrimaryEmail,
  ]);
  if (!recipients.length) {
    console.error(
      "No notification recipients. Set ADMIN_EMAIL, SMTP_USER, and/or primary email in site settings."
    );
    process.exit(1);
  }

  console.log("SMTP configuration:");
  console.log(`  host: ${config.host}`);
  console.log(`  port: ${config.port}`);
  console.log(`  user: ${config.user}`);
  console.log(`  from: ${config.from}`);
  console.log(`  password length: ${config.pass.length} chars (spaces stripped)`);
  console.log(`  notify: ${recipients.join(", ")}`);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    requireTLS: config.port === 587,
  });

  console.log("\n1/2 Verifying SMTP connection...");
  try {
    await transporter.verify();
    console.log("   SMTP connection OK");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("SMTP test failed:", message.split("\n")[0]);
    const hint = smtpAuthHint(message);
    if (hint) console.error("\n" + hint);
    console.error(
      "\nAlso confirm the app password was created while signed in as:",
      config.user
    );
    process.exit(1);
  }

  console.log(`\n2/2 Sending test email to ${recipients.join(", ")}...`);
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: recipients,
      subject: "SierraLink SMTP test",
      html: `<p>SMTP test successful at ${new Date().toISOString()}.</p><p>Booking request emails are ready.</p>`,
    });
    console.log(`   Email sent — messageId: ${info.messageId}`);
    console.log("\nSMTP test passed.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("SMTP test failed:", message);
    const hint = smtpAuthHint(message);
    if (hint) console.error("\n" + hint);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("SMTP test failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
