import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone-сборка: готовый к загрузке на хостинг каталог (node server.js)
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  // В standalone-сборку не нужны исходники, тесты и скрипты: они нужны только при разработке.
  outputFileTracingExcludes: {
    "*": [
      "./src/**",
      "./scripts/**",
      "./tests/**",
      "./docs/**",
      "./release/**",
      "./download/**",
      "./src-static/**",
      "./tools/**",
      "./data/**",
      "./tsconfig.json",
      "./tsconfig.tsbuildinfo",
      "./vitest.config.ts",
      "./README.md",
      "./.env*",
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/specialist/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
