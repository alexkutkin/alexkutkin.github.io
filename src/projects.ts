export const projects = [
  {
    id: "pasteHatch",
    title: "PasteHatch",
    href: "https://github.com/alexkutkin/paste-hatch",
  },
  {
    id: "herdrTray",
    title: "Herdr Tray",
    href: "https://github.com/alexkutkin/herdr-tray",
  },
] as const;

export type ProjectId = (typeof projects)[number]["id"];
