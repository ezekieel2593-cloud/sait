import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "./globals.css";

import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSettings();
  const siteUrl = settings.site.siteUrl;
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${settings.site.name} — ${settings.site.tagline}`,
      template: `%s — ${settings.site.name}`,
    },
    description: settings.site.description,
    keywords: [
      "натальная карта",
      "матрица судьбы",
      "астрология",
      "расчёт матрицы судьбы",
      "астролог",
      "22 аркана",
    ],
    openGraph: {
      type: "website",
      siteName: settings.site.name,
      title: `${settings.site.name} — ${settings.site.tagline}`,
      description: settings.site.description,
      url: siteUrl,
      locale: "ru_RU",
      images: [{ url: "/images/og-cover.svg", width: 1200, height: 630, alt: settings.site.tagline }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${settings.site.name} — ${settings.site.tagline}`,
      description: settings.site.description,
      images: ["/images/og-cover.svg"],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#f6f0ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
