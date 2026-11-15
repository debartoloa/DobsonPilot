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
      // Obsidian Midnight
      bgGrad.addColorStop(0, "#03050c");
      bgGrad.addColorStop(1, "#060a16");
    } else if (this.presetIndex === 3) {
      // Pleiades Deep Indigo-Blue
      bgGrad.addColorStop(0, "#040816");
      bgGrad.addColorStop(0.5, "#081229");
      bgGrad.addColorStop(1, "#040712");
    } else if (this.presetIndex === 2) {
      // Orion Cosmic Violet-Navy
      bgGrad.addColorStop(0, "#070616");
      bgGrad.addColorStop(0.5, "#0d0924");
      bgGrad.addColorStop(1, "#050611");
    } else {
      // Default / Saturn / Deep Space Midnight Navy & Indigo (Harmonized with UI cards)
      bgGrad.addColorStop(0, "#050915");
      bgGrad.addColorStop(0.5, "#0a1226");
      bgGrad.addColorStop(1, "#040711");
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
    planetGrad.addColorStop(0, "rgba(109, 72, 195, 0.28)");
    planetGrad.addColorStop(0.5, "rgba(35, 52, 105, 0.22)");
    planetGrad.addColorStop(0.85, "rgba(8, 14, 30, 0.75)");
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
      const ringAlpha = (0.28 - r * 0.028).toFixed(3);
      ctx.strokeStyle = r % 2 === 0
        ? `rgba(192, 132, 252, ${ringAlpha})`
        : `rgba(148, 163, 184, ${ringAlpha})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawOrionNebula(ctx, width, height) {
    const cx = width * 0.75;
    const cy = height * 0.4;
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.55);
    grad.addColorStop(0, "rgba(168, 85, 247, 0.26)");
    grad.addColorStop(0.4, "rgba(109, 40, 217, 0.14)");
    grad.addColorStop(0.8, "rgba(30, 27, 75, 0.06)");
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
    grad.addColorStop(0, "rgba(56, 189, 248, 0.22)");
    grad.addColorStop(0.5, "rgba(30, 64, 175, 0.12)");
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
    grad.addColorStop(0, "rgba(241, 245, 249, 0.30)");
    grad.addColorStop(0.3, "rgba(168, 85, 247, 0.18)");
    grad.addColorStop(0.7, "rgba(30, 41, 59, 0.06)");
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
    const cy = height * 0.35;
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, width * 0.65);
    grad.addColorStop(0, "rgba(139, 92, 246, 0.14)");
    grad.addColorStop(0.5, "rgba(30, 58, 138, 0.07)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.65, 0, Math.PI * 2);
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
        ctx.fillStyle = `rgba(186, 230, 253, ${star.alpha.toFixed(2)})`;
      } else if (star.hue === "magenta") {
        ctx.fillStyle = `rgba(233, 213, 255, ${star.alpha.toFixed(2)})`;
      } else if (star.hue === "amber") {
        ctx.fillStyle = `rgba(216, 180, 254, ${star.alpha.toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(248, 250, 252, ${star.alpha.toFixed(2)})`;
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
