// SOLMAR — Streets of the Sun: shared constants, palette and game data.
// Every name, place and vehicle here is fictional and original.

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_HALF = 45; // half width of a road in world units
export const STEP = 1 / 60; // fixed simulation step, seconds

// Road centre lines (a regular grid; blocks between them hold buildings).
export const ROAD_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_Y = [200, 600, 1000, 1400, 1800, 2200];

// Golden-hour palette: warm sun, dusty streets, turquoise sea.
export const PAL = {
  grass: '#7fae5a',
  grassDark: '#6d9c4c',
  sand: '#e8cf9a',
  sea: '#2f8fae',
  seaDeep: '#22708f',
  road: '#4a4a52',
  roadEdge: '#3a3a42',
  lane: '#e8d27a',
  sidewalk: '#b9b3a4',
  building: ['#c98f5f', '#b57a52', '#d9a06b', '#8f7ba8', '#7d94a8', '#a86a6a', '#6a8f7d', '#c2b280'],
  roof: ['#8a5a3b', '#6b4a3a', '#7a6a55', '#5d5a6e'],
  windowLit: '#ffd98a',
  windowDark: '#2e3440',
  park: '#5f9e4d',
  parkPath: '#cbb98f',
  tree: '#2f7a3d',
  treeLight: '#4da34d',
  palm: '#3f8f4f',
  mansion: '#e8dcc0',
  garage: '#5a6a7a',
};

export const CAR_TYPES = {
  sedan:   { name: 'Solmar Sedan',   color: '#5a7ec2', top: 150, accel: 340, brake: 520, maxSpeed: 430, grip: 2.6, len: 46, wid: 22 },
  taxi:    { name: 'Solmar Taxi',    color: '#e8c832', top: 165, accel: 330, brake: 520, maxSpeed: 420, grip: 2.6, len: 46, wid: 22 },
  falco:   { name: 'Falco GT',       color: '#c22a2a', top: 260, accel: 520, brake: 640, maxSpeed: 640, grip: 3.4, len: 48, wid: 22 },
  pickup:  { name: 'Bay Pickup',     color: '#7a5a3a', top: 140, accel: 300, brake: 480, maxSpeed: 400, grip: 2.4, len: 50, wid: 23 },
  van:     { name: 'Cargo Van',      color: '#9aa0a8', top: 120, accel: 260, brake: 440, maxSpeed: 360, grip: 2.2, len: 54, wid: 24 },
  coupe:   { name: 'Lumen Coupe',    color: '#c25aa8', top: 220, accel: 470, brake: 600, maxSpeed: 560, grip: 3.1, len: 46, wid: 22 },
  patrol:  { name: 'Patrol Cruiser', color: '#20303e', top: 230, accel: 500, brake: 620, maxSpeed: 600, grip: 3.3, len: 48, wid: 22 },
};

export const WEAPONS = {
  pistol: { name: 'P9 Pistol',  damage: 34, rate: 0.28, mag: 12, reload: 1.1, spread: 0.05, range: 520, price: 0,    bulletSpeed: 900 },
  smg:    { name: 'K9 SMG',     damage: 20, rate: 0.09, mag: 30, reload: 1.4, spread: 0.11, range: 460, price: 450,  bulletSpeed: 950 },
  rifle:  { name: 'AR-7 Rifle', damage: 55, rate: 0.16, mag: 24, reload: 1.6, spread: 0.03, range: 700, price: 1200, bulletSpeed: 1300 },
};

export const SHOP_DEFS = [
  { kind: 'weapons', name: 'Ironworks Arms', x: 1500, y: 745,  desc: 'Buy guns and ammo' },
  { kind: 'clinic',  name: 'Sun Clinic',     x: 1900, y: 1155, desc: 'Heal up — $100' },
  { kind: 'spray',   name: 'Spray & Shine',  x: 700,  y: 1555, desc: 'New paint clears wanted — $300' },
  { kind: 'garage',  name: 'Rico Garage',    x: 2300, y: 1955, desc: 'Mission drop-off' },
];

export const MISSION_DEFS = [
  { id: 1, title: 'Hot Wheels',        brief: 'Steal the red Falco GT downtown and deliver it to Rico Garage.', reward: 500 },
  { id: 2, title: 'Express Run',       brief: 'Courier run: hit all 3 drop points before the timer runs out.',  reward: 800 },
  { id: 3, title: 'Crate Expectations', brief: 'Collect 6 supply crates hidden around Solmar Bay.',             reward: 600 },
  { id: 4, title: 'Viper Nest',        brief: 'Wipe out the Viper gang in Coral Park. 8 targets.',              reward: 1200 },
  { id: 5, title: 'Three-Star Getaway', brief: 'The heat is on: survive 3 stars for 90 seconds, then reach the hideout.', reward: 1500 },
  { id: 6, title: 'King of Solmar',    brief: 'Finale at the Voss Mansion: clear all three waves.',             reward: 5000 },
];

export const CRATE_SPOTS = [
  { x: 350, y: 350 }, { x: 1250, y: 750 }, { x: 2050, y: 350 },
  { x: 2750, y: 1250 }, { x: 850, y: 2050 }, { x: 2450, y: 1650 },
];

export const COURIER_POINTS = [
  { x: 2600, y: 600 }, { x: 600, y: 1400 }, { x: 2200, y: 1800 },
];

export const HIDEOUT = { x: 450, y: 2050 };
export const MANSION = { x: 400, y: 400 };
export const GARAGE = { x: 2300, y: 1955 };
export const PARK_CENTER = { x: 1200, y: 1200 };
export const PLAYER_START = { x: 1000, y: 1820 };

export const SAVE_KEY = 'solmar-save-v1';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
