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
    homeTitle: "Александр Куткин — фронтенд-разработчик",
    homeDescription: "Заметки и немного об Александре Куткине.",
    cvTitle: "Резюме — Александр Куткин",
    cvDescription: "Опыт, образование, навыки и языки.",
    notFoundTitle: "Страница не найдена — Александр Куткин",
    notFoundDescription: "Запрошенная страница не найдена.",
  },
  home: {
    intro: "Здесь можно прочитать мои заметки и немного узнать обо мне.",
    bio: [
      "Занимаюсь фронтенд-разработкой. В работе использую ИИ-агентов: ставлю задачи и проверяю результат.",
      "Мне нравятся полезные инструменты и красивые вещи в повседневной жизни. Иногда делаю небольшие программы для своих задач.",
    ],
    photoAlt: "Портрет Александра Куткина",
    photoCaption: "Без Wi-Fi",
    projectsLabel: "Небольшие личные проекты",
    contactLabel: "Связь",
    socialsLabel: "Соцсети",
    notesTitle: "Заметки",
    telegram: "Написать в Telegram",
    projects: [
      {
        title: "PasteHatch",
        description:
          "Собирает файлы, скриншоты, текст и ссылки в папку, которую можно передать локальному агенту.",
        href: "https://github.com/alexkutkin/paste-hatch",
        linkLabel: "GitHub",
      },
      {
        title: "Herdr Tray",
        description:
          "Значок в системном трее показывает состояние агентов Herdr и открывает панель их статуса.",
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
