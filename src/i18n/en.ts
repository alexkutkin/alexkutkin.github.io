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
    homeTitle: "Alex Kutkin — frontend developer",
    homeDescription: "Notes and a little about Alex Kutkin.",
    cvTitle: "CV — Alex Kutkin",
    cvDescription: "Experience, education, skills and languages.",
    notFoundTitle: "Page not found — Alex Kutkin",
    notFoundDescription: "The requested page was not found.",
  },
  home: {
    intro: "Here you can read my notes and learn a little about me.",
    bio: [
      "I work in frontend development. I use AI agents on the job: I set tasks and review the results.",
      "I like useful tools and beautiful things in everyday life. Sometimes I build small programs for my own tasks.",
    ],
    photoAlt: "Portrait of Alex Kutkin",
    photoCaption: "No Wi-Fi",
    projectsLabel: "Small personal projects",
    contactLabel: "Contact",
    socialsLabel: "Social",
    notesTitle: "Notes",
    telegram: "Message on Telegram",
    projects: [
      {
        title: "PasteHatch",
        description:
          "Collects files, screenshots, text and links into a folder you can hand to a local agent.",
        href: "https://github.com/alexkutkin/paste-hatch",
        linkLabel: "GitHub",
      },
      {
        title: "Herdr Tray",
        description:
          "A system tray icon shows the status of Herdr agents and opens their status panel.",
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
