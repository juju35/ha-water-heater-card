# Changelog

## 1.1.0 - 2026-11-16

### Features
- **PV-routed tanks** ([#6](https://github.com/juju35/ha-water-heater-card/issues/6)): a power sensor as `entity` (also in the visual editor) for a cumulus with no relay, driven by a PV router (Mk2PVRouter, MSunPV, F1ATB…) — read-only, no **Heat now** button, heating from its power (above 50 W).
- **`energy_grid` / `energy_solar` roles**: today's energy split between the grid (off-peak forcing) and the solar surplus, shown in the energy tile as the total and the solar share (*Today 2.4 kWh · 35% solar*); found by name on the device, or set in `entities`.
- **Solar panel in the illustration**: a PV-routed cumulus is drawn with its panel and the cable to its element; while it heats by day the sun turns and the current runs along the cable, by night (`sun.sun`) the moon, the cable still — the off-peak forcing is the grid's.

### Fixes
- **Heat now** / **Stop** only for a `switch` or `input_boolean` relay: never a `turn_on` on a sensor set as `entity`.

## 1.0.0 - 2026-11-14

### Features
- **Water heater card** (`custom:water-heater-card`): the tank illustrated — on its feet with its pipes, on a wall and a floor following the light or dark theme, a heat pump on top for heat pump water heaters; the water inside, hot above cold, the boundary at the share of hot water; a glass panel with the showers left, the litres at 40 °C and where the water heater is going.
- **Hot water** from the integration (volume at 40 °C, share, showers), else estimated from the water's temperature, the tank's `capacity`, the cold water's temperature and `shower_volume`.
- **States**: heating (bubbles rise, the element glows, the fan turns — `animations`), ready, boost, away (until its end date), off, error (the integration's fault), offline.
- **Three tiles** chosen by state: power, energy, mode, `tariff`, cold water, end of an absence.
- **Controls**: the water heater's own modes, boost (switch), away / back home, the target temperature within its range; heat now / stop for a cumulus on a relay (`show_controls`).
- **Discovery** of the water heater (`water_heater` entities, then switches named like one) and of each role on its device; `entities` overrides any role. A plain cumulus works with its switch as `entity` and its probe as `temperature`.
- **Water heater mini card** (`custom:water-heater-mini-card`): two lines, a hot-water ring as the badge, the key readings as pills, a zoom to the full card.
- Options: `entity`, `device`, `title`, `show_title`, `navigation_path`, `temperature`, `capacity`, `shower_volume`, `tariff`, `show_scene`, `animations`, `show_controls`, `zoom`, `entities`, `language`. All in the visual editor.
- Labels in 22 languages (English in the bundle, the others loaded on demand), screenshots in light and dark, heating animations.
