/**
 * Dobson Pilot - Celestial Starfield & Planetary Backdrop
 * Generates an astronomical starry canvas background with 7 selectable presets:
 * 0: Deep Space (Amber dust & subtle nebulae)
 * 1: Saturn Rings (Iconic planetary body & orbital ring arcs)
 * 2: Orion Nebula (Magenta/violet gaseous stellar nursery)
 * 3: Pleiades (Sapphire/cyan reflection clouds & bright blue stars)
 * 4: Andromeda (Majestic spiral galaxy disc with dust lane)
 * 5: Milky Way (Dense diagonal galactic band & star clouds)
 * 6: Obsidian Black (Minimalist dark obsidian void with crisp pinpoint stars)
 *
 * Fully integrated with Night Mode (monochromatic dark crimson vision).
 */

import { appState } from "../state.js";

export class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.stars = [];
    this.numStars = 140;
    this.animId = null;
    this.presetIndex = appState.settings.backgroundIndex ?? 1;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.createStars();
    this.applyCustomBackground();
    this.draw();
  }

  setPreset(index) {
    this.presetIndex = Math.max(0, Math.min(6, index));
    this.createStars();
  }

  applyCustomBackground() {
    try {
      if (typeof localStorage !== "undefined") {
        const customBg = localStorage.getItem("dobson_pilot_custom_bg");
        if (customBg) {
          document.body.style.backgroundImage = `url(${customBg})`;
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
        }
      }
    } catch (e) {
      console.warn("Could not load custom background:", e);
    }
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.createStars();
  }

  createStars() {
    this.stars = [];
    const count = this.presetIndex === 5 ? 240 : (this.presetIndex === 6 ? 80 : this.numStars);

    for (let i = 0; i < count; i++) {
      let x = Math.random() * this.width;
      let y = Math.random() * this.height;

      // Milky Way preset concentrates stars along a diagonal band
      if (this.presetIndex === 5) {
        const offset = (Math.random() - 0.5) * (this.height * 0.45);
        y = (x / this.width) * this.height + offset;
      }

      this.stars.push({
        x,
        y,
        radius: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        hue: this.getStarHue()
      });
    }
  }

  getStarHue() {
    // 0: Amber, 2: Magenta, 3: Blue, etc.
    if (this.presetIndex === 3) return "blue";
    if (this.presetIndex === 2) return "magenta";
    if (this.presetIndex === 0) return "amber";
    return "warm";
  }

  draw() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const isNightMode = Boolean(appState.settings.nightMode || document.body.classList.contains("night-mode"));

    // 1. Draw Background Gradient according to preset
    this.drawBackdrop(ctx, width, height, isNightMode);

    // 2. Draw Preset-specific Celestial Features
    if (!isNightMode) {
      if (this.presetIndex === 1) this.drawSaturnRings(ctx, width, height);
      else if (this.presetIndex === 2) this.drawOrionNebula(ctx, width, height);
      else if (this.presetIndex === 3) this.drawPleiadesNebula(ctx, width, height);
      else if (this.presetIndex === 4) this.drawAndromedaGalaxy(ctx, width, height);
      else if (this.presetIndex === 0) this.drawDeepSpaceDust(ctx, width, height);
    }

    // 3. Draw Stars
    this.drawStars(ctx, isNightMode);

    if (typeof requestAnimationFrame !== "undefined") {
      this.animId = requestAnimationFrame(() => this.draw());
    }
  }

  drawBackdrop(ctx, width, height, isNightMode) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);

    if (isNightMode) {
      bgGrad.addColorStop(0, "#080000");
      bgGrad.addColorStop(0.5, "#0d0000");
      bgGrad.addColorStop(1, "#040000");
    } else if (this.presetIndex === 6) {
      // Obsidian Black
      bgGrad.addColorStop(0, "#010102");
      bgGrad.addColorStop(1, "#030305");
    } else if (this.presetIndex === 3) {
      // Pleiades Deep Indigo
      bgGrad.addColorStop(0, "#02040b");
      bgGrad.addColorStop(0.5, "#040915");
      bgGrad.addColorStop(1, "#020308");
    } else if (this.presetIndex === 2) {
      // Orion Cosmic Violet
      bgGrad.addColorStop(0, "#07020a");
      bgGrad.addColorStop(0.5, "#0a0312");
      bgGrad.addColorStop(1, "#040106");
    } else {
      // Default / Saturn / Amber Deep Space
      bgGrad.addColorStop(0, "#030407");
      bgGrad.addColorStop(0.5, "#06080e");
      bgGrad.addColorStop(1, "#020305");
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  drawSaturnRings(ctx, width, height) {
    const planetX = width * 1.08;
    const planetY = height * 0.86;
    const planetRadius = width * 0.68;

    const planetGrad = ctx.createRadialGradient(
      planetX - 40, planetY - 40, planetRadius * 0.1,
      planetX, planetY, planetRadius
    );
    planetGrad.addColorStop(0, "rgba(90, 75, 45, 0.45)");
    planetGrad.addColorStop(0.5, "rgba(45, 35, 20, 0.3)");
    planetGrad.addColorStop(0.85, "rgba(15, 12, 8, 0.8)");
    planetGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.beginPath();
    ctx.arc(planetX, planetY, planetRadius, 0, Math.PI * 2);
    ctx.fillStyle = planetGrad;
    ctx.fill();

    ctx.lineWidth = 1.5;
    for (let r = 0; r < 8; r++) {
      ctx.beginPath();
      ctx.ellipse(
        planetX - 50,
        planetY,
        planetRadius * (1.1 + r * 0.04),
        planetRadius * (0.35 + r * 0.02),
        -Math.PI / 6,
        0,
        Math.PI * 2
      );
      const ringAlpha = (0.35 - r * 0.035).toFixed(3);
      ctx.strokeStyle = `rgba(218, 165, 32, ${ringAlpha})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawOrionNebula(ctx, width, height) {
    const cx = width * 0.75;
    const cy = height * 0.4;
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.55);
    grad.addColorStop(0, "rgba(180, 50, 140, 0.28)");
    grad.addColorStop(0.4, "rgba(110, 30, 120, 0.15)");
    grad.addColorStop(0.8, "rgba(40, 15, 60, 0.05)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPleiadesNebula(ctx, width, height) {
    const cx = width * 0.3;
    const cy = height * 0.35;
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, width * 0.5);
    grad.addColorStop(0, "rgba(70, 140, 230, 0.25)");
    grad.addColorStop(0.5, "rgba(30, 80, 160, 0.12)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawAndromedaGalaxy(ctx, width, height) {
    const cx = width * 0.6;
    const cy = height * 0.45;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 5);

    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, width * 0.45);
    grad.addColorStop(0, "rgba(240, 220, 180, 0.35)");
    grad.addColorStop(0.3, "rgba(180, 150, 110, 0.18)");
    grad.addColorStop(0.7, "rgba(60, 50, 40, 0.06)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.scale(1.8, 0.6);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, width * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawDeepSpaceDust(ctx, width, height) {
    const cx = width * 0.5;
    const cy = height * 0.7;
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, width * 0.6);
    grad.addColorStop(0, "rgba(229, 169, 60, 0.12)");
    grad.addColorStop(0.5, "rgba(140, 90, 25, 0.05)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStars(ctx, isNightMode) {
    for (const star of this.stars) {
      star.alpha += star.twinkleSpeed;
      if (star.alpha > 0.95 || star.alpha < 0.2) {
        star.twinkleSpeed = -star.twinkleSpeed;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);

      if (isNightMode) {
        ctx.fillStyle = `rgba(255, 60, 60, ${star.alpha.toFixed(2)})`;
      } else if (star.hue === "blue") {
        ctx.fillStyle = `rgba(190, 220, 255, ${star.alpha.toFixed(2)})`;
      } else if (star.hue === "magenta") {
        ctx.fillStyle = `rgba(255, 190, 230, ${star.alpha.toFixed(2)})`;
      } else if (star.hue === "amber") {
        ctx.fillStyle = `rgba(255, 215, 130, ${star.alpha.toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(255, 235, 190, ${star.alpha.toFixed(2)})`;
      }
      ctx.fill();
    }
  }

  destroy() {
    if (this.animId && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.animId);
    }
  }
}
