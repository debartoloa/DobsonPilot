/**
 * Dobson Pilot - Main PWA Entrypoint
 * Bootstraps starfield background, router, 3-phase status bar,
 * transport manager (BLE + Mock), and debug console.
 */

import { APP_NAME } from "./config.js";
import { appState } from "./state.js";
import { i18n } from "./i18n/i18n.js";
import { TransportManager } from "./transport/transport-manager.js";
import { Starfield } from "./ui/starfield.js";
import { StatusBar } from "./ui/status-bar.js";
import { Router } from "./ui/router.js";
import { Screens } from "./ui/screens.js";
import { DebugConsole } from "./ui/debug-console.js";
import { JoystickView } from "./ui/joystick-view.js";
import { HandMoveView } from "./ui/hand-move-view.js";
import { CalendarView } from "./ui/calendar-view.js";
import { ShowSettingsView } from "./ui/show-settings-view.js";
import { OtherSettingsView } from "./ui/other-settings-view.js";
import { AppSettingsView } from "./ui/app-settings-view.js";
import { ManualGotoView } from "./ui/manual-goto-view.js";
import { SolarSystemView } from "./ui/solar-system-view.js";
import { CatalogView } from "./ui/catalog-view.js";
import { RandomView } from "./ui/random-view.js";
import { AlignmentView } from "./ui/alignment-view.js";
import { 
  JoystickCalibView, 
  DirectionsView, 
  GearRatioView, 
  BacklashView, 
  GearRatioCheckView, 
  FactoryResetView 
} from "./ui/hardware-calib-views.js";
import { ToursView } from "./ui/tours-view.js";
import { GameView } from "./ui/game-view.js";

class DobsonApp {
  constructor() {
    this.starfield = null;
    this.statusBar = null;
    this.router = null;
    this.transportManager = null;
    this.debugConsole = null;
  }

