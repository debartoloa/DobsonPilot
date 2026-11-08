/**
 * Dobson Pilot - Internationalization (i18n)
 */

import { appState } from "../state.js";

class I18nManager {
  constructor() {
    this.currentLocale = "it";
    this.translations = {};
  }

  async init() {
    this.currentLocale = appState.settings.language || "it";
    await this.loadLocale(this.currentLocale);
  }

  async loadLocale(locale) {
    try {
      const resp = await fetch(`./js/i18n/${locale}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this.translations[locale] = await resp.json();
      this.currentLocale = locale;
    } catch (err) {
      console.warn(`Could not load locale ${locale}, fallback to en:`, err);
      if (locale !== "en") {
        try {
          await this.loadLocale("en");
        } catch (e2) {
          console.warn("Could not load fallback locale en:", e2);
        }
      }
    }
  }

  t(key, fallback = "") {
    const dict = this.translations[this.currentLocale] || this.translations["it"] || {};
    return dict[key] || fallback || key;
  }

  async setLocale(locale) {
    await this.loadLocale(locale);
    appState.saveSettings({ language: locale });
    this.updateDom();
  }

  updateDom() {
    document.querySelectorAll("[data-i18n]").forEach(elem => {
      const key = elem.getAttribute("data-i18n");
      const text = this.t(key);
      if (text) {
        elem.textContent = text;
      }
    });
  }
}

export const i18n = new I18nManager();
