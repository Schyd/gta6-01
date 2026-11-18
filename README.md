# SOLMAR — Streets of the Sun

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Schyd/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Schyd/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 2D top-down open-world crime game set in the fictional city of
Solmar Bay. No assets, names or trademarks from any commercial game.

## The city

Solmar Bay is a 3200×2400 golden-hour city: a downtown of towers, Solmar
Park with its pond, Palmera Beach, the harbor docks and the mansion hill
above Villa Del Sol. Streets run on a grid, traffic follows the roads, and
pedestrians walk the sidewalks — and call the police when they see a crime.

## What you can do

- **Explore on foot and by car** — 7 stealable car types (Falco GT, Lumen
  Coupe, Marina Sedan, Solmar Taxi, Dune Pickup, Cargo Van, Haul Truck),
  each with its own acceleration, top speed and handling.
- **Wanted level 0–5 stars** — foot police chase and arrest on touch,
  patrol cruisers ram and intercept, and the heat cools when you stay out
  of sight. A spray shop clears your wanted level for $300.
- **Combat** — mouse aim, three weapons (Pistol, SMG, Rifle) with reloads,
  enemies who shoot back, a gun shop and a clinic.
- **Six story missions** — steal the Falco GT, a timed courier run, a crate
  hunt, a park shootout, a 90-second three-star getaway, and a three-wave
  mansion finale worth $5,000. Finish them all to become the King of Solmar.
- **HUD + minimap** — wanted stars, money and health, the mission
  objective, a weapon panel, a speed panel and a live minimap of Solmar Bay.
- **Save** — money, missions and weapons persist in localStorage.
- **Sound** — everything is synthesized with WebAudio (engine hum, gunshots,
  sirens, a bass-and-hats music loop). No audio files, no network.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse | Aim |
| Click | Shoot |
| E | Enter/exit car, use shops |
| Q | Switch weapon |
| R | Reload |
| Esc | Pause |
| Enter | Start / continue |

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. It plays fully offline.

```
node serve.ts   # then open http://localhost:8080
```

## Screenshots

Deterministic scenes via `?shot=start|play|chase|end&seed=1`:

1. `1-start.jpg` — title screen over the living city
2. `2-play.jpg` — driving the Falco GT with Mission 1 active
3. `3-chase.jpg` — a 3-star police intercept
4. `4-end.jpg` — the finale: KING OF SOLMAR

## Layout

- `game/src/config.js` — constants, palette, cars, weapons, missions
- `game/src/random.js` — seeded RNG for the city and the screenshots
- `game/src/world.js` — the city generator and the game state
- `game/src/vehicles.js` — driving physics, traffic AI, stealing
- `game/src/police.js` — wanted system, foot cops, cruisers, bullets
- `game/src/missions.js` — the six-mission story
- `game/src/audio.js` — synthesized WebAudio sound and music
- `game/src/input.js` — keyboard and mouse input
- `game/src/save.js` — localStorage save/load
- `game/src/shots.js` — the deterministic screenshot scenes
- `game/src/render.js` — world, car and menu drawing
- `game/src/hud.js` — HUD, minimap, speed and weapon panels
- `game/src/main.js` — boot, the game loop, player actions, shops

## License

MIT — see `LICENSE`.
