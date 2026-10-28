import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSettings().site.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const routes: { path: string; priority: number; frequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, frequency: "weekly" },
    { path: "/astrology", priority: 0.9, frequency: "weekly" },
    { path: "/matrix", priority: 0.9, frequency: "weekly" },
    { path: "/full-reading", priority: 0.7, frequency: "monthly" },
    { path: "/privacy", priority: 0.2, frequency: "yearly" },
    { path: "/terms", priority: 0.2, frequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.frequency,
    priority: route.priority,
  }));
}
