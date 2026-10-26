import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const articles = defineCollection({
  loader: glob({
    pattern: import.meta.env.VERIFY_ARTICLE_FIXTURES === "1"
      ? ["src/content/articles/**/*.md", "tests/fixtures/articles/**/*.md"]
      : ["src/content/articles/**/*.md"],
    base: ".",
  }),
  schema: z.object({
    lang: z.enum(["en", "ru"]),
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    translationKey: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageCaption: z.string().optional(),
  }),
});

const cv = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/cv" }),
  schema: z.object({
    lang: z.enum(["en", "ru"]),
    label: z.string(),
    title: z.string(),
    subtitle: z.string(),
  }),
});

export const collections = { articles, cv };
