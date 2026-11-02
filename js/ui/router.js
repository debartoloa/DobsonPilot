/**
 * Dobson Pilot - Screen Router & Page Navigation
 * Handles screen transitions, history stack, top Back button, and bottom Home button.
 */

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

  back() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      this.navigate(prev, false);
    } else {
      this.navigate("home", false);
    }
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
      if (pageEl instanceof HTMLElement) {
        this.container.appendChild(pageEl);
      } else if (typeof pageEl === "string") {
        this.container.innerHTML = pageEl;
      }
    }
  }
}
