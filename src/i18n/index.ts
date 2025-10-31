import merge from "deepmerge";
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
    const langData = this.i18n[lang as keyof typeof this.i18n] ?? {};
    return merge(this.i18n.en, langData) as Lang;
  },
};
