/**
 * Dobson Pilot - Custom Objects Database
 * Stores up to 200 custom user targets (name, RA, Dec, magnitude) in local storage.
 * Supports CRUD: Create, Read, Update, Delete.
 */

const STORAGE_KEY = "dobson_pilot_custom_targets";

export class CustomDb {
  static getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Error reading custom targets:", e);
    }
    return [];
  }

  static saveAll(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    } catch (e) {
      console.warn("Error saving custom targets:", e);
    }
  }

  static add(target) {
    const list = this.getAll();
    if (list.length >= 200) {
      throw new Error("Limite massimo di 200 oggetti personalizzati raggiunto.");
    }

    const newTarget = {
      id: "CUST_" + Date.now(),
      name: target.name.trim() || "Custom Target",
      type: "Custom Target",
      con: target.con || "Cust",
      ra: Number(target.ra) || 0, // decimal hours
      dec: Number(target.dec) || 0, // decimal degrees
      mag: Number(target.mag) || 10.0,
      createdAt: Date.now()
    };

    list.unshift(newTarget);
    this.saveAll(list);
    return newTarget;
  }

  static update(id, updatedFields) {
    const list = this.getAll();
    const idx = list.findIndex(item => item.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updatedFields };
      this.saveAll(list);
      return list[idx];
    }
    return null;
  }

  static delete(id) {
    const list = this.getAll();
    const filtered = list.filter(item => item.id !== id);
    this.saveAll(filtered);
    return filtered;
  }
}
