// SOLMAR — Streets of the Sun
// Configuration: every tuning value, name and price of the game lives here,
// so the rest of the code reads one table instead of scattering numbers.

export const CONFIG = Object.freeze({
  // World
  worldWidth: 3200,
  worldHeight: 2400,
  viewWidth: 1280,
  viewHeight: 800,

  // Roads: vertical avenues and horizontal streets (centre lines).
  avenues: [400, 1000, 1600, 2200, 2800],
  streets: [350, 800, 1250, 1700, 2150],
  roadWidth: 140,
  sidewalkWidth: 26,

  // Districts (x, y, w, h) used for naming, flavour and spawn rules.
  districts: Object.freeze([
    { name: 'Downtown', x: 1200, y: 150, w: 1200, h: 700 },
    { name: 'Marina', x: 150, y: 1900, w: 2900, h: 500 },
    { name: 'Residential', x: 150, y: 500, w: 700, h: 1200 },
    { name: 'Industrial', x: 2400, y: 500, w: 650, h: 1200 },
    { name: 'Mansion Hill', x: 2400, y: 150, w: 650, h: 350 },
  ]),

  // Player on foot
  walkSpeed: 230,
  runSpeed: 335,
  playerRadius: 15,
  playerHealth: 100,

  // Camera: how fast it chases the player (per frame, 0..1).
  cameraLerp: 0.12,

  // Cars: seven stealable types, slowest first.
  carTypes: Object.freeze([
    { key: 'pipit', name: 'Pipit', topSpeed: 420, accel: 260, turn: 2.6, length: 62, width: 30, body: '#7fb069', roof: '#557a45' },
    { key: 'komodo', name: 'Komodo', topSpeed: 470, accel: 290, turn: 2.5, length: 68, width: 32, body: '#4a7fa5', roof: '#2f5673' },
    { key: 'kuda', name: 'Kuda', topSpeed: 450, accel: 270, turn: 2.2, length: 76, width: 34, body: '#b5542c', roof: '#7e3a1e' },
    { key: 'badak', name: 'Badak', topSpeed: 480, accel: 280, turn: 2.3, length: 78, width: 36, body: '#5d5a68', roof: '#3d3a46' },
    { key: 'gajah', name: 'Gajah', topSpeed: 430, accel: 240, turn: 2.0, length: 86, width: 38, body: '#c9a227', roof: '#8a6d14' },
    { key: 'elang', name: 'Elang', topSpeed: 560, accel: 340, turn: 2.9, length: 70, width: 32, body: '#8e2f38', roof: '#5c1d24' },
    { key: 'falco', name: 'Falco GT', topSpeed: 640, accel: 380, turn: 3.1, length: 72, width: 32, body: '#e8b93c', roof: '#a67c1a' },
  ]),

  // Traffic and crowds
  trafficCount: 26,
  pedCount: 34,
  trafficColors: Object.freeze(['#c94f43', '#4a7fa5', '#7fb069', '#d8d3c3', '#5d5a68', '#b5542c', '#3f6d4e']),

  // Wanted level
  maxWanted: 5,
  heatPerCarTheft: 1.0,
  heatPerShot: 0.35,
  heatPerPedHit: 0.8,
  heatPerReport: 0.5,
  heatDecayPerSecond: 0.06,
  heatDecaySightSeconds: 4,

  // Police
  footCopSpeed: 250,
  cruiserTopSpeed: 560,
  arrestHoldSeconds: 1.2,
  cruiserRamDamage: 12,

  // Combat
  weapons: Object.freeze([
    { key: 'pistol', name: 'Pistol', damage: 25, rate: 0.30, mag: 0, reload: 0.0, spread: 0.03, price: 0 },
    { key: 'smg', name: 'SMG Rapat', damage: 14, rate: 0.09, mag: 30, reload: 1.1, spread: 0.09, price: 350 },
    { key: 'shotgun', name: 'Shotgun Lebar', damage: 13, rate: 0.75, mag: 6, reload: 1.6, spread: 0.22, price: 600, pellets: 5 },
  ]),
  bulletSpeed: 950,
  enemyHealth: 60,
  bossHealth: 220,
  enemyShotDamage: 8,
  enemyShotInterval: 1.15,

  // Shops and money
  sprayPrice: 300,
  clinicPrice: 150,
  clinicHeal: 60,
  startingMoney: 0,

  // Missions: title, briefing and reward, in story order.
  missions: Object.freeze([
    { title: 'Curi Falco GT', briefing: 'Seorang kolektor menunggu di garasi. Bawa Falco GT emas itu pulang.', reward: 500 },
    { title: 'Kurir Kilat', briefing: 'Tiga paket, sembilan puluh detik. Jangan tanya isinya.', reward: 800 },
    { title: 'Enam Peti', briefing: 'Peti-peti itu tersebar di seluruh kota. Kumpulkan semuanya.', reward: 600 },
    { title: 'Rebut Turf', briefing: 'Delapan Viper menjaga wilayah itu. Bersihkan mereka semua.', reward: 1200 },
    { title: 'Pelarian Tiga Bintang', briefing: 'Bertahan sembilan puluh detik dengan tiga bintang di kepalamu.', reward: 1500 },
    { title: 'Finale Mansion', briefing: 'Tiga gelombang, lalu bos mereka. Akhiri malam ini.', reward: 5000 },
  ]),
  courierSeconds: 90,
  getawaySeconds: 90,
  getawayStars: 3,
  cratesToCollect: 6,
  vipersToClear: 8,
  finaleWaves: Object.freeze([3, 4, 5]),

  // Saving
  saveKey: 'solmar-save-v1',

  // Screenshot determinism
  shotSeed: 1,
  shotWarmupFrames: 150,
});
