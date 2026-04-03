/**
 * i18next initializer for CircuiTry3D.
 *
 * - Detects the device/browser language automatically via
 *   i18next-browser-languagedetector.
 * - Supports English (en), French (fr), and Spanish (es).
 * - Falls back to English for any unsupported language.
 *
 * Import this module once (in main.tsx) before rendering the React tree.
 * All components can then call useTranslation() from react-i18next.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "./locales/en/translation.json";
import frTranslation from "./locales/fr/translation.json";
import esTranslation from "./locales/es/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      fr: { translation: frTranslation },
      es: { translation: esTranslation },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "es"],
    interpolation: {
      // React already escapes values, so no need for i18next to escape them.
      escapeValue: false,
    },
    detection: {
      // Prefer localStorage so a chosen language persists across sessions,
      // then fall back to the browser/OS language.
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "circuitry3d_language",
    },
  });

export default i18n;
