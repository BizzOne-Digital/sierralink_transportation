import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getBaseUrl } from "@/lib/utils";
import type { IPage, IService, ISiteSettings } from "@/models";
import type { SeoFields, SiteSettingsData } from "@/types";
import {
  buildLocalBusinessSchema,
  type LocalBusinessSchema,
} from "./structured-data";

type MetadataSource = {
  title: string;
  seo?: SeoFields;
};

/** Builds the absolute, self-referencing canonical URL for a route path. */
function buildCanonicalUrl(path: string): string {
  const baseUrl = getBaseUrl();
  return path === "/" ? `${baseUrl}/` : `${baseUrl}${path}`;
}

function resolveSeo(
  source: MetadataSource,
  fallbackDescription?: string,
  path?: string
): Metadata {
  const title = source.seo?.title?.trim() || source.title;
  const description =
    source.seo?.description?.trim() || fallbackDescription?.trim();
  const isNoIndex = Boolean(source.seo?.noIndex);
  const manualCanonical = source.seo?.canonical?.trim();
  // A manually-set canonical (from the CMS) always wins. Otherwise, every
  // indexable page gets a self-referencing canonical built from its own
  // route; intentionally non-indexable pages get none.
  const canonical =
    manualCanonical || (!isNoIndex && path ? buildCanonicalUrl(path) : undefined);
  const socialImage = source.seo?.socialImage?.trim();
  const baseUrl = getBaseUrl();

  const metadata: Metadata = {
    title,
    ...(description ? { description } : {}),
    ...(isNoIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      ...(description ? { description } : {}),
      siteName: SITE_NAME,
      type: "website",
      ...(socialImage
        ? {
            images: [
              socialImage.startsWith("http")
                ? socialImage
                : `${baseUrl}${socialImage.startsWith("/") ? "" : "/"}${socialImage}`,
            ],
          }
        : {}),
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title,
      ...(description ? { description } : {}),
      ...(socialImage
        ? {
            images: [
              socialImage.startsWith("http")
                ? socialImage
                : `${baseUrl}${socialImage.startsWith("/") ? "" : "/"}${socialImage}`,
            ],
          }
        : {}),
    },
  };

  return metadata;
}

export function generatePageMetadata(
  page: Pick<IPage, "title" | "seo">,
  fallbackDescription?: string,
  path?: string
): Metadata {
  return resolveSeo(page, fallbackDescription, path);
}

export function generateServiceMetadata(
  service: IService,
  fallbackDescription?: string,
  path?: string
): Metadata {
  const listing = service.listing;
  const seo = listing.seo ?? service.detailPage?.seo;

  return resolveSeo(
    {
      title: seo?.title?.trim() || listing.title,
      seo,
    },
    fallbackDescription ?? listing.shortDescription,
    path
  );
}

export function buildVerifiedLocalBusinessSchema(
  site: SiteSettingsData | ISiteSettings
): LocalBusinessSchema | null {
  return buildLocalBusinessSchema(site, getBaseUrl());
}
