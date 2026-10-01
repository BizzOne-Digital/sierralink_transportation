import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Providers } from "@/components/providers/Providers";
import { GoogleAnalyticsPageview } from "@/components/analytics/GoogleAnalyticsPageview";
import { SITE_NAME, SITE_SHORT_NAME, GA_MEASUREMENT_ID } from "@/lib/constants";
import { getSiteSettings } from "@/lib/repositories/site-settings";
import { buildSiteIconMetadata } from "@/lib/seo/icons";
import { DEFAULT_SITE_SETTINGS, toSiteSettingsData } from "@/lib/site-settings";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const rootMetadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_SHORT_NAME}`,
  },
  description:
    "Professional private transportation in Albany and the Capital Region. Airport transfers, executive travel, and long-distance rides.",
  keywords: [
    "Albany transportation",
    "Capital Region car service",
    "airport transfer ALB",
    "JFK car service",
    "executive transportation",
    "SierraLink",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const settingsDoc = await getSiteSettings();
  const settings = settingsDoc ? toSiteSettingsData(settingsDoc) : DEFAULT_SITE_SETTINGS;

  return {
    ...rootMetadata,
    icons: buildSiteIconMetadata(settings.faviconUrl, settings.logoUrl),
  };
}

export const viewport: Viewport = {
  themeColor: "#060807",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen w-full max-w-full overflow-x-clip bg-obsidian text-ivory antialiased">
        {/* Google Analytics (GA4) — beforeInteractive is the one next/script
            strategy Next.js injects into the server-rendered <head>, per
            client requirement that the tag live in <head>. Loads on every
            route, admin included; use GA4's "Internal Traffic" data filter
            (Admin > Data Streams > Configure tag settings) to exclude admin
            activity from reports instead of gating the script itself. */}
        <Script
          strategy="beforeInteractive"
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script
          id="ga4-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
          }}
        />
        <Providers>{children}</Providers>
        {/* Fires a page_view event on every client-side route change so SPA
            navigations are tracked; the very first pageview is already sent
            by the gtag('config', ...) call above, so this skips its first run. */}
        <Suspense fallback={null}>
          <GoogleAnalyticsPageview />
        </Suspense>
      </body>
    </html>
  );
}
