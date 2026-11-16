# ha-water-heater-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-water-heater-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-water-heater-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-water-heater-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-water-heater-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-water-heater-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-water-heater-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-water-heater-card)](https://github.com/juju35/ha-water-heater-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-water-heater-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/icon.svg" alt="Water Heater Card" width="120"></p>

<p align="center">
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/atlantic.svg" alt="Atlantic" height="22">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/thermor.svg" alt="Thermor" height="14">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/sauter.svg" alt="Sauter" height="22">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/ariston.svg" alt="Ariston" height="24">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/ao-smith.svg" alt="A. O. Smith" height="24">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/rheem.svg" alt="Rheem" height="30">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/viessmann.svg" alt="Viessmann" height="22">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/vaillant.svg" alt="Vaillant" height="24">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/daikin.svg" alt="Daikin" height="30">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/panasonic.svg" alt="Panasonic" height="30">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/stiebel-eltron.svg" alt="Stiebel Eltron" height="18">&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/bosch.svg" alt="Bosch" height="30">
</p>

An illustrated Lovelace card for Home Assistant's **water heaters**: the tank with its hot water above the cold, the showers left and the litres at 40 °C; power, energy and mode in three tiles; the modes, boost, away and the target temperature. It works with any `water_heater` entity, with a plain cumulus switched by a smart plug or a relay, and with a cumulus driven by a PV router, read from its power meter.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-water-heater-card&category=plugin)

