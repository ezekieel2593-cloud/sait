import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export default function robots(): MetadataRoute.Robots {
  const settings = getSettings();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/specialist", "/specialist/", "/api/", "/astrology/result/", "/matrix/result/"],
      },
    ],
    sitemap: `${settings.site.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
    host: settings.site.siteUrl,
  };
}
