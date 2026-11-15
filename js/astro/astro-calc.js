/**
 * Dobson Pilot - Astronomical Coordinate Calculations
 * Powered by astronomy-engine (MIT).
 * Computes:
 * - RA/Dec (Equator of Date) <-> Alt/Az (Horizontal)
 * - J2000 to Epoch of Date precession (required by CosmoPilot ESP32 firmware)
 * - Visibility check (Altitude >= 10.0 degrees)
 * - Ephemerides for Solar System bodies (Sun, Moon, Planets)
 */

import * as Astronomy from "../../vendor/astronomy-engine.esm.js";

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

export class AstroCalc {
  /**
   * Convert RA/Dec (hours, degrees) to Alt/Az for given observer and time
   * @param {number} raHours - Right ascension (0 to 24)
   * @param {number} decDeg - Declination (-90 to +90)
   * @param {Date} [date] - Observation time (defaults to now)
   * @param {number} [lat] - Observer latitude in decimal degrees
   * @param {number} [lon] - Observer longitude in decimal degrees
   * @returns {{ altitude: number, azimuth: number, isVisible: boolean }}
   */
  static raDecToAltAz(raHours, decDeg, date = new Date(), lat = 45.4642, lon = 9.1900) {
    const obs = new Astronomy.Observer(lat, lon, 100);
    const hor = Astronomy.Horizon(date, obs, raHours, decDeg, "normal");
    return {
      altitude: hor.altitude,
      azimuth: hor.azimuth,
      isVisible: hor.altitude >= 10.0
    };
  }

  /**
   * Convert Alt/Az to RA/Dec (hours, degrees) for given observer and time
   * @param {number} altDeg - Altitude degrees (0 to 90)
   * @param {number} azDeg - Azimuth degrees (0 to 360, North=0, East=90)
   * @param {Date} [date] - Observation time
   * @param {number} [lat] - Observer latitude
   * @param {number} [lon] - Observer longitude
   * @returns {{ raHours: number, decDeg: number }}
   */
  static altAzToRaDec(altDeg, azDeg, date = new Date(), lat = 45.4642, lon = 9.1900) {
    const phi = lat * DEG2RAD;
    const a = altDeg * DEG2RAD;
    const az = azDeg * DEG2RAD;

    // Declination
    const sinDec = Math.sin(phi) * Math.sin(a) + Math.cos(phi) * Math.cos(a) * Math.cos(az);
    const clampedSinDec = Math.max(-1, Math.min(1, sinDec));
    const decDeg = Math.asin(clampedSinDec) * RAD2DEG;

    // Hour Angle
    const y = -Math.sin(az) * Math.cos(a);
    const x = Math.cos(phi) * Math.sin(a) - Math.sin(phi) * Math.cos(a) * Math.cos(az);
    let H = Math.atan2(y, x) * RAD2DEG;
    if (H < 0) H += 360;
    const H_hours = H / 15.0;

    // Local Sidereal Time
    const gast = Astronomy.SiderealTime(date);
    let lst = (gast + lon / 15.0) % 24;
    if (lst < 0) lst += 24;

    // Right Ascension
    let raHours = (lst - H_hours) % 24;
    if (raHours < 0) raHours += 24;

    return { raHours, decDeg };
  }

  /**
   * Precess catalog coordinates from J2000 to Current Epoch of Date
   * Firmware rule: ESP32 requires coordinates at the date's equinox.
   * @param {number} raHoursJ2000
   * @param {number} decDegJ2000
   * @param {Date} [date]
   * @param {number} [lat]
   * @param {number} [lon]
   * @returns {{ raHours: number, decDeg: number }}
   */
  static precessJ2000ToDate(raHoursJ2000, decDegJ2000, date = new Date(), lat = 45.4642, lon = 9.1900) {
    const obs = new Astronomy.Observer(lat, lon, 100);
    // Use Star1 from Astronomy.Body for arbitrary target precession
    Astronomy.DefineStar(Astronomy.Body.Star1, raHoursJ2000, decDegJ2000, 1000);
    // Calculate apparent equator of date
    const eq = Astronomy.Equator(Astronomy.Body.Star1, date, obs, true, true);
    return {
      raHours: eq.ra,
      decDeg: eq.dec
    };
  }

  /**
   * Compute angular separation between two celestial points (degrees)
   * @param {number} ra1Hours
   * @param {number} dec1Deg
   * @param {number} ra2Hours
   * @param {number} dec2Deg
   * @returns {number} Distance in degrees (0 to 180)
   */
  static angularDistance(ra1Hours, dec1Deg, ra2Hours, dec2Deg) {
    const a1 = ra1Hours * 15 * DEG2RAD;
    const d1 = dec1Deg * DEG2RAD;
    const a2 = ra2Hours * 15 * DEG2RAD;
    const d2 = dec2Deg * DEG2RAD;

    const cosD = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(a1 - a2);
    const clamped = Math.max(-1, Math.min(1, cosD));
    return Math.acos(clamped) * RAD2DEG;
  }

  /**
   * Get ephemeris and visibility info for a Solar System target
   * Valid: 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Moon', 'Sun'
   * @param {string} bodyName
   * @param {Date} [date]
   * @param {number} [lat]
   * @param {number} [lon]
   * @returns {{ name: string, ra: number, dec: number, alt: number, az: number, isVisible: boolean, mag: number }}
   */
  static getSolarSystemBody(bodyName, date = new Date(), lat = 45.4642, lon = 9.1900) {
    const obs = new Astronomy.Observer(lat, lon, 100);
    const eq = Astronomy.Equator(bodyName, date, obs, true, true);
    const hor = Astronomy.Horizon(date, obs, eq.ra, eq.dec, "normal");

    let mag = 0;
    try {
      const illum = Astronomy.Illumination(bodyName, date);
      mag = illum.mag;
    } catch (e) {
      // Sun/Moon fallback approximate mags
      if (bodyName.toLowerCase() === "sun") mag = -26.7;
      else if (bodyName.toLowerCase() === "moon") mag = -12.7;
    }

    return {
      name: bodyName,
      ra: eq.ra,
      dec: eq.dec,
      alt: hor.altitude,
      az: hor.azimuth,
      isVisible: hor.altitude >= 10.0,
      mag: Number(mag.toFixed(1))
    };
  }

  /**
   * Retrieve all 9 supported solar system bodies with coordinates & visibility
   */
  static getAllSolarSystemBodies(date = new Date(), lat = 45.4642, lon = 9.1900) {
    const bodies = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Moon", "Sun"];
    return bodies.map(b => this.getSolarSystemBody(b, date, lat, lon));
  }
}
