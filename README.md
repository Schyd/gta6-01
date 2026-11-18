[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/schyd/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/schyd/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

# SOLMAR — Streets of the Sun

An original 2D top-down open-world crime game, built for the
[make.fun GTA 6 bounty](https://make.fun/c/gta6-01). A fictional city, fictional
people and fictional cars — nothing from any commercial game.

## The city

Solmar Bay is a 3200×2400 golden-hour city: a downtown of towers, Coral Park,
Palm Beach, the harbor, and the Voss Mansion on the hill. Drive its avenues,
walk its sidewalks, and watch the sun stay low forever.

## What is in the game

- **On foot and by car** — WASD to move and drive, with arcade car physics
  (acceleration, braking, steering, collisions) across 7 stealable car types.
- **Traffic and pedestrians** — traffic AI follows the road grid and turns at
  intersections; pedestrians stroll the sidewalks, flee gunfire and report crime.
- **Wanted system** — 0–5 stars. Steal a car, shoot, or drop a bystander and
  the heat rises; patrol cruisers and foot officers chase you down. Get caught
  on foot and you are busted; get dropped and you are wasted. A spray shop
  clears the heat for $300.
- **Six story missions** — steal the red Falco GT, a timed courier run,
  crate collection, clearing the Viper gang, a three-star getaway, and the
  finale at the Voss Mansion. Mission rewards pay for guns, healing and paint.
- **Combat** — mouse aim, click to shoot, R to reload, three weapons to buy
  at Ironworks Arms. Enemies shoot back.
- **Shops** — weapons, a clinic, a spray shop and Rico's garage.
- **HUD and minimap** — money, health, wanted stars, weapon and ammo, a live
  minimap with the mission marker, and a mission objective line.
- **Save** — progress, money and weapons persist in localStorage.
- **Sound** — synthesised WebAudio effects and a golden-hour music groove;
  no audio files. M mutes.
- **Menus** — title, pause, busted, wasted and the KING OF SOLMAR finale
  with fireworks.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| E | Enter / exit a car, use a shop |
| Mouse | Aim |
| Click | Shoot |
| R | Reload |
| Q | Switch weapon |
| Esc / P | Pause |
| M | Mute |
| Enter | Start / continue |

## Play it

Serve `game/` with any static file server and open `game/index.html` in
desktop Chrome. No network requests, no build step.

```sh
node serve.ts
# open http://localhost:8080
```

## Structure

- `game/src/config.js` — constants, palette, cars, weapons, missions, shops
- `game/src/random.js` — seeded RNG and geometry helpers
- `game/src/world.js` — the city: roads, buildings, park, beach, harbor
- `game/src/vehicles.js` — car physics, traffic AI, collisions
- `game/src/police.js` — wanted heat, patrols, foot officers, busted
- `game/src/missions.js` — the six story missions
- `game/src/audio.js` — synthesised sound effects and music
- `game/src/input.js` — keyboard and mouse
- `game/src/render.js` — the city, cars, people, light and particles
- `game/src/hud.js` — HUD, minimap and menus
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/save.js` — localStorage save and load
- `game/src/main.js` — boot and the game loop

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
