import merge from "deepmerge";
import en from "./en";
import zh from "./zh";

export type Lang = typeof en;

const translations = {
  en,
  zh,
};

function isSupportedLanguage(lang: string): lang is keyof typeof translations {
  return Object.prototype.hasOwnProperty.call(translations, lang);
}

export default {
  i18n: translations,
  get current() {
    const lang = window.localStorage.getItem("language") ?? "en";
    const localized = isSupportedLanguage(lang) ? translations[lang] : {};
    return merge(translations.en, localized) as Lang;
  },
};
