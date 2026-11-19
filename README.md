# SOLMAR — Streets of the Sun

[![GTA 6 bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Schyd/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Schyd/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

An original 2D open-world crime game in the spirit of GTA 6, built for the
[make.fun GTA 6 bounty](https://make.fun/c/gta6-01). One sun-soaked coastal
city, six missions, and a driver who takes over the streets.

## Play

Open `game/index.html` in a desktop browser, or serve the `game/` folder with
any static file server. No build step, no network: everything is drawn and
synthesized inside the game.

- **WASD / arrow keys** — move on foot, drive a car
- **Mouse** — aim, **click** — shoot
- **E** — enter or exit a car, use a shop
- **Enter** — start a mission, retry after an ending
- **R** — reload, **P** — pause, **M** — mute

## The game

Solmar Bay is a 3200×2400 open world: a downtown grid, a beach and a pier,
parks, and a mansion district. Seven stealable cars, from the slow Pipit to
the Falco GT. Traffic and pedestrians live their own lives — pedestrians flee
from gunfire and report crimes to the police.

The wanted system runs from 0 to 5 stars: foot cops arrest you on touch,
cruisers ram and intercept, heat decays when you stay out of sight, and the
spray shop clears it for $300. Three shops keep you going: weapons, a clinic,
and the spray shop.

Six missions pay out as you take the city:

1. **Steal the Falco GT** — $500, bring it to the garage
2. **Courier Run** — $800, three checkpoints in 90 seconds
3. **Crate Collector** — $600, six crates across the city
4. **Viper Takedown** — $1,200, wipe out eight rivals
5. **The Getaway** — $1,500, survive 90 seconds at 3 stars
6. **The Mansion Finale** — $5,000, three waves and a Viper boss

Progress and money are saved in the browser (localStorage). The HUD shows health, money,
wanted stars, the mission objective and a mission counter, the weapon panel, a speed panel above
the minimap, and a minimap with the SOLMAR BAY pill. Sound is fully
synthesized with the Web Audio API — engine hum, gunshots, chimes and a
music loop — with no audio files.

## Screenshots

The cover is a police chase in the Falco GT at 3 stars; the others show
on-foot play downtown, the title screen, and the mansion finale.

## Build

`main.ts` copies `game/` and `screenshots/` into the output directory and
writes `dossier.json` with the vendored make.fun library:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
