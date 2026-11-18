// save.js — localStorage save/load for SOLMAR. The save holds money, the
// mission reached, owned weapons and lifetime stats. It never holds the
// world layout: the city is regenerated from the seed on every visit.

import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(G) {
  try {
    const data = {
      money: G.player.money,
      missionIndex: Math.max(G.missionIndex, G.stats.missionsDone),
      owned: G.player.owned,
      ammo: G.player.ammo,
      stats: G.stats,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}
