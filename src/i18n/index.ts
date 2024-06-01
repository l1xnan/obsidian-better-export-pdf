import en from "./en";
import zh from "./zh";
import merge from "deepmerge";

export type Lang = typeof en;

export default {
  i18n: {
    en,
    zh,
  },
  get current() {
    const lang = window.localStorage.getItem("language") ?? "en";
    return merge(this.i18n.en, this.i18n[lang] ?? {});
  },
};
