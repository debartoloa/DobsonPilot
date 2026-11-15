/**
 * Dobson Pilot - Observing Tours Database
 * Persists up to 10 custom observing tours in local storage.
 * Each tour stores a snapshot of objects, session timings, and location.
 */

const STORAGE_KEY = "dobson_pilot_tours";
const MAX_TOURS = 10;

export class ToursDb {
  static getAll() {
    try {
      if (typeof localStorage === "undefined") return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Could not read tours from storage:", e);
      return [];
    }
  }

  static get(id) {
    const list = this.getAll();
    return list.find(t => t.id === id) || null;
  }

  static save(tour) {
    const list = this.getAll();
    const existingIndex = list.findIndex(t => t.id === tour.id);

    if (existingIndex >= 0) {
      // Update
      list[existingIndex] = { ...tour, updatedAt: new Date().toISOString() };
    } else {
      // Create new
      if (list.length >= MAX_TOURS) {
        throw new Error(`Limite massimo di ${MAX_TOURS} tour raggiunto. Elimina un tour esistente per salvarne uno nuovo.`);
      }
      list.push({
        ...tour,
        id: tour.id || `tour_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return tour;
  }

  static delete(id) {
    const list = this.getAll().filter(t => t.id !== id);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  }

  static isNameUnique(name, excludeId = null) {
    const clean = name.trim().toLowerCase();
    const list = this.getAll();
    return !list.some(t => t.name.trim().toLowerCase() === clean && t.id !== excludeId);
  }
}
