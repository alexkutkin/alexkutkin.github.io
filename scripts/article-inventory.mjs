import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function readArticleInventory() {
  const inventory = {};
  for (const [name, directory] of [
    ["published", "src/content/articles"],
    ["fixtures", "tests/fixtures/articles"],
  ]) {
    inventory[name] = {};
    for (const lang of ["en", "ru"]) {
      inventory[name][lang] = fs.readdirSync(path.join(root, directory, lang))
        .filter((file) => file.endsWith(".md"))
        .map((file) => file.slice(0, -3))
        .sort();
    }
  }
  return inventory;
}
