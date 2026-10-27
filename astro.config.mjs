import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://alexkutkin.com",
  integrations: [sitemap({
    filter: (page) => new URL(page).pathname !== "/404.html",
  })],
  server: {
    host: true,
    port: 4321,
  },
  trailingSlash: "always",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  markdown: {
    shikiConfig: {
      theme: "github-light",
      wrap: false,
    },
  },
  vite: {
    server: {
      allowedHosts: ["host.docker.internal"],
    },
    preview: {
      allowedHosts: ["host.docker.internal"],
    },
  },
});
