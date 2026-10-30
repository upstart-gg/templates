import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supportedLanguages } from "~/i18n";

export type SiteLanguage = {
  /** ISO 639-1 code, as in `site.json` ("fr"). */
  code: string;
  /** The language named in itself ("Français", "English"). */
  name: string;
  /** Whether the site is shown in it now. */
  current: boolean;
};

/** A language named in itself, capitalized: "Français", "English", "Deutsch". */
function nativeName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * The site's languages (`supportedLanguages` of `site.json`) for a language switcher, and how to
 * switch. A site in one language has nothing to switch: render no switcher when `languages` has
 * fewer than 2 entries. The switch goes through the `set-locale` route, then reloads the page.
 */
export function useLanguageSwitch() {
  const { i18n } = useTranslation();
  const [pending, setPending] = useState(false);
  const currentCode =
    supportedLanguages.find((code) => (i18n.language ?? "").toLowerCase().startsWith(code)) ??
    supportedLanguages[0];
  const languages: SiteLanguage[] = supportedLanguages.map((code) => ({
    code,
    name: nativeName(code),
    current: code === currentCode,
  }));
  const index = languages.findIndex((l) => l.current);

  const switchTo = async (code: string) => {
    if (pending || code === currentCode || !supportedLanguages.includes(code)) return;
    setPending(true);
    try {
      await fetch(`/set-locale?locale=${encodeURIComponent(code)}`);
      window.location.reload();
    } catch {
      setPending(false);
    }
  };

  return {
    languages,
    /** The language shown now. */
    current: languages[index],
    /** The language a single toggle button switches to: the next one. */
    next: languages[(index + 1) % languages.length],
    /** Whether the site has languages to switch between: no switcher otherwise. */
    canSwitch: languages.length > 1,
    pending,
    switchTo,
  };
}
