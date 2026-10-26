import type { Dictionary } from "./en";

export const ru: Dictionary = {
  locale: "ru",
  authorName: "Александр Куткин",
  rssTitle: "Александр Куткин — заметки",
  nav: {
    home: "Главная",
    cv: "Резюме",
  },
  a11y: {
    skipToContent: "Перейти к содержимому",
    mainNav: "Основная навигация",
    theme: "Тема",
    language: "Язык",
    pagination: "Страницы заметок",
  },
  theme: {
    system: "Системная",
    light: "Светлая",
    dark: "Тёмная",
  },
  language: {
    label: "Язык",
    en: "Английский",
    ru: "Русский",
  },
  footer: {
    site: "Личный сайт",
  },
  meta: {
    homeTitle: "Александр Куткин — приложения и инструменты",
    homeDescription: "Личные проекты, заметки и разработка с ИИ-агентами.",
    cvTitle: "Резюме — Александр Куткин",
    cvDescription: "Опыт, образование, навыки и языки.",
    notFoundTitle: "Страница не найдена — Александр Куткин",
    notFoundDescription: "Запрошенная страница не найдена.",
  },
  home: {
    intro: "Привет, я Александр. Пишу программы для работы и для себя.",
    bio: [
      "Сейчас больше всего увлечён разработкой с ИИ-агентами. Мне нравится создавать с ними приложения и разбираться, как лучше организовать такую работу.",
      "Начинал с C# и бэкенда, потом много лет занимался вебом. Всего программирую уже больше десяти лет.",
      "Здесь пишу о своих проектах и о том, что узнаю по ходу работы.",
    ],
    photoAlt: "Портрет Александра Куткина",
    photoCaption: "Без Wi-Fi",
    projectsLabel: "Небольшие личные проекты",
    contactLabel: "Связь",
    contactIntro: "Можно написать мне по поводу проекта или просто познакомиться.",
    socialsLabel: "Соцсети",
    notesTitle: "Заметки",
    telegram: "Telegram",
    projects: [
      {
        title: "PasteHatch",
        description:
          "Небольшая программа для Windows, чтобы собирать материалы для ИИ-агентов: файлы, скриншоты, текст и ссылки. Всё сохраняется в обычную папку.",
        href: "https://github.com/alexkutkin/paste-hatch",
        linkLabel: "GitHub",
      },
      {
        title: "Herdr Tray",
        description:
          "Небольшая программа для Windows: показывает, какие агенты Herdr работают, а какие ждут ответа. Можно открыть общую панель и следить за всеми сразу.",
        href: "https://github.com/alexkutkin/herdr-tray",
        linkLabel: "GitHub",
      },
    ],
  },
  article: {
    backHome: "На главную",
    open: "Открыть статью →",
  },
  pagination: {
    page: "Страница",
  },
  notFound: {
    title: "Страница не найдена",
    body: "Страницы, которую вы ищете, нет или она переехала.",
    home: "Перейти на главную",
  },
};
