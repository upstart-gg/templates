import i18next from "i18next";
import siteConfig from "./config/site.json" with { type: "json" };

// Dynamically import all translation files
const translationModules = import.meta.glob("./locales/**/*.json", {
  eager: true,
  import: "default",
});

export const defaultLanguage = siteConfig.defaultLanguage ?? "en"; // Temp setting with "en" if not set
export const supportedLanguages: string[] = siteConfig.supportedLanguages.length
  ? siteConfig.supportedLanguages
  : [defaultLanguage];

// Transform into resources object
export const resources: Record<
  string,
  Record<string, Record<string, string>>
> = {};

Object.entries(translationModules).forEach(([path, module]) => {
  // path: './locales/en/translation.json'
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (match) {
    const [, language, namespace] = match;
    if (!supportedLanguages.includes(language)) {
      return;
    }
    if (!resources[language]) {
      resources[language] = {};
    }
    resources[language][namespace] = module as Record<string, string>;
  }
});

i18next.init({
  resources,
  fallbackLng: defaultLanguage,
  interpolation: {
    escapeValue: false,
  },
  react: {
    transWrapTextNodes: "span",
  },
  initAsync: false, // Ensure i18next is initialized synchronously
});

// This adds type-safety to the `t` function
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof resources)[typeof defaultLanguage];
    enableSelector: false;
    allowObjectInHTMLChildren: true;
    strictKeyChecks: true;
  }
}

export default i18next;
