"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { GA_MEASUREMENT_ID } from "@/lib/constants";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 page_view event on every client-side (App Router) navigation.
 *
 * The gtag('config', ...) call in the root layout's <head> script already
 * sends the first pageview on initial load, so this component skips its
 * first run to avoid double-counting that same view, then fires on every
 * pathname/query change after that.
 */
export function GoogleAnalyticsPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("event", "page_view", {
      page_path: pagePath,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [pathname, searchParams]);

  return null;
}
