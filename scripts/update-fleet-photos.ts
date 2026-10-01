/**
 * Point fleet vehicles and fleet/home page sections at committed photos in public/images/fleet.
 * Run: npx tsx scripts/update-fleet-photos.ts
 */
import mongoose from "mongoose";
import { Page, Vehicle } from "@/models";
import { buildPages, sanitizePageSeed } from "./seed/pages-data";
import { loadEnv, log } from "./seed/helpers";

const HIGHLANDER_IMAGE = {
  url: "/images/fleet/toyota-highlander-hybrid-awd.jpg",
  alt: "Toyota Highlander Hybrid AWD exterior",
};

const CHR_IMAGE = {
  url: "/images/fleet/toyota-c-hr-awd-premium.jpg",
  alt: "Toyota C-HR AWD Premium exterior",
};

async function updateVehicles(): Promise<void> {
  const highlander = await Vehicle.findOneAndUpdate(
    { displayName: "Toyota Highlander Hybrid AWD" },
    {
      $set: {
        primaryImage: HIGHLANDER_IMAGE,
        gallery: [],
        isIllustrative: false,
        published: true,
      },
    },
    { new: true }
  );
  const chr = await Vehicle.findOneAndUpdate(
    { displayName: "Toyota C-HR AWD Premium" },
    {
      $set: {
        primaryImage: CHR_IMAGE,
        gallery: [],
        isIllustrative: false,
        published: true,
      },
    },
    { new: true }
  );

  if (!highlander) log("Vehicles", "Toyota Highlander Hybrid AWD not found — run npm run seed");
  else log("Vehicles", "✓ Toyota Highlander Hybrid AWD photo updated");

  if (!chr) log("Vehicles", "Toyota C-HR AWD Premium not found — run npm run seed");
  else log("Vehicles", "✓ Toyota C-HR AWD Premium photo updated");
}

async function updateFleetPages(): Promise<void> {
  const pages = buildPages().map(sanitizePageSeed);
  for (const slug of ["fleet", "home"] as const) {
    const page = pages.find((p) => p.slug === slug);
    if (!page) continue;
    await Page.findOneAndUpdate(
      { slug },
      {
        $set: {
          hero: page.hero,
          sections: page.sections,
          seo: page.seo,
        },
      }
    );
    log("Pages", `✓ ${slug} fleet imagery refreshed`);
  }
}

async function main(): Promise<void> {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    await updateVehicles();
    await updateFleetPages();
    log("Done", "Fleet photos are live at /images/fleet/");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
