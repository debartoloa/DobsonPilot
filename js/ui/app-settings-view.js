/**
 * Dobson Pilot - App Settings View
 * Manages UI language, starry canvas / custom image backgrounds (up to 5MB),
 * non-persistent red Night Mode with 5 dimming levels, and operational preferences.
 */

import { appState } from "../state.js";

export class AppSettingsView {
  /**
   * @param {Object} options
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.onBack = options.onBack;
    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    const s = appState.settings;

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-appsettings-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">App Settings</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Language Card -->
      <div class="config-card">
        <div class="card-title">🌐 Lingua / Language</div>
        <select id="select-app-language" class="gold-select">
          <option value="it" ${s.language === 'it' ? 'selected' : ''}>Italiano (Italian)</option>
          <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
          <option value="es" ${s.language === 'es' ? 'selected' : ''}>Español (Spanish)</option>
          <option value="fr" ${s.language === 'fr' ? 'selected' : ''}>Français (French)</option>
          <option value="pt" ${s.language === 'pt' ? 'selected' : ''}>Português (Portuguese)</option>
        </select>
      </div>

      <!-- Night Mode (Non-persistent red filter) -->
      <div class="config-card">
        <div class="card-title" style="color: #ff6b6b;">
          🔴 Night Mode (Visione Notturna)
        </div>
        <div class="card-description">
          Applica un filtro rosso a contrasto preservando l'adattamento dell'occhio al buio. 
          <em style="color: var(--text-dim); display: block; margin-top: 4px;">Come da specifica, non persiste alla chiusura dell'app.</em>
        </div>

        <label class="toggle-control" style="margin-bottom: 14px;">
          <input type="checkbox" id="chk-night-mode" ${s.nightMode ? 'checked' : ''} />
          <span class="toggle-slider"></span>
          <span class="toggle-label">Attiva Night Mode</span>
        </label>

        <div id="night-mode-level-box" style="${s.nightMode ? '' : 'opacity: 0.4; pointer-events: none;'}">
          <div class="speed-header">
            <span>Intensità: <strong id="lbl-night-level">Livello ${s.nightModeLevel || 1}</strong></span>
            <span style="font-size: 11px; color: var(--text-muted);">Livello 1 = Rosso Luminoso</span>
          </div>
          <input 
            type="range" 
            id="slider-night-level" 
            min="1" 
            max="5" 
            step="1" 
            value="${s.nightModeLevel || 1}" 
            class="gold-slider" 
          />
          <div class="speed-ticks">
            <span>1 (Luminoso)</span>
            <span>3</span>
            <span>5 (Attenuato)</span>
          </div>
        </div>
      </div>

      <!-- Backgrounds & Custom Image -->
      <div class="config-card">
        <div class="card-title">🌌 Sfondo Stellato</div>
        <div class="card-description">Scegli tra i temi integrati o carica un'immagine astronomica personalizzata (max 5 MB).</div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
          <button class="bg-preset-btn ${s.backgroundIndex === 0 ? 'active' : ''}" data-bg="0">Deep Space</button>
          <button class="bg-preset-btn ${s.backgroundIndex === 1 ? 'active' : ''}" data-bg="1">Saturn Rings</button>
          <button class="bg-preset-btn ${s.backgroundIndex === 2 ? 'active' : ''}" data-bg="2">Orion Nebula</button>
          <button class="bg-preset-btn ${s.backgroundIndex === 3 ? 'active' : ''}" data-bg="3">Pleiades</button>
          <button class="bg-preset-btn ${s.backgroundIndex === 4 ? 'active' : ''}" data-bg="4">Andromeda</button>
          <button class="bg-preset-btn ${s.backgroundIndex === 5 ? 'active' : ''}" data-bg="5">Milky Way</button>
          <button class="bg-preset-btn ${s.backgroundIndex === 6 ? 'active' : ''}" data-bg="6">Obsidian Black</button>
        </div>

        <div style="border-top: 1px solid var(--gold-dim); padding-top: 10px;">
          <label class="btn-sm btn-block" style="text-align: center; cursor: pointer; display: block;">
            📷 Carica Immagine Propria (Max 5 MB)
            <input type="file" id="file-custom-bg" accept="image/*" style="display: none;" />
          </label>
        </div>
      </div>

      <!-- General App Preferences -->
      <div class="config-card">
        <div class="card-title">⚙️ Preferenze Operative</div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label class="toggle-control">
            <input type="checkbox" id="chk-auto-reconnect" ${s.autoReconnect ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span class="toggle-label">Riconnessione Automatica Bluetooth</span>
          </label>

          <label class="toggle-control">
            <input type="checkbox" id="chk-enable-stop-goto" ${s.enableStopGoto ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span class="toggle-label">Abilita Pulsante Stop GoTo</span>
          </label>

          <label class="toggle-control">
            <input type="checkbox" id="chk-extend-gears" ${s.extendGearRatio200 ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span class="toggle-label">Estendi Rapporti Meccanici fino a 200</span>
          </label>
        </div>
      </div>

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-appsettings-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    return el;
  }

  bindEvents(el) {
    el.querySelector("#btn-appsettings-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-appsettings-home").addEventListener("click", () => {
      window.router?.home();
    });

    // Language selection
    el.querySelector("#select-app-language").addEventListener("change", (e) => {
      appState.saveSettings({ language: e.target.value });
    });

    // Night mode
    const chkNight = el.querySelector("#chk-night-mode");
    const sliderNight = el.querySelector("#slider-night-level");
    const lblNight = el.querySelector("#lbl-night-level");
    const boxNight = el.querySelector("#night-mode-level-box");

    chkNight.addEventListener("change", (e) => {
      const active = e.target.checked;
      appState.settings.nightMode = active;
      document.body.classList.toggle("night-mode", active);
      boxNight.style.opacity = active ? "1" : "0.4";
      boxNight.style.pointerEvents = active ? "auto" : "none";
      this.applyNightLevel(parseInt(sliderNight.value, 10));
    });

    sliderNight.addEventListener("input", (e) => {
      const lvl = parseInt(e.target.value, 10);
      lblNight.textContent = `Livello ${lvl}`;
      appState.settings.nightModeLevel = lvl;
      this.applyNightLevel(lvl);
    });

    // Preset backgrounds
    el.querySelectorAll(".bg-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        el.querySelectorAll(".bg-preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const idx = parseInt(btn.getAttribute("data-bg"), 10);
        appState.saveSettings({ backgroundIndex: idx });
        // Notify canvas starfield
        window.starfield?.setPreset?.(idx);
      });
    });

    // Custom background file upload (max 5 MB)
    el.querySelector("#file-custom-bg").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert("L'immagine supera il limite massimo consentito di 5 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        try {
          localStorage.setItem("dobson_pilot_custom_bg", dataUrl);
          document.body.style.backgroundImage = `url(${dataUrl})`;
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          alert("Sfondo personalizzato caricato con successo!");
        } catch (err) {
          alert("Impossibile salvare l'immagine in locale: memoria browser esaurita.");
        }
      };
      reader.readAsDataURL(file);
    });

    // Preferences toggles
    el.querySelector("#chk-auto-reconnect").addEventListener("change", (e) => {
      appState.saveSettings({ autoReconnect: e.target.checked });
    });
    el.querySelector("#chk-enable-stop-goto").addEventListener("change", (e) => {
      appState.saveSettings({ enableStopGoto: e.target.checked });
    });
    el.querySelector("#chk-extend-gears").addEventListener("change", (e) => {
      appState.saveSettings({ extendGearRatio200: e.target.checked });
    });
  }

  applyNightLevel(level) {
    if (!appState.settings.nightMode) {
      document.body.style.filter = "none";
      return;
    }
    // Level 1 = brightest red (100% brightness), Level 5 = darkest (40% brightness)
    const brightness = 1.0 - (level - 1) * 0.15;
    document.body.style.filter = `brightness(${brightness.toFixed(2)})`;
  }
}
