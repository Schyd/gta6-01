// SOLMAR — tuning, palette and world constants. One place for every number the
// rest of the game balances against, so a tweak here retunes the whole city.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 72;
export const BLOCK = 400;

// Vertical and horizontal road centre lines. The city is a grid; everything
// else (buildings, parks, shops) lives in the blocks between these roads.
export const V_ROADS = [300, 700, 1100, 1500, 1900, 2300, 2700];
export const H_ROADS = [250, 550, 850, 1150, 1450, 1750, 2050];

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-save-v1';

// Sun-soaked golden-hour palette. Warm asphalt, pale sidewalks, terracotta
// roofs and turquoise water: one coherent look across every screen.
export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#6f9d55',
  sand: '#e8cf9a',
  water: '#2f8fb5',
  waterDeep: '#22708f',
  asphalt: '#3d3a38',
  asphaltLine: '#d8c95c',
  sidewalk: '#b9ac93',
  crosswalk: '#e8e2d2',
  roofA: '#c96f4a',
  roofB: '#b85c50',
  roofC: '#8a6f8e',
  roofD: '#5f7d6a',
  roofE: '#d9a441',
  roofEdge: 'rgba(0,0,0,0.25)',
  park: '#69a854',
  tree: '#3f7d3a',
  treeLight: '#5da24e',
};

export const CAR_TYPES = {
  sedan: { w: 46, h: 22, accel: 400, maxSpeed: 430, brake: 720, turn: 2.7, color: '#7d8aa0', name: 'Solano' },
  taxi: { w: 46, h: 22, accel: 420, maxSpeed: 450, brake: 720, turn: 2.8, color: '#e8b93a', name: 'Cab' },
  sports: { w: 48, h: 21, accel: 560, maxSpeed: 580, brake: 800, turn: 3.1, color: '#c23b3b', name: 'Falco GT' },
  truck: { w: 58, h: 26, accel: 300, maxSpeed: 330, brake: 600, turn: 2.2, color: '#5b7d9c', name: 'Hauler' },
  van: { w: 52, h: 24, accel: 340, maxSpeed: 360, brake: 650, turn: 2.4, color: '#8a8f98', name: 'Van' },
  police: { w: 46, h: 22, accel: 520, maxSpeed: 540, brake: 800, turn: 3.0, color: '#22262e', name: 'Interceptor' },
  muscle: { w: 48, h: 22, accel: 480, maxSpeed: 500, brake: 760, turn: 2.9, color: '#3f6d4e', name: 'Bravado' },
};

export const WANTED_DECAY_SECONDS = 26;
export const SPRAY_COST = 300;
export const AMMO_COST = 50;
export const HEAL_COST = 100;
export const BUSTED_FINE = 250;