| Card | Type | What it shows |
|---|---|---|
| [Water heater](#water-heater) | `custom:water-heater-card` | The tank illustrated, its state and temperature, three tiles, and its controls. |
| [Water heater mini](#water-heater-mini) | `custom:water-heater-mini-card` | The same water heater on two lines: a hot-water ring, the key readings, a zoom to the full card. |

| Heating | Ready | Away | Mini |
|---|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-heating.gif" alt="Heating" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-ready.png" alt="Ready" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-away-dark.png" alt="Away" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-heating.png" alt="Mini" width="400"> |

The cards share the look of the other ha-* cards (header with a status pill, tinted tiles), a visual editor covering every option (`entities` as YAML in its folded **Advanced** section), labels in 22 languages following the Home Assistant language, light and dark themes, and come in a single Marketplace install with no dependency.

## Features

### Water heater

`custom:water-heater-card` — The water heater of `entity` (the first of the home when none is set).

- **Illustration**: the tank on its feet with its cold and hot pipes, on a wall and a floor that follow the light or dark theme; the water inside, hot above cold, the boundary at the share of hot water (marked in %), the water's temperature on the tank. A heat pump water heater gets its heat pump on top. Beside it, a glass panel: the **showers left** (as drops), the **litres at 40 °C** and where the water heater is going (*Heating to 55 °C*, *Away until Sat, Nov 21*, the error)
- **Hot water**: the integration's own figures when it reports them (a volume at 40 °C, a share in %, a number of showers), else an estimate from the water's temperature, the tank's `capacity` and the cold water's temperature (its sensor, else 15 °C), counted in showers of `shower_volume` litres
- **States**: **heating** (orange: bubbles rise, the element glows, the heat pump's fan turns), **ready** (green), **boost** (pink: a boost mode or switch; *high_demand* is a lasting mode, shown as heating or ready), **away** (grey, until its end date when the integration gives one), **off**, **error** (red, the integration's fault in the panel), *offline* when the water heater cannot report. Heating comes from the water heater's heating sensor, else its power (above 50 W), else a water more than 3 °C below the target
- **Solar panel**: a PV-routed cumulus (a power sensor as `entity`, or an `energy_solar` role) is drawn with its panel; by day the sun turns and the current runs to the element while it heats, by night the moon (from `sun.sun`)
- **Header**: the water heater's name, its room and model, and a pill with the state and the temperature (*Heating · 54 °C*)
- **Three tiles**, the ones that matter in each state among what the water heater reports: power, energy (today's when the sensor is a daily one; with a grid / solar split, the total and the solar share — *Today 2.4 kWh · 35% solar*), mode, `tariff` (off-peak / peak), the cold water's temperature, the end of an absence
- **Controls**: the water heater's **modes** (its own list, *off* and *away* aside, up to four), **Boost** when it is a switch rather than a mode, **Away** / **Back home** (the away mode, or an away switch), the **target** in steps of the water heater (− 55 °C +, within its range); **Heat now** / **Stop** for a cumulus on a relay (none for a PV-routed tank: the router decides)
- A tap on the illustration opens the water heater's dialog
- `show_scene: false` keeps the header, tiles and controls; `animations: false` stops the bubbles, the glow and the fan (also when the system asks for reduced motion); `show_controls: false` leaves the card read-only

### Water heater mini

`custom:water-heater-mini-card` — The water heater on two lines: a ring as the badge (the share of hot water), the name, then the key readings as pills (*Heating · 54 °C · ≈ 3 showers*, *Away until Sat, Nov 21 · 41 °C*). The **zoom** button (top right) opens the full card in place, a click anywhere else folds it back (`zoom: false` removes the button).

## Supported integrations

Any integration with a `water_heater` entity works: the card reads its mode, temperature, target and away mode, then the other entities of its device (power, energy, hot water, boost, away, errors) by device class, unit and name. Among them:

| | Integration | Water heaters |
|:---:|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/atlantic.svg" alt="Atlantic" height="15">&nbsp;<img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/thermor.svg" alt="Thermor" height="12">&nbsp;<img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/sauter.svg" alt="Sauter" height="15"> | [Overkiz](https://www.home-assistant.io/integrations/overkiz/) (built in) | Atlantic, Thermor and Sauter, heat pump (Explorer, Aéromax…) and electric (Cozytouch) |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/rheem.svg" alt="Rheem" height="21"> | [Rheem EcoNet](https://www.home-assistant.io/integrations/econet/) (built in) | Rheem, Ruud |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/ao-smith.svg" alt="A. O. Smith" height="17"> | [A. O. Smith](https://www.home-assistant.io/integrations/aosmith/) (built in) | A. O. Smith heat pump water heaters |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/viessmann.svg" alt="Viessmann" height="15"> | [Viessmann ViCare](https://www.home-assistant.io/integrations/vicare/) (built in) | Viessmann domestic hot water |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/ariston.svg" alt="Ariston" height="17"> | [Ariston NET remotethermo](https://github.com/fustom/ariston-remotethermo-home-assistant-v3) (Marketplace) | Ariston Lydos, Nuos, Velis |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/daikin.svg" alt="Daikin" height="21"> | [Daikin Onecta](https://github.com/jwillemsen/daikin_onecta) (Marketplace) | Daikin Altherma hot water tanks |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/vaillant.svg" alt="Vaillant" height="17"> | [myVAILLANT](https://github.com/signalkraft/mypyramid-ha) (Marketplace) | Vaillant domestic hot water |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/panasonic.svg" alt="Panasonic" height="21">&nbsp;<img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/stiebel-eltron.svg" alt="Stiebel Eltron" height="13">&nbsp;<img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/images/bosch.svg" alt="Bosch" height="21"> | Panasonic Aquarea, Stiebel Eltron, Bosch and other `water_heater` integrations | Their water heaters |
|  | A smart plug or a relay (Shelly, Sonoff, Zigbee…) | A plain cumulus: set its switch as `entity`, its probe as `temperature` |
|  | A PV router (Mk2PVRouter, MSunPV, F1ATB…) and a meter on the tank's line (Shelly EM, Modbus, the router's own) | A PV-routed cumulus: set its power sensor as `entity` (read-only), the grid and solar energy as `energy_grid` / `energy_solar` |

When the card picks the wrong entity for a role, or misses one, set it in `entities` (see [Configuration](#configuration)) and open an issue with the water heater's entities so that the discovery learns it.

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-water-heater-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-water-heater-card` — Type: **Dashboard**
3. Open **Water Heater Card** and click **Install**
4. Clear your browser cache and refresh

The Marketplace registers the dashboard resource for you.

### Manual

1. Download `ha-water-heater-card.js` and the `ha-water-heater-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-water-heater-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/ha-water-heater-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

Every option is in the visual editor. In YAML:

```yaml
type: custom:water-heater-card
entity: water_heater.explorer

# A cumulus on a smart plug, with its probe and the off-peak sensor
type: custom:water-heater-card
entity: switch.cumulus
temperature: sensor.cumulus_temperature
tariff: sensor.linky_tariff
capacity: 200

# A cumulus driven by a PV router: its power meter, today's energy split grid / solar
type: custom:water-heater-card
entity: sensor.water_heater_power
tariff: sensor.linky_tariff
entities:
  energy_grid: sensor.water_heater_grid_energy_today
  energy_solar: sensor.water_heater_solar_energy_today

# Two lines on a phone dashboard
type: custom:water-heater-mini-card
entity: water_heater.explorer

# A role the discovery missed
type: custom:water-heater-card
entity: water_heater.explorer
entities:
  litres: sensor.explorer_v40_water_volume
  boost: switch.explorer_boost
```

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | the first water heater found | A `water_heater` entity, the switch of a cumulus on a relay, or the power sensor of a PV-routed cumulus (read-only, heating above 50 W) |
| `title` | string | the water heater's name | Card title |
| `show_title` | boolean | `true` | Show the title |
| `navigation_path` | string | | A tap on the header opens this dashboard path |
| `temperature` | string | the water heater's | The water's temperature sensor (a cumulus on a relay, or another probe) |
| `capacity` | number | `200` | The tank's volume (L), to estimate the hot water when the integration does not report it |
| `shower_volume` | number | `50` | Litres at 40 °C per shower |
| `tariff` | string | | An off-peak / peak sensor, shown in a tile |
| `show_scene` | boolean | `true` | The illustration |
| `animations` | boolean | `true` | Bubbles, glowing element, turning fan |
| `show_controls` | boolean | `true` | Modes, boost, away, target, heat now / stop |
| `zoom` | boolean | `true` | Mini card: the zoom button |
| `entities` | map | | Advanced (YAML): the entity of a role, over the discovery — `temperature`, `inlet`, `level`, `litres`, `showers`, `power`, `energy`, `energy_grid`, `energy_solar`, `heating`, `boost`, `away`, `away_end`, `error` |
| `language` | string | Home Assistant's | Advanced: one of the [languages](#translations) |

## Screenshots

| Heating | Ready | Boost |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-heating.png" alt="Heating" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-ready.png" alt="Ready" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-boost.png" alt="Boost" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-heating-dark.png" alt="Heating, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-ready-dark.png" alt="Ready, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-boost-dark.png" alt="Boost, dark" width="400"> |

| Away | Error | Cumulus on a relay |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-away.png" alt="Away" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-error.png" alt="Error" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-relay.png" alt="Cumulus on a relay" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-away-dark.png" alt="Away, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-error-dark.png" alt="Error, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-relay-dark.png" alt="Cumulus on a relay, dark" width="400"> |

| PV-routed cumulus, by day (grid / solar split) | By night (off-peak forcing) | Without the illustration (`show_scene: false`) |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-pv.png" alt="PV-routed cumulus" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-pv-night.png" alt="PV-routed cumulus by night" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-compact.png" alt="Without the illustration" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-pv-dark.png" alt="PV-routed cumulus, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-pv-night-dark.png" alt="PV-routed cumulus by night, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-compact-dark.png" alt="Without the illustration, dark" width="400"> |

**Heating animation**: bubbles rise from the element, which glows, and the heat pump's fan turns (still with `animations: false`, or when the system asks for reduced motion).

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-heating.gif" alt="Heating animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-heating-dark.gif" alt="Heating animation, dark" width="400"> |

**Solar heating animation**: a PV-routed cumulus has its panel beside the tank; while it heats by day, the sun turns and the current runs along the cable to the element. By night (`sun.sun` below the horizon) the moon replaces the sun and the cable stays still: the off-peak forcing comes from the grid.

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-pv-heating.gif" alt="Solar heating animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-pv-heating-dark.gif" alt="Solar heating animation, dark" width="400"> |

### Water heater mini

| Heating | Away | Zoomed in |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-heating.png" alt="Mini, heating" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-away.png" alt="Mini, away" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-zoom.png" alt="Mini, zoomed in" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-heating-dark.png" alt="Mini, heating, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-away-dark.png" alt="Mini, away, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-water-heater-card/main/screenshots/wh-mini-zoom-dark.png" alt="Mini, zoomed in, dark" width="400"> |

## How it works

- **Water heater**: `entity`, else the first `water_heater` of the home, else the first switch named like a water heater (*cumulus*, *chauffe-eau*, *boiler*…)
- **Roles**, on the water heater's device: `temperature` (a `temperature` sensor, not an outdoor or cold one), `inlet` (the cold water's), `level` (hot water in %), `litres` (a sensor in L, hot water at 40 °C), `showers`, `power`, `energy` (a daily one first), `energy_grid` and `energy_solar` (today's energy from the grid and from the solar surplus, by name: *grid* / *réseau*, *solar* / *solaire* / *PV*; together they replace `energy`), `heating` (a binary sensor: element, compressor, running), `boost` and `away` (switches), `away_end` (a timestamp or a datetime), `error` (a sensor named *error* / *fault*, or a `problem` binary sensor); `entities` sets any of them
- **Hot water at 40 °C**, when not reported: capacity × (T − cold) / (40 − cold) above 40 °C, none at 40 °C or less; the share of hot water: that volume against the tank at its target. The cold water is its sensor (a *bottom* probe is hot water, not the inlet), else 15 °C, and 15 °C when it reads 35 °C or more
- **Temperature**: diagnostic sensors (a smart plug's own temperature) are never the water's
- **Actions**: `water_heater.set_operation_mode`, `water_heater.set_away_mode` (or the away switch), `water_heater.set_temperature` within the water heater's range and step, the boost switch, and `turn_on` / `turn_off` on a relay (never on a sensor); nothing else

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/ha-water-heater-card.js
npm run check        # builds and checks the bundle (run in CI)
npm test             # unit tests
npm run screenshots  # renders the cards with a mock water heater into screenshots/ (and the heating GIFs, needs ffmpeg)
```

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built files to the release, which is where the Marketplace installs them from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-water-heater-card/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the card, creates the tag and the GitHub release with the changelog section as notes, and attaches `ha-water-heater-card.js` and its translation files

## Translations

The card auto-detects the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-water-heater-card/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
