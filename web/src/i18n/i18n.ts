import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enLocale from "./en-US";

const resources = {
  en: { translation: enLocale },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
