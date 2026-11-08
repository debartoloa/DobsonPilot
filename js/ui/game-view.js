/**
 * Dobson Pilot - Astronomy Quiz Game
 * Replicating CosmoPilot Game:
 * - Automatically slews telescope to a random visible object (no confirmation, no Stop GoTo)
 * - Initial score: 50 points
 * - +10 correct answer, +2 extra bonus every 3 consecutive correct streak
 * - -20 wrong answer; error or skip resets streak
 * - Lifelines: 5x 50/50, 3x Skip, "Show mag" hint
 * - Game over at score <= 0 or on exit; best score saved in local storage
 * - Scope/App joystick shortcuts and "Return to target" re-slew button
 * - Minimum max magnitude: 5.0
 */

import { MESSIER_CATALOG } from "../data/messier-data.js";
import { STARS_CATALOG } from "../data/stars-data.js";
import { GALAXIES_CATALOG } from "../data/galaxies-data.js";
import { NEBULAE_CATALOG } from "../data/nebulae-data.js";
import { AstroCalc } from "../astro/astro-calc.js";
import { ProtocolCommands, decimalHoursToHms, decimalDegToDms, formatDecParts } from "../transport/protocol.js";
import { appState } from "../state.js";

const HIGH_SCORE_KEY = "dobson_game_highscore";

