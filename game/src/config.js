// config.js — SOLMAR: Streets of the Sun. All tunable constants in one place.
// An original 2D top-down open-world crime game set in the fictional city
// of Solmar Bay. No assets, names or trademarks from any commercial game.

export const WORLD_W = 3200;
export const WORLD_H = 2400;

export const VIEW_W = 1280;
export const VIEW_H = 800;

// Golden-hour palette (sun low in the west, long shadows to the east).
export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#6f9c4e',
  road: '#3c3f46',
  roadLine: '#e8d27a',
  sidewalk: '#9a938a',
  sand: '#e3c98f',
  water: '#2e7fa8',
  waterDeep: '#256b8f',
  parkGrass: '#69a854',
  hill: '#8a9a6a',
  buildingRoof: ['#b5674a', '#7a6f8f', '#4a7a8f', '#8f7a4a', '#6a8f6a', '#a85a6a'],
  buildingEdge: '#00000033',
};

// Street grid: avenues run north-south, streets run east-west.
export const AVENUES = [400, 1000, 1600, 2200, 2800];
export const STREETS = [350, 800, 1250, 1700, 2150];
export const ROAD_HALF = 45;

// District rectangles (x, y, w, h).
export const DISTRICTS = {
  park: { x: 1045, y: 845, w: 510, h: 360, name: 'Solmar Park' },
  beach: { x: 0, y: 2195, w: 3200, h: 205, name: 'Palmera Beach' },
  harbor: { x: 2845, y: 395, w: 355, h: 360, name: 'Solmar Harbor' },
  hill: { x: 0, y: 0, w: 355, h: 305, name: 'Mansion Hill' },
  downtown: { x: 1450, y: 200, w: 900, h: 500, name: 'Downtown' },
};

// Fixed points of interest.
export const POIS = {
  garage: { x: 2350, y: 1650, name: 'Rico Garage' },
  gunShop: { x: 950, y: 320, name: 'Ironworks Gun Shop' },
  clinic: { x: 1650, y: 1750, name: 'Sunrise Clinic' },
  sprayShop: { x: 550, y: 1300, name: 'Fresh Coat Spray Shop' },
  mansion: { x: 180, y: 150, name: 'Villa Del Sol' },
  falcoSpot: { x: 1750, y: 500, name: 'Falco GT' },
  courierDrop: { x: 3050, y: 580, name: 'Harbor Drop' },
};

// Seven stealable car types.
export const CAR_TYPES = [
  { key: 'falco', name: 'Falco GT', color: '#c0272d', accel: 340, maxSpeed: 430, grip: 3.4, len: 52, wid: 26 },
  { key: 'coupe', name: 'Lumen Coupe', color: '#2d6fc0', accel: 300, maxSpeed: 390, grip: 3.2, len: 50, wid: 25 },
  { key: 'sedan', name: 'Marina Sedan', color: '#d8d8d8', accel: 240, maxSpeed: 320, grip: 3.0, len: 50, wid: 25 },
  { key: 'taxi', name: 'Solmar Taxi', color: '#e8b400', accel: 230, maxSpeed: 310, grip: 3.0, len: 50, wid: 25 },
  { key: 'pickup', name: 'Dune Pickup', color: '#7a4a21', accel: 250, maxSpeed: 330, grip: 2.9, len: 54, wid: 26 },
  { key: 'van', name: 'Cargo Van', color: '#5a6a7a', accel: 190, maxSpeed: 270, grip: 2.7, len: 58, wid: 28 },
  { key: 'truck', name: 'Haul Truck', color: '#3a5a3a', accel: 160, maxSpeed: 250, grip: 2.5, len: 66, wid: 30 },
];

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, rate: 0.28, mag: 12, reload: 1.0, range: 520, spread: 0.03, price: 0, ammoPrice: 40 },
  smg: { name: 'SMG', damage: 18, rate: 0.09, mag: 30, reload: 1.4, range: 460, spread: 0.07, price: 350, ammoPrice: 90 },
  rifle: { name: 'Rifle', damage: 70, rate: 0.55, mag: 8, reload: 1.8, range: 640, spread: 0.01, price: 900, ammoPrice: 120 },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'rifle'];

export const MISSION_DEFS = [
  { id: 1, name: 'Hot Wheels', brief: 'Steal the red Falco GT downtown and deliver it to Rico Garage.', reward: 500 },
  { id: 2, name: 'Rush Hour', brief: 'Courier run: reach the Harbor Drop before the timer runs out.', reward: 800 },
  { id: 3, name: 'Supply Run', brief: 'Collect 6 supply crates scattered around the park and downtown.', reward: 600 },
  { id: 4, name: 'Park Cleanup', brief: 'Wipe out 8 Vipers hiding in Solmar Park.', reward: 1200 },
  { id: 5, name: 'Heat Wave', brief: 'Survive 90 seconds at 3 stars. Do not get busted.', reward: 1500 },
  { id: 6, name: 'King of Solmar', brief: 'Storm Villa Del Sol. Three waves guard the mansion.', reward: 5000 },
];

export const WANTED_MAX = 5;
export const SPRAY_PRICE = 300;
export const CLINIC_PRICE = 150;
export const SAVE_KEY = 'solmar-save-v1';

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
