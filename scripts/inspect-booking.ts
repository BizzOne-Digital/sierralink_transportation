/**
 * Look up booking requests in MongoDB (e.g. Nazaf / Clifton Park → Albany).
 * Run: npx tsx scripts/inspect-booking.ts [search term]
 */
import mongoose from "mongoose";
import { BookingRequest } from "@/models";
import { loadEnv } from "./seed/helpers";

const DEFAULT_TERM = "Nazaf";

function matchesTerm(doc: Record<string, unknown>, term: string): boolean {
  const re = new RegExp(term, "i");
  const json = JSON.stringify(doc);
  return re.test(json);
}

async function main(): Promise<void> {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const term = process.argv[2]?.trim() || DEFAULT_TERM;

  await mongoose.connect(uri);
  try {
    const recent = await BookingRequest.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const hits = recent.filter((doc) =>
      matchesTerm(doc as Record<string, unknown>, term)
    );

    if (!hits.length) {
      console.log(`No bookings in the last 200 records matching "${term}".`);
      console.log("Try a different search term or increase the scan in this script.");
      return;
    }

    for (const booking of hits) {
      const trip = booking.tripDetails;
      console.log("---");
      console.log("Reference:", booking.reference);
      console.log("Status:", booking.status);
      console.log("Created:", booking.createdAt?.toISOString?.() ?? booking.createdAt);
      console.log("Mode:", booking.mode);
      console.log("Contact:", trip.contactName, trip.contactEmail, trip.contactPhone);
      console.log("Pickup:", trip.pickupAddress);
      console.log("Destination:", trip.destinationAddress);
      console.log("Pickup date/time:", trip.pickupDate, trip.pickupTime);
      if (booking.utmSource || booking.referrer) {
        console.log("UTM:", booking.utmSource, booking.utmMedium, booking.utmCampaign);
        console.log("Referrer:", booking.referrer);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
