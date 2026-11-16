import merge from "deepmerge";
import en from "./en";
import zh from "./zh";

export type Lang = typeof en;

function normalizeLanguage(language: string | null): "en" | "zh" {
  return language?.replace("_", "-").toLowerCase().split("-")[0] === "zh" ? "zh" : "en";
}

export default {
  i18n: {
    en,
    zh,
  },
  get current() {
    const language = normalizeLanguage(window.localStorage.getItem("language"));
    return merge(this.i18n.en, this.i18n[language]) as Lang;
  },
};
