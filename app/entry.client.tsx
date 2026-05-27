import i18next from "i18next";
import { type ClientOnErrorFunction } from "react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import { defaultLanguage, resources, supportedLanguages } from "./i18n";

const onError: ClientOnErrorFunction = (
  error,
  { location, params, pattern, errorInfo },
) => {
  // make sure to still log the error so you can see it
  console.error(error, errorInfo);
};

async function main() {
  await i18next
    .use(initReactI18next)
    .use(I18nextBrowserLanguageDetector)
    .init({
      // Bundle translations directly via vite's `import.meta.glob` (see
      // app/i18n.ts) — same source the SSR side uses. Eliminates any chance
      // of an async fetch-backend race producing a hydration mismatch where
      // the server renders the translated value but the client renders the
      // raw key.
      resources,
      supportedLngs: supportedLanguages,
      fallbackLng: defaultLanguage,
      // Flat keys with dots (e.g. "nav.home") — disable nested-key lookup.
      keySeparator: false,
      nsSeparator: false,
      // Detect from the html tag only — the middleware already chose the
      // language server-side and stamped it on <html lang="…">.
      detection: { order: ["htmlTag"], caches: [] },
      react: {
        transWrapTextNodes: "span",
      },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter onError={onError} />
        </StrictMode>
      </I18nextProvider>,
    );
  });

  // Signal the editor (parent window) that React has hydrated. The iframe's
  // `load` event fires when HTML is parsed — too early, since the document
  // body is initially rendered with `opacity:0` placeholders for entry
  // animations that only run once React takes over. Double rAF lets the
  // hydration commit + first paint complete before we tell the parent the
  // preview is visible.
  if (window.parent !== window) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.parent.postMessage({ source: "upstart-iframe", type: "hydrated" }, "*");
      });
    });
  }
}

main().catch((error) => console.error(error));
