import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "AmanShift",
        short_name: "AmanShift",
        description: "Crew-level heat-protection decision support (decision support, not authorization)",
        theme_color: "#0F5257",
        background_color: "#F6F4EF",
        display: "standalone",
        start_url: "/command",
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/v1/evaluation"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "evaluation" },
          },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:8080" } },
  test: { environment: "jsdom", include: ["tests/unit/**/*.test.ts"] },
});
