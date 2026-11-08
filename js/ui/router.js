/**
 * Dobson Pilot - Screen Router & Page Navigation
 * Handles screen transitions with hierarchical path-based Back navigation
 * and bottom Home button.
 */

export const ROUTE_PARENTS = {
  // Main level (back goes to home)
  "goto-menu": "home",
  "calib-menu": "home",
  "free-menu": "home",
  "config-menu": "home",
  "about": "home",
  "debug": "home",

  // GoTo Submenu
  "catalog": "goto-menu",
  "catalog-messier": "catalog",
  "catalog-stars": "catalog",
  "catalog-galaxies": "catalog",
  "catalog-nebulae": "catalog",
  "catalog-custom": "catalog",
  "tours": "goto-menu",
  "game": "goto-menu",
  "random": "goto-menu",
  "manual": "goto-menu",
  "solar-system": "goto-menu",

  // Calib Submenu
  "calib-auto-sync": "calib-menu",
  "calib-1star": "calib-menu",
  "calib-2star": "calib-menu",

  // Free Submenu
  "free-app-joystick": "free-menu",
  "free-analog-joystick": "free-menu",
  "free-hand-move": "free-menu",

  // Config Submenu
  "config-bluetooth": "config-menu",
  "config-telescope": "config-menu",
  "config-calibrations": "config-menu",
  "config-app": "config-menu",

  // Telescope Config Submenu
  "config-calendar": "config-telescope",
  "config-other": "config-telescope",
  "config-show-settings": "config-telescope",

  // Calibrations Config Submenu
  "calib-joystick": "config-calibrations",
  "calib-directions": "config-calibrations",
  "calib-gear-ratio": "config-calibrations",
  "calib-backlash": "config-calibrations",
  "calib-gear-check": "config-calibrations",
  "calib-factory-reset": "config-calibrations"
};

export class Router {
  constructor(container, onPageChange) {
    this.container = container;
    this.onPageChange = onPageChange;
    this.currentRoute = "home";
    this.history = [];
    this.routes = new Map();
    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    this.container.addEventListener("click", (e) => {
      // 1. Back button
      const backBtn = e.target.closest("[data-action='back']");
      if (backBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.back();
        return;
      }

      // 2. Home button
      const homeBtn = e.target.closest("[data-action='home']");
      if (homeBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.home();
        return;
      }

      // 3. Navigation link
      const routeBtn = e.target.closest("[data-route]");
      if (routeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const route = routeBtn.getAttribute("data-route");
        if (route) {
          this.navigate(route);
        }
      }
    });
  }

  register(routeId, renderFn) {
    this.routes.set(routeId, renderFn);
  }

  navigate(routeId, pushHistory = true) {
    if (!this.routes.has(routeId)) {
      console.warn(`Route '${routeId}' not found, redirecting to home.`);
      routeId = "home";
    }

    if (pushHistory && this.currentRoute && this.currentRoute !== routeId) {
      this.history.push(this.currentRoute);
    }

    this.currentRoute = routeId;
    this.render();
    if (this.onPageChange) {
      this.onPageChange(routeId);
    }
  }

  /**
   * Hierarchical back navigation:
   * Always navigates to the immediate parent in the menu structure.
   */
  back() {
    const parentRoute = ROUTE_PARENTS[this.currentRoute] || "home";
    this.navigate(parentRoute, false);
  }

  home() {
    this.history = [];
    this.navigate("home", false);
  }

  render() {
    const renderFn = this.routes.get(this.currentRoute);
    if (renderFn) {
      this.container.innerHTML = "";
      const pageEl = renderFn(this);
      if (pageEl && (pageEl.nodeType === 1 || (typeof HTMLElement !== "undefined" && pageEl instanceof HTMLElement))) {
        this.container.appendChild(pageEl);
      } else if (typeof pageEl === "string") {
        this.container.innerHTML = pageEl;
      }
    }
  }
}
