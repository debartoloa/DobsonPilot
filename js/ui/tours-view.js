/**
 * Dobson Pilot - Observing Tours Engine
 * Implements Plan Tour (3-step session, objects visibility window, review & reorder)
 * and Start Tour ("Before you start" check, non-moving navigation, confirmed GoTo, joysticks).
 * Supports up to 10 tours, up to 30 objects per tour, excluding Solar System.
 */

import { ToursDb } from "../data/tours-db.js";
import { MESSIER_CATALOG } from "../data/messier-data.js";
import { STARS_CATALOG } from "../data/stars-data.js";
import { GALAXIES_CATALOG } from "../data/galaxies-data.js";
import { NEBULAE_CATALOG } from "../data/nebulae-data.js";
import { CustomDb } from "../data/custom-db.js";
import { AstroCalc } from "../astro/astro-calc.js";
import { ProtocolCommands, decimalHoursToHms, decimalDegToDms, formatDecParts } from "../transport/protocol.js";
import { appState } from "../state.js";
import { GotoModal } from "./goto-modal.js";

export class ToursView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.gotoModal = new GotoModal(this.queue);

    this.viewMode = "list"; // 'list' | 'plan' | 'start'
    this.activeTour = null;

    // Plan wizard draft state
    this.planStep = 1; // 1: Session, 2: Objects, 3: Review
    this.planTourId = null;
    this.planName = "";
    this.planDate = new Date().toISOString().split("T")[0];
    this.planStartTime = "21:00";
    this.planDurationMin = 120; // 2 hours
    this.planLocation = {
      name: "Posizione Attuale",
      lat: appState.telescopeSettings.location?.lat || 45.4642,
      lon: appState.telescopeSettings.location?.lon || 9.1900
    };
    this.planSelectedObjects = []; // Array of object snapshots
    this.planFilterCategory = "all";
    this.planFilterSearch = "";
    this.planFilterMaxMag = 10.0;

    // Start tour state
    this.startStep = "check"; // 'check' | 'active'
    this.currentObjectIndex = 0;

    this.element = null;
  }

  render() {
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "screen-container";
    } else {
      this.element.innerHTML = "";
    }

    if (this.viewMode === "list") {
      this.renderTourList(this.element);
    } else if (this.viewMode === "plan") {
      this.renderPlanWizard(this.element);
    } else if (this.viewMode === "start") {
      this.renderStartTour(this.element);
    }

    return this.element;
  }

  // ==========================================
  // 1. TOUR LIST VIEW
  // ==========================================
  renderTourList(el) {
    const tours = ToursDb.getAll();

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-tours-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Observing Tours</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <span style="font-size: 13px; color: var(--gold-text);">
          Tour Salvati: <strong>${tours.length} / 10</strong>
        </span>
        <button class="btn-gold" id="btn-create-tour" style="padding: 6px 14px; font-size: 12px;" ${tours.length >= 10 ? 'disabled' : ''}>
          + Plan Tour
        </button>
      </div>

      <div id="tours-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; flex: 1;">
        ${tours.length === 0 ? `
          <div class="config-card" style="text-align: center; color: var(--text-dim); padding: 36px 16px;">
            <em>Nessun tour osservativo programmato.<br>Premi "+ Plan Tour" per creare la tua prima sessione.</em>
          </div>
        ` : tours.map(t => `
          <div class="config-card" style="padding: 14px; margin-bottom: 0; border-color: rgba(168,85,247,0.35);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <strong style="color: var(--gold-highlight); font-size: 16px;">${t.name}</strong>
                <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
                  📅 ${t.session.date} ore ${t.session.startTime} (${t.session.durationMin / 60}h)
                </div>
              </div>
              <span style="font-size: 11px; background: rgba(168,85,247,0.18); border: 1px solid var(--gold-dim); color: var(--gold-highlight); padding: 2px 8px; border-radius: 12px; font-weight: 700;">
                ${t.objects.length} Oggetti
              </span>
            </div>

            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
              📍 Luogo: ${t.session.location?.name || 'Coordinate'} (Lat ${t.session.location?.lat.toFixed(2)}°, Lon ${t.session.location?.lon.toFixed(2)}°)
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px;">
              <button class="btn-gold btn-start-tour" data-id="${t.id}" style="padding: 8px; font-size: 12px;">
                Start Tour 🚀
              </button>
              <button class="btn-sm btn-edit-tour" data-id="${t.id}" style="padding: 8px; font-size: 12px;">
                Modifica
              </button>
              <button class="btn-sm btn-del-tour" data-id="${t.id}" style="padding: 8px; font-size: 12px; color: var(--danger-color); border-color: rgba(231,76,60,0.3);">
                Elimina
              </button>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    el.querySelector("#btn-tours-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-create-tour").addEventListener("click", () => {
      this.resetPlanWizard();
      this.viewMode = "plan";
      this.render();
    });

    el.querySelectorAll(".btn-start-tour").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const tour = ToursDb.get(id);
        if (tour) {
          this.activeTour = tour;
          this.viewMode = "start";
          this.startStep = "check";
          this.currentObjectIndex = 0;
          this.render();
        }
      });
    });

    el.querySelectorAll(".btn-edit-tour").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const tour = ToursDb.get(id);
        if (tour) {
          this.loadTourIntoWizard(tour);
          this.viewMode = "plan";
          this.render();
        }
      });
    });

    el.querySelectorAll(".btn-del-tour").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Vuoi davvero eliminare questo tour?")) {
          ToursDb.delete(id);
          this.render();
        }
      });
    });
  }

  // ==========================================
  // 2. PLAN TOUR WIZARD (3 Steps)
  // ==========================================
  resetPlanWizard() {
    this.planStep = 1;
    this.planTourId = null;
    this.planName = `Tour ${new Date().toLocaleDateString()}`;
    this.planDate = new Date().toISOString().split("T")[0];
    this.planStartTime = "21:00";
    this.planDurationMin = 120;
    this.planSelectedObjects = [];
  }

  loadTourIntoWizard(tour) {
    this.planStep = 1;
    this.planTourId = tour.id;
    this.planName = tour.name;
    this.planDate = tour.session.date;
    this.planStartTime = tour.session.startTime;
    this.planDurationMin = tour.session.durationMin;
    this.planLocation = { ...tour.session.location };
    this.planSelectedObjects = [...tour.objects];
  }

  renderPlanWizard(el) {
    const isEditing = Boolean(this.planTourId);
    const title = `${isEditing ? 'Modifica Tour' : 'Plan Tour'} (Passo ${this.planStep}/3)`;

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-plan-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Step Indicator Dots -->
      <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 16px;">
        <span style="height: 6px; width: 40px; border-radius: 3px; background: ${this.planStep >= 1 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.2)'};"></span>
        <span style="height: 6px; width: 40px; border-radius: 3px; background: ${this.planStep >= 2 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.2)'};"></span>
        <span style="height: 6px; width: 40px; border-radius: 3px; background: ${this.planStep >= 3 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.2)'};"></span>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        ${this.renderPlanStepContent()}
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    el.querySelector("#btn-plan-back").addEventListener("click", () => {
      if (this.planStep > 1) {
        this.planStep--;
        this.render();
      } else {
        this.viewMode = "list";
        this.render();
      }
    });

    this.bindPlanStepEvents(el);
  }

  renderPlanStepContent() {
    if (this.planStep === 1) {
      // Step 1: Session Details
      return `
        <div class="config-card">
          <div class="card-title">1. Dettagli Sessione Osservativa</div>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Data Osservazione</label>
              <input type="date" id="in-plan-date" value="${this.planDate}" class="gold-input" />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Ora Inizio</label>
                <input type="time" id="in-plan-time" value="${this.planStartTime}" class="gold-input" />
              </div>
              <div>
                <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Durata Sessione</label>
                <select id="select-plan-duration" class="gold-select">
                  <option value="30" ${this.planDurationMin === 30 ? 'selected' : ''}>30 minuti</option>
                  <option value="60" ${this.planDurationMin === 60 ? 'selected' : ''}>1 ora</option>
                  <option value="90" ${this.planDurationMin === 90 ? 'selected' : ''}>1.5 ore</option>
                  <option value="120" ${this.planDurationMin === 120 ? 'selected' : ''}>2 ore (Standard)</option>
                  <option value="150" ${this.planDurationMin === 150 ? 'selected' : ''}>2.5 ore</option>
                  <option value="180" ${this.planDurationMin === 180 ? 'selected' : ''}>3 ore</option>
                  <option value="240" ${this.planDurationMin === 240 ? 'selected' : ''}>4 ore</option>
                  <option value="300" ${this.planDurationMin === 300 ? 'selected' : ''}>5 ore</option>
                  <option value="360" ${this.planDurationMin === 360 ? 'selected' : ''}>6 ore (Tutta la notte)</option>
                </select>
              </div>
            </div>

            <!-- Location -->
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Luogo di Osservazione</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="in-plan-loc-name" value="${this.planLocation.name}" class="gold-input" style="flex: 1;" placeholder="Nome luogo (es. Rifugio)" />
                <button class="btn-sm" id="btn-plan-gps" style="white-space: nowrap; padding: 0 10px;">
                  📍 GPS
                </button>
              </div>
              <div style="font-size: 11px; color: var(--gold-text); margin-top: 4px;">
                Lat: ${this.planLocation.lat.toFixed(4)}° | Lon: ${this.planLocation.lon.toFixed(4)}°
              </div>
            </div>
          </div>
        </div>

        <button class="btn-gold btn-block" id="btn-next-step2" style="min-height: 50px; font-size: 15px; margin-top: auto;">
          Avanti: Scegli Oggetti ➔
        </button>
      `;
    }

    if (this.planStep === 2) {
      // Step 2: Objects Selection
      const candidates = this.getCandidatesWithVisibility();

      return `
        <!-- Filter Bar -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <input type="text" id="in-obj-search" placeholder="Cerca oggetto (es. M31, Orion)..." value="${this.planFilterSearch}" class="gold-input" style="flex: 1;" />
            <select id="select-obj-cat" class="gold-select" style="width: 120px;">
              <option value="all" ${this.planFilterCategory === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="messier" ${this.planFilterCategory === 'messier' ? 'selected' : ''}>Messier</option>
              <option value="stars" ${this.planFilterCategory === 'stars' ? 'selected' : ''}>Stelle</option>
              <option value="galaxies" ${this.planFilterCategory === 'galaxies' ? 'selected' : ''}>Galassie</option>
              <option value="nebulae" ${this.planFilterCategory === 'nebulae' ? 'selected' : ''}>Nebulose</option>
              <option value="custom" ${this.planFilterCategory === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--gold-text);">
            <span>Selezionati: <strong style="color: var(--gold-highlight);">${this.planSelectedObjects.length} / 30</strong></span>
            <span>Max Mag: <strong>${this.planFilterMaxMag.toFixed(1)}</strong></span>
          </div>
        </div>

        <!-- Scrollable Candidate Objects -->
        <div id="plan-objects-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 48vh; overflow-y: auto; margin-top: 4px;">
          ${candidates.length === 0 ? `
            <div class="config-card" style="text-align: center; color: var(--text-dim); padding: 24px;">
              <em>Nessun oggetto visibile durante la sessione programmata con i filtri attuali.</em>
            </div>
          ` : candidates.map(item => {
            const isSelected = this.planSelectedObjects.some(o => o.id === item.id);
            const badgeColor = item.visType === "Whole session" ? "#2ecc71" : "#e67e22";

            return `
              <div class="config-card" style="padding: 10px 12px; margin-bottom: 0; border-color: ${isSelected ? 'var(--gold-primary)' : 'rgba(168,85,247,0.22)'}; background: ${isSelected ? 'rgba(168,85,247,0.14)' : 'rgba(10,16,32,0.75)'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <strong style="color: var(--gold-highlight); font-size: 14px;">${item.id} ${item.name || ''}</strong>
                      <span style="font-size: 10px; font-weight: 700; color: ${badgeColor}; border: 1px solid ${badgeColor}; padding: 1px 5px; border-radius: 3px;">
                        ${item.visType}
                      </span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
                      Mag: <strong>${item.mag}</strong> | Alt inizio: ${item.altStart.toFixed(0)}° | Alt max: ${item.altMax.toFixed(0)}°
                    </div>
                  </div>

                  <button class="btn-sm btn-toggle-select-obj" data-id="${item.id}" style="padding: 6px 12px; font-size: 12px; ${isSelected ? 'background: var(--gold-primary); color: #ffffff; font-weight: 700;' : ''}">
                    ${isSelected ? '✓ Rimuovi' : '+ Aggiungi'}
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <button class="btn-gold btn-block" id="btn-next-step3" style="min-height: 50px; font-size: 15px; margin-top: auto;" ${this.planSelectedObjects.length === 0 ? 'disabled' : ''}>
          Avanti: Rivedi e Salva (${this.planSelectedObjects.length}) ➔
        </button>
      `;
    }

    if (this.planStep === 3) {
      // Step 3: Review & Reorder
      return `
        <div class="config-card">
          <div class="card-title">3. Riepilogo & Ordinamento Tour</div>

          <div style="margin-top: 10px; margin-bottom: 12px;">
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Nome Univoco del Tour</label>
            <input type="text" id="in-final-tour-name" value="${this.planName}" class="gold-input" placeholder="Es. Gemme Autunnali" />
          </div>

          <div style="font-size: 12px; color: var(--gold-text); margin-bottom: 8px;">
            Trascina od ordina gli oggetti con le frecce nell'ordine in cui desideri osservarli:
          </div>
        </div>

        <!-- Reorder List -->
        <div id="review-reorder-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 44vh; overflow-y: auto;">
          ${this.planSelectedObjects.map((obj, idx) => `
            <div class="config-card" style="padding: 10px 12px; margin-bottom: 0; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 14px; font-weight: 700; color: var(--gold-primary); width: 22px;">#${idx + 1}</span>
                <div>
                  <strong style="color: var(--gold-highlight); font-size: 14px;">${obj.id} ${obj.name || ''}</strong>
                  <div style="font-size: 11px; color: var(--text-dim);">Mag: ${obj.mag} | ${obj.type || 'Oggetto'}</div>
                </div>
              </div>

              <div style="display: flex; gap: 4px;">
                <button class="btn-sm btn-move-up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity: 0.3;"' : ''}>▲</button>
                <button class="btn-sm btn-move-down" data-idx="${idx}" ${idx === this.planSelectedObjects.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>▼</button>
                <button class="btn-sm btn-remove-obj" data-idx="${idx}" style="color: var(--danger-color);">✕</button>
              </div>
            </div>
          `).join("")}
        </div>

        <button class="btn-gold btn-block" id="btn-save-final-tour" style="min-height: 52px; font-size: 16px; margin-top: auto;">
          Salva Tour Osservativo 💾
        </button>
      `;
    }
  }

  // Calculate object visibility across the session duration
  getCandidatesWithVisibility() {
    const rawAll = [
      ...MESSIER_CATALOG,
      ...STARS_CATALOG,
      ...GALAXIES_CATALOG,
      ...NEBULAE_CATALOG,
      ...CustomDb.getAll()
    ];

    const sessionStart = new Date(`${this.planDate}T${this.planStartTime}:00`);
    const sessionEnd = new Date(sessionStart.getTime() + this.planDurationMin * 60 * 1000);
    const sessionMid = new Date(sessionStart.getTime() + (this.planDurationMin / 2) * 60 * 1000);

    const lat = this.planLocation.lat;
    const lon = this.planLocation.lon;

    const filtered = rawAll.filter(item => {
      // Mag filter
      if (item.mag > this.planFilterMaxMag) return false;

      // Category filter
      if (this.planFilterCategory === "messier" && !item.id.startsWith("M")) return false;
      if (this.planFilterCategory === "stars" && !STARS_CATALOG.some(s => s.id === item.id)) return false;
      if (this.planFilterCategory === "galaxies" && !GALAXIES_CATALOG.some(g => g.id === item.id)) return false;
      if (this.planFilterCategory === "nebulae" && !NEBULAE_CATALOG.some(n => n.id === item.id)) return false;

      // Search term
      if (this.planFilterSearch) {
        const q = this.planFilterSearch.toLowerCase();
        const mId = item.id.toLowerCase().includes(q);
        const mName = (item.name || "").toLowerCase().includes(q);
        if (!mId && !mName) return false;
      }

      // Visibility calculation across session
      const horStart = AstroCalc.raDecToAltAz(item.ra, item.dec, sessionStart, lat, lon);
      const horMid = AstroCalc.raDecToAltAz(item.ra, item.dec, sessionMid, lat, lon);
      const horEnd = AstroCalc.raDecToAltAz(item.ra, item.dec, sessionEnd, lat, lon);

      const altStart = horStart.altitude;
      const altMid = horMid.altitude;
      const altEnd = horEnd.altitude;
      const altMax = Math.max(altStart, altMid, altEnd);

      // Rule: offered if altitude >= 10° at some point in the session
      if (altMax < 10.0) return false;

      // Whole session vs Part of session
      const isWhole = altStart >= 10.0 && altMid >= 10.0 && altEnd >= 10.0;
      item.visType = isWhole ? "Whole session" : "Part of session";
      item.altStart = altStart;
      item.altMax = altMax;

      return true;
    });

    return filtered;
  }

  bindPlanStepEvents(el) {
    if (this.planStep === 1) {
      el.querySelector("#btn-plan-gps").addEventListener("click", () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.planLocation.lat = pos.coords.latitude;
              this.planLocation.lon = pos.coords.longitude;
              this.planLocation.name = "Posizione GPS";
              this.render();
            },
            () => alert("Impossibile rilevare la posizione GPS del telefono.")
          );
        }
      });

      el.querySelector("#btn-next-step2").addEventListener("click", () => {
        this.planDate = el.querySelector("#in-plan-date").value;
        this.planStartTime = el.querySelector("#in-plan-time").value;
        this.planDurationMin = parseInt(el.querySelector("#select-plan-duration").value, 10);
        this.planLocation.name = el.querySelector("#in-plan-loc-name").value || "Osservatorio";
        this.planStep = 2;
        this.render();
      });
    } else if (this.planStep === 2) {
      const searchIn = el.querySelector("#in-obj-search");
      searchIn.addEventListener("input", (e) => {
        this.planFilterSearch = e.target.value;
        const container = el.querySelector("#plan-objects-container");
        if (container) {
          container.innerHTML = this.renderPlanStepContent(); // Re-render step 2
          this.bindPlanStepEvents(el);
        }
      });

      const catSelect = el.querySelector("#select-obj-cat");
      catSelect.addEventListener("change", (e) => {
        this.planFilterCategory = e.target.value;
        this.render();
      });

      el.querySelectorAll(".btn-toggle-select-obj").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          const idx = this.planSelectedObjects.findIndex(o => o.id === id);

          if (idx >= 0) {
            this.planSelectedObjects.splice(idx, 1);
          } else {
            if (this.planSelectedObjects.length >= 30) {
              alert("Puoi selezionare un massimo di 30 oggetti per tour.");
              return;
            }
            const candidates = this.getCandidatesWithVisibility();
            const found = candidates.find(c => c.id === id);
            if (found) {
              this.planSelectedObjects.push({
                id: found.id,
                name: found.name,
                type: found.type,
                ra: found.ra,
                dec: found.dec,
                mag: found.mag
              });
            }
          }
          this.render();
        });
      });

      el.querySelector("#btn-next-step3").addEventListener("click", () => {
        this.planStep = 3;
        this.render();
      });
    } else if (this.planStep === 3) {
      el.querySelectorAll(".btn-move-up").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx"), 10);
          if (idx > 0) {
            const item = this.planSelectedObjects.splice(idx, 1)[0];
            this.planSelectedObjects.splice(idx - 1, 0, item);
            this.render();
          }
        });
      });

      el.querySelectorAll(".btn-move-down").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx"), 10);
          if (idx < this.planSelectedObjects.length - 1) {
            const item = this.planSelectedObjects.splice(idx, 1)[0];
            this.planSelectedObjects.splice(idx + 1, 0, item);
            this.render();
          }
        });
      });

      el.querySelectorAll(".btn-remove-obj").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-idx"), 10);
          this.planSelectedObjects.splice(idx, 1);
          if (this.planSelectedObjects.length === 0) {
            this.planStep = 2;
          }
          this.render();
        });
      });

      el.querySelector("#btn-save-final-tour").addEventListener("click", () => {
        const name = el.querySelector("#in-final-tour-name").value.trim();
        if (!name) {
          alert("Inserisci un nome per il tour.");
          return;
        }

        if (!ToursDb.isNameUnique(name, this.planTourId)) {
          alert("Esiste già un tour con questo nome. Scegli un nome univoco.");
          return;
        }

        const tourData = {
          id: this.planTourId,
          name,
          session: {
            date: this.planDate,
            startTime: this.planStartTime,
            durationMin: this.planDurationMin,
            location: this.planLocation
          },
          objects: this.planSelectedObjects
        };

        try {
          ToursDb.save(tourData);
          alert("Tour salvato con successo!");
          this.viewMode = "list";
          this.render();
        } catch (err) {
          alert(`Errore: ${err.message}`);
        }
      });
    }
  }

  // ==========================================
  // 3. START TOUR EXECUTION
  // ==========================================
  renderStartTour(el) {
    const tour = this.activeTour;

    if (this.startStep === "check") {
      // "Before you start" screen
      const now = new Date();
      const planDateTime = new Date(`${tour.session.date}T${tour.session.startTime}:00`);
      const diffHours = (now - planDateTime) / (1000 * 60 * 60);

      let timeMsg = "Orario pianificato coerente.";
      if (Math.abs(diffHours) > 3) {
        timeMsg = `⚠️ Attenzione: il tour era pianificato per il ${tour.session.date} alle ${tour.session.startTime}. Adesso sono le ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      }

      el.innerHTML = `
        <div class="screen-header">
          <button class="btn-header-back" id="btn-cancel-start">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
          </button>
          <h2 class="screen-title">Before You Start</h2>
        </div>
        <div class="screen-divider"></div>

        <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
          <div class="config-card">
            <div class="card-title">🔍 Verifica Condizioni Sessione</div>
            <p style="font-size: 13px; color: var(--gold-highlight); font-weight: 700; margin: 10px 0 6px 0;">
              ${tour.name}
            </p>
            <div style="font-size: 12px; color: var(--text-dim); line-height: 1.5;">
              • Oggetti in programma: <strong>${tour.objects.length}</strong><br>
              • Luogo pianificato: <strong>${tour.session.location?.name || 'Coordinate'}</strong><br>
              • Data e ora piano: <strong>${tour.session.date} ${tour.session.startTime}</strong>
            </div>

            <div style="font-size: 12px; margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.4); border-radius: 6px; border: 1px solid var(--gold-dim); color: ${Math.abs(diffHours) > 3 ? '#e67e22' : '#2ecc71'};">
              ${timeMsg}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto;">
            <button class="btn-sm" id="btn-check-again" style="min-height: 50px;">
              🔄 Check Again
            </button>
            <button class="btn-gold" id="btn-start-anyway" style="min-height: 50px;">
              Start Tour Anyway 🚀
            </button>
          </div>
        </div>

        <div class="screen-footer-home">
          <button class="btn-footer-home" data-action="home" title="Torna alla Home">
            <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </button>
        </div>
      `;

      el.querySelector("#btn-cancel-start").addEventListener("click", () => {
        this.viewMode = "list";
        this.render();
      });

      el.querySelector("#btn-check-again").addEventListener("click", () => {
        this.render();
      });

      el.querySelector("#btn-start-anyway").addEventListener("click", () => {
        this.startStep = "active";
        this.render();
      });
      return;
    }

    // Active Tour Player
    const obj = tour.objects[this.currentObjectIndex];
    const total = tour.objects.length;

    // Live Alt/Az calculation
    const now = new Date();
    const lat = appState.telescopeSettings.location?.lat || tour.session.location.lat;
    const lon = appState.telescopeSettings.location?.lon || tour.session.location.lon;
    const hor = AstroCalc.raDecToAltAz(obj.ra, obj.dec, now, lat, lon);

    const hms = decimalHoursToHms(obj.ra);
    const dms = decimalDegToDms(obj.dec);
    const decSign = dms.isNegative ? "-" : "+";
    const pad = (n) => String(n).padStart(2, "0");

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-end-tour">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>End Tour</span>
        </button>
        <h2 class="screen-title">${tour.name}</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Tour Progress Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; color: var(--gold-text);">
          Oggetto <strong>${this.currentObjectIndex + 1}</strong> di <strong>${total}</strong>
        </span>
        <span style="font-size: 11px; font-weight: 700; color: ${hor.isVisible ? '#2ecc71' : '#e67e22'}; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 4px; border: 1px solid currentColor;">
          ${hor.isVisible ? '✓ Visible (Alt ≥ 10°)' : '⚠️ Sotto Orizzonte'}
        </span>
      </div>

      <!-- Current Object Hero Card -->
      <div class="config-card" style="margin-bottom: 16px; border-color: var(--gold-primary);">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="color: var(--gold-highlight); font-size: 20px;">
            ${obj.id} ${obj.name || ''}
          </strong>
          <span style="font-size: 13px; color: var(--gold-text);">Mag <strong>${obj.mag}</strong></span>
        </div>

        <div style="font-size: 12px; color: var(--text-dim); margin: 6px 0 10px 0;">
          Tipo: <strong>${obj.type || 'Oggetto celeste'}</strong>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: var(--text-muted); font-family: ui-monospace, monospace; background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px;">
          <div>• RA: ${hms.h}h ${pad(hms.m)}m ${pad(hms.s)}s</div>
          <div>• DEC: ${decSign}${dms.deg}° ${pad(dms.min)}'</div>
          <div>• Altitudine: <strong>${hor.altitude.toFixed(1)}°</strong></div>
          <div>• Azimut: <strong>${hor.azimuth.toFixed(1)}°</strong></div>
        </div>
      </div>

      <!-- Centering Shortcuts -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <button class="btn-sm" data-route="free-analog-joystick" style="padding: 10px;">
          🕹️ Scope Joystick
        </button>
        <button class="btn-sm" data-route="free-app-joystick" style="padding: 10px;">
          📱 App Joystick
        </button>
      </div>

      <!-- Big GoTo Action Button -->
      <button class="btn-gold btn-block" id="btn-goto-current-obj" style="min-height: 52px; font-size: 16px; margin-bottom: 14px;">
        Punta al Telescopio (GoTo ${obj.id}) 🚀
      </button>

      <!-- Step Navigation (Previous / Next without moving telescope) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto; margin-bottom: 20px;">
        <button class="btn-sm" id="btn-prev-tour-obj" style="min-height: 48px; font-size: 14px;" ${this.currentObjectIndex === 0 ? 'disabled style="opacity: 0.3;"' : ''}>
          ◀ Precedente
        </button>
        <button class="btn-sm" id="btn-next-tour-obj" style="min-height: 48px; font-size: 14px;" ${this.currentObjectIndex === total - 1 ? 'disabled style="opacity: 0.3;"' : ''}>
          Successivo ▶
        </button>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    // End tour
    el.querySelector("#btn-end-tour").addEventListener("click", () => {
      this.viewMode = "list";
      this.render();
    });

    // Previous without moving
    el.querySelector("#btn-prev-tour-obj").addEventListener("click", () => {
      if (this.currentObjectIndex > 0) {
        this.currentObjectIndex--;
        this.render();
      }
    });

    // Next without moving
    el.querySelector("#btn-next-tour-obj").addEventListener("click", () => {
      if (this.currentObjectIndex < total - 1) {
        this.currentObjectIndex++;
        this.render();
      }
    });

    // GoTo with confirmation
    el.querySelector("#btn-goto-current-obj").addEventListener("click", () => {
      if (confirm(`Confermi il puntamento motorizzato verso ${obj.id}?`)) {
        // Precess coordinates
        const pre = AstroCalc.precessJ2000ToDate(obj.ra, obj.dec, new Date(), lat, lon);
        const preHms = decimalHoursToHms(pre.raHours);
        const preDms = decimalDegToDms(pre.decDeg);
        const formattedDec = formatDecParts(preDms.deg, preDms.min, preDms.sec, preDms.isNegative);

        const cmd = ProtocolCommands.gotoAnyObject(preHms.h, preHms.m, preHms.s, formattedDec);
        this.gotoModal.startGoto({
          targetName: `${obj.id} - ${obj.name || ''}`,
          command: cmd,
          coordsInfo: `RA: ${preHms.h}h ${preHms.m}m ${preHms.s}s | Dec: ${preDms.isNegative ? '-' : '+'}${preDms.deg}° ${preDms.min}'`
        });
      }
    });
  }
}
