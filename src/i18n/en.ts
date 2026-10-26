export const en = {
  locale: "en",
  authorName: "Alex Kutkin",
  rssTitle: "Alex Kutkin — notes",
  nav: {
    home: "Home",
    cv: "CV",
  },
  a11y: {
    skipToContent: "Skip to content",
    mainNav: "Main navigation",
    theme: "Theme",
    language: "Language",
    pagination: "Notes pages",
  },
  theme: {
    system: "System",
    light: "Light",
    dark: "Dark",
  },
  language: {
    label: "Language",
    en: "English",
    ru: "Russian",
  },
  footer: {
    site: "Personal site",
  },
  meta: {
    homeTitle: "Alex Kutkin — apps and tools",
    homeDescription: "Personal projects, notes and building software with AI agents.",
    cvTitle: "CV — Alex Kutkin",
    cvDescription: "Experience, education, skills and languages.",
    notFoundTitle: "Page not found — Alex Kutkin",
    notFoundDescription: "The requested page was not found.",
  },
  home: {
    intro: "Hi, I'm Alex. I write software for work and for myself.",
    bio: [
      "Lately I've been really interested in building software with AI agents. I think that's where programming is headed. I enjoy making applications with them and figuring out how to make that process work well.",
      "I started with C# and backend development, then spent many years working on the web. I've been programming for more than ten years now.",
      "This is where I write about my projects and what I learn along the way.",
    ],
    photoAlt: "Portrait of Alex Kutkin",
    photoCaption: "No Wi-Fi",
    projectsLabel: "Small personal projects",
    contactLabel: "Contact",
    contactIntro: "Feel free to get in touch about a project or just to say hello.",
    socialsLabel: "Social",
    notesTitle: "Notes",
    telegram: "Telegram",
    projects: [
      {
        title: "PasteHatch",
        description:
          "A small Windows app for collecting materials for AI agents: files, screenshots, text and links. Everything is saved in an ordinary folder.",
        href: "https://github.com/alexkutkin/paste-hatch",
        linkLabel: "GitHub",
      },
      {
        title: "Herdr Tray",
        description:
          "A small Windows app that shows which Herdr agents are working and which are waiting for input. Open the shared status panel to keep an eye on them all at once.",
        href: "https://github.com/alexkutkin/herdr-tray",
        linkLabel: "GitHub",
      },
    ],
  },
  article: {
    backHome: "Home",
    open: "Open the article →",
  },
  pagination: {
    page: "Page",
  },
  notFound: {
    title: "Page not found",
    body: "The page you are looking for does not exist or has moved.",
    home: "Go to the home page",
  },
};

export type Dictionary = typeof en;
