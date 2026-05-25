import { initReactI18next } from "react-i18next";
import { createCookie } from "react-router";
import { createI18nextMiddleware } from "remix-i18next/middleware";
import { resources, supportedLanguages, defaultLanguage } from "../i18n";

// This cookie will be used to store the user locale preference
export const localeCookie = createCookie("lng", {
  path: "/",
  sameSite: "lax",
  secure:
    process.env.APP_ENV !== "sandbox" &&
    (process.env.FLIPPABLE_ENV === "production" ||
      process.env.FLIPPABLE_ENV === "preview"),
  httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages, // Your supported languages, the fallback should be last
      fallbackLanguage: defaultLanguage,
      cookie: localeCookie,
    },
    i18next: { resources, initAsync: false }, // Your locales
    plugins: [initReactI18next], // Plugins you may need, like react-i18next
  });
