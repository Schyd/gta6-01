# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Schyd/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Schyd/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMAR — Streets of the Sun.** An open-world crime game in the spirit of GTA 6, built from scratch: a sun-soaked coastal city to explore on foot and by car, traffic and pedestrians, cars to steal and drive, a wanted level with police who chase you, six story missions, combat, shops, a HUD with a minimap — and a save file that keeps your progress.

You are Jax Marín, getaway driver for the fixer Madame Luz. Steal the red Falco GT, run a courier across town against the clock, lift six crates at the harbour, wipe out eight Vipers in the Barrio, survive a three-star getaway in ninety seconds, and take the mansion hill in three waves to become King of Solmar.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is plain static files under `game/`, all art drawn on canvas and all sound synthesised with the Web Audio API.

## How to play

- **Move / drive:** WASD or arrow keys
- **Enter a car / use a shop:** E (stealing a car in plain sight earns a wanted star)
- **Aim:** mouse — **shoot:** click — **reload:** R
- **Pause:** Esc — **mute:** M — **start / continue:** Enter
- **Lose the heat:** wait it out unseen, or pay $300 at the Spray Shop
- **Buy ammo ($50) / heal ($100):** Solmar Arms and the Clinic, marked on the minimap

## The city

Solmar Bay is a 3200×2400 grid city: downtown towers, the Barrio, the harbour, a palm beach and the mansion hill. Traffic follows the roads, pedestrians stroll the sidewalks and scatter from gunfire, and the Solmar PD answers every star with interceptors and foot cops.

## Files

- `game/src/config.js` — tuning, palette, car specs
- `game/src/city.js` — the city generator and collision queries
- `game/src/world.js` — the one state object and the fixed-step update
- `game/src/player.js` — on-foot movement, cars, shops
- `game/src/vehicles.js` — driving physics and traffic AI
- `game/src/pedestrians.js` — sidewalk crowds and witnesses
- `game/src/police.js` — the wanted system and pursuit
- `game/src/combat.js` — shooting, damage, pickups
- `game/src/missions.js` — the six-mission story
- `game/src/render.js` — the canvas city, cars and effects
- `game/src/hud.js` — HUD, minimap and menus
- `game/src/audio.js` — synthesised sound and music
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — boot and the game loop
