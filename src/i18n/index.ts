import zh from "./zh";
import en from "./en";

export type Lang = typeof en;

export default {
  i18n: {
    en,
    zh,
  },
  get current() {
    const lang = window.localStorage.getItem("language") ?? "ens";
    return this.i18n[lang] ?? this.i18n.en;
  },
};
