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

// Do not call `i18next.init()` here — the client inits in `entry.client.tsx`
// and the server uses a per-request instance via `middlewares/i18next.ts`.
// A third init at module load races with the client init → hydration mismatch.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof resources)[typeof defaultLanguage];
    enableSelector: false;
    allowObjectInHTMLChildren: true;
    strictKeyChecks: true;
  }
}
