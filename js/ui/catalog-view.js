/**
 * Dobson Pilot - Astronomical Catalog & Filtering Engine
 * High-fidelity replica of CosmoPilot Catalog:
 * - Sub-catalogs: Solar System, Stars, Galaxies, Nebulae, Messier (M1-M110), Custom
 * - Search bar with filter dropdown arrow
 * - Centering shortcuts: Scope Joystick & App Joystick
 * - List rows with thumbnail, mag, RA, Dec, and 'Visible' badge (alt >= 10°)
 * - Filter modal: Max mag, Visible only, Time slider (30-min steps), Choose location
 * - Custom objects CRUD (up to 200 items)
 * - J2000 -> Equator of date precession before sending GoTo
 */

import { MESSIER_CATALOG } from "../data/messier-data.js";
import { STARS_CATALOG } from "../data/stars-data.js";
import { GALAXIES_CATALOG } from "../data/galaxies-data.js";
import { NEBULAE_CATALOG } from "../data/nebulae-data.js";
import { CustomDb } from "../data/custom-db.js";
import { AstroCalc } from "../astro/astro-calc.js";
import { decimalHoursToHms, decimalDegToDms, formatDecParts, ProtocolCommands } from "../transport/protocol.js";
import { appState } from "../state.js";
import { GotoModal } from "./goto-modal.js";