export class GameView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;

    this.gameState = "intro"; // 'intro' | 'playing' | 'gameover'
    this.score = 50;
    this.streak = 0;
    this.highScore = this.loadHighScore();

    this.lifelineFiftyFifty = 5;
    this.lifelineSkip = 3;
    this.hintShowMag = false;

    this.maxMag = 8.5; // Min allowed is 5.0
    this.currentTarget = null;
    this.choices = [];
    this.eliminatedChoiceId = null;
    this.answered = false;
    this.selectedChoiceId = null;

    this.element = null;
  }

  loadHighScore() {
    try {
      if (typeof localStorage !== "undefined") {
        return parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10) || 50;
      }
    } catch (e) {
      console.warn("Could not load high score:", e);
    }
    return 50;
  }

  saveHighScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(HIGH_SCORE_KEY, String(score));
        }
      } catch (e) {
        console.warn("Could not save high score:", e);
      }
    }
  }

  get lat() {
    return appState.telescopeSettings.location?.lat || 45.4642;
  }

  get lon() {
    return appState.telescopeSettings.location?.lon || 9.1900;
  }

  render() {
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "screen-container";
    } else {
      this.element.innerHTML = "";
    }

    if (this.gameState === "intro") {
      this.renderIntro(this.element);
    } else if (this.gameState === "playing") {
      this.renderPlaying(this.element);
    } else if (this.gameState === "gameover") {
      this.renderGameOver(this.element);
    }

    return this.element;
  }

  // ==========================================
  // 1. INTRO SCREEN
  // ==========================================
  renderIntro(el) {
    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-game-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Astronomy Quiz Game</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
        <div class="config-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 32px;">🎯</span>
              <div>
                <strong style="color: var(--gold-highlight); font-size: 18px;">Riconosci il Cielo</strong>
                <div style="font-size: 12px; color: var(--text-dim);">Indovina l'oggetto inquadrato dal telescopio!</div>
              </div>
            </div>
          </div>

          <div style="font-size: 13px; color: var(--text-dim); line-height: 1.5;">
            Il telescopio punterà autonomamente un oggetto visibile in cielo senza rivelarne il nome. 
            Guarda nell'oculare e scegli la risposta corretta tra 3 opzioni!
          </div>

          <div style="margin-top: 14px; font-size: 12px; color: var(--gold-text); background: rgba(0,0,0,0.4); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--gold-dim);">
            • Punteggio iniziale: <strong>50 punti</strong><br>
            • Risposta corretta: <strong>+10 punti</strong> (+2 extra ogni 3 consecutive!)<br>
            • Risposta errata: <strong>-20 punti</strong> (azzeramento serie)<br>
            • Aiuti: <strong>5x 50/50</strong> e <strong>3x Salta</strong>
          </div>
        </div>

        <!-- High Score Card -->
        <div class="config-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
          <span style="font-size: 13px; color: var(--gold-text);">Miglior Punteggio di Sempre:</span>
          <strong style="font-size: 20px; color: var(--gold-highlight); font-family: ui-monospace, monospace;">
            🏆 ${this.highScore}
          </strong>
        </div>

        <!-- Setting: Max Object Mag (min 5.0) -->
        <div class="config-card">
          <div class="card-title">
            <span>Magnitudine Massima Bersagli:</span>
            <strong id="lbl-game-mag" style="color: var(--gold-highlight); font-family: ui-monospace, monospace;">${this.maxMag.toFixed(1)}</strong>
          </div>
          <input type="range" id="slider-game-mag" min="5.0" max="11.0" step="0.5" value="${this.maxMag}" class="gold-slider" />
          <div class="speed-ticks">
            <span>5.0 (Min / Molto luminosi)</span>
            <span>8.0</span>
            <span>11.0 (Profondo cielo)</span>
          </div>
        </div>

        <button class="btn-gold btn-block" id="btn-start-game" style="min-height: 52px; font-size: 16px; margin-top: auto;">
          Inizia la Partita 🚀
        </button>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    el.querySelector("#btn-game-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    const sliderMag = el.querySelector("#slider-game-mag");
    const lblMag = el.querySelector("#lbl-game-mag");
    sliderMag.addEventListener("input", (e) => {
      this.maxMag = parseFloat(e.target.value);
      lblMag.textContent = this.maxMag.toFixed(1);
    });

    el.querySelector("#btn-start-game").addEventListener("click", () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
        return;
      }
      this.startGame();
    });
  }

  // ==========================================
  // 2. PLAYING SCREEN
  // ==========================================
  startGame() {
    this.score = 50;
    this.streak = 0;
    this.lifelineFiftyFifty = 5;
    this.lifelineSkip = 3;
    this.hintShowMag = false;
    this.gameState = "playing";
    this.nextRound();
  }

  nextRound() {
    this.answered = false;
    this.selectedChoiceId = null;
    this.eliminatedChoiceId = null;

    // Pick random visible target
    const pool = this.getVisiblePool();
    if (pool.length < 3) {
      alert("Pochi oggetti visibili trovati. Aumenta la magnitudine massima.");
      this.gameState = "intro";
      this.render();
      return;
    }

    const targetIndex = Math.floor(Math.random() * pool.length);
    this.currentTarget = pool[targetIndex];

    // Pick 2 distractors from pool
    const otherCandidates = pool.filter(o => o.id !== this.currentTarget.id);
    const distractor1 = otherCandidates[Math.floor(Math.random() * otherCandidates.length)];
    const remaining = otherCandidates.filter(o => o.id !== distractor1.id);
    const distractor2 = remaining[Math.floor(Math.random() * remaining.length)];

    this.choices = [
      { id: this.currentTarget.id, name: this.currentTarget.name, isCorrect: true },
      { id: distractor1.id, name: distractor1.name, isCorrect: false },
      { id: distractor2.id, name: distractor2.name, isCorrect: false }
    ].sort(() => Math.random() - 0.5); // Shuffle

    // Auto-slew without confirmation and without Stop GoTo
    this.slewToTarget(this.currentTarget);
    this.render();
  }

  getVisiblePool() {
    const raw = [
      ...MESSIER_CATALOG,
      ...STARS_CATALOG,
      ...GALAXIES_CATALOG,
      ...NEBULAE_CATALOG
    ];

    const now = new Date();
    const lat = this.lat;
    const lon = this.lon;

    return raw.filter(item => {
      if (item.mag > this.maxMag) return false;
      const hor = AstroCalc.raDecToAltAz(item.ra, item.dec, now, lat, lon);
      return hor.altitude >= 10.0;
    });
  }

  async slewToTarget(item) {
    if (!this.queue.transport.connected) return;

    try {
      const pre = AstroCalc.precessJ2000ToDate(item.ra, item.dec, new Date(), this.lat, this.lon);
      const hms = decimalHoursToHms(pre.raHours);
      const dms = decimalDegToDms(pre.decDeg);
      const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);

      const cmd = ProtocolCommands.gotoAnyObject(hms.h, hms.m, hms.s, formattedDec);
      await this.queue.send(cmd);
    } catch (e) {
      console.warn("Game GoTo send failed:", e);
    }
  }

  renderPlaying(el) {
    el.innerHTML = `
      <!-- Header with Score & Streak -->
      <div class="screen-header">
        <button class="btn-header-back" id="btn-quit-game">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Esci</span>
        </button>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 15px; font-weight: 700; color: var(--gold-highlight); font-family: ui-monospace, monospace;">
            Punti: ${this.score}
          </span>
          ${this.streak > 0 ? `
            <span style="font-size: 12px; font-weight: 700; color: #f1c40f; background: rgba(241,196,15,0.15); border: 1px solid #f1c40f; padding: 2px 6px; border-radius: 4px;">
              🔥 x${this.streak}
            </span>
          ` : ""}
        </div>
      </div>
      <div class="screen-divider"></div>

      <!-- Secret Target Info & Slew Indicator -->
      <div class="config-card" style="text-align: center; padding: 14px; margin-bottom: 12px;">
        <div style="font-size: 26px; margin-bottom: 4px;">🔭</div>
        <strong style="color: var(--gold-highlight); font-size: 16px;">
          Bersaglio Segreto Inquadrato
        </strong>
        <div style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
          Guarda all'oculare: quale oggetto ha puntato il telescopio?
        </div>

        ${this.hintShowMag ? `
          <div style="margin-top: 8px; font-size: 13px; color: var(--gold-primary); font-weight: 700; background: rgba(0,0,0,0.4); padding: 4px 10px; border-radius: 4px; display: inline-block;">
            💡 Indizio: Magnitudine apparente = ${this.currentTarget.mag}
          </div>
        ` : ""}
      </div>

      <!-- Lifelines Bar -->
      <div style="display: flex; gap: 8px; margin-bottom: 14px;">
        <button class="btn-sm" id="btn-lifeline-5050" style="flex: 1; padding: 8px 4px; font-size: 11px;" ${this.lifelineFiftyFifty <= 0 || this.eliminatedChoiceId ? 'disabled style="opacity: 0.3;"' : ''}>
          50/50 (${this.lifelineFiftyFifty})
        </button>
        <button class="btn-sm" id="btn-lifeline-skip" style="flex: 1; padding: 8px 4px; font-size: 11px;" ${this.lifelineSkip <= 0 ? 'disabled style="opacity: 0.3;"' : ''}>
          Salta (${this.lifelineSkip})
        </button>
        <button class="btn-sm" id="btn-lifeline-mag" style="flex: 1; padding: 8px 4px; font-size: 11px; ${this.hintShowMag ? 'color: var(--gold-highlight); border-color: var(--gold-primary);' : ''}">
          Show Mag 💡
        </button>
      </div>

      <!-- Multiple Choice Options (3 choices) -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
        ${this.choices.map(c => {
          const isEliminated = c.id === this.eliminatedChoiceId;
          let btnStyle = "";
          let labelText = `${c.id} - ${c.name || ''}`;

          if (this.answered) {
            if (c.isCorrect) {
              btnStyle = "background: rgba(46,204,113,0.3); border-color: #2ecc71; color: #2ecc71; font-weight: 700;";
            } else if (c.id === this.selectedChoiceId) {
              btnStyle = "background: rgba(231,76,60,0.3); border-color: #e74c3c; color: #e74c3c;";
            }
          }

          return `
            <button 
              class="btn-gold btn-game-choice" 
              data-id="${c.id}" 
              style="min-height: 52px; font-size: 14px; text-align: left; padding: 10px 16px; ${btnStyle} ${isEliminated ? 'opacity: 0.2; pointer-events: none;' : ''}"
              ${this.answered ? 'disabled' : ''}
            >
              ${isEliminated ? '<s>' + labelText + '</s>' : labelText}
            </button>
          `;
        }).join("")}
      </div>

      <!-- Centering & Re-target Shortcuts -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: auto; margin-bottom: 14px;">
        <button class="btn-sm" data-route="free-analog-joystick" style="padding: 8px 4px; font-size: 11px;">
          🕹️ Scope Joy
        </button>
        <button class="btn-sm" data-route="free-app-joystick" style="padding: 8px 4px; font-size: 11px;">
          📱 App Joy
        </button>
        <button class="btn-sm" id="btn-re-slew-target" style="padding: 8px 4px; font-size: 11px; color: var(--gold-highlight); border-color: var(--gold-primary);" title="Ripunta il bersaglio">
          🎯 Ripunta
        </button>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    // Quit game
    el.querySelector("#btn-quit-game").addEventListener("click", () => {
      this.saveHighScore(this.score);
      this.gameState = "intro";
      this.render();
    });

    // Re-slew
    el.querySelector("#btn-re-slew-target").addEventListener("click", () => {
      this.slewToTarget(this.currentTarget);
    });

    // 50/50 lifeline
    el.querySelector("#btn-lifeline-5050").addEventListener("click", () => {
      if (this.lifelineFiftyFifty > 0 && !this.eliminatedChoiceId) {
        this.lifelineFiftyFifty--;
        const wrongs = this.choices.filter(c => !c.isCorrect);
        const toEliminate = wrongs[Math.floor(Math.random() * wrongs.length)];
        this.eliminatedChoiceId = toEliminate.id;
        this.render();
      }
    });

    // Skip lifeline
    el.querySelector("#btn-lifeline-skip").addEventListener("click", () => {
      if (this.lifelineSkip > 0) {
        this.lifelineSkip--;
        this.streak = 0; // Skip resets streak
        this.nextRound();
      }
    });

    // Show mag
    el.querySelector("#btn-lifeline-mag").addEventListener("click", () => {
      this.hintShowMag = !this.hintShowMag;
      this.render();
    });

    // Choice selection
    el.querySelectorAll(".btn-game-choice").forEach(btn => {
      btn.addEventListener("click", () => {
        if (this.answered) return;
        this.answered = true;
        const id = btn.getAttribute("data-id");
        this.selectedChoiceId = id;

        const isRight = id === this.currentTarget.id;
        if (isRight) {
          this.score += 10;
          this.streak++;
          if (this.streak > 0 && this.streak % 3 === 0) {
            this.score += 2; // Extra bonus
          }
          this.saveHighScore(this.score);
        } else {
          this.score -= 20;
          this.streak = 0;
        }

        this.render();

        setTimeout(() => {
          if (this.score <= 0) {
            this.saveHighScore(this.score);
            this.gameState = "gameover";
            this.render();
          } else {
            this.nextRound();
          }
        }, 1600);
      });
    });
  }

  // ==========================================
  // 3. GAME OVER SCREEN
  // ==========================================
  renderGameOver(el) {
    el.innerHTML = `
      <div class="screen-header">
        <h2 class="screen-title">Game Over</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
        <div style="font-size: 54px; margin-bottom: 14px;">💫</div>
        <h3 style="font-family: var(--font-title); color: #e74c3c; font-size: 24px; margin: 0 0 8px 0;">
          Punti Esauriti!
        </h3>
        <p style="font-size: 13px; color: var(--text-dim); margin: 0 0 20px 0;">
          Il tuo punteggio è sceso a zero o sotto. Ottimo tentativo!
        </p>

        <div class="config-card" style="width: 100%; max-width: 280px; padding: 14px; margin-bottom: 24px;">
          <div style="font-size: 12px; color: var(--text-dim);">Punteggio Finale:</div>
          <strong style="font-size: 24px; color: var(--gold-highlight); font-family: ui-monospace, monospace;">${this.score}</strong>
          <div style="font-size: 12px; color: var(--gold-text); margin-top: 8px;">
            Miglior Punteggio: <strong>${this.highScore}</strong>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px;">
          <button class="btn-gold btn-block" id="btn-play-again" style="min-height: 50px;">
            Gioca Ancora 🎮
          </button>
          <button class="btn-sm btn-block" id="btn-game-home" style="min-height: 46px;">
            Torna alla Home
          </button>
        </div>
      </div>
    `;

    el.querySelector("#btn-play-again").addEventListener("click", () => {
      this.startGame();
    });

    el.querySelector("#btn-game-home").addEventListener("click", () => {
      window.router?.home();
    });
  }
}
