import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://alexkutkin.github.io",
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