export class CatalogView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   * @param {string} [options.initialCategory] - 'menu' | 'messier' | 'stars' | 'galaxies' | 'nebulae' | 'custom'
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.gotoModal = new GotoModal(this.queue);
    this.category = options.initialCategory || "menu";

    // Filter state (reset on exit)
    this.searchTerm = "";
    this.filterMaxMag = 12.0;
    this.filterVisibleOnly = false;
    this.filterTimeOffsetMin = 0; // Steps of 30 mins
    this.filterLat = appState.telescopeSettings.location?.lat || 45.4642;
    this.filterLon = appState.telescopeSettings.location?.lon || 9.1900;

    this.element = null;
  }

  render() {
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "screen-container";
    } else {
      this.element.innerHTML = "";
    }

    if (this.category === "menu") {
      this.renderCategoryMenu(this.element);
    } else {
      this.renderObjectList(this.element);
    }

    return this.element;
  }

  renderCategoryMenu(el) {
    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" data-action="back" id="btn-cat-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Catalog</h2>
      </div>
      <div class="screen-divider"></div>

      <div class="menu-list">
        <button class="menu-btn" data-route="solar-system">
          <div class="menu-btn-icon">🪐</div>
          <div class="menu-btn-text">Solar System</div>
        </button>

        <button class="menu-btn" data-route="catalog-messier">
          <div class="menu-btn-icon">🌌</div>
          <div class="menu-btn-text">Messier (M1–M110)</div>
        </button>

        <button class="menu-btn" data-route="catalog-stars">
          <div class="menu-btn-icon">⭐</div>
          <div class="menu-btn-text">Stars</div>
        </button>

        <button class="menu-btn" data-route="catalog-galaxies">
          <div class="menu-btn-icon">🌀</div>
          <div class="menu-btn-text">Galaxies</div>
        </button>

        <button class="menu-btn" data-route="catalog-nebulae">
          <div class="menu-btn-icon">✨</div>
          <div class="menu-btn-text">Nebulae</div>
        </button>

        <button class="menu-btn" data-route="catalog-custom">
          <div class="menu-btn-icon">📝</div>
          <div class="menu-btn-text">Custom Objects</div>
        </button>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" id="btn-cat-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    // Fallback direct click handlers if router is not delegated
    el.querySelectorAll(".menu-btn[data-route]").forEach(btn => {
      btn.addEventListener("click", () => {
        const route = btn.getAttribute("data-route");
        if (route && window.router) {
          window.router.navigate(route);
        }
      });
    });
  }

  getCategoryTitle() {
    switch (this.category) {
      case "messier": return "Messier List";
      case "stars": return "Stars List";
      case "galaxies": return "Galaxies List";
      case "nebulae": return "Nebulae List";
      case "custom": return "Custom Objects";
      default: return "Catalog";
    }
  }

  getItems() {
    switch (this.category) {
      case "messier": return MESSIER_CATALOG;
      case "stars": return STARS_CATALOG;
      case "galaxies": return GALAXIES_CATALOG;
      case "nebulae": return NEBULAE_CATALOG;
      case "custom": return CustomDb.getAll();
      default: return [];
    }
  }

  getEffectiveDate() {
    return new Date(Date.now() + this.filterTimeOffsetMin * 60 * 1000);
  }

  renderObjectList(el) {
    const title = this.getCategoryTitle();

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" data-action="back" id="btn-list-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Search & Filter Bar -->
      <div class="cat-search-bar" style="display: flex; gap: 8px; margin-bottom: 12px;">
        <div style="flex: 1; position: relative; display: flex; align-items: center;">
          <input 
            type="text" 
            id="input-cat-search" 
            placeholder="Search..." 
            value="${this.searchTerm}" 
            class="gold-input" 
            style="padding-right: 36px;"
          />
          <button id="btn-toggle-filter-modal" style="position: absolute; right: 8px; background: transparent; border: none; color: var(--gold-primary); cursor: pointer; padding: 4px; display: flex; align-items: center;" title="Filtri avanzati">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
          </button>
        </div>
        ${this.category === 'custom' ? `
          <button class="btn-gold" id="btn-add-custom" style="padding: 0 14px; font-size: 13px;" title="Aggiungi Oggetto">
            + Nuovo
          </button>
        ` : ""}
      </div>

      <!-- Centering Shortcuts (matching official screenshot) -->
      <div style="display: flex; justify-content: space-around; margin-bottom: 14px;">
        <button class="cat-shortcut-link" data-route="free-analog-joystick" id="link-scope-joy">Scope Joystick</button>
        <button class="cat-shortcut-link" data-route="free-app-joystick" id="link-app-joy">App Joystick</button>
      </div>

      <!-- Scrollable List of Objects -->
      <div id="catalog-items-container" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        ${this.renderItemsListHtml()}
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" id="btn-cat-items-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindListEvents(el);
  }

  getThumbnailSvg(item) {
    const t = (item.type || "").toLowerCase();
    if (t.includes("galaxy")) {
      return `<svg viewBox="0 0 100 100" class="obj-thumb-svg"><ellipse cx="50" cy="50" rx="38" ry="18" fill="none" stroke="#e5a93c" stroke-width="2.5" transform="rotate(-25 50 50)"/><circle cx="50" cy="50" r="10" fill="#f0c56d"/><path d="M20 60 Q50 30 80 40" stroke="#f3be53" fill="none" stroke-width="1.5"/></svg>`;
    }
    if (t.includes("star")) {
      return `<svg viewBox="0 0 100 100" class="obj-thumb-svg"><polygon points="50,15 61,38 86,40 66,58 72,83 50,70 28,83 34,58 14,40 39,38" fill="#f0c56d" stroke="#e5a93c" stroke-width="2"/><circle cx="50" cy="50" r="14" fill="#ffffff"/></svg>`;
    }
    if (t.includes("globular")) {
      return `<svg viewBox="0 0 100 100" class="obj-thumb-svg"><circle cx="50" cy="50" r="28" fill="none" stroke="#e5a93c" stroke-dasharray="3,3"/><circle cx="50" cy="50" r="14" fill="#f0c56d" opacity="0.8"/><circle cx="42" cy="45" r="3" fill="#fff"/><circle cx="58" cy="52" r="3" fill="#fff"/><circle cx="50" cy="40" r="3" fill="#fff"/><circle cx="52" cy="60" r="3" fill="#fff"/></svg>`;
    }
    // Default Nebula
    return `<svg viewBox="0 0 100 100" class="obj-thumb-svg"><path d="M25 40 Q40 20 60 25 T80 50 Q75 75 55 70 T25 60 Z" fill="rgba(229,169,60,0.3)" stroke="#e5a93c" stroke-width="2"/><circle cx="48" cy="48" r="8" fill="#fff"/></svg>`;
  }

  renderItemsListHtml() {
    const rawItems = this.getItems();
    const effectiveDate = this.getEffectiveDate();
    const lat = this.filterLat;
    const lon = this.filterLon;

    // Filter items
    const filtered = rawItems.filter(item => {
      // 1. Search term
      if (this.searchTerm) {
        const query = this.searchTerm.toLowerCase();
        const matchId = item.id.toLowerCase().includes(query);
        const matchName = item.name.toLowerCase().includes(query);
        const matchCon = (item.con || "").toLowerCase().includes(query);
        if (!matchId && !matchName && !matchCon) return false;
      }

      // 2. Max magnitude
      if (item.mag > this.filterMaxMag) return false;

      // 3. Visibility check
      const hor = AstroCalc.raDecToAltAz(item.ra, item.dec, effectiveDate, lat, lon);
      item._alt = hor.altitude;
      item._isVisible = hor.isVisible;

      if (this.filterVisibleOnly && !item._isVisible) {
        return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      return `
        <div class="config-card" style="text-align: center; color: var(--text-dim); padding: 32px 16px;">
          <em>Nessun oggetto trovato con i filtri attuali.</em>
        </div>
      `;
    }

    return filtered.map(item => {
      const hms = decimalHoursToHms(item.ra);
      const dms = decimalDegToDms(item.dec);
      const decSign = dms.isNegative ? "-" : "+";
      const pad = (n) => String(n).padStart(2, "0");

      const raStr = `${hms.h}h ${pad(hms.m)}m ${pad(hms.s)}s`;
      const decStr = `${decSign}${dms.deg}° ${pad(dms.min)}' ${pad(dms.sec)}"`;

      return `
        <div class="config-card cat-item-row" data-id="${item.id}" style="padding: 12px 14px; margin-bottom: 0; cursor: pointer; transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <!-- Thumbnail -->
            <div class="cat-thumb-box" style="width: 58px; height: 58px; background: #020204; border: 1px solid var(--gold-dim); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${this.getThumbnailSvg(item)}
            </div>

            <!-- Details -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: baseline; justify-content: space-between;">
                <strong style="color: var(--gold-highlight); font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${item.id} ${item.name ? item.name : ''}
                </strong>
              </div>
              <div style="font-size: 12px; color: var(--gold-text); margin-top: 2px;">
                • Mag: <strong>${item.mag}</strong>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: ui-monospace, monospace; margin-top: 1px;">
                • RA: ${raStr}<br>
                • DEC: ${decStr}
              </div>
              ${item._isVisible ? `
                <div style="margin-top: 4px;">
                  <span style="font-size: 10px; font-weight: 700; color: #2ecc71; background: rgba(46,204,113,0.15); border: 1px solid rgba(46,204,113,0.5); padding: 2px 6px; border-radius: 4px;">
                    ✓ Visible
                  </span>
                </div>
              ` : ""}
            </div>

            <!-- Actions (GoTo or Custom menu) -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <button class="btn-sm btn-item-goto" data-id="${item.id}" style="padding: 6px 10px; font-size: 11px; color: var(--gold-highlight); border-color: var(--gold-primary);">
                GoTo 🚀
              </button>
              ${this.category === 'custom' ? `
                <button class="btn-sm btn-item-del" data-id="${item.id}" style="padding: 2px 6px; font-size: 10px; color: var(--danger-color); border-color: rgba(231,76,60,0.3);">
                  Elimina
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  bindListEvents(el) {
    // Back & Home
    el.querySelector("#btn-list-back").addEventListener("click", () => {
      // Rule: exiting list resets filters
      this.searchTerm = "";
      this.filterVisibleOnly = false;
      this.filterMaxMag = 12.0;
      this.filterTimeOffsetMin = 0;
      if (window.router?.history?.length > 0 && window.router?.currentRoute?.startsWith("catalog-")) {
        window.router.back();
      } else {
        this.category = "menu";
        this.render();
      }
    });

    el.querySelector("#btn-cat-items-home").addEventListener("click", () => {
      this.searchTerm = "";
      window.router?.home();
    });

    // Search input
    const inputSearch = el.querySelector("#input-cat-search");
    inputSearch.addEventListener("input", (e) => {
      this.searchTerm = e.target.value;
      const container = el.querySelector("#catalog-items-container");
      if (container) {
        container.innerHTML = this.renderItemsListHtml();
        this.attachItemActions(el);
      }
    });

    // Centering shortcuts
    el.querySelector("#link-scope-joy").addEventListener("click", () => {
      window.router?.navigate("free-analog-joystick");
    });
    el.querySelector("#link-app-joy").addEventListener("click", () => {
      window.router?.navigate("free-app-joystick");
    });

    // Filter button
    el.querySelector("#btn-toggle-filter-modal").addEventListener("click", () => {
      this.showFilterModal(el);
    });

    // Custom add button
    const btnAddCustom = el.querySelector("#btn-add-custom");
    if (btnAddCustom) {
      btnAddCustom.addEventListener("click", () => {
        this.showAddCustomDialog(el);
      });
    }

    this.attachItemActions(el);
  }

  attachItemActions(el) {
    // GoTo row click
    el.querySelectorAll(".cat-item-row").forEach(elem => {
      elem.addEventListener("click", (e) => {
        if (e.target.closest(".btn-item-del")) return;
        const id = elem.getAttribute("data-id");
        this.triggerItemGoto(id);
      });
    });

    // Delete custom button
    el.querySelectorAll(".btn-item-del").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        if (confirm("Vuoi davvero eliminare questo oggetto personalizzato?")) {
          CustomDb.delete(id);
          const container = el.querySelector("#catalog-items-container");
          if (container) {
            container.innerHTML = this.renderItemsListHtml();
            this.attachItemActions(el);
          }
        }
      });
    });
  }

  triggerItemGoto(id) {
    const rawItems = this.getItems();
    const item = rawItems.find(i => i.id === id);
    if (!item) return;

    // Precess J2000 to epoch of date
    const pre = AstroCalc.precessJ2000ToDate(item.ra, item.dec, new Date(), this.filterLat, this.filterLon);
    const hms = decimalHoursToHms(pre.raHours);
    const dms = decimalDegToDms(pre.decDeg);

    const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);
    const cmd = ProtocolCommands.gotoAnyObject(hms.h, hms.m, hms.s, formattedDec);

    this.gotoModal.startGoto({
      targetName: `${item.id} - ${item.name}`,
      command: cmd,
      coordsInfo: `RA: ${hms.h}h ${hms.m}m ${hms.s}s | Dec: ${dms.isNegative ? '-' : '+'}${dms.deg}° ${dms.min}' ${dms.sec}"`
    });
  }

  showFilterModal(parentEl) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";

    // Temp drafts
    let draftMaxMag = this.filterMaxMag;
    let draftVisibleOnly = this.filterVisibleOnly;
    let draftTimeOffset = this.filterTimeOffsetMin;

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-family: var(--font-title); color: var(--gold-primary); font-size: 18px; margin: 0;">
            Filtri Catalogo
          </h3>
          <button class="btn-sm" id="btn-close-filter" style="padding: 2px 8px;">✕</button>
        </div>

        <!-- Filter 1: Max Magnitude -->
        <div class="config-card">
          <div class="card-title">
            <span>Magnitudine Massima:</span>
            <strong id="lbl-draft-mag" style="color: var(--gold-highlight); font-family: ui-monospace, monospace;">${draftMaxMag.toFixed(1)}</strong>
          </div>
          <input type="range" id="slider-filter-mag" min="1.0" max="14.0" step="0.5" value="${draftMaxMag}" class="gold-slider" />
          <div class="speed-ticks">
            <span>1.0 (Molto luminoso)</span>
            <span>7.0 (Occhio nudo)</span>
            <span>14.0 (Telescopio)</span>
          </div>
        </div>

        <!-- Filter 2: Visible Only -->
        <div class="config-card">
          <label class="toggle-control">
            <input type="checkbox" id="chk-draft-vis-only" ${draftVisibleOnly ? 'checked' : ''} />
            <span class="toggle-slider"></span>
            <span class="toggle-label" style="font-size: 13px;">Mostra solo oggetti visibili (Alt ≥ 10°)</span>
          </label>
        </div>

        <!-- Filter 3: Time Slider (steps of 30 mins) -->
        <div class="config-card">
          <div class="card-title">
            <span>Orario di Osservazione:</span>
            <strong id="lbl-draft-time" style="color: var(--gold-highlight); font-size: 13px;">${draftTimeOffset === 0 ? 'Ora attuale' : `+${draftTimeOffset / 60} h`}</strong>
          </div>
          <input type="range" id="slider-filter-time" min="0" max="720" step="30" value="${draftTimeOffset}" class="gold-slider" />
          <div class="speed-ticks">
            <span>Adesso</span>
            <span>+6 h</span>
            <span>+12 h</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px;">
          <button class="btn-sm" id="btn-discard-filter" style="min-height: 46px;">
            Annulla
          </button>
          <button class="btn-gold" id="btn-confirm-filter" style="min-height: 46px;">
            Confirm (Applica)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const sliderMag = modal.querySelector("#slider-filter-mag");
    const lblMag = modal.querySelector("#lbl-draft-mag");
    sliderMag.addEventListener("input", (e) => {
      draftMaxMag = parseFloat(e.target.value);
      lblMag.textContent = draftMaxMag.toFixed(1);
    });

    const chkVis = modal.querySelector("#chk-draft-vis-only");
    chkVis.addEventListener("change", (e) => {
      draftVisibleOnly = e.target.checked;
    });

    const sliderTime = modal.querySelector("#slider-filter-time");
    const lblTime = modal.querySelector("#lbl-draft-time");
    sliderTime.addEventListener("input", (e) => {
      draftTimeOffset = parseInt(e.target.value, 10);
      lblTime.textContent = draftTimeOffset === 0 ? "Ora attuale" : `+${(draftTimeOffset / 60).toFixed(1)} h`;
    });

    modal.querySelector("#btn-close-filter").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-discard-filter").addEventListener("click", () => modal.remove());

    modal.querySelector("#btn-confirm-filter").addEventListener("click", () => {
      this.filterMaxMag = draftMaxMag;
      this.filterVisibleOnly = draftVisibleOnly;
      this.filterTimeOffsetMin = draftTimeOffset;
      modal.remove();

      const container = parentEl.querySelector("#catalog-items-container");
      if (container) {
        container.innerHTML = this.renderItemsListHtml();
        this.attachItemActions(parentEl);
      }
    });
  }

  showAddCustomDialog(parentEl) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-family: var(--font-title); color: var(--gold-primary); font-size: 18px; margin: 0;">
            Nuovo Oggetto Personalizzato
          </h3>
          <button class="btn-sm" id="btn-close-add-modal" style="padding: 2px 8px;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Nome o Identificativo</label>
            <input type="text" id="cust-in-name" class="gold-input" placeholder="Es. Cometa Tsuchinshan" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">RA (Ore decimali 0-24)</label>
              <input type="number" step="0.0001" id="cust-in-ra" class="gold-input" placeholder="12.4500" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">DEC (Gradi -90..+90)</label>
              <input type="number" step="0.0001" id="cust-in-dec" class="gold-input" placeholder="-5.2000" />
            </div>
          </div>

          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Magnitudine</label>
            <input type="number" step="0.1" id="cust-in-mag" class="gold-input" value="8.0" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button class="btn-sm" id="btn-cancel-add" style="min-height: 46px;">Annulla</button>
          <button class="btn-gold" id="btn-save-cust" style="min-height: 46px;">Salva Oggetto</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#btn-close-add-modal").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-cancel-add").addEventListener("click", () => modal.remove());

    modal.querySelector("#btn-save-cust").addEventListener("click", () => {
      const name = modal.querySelector("#cust-in-name").value;
      const ra = parseFloat(modal.querySelector("#cust-in-ra").value);
      const dec = parseFloat(modal.querySelector("#cust-in-dec").value);
      const mag = parseFloat(modal.querySelector("#cust-in-mag").value);

      if (!name || isNaN(ra) || isNaN(dec)) {
        alert("Inserisci un nome e coordinate RA/DEC valide.");
        return;
      }

      CustomDb.add({ name, ra, dec, mag: isNaN(mag) ? 10.0 : mag });
      modal.remove();

      const container = parentEl.querySelector("#catalog-items-container");
      if (container) {
        container.innerHTML = this.renderItemsListHtml();
        this.attachItemActions(parentEl);
      }
    });
  }
}
