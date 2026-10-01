import type { Metadata } from "next";
import { resolveMediaUrl } from "@/lib/uploads/resolve-media-url";

function toAbsoluteMediaUrl(resolved: string): string {
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
}

function mimeForIcon(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return undefined;
}

/** Favicon + Apple touch icon from CMS media, with static app/icon.svg fallback. */
export function buildSiteIconMetadata(
  faviconUrl?: string | null,
  logoUrl?: string | null
): Metadata["icons"] {
  const staticIcon = "/icon.svg";
  const candidate = faviconUrl?.trim() || logoUrl?.trim();

  if (!candidate) {
    return {
      icon: [{ url: staticIcon, type: "image/svg+xml" }],
      shortcut: staticIcon,
      apple: [{ url: staticIcon, type: "image/svg+xml" }],
    };
  }

  const resolved = resolveMediaUrl(candidate);
  const absolute = toAbsoluteMediaUrl(resolved);
  const type = mimeForIcon(absolute);

  return {
    icon: [
      { url: absolute, ...(type ? { type } : {}) },
      { url: staticIcon, type: "image/svg+xml" },
    ],
    shortcut: absolute,
    apple: [{ url: absolute, ...(type ? { type } : {}) }],
  };
}
