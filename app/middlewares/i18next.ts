import { initReactI18next } from "react-i18next";
import { createCookie } from "react-router";
import { createI18nextMiddleware } from "remix-i18next/middleware";
import { resources, supportedLanguages, defaultLanguage } from "../i18n";

// This cookie will be used to store the user locale preference
// SameSite=None + Secure + Partitioned (CHIPS) is required because the preview
// is rendered inside an iframe in the editor — without these the browser treats
// the cookie as third-party and won't send it back on requests from the iframe.
// `Secure` is allowed over http on localhost (treated as a secure context).
export const localeCookie = createCookie("lng", {
  path: "/",
  sameSite: "none",
  secure: true,
  partitioned: true,
  httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages, // Your supported languages, the fallback should be last
      fallbackLanguage: defaultLanguage,
      cookie: localeCookie,
    },
    i18next: {
      resources,
      initAsync: false,
      // Flat keys with dots (e.g. "nav.home") — disable nested-key lookup.
      keySeparator: false,
      nsSeparator: false,
    },
    plugins: [initReactI18next], // Plugins you may need, like react-i18next
  });
