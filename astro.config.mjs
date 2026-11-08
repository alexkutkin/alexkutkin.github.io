import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { siteUrl, locales, defaultLocale } from "./src/site";

export default defineConfig({
  site: siteUrl,
  integrations: [sitemap({
    filter: (page) => new URL(page).pathname !== "/404.html",
  })],
  server: {
    host: true,
    port: 4321,
  },
  trailingSlash: "always",
  i18n: {
    defaultLocale,
    locales: [...locales],
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