  async init() {
    console.log(`Starting ${APP_NAME}...`);

    // 0. Initialize i18n localization
    try {
      await i18n.init();
    } catch (e) {
      console.warn("Could not initialize i18n:", e);
    }

    // 1. Starfield Background
    const canvas = document.getElementById("starfield-canvas");
    if (canvas) {
      this.starfield = new Starfield(canvas);
      window.starfield = this.starfield;
    }

    // 2. Transport Manager (BLE + Mock + CommandQueue)
    this.transportManager = new TransportManager();
    window.transportManager = this.transportManager;

    // 3. Status Bar (3-phase indicator)
    const statusBarEl = document.getElementById("status-bar-container");
    this.statusBar = new StatusBar(statusBarEl);

    // 4. Main View Router
    const mainViewEl = document.getElementById("main-view");
    this.router = new Router(mainViewEl, (routeId) => {
      // Auto-update title or track route if needed
    });
    window.router = this.router;

    // Register routes
    this.router.register("home", () => Screens.home());
    this.router.register("goto-menu", () => Screens.gotoMenu());
    this.router.register("calib-menu", () => Screens.calibMenu());
    this.router.register("free-menu", () => Screens.freeMenu());
    this.router.register("config-menu", () => Screens.configMenu());
    this.router.register("config-telescope", () => Screens.configTelescope());
    this.router.register("config-calibrations", () => Screens.configCalibrations());
    this.router.register("config-bluetooth", () => Screens.configBluetooth(this.transportManager));
    this.router.register("about", () => Screens.about());

    // Phase 2: Free Movement Routes
    this.router.register("free-app-joystick", () => {
      const view = new JoystickView({
        isAnalog: false,
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("free-menu")
      });
      return view.render();
    });

    this.router.register("free-analog-joystick", () => {
      const view = new JoystickView({
        isAnalog: true,
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("free-menu")
      });
      return view.render();
    });

    this.router.register("free-hand-move", () => {
      const view = new HandMoveView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("free-menu")
      });
      return view.render();
    });

    // Phase 3: Calendar, Auto Sync, Show Settings, Other & App Settings
    this.router.register("calib-auto-sync", () => {
      const view = new CalendarView({
        isAutoSyncOnly: true,
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("calib-menu")
      });
      return view.render();
    });

    // Phase 6: Alignment (1-Star & 2-Star Align)
    this.router.register("calib-1star", () => {
      const view = new AlignmentView({
        mode: "1star",
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("calib-menu")
      });
      return view.render();
    });

    this.router.register("calib-2star", () => {
      const view = new AlignmentView({
        mode: "2star",
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("calib-menu")
      });
      return view.render();
    });

    this.router.register("config-calendar", () => {
      const view = new CalendarView({
        isAutoSyncOnly: false,
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-telescope")
      });
      return view.render();
    });

    this.router.register("config-show-settings", () => {
      const view = new ShowSettingsView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-telescope")
      });
      return view.render();
    });

    this.router.register("config-other", () => {
      const view = new OtherSettingsView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-telescope")
      });
      return view.render();
    });

    // Phase 8: Hardware Calibrations
    this.router.register("calib-joystick", () => {
      const view = new JoystickCalibView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-calibrations")
      });
      return view.render();
    });

    this.router.register("calib-directions", () => {
      const view = new DirectionsView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-calibrations")
      });
      return view.render();
    });

    this.router.register("calib-gear-ratio", () => {
      const view = new GearRatioView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-calibrations")
      });
      return view.render();
    });

    this.router.register("calib-backlash", () => {
      const view = new BacklashView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-calibrations")
      });
      return view.render();
    });

    this.router.register("calib-gear-check", () => {
      const view = new GearRatioCheckView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-calibrations")
      });
      return view.render();
    });

    this.router.register("calib-factory-reset", () => {
      const view = new FactoryResetView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("config-calibrations")
      });
      return view.render();
    });

    this.router.register("config-app", () => {
      const view = new AppSettingsView({
        onBack: () => this.router.navigate("config-menu")
      });
      return view.render();
    });

    // Phase 4: GoTo (Manual & Solar System)
    this.router.register("manual", () => {
      const view = new ManualGotoView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("goto-menu")
      });
      return view.render();
    });

    this.router.register("solar-system", () => {
      const view = new SolarSystemView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("goto-menu")
      });
      return view.render();
    });

    // Phase 5: Catalog & Random
    this.router.register("catalog", () => {
      const view = new CatalogView({
        commandQueue: this.transportManager.queue,
        initialCategory: "menu",
        onBack: () => this.router.navigate("goto-menu")
      });
      return view.render();
    });

    ["messier", "stars", "galaxies", "nebulae", "custom"].forEach(cat => {
      this.router.register(`catalog-${cat}`, () => {
        const view = new CatalogView({
          commandQueue: this.transportManager.queue,
          initialCategory: cat,
          onBack: () => this.router.navigate("catalog")
        });
        return view.render();
      });
    });

    this.router.register("random", () => {
      const view = new RandomView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("goto-menu")
      });
      return view.render();
    });

    // Phase 9: Observing Tours & Astronomy Quiz Game
    this.router.register("tours", () => {
      const view = new ToursView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("goto-menu")
      });
      return view.render();
    });

    this.router.register("game", () => {
      const view = new GameView({
        commandQueue: this.transportManager.queue,
        onBack: () => this.router.navigate("goto-menu")
      });
      return view.render();
    });

    // Debug Console route
    this.router.register("debug", () => {
      const wrapper = document.createElement("div");
      wrapper.className = "screen-container";
      wrapper.innerHTML = `
        <div class="screen-header">
          <button class="btn-header-back" data-action="back">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
          </button>
          <h2 class="screen-title">Debug BLE</h2>
        </div>
        <div class="screen-divider"></div>
        <div id="debug-console-mount"></div>
        <div class="screen-footer-home">
          <button class="btn-footer-home" data-action="home" title="Torna alla Home">
            <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </button>
        </div>
      `;
      const mount = wrapper.querySelector("#debug-console-mount");
      this.debugConsole = new DebugConsole(mount, this.transportManager.queue, this.transportManager);
      return wrapper;
    });

    // Initial navigation
    this.router.navigate("home");

    // 5. Check first run onboarding
    this.checkOnboarding();

    // 6. Register Service Worker for offline PWA
    this.registerServiceWorker();

    // 7. Auto-reconnect if enabled
    if (appState.settings.autoReconnect) {
      setTimeout(() => {
        this.transportManager.bleTransport.tryAutoReconnect().catch(() => {});
      }, 1000);
    }
  }

  checkOnboarding() {
    const onboarded = localStorage.getItem("dobson_pilot_onboarded");
    const modal = document.getElementById("onboarding-modal");
    if (!onboarded && modal) {
      modal.style.display = "flex";
      const btn = document.getElementById("btn-accept-terms");
      btn.addEventListener("click", () => {
        localStorage.setItem("dobson_pilot_onboarded", "true");
        modal.style.display = "none";
      });
    }
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("./sw.js").then((reg) => {
        console.log("Service Worker registered with scope:", reg.scope);
        reg.update();
      }).catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
    }
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  const app = new DobsonApp();
  app.init().catch(err => console.error("Error initializing DobsonApp:", err));
});
