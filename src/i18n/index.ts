import en from "./en";
import zh from "./zh";

export type Lang = typeof en;

export default {
  i18n: {
    en,
    zh,
  },
  get current() {
    const lang = window.localStorage.getItem("language") ?? "en";
    return this.i18n[lang] ?? this.i18n.en;
  },
};
