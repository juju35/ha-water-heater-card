# Changelog

## 1.4.3 - 2026-11-24

### Maintenance
- The card source is split into ES modules: `src/shared/` (entry `src/shared/index.js`), `src/water-heater-card/` (entry `src/water-heater-card/index.js`), cut at its sections, with the translations in one file per language (`i18n/<lang>.js`). `scripts/bundle.mjs` concatenates them back, in their original order, into the same single file and per-language files as before; the tests evaluate that bundle.

## 1.4.2 - 2026-11-22

### Performance
- Card picker: the previews are back (`preview: true`), and light. Each card's preview is drawn only once it scrolls into view of Home Assistant's card picker, which otherwise builds the preview of every card at once: until then it holds Home Assistant's state (no render, no history request, no animation). On a dashboard or in the card editor the card is drawn as before.

## 1.4.1 - 2026-11-22

### Performance
- Card picker: the cards no longer ask Home Assistant for a live preview (`preview: false` in `window.customCards`). The picker drew every card at once (history requests, animations), which made the list slow to open; it now shows each card's description instead.

## 1.4.0 - 2026-11-22

### Features
- **Cost of hot water** ([ha-smart-appliance-card#107](https://github.com/juju35/ha-smart-appliance-card/issues/107)): with the tank's own electricity meter (`energy_meter`) and a hot water meter (`water_meter`), a **Cost** section with **Day / Week / Month / Year** tabs (`cost_period`, `month` by default): the cost of a m³ of hot water (its electricity and its cold water, over the water drawn) against the period before, then the **electricity** (cost and kWh), the **hot water** (cost and m³) and the **standby** (the days with no hot water drawn, whose energy only kept the water hot). Prices are fixed (`energy_price`, `water_price`) or read from an entity (`energy_price_entity`, `water_price_entity`: a dynamic price counts each day at its daily mean); `currency` (YAML) overrides Home Assistant's. Read from the long-term statistics, every 5 minutes.
- **Today's heating**: a 24 h strip with the `tariff`'s off-peak hours behind and each heating span on them (heating sensor, else power above 50 W, else the relay), the part at the peak rate in red, with the run time and the time at the peak rate — to check that the tank heats at off-peak. Shown with `tariff` or a meter; `show_cost: false` / `show_timeline: false` hide either. Every new option is in the visual editor of both cards, in a folded **Cost and heating** section.

## 1.3.0 - 2026-11-20

### Features
- `show_subtitle` option (`true` by default), in the visual editor of both cards, as in the other juju35 cards: `false` hides the room and model under the title.

### Fixes
- Boost and away set to an `input_boolean` helper in `entities` are turned on and off as one (they were called as a `switch`).
- README: the `device` option (a device id whose water heater the card shows when `entity` is not set) is documented, YAML only.

### Performance
- The bundle no longer carries the room-card helpers, methods and translations this card never uses (225 KB → 171 KB, 117 KB once the languages are split); a test keeps dead code out.
- The roles of the water heater's device are found again only when one of that device's states changes, not at every state change of the instance, and the number and date formats are made once per language.

## 1.2.1 - 2026-11-18

### Fixes
- Illustrated header: `auto` now follows the Home Assistant theme alone — a light theme keeps the day picture after sunset, a dark theme still shows the night one.

## 1.2.0 - 2026-11-17

### Features
- **Illustrated header** on the full and the mini card: a 90 px banner with the tank drawn big in a utility corner (tiled wall, hot and cold water pipes, a shelf, the washing machine, the floor drain) and a 10 px concrete floor strip edge to edge; the name and the state on the wall at the left, beside a round badge whose icon takes the state's colour (heating, ready, boost, grey when away or off, red on error). The tank keeps its states and animations (bubbles, glowing element, turning fan, pale when away or off); the hot pipe pulses while it heats.
- **Night mode**: the room turns dark with the sun below the horizon or with the dark theme, even while the sun is up (the solar panel's sun or moon keeps following the real sun); `illustration_theme: day | night` forces it. `illustration: false` keeps the classic header and the big illustration. Both options are in the visual editor.
- Under the banner, the full card shows the panel's readings (showers left, litres at 40 °C, the note) rather than a second tank; the mini card shows its readings as chips on the banner, with the hot-water ring around the badge.
- Status pill (dot and state: Heating, Ready, Away…) in the icon's colour on a frosted tint, the temperature under it, placed by measurement in every language (banner and classic header): right after the title only when the whole title and the whole label fit there, otherwise on its own line under the subtitle (then kept to one line); when the label would still be cut or leave the banner above its floor strip, and on a card of 200 px or less, only its dot shows. On narrower cards the utility corner is drawn smaller (75 %, 62 %, then 50 % of its height) so that the title stays whole and the pill keeps its label. The mini card's expand / collapse button is a 24 px frosted round button 5 px from the banner's top right corner, the tank and its pipes stepping aside, clear of it.

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
