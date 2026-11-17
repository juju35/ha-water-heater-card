/**
 * Shared by the water heater cards (its names are used by the other src/ files): the water heater's entities and states, i18n helpers,
 * the base card (header, tiles, tap / hold), the mini card, the visual editor and the common styles. Same base as ha-room-card.
 * https://github.com/juju35/ha-water-heater-card
 */
const RC_VERSION = "__VERSION__";

// ── Discovery rules ──────────────────────────────────────────────────────────
const RC_OPENING_CLASSES = ["moisture", "smoke", "carbon_monoxide", "gas", "door", "window", "opening", "garage_door"];
// Safety sensors: an active state is an alarm, not an opening. Most serious first: it names the room's status.
const RC_ALERT_KINDS = {
  smoke: { dc: "smoke", on: "mdi:smoke-detector-alert", off: "mdi:smoke-detector" },
  co: { dc: "carbon_monoxide", on: "mdi:molecule-co", off: "mdi:molecule-co" },
  gas: { dc: "gas", on: "mdi:gas-cylinder", off: "mdi:gas-cylinder" },
  leak: { dc: "moisture", on: "mdi:water-alert", off: "mdi:water-check" },
};
const RC_ALERT_ORDER = Object.keys(RC_ALERT_KINDS);
// Alert kind of a device class (`leak`, `smoke`, `co`, `gas`), or undefined for any other class.
const rcAlertKind = (dc) => RC_ALERT_ORDER.find((k) => RC_ALERT_KINDS[k].dc === dc);
// The most serious alert kind among `kinds`, `leak` when none is known.
const rcTopAlert = (kinds) => RC_ALERT_ORDER.find((k) => kinds.includes(k)) || "leak";
const RC_PRESENCE_CLASSES = ["occupancy", "presence", "motion"];
// A switch driving a light belongs to the lights card, a switch that is a plug to the plugs card.
const RC_LIGHT_NAME = /(^|\s)(lumi[eè]re|lampe|lamp|light|veilleuse|guirlande)(\s|$)/i;
const RC_PLUG_NAME = /(^|\s)(prise|multiprise|plug|outlet|socket)(\s|$)/i;
const RC_HOLD_MS = 500;
const RC_MOVE_PX = 8;
// A held arrow key repeats some 30 times a second: one brightness step every RC_REPEAT_MS at most.
const RC_REPEAT_MS = 150;

const rcIsLightSwitch = (st) => RC_LIGHT_NAME.test(st.attributes.friendly_name || "");
const rcIsPlug = (st) =>
  !rcIsLightSwitch(st) && (st.attributes.device_class === "outlet" || RC_PLUG_NAME.test(st.attributes.friendly_name || ""));

// What each room card shows, shared with the Overview so that both count the same entities.
// Detections that are not about people, which cameras report as motion: pets never count, vehicles only outdoors.
const RC_PET = /(^|[\s_.-])(pets?|animals?|animaux|chiens?|chats?|dogs?|cats?)($|[\s_-])/i;
const RC_VEHICLE = /(^|[\s_.-])(vehicles?|v[ée]hicules?|voitures?|cars?)($|[\s_-])/i;
// An outdoor room, from its name: garden, terrace, balcony, patio, yard, driveway, porch, gate, parking…
const RC_OUTDOOR =
  /jardin|terrasse|balcon|patio|ext[ée]rieur|cour(\s|$)|all[ée]e|porche|portail|parking|garden|terrace|balcony|outdoor|outside|yard|driveway|porch|gate/i;
const rcIsOutdoor = (area) => !!area && RC_OUTDOOR.test(`${area.name || ""} ${area.area_id || ""}`);

// Sensors card: leak, door, window and opening sensors, plus presence and motion unless `presence` is false. Camera
// detections count, except pets, and vehicles outside an `outdoor` room.
const rcMatchSensor = (hass, id, { presence = true, outdoor = false } = {}) => {
  if (!id.startsWith("binary_sensor.")) return false;
  const st = hass.states[id];
  const dc = st?.attributes.device_class;
  if (RC_OPENING_CLASSES.includes(dc)) return true;
  if (presence === false || !RC_PRESENCE_CLASSES.includes(dc)) return false;
  const name = `${id} ${st.attributes.friendly_name || ""}`;
  if (RC_PET.test(name)) return false;
  return outdoor || !RC_VEHICLE.test(name);
};
// Lights card: lights (groups excepted) and switches driving a light, configuration and diagnostic entities excepted.
const rcMatchLight = (hass, id) => {
  const st = hass.states[id];
  if (!st || hass.entities?.[id]?.entity_category) return false;
  if (id.startsWith("light.")) return !Array.isArray(st.attributes.entity_id);
  return id.startsWith("switch.") && rcIsLightSwitch(st);
};
// Plugs card: switches that are plugs, configuration and diagnostic entities excepted.
const rcMatchPlug = (hass, id) => {
  const st = hass.states[id];
  if (!st || !id.startsWith("switch.") || hass.entities?.[id]?.entity_category) return false;
  return rcIsPlug(st);
};

const RC_ROOM_ICONS = [
  [/chambre|bedroom|nursery/i, "mdi:bed-outline"],
  [/s[ée]jour|salon|living|lounge/i, "mdi:sofa-outline"],
  [/cuisine|kitchen/i, "mdi:silverware-fork-knife"],
  [/salle (de )?bains?|bath|douche|shower/i, "mdi:shower-head"],
  [/toilettes?|wc|toilet/i, "mdi:toilet"],
  [/entr[ée]e|entrance|hall d.entr|entry/i, "mdi:door"],
  [/couloir|hall|corridor/i, "mdi:arrow-left-right"],
  [/bureau|office|study/i, "mdi:desk"],
  [/garage/i, "mdi:garage"],
  [/terrasse|jardin|balcon|garden|terrace|balcony|patio|ext[ée]rieur|outdoor/i, "mdi:flower-outline"],
  [/buanderie|cellier|laundry|utility/i, "mdi:washing-machine"],
  [/salle [àa] manger|dining/i, "mdi:table-chair"],
];

// Icon of a room in the overviews: the area's own icon, or one picked from its name.
const rcRoomIcon = (area) => {
  if (area.icon) return area.icon;
  const hit = RC_ROOM_ICONS.find(([re]) => re.test(area.name || area.area_id || ""));
  return hit ? hit[1] : "mdi:home-outline";
};

// `fn(hass)` computed once per entity registry: HA replaces hass.entities only when the registry changes,
// whereas a new hass (and hass.states) comes with every state change of the whole instance.
const rcPerRegistry = (fn) => {
  const cache = new WeakMap();
  const none = {};
  return (hass) => {
    const reg = hass.entities || none;
    if (!cache.has(reg)) cache.set(reg, fn(hass));
    return cache.get(reg);
  };
};

// The sensor entities of each device, in registry order.
const rcDeviceSensors = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) {
    if (r.device_id && id.startsWith("sensor.")) (out[r.device_id] ||= []).push(id);
  }
  return out;
});

// Power sensor (device class power, W or kW) of each device; only the device's own sensors are read.
// Settled per registry like rcDeviceSensors (a device_class next to never changes), except for the devices with a
// sensor that has no state yet (an integration still loading after a restart): those are looked at again on every
// call until all their sensors report, so their power sensor is not missed until the next registry change.
const rcPowerCache = rcPerRegistry((hass) => ({ found: {}, pending: new Set(Object.keys(rcDeviceSensors(hass))) }));
const rcPowerSensors = (hass) => {
  const cache = rcPowerCache(hass);
  if (!cache.pending.size) return cache.found;
  const sensors = rcDeviceSensors(hass);
  for (const device of cache.pending) {
    const ids = sensors[device] || [];
    const id = ids.find((s) => hass.states[s]?.attributes.device_class === "power");
    if (id) cache.found[device] = id;
    if (id || ids.every((s) => hass.states[s])) cache.pending.delete(device);
  }
  return cache.found;
};

const rcWattsOf = (hass, sensorId) => {
  const st = sensorId && hass.states[sensorId];
  const v = st ? Number.parseFloat(st.state) : Number.NaN;
  if (!Number.isFinite(v)) return null;
  return st.attributes.unit_of_measurement === "kW" ? v * 1000 : v;
};

// ── Overviews ────────────────────────────────────────────────────────────────
// Shared by room-overview-card and room-environment-overview-card.

// Visible entities accepted by `match(id)`, with their area, minus the config's `exclude`: the registries are
// scanned again only when they or the config change.
const rcByArea = (card, match) => {
  const h = card._hass;
  const c = card._config;
  return rcMemo((card._memo ||= {}), "byArea", [c, h.entities, h.devices], () => {
    const excluded = new Set(c.exclude || []);
    const out = [];
    for (const [id, r] of Object.entries(h.entities || {})) {
      if (r.hidden || excluded.has(id) || !match(id)) continue;
      const aid = card._areaOf(id);
      if (aid) out.push([id, aid]);
    }
    return out;
  });
};

// Rooms in the order of the config's `rooms` list, then, with `sort: state`, the highest `rank(room)` first,
// then by name.
const rcSortRooms = (list, config, rank) => {
  const order = (config.rooms || []).map((x) => x.area);
  return list.sort((a, b) => {
    if (order.length) {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== ib) return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    }
    return (config.sort === "state" ? rank(b) - rank(a) : 0) || a.name.localeCompare(b.name);
  });
};

// The overviews only show the rooms needing a look until their detail button (`zoom`, on by default) is pressed;
// `zoom: false` shows every room, with no button.
const rcCompact = (card) => card._config.zoom !== false && !card._zoomed;

// The zoom / detail button: the same icons on the overviews and the mini cards.
const rcZoomIcon = (card) => (card._zoomed ? "mdi:arrow-collapse" : "mdi:arrow-expand");

// The detail button of an overview header, at its end.
const rcZoomButton = (card) =>
  card._config.zoom === false
    ? ""
    : `<button class="zoom" title="${rcEsc(card._t(card._zoomed ? "rooms_check" : "rooms_all"))}"><ha-icon icon="${rcZoomIcon(card)}"></ha-icon></button>`;

// Back to the compact view (mini card, or overview showing the rooms needing a look), when zoomed in.
const rcUnzoom = (card) => {
  if (!card._zoomed) return;
  card._zoomed = false;
  card._sig = null;
  card._render();
};

// True for a click outside `card` that is not in a dialog opened from it (more-info, say): it folds the card back.
const rcOutside = (card, ev) => !ev.composedPath().includes(card) && !rcInDialog(ev);

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. The handler runs when the press and the release are both outside the card (a slider dragged out of the
// card does not count), and a scroll does not count (the browser cancels the pointer); keyboard clicks still go
// through the click event. The handler keeps its own checks (outside of the card, not in a dialog).
const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = !ev.composedPath().includes(card);
  };
  const onUp = (ev) => {
    if (downOutside) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
  };
};

// A click on the detail button: every room, or back to the rooms needing a look. True when handled.
const rcZoomClick = (card, ev) => {
  if (!ev.target.closest?.(".zoom")) return false;
  ev.stopPropagation();
  card._zoomed = !card._zoomed;
  card._sig = null;
  card._render();
  if (ev.detail === 0) card.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  return true;
};

// Editor fields shared by the overviews: title, columns and sort.
const rcOverviewFields = (i18n, lang) => [
  { name: "title", selector: { text: {} } },
  { name: "columns", selector: { number: { min: 1, max: 6, mode: "box" } } },
  {
    name: "sort",
    selector: {
      select: {
        mode: "dropdown",
        options: ["name", "state"].map((value) => ({ value, label: rcT(i18n, lang, `ed_sort_${value}`) })),
      },
    },
  },
];

// ── i18n ─────────────────────────────────────────────────────────────────────
// Strings shared by the cards; a card's own dictionary wins over these.
const RC_I18N = {
  en: {
    all_closed: "All closed",
    all_quiet: "All quiet",
    open_one: "{n} open",
    open_many: "{n} open",
    unavail_one: "{n} unavailable",
    unavail_many: "{n} unavailable",
    leak: "Water leak",
    smoke: "Smoke detected",
    gas: "Gas detected",
    co: "Carbon monoxide",
    detected: "Detected",
    clear: "Clear",
    unavailable: "Unavailable",
    on: "On",
    off: "Off",
    turn_all_off: "Turn everything off",
    ed_area: "Area",
    ed_title: "Title",
    ed_show_title: "Show title",
    ed_title_helper: "Leave empty for the area name",
    ed_columns: "Columns",
    ed_layout: "Layout",
    ed_layout_helper: "Tiles: one large tile per entity, like the Tile card, easier to tap on a phone",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Tiles",
    ed_advanced: "Advanced",
    ed_language: "Language",
    ed_language_helper: "Empty: the Home Assistant language",
    ed_language_auto: "Automatic",
    ed_entities: "Explicit entities (YAML)",
    ed_entities_helper: "Replaces the automatic discovery: entity IDs, or {entity, name, icon}",
    ed_thresholds: "Comfort thresholds (YAML)",
    ed_thresholds_helper: "Per kind, in the sensor's unit, e.g. co2: [800, 1200] or humidity: [25, 35, 70, 80]",
    ed_rooms: "Rooms (YAML)",
    ed_rooms_helper: "Order and overrides: a list of {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigation path",
    ed_all_off_button: "“Turn everything off” button",
    err_config: "Set `area` or `entities`",
    zoom_in: "Show the full card",
    zoom_out: "Back to the compact view",
    ed_zoom: "Zoom button",
    ed_zoom_helper: "Switches the mini card to the full card and back",
    rooms_all: "Show every room",
    rooms_check: "Only the rooms needing a look",
    ed_sort: "Sort",
    ed_sort_name: "By name",
    ed_exclude_areas: "Rooms to exclude",
  },
  fr: {
    all_closed: "Tout est fermé",
    all_quiet: "Tout est calme",
    open_one: "{n} ouverture",
    open_many: "{n} ouvertures",
    unavail_one: "{n} indisponible",
    unavail_many: "{n} indisponibles",
    leak: "Fuite d'eau",
    smoke: "Fumée détectée",
    gas: "Gaz détecté",
    co: "Monoxyde de carbone",
    detected: "Détecté",
    clear: "Non détecté",
    unavailable: "Indisponible",
    on: "Allumée",
    off: "Éteinte",
    turn_all_off: "Tout éteindre",
    ed_area: "Pièce",
    ed_title: "Titre",
    ed_show_title: "Afficher le titre",
    ed_title_helper: "Laisser vide pour le nom de la pièce",
    ed_columns: "Colonnes",
    ed_layout: "Disposition",
    ed_layout_helper: "Tuiles : une grande tuile par entité, comme la carte Tuile, plus facile à toucher sur téléphone",
    ed_layout_compact: "Compacte",
    ed_layout_tiles: "Tuiles",
    ed_advanced: "Avancé",
    ed_language: "Langue",
    ed_language_helper: "Vide : la langue de Home Assistant",
    ed_language_auto: "Automatique",
    ed_entities: "Entités explicites (YAML)",
    ed_entities_helper: "Remplace la découverte automatique : des identifiants d'entités, ou {entity, name, icon}",
    ed_thresholds: "Seuils de confort (YAML)",
    ed_thresholds_helper: "Par type, dans l'unité du capteur, par exemple co2: [800, 1200] ou humidity: [25, 35, 70, 80]",
    ed_rooms: "Pièces (YAML)",
    ed_rooms_helper: "Ordre et personnalisation : une liste de {area, name, icon, navigation_path}",
    ed_navigation_path: "Chemin de navigation",
    ed_all_off_button: "Bouton « Tout éteindre »",
    err_config: "Définis `area` ou `entities`",
    zoom_in: "Afficher la carte complète",
    zoom_out: "Revenir à la vue compacte",
    ed_zoom: "Bouton zoom",
    ed_zoom_helper: "Bascule la mini-carte en carte complète, et inversement",
    rooms_all: "Afficher toutes les pièces",
    rooms_check: "Seulement les pièces à surveiller",
    ed_sort: "Tri",
    ed_sort_name: "Par nom",
    ed_exclude_areas: "Pièces à exclure",
  },
  de: {
    all_closed: "Alles geschlossen",
    all_quiet: "Alles ruhig",
    open_one: "{n} offen",
    open_many: "{n} offen",
    unavail_one: "{n} nicht verfügbar",
    unavail_many: "{n} nicht verfügbar",
    leak: "Wasserleck",
    smoke: "Rauch erkannt",
    gas: "Gas erkannt",
    co: "Kohlenmonoxid",
    detected: "Erkannt",
    clear: "Nicht erkannt",
    unavailable: "Nicht verfügbar",
    on: "An",
    off: "Aus",
    turn_all_off: "Alles ausschalten",
    ed_area: "Bereich",
    ed_title: "Titel",
    ed_show_title: "Titel anzeigen",
    ed_title_helper: "Leer lassen für den Namen des Bereichs",
    ed_columns: "Spalten",
    ed_layout: "Layout",
    ed_layout_helper: "Kacheln: eine große Kachel pro Entität wie die Kachel-Karte, auf dem Handy leichter anzutippen",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Kacheln",
    ed_advanced: "Erweitert",
    ed_language: "Sprache",
    ed_language_helper: "Leer: die Sprache von Home Assistant",
    ed_language_auto: "Automatisch",
    ed_entities: "Explizite Entitäten (YAML)",
    ed_entities_helper: "Ersetzt die automatische Erkennung: Entitäts-IDs oder {entity, name, icon}",
    ed_thresholds: "Komfortschwellen (YAML)",
    ed_thresholds_helper: "Pro Art, in der Einheit des Sensors, z. B. co2: [800, 1200] oder humidity: [25, 35, 70, 80]",
    ed_rooms: "Räume (YAML)",
    ed_rooms_helper: "Reihenfolge und Anpassungen: eine Liste von {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigationspfad",
    ed_all_off_button: "Schaltfläche „Alles ausschalten“",
    err_config: "Lege `area` oder `entities` fest",
    zoom_in: "Vollständige Karte anzeigen",
    zoom_out: "Zurück zur kompakten Ansicht",
    ed_zoom: "Zoom-Schaltfläche",
    ed_zoom_helper: "Wechselt von der Mini-Karte zur vollständigen Karte und zurück",
    rooms_all: "Alle Räume anzeigen",
    rooms_check: "Nur die Räume, die Aufmerksamkeit brauchen",
    ed_sort: "Sortierung",
    ed_sort_name: "Nach Name",
    ed_exclude_areas: "Auszuschließende Räume",
  },
  es: {
    all_closed: "Todo cerrado",
    all_quiet: "Todo tranquilo",
    open_one: "{n} abierto",
    open_many: "{n} abiertos",
    unavail_one: "{n} no disponible",
    unavail_many: "{n} no disponibles",
    leak: "Fuga de agua",
    smoke: "Humo detectado",
    gas: "Gas detectado",
    co: "Monóxido de carbono",
    detected: "Detectado",
    clear: "No detectado",
    unavailable: "No disponible",
    on: "Encendido",
    off: "Apagado",
    turn_all_off: "Apagar todo",
    ed_area: "Área",
    ed_title: "Título",
    ed_show_title: "Mostrar el título",
    ed_title_helper: "Déjalo vacío para usar el nombre del área",
    ed_columns: "Columnas",
    ed_layout: "Diseño",
    ed_layout_helper: "Mosaicos: un mosaico grande por entidad, como la tarjeta Mosaico, más fácil de tocar en el móvil",
    ed_layout_compact: "Compacto",
    ed_layout_tiles: "Mosaicos",
    ed_advanced: "Avanzado",
    ed_language: "Idioma",
    ed_language_helper: "Vacío: el idioma de Home Assistant",
    ed_language_auto: "Automático",
    ed_entities: "Entidades explícitas (YAML)",
    ed_entities_helper: "Sustituye la detección automática: IDs de entidad, o {entity, name, icon}",
    ed_thresholds: "Umbrales de confort (YAML)",
    ed_thresholds_helper: "Por tipo, en la unidad del sensor, p. ej. co2: [800, 1200] o humidity: [25, 35, 70, 80]",
    ed_rooms: "Habitaciones (YAML)",
    ed_rooms_helper: "Orden y personalización: una lista de {area, name, icon, navigation_path}",
    ed_navigation_path: "Ruta de navegación",
    ed_all_off_button: "Botón «Apagar todo»",
    err_config: "Define `area` o `entities`",
    zoom_in: "Mostrar la tarjeta completa",
    zoom_out: "Volver a la vista compacta",
    ed_zoom: "Botón de zoom",
    ed_zoom_helper: "Cambia de la minitarjeta a la tarjeta completa y viceversa",
    rooms_all: "Mostrar todas las habitaciones",
    rooms_check: "Solo las habitaciones que requieren atención",
    ed_sort: "Orden",
    ed_sort_name: "Por nombre",
    ed_exclude_areas: "Habitaciones a excluir",
  },
  sr: {
    all_closed: "Све је затворено",
    all_quiet: "Све је мирно",
    open_one: "{n} отворено",
    open_few: "{n} отворена",
    open_many: "{n} отворених",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Цурење воде",
    smoke: "Откривен дим",
    gas: "Откривен гас",
    co: "Угљен-моноксид",
    detected: "Откривено",
    clear: "Није откривено",
    unavailable: "Недоступно",
    on: "Укључено",
    off: "Искључено",
    turn_all_off: "Искључи све",
    ed_area: "Просторија",
    ed_title: "Наслов",
    ed_show_title: "Прикажи наслов",
    ed_title_helper: "Остави празно за назив просторије",
    ed_columns: "Колоне",
    ed_layout: "Распоред",
    ed_layout_helper: "Плочице: једна велика плочица по ентитету, као картица Плочица, лакше за додир на телефону",
    ed_layout_compact: "Збијено",
    ed_layout_tiles: "Плочице",
    ed_advanced: "Напредно",
    ed_language: "Језик",
    ed_language_helper: "Празно: језик Home Assistant-а",
    ed_language_auto: "Аутоматски",
    ed_entities: "Експлицитни ентитети (YAML)",
    ed_entities_helper: "Замењује аутоматско проналажење: ID-ови ентитета или {entity, name, icon}",
    ed_thresholds: "Прагови комфора (YAML)",
    ed_thresholds_helper: "По врсти, у јединици сензора, нпр. co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Собе/Просторије (YAML)",
    ed_rooms_helper: "Редослед и измене: листа са {area, name, icon, navigation_path}",
    ed_navigation_path: "Путања за навигацију",
    ed_all_off_button: "Дугме „Искључи све“",
    err_config: "Подесите `area` или `entities`",
    zoom_in: "Прикажи целу картицу",
    zoom_out: "Назад на компактни приказ",
    ed_zoom: "Дугме за увећање",
    ed_zoom_helper: "Пребацује мини картицу на пун приказ и назад",
    rooms_all: "Прикажи сваку собу",
    rooms_check: "Само собе које захтевају пажњу",
    ed_sort: "Сортирање",
    ed_sort_name: "По имену",
    ed_exclude_areas: "Изостави собе",
  },
  "sr-Latn": {
    all_closed: "Sve je zatvoreno",
    all_quiet: "Sve je mirno",
    open_one: "{n} otvoreno",
    open_few: "{n} otvorena",
    open_many: "{n} otvorenih",
    unavail_one: "Nedostupno: {n}",
    unavail_many: "Nedostupno: {n}",
    leak: "Curenje vode",
    smoke: "Otkriven dim",
    gas: "Otkriven gas",
    co: "Ugljen-monoksid",
    detected: "Otkriveno",
    clear: "Nije otkriveno",
    unavailable: "Nedostupno",
    on: "Uključeno",
    off: "Isključeno",
    turn_all_off: "Isključi sve",
    ed_area: "Prostorija",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_title_helper: "Ostavi prazno za naziv prostorije",
    ed_columns: "Kolone",
    ed_layout: "Raspored",
    ed_layout_helper: "Pločice: jedna velika pločica po entitetu, kao kartica Pločica, lakše za dodir na telefonu",
    ed_layout_compact: "Zbijeno",
    ed_layout_tiles: "Pločice",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistant-a",
    ed_language_auto: "Automatski",
    ed_entities: "Eksplicitni entiteti (YAML)",
    ed_entities_helper: "Zamenjuje automatsko pronalaženje: ID-ovi entiteta ili {entity, name, icon}",
    ed_thresholds: "Pragovi komfora (YAML)",
    ed_thresholds_helper: "Po vrsti, u jedinici senzora, npr. co2: [800, 1200] ili humidity: [25, 35, 70, 80]",
    ed_rooms: "Sobe/Prostorije (YAML)",
    ed_rooms_helper: "Redosled i izmene: lista sa {area, name, icon, navigation_path}",
    ed_navigation_path: "Putanja za navigaciju",
    ed_all_off_button: "Dugme „Isključi sve“",
    err_config: "Podesite `area` ili `entities`",
    zoom_in: "Prikaži celu karticu",
    zoom_out: "Nazad na kompaktni prikaz",
    ed_zoom: "Dugme za uvećanje",
    ed_zoom_helper: "Prebacuje mini karticu na pun prikaz i nazad",
    rooms_all: "Prikaži svaku sobu",
    rooms_check: "Samo sobe koje zahtevaju pažnju",
    ed_sort: "Sortiranje",
    ed_sort_name: "Po imenu",
    ed_exclude_areas: "Izostavi sobe",
  },
  it: {
    all_closed: "Tutto chiuso",
    all_quiet: "Tutto calmo",
    open_one: "{n} apertura",
    open_many: "{n} aperture",
    unavail_one: "{n} non disponibile",
    unavail_many: "{n} non disponibili",
    leak: "Perdita d'acqua",
    smoke: "Fumo rilevato",
    gas: "Gas rilevato",
    co: "Monossido di carbonio",
    detected: "Rilevato",
    clear: "Non rilevato",
    unavailable: "Non disponibile",
    on: "Accesa",
    off: "Spenta",
    turn_all_off: "Spegni tutto",
    ed_area: "Area",
    ed_title: "Titolo",
    ed_show_title: "Mostra il titolo",
    ed_title_helper: "Lascia vuoto per usare il nome dell'area",
    ed_columns: "Colonne",
    ed_layout: "Layout",
    ed_layout_helper: "Riquadri: un riquadro grande per entità, come la scheda Riquadro, più facile da toccare sul telefono",
    ed_layout_compact: "Compatto",
    ed_layout_tiles: "Riquadri",
    ed_advanced: "Avanzate",
    ed_language: "Lingua",
    ed_language_helper: "Vuoto: la lingua di Home Assistant",
    ed_language_auto: "Automatica",
    ed_entities: "Entità esplicite (YAML)",
    ed_entities_helper: "Sostituisce il rilevamento automatico: ID entità o {entity, name, icon}",
    ed_thresholds: "Soglie di comfort (YAML)",
    ed_thresholds_helper: "Per tipo, nell'unità del sensore, ad es. co2: [800, 1200] o humidity: [25, 35, 70, 80]",
    ed_rooms: "Stanze (YAML)",
    ed_rooms_helper: "Ordine e personalizzazioni: un elenco di {area, name, icon, navigation_path}",
    ed_navigation_path: "Percorso di navigazione",
    ed_all_off_button: "Pulsante «Spegni tutto»",
    err_config: "Imposta `area` o `entities`",
    zoom_in: "Mostra la scheda completa",
    zoom_out: "Torna alla vista compatta",
    ed_zoom: "Pulsante zoom",
    ed_zoom_helper: "Passa dalla mini scheda alla scheda completa e viceversa",
    rooms_all: "Mostra tutte le stanze",
    rooms_check: "Solo le stanze da controllare",
    ed_sort: "Ordinamento",
    ed_sort_name: "Per nome",
    ed_exclude_areas: "Stanze da escludere",
  },
  nl: {
    all_closed: "Alles dicht",
    all_quiet: "Alles rustig",
    open_one: "{n} open",
    open_many: "{n} open",
    unavail_one: "{n} niet beschikbaar",
    unavail_many: "{n} niet beschikbaar",
    leak: "Waterlek",
    smoke: "Rook gedetecteerd",
    gas: "Gas gedetecteerd",
    co: "Koolmonoxide",
    detected: "Gedetecteerd",
    clear: "Niet gedetecteerd",
    unavailable: "Niet beschikbaar",
    on: "Aan",
    off: "Uit",
    turn_all_off: "Alles uitschakelen",
    ed_area: "Ruimte",
    ed_title: "Titel",
    ed_show_title: "Titel tonen",
    ed_title_helper: "Leeg laten voor de naam van de ruimte",
    ed_columns: "Kolommen",
    ed_layout: "Indeling",
    ed_layout_helper: "Tegels: één grote tegel per entiteit, zoals de Tegel-kaart, makkelijker aan te tikken op een telefoon",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Tegels",
    ed_advanced: "Geavanceerd",
    ed_language: "Taal",
    ed_language_helper: "Leeg: de taal van Home Assistant",
    ed_language_auto: "Automatisch",
    ed_entities: "Expliciete entiteiten (YAML)",
    ed_entities_helper: "Vervangt de automatische detectie: entiteit-ID's of {entity, name, icon}",
    ed_thresholds: "Comfortdrempels (YAML)",
    ed_thresholds_helper: "Per soort, in de eenheid van de sensor, bijv. co2: [800, 1200] of humidity: [25, 35, 70, 80]",
    ed_rooms: "Ruimtes (YAML)",
    ed_rooms_helper: "Volgorde en aanpassingen: een lijst van {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigatiepad",
    ed_all_off_button: "Knop “Alles uitschakelen”",
    err_config: "Stel `area` of `entities` in",
    zoom_in: "Volledige kaart tonen",
    zoom_out: "Terug naar de compacte weergave",
    ed_zoom: "Zoomknop",
    ed_zoom_helper: "Schakelt de minikaart naar de volledige kaart en terug",
    rooms_all: "Alle ruimtes tonen",
    rooms_check: "Alleen de ruimtes die aandacht nodig hebben",
    ed_sort: "Sortering",
    ed_sort_name: "Op naam",
    ed_exclude_areas: "Uit te sluiten ruimtes",
  },
  pt: {
    all_closed: "Tudo fechado",
    all_quiet: "Tudo calmo",
    open_one: "{n} abertura",
    open_many: "{n} aberturas",
    unavail_one: "{n} indisponível",
    unavail_many: "{n} indisponíveis",
    leak: "Fuga de água",
    smoke: "Fumo detetado",
    gas: "Gás detetado",
    co: "Monóxido de carbono",
    detected: "Detetado",
    clear: "Não detetado",
    unavailable: "Indisponível",
    on: "Ligada",
    off: "Desligada",
    turn_all_off: "Desligar tudo",
    ed_area: "Área",
    ed_title: "Título",
    ed_show_title: "Mostrar o título",
    ed_title_helper: "Deixe vazio para usar o nome da área",
    ed_columns: "Colunas",
    ed_layout: "Disposição",
    ed_layout_helper: "Mosaicos: um mosaico grande por entidade, como o cartão Mosaico, mais fácil de tocar no telemóvel",
    ed_layout_compact: "Compacta",
    ed_layout_tiles: "Mosaicos",
    ed_advanced: "Avançado",
    ed_language: "Idioma",
    ed_language_helper: "Vazio: o idioma do Home Assistant",
    ed_language_auto: "Automático",
    ed_entities: "Entidades explícitas (YAML)",
    ed_entities_helper: "Substitui a deteção automática: IDs de entidade, ou {entity, name, icon}",
    ed_thresholds: "Limiares de conforto (YAML)",
    ed_thresholds_helper: "Por tipo, na unidade do sensor, p. ex. co2: [800, 1200] ou humidity: [25, 35, 70, 80]",
    ed_rooms: "Divisões (YAML)",
    ed_rooms_helper: "Ordem e personalização: uma lista de {area, name, icon, navigation_path}",
    ed_navigation_path: "Caminho de navegação",
    ed_all_off_button: "Botão «Desligar tudo»",
    err_config: "Defina `area` ou `entities`",
    zoom_in: "Mostrar o cartão completo",
    zoom_out: "Voltar à vista compacta",
    ed_zoom: "Botão de zoom",
    ed_zoom_helper: "Alterna entre o minicartão e o cartão completo",
    rooms_all: "Mostrar todas as divisões",
    rooms_check: "Só as divisões que precisam de atenção",
    ed_sort: "Ordenação",
    ed_sort_name: "Por nome",
    ed_exclude_areas: "Divisões a excluir",
  },
  pl: {
    all_closed: "Zamknięte",
    all_quiet: "Spokojnie",
    open_one: "Otwarte: {n}",
    open_many: "Otwarte: {n}",
    unavail_one: "Niedostępne: {n}",
    unavail_many: "Niedostępne: {n}",
    leak: "Wyciek wody",
    smoke: "Wykryto dym",
    gas: "Wykryto gaz",
    co: "Tlenek węgla",
    detected: "Wykryto",
    clear: "Nie wykryto",
    unavailable: "Niedostępne",
    on: "Włączone",
    off: "Wyłączone",
    turn_all_off: "Wyłącz wszystko",
    ed_area: "Obszar",
    ed_title: "Tytuł",
    ed_show_title: "Pokaż tytuł",
    ed_title_helper: "Pozostaw puste, aby użyć nazwy obszaru",
    ed_columns: "Kolumny",
    ed_layout: "Układ",
    ed_layout_helper: "Kafelki: jeden duży kafelek na encję, jak karta Kafelek, łatwiejszy do dotknięcia na telefonie",
    ed_layout_compact: "Kompaktowy",
    ed_layout_tiles: "Kafelki",
    ed_advanced: "Zaawansowane",
    ed_language: "Język",
    ed_language_helper: "Puste: język Home Assistanta",
    ed_language_auto: "Automatyczny",
    ed_entities: "Jawnie podane encje (YAML)",
    ed_entities_helper: "Zastępuje automatyczne wykrywanie: identyfikatory encji lub {entity, name, icon}",
    ed_thresholds: "Progi komfortu (YAML)",
    ed_thresholds_helper: "Dla każdego rodzaju, w jednostce czujnika, np. co2: [800, 1200] lub humidity: [25, 35, 70, 80]",
    ed_rooms: "Pomieszczenia (YAML)",
    ed_rooms_helper: "Kolejność i nadpisania: lista {area, name, icon, navigation_path}",
    ed_navigation_path: "Ścieżka nawigacji",
    ed_all_off_button: "Przycisk „Wyłącz wszystko”",
    err_config: "Ustaw `area` lub `entities`",
    zoom_in: "Pokaż pełną kartę",
    zoom_out: "Wróć do widoku kompaktowego",
    ed_zoom: "Przycisk powiększenia",
    ed_zoom_helper: "Przełącza minikartę na pełną kartę i z powrotem",
    rooms_all: "Pokaż wszystkie pomieszczenia",
    rooms_check: "Tylko pomieszczenia wymagające uwagi",
    ed_sort: "Sortowanie",
    ed_sort_name: "Według nazwy",
    ed_exclude_areas: "Pomieszczenia do wykluczenia",
  },
  ro: {
    all_closed: "Totul închis",
    all_quiet: "Totul liniștit",
    open_one: "Deschise: {n}",
    open_many: "Deschise: {n}",
    unavail_one: "Indisponibile: {n}",
    unavail_many: "Indisponibile: {n}",
    leak: "Scurgere",
    smoke: "Fum detectat",
    gas: "Gaz detectat",
    co: "Monoxid de carbon",
    detected: "Detectat",
    clear: "Nedetectat",
    unavailable: "Indisponibil",
    on: "Pornită",
    off: "Oprită",
    turn_all_off: "Oprește tot",
    ed_area: "Zonă",
    ed_title: "Titlu",
    ed_show_title: "Afișează titlul",
    ed_title_helper: "Lasă gol pentru numele zonei",
    ed_columns: "Coloane",
    ed_layout: "Aspect",
    ed_layout_helper: "Plăci: o placă mare pentru fiecare entitate, ca fișa Placă, mai ușor de atins pe telefon",
    ed_layout_compact: "Compact",
    ed_layout_tiles: "Plăci",
    ed_advanced: "Avansat",
    ed_language: "Limbă",
    ed_language_helper: "Gol: limba Home Assistant",
    ed_language_auto: "Automată",
    ed_entities: "Entități explicite (YAML)",
    ed_entities_helper: "Înlocuiește detectarea automată: ID-uri de entitate sau {entity, name, icon}",
    ed_thresholds: "Praguri de confort (YAML)",
    ed_thresholds_helper: "Pe tip, în unitatea senzorului, de ex. co2: [800, 1200] sau humidity: [25, 35, 70, 80]",
    ed_rooms: "Camere (YAML)",
    ed_rooms_helper: "Ordine și personalizări: o listă de {area, name, icon, navigation_path}",
    ed_navigation_path: "Cale de navigare",
    ed_all_off_button: "Butonul „Oprește tot”",
    err_config: "Setează `area` sau `entities`",
    zoom_in: "Afișează cardul complet",
    zoom_out: "Înapoi la vizualizarea compactă",
    ed_zoom: "Buton de zoom",
    ed_zoom_helper: "Comută între mini-card și cardul complet",
    rooms_all: "Afișează toate camerele",
    rooms_check: "Doar camerele care necesită atenție",
    ed_sort: "Sortare",
    ed_sort_name: "După nume",
    ed_exclude_areas: "Camere excluse",
  },
  da: {
    all_closed: "Alt lukket",
    all_quiet: "Alt roligt",
    open_one: "{n} åben",
    open_many: "{n} åbne",
    unavail_one: "{n} utilgængelig",
    unavail_many: "{n} utilgængelige",
    leak: "Vandlækage",
    smoke: "Røg registreret",
    gas: "Gas registreret",
    co: "Kulilte",
    detected: "Registreret",
    clear: "Ikke registreret",
    unavailable: "Utilgængelig",
    on: "Tændt",
    off: "Slukket",
    turn_all_off: "Sluk alt",
    ed_area: "Område",
    ed_title: "Titel",
    ed_show_title: "Vis titel",
    ed_title_helper: "Lad stå tomt for at bruge områdets navn",
    ed_columns: "Kolonner",
    ed_layout: "Layout",
    ed_layout_helper: "Fliser: én stor flise pr. entitet som Flise-kortet, nemmere at trykke på en telefon",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Fliser",
    ed_advanced: "Avanceret",
    ed_language: "Sprog",
    ed_language_helper: "Tomt: Home Assistants sprog",
    ed_language_auto: "Automatisk",
    ed_entities: "Eksplicitte enheder (YAML)",
    ed_entities_helper: "Erstatter den automatiske registrering: enheds-id'er eller {entity, name, icon}",
    ed_thresholds: "Komforttærskler (YAML)",
    ed_thresholds_helper: "Pr. type, i sensorens enhed, f.eks. co2: [800, 1200] eller humidity: [25, 35, 70, 80]",
    ed_rooms: "Rum (YAML)",
    ed_rooms_helper: "Rækkefølge og tilpasninger: en liste med {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigationssti",
    ed_all_off_button: "Knappen »Sluk alt«",
    err_config: "Angiv `area` eller `entities`",
    zoom_in: "Vis hele kortet",
    zoom_out: "Tilbage til den kompakte visning",
    ed_zoom: "Zoomknap",
    ed_zoom_helper: "Skifter fra minikortet til hele kortet og tilbage",
    rooms_all: "Vis alle rum",
    rooms_check: "Kun rum, der kræver opmærksomhed",
    ed_sort: "Sortering",
    ed_sort_name: "Efter navn",
    ed_exclude_areas: "Rum, der udelades",
  },
  sv: {
    all_closed: "Allt stängt",
    all_quiet: "Allt lugnt",
    open_one: "{n} öppen",
    open_many: "{n} öppna",
    unavail_one: "{n} ej tillgänglig",
    unavail_many: "{n} ej tillgängliga",
    leak: "Vattenläcka",
    smoke: "Rök upptäckt",
    gas: "Gas upptäckt",
    co: "Kolmonoxid",
    detected: "Upptäckt",
    clear: "Inte upptäckt",
    unavailable: "Ej tillgänglig",
    on: "På",
    off: "Av",
    turn_all_off: "Stäng av allt",
    ed_area: "Område",
    ed_title: "Titel",
    ed_show_title: "Visa rubrik",
    ed_title_helper: "Lämna tomt för områdets namn",
    ed_columns: "Kolumner",
    ed_layout: "Layout",
    ed_layout_helper: "Rutor: en stor ruta per entitet, som Ruta-kortet, lättare att trycka på i mobilen",
    ed_layout_compact: "Kompakt",
    ed_layout_tiles: "Rutor",
    ed_advanced: "Avancerat",
    ed_language: "Språk",
    ed_language_helper: "Tomt: Home Assistants språk",
    ed_language_auto: "Automatiskt",
    ed_entities: "Explicita entiteter (YAML)",
    ed_entities_helper: "Ersätter den automatiska identifieringen: entitets-ID:n eller {entity, name, icon}",
    ed_thresholds: "Komfortgränser (YAML)",
    ed_thresholds_helper: "Per typ, i sensorns enhet, t.ex. co2: [800, 1200] eller humidity: [25, 35, 70, 80]",
    ed_rooms: "Rum (YAML)",
    ed_rooms_helper: "Ordning och anpassningar: en lista med {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigeringssökväg",
    ed_all_off_button: "Knappen ”Stäng av allt”",
    err_config: "Ange `area` eller `entities`",
    zoom_in: "Visa hela kortet",
    zoom_out: "Tillbaka till kompakt vy",
    ed_zoom: "Zoomknapp",
    ed_zoom_helper: "Växlar mellan minikortet och hela kortet",
    rooms_all: "Visa alla rum",
    rooms_check: "Bara rum som behöver ses över",
    ed_sort: "Sortering",
    ed_sort_name: "Efter namn",
    ed_exclude_areas: "Rum att utesluta",
  },
  bg: {
    all_closed: "Всичко е затворено",
    all_quiet: "Всичко е спокойно",
    open_one: "Отворени: {n}",
    open_many: "Отворени: {n}",
    unavail_one: "Недостъпни: {n}",
    unavail_many: "Недостъпни: {n}",
    leak: "Теч на вода",
    smoke: "Открит дим",
    gas: "Открит газ",
    co: "Въглероден оксид",
    detected: "Открито",
    clear: "Не е открито",
    unavailable: "Недостъпно",
    on: "Включен",
    off: "Изключен",
    turn_all_off: "Изключи всичко",
    ed_area: "Зона",
    ed_title: "Заглавие",
    ed_show_title: "Показване на заглавието",
    ed_title_helper: "Оставете празно за името на зоната",
    ed_columns: "Колони",
    ed_layout: "Оформление",
    ed_layout_helper: "Плочки: по една голяма плочка за обект, като картата Плочка, по-лесна за докосване на телефон",
    ed_layout_compact: "Компактно",
    ed_layout_tiles: "Плочки",
    ed_advanced: "Разширени",
    ed_language: "Език",
    ed_language_helper: "Празно: езикът на Home Assistant",
    ed_language_auto: "Автоматично",
    ed_entities: "Изрично зададени обекти (YAML)",
    ed_entities_helper: "Заменя автоматичното откриване: ID на обекти или {entity, name, icon}",
    ed_thresholds: "Прагове на комфорт (YAML)",
    ed_thresholds_helper: "По вид, в мерната единица на сензора, напр. co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Стаи (YAML)",
    ed_rooms_helper: "Ред и персонализиране: списък от {area, name, icon, navigation_path}",
    ed_navigation_path: "Път за навигация",
    ed_all_off_button: "Бутон „Изключи всичко“",
    err_config: "Задайте `area` или `entities`",
    zoom_in: "Покажи пълната карта",
    zoom_out: "Обратно към компактния изглед",
    ed_zoom: "Бутон за увеличение",
    ed_zoom_helper: "Превключва от мини картата към пълната карта и обратно",
    rooms_all: "Покажи всички стаи",
    rooms_check: "Само стаите, които изискват внимание",
    ed_sort: "Сортиране",
    ed_sort_name: "По име",
    ed_exclude_areas: "Стаи за пропускане",
  },
  ru: {
    all_closed: "Всё закрыто",
    all_quiet: "Всё спокойно",
    open_one: "Открыто: {n}",
    open_many: "Открыто: {n}",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Протечка",
    smoke: "Обнаружен дым",
    gas: "Обнаружен газ",
    co: "Угарный газ",
    detected: "Обнаружено",
    clear: "Не обнаружено",
    unavailable: "Недоступно",
    on: "Включено",
    off: "Выключено",
    turn_all_off: "Выключить всё",
    ed_area: "Пространство",
    ed_title: "Заголовок",
    ed_show_title: "Показывать заголовок",
    ed_title_helper: "Оставьте пустым, чтобы использовать название пространства",
    ed_columns: "Столбцы",
    ed_layout: "Макет",
    ed_layout_helper: "Плитки: одна большая плитка на объект, как карточка «Плитка», удобнее нажимать на телефоне",
    ed_layout_compact: "Компактный",
    ed_layout_tiles: "Плитки",
    ed_advanced: "Дополнительно",
    ed_language: "Язык",
    ed_language_helper: "Пусто: язык Home Assistant",
    ed_language_auto: "Автоматически",
    ed_entities: "Явно заданные объекты (YAML)",
    ed_entities_helper: "Заменяет автоматическое обнаружение: ID объектов или {entity, name, icon}",
    ed_thresholds: "Пороги комфорта (YAML)",
    ed_thresholds_helper: "Для каждого типа, в единицах датчика, например co2: [800, 1200] или humidity: [25, 35, 70, 80]",
    ed_rooms: "Комнаты (YAML)",
    ed_rooms_helper: "Порядок и настройки: список {area, name, icon, navigation_path}",
    ed_navigation_path: "Путь навигации",
    ed_all_off_button: "Кнопка «Выключить всё»",
    err_config: "Укажите `area` или `entities`",
    zoom_in: "Показать полную карточку",
    zoom_out: "Вернуться к компактному виду",
    ed_zoom: "Кнопка масштаба",
    ed_zoom_helper: "Переключает мини-карточку на полную карточку и обратно",
    rooms_all: "Показать все комнаты",
    rooms_check: "Только комнаты, требующие внимания",
    ed_sort: "Сортировка",
    ed_sort_name: "По названию",
    ed_exclude_areas: "Исключить комнаты",
  },
  uk: {
    all_closed: "Усе зачинено",
    all_quiet: "Усе спокійно",
    open_one: "Відчинено: {n}",
    open_many: "Відчинено: {n}",
    unavail_one: "Недоступно: {n}",
    unavail_many: "Недоступно: {n}",
    leak: "Витік води",
    smoke: "Виявлено дим",
    gas: "Виявлено газ",
    co: "Чадний газ",
    detected: "Виявлено",
    clear: "Не виявлено",
    unavailable: "Недоступно",
    on: "Увімкнено",
    off: "Вимкнено",
    turn_all_off: "Вимкнути все",
    ed_area: "Простір",
    ed_title: "Заголовок",
    ed_show_title: "Показувати заголовок",
    ed_title_helper: "Залиште порожнім, щоб використати назву простору",
    ed_columns: "Стовпці",
    ed_layout: "Макет",
    ed_layout_helper: "Плитки: одна велика плитка на сутність, як картка «Плитка», зручніше торкатися на телефоні",
    ed_layout_compact: "Компактний",
    ed_layout_tiles: "Плитки",
    ed_advanced: "Додатково",
    ed_language: "Мова",
    ed_language_helper: "Порожньо: мова Home Assistant",
    ed_language_auto: "Автоматично",
    ed_entities: "Явно задані сутності (YAML)",
    ed_entities_helper: "Замінює автоматичне виявлення: ID сутностей або {entity, name, icon}",
    ed_thresholds: "Пороги комфорту (YAML)",
    ed_thresholds_helper: "Для кожного типу, в одиницях датчика, наприклад co2: [800, 1200] або humidity: [25, 35, 70, 80]",
    ed_rooms: "Кімнати (YAML)",
    ed_rooms_helper: "Порядок і налаштування: список {area, name, icon, navigation_path}",
    ed_navigation_path: "Шлях навігації",
    ed_all_off_button: "Кнопка «Вимкнути все»",
    err_config: "Вкажіть `area` або `entities`",
    zoom_in: "Показати повну картку",
    zoom_out: "Повернутися до компактного вигляду",
    ed_zoom: "Кнопка масштабу",
    ed_zoom_helper: "Перемикає міні-картку на повну картку й назад",
    rooms_all: "Показати всі кімнати",
    rooms_check: "Лише кімнати, що потребують уваги",
    ed_sort: "Сортування",
    ed_sort_name: "За назвою",
    ed_exclude_areas: "Виключити кімнати",
  },
  hu: {
    all_closed: "Minden zárva",
    all_quiet: "Minden nyugodt",
    open_one: "{n} nyitva",
    open_many: "{n} nyitva",
    unavail_one: "{n} nem elérhető",
    unavail_many: "{n} nem elérhető",
    leak: "Vízszivárgás",
    smoke: "Füst észlelve",
    gas: "Gáz észlelve",
    co: "Szén-monoxid",
    detected: "Észlelve",
    clear: "Nincs észlelés",
    unavailable: "Nem elérhető",
    on: "Be",
    off: "Ki",
    turn_all_off: "Minden kikapcsolása",
    ed_area: "Terület",
    ed_title: "Cím",
    ed_show_title: "Cím megjelenítése",
    ed_title_helper: "Hagyd üresen a terület nevéhez",
    ed_columns: "Oszlopok",
    ed_layout: "Elrendezés",
    ed_layout_helper: "Csempék: entitásonként egy nagy csempe, mint a Csempe kártya, telefonon könnyebb megérinteni",
    ed_layout_compact: "Tömör",
    ed_layout_tiles: "Csempék",
    ed_advanced: "Speciális",
    ed_language: "Nyelv",
    ed_language_helper: "Üres: a Home Assistant nyelve",
    ed_language_auto: "Automatikus",
    ed_entities: "Kifejezetten megadott entitások (YAML)",
    ed_entities_helper: "Felülírja az automatikus felismerést: entitásazonosítók vagy {entity, name, icon}",
    ed_thresholds: "Komfortküszöbök (YAML)",
    ed_thresholds_helper: "Típusonként, az érzékelő mértékegységében, pl. co2: [800, 1200] vagy humidity: [25, 35, 70, 80]",
    ed_rooms: "Helyiségek (YAML)",
    ed_rooms_helper: "Sorrend és testreszabás: {area, name, icon, navigation_path} elemek listája",
    ed_navigation_path: "Navigációs útvonal",
    ed_all_off_button: "„Minden kikapcsolása” gomb",
    err_config: "Állítsd be az `area` vagy az `entities` értékét",
    zoom_in: "A teljes kártya megjelenítése",
    zoom_out: "Vissza a kompakt nézethez",
    ed_zoom: "Nagyítás gomb",
    ed_zoom_helper: "Vált a mini kártya és a teljes kártya között",
    rooms_all: "Minden helyiség megjelenítése",
    rooms_check: "Csak a figyelmet igénylő helyiségek",
    ed_sort: "Rendezés",
    ed_sort_name: "Név szerint",
    ed_exclude_areas: "Kihagyott helyiségek",
  },
  sk: {
    all_closed: "Všetko zatvorené",
    all_quiet: "Všetko pokojné",
    open_one: "Otvorené: {n}",
    open_many: "Otvorené: {n}",
    unavail_one: "Nedostupné: {n}",
    unavail_many: "Nedostupné: {n}",
    leak: "Únik vody",
    smoke: "Zistený dym",
    gas: "Zistený plyn",
    co: "Oxid uhoľnatý",
    detected: "Zistené",
    clear: "Nezistené",
    unavailable: "Nedostupné",
    on: "Zapnuté",
    off: "Vypnuté",
    turn_all_off: "Vypnúť všetko",
    ed_area: "Oblasť",
    ed_title: "Názov",
    ed_show_title: "Zobraziť názov",
    ed_title_helper: "Nechajte prázdne pre názov oblasti",
    ed_columns: "Stĺpce",
    ed_layout: "Rozloženie",
    ed_layout_helper: "Dlaždice: jedna veľká dlaždica na entitu ako karta Dlaždica, na telefóne sa ľahšie ťuká",
    ed_layout_compact: "Kompaktné",
    ed_layout_tiles: "Dlaždice",
    ed_advanced: "Rozšírené",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdne: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_entities: "Explicitné entity (YAML)",
    ed_entities_helper: "Nahrádza automatické vyhľadávanie: ID entít alebo {entity, name, icon}",
    ed_thresholds: "Prahy komfortu (YAML)",
    ed_thresholds_helper: "Podľa druhu, v jednotke senzora, napr. co2: [800, 1200] alebo humidity: [25, 35, 70, 80]",
    ed_rooms: "Miestnosti (YAML)",
    ed_rooms_helper: "Poradie a úpravy: zoznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigačná cesta",
    ed_all_off_button: "Tlačidlo „Vypnúť všetko“",
    err_config: "Nastavte `area` alebo `entities`",
    zoom_in: "Zobraziť celú kartu",
    zoom_out: "Späť na kompaktné zobrazenie",
    ed_zoom: "Tlačidlo priblíženia",
    ed_zoom_helper: "Prepína minikartu na celú kartu a späť",
    rooms_all: "Zobraziť všetky miestnosti",
    rooms_check: "Len miestnosti vyžadujúce pozornosť",
    ed_sort: "Zoradenie",
    ed_sort_name: "Podľa názvu",
    ed_exclude_areas: "Vynechané miestnosti",
  },
  cs: {
    all_closed: "Vše zavřeno",
    all_quiet: "Vše v klidu",
    open_one: "Otevřeno: {n}",
    open_many: "Otevřeno: {n}",
    unavail_one: "Nedostupné: {n}",
    unavail_many: "Nedostupné: {n}",
    leak: "Únik vody",
    smoke: "Zjištěn kouř",
    gas: "Zjištěn plyn",
    co: "Oxid uhelnatý",
    detected: "Zjištěno",
    clear: "Nezjištěno",
    unavailable: "Nedostupné",
    on: "Zapnuto",
    off: "Vypnuto",
    turn_all_off: "Vypnout vše",
    ed_area: "Oblast",
    ed_title: "Název",
    ed_show_title: "Zobrazit název",
    ed_title_helper: "Ponechte prázdné pro název oblasti",
    ed_columns: "Sloupce",
    ed_layout: "Rozložení",
    ed_layout_helper: "Dlaždice: jedna velká dlaždice na entitu jako karta Dlaždice, na telefonu se snáz ťuká",
    ed_layout_compact: "Kompaktní",
    ed_layout_tiles: "Dlaždice",
    ed_advanced: "Pokročilé",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdné: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_entities: "Explicitní entity (YAML)",
    ed_entities_helper: "Nahrazuje automatické vyhledávání: ID entit nebo {entity, name, icon}",
    ed_thresholds: "Prahy komfortu (YAML)",
    ed_thresholds_helper: "Podle druhu, v jednotce senzoru, např. co2: [800, 1200] nebo humidity: [25, 35, 70, 80]",
    ed_rooms: "Místnosti (YAML)",
    ed_rooms_helper: "Pořadí a úpravy: seznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigační cesta",
    ed_all_off_button: "Tlačítko „Vypnout vše“",
    err_config: "Nastavte `area` nebo `entities`",
    zoom_in: "Zobrazit celou kartu",
    zoom_out: "Zpět na kompaktní zobrazení",
    ed_zoom: "Tlačítko přiblížení",
    ed_zoom_helper: "Přepíná minikartu na celou kartu a zpět",
    rooms_all: "Zobrazit všechny místnosti",
    rooms_check: "Jen místnosti vyžadující pozornost",
    ed_sort: "Řazení",
    ed_sort_name: "Podle názvu",
    ed_exclude_areas: "Vynechané místnosti",
  },
  sl: {
    all_closed: "Vse zaprto",
    all_quiet: "Vse mirno",
    open_one: "Odprto: {n}",
    open_many: "Odprto: {n}",
    unavail_one: "Ni na voljo: {n}",
    unavail_many: "Ni na voljo: {n}",
    leak: "Puščanje vode",
    smoke: "Zaznan dim",
    gas: "Zaznan plin",
    co: "Ogljikov monoksid",
    detected: "Zaznano",
    clear: "Ni zaznano",
    unavailable: "Ni na voljo",
    on: "Vklopljeno",
    off: "Izklopljeno",
    turn_all_off: "Izklopi vse",
    ed_area: "Območje",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_title_helper: "Pustite prazno za ime območja",
    ed_columns: "Stolpci",
    ed_layout: "Postavitev",
    ed_layout_helper: "Ploščice: ena velika ploščica na entiteto, kot kartica Ploščica, lažje za dotik na telefonu",
    ed_layout_compact: "Strnjena",
    ed_layout_tiles: "Ploščice",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistanta",
    ed_language_auto: "Samodejno",
    ed_entities: "Izrecno navedene entitete (YAML)",
    ed_entities_helper: "Nadomesti samodejno zaznavanje: ID-ji entitet ali {entity, name, icon}",
    ed_thresholds: "Pragovi udobja (YAML)",
    ed_thresholds_helper: "Po vrsti, v enoti senzorja, npr. co2: [800, 1200] ali humidity: [25, 35, 70, 80]",
    ed_rooms: "Prostori (YAML)",
    ed_rooms_helper: "Vrstni red in prilagoditve: seznam {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigacijska pot",
    ed_all_off_button: "Gumb »Izklopi vse«",
    err_config: "Nastavite `area` ali `entities`",
    zoom_in: "Prikaži celotno kartico",
    zoom_out: "Nazaj na strnjen pogled",
    ed_zoom: "Gumb za povečavo",
    ed_zoom_helper: "Preklopi mini kartico v celotno kartico in nazaj",
    rooms_all: "Prikaži vse prostore",
    rooms_check: "Samo prostori, ki potrebujejo pozornost",
    ed_sort: "Razvrščanje",
    ed_sort_name: "Po imenu",
    ed_exclude_areas: "Izpuščeni prostori",
  },
  lv: {
    all_closed: "Viss aizvērts",
    all_quiet: "Viss mierīgi",
    open_one: "Atvērti: {n}",
    open_many: "Atvērti: {n}",
    unavail_one: "Nav pieejami: {n}",
    unavail_many: "Nav pieejami: {n}",
    leak: "Ūdens noplūde",
    smoke: "Konstatēti dūmi",
    gas: "Konstatēta gāze",
    co: "Tvana gāze",
    detected: "Konstatēts",
    clear: "Nav konstatēts",
    unavailable: "Nav pieejams",
    on: "Ieslēgts",
    off: "Izslēgts",
    turn_all_off: "Izslēgt visu",
    ed_area: "Zona",
    ed_title: "Virsraksts",
    ed_show_title: "Rādīt virsrakstu",
    ed_title_helper: "Atstājiet tukšu, lai izmantotu zonas nosaukumu",
    ed_columns: "Kolonnas",
    ed_layout: "Izkārtojums",
    ed_layout_helper: "Flīzes: viena liela flīze katrai entītijai kā kartītē Flīze, tālrunī vieglāk pieskarties",
    ed_layout_compact: "Kompakts",
    ed_layout_tiles: "Flīzes",
    ed_advanced: "Papildu",
    ed_language: "Valoda",
    ed_language_helper: "Tukšs: Home Assistant valoda",
    ed_language_auto: "Automātiski",
    ed_entities: "Tieši norādītas vienības (YAML)",
    ed_entities_helper: "Aizstāj automātisko noteikšanu: vienību ID vai {entity, name, icon}",
    ed_thresholds: "Komforta sliekšņi (YAML)",
    ed_thresholds_helper: "Pēc veida, sensora mērvienībā, piem., co2: [800, 1200] vai humidity: [25, 35, 70, 80]",
    ed_rooms: "Telpas (YAML)",
    ed_rooms_helper: "Secība un pielāgojumi: saraksts ar {area, name, icon, navigation_path}",
    ed_navigation_path: "Navigācijas ceļš",
    ed_all_off_button: "Poga “Izslēgt visu”",
    err_config: "Iestatiet `area` vai `entities`",
    zoom_in: "Rādīt pilno karti",
    zoom_out: "Atpakaļ uz kompakto skatu",
    ed_zoom: "Tālummaiņas poga",
    ed_zoom_helper: "Pārslēdz mini karti uz pilno karti un atpakaļ",
    rooms_all: "Rādīt visas telpas",
    rooms_check: "Tikai telpas, kurām jāpievērš uzmanība",
    ed_sort: "Kārtošana",
    ed_sort_name: "Pēc nosaukuma",
    ed_exclude_areas: "Izslēdzamās telpas",
  },
  el: {
    all_closed: "Όλα κλειστά",
    all_quiet: "Όλα ήσυχα",
    open_one: "{n} ανοιχτό",
    open_many: "{n} ανοιχτά",
    unavail_one: "Μη διαθέσιμα: {n}",
    unavail_many: "Μη διαθέσιμα: {n}",
    leak: "Διαρροή νερού",
    smoke: "Ανιχνεύθηκε καπνός",
    gas: "Ανιχνεύθηκε αέριο",
    co: "Μονοξείδιο του άνθρακα",
    detected: "Ανιχνεύθηκε",
    clear: "Δεν ανιχνεύθηκε",
    unavailable: "Μη διαθέσιμο",
    on: "Ενεργή",
    off: "Ανενεργή",
    turn_all_off: "Απενεργοποίηση όλων",
    ed_area: "Περιοχή",
    ed_title: "Τίτλος",
    ed_show_title: "Εμφάνιση τίτλου",
    ed_title_helper: "Αφήστε το κενό για το όνομα της περιοχής",
    ed_columns: "Στήλες",
    ed_layout: "Διάταξη",
    ed_layout_helper: "Πλακίδια: ένα μεγάλο πλακίδιο ανά οντότητα, όπως η κάρτα Πλακίδιο, πιο εύκολο στο πάτημα στο κινητό",
    ed_layout_compact: "Συμπαγής",
    ed_layout_tiles: "Πλακίδια",
    ed_advanced: "Για προχωρημένους",
    ed_language: "Γλώσσα",
    ed_language_helper: "Κενό: η γλώσσα του Home Assistant",
    ed_language_auto: "Αυτόματα",
    ed_entities: "Ρητές οντότητες (YAML)",
    ed_entities_helper: "Αντικαθιστά τον αυτόματο εντοπισμό: αναγνωριστικά οντοτήτων ή {entity, name, icon}",
    ed_thresholds: "Όρια άνεσης (YAML)",
    ed_thresholds_helper: "Ανά είδος, στη μονάδα του αισθητήρα, π.χ. co2: [800, 1200] ή humidity: [25, 35, 70, 80]",
    ed_rooms: "Δωμάτια (YAML)",
    ed_rooms_helper: "Σειρά και προσαρμογές: μια λίστα με {area, name, icon, navigation_path}",
    ed_navigation_path: "Διαδρομή πλοήγησης",
    ed_all_off_button: "Κουμπί «Απενεργοποίηση όλων»",
    err_config: "Ορίστε `area` ή `entities`",
    zoom_in: "Εμφάνιση της πλήρους κάρτας",
    zoom_out: "Επιστροφή στη συμπαγή προβολή",
    ed_zoom: "Κουμπί ζουμ",
    ed_zoom_helper: "Εναλλάσσει τη μίνι κάρτα με την πλήρη κάρτα",
    rooms_all: "Εμφάνιση όλων των δωματίων",
    rooms_check: "Μόνο τα δωμάτια που χρειάζονται έλεγχο",
    ed_sort: "Ταξινόμηση",
    ed_sort_name: "Κατά όνομα",
    ed_exclude_areas: "Δωμάτια προς εξαίρεση",
  },
};

// ── Water heater ─────────────────────────────────────────────────────────────
// A water heater is a `water_heater` entity (its mode, temperature and target) or the switch of a tank driven by a relay
// (a smart plug, a contactor) with a temperature sensor. The other entities of its device complete it, found by what
// they are (device class, unit, domain) and, when that is not enough, by their name. `entities` overrides any role.
// The state is brought down to: heating, ready, boost, away, off, error; `offline` when the water heater cannot report.

// A water heater by name, for the switches of a relay.
const WH_NAME = /cumulus|chauffe.?eau|water.?heater|ballon|boiler|warm.?wasser|ecs|hot.?water|geyser|scaldabagno|calentador|termo/i;
// The modes that are a boost, an absence or a heat pump.
// `high_demand` is a lasting mode of the core integrations (EcoNet, A. O. Smith), not a boost.
const WH_BOOST = /(boost|turbo|rapid|fast|schnell)/;
const WH_AWAY = /(away|vacation|holiday|absence|abwesen|urlaub|frost|hors_gel)/;
const WH_HEAT_PUMP = /heat.?pump|heatpump|hybrid|thermodynam|explorer|aquarea|nuos|lydos.?hybrid|calypso|wwk|wpl|aerotop|pac\b/i;

const whNorm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
const whLabel = (hass, id) => `${id} ${hass.states[id]?.attributes.friendly_name || ""}`;
const whNum = (st) => {
  const v = Number.parseFloat(st?.state);
  return Number.isFinite(v) ? v : null;
};
// A power in W, an energy in kWh, whatever the sensor's unit.
const whWatts = (st) => {
  const v = whNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
};
const whKwh = (st) => {
  const v = whNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "Wh" ? v / 1000 : u === "MWh" ? v * 1000 : v;
};
// The device of an entity, from the registry.
const whDeviceOf = (hass, id) => hass.entities?.[id]?.device_id;
// Every entity of each device, in registry order.
const whDeviceEntities = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) if (r.device_id && !r.hidden) (out[r.device_id] ||= []).push(id);
  return out;
});

// The water heaters of the home, most likely first: water_heater entities, then the switches named like a water heater
// (not the boost or away switch of a water_heater's device).
const whHeaters = (hass) => {
  const ids = Object.keys(hass.states || {});
  const heaters = ids.filter((id) => id.startsWith("water_heater."));
  const taken = new Set(heaters.map((id) => whDeviceOf(hass, id)).filter(Boolean));
  const relay = (id) =>
    /^(switch|input_boolean)\./.test(id) && WH_NAME.test(whLabel(hass, id)) && !taken.has(whDeviceOf(hass, id)) && !/boost|away|absence|holiday|vacation/i.test(whLabel(hass, id));
  return [...heaters, ...ids.filter(relay)];
};

// The entity of each role on the water heater's device: temperature (the water's), inlet (the cold water's), level
// (hot water in %), litres (hot water at 40 °C), showers, power, energy, heating (the element or the heat pump running),
// boost, away (switches), away_end (the end of an absence), error.
const WH_ROLES = ["temperature", "inlet", "level", "litres", "showers", "power", "energy", "energy_grid", "energy_solar", "heating", "boost", "away", "away_end", "error"];
const whFind = (hass, entity, overrides = {}) => {
  const device = entity && whDeviceOf(hass, entity);
  const ids = (device ? whDeviceEntities(hass)[device] : null) || [];
  const st = (id) => hass.states[id];
  const dom = (id) => id.split(".")[0];
  const dc = (id) => st(id)?.attributes.device_class;
  const unit = (id) => st(id)?.attributes.unit_of_measurement;
  const named = (id, re) => re.test(whLabel(hass, id));
  const num = (id) => whNum(st(id)) != null;
  const pick = (test, prefer) => {
    const all = ids.filter((id) => id !== entity && st(id) && test(id));
    return (prefer && all.find(prefer)) || all[0];
  };
  // A "bottom" probe is hot water (Overkiz, ViCare): not the cold inlet.
  const COLD = /inlet|cold|froid|kalt|entr[ée]e|zulauf/i;
  const AIR = /outdoor|outside|ambient|air|ext[ée]rieur|room|pi[eè]ce|au[sß]en|cpu|board|compressor|evaporat|device|internal|chip|relay/i;
  const HOT = /hot.?water|eau.?chaude|v40|mixed|warm.?wasser|available|disponible|remaining|restant|reserve|r[ée]serve|acqua.?calda|agua.?caliente/i;
  const r = {};
  // Diagnostic sensors (a smart plug's own temperature) are left out.
  const temps = ids.filter((id) => id !== entity && dom(id) === "sensor" && dc(id) === "temperature" && st(id) && !hass.entities?.[id]?.entity_category);
  r.temperature = temps.find((id) => !COLD.test(whLabel(hass, id)) && !AIR.test(whLabel(hass, id)));
  r.inlet = temps.find((id) => COLD.test(whLabel(hass, id)) && !AIR.test(whLabel(hass, id)));
  r.level = pick((id) => dom(id) === "sensor" && unit(id) === "%" && num(id) && !dc(id) && named(id, new RegExp(`${HOT.source}|level|niveau|fill|charge`, "i")));
  r.litres = pick((id) => dom(id) === "sensor" && ["L", "l"].includes(unit(id)) && num(id), (id) => named(id, HOT));
  r.showers = pick((id) => dom(id) === "sensor" && num(id) && named(id, /shower|douche|dusch|doccia|ducha/i));
  r.power = pick((id) => dom(id) === "sensor" && dc(id) === "power");
  const energy = ids.filter((id) => id !== entity && dom(id) === "sensor" && dc(id) === "energy" && st(id));
  r.energy = energy.find((id) => named(id, /today|daily|day|jour|heute|oggi|hoy/i)) || energy[0];
  // PV-routed tanks: the grid (off-peak forcing) and the solar surplus split of today's energy, by name.
  r.energy_solar = energy.find((id) => named(id, /solar|solaire|\bpv\b|surplus|photovolta|routed|divert/i));
  r.energy_grid = energy.find((id) => id !== r.energy_solar && named(id, /grid|r[ée]seau|network|mains|import|forc|hc\b|heures?.?creuses/i));
  r.heating = pick(
    (id) => dom(id) === "binary_sensor" && (["heat", "running", "power"].includes(dc(id)) || named(id, /heat|chauff|running|element|r[ée]sistance|resistor|compressor|heiz/i)),
  );
  r.boost = pick((id) => dom(id) === "switch" && named(id, /boost/i));
  r.away = pick((id) => dom(id) === "switch" && named(id, WH_AWAY));
  r.away_end = pick((id) => (dom(id) === "datetime" || (dom(id) === "sensor" && dc(id) === "timestamp")) && named(id, /away|absence|holiday|vacation|urlaub|abwesen|end|fin|until|retour|return/i));
  r.error = pick((id) => (dom(id) === "sensor" && !num(id) && named(id, /error|fault|erreur|d[ée]faut|fehler|alarm/i)) || (dom(id) === "binary_sensor" && dc(id) === "problem"));
  for (const role of WH_ROLES) if (overrides[role]) r[role] = overrides[role];
  return r;
};

// A temperature in °C, whatever the unit.
const whCelsius = (v, unit) => (v == null ? null : /F/.test(unit || "") ? ((v - 32) * 5) / 9 : v);

// The hot water: the share of the tank that is hot (0–1), the volume at 40 °C and the showers, from what the
// integration reports, else estimated from the water's temperature with a mixing model: hot water at T (above 40 °C)
// makes capacity × (T − cold) / (40 − cold) litres at 40 °C; the share is that volume against the tank at its target.
const whHotWater = ({ level, litres, showers, temp, target, cold = 15, capacity = 200, shower = 50 }) => {
  // A cold water at 35 °C or more is a misread probe: back to 15 °C, so that 40 − cold stays a real span.
  const c = cold != null && cold < 35 ? cold : 15;
  const at40 = (t) => (t > 40 ? (capacity * (t - c)) / (40 - c) : 0);
  const full = at40(target != null && target > 40 ? target : 55);
  const l40 = litres ?? (temp != null ? at40(temp) : null);
  const share = level != null ? level / 100 : l40 != null && full > 0 ? l40 / full : null;
  return {
    share: share == null ? null : Math.max(0, Math.min(1, share)),
    litres: l40 == null ? null : Math.round(l40 / 5) * 5,
    showers: showers ?? (l40 == null ? null : Math.floor(l40 / shower)),
  };
};

// Strings of the water heater cards; the shared ones above (unavailable, editor basics) complete them.
const WH_I18N = {
  en: {
    title: "Water heater",
    st_heating: "Heating",
    st_ready: "Ready",
    st_boost: "Boost",
    st_away: "Away",
    st_off: "Off",
    st_error: "Error",
    st_offline: "Offline",
    shower_one: "{n} shower",
    shower_many: "{n} showers",
    litres: "{n} L at 40 °C",
    heating_to: "Heating to {t}",
    target: "Target {t}",
    away_until: "Away until {d}",
    away_on: "Holiday mode",
    t_power: "Power",
    t_today: "Today",
    t_energy: "Energy",
    t_mode: "Mode",
    t_tariff: "Tariff",
    t_water: "Water",
    t_inlet: "Cold water",
    t_back: "Back",
    away: "Away",
    back: "Back home",
    heat_now: "Heat now",
    stop: "Stop",
    lower: "Lower the temperature",
    raise: "Raise the temperature",
    m_eco: "Eco",
    m_electric: "Electric",
    m_heat_pump: "Heat pump",
    m_performance: "Performance",
    m_high_demand: "High demand",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "No water heater found",
    ed_entity: "Water heater",
    ed_entity_helper: "A water_heater entity, the switch of a tank driven by a relay, or a power sensor for a PV-routed tank",
    ed_temperature: "Water temperature",
    ed_temperature_helper: "For a tank driven by a relay, or to read another probe",
    ed_capacity: "Tank capacity",
    ed_capacity_helper: "Litres, to estimate the hot water when the integration does not report it",
    ed_shower_volume: "Water per shower",
    ed_shower_volume_helper: "Litres at 40 °C, to count the showers",
    ed_tariff: "Tariff",
    ed_tariff_helper: "An off-peak / peak sensor, shown in a tile",
    ed_show_scene: "Illustration",
    ed_animations: "Animations",
    ed_show_controls: "Controls",
    ed_entities: "Entities (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Overrides of the found entities, by role: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Empty: the water heater's name",
    ed_illustration: "Illustrated header",
    ed_illustration_theme: "Header theme",
    ed_theme_auto: "Automatic (sun)",
    ed_theme_day: "Day",
    ed_theme_night: "Night",
  },
  fr: {
    title: "Chauffe-eau",
    st_heating: "En chauffe",
    st_ready: "Prêt",
    st_boost: "Boost",
    st_away: "Absence",
    st_off: "Arrêt",
    st_error: "Erreur",
    st_offline: "Hors ligne",
    shower_one: "{n} douche",
    shower_many: "{n} douches",
    litres: "{n} L à 40 °C",
    heating_to: "Chauffe jusqu'à {t}",
    target: "Consigne {t}",
    away_until: "Absent jusqu'au {d}",
    away_on: "Mode vacances",
    t_power: "Puissance",
    t_today: "Aujourd'hui",
    t_energy: "Énergie",
    t_mode: "Mode",
    t_tariff: "Tarif",
    t_water: "Eau",
    t_inlet: "Eau froide",
    t_back: "Retour",
    away: "Absence",
    back: "De retour",
    heat_now: "Chauffer",
    stop: "Arrêter",
    lower: "Baisser la température",
    raise: "Augmenter la température",
    m_eco: "Éco",
    m_electric: "Électrique",
    m_heat_pump: "Pompe à chaleur",
    m_performance: "Performance",
    m_high_demand: "Forte demande",
    m_gas: "Gaz",
    m_boost: "Boost",
    no_heater: "Aucun chauffe-eau trouvé",
    ed_entity: "Chauffe-eau",
    ed_entity_helper: "Une entité water_heater, l'interrupteur d'un ballon piloté par un relais, ou un capteur de puissance pour un ballon piloté par routeur solaire",
    ed_temperature: "Température de l'eau",
    ed_temperature_helper: "Pour un ballon piloté par un relais, ou pour lire une autre sonde",
    ed_capacity: "Capacité du ballon",
    ed_capacity_helper: "En litres, pour estimer l'eau chaude quand l'intégration ne la donne pas",
    ed_shower_volume: "Eau par douche",
    ed_shower_volume_helper: "En litres à 40 °C, pour compter les douches",
    ed_tariff: "Tarif",
    ed_tariff_helper: "Un capteur heures creuses / heures pleines, affiché dans une tuile",
    ed_show_scene: "Illustration",
    ed_animations: "Animations",
    ed_show_controls: "Commandes",
    ed_entities: "Entités (YAML)",
    solar_share: "{n} % solaire",
    ed_entities_helper: "Remplace les entités trouvées, par rôle : temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vide : le nom du chauffe-eau",
    ed_illustration: "En-tête illustré",
    ed_illustration_theme: "Thème de l’en-tête",
    ed_theme_auto: "Automatique (soleil)",
    ed_theme_day: "Jour",
    ed_theme_night: "Nuit",
  },
  de: {
    title: "Warmwasserspeicher",
    st_heating: "Heizt",
    st_ready: "Bereit",
    st_boost: "Boost",
    st_away: "Abwesend",
    st_off: "Aus",
    st_error: "Fehler",
    st_offline: "Offline",
    shower_one: "{n} Dusche",
    shower_many: "{n} Duschen",
    litres: "{n} L bei 40 °C",
    heating_to: "Heizt auf {t}",
    target: "Soll {t}",
    away_until: "Abwesend bis {d}",
    away_on: "Urlaubsmodus",
    t_power: "Leistung",
    t_today: "Heute",
    t_energy: "Energie",
    t_mode: "Modus",
    t_tariff: "Tarif",
    t_water: "Wasser",
    t_inlet: "Kaltwasser",
    t_back: "Zurück",
    away: "Abwesend",
    back: "Wieder da",
    heat_now: "Jetzt heizen",
    stop: "Stopp",
    lower: "Temperatur senken",
    raise: "Temperatur erhöhen",
    m_eco: "Eco",
    m_electric: "Elektrisch",
    m_heat_pump: "Wärmepumpe",
    m_performance: "Leistung",
    m_high_demand: "Hoher Bedarf",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "Kein Warmwasserspeicher gefunden",
    ed_entity: "Warmwasserspeicher",
    ed_entity_helper: "Eine water_heater-Entität, der Schalter eines über ein Relais gesteuerten Speichers oder ein Leistungssensor für einen per PV-Router gesteuerten Speicher",
    ed_temperature: "Wassertemperatur",
    ed_temperature_helper: "Für einen über ein Relais gesteuerten Speicher oder um einen anderen Fühler zu lesen",
    ed_capacity: "Speichergröße",
    ed_capacity_helper: "Liter, um das Warmwasser zu schätzen, wenn die Integration es nicht meldet",
    ed_shower_volume: "Wasser pro Dusche",
    ed_shower_volume_helper: "Liter bei 40 °C, um die Duschen zu zählen",
    ed_tariff: "Tarif",
    ed_tariff_helper: "Ein Niedertarif-/Hochtarif-Sensor, in einer Kachel angezeigt",
    ed_show_scene: "Illustration",
    ed_animations: "Animationen",
    ed_show_controls: "Steuerung",
    ed_entities: "Entitäten (YAML)",
    solar_share: "{n}% Solar",
    ed_entities_helper: "Ersetzt die gefundenen Entitäten, nach Rolle: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Leer: der Name des Warmwasserspeichers",
    ed_illustration: "Illustrierte Kopfzeile",
    ed_illustration_theme: "Thema der Kopfzeile",
    ed_theme_auto: "Automatisch (Sonne)",
    ed_theme_day: "Tag",
    ed_theme_night: "Nacht",
  },
  es: {
    title: "Calentador de agua",
    st_heating: "Calentando",
    st_ready: "Listo",
    st_boost: "Boost",
    st_away: "Ausente",
    st_off: "Apagado",
    st_error: "Error",
    st_offline: "Sin conexión",
    shower_one: "{n} ducha",
    shower_many: "{n} duchas",
    litres: "{n} L a 40 °C",
    heating_to: "Calentando a {t}",
    target: "Objetivo {t}",
    away_until: "Ausente hasta el {d}",
    away_on: "Modo vacaciones",
    t_power: "Potencia",
    t_today: "Hoy",
    t_energy: "Energía",
    t_mode: "Modo",
    t_tariff: "Tarifa",
    t_water: "Agua",
    t_inlet: "Agua fría",
    t_back: "Vuelta",
    away: "Ausente",
    back: "De vuelta",
    heat_now: "Calentar ahora",
    stop: "Detener",
    lower: "Bajar la temperatura",
    raise: "Subir la temperatura",
    m_eco: "Eco",
    m_electric: "Eléctrico",
    m_heat_pump: "Bomba de calor",
    m_performance: "Rendimiento",
    m_high_demand: "Alta demanda",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "No se encontró ningún calentador",
    ed_entity: "Calentador de agua",
    ed_entity_helper: "Una entidad water_heater, el interruptor de un depósito controlado por un relé, o un sensor de potencia para un depósito gestionado por un router solar",
    ed_temperature: "Temperatura del agua",
    ed_temperature_helper: "Para un depósito controlado por un relé, o para leer otra sonda",
    ed_capacity: "Capacidad del depósito",
    ed_capacity_helper: "Litros, para estimar el agua caliente cuando la integración no la indica",
    ed_shower_volume: "Agua por ducha",
    ed_shower_volume_helper: "Litros a 40 °C, para contar las duchas",
    ed_tariff: "Tarifa",
    ed_tariff_helper: "Un sensor de horas valle / punta, mostrado en un mosaico",
    ed_show_scene: "Ilustración",
    ed_animations: "Animaciones",
    ed_show_controls: "Controles",
    ed_entities: "Entidades (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Sustituye las entidades encontradas, por función: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vacío: el nombre del calentador",
    ed_illustration: "Encabezado ilustrado",
    ed_illustration_theme: "Tema del encabezado",
    ed_theme_auto: "Automático (sol)",
    ed_theme_day: "Día",
    ed_theme_night: "Noche",
  },
  sr: {
    title: "Бојлер",
    st_heating: "Греје",
    st_ready: "Спреман",
    st_boost: "Буст",
    st_away: "Одсутан",
    st_off: "Искључен",
    st_error: "Грешка",
    st_offline: "Ван мреже",
    shower_one: "{n} туширање",
    shower_few: "{n} туширања",
    shower_many: "{n} туширања",
    litres: "{n} L на 40 °C",
    heating_to: "Греје до {t}",
    target: "Циљ {t}",
    away_until: "Одсутан до {d}",
    away_on: "Режим одмора",
    t_power: "Снага",
    t_today: "Данас",
    t_energy: "Енергија",
    t_mode: "Режим",
    t_tariff: "Тарифа",
    t_water: "Вода",
    t_inlet: "Хладна вода",
    t_back: "Повратак",
    away: "Одсутан",
    back: "Вратио сам се",
    heat_now: "Загреј сада",
    stop: "Заустави",
    lower: "Смањи температуру",
    raise: "Повећај температуру",
    m_eco: "Еко",
    m_electric: "Електрично",
    m_heat_pump: "Топлотна пумпа",
    m_performance: "Перформансе",
    m_high_demand: "Велика потражња",
    m_gas: "Гас",
    m_boost: "Буст",
    no_heater: "Није пронађен бојлер",
    ed_entity: "Бојлер",
    ed_entity_helper: "Ентитет water_heater, прекидач бојлера којим управља релеј или сензор снаге за бојлер са соларним рутером",
    ed_temperature: "Температура воде",
    ed_temperature_helper: "За бојлер којим управља релеј или за читање друге сонде",
    ed_capacity: "Запремина бојлера",
    ed_capacity_helper: "Литри, за процену топле воде када је интеграција не даје",
    ed_shower_volume: "Вода по туширању",
    ed_shower_volume_helper: "Литри на 40 °C, за бројање туширања",
    ed_tariff: "Тарифа",
    ed_tariff_helper: "Сензор ниже / више тарифе, приказан у плочици",
    ed_show_scene: "Илустрација",
    ed_animations: "Анимације",
    ed_show_controls: "Команде",
    ed_entities: "Ентитети (YAML)",
    solar_share: "{n}% соларно",
    ed_entities_helper: "Замењује пронађене ентитете, по улози: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Празно: назив бојлера",
    ed_illustration: "Илустровано заглавље",
    ed_illustration_theme: "Тема заглавља",
    ed_theme_auto: "Аутоматски (сунце)",
    ed_theme_day: "Дан",
    ed_theme_night: "Ноћ",
  },
  "sr-Latn": {
    title: "Bojler",
    st_heating: "Greje",
    st_ready: "Spreman",
    st_boost: "Bust",
    st_away: "Odsutan",
    st_off: "Isključen",
    st_error: "Greška",
    st_offline: "Van mreže",
    shower_one: "{n} tuširanje",
    shower_few: "{n} tuširanja",
    shower_many: "{n} tuširanja",
    litres: "{n} L na 40 °C",
    heating_to: "Greje do {t}",
    target: "Cilj {t}",
    away_until: "Odsutan do {d}",
    away_on: "Režim odmora",
    t_power: "Snaga",
    t_today: "Danas",
    t_energy: "Energija",
    t_mode: "Režim",
    t_tariff: "Tarifa",
    t_water: "Voda",
    t_inlet: "Hladna voda",
    t_back: "Povratak",
    away: "Odsutan",
    back: "Vratio sam se",
    heat_now: "Zagrej sada",
    stop: "Zaustavi",
    lower: "Smanji temperaturu",
    raise: "Povećaj temperaturu",
    m_eco: "Eko",
    m_electric: "Električno",
    m_heat_pump: "Toplotna pumpa",
    m_performance: "Performanse",
    m_high_demand: "Velika potražnja",
    m_gas: "Gas",
    m_boost: "Bust",
    no_heater: "Nije pronađen bojler",
    ed_entity: "Bojler",
    ed_entity_helper: "Entitet water_heater, prekidač bojlera kojim upravlja relej ili senzor snage za bojler sa solarnim ruterom",
    ed_temperature: "Temperatura vode",
    ed_temperature_helper: "Za bojler kojim upravlja relej ili za čitanje druge sonde",
    ed_capacity: "Zapremina bojlera",
    ed_capacity_helper: "Litri, za procenu tople vode kada je integracija ne daje",
    ed_shower_volume: "Voda po tuširanju",
    ed_shower_volume_helper: "Litri na 40 °C, za brojanje tuširanja",
    ed_tariff: "Tarifa",
    ed_tariff_helper: "Senzor niže / više tarife, prikazan u pločici",
    ed_show_scene: "Ilustracija",
    ed_animations: "Animacije",
    ed_show_controls: "Komande",
    ed_entities: "Entiteti (YAML)",
    solar_share: "{n}% solarno",
    ed_entities_helper: "Zamenjuje pronađene entitete, po ulozi: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prazno: naziv bojlera",
    ed_illustration: "Ilustrovano zaglavlje",
    ed_illustration_theme: "Tema zaglavlja",
    ed_theme_auto: "Automatski (sunce)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noć",
  },
  it: {
    title: "Scaldabagno",
    st_heating: "In riscaldamento",
    st_ready: "Pronto",
    st_boost: "Boost",
    st_away: "Assente",
    st_off: "Spento",
    st_error: "Errore",
    st_offline: "Offline",
    shower_one: "{n} doccia",
    shower_many: "{n} docce",
    litres: "{n} L a 40 °C",
    heating_to: "Riscalda a {t}",
    target: "Obiettivo {t}",
    away_until: "Assente fino al {d}",
    away_on: "Modalità vacanza",
    t_power: "Potenza",
    t_today: "Oggi",
    t_energy: "Energia",
    t_mode: "Modalità",
    t_tariff: "Tariffa",
    t_water: "Acqua",
    t_inlet: "Acqua fredda",
    t_back: "Rientro",
    away: "Assente",
    back: "Di ritorno",
    heat_now: "Riscalda ora",
    stop: "Ferma",
    lower: "Abbassa la temperatura",
    raise: "Alza la temperatura",
    m_eco: "Eco",
    m_electric: "Elettrico",
    m_heat_pump: "Pompa di calore",
    m_performance: "Prestazioni",
    m_high_demand: "Alta richiesta",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "Nessuno scaldabagno trovato",
    ed_entity: "Scaldabagno",
    ed_entity_helper: "Un'entità water_heater, l'interruttore di un serbatoio comandato da un relè, o un sensore di potenza per un serbatoio gestito da un router solare",
    ed_temperature: "Temperatura dell'acqua",
    ed_temperature_helper: "Per un serbatoio comandato da un relè, o per leggere un'altra sonda",
    ed_capacity: "Capacità del serbatoio",
    ed_capacity_helper: "Litri, per stimare l'acqua calda quando l'integrazione non la fornisce",
    ed_shower_volume: "Acqua per doccia",
    ed_shower_volume_helper: "Litri a 40 °C, per contare le docce",
    ed_tariff: "Tariffa",
    ed_tariff_helper: "Un sensore fascia bassa / alta, mostrato in un riquadro",
    ed_show_scene: "Illustrazione",
    ed_animations: "Animazioni",
    ed_show_controls: "Comandi",
    ed_entities: "Entità (YAML)",
    solar_share: "{n}% solare",
    ed_entities_helper: "Sostituisce le entità trovate, per ruolo: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vuoto: il nome dello scaldabagno",
    ed_illustration: "Intestazione illustrata",
    ed_illustration_theme: "Tema dell’intestazione",
    ed_theme_auto: "Automatico (sole)",
    ed_theme_day: "Giorno",
    ed_theme_night: "Notte",
  },
  nl: {
    title: "Boiler",
    st_heating: "Verwarmt",
    st_ready: "Klaar",
    st_boost: "Boost",
    st_away: "Afwezig",
    st_off: "Uit",
    st_error: "Fout",
    st_offline: "Offline",
    shower_one: "{n} douchebeurt",
    shower_many: "{n} douchebeurten",
    litres: "{n} L bij 40 °C",
    heating_to: "Verwarmt tot {t}",
    target: "Doel {t}",
    away_until: "Afwezig tot {d}",
    away_on: "Vakantiemodus",
    t_power: "Vermogen",
    t_today: "Vandaag",
    t_energy: "Energie",
    t_mode: "Modus",
    t_tariff: "Tarief",
    t_water: "Water",
    t_inlet: "Koud water",
    t_back: "Terug",
    away: "Afwezig",
    back: "Weer thuis",
    heat_now: "Nu verwarmen",
    stop: "Stoppen",
    lower: "Temperatuur verlagen",
    raise: "Temperatuur verhogen",
    m_eco: "Eco",
    m_electric: "Elektrisch",
    m_heat_pump: "Warmtepomp",
    m_performance: "Prestatie",
    m_high_demand: "Hoge vraag",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "Geen boiler gevonden",
    ed_entity: "Boiler",
    ed_entity_helper: "Een water_heater-entiteit, de schakelaar van een boiler die via een relais wordt aangestuurd, of een vermogenssensor voor een boiler met zonne-router",
    ed_temperature: "Watertemperatuur",
    ed_temperature_helper: "Voor een boiler via een relais, of om een andere sensor te lezen",
    ed_capacity: "Inhoud van de boiler",
    ed_capacity_helper: "Liter, om het warme water te schatten als de integratie het niet meldt",
    ed_shower_volume: "Water per douchebeurt",
    ed_shower_volume_helper: "Liter bij 40 °C, om de douchebeurten te tellen",
    ed_tariff: "Tarief",
    ed_tariff_helper: "Een dal- / piektariefsensor, getoond in een tegel",
    ed_show_scene: "Illustratie",
    ed_animations: "Animaties",
    ed_show_controls: "Bediening",
    ed_entities: "Entiteiten (YAML)",
    solar_share: "{n}% zon",
    ed_entities_helper: "Vervangt de gevonden entiteiten, per rol: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Leeg: de naam van de boiler",
    ed_illustration: "Geïllustreerde koptekst",
    ed_illustration_theme: "Thema van de koptekst",
    ed_theme_auto: "Automatisch (zon)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nacht",
  },
  pt: {
    title: "Termoacumulador",
    st_heating: "A aquecer",
    st_ready: "Pronto",
    st_boost: "Boost",
    st_away: "Ausente",
    st_off: "Desligado",
    st_error: "Erro",
    st_offline: "Offline",
    shower_one: "{n} duche",
    shower_many: "{n} duches",
    litres: "{n} L a 40 °C",
    heating_to: "A aquecer até {t}",
    target: "Objetivo {t}",
    away_until: "Ausente até {d}",
    away_on: "Modo férias",
    t_power: "Potência",
    t_today: "Hoje",
    t_energy: "Energia",
    t_mode: "Modo",
    t_tariff: "Tarifa",
    t_water: "Água",
    t_inlet: "Água fria",
    t_back: "Regresso",
    away: "Ausente",
    back: "De volta",
    heat_now: "Aquecer agora",
    stop: "Parar",
    lower: "Baixar a temperatura",
    raise: "Subir a temperatura",
    m_eco: "Eco",
    m_electric: "Elétrico",
    m_heat_pump: "Bomba de calor",
    m_performance: "Desempenho",
    m_high_demand: "Alta procura",
    m_gas: "Gás",
    m_boost: "Boost",
    no_heater: "Nenhum termoacumulador encontrado",
    ed_entity: "Termoacumulador",
    ed_entity_helper: "Uma entidade water_heater, o interruptor de um depósito comandado por um relé, ou um sensor de potência para um depósito gerido por um router solar",
    ed_temperature: "Temperatura da água",
    ed_temperature_helper: "Para um depósito comandado por um relé, ou para ler outra sonda",
    ed_capacity: "Capacidade do depósito",
    ed_capacity_helper: "Litros, para estimar a água quente quando a integração não a indica",
    ed_shower_volume: "Água por duche",
    ed_shower_volume_helper: "Litros a 40 °C, para contar os duches",
    ed_tariff: "Tarifa",
    ed_tariff_helper: "Um sensor de vazio / cheias, mostrado num mosaico",
    ed_show_scene: "Ilustração",
    ed_animations: "Animações",
    ed_show_controls: "Controlos",
    ed_entities: "Entidades (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Substitui as entidades encontradas, por função: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vazio: o nome do termoacumulador",
    ed_illustration: "Cabeçalho ilustrado",
    ed_illustration_theme: "Tema do cabeçalho",
    ed_theme_auto: "Automático (sol)",
    ed_theme_day: "Dia",
    ed_theme_night: "Noite",
  },
  pl: {
    title: "Podgrzewacz wody",
    st_heating: "Grzeje",
    st_ready: "Gotowy",
    st_boost: "Boost",
    st_away: "Nieobecność",
    st_off: "Wyłączony",
    st_error: "Błąd",
    st_offline: "Offline",
    shower_one: "{n} prysznic",
    shower_few: "{n} prysznice",
    shower_many: "{n} pryszniców",
    litres: "{n} L przy 40 °C",
    heating_to: "Grzeje do {t}",
    target: "Cel {t}",
    away_until: "Nieobecność do {d}",
    away_on: "Tryb urlopowy",
    t_power: "Moc",
    t_today: "Dziś",
    t_energy: "Energia",
    t_mode: "Tryb",
    t_tariff: "Taryfa",
    t_water: "Woda",
    t_inlet: "Zimna woda",
    t_back: "Powrót",
    away: "Nieobecność",
    back: "Wróciłem",
    heat_now: "Grzej teraz",
    stop: "Zatrzymaj",
    lower: "Obniż temperaturę",
    raise: "Podnieś temperaturę",
    m_eco: "Eko",
    m_electric: "Elektryczny",
    m_heat_pump: "Pompa ciepła",
    m_performance: "Wydajność",
    m_high_demand: "Duże zapotrzebowanie",
    m_gas: "Gaz",
    m_boost: "Boost",
    no_heater: "Nie znaleziono podgrzewacza",
    ed_entity: "Podgrzewacz wody",
    ed_entity_helper: "Encja water_heater, przełącznik zbiornika sterowanego przekaźnikiem lub czujnik mocy dla zbiornika sterowanego routerem solarnym",
    ed_temperature: "Temperatura wody",
    ed_temperature_helper: "Dla zbiornika sterowanego przekaźnikiem lub do odczytu innej sondy",
    ed_capacity: "Pojemność zbiornika",
    ed_capacity_helper: "Litry, do oszacowania ciepłej wody, gdy integracja jej nie podaje",
    ed_shower_volume: "Woda na prysznic",
    ed_shower_volume_helper: "Litry przy 40 °C, do liczenia pryszniców",
    ed_tariff: "Taryfa",
    ed_tariff_helper: "Czujnik taryfy nocnej / dziennej, pokazany na kafelku",
    ed_show_scene: "Ilustracja",
    ed_animations: "Animacje",
    ed_show_controls: "Sterowanie",
    ed_entities: "Encje (YAML)",
    solar_share: "{n}% słoneczna",
    ed_entities_helper: "Zastępuje znalezione encje, według roli: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Puste: nazwa podgrzewacza",
    ed_illustration: "Ilustrowany nagłówek",
    ed_illustration_theme: "Motyw nagłówka",
    ed_theme_auto: "Automatycznie (słońce)",
    ed_theme_day: "Dzień",
    ed_theme_night: "Noc",
  },
  ro: {
    title: "Boiler",
    st_heating: "Încălzește",
    st_ready: "Gata",
    st_boost: "Boost",
    st_away: "Absent",
    st_off: "Oprit",
    st_error: "Eroare",
    st_offline: "Offline",
    shower_one: "{n} duș",
    shower_few: "{n} dușuri",
    shower_many: "{n} de dușuri",
    litres: "{n} L la 40 °C",
    heating_to: "Încălzește la {t}",
    target: "Țintă {t}",
    away_until: "Absent până la {d}",
    away_on: "Mod vacanță",
    t_power: "Putere",
    t_today: "Azi",
    t_energy: "Energie",
    t_mode: "Mod",
    t_tariff: "Tarif",
    t_water: "Apă",
    t_inlet: "Apă rece",
    t_back: "Întoarcere",
    away: "Absent",
    back: "M-am întors",
    heat_now: "Încălzește acum",
    stop: "Oprește",
    lower: "Scade temperatura",
    raise: "Crește temperatura",
    m_eco: "Eco",
    m_electric: "Electric",
    m_heat_pump: "Pompă de căldură",
    m_performance: "Performanță",
    m_high_demand: "Cerere mare",
    m_gas: "Gaz",
    m_boost: "Boost",
    no_heater: "Niciun boiler găsit",
    ed_entity: "Boiler",
    ed_entity_helper: "O entitate water_heater, comutatorul unui rezervor comandat de un releu sau un senzor de putere pentru un rezervor gestionat de un router solar",
    ed_temperature: "Temperatura apei",
    ed_temperature_helper: "Pentru un rezervor comandat de un releu sau pentru a citi altă sondă",
    ed_capacity: "Capacitatea rezervorului",
    ed_capacity_helper: "Litri, pentru a estima apa caldă când integrarea nu o indică",
    ed_shower_volume: "Apă per duș",
    ed_shower_volume_helper: "Litri la 40 °C, pentru a număra dușurile",
    ed_tariff: "Tarif",
    ed_tariff_helper: "Un senzor de tarif redus / normal, afișat într-o dală",
    ed_show_scene: "Ilustrație",
    ed_animations: "Animații",
    ed_show_controls: "Comenzi",
    ed_entities: "Entități (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Înlocuiește entitățile găsite, după rol: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Gol: numele boilerului",
    ed_illustration: "Antet ilustrat",
    ed_illustration_theme: "Tema antetului",
    ed_theme_auto: "Automat (soare)",
    ed_theme_day: "Zi",
    ed_theme_night: "Noapte",
  },
  da: {
    title: "Varmtvandsbeholder",
    st_heating: "Varmer",
    st_ready: "Klar",
    st_boost: "Boost",
    st_away: "Fraværende",
    st_off: "Slukket",
    st_error: "Fejl",
    st_offline: "Offline",
    shower_one: "{n} brusebad",
    shower_many: "{n} brusebade",
    litres: "{n} L ved 40 °C",
    heating_to: "Varmer til {t}",
    target: "Mål {t}",
    away_until: "Fraværende til {d}",
    away_on: "Feriemodus",
    t_power: "Effekt",
    t_today: "I dag",
    t_energy: "Energi",
    t_mode: "Tilstand",
    t_tariff: "Tarif",
    t_water: "Vand",
    t_inlet: "Koldt vand",
    t_back: "Hjem",
    away: "Fraværende",
    back: "Hjemme igen",
    heat_now: "Varm nu",
    stop: "Stop",
    lower: "Sænk temperaturen",
    raise: "Hæv temperaturen",
    m_eco: "Eco",
    m_electric: "Elektrisk",
    m_heat_pump: "Varmepumpe",
    m_performance: "Ydelse",
    m_high_demand: "Højt behov",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "Ingen varmtvandsbeholder fundet",
    ed_entity: "Varmtvandsbeholder",
    ed_entity_helper: "En water_heater-enhed, kontakten til en beholder styret af et relæ, eller en effektsensor til en beholder styret af en solcelle-router",
    ed_temperature: "Vandtemperatur",
    ed_temperature_helper: "Til en beholder styret af et relæ eller for at læse en anden føler",
    ed_capacity: "Beholderens størrelse",
    ed_capacity_helper: "Liter, til at anslå det varme vand, når integrationen ikke oplyser det",
    ed_shower_volume: "Vand pr. brusebad",
    ed_shower_volume_helper: "Liter ved 40 °C, til at tælle brusebadene",
    ed_tariff: "Tarif",
    ed_tariff_helper: "En lav- / højlastsensor, vist i en flise",
    ed_show_scene: "Illustration",
    ed_animations: "Animationer",
    ed_show_controls: "Betjening",
    ed_entities: "Enheder (YAML)",
    solar_share: "{n}% sol",
    ed_entities_helper: "Erstatter de fundne enheder, efter rolle: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Tom: varmtvandsbeholderens navn",
    ed_illustration: "Illustreret overskrift",
    ed_illustration_theme: "Overskriftens tema",
    ed_theme_auto: "Automatisk (sol)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nat",
  },
  sv: {
    title: "Varmvattenberedare",
    st_heating: "Värmer",
    st_ready: "Klar",
    st_boost: "Boost",
    st_away: "Borta",
    st_off: "Av",
    st_error: "Fel",
    st_offline: "Offline",
    shower_one: "{n} dusch",
    shower_many: "{n} duschar",
    litres: "{n} L vid 40 °C",
    heating_to: "Värmer till {t}",
    target: "Mål {t}",
    away_until: "Borta till {d}",
    away_on: "Semesterläge",
    t_power: "Effekt",
    t_today: "I dag",
    t_energy: "Energi",
    t_mode: "Läge",
    t_tariff: "Tariff",
    t_water: "Vatten",
    t_inlet: "Kallvatten",
    t_back: "Åter",
    away: "Borta",
    back: "Hemma igen",
    heat_now: "Värm nu",
    stop: "Stoppa",
    lower: "Sänk temperaturen",
    raise: "Höj temperaturen",
    m_eco: "Eco",
    m_electric: "Elektrisk",
    m_heat_pump: "Värmepump",
    m_performance: "Prestanda",
    m_high_demand: "Högt behov",
    m_gas: "Gas",
    m_boost: "Boost",
    no_heater: "Ingen varmvattenberedare hittades",
    ed_entity: "Varmvattenberedare",
    ed_entity_helper: "En water_heater-entitet, brytaren till en beredare som styrs av ett relä, eller en effektsensor för en beredare som styrs av en sol-router",
    ed_temperature: "Vattentemperatur",
    ed_temperature_helper: "För en beredare som styrs av ett relä eller för att läsa en annan givare",
    ed_capacity: "Beredarens volym",
    ed_capacity_helper: "Liter, för att uppskatta varmvattnet när integrationen inte anger det",
    ed_shower_volume: "Vatten per dusch",
    ed_shower_volume_helper: "Liter vid 40 °C, för att räkna duscharna",
    ed_tariff: "Tariff",
    ed_tariff_helper: "En låg- / högtaxasensor, visad i en ruta",
    ed_show_scene: "Illustration",
    ed_animations: "Animationer",
    ed_show_controls: "Reglage",
    ed_entities: "Entiteter (YAML)",
    solar_share: "{n}% sol",
    ed_entities_helper: "Ersätter de hittade entiteterna, per roll: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Tomt: beredarens namn",
    ed_illustration: "Illustrerad rubrik",
    ed_illustration_theme: "Rubrikens tema",
    ed_theme_auto: "Automatiskt (sol)",
    ed_theme_day: "Dag",
    ed_theme_night: "Natt",
  },
  bg: {
    title: "Бойлер",
    st_heating: "Загрява",
    st_ready: "Готов",
    st_boost: "Бууст",
    st_away: "Отсъствие",
    st_off: "Изключен",
    st_error: "Грешка",
    st_offline: "Офлайн",
    shower_one: "{n} душ",
    shower_many: "{n} душа",
    litres: "{n} L при 40 °C",
    heating_to: "Загрява до {t}",
    target: "Цел {t}",
    away_until: "Отсъствие до {d}",
    away_on: "Режим ваканция",
    t_power: "Мощност",
    t_today: "Днес",
    t_energy: "Енергия",
    t_mode: "Режим",
    t_tariff: "Тарифа",
    t_water: "Вода",
    t_inlet: "Студена вода",
    t_back: "Връщане",
    away: "Отсъствие",
    back: "Обратно у дома",
    heat_now: "Загрей сега",
    stop: "Спри",
    lower: "Намали температурата",
    raise: "Увеличи температурата",
    m_eco: "Еко",
    m_electric: "Електрически",
    m_heat_pump: "Термопомпа",
    m_performance: "Производителност",
    m_high_demand: "Голямо търсене",
    m_gas: "Газ",
    m_boost: "Бууст",
    no_heater: "Не е намерен бойлер",
    ed_entity: "Бойлер",
    ed_entity_helper: "Обект water_heater, превключвателят на бойлер, управляван от реле, или сензор за мощност за бойлер, управляван от соларен рутер",
    ed_temperature: "Температура на водата",
    ed_temperature_helper: "За бойлер, управляван от реле, или за четене на друга сонда",
    ed_capacity: "Обем на бойлера",
    ed_capacity_helper: "Литри, за оценка на топлата вода, когато интеграцията не я дава",
    ed_shower_volume: "Вода за душ",
    ed_shower_volume_helper: "Литри при 40 °C, за броене на душовете",
    ed_tariff: "Тарифа",
    ed_tariff_helper: "Сензор за нощна / дневна тарифа, показан в плочка",
    ed_show_scene: "Илюстрация",
    ed_animations: "Анимации",
    ed_show_controls: "Управление",
    ed_entities: "Обекти (YAML)",
    solar_share: "{n}% слънчево",
    ed_entities_helper: "Заменя намерените обекти, по роля: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Празно: името на бойлера",
    ed_illustration: "Илюстрирано заглавие",
    ed_illustration_theme: "Тема на заглавието",
    ed_theme_auto: "Автоматично (слънце)",
    ed_theme_day: "Ден",
    ed_theme_night: "Нощ",
  },
  ru: {
    title: "Водонагреватель",
    st_heating: "Нагрев",
    st_ready: "Готов",
    st_boost: "Буст",
    st_away: "Отъезд",
    st_off: "Выключен",
    st_error: "Ошибка",
    st_offline: "Не в сети",
    shower_one: "{n} душ",
    shower_few: "{n} душа",
    shower_many: "{n} душей",
    litres: "{n} л при 40 °C",
    heating_to: "Нагрев до {t}",
    target: "Цель {t}",
    away_until: "Отъезд до {d}",
    away_on: "Режим отпуска",
    t_power: "Мощность",
    t_today: "Сегодня",
    t_energy: "Энергия",
    t_mode: "Режим",
    t_tariff: "Тариф",
    t_water: "Вода",
    t_inlet: "Холодная вода",
    t_back: "Возвращение",
    away: "Отъезд",
    back: "Я дома",
    heat_now: "Нагреть сейчас",
    stop: "Остановить",
    lower: "Понизить температуру",
    raise: "Повысить температуру",
    m_eco: "Эко",
    m_electric: "Электрический",
    m_heat_pump: "Тепловой насос",
    m_performance: "Производительность",
    m_high_demand: "Высокий спрос",
    m_gas: "Газ",
    m_boost: "Буст",
    no_heater: "Водонагреватель не найден",
    ed_entity: "Водонагреватель",
    ed_entity_helper: "Объект water_heater, выключатель бака, управляемого реле, или датчик мощности для бака с солнечным маршрутизатором",
    ed_temperature: "Температура воды",
    ed_temperature_helper: "Для бака, управляемого реле, или чтобы читать другой датчик",
    ed_capacity: "Объём бака",
    ed_capacity_helper: "Литры, чтобы оценить горячую воду, когда интеграция её не сообщает",
    ed_shower_volume: "Вода на душ",
    ed_shower_volume_helper: "Литры при 40 °C, чтобы считать души",
    ed_tariff: "Тариф",
    ed_tariff_helper: "Датчик ночного / дневного тарифа, показанный в плитке",
    ed_show_scene: "Иллюстрация",
    ed_animations: "Анимации",
    ed_show_controls: "Управление",
    ed_entities: "Объекты (YAML)",
    solar_share: "{n}% солнце",
    ed_entities_helper: "Заменяет найденные объекты, по роли: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Пусто: имя водонагревателя",
    ed_illustration: "Иллюстрированный заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматически (солнце)",
    ed_theme_day: "День",
    ed_theme_night: "Ночь",
  },
  uk: {
    title: "Водонагрівач",
    st_heating: "Нагрів",
    st_ready: "Готовий",
    st_boost: "Буст",
    st_away: "Від'їзд",
    st_off: "Вимкнено",
    st_error: "Помилка",
    st_offline: "Не в мережі",
    shower_one: "{n} душ",
    shower_few: "{n} душі",
    shower_many: "{n} душів",
    litres: "{n} л при 40 °C",
    heating_to: "Нагрів до {t}",
    target: "Ціль {t}",
    away_until: "Від'їзд до {d}",
    away_on: "Режим відпустки",
    t_power: "Потужність",
    t_today: "Сьогодні",
    t_energy: "Енергія",
    t_mode: "Режим",
    t_tariff: "Тариф",
    t_water: "Вода",
    t_inlet: "Холодна вода",
    t_back: "Повернення",
    away: "Від'їзд",
    back: "Я вдома",
    heat_now: "Нагріти зараз",
    stop: "Зупинити",
    lower: "Знизити температуру",
    raise: "Підвищити температуру",
    m_eco: "Еко",
    m_electric: "Електричний",
    m_heat_pump: "Тепловий насос",
    m_performance: "Продуктивність",
    m_high_demand: "Великий попит",
    m_gas: "Газ",
    m_boost: "Буст",
    no_heater: "Водонагрівач не знайдено",
    ed_entity: "Водонагрівач",
    ed_entity_helper: "Об'єкт water_heater, вимикач бака, керованого реле, або датчик потужності для бака із сонячним маршрутизатором",
    ed_temperature: "Температура води",
    ed_temperature_helper: "Для бака, керованого реле, або щоб читати інший датчик",
    ed_capacity: "Об'єм бака",
    ed_capacity_helper: "Літри, щоб оцінити гарячу воду, коли інтеграція її не повідомляє",
    ed_shower_volume: "Вода на душ",
    ed_shower_volume_helper: "Літри при 40 °C, щоб рахувати душі",
    ed_tariff: "Тариф",
    ed_tariff_helper: "Датчик нічного / денного тарифу, показаний у плитці",
    ed_show_scene: "Ілюстрація",
    ed_animations: "Анімації",
    ed_show_controls: "Керування",
    ed_entities: "Об'єкти (YAML)",
    solar_share: "{n}% сонячна",
    ed_entities_helper: "Замінює знайдені об'єкти, за роллю: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Порожньо: назва водонагрівача",
    ed_illustration: "Ілюстрований заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматично (сонце)",
    ed_theme_day: "День",
    ed_theme_night: "Ніч",
  },
  hu: {
    title: "Vízmelegítő",
    st_heating: "Fűt",
    st_ready: "Kész",
    st_boost: "Boost",
    st_away: "Távol",
    st_off: "Ki",
    st_error: "Hiba",
    st_offline: "Offline",
    shower_one: "{n} zuhanyzás",
    shower_many: "{n} zuhanyzás",
    litres: "{n} L 40 °C-on",
    heating_to: "Fűt {t}-ig",
    target: "Cél {t}",
    away_until: "Távol eddig: {d}",
    away_on: "Szabadság mód",
    t_power: "Teljesítmény",
    t_today: "Ma",
    t_energy: "Energia",
    t_mode: "Mód",
    t_tariff: "Tarifa",
    t_water: "Víz",
    t_inlet: "Hideg víz",
    t_back: "Visszatérés",
    away: "Távol",
    back: "Újra itthon",
    heat_now: "Fűtés most",
    stop: "Leállítás",
    lower: "Hőmérséklet csökkentése",
    raise: "Hőmérséklet növelése",
    m_eco: "Eco",
    m_electric: "Elektromos",
    m_heat_pump: "Hőszivattyú",
    m_performance: "Teljesítmény",
    m_high_demand: "Nagy igény",
    m_gas: "Gáz",
    m_boost: "Boost",
    no_heater: "Nem található vízmelegítő",
    ed_entity: "Vízmelegítő",
    ed_entity_helper: "Egy water_heater entitás, egy relével vezérelt tartály kapcsolója, vagy egy teljesítményérzékelő napelemes router által vezérelt tartályhoz",
    ed_temperature: "Vízhőmérséklet",
    ed_temperature_helper: "Relével vezérelt tartályhoz, vagy egy másik szonda olvasásához",
    ed_capacity: "Tartály űrtartalma",
    ed_capacity_helper: "Liter, a melegvíz becsléséhez, ha az integráció nem adja meg",
    ed_shower_volume: "Víz zuhanyzásonként",
    ed_shower_volume_helper: "Liter 40 °C-on, a zuhanyzások számolásához",
    ed_tariff: "Tarifa",
    ed_tariff_helper: "Egy völgy- / csúcsidőszak-érzékelő, csempén megjelenítve",
    ed_show_scene: "Illusztráció",
    ed_animations: "Animációk",
    ed_show_controls: "Vezérlők",
    ed_entities: "Entitások (YAML)",
    solar_share: "{n}% nap",
    ed_entities_helper: "Felülírja a talált entitásokat, szerepkör szerint: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Üres: a vízmelegítő neve",
    ed_illustration: "Illusztrált fejléc",
    ed_illustration_theme: "A fejléc témája",
    ed_theme_auto: "Automatikus (nap)",
    ed_theme_day: "Nappal",
    ed_theme_night: "Éjszaka",
  },
  sk: {
    title: "Ohrievač vody",
    st_heating: "Ohrieva",
    st_ready: "Pripravený",
    st_boost: "Boost",
    st_away: "Neprítomnosť",
    st_off: "Vypnutý",
    st_error: "Chyba",
    st_offline: "Offline",
    shower_one: "{n} sprcha",
    shower_few: "{n} sprchy",
    shower_many: "{n} spŕch",
    litres: "{n} L pri 40 °C",
    heating_to: "Ohrieva na {t}",
    target: "Cieľ {t}",
    away_until: "Neprítomnosť do {d}",
    away_on: "Dovolenkový režim",
    t_power: "Výkon",
    t_today: "Dnes",
    t_energy: "Energia",
    t_mode: "Režim",
    t_tariff: "Tarifa",
    t_water: "Voda",
    t_inlet: "Studená voda",
    t_back: "Návrat",
    away: "Neprítomnosť",
    back: "Späť doma",
    heat_now: "Ohriať teraz",
    stop: "Zastaviť",
    lower: "Znížiť teplotu",
    raise: "Zvýšiť teplotu",
    m_eco: "Eko",
    m_electric: "Elektrický",
    m_heat_pump: "Tepelné čerpadlo",
    m_performance: "Výkon",
    m_high_demand: "Vysoký dopyt",
    m_gas: "Plyn",
    m_boost: "Boost",
    no_heater: "Nenašiel sa žiadny ohrievač",
    ed_entity: "Ohrievač vody",
    ed_entity_helper: "Entita water_heater, spínač zásobníka ovládaného relé, alebo senzor výkonu pre zásobník riadený solárnym routerom",
    ed_temperature: "Teplota vody",
    ed_temperature_helper: "Pre zásobník ovládaný relé alebo na čítanie inej sondy",
    ed_capacity: "Objem zásobníka",
    ed_capacity_helper: "Litre, na odhad teplej vody, keď ju integrácia neuvádza",
    ed_shower_volume: "Voda na sprchu",
    ed_shower_volume_helper: "Litre pri 40 °C, na počítanie spŕch",
    ed_tariff: "Tarifa",
    ed_tariff_helper: "Snímač nízkej / vysokej tarify, zobrazený na dlaždici",
    ed_show_scene: "Ilustrácia",
    ed_animations: "Animácie",
    ed_show_controls: "Ovládanie",
    ed_entities: "Entity (YAML)",
    solar_share: "{n}% solár",
    ed_entities_helper: "Nahrádza nájdené entity, podľa role: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prázdne: názov ohrievača",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Téma hlavičky",
    ed_theme_auto: "Automaticky (slnko)",
    ed_theme_day: "Deň",
    ed_theme_night: "Noc",
  },
  cs: {
    title: "Ohřívač vody",
    st_heating: "Ohřívá",
    st_ready: "Připraven",
    st_boost: "Boost",
    st_away: "Nepřítomnost",
    st_off: "Vypnuto",
    st_error: "Chyba",
    st_offline: "Offline",
    shower_one: "{n} sprcha",
    shower_few: "{n} sprchy",
    shower_many: "{n} sprch",
    litres: "{n} L při 40 °C",
    heating_to: "Ohřívá na {t}",
    target: "Cíl {t}",
    away_until: "Nepřítomnost do {d}",
    away_on: "Dovolenkový režim",
    t_power: "Výkon",
    t_today: "Dnes",
    t_energy: "Energie",
    t_mode: "Režim",
    t_tariff: "Tarif",
    t_water: "Voda",
    t_inlet: "Studená voda",
    t_back: "Návrat",
    away: "Nepřítomnost",
    back: "Zpět doma",
    heat_now: "Ohřát teď",
    stop: "Zastavit",
    lower: "Snížit teplotu",
    raise: "Zvýšit teplotu",
    m_eco: "Eko",
    m_electric: "Elektrický",
    m_heat_pump: "Tepelné čerpadlo",
    m_performance: "Výkon",
    m_high_demand: "Vysoká poptávka",
    m_gas: "Plyn",
    m_boost: "Boost",
    no_heater: "Nenalezen žádný ohřívač",
    ed_entity: "Ohřívač vody",
    ed_entity_helper: "Entita water_heater, spínač zásobníku ovládaného relé, nebo senzor výkonu pro zásobník řízený solárním routerem",
    ed_temperature: "Teplota vody",
    ed_temperature_helper: "Pro zásobník ovládaný relé nebo ke čtení jiné sondy",
    ed_capacity: "Objem zásobníku",
    ed_capacity_helper: "Litry, k odhadu teplé vody, když ji integrace neuvádí",
    ed_shower_volume: "Voda na sprchu",
    ed_shower_volume_helper: "Litry při 40 °C, k počítání sprch",
    ed_tariff: "Tarif",
    ed_tariff_helper: "Snímač nízkého / vysokého tarifu, zobrazený na dlaždici",
    ed_show_scene: "Ilustrace",
    ed_animations: "Animace",
    ed_show_controls: "Ovládání",
    ed_entities: "Entity (YAML)",
    solar_share: "{n}% solár",
    ed_entities_helper: "Nahrazuje nalezené entity, podle role: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prázdné: název ohřívače",
    ed_illustration: "Ilustrované záhlaví",
    ed_illustration_theme: "Motiv záhlaví",
    ed_theme_auto: "Automaticky (slunce)",
    ed_theme_day: "Den",
    ed_theme_night: "Noc",
  },
  sl: {
    title: "Grelnik vode",
    st_heating: "Greje",
    st_ready: "Pripravljen",
    st_boost: "Boost",
    st_away: "Odsotnost",
    st_off: "Izklopljen",
    st_error: "Napaka",
    st_offline: "Brez povezave",
    shower_one: "{n} prha",
    shower_few: "{n} prhe",
    shower_many: "{n} prh",
    litres: "{n} L pri 40 °C",
    heating_to: "Greje do {t}",
    target: "Cilj {t}",
    away_until: "Odsotnost do {d}",
    away_on: "Počitniški način",
    t_power: "Moč",
    t_today: "Danes",
    t_energy: "Energija",
    t_mode: "Način",
    t_tariff: "Tarifa",
    t_water: "Voda",
    t_inlet: "Hladna voda",
    t_back: "Vrnitev",
    away: "Odsotnost",
    back: "Spet doma",
    heat_now: "Segrej zdaj",
    stop: "Ustavi",
    lower: "Znižaj temperaturo",
    raise: "Zvišaj temperaturo",
    m_eco: "Eko",
    m_electric: "Električni",
    m_heat_pump: "Toplotna črpalka",
    m_performance: "Zmogljivost",
    m_high_demand: "Velika poraba",
    m_gas: "Plin",
    m_boost: "Boost",
    no_heater: "Ni najdenega grelnika",
    ed_entity: "Grelnik vode",
    ed_entity_helper: "Entiteta water_heater, stikalo bojlerja, ki ga krmili rele, ali senzor moči za bojler, ki ga krmili sončni usmerjevalnik",
    ed_temperature: "Temperatura vode",
    ed_temperature_helper: "Za bojler, ki ga krmili rele, ali za branje druge sonde",
    ed_capacity: "Prostornina bojlerja",
    ed_capacity_helper: "Litri, za oceno tople vode, ko je integracija ne poroča",
    ed_shower_volume: "Voda na prho",
    ed_shower_volume_helper: "Litri pri 40 °C, za štetje prh",
    ed_tariff: "Tarifa",
    ed_tariff_helper: "Senzor nižje / višje tarife, prikazan v ploščici",
    ed_show_scene: "Ilustracija",
    ed_animations: "Animacije",
    ed_show_controls: "Upravljanje",
    ed_entities: "Entitete (YAML)",
    solar_share: "{n}% sonce",
    ed_entities_helper: "Nadomesti najdene entitete, po vlogi: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prazno: ime grelnika",
    ed_illustration: "Ilustrirana glava",
    ed_illustration_theme: "Tema glave",
    ed_theme_auto: "Samodejno (sonce)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noč",
  },
  lv: {
    title: "Ūdens sildītājs",
    st_heating: "Silda",
    st_ready: "Gatavs",
    st_boost: "Boost",
    st_away: "Prombūtne",
    st_off: "Izslēgts",
    st_error: "Kļūda",
    st_offline: "Bezsaistē",
    shower_one: "{n} duša",
    shower_many: "{n} dušas",
    litres: "{n} L pie 40 °C",
    heating_to: "Silda līdz {t}",
    target: "Mērķis {t}",
    away_until: "Prombūtne līdz {d}",
    away_on: "Atvaļinājuma režīms",
    t_power: "Jauda",
    t_today: "Šodien",
    t_energy: "Enerģija",
    t_mode: "Režīms",
    t_tariff: "Tarifs",
    t_water: "Ūdens",
    t_inlet: "Aukstais ūdens",
    t_back: "Atgriešanās",
    away: "Prombūtne",
    back: "Atkal mājās",
    heat_now: "Sildīt tagad",
    stop: "Apturēt",
    lower: "Pazemināt temperatūru",
    raise: "Paaugstināt temperatūru",
    m_eco: "Eko",
    m_electric: "Elektrisks",
    m_heat_pump: "Siltumsūknis",
    m_performance: "Veiktspēja",
    m_high_demand: "Liels pieprasījums",
    m_gas: "Gāze",
    m_boost: "Boost",
    no_heater: "Ūdens sildītājs nav atrasts",
    ed_entity: "Ūdens sildītājs",
    ed_entity_helper: "water_heater entītija, ar releju vadītas tvertnes slēdzis vai jaudas sensors tvertnei, ko vada saules maršrutētājs",
    ed_temperature: "Ūdens temperatūra",
    ed_temperature_helper: "Ar releju vadītai tvertnei vai cita sensora nolasīšanai",
    ed_capacity: "Tvertnes tilpums",
    ed_capacity_helper: "Litri, lai novērtētu karsto ūdeni, ja integrācija to nesniedz",
    ed_shower_volume: "Ūdens vienai dušai",
    ed_shower_volume_helper: "Litri pie 40 °C, lai skaitītu dušas",
    ed_tariff: "Tarifs",
    ed_tariff_helper: "Zemā / augstā tarifa sensors, rādīts flīzē",
    ed_show_scene: "Ilustrācija",
    ed_animations: "Animācijas",
    ed_show_controls: "Vadība",
    ed_entities: "Entītijas (YAML)",
    solar_share: "{n}% saules",
    ed_entities_helper: "Aizstāj atrastās entītijas, pēc lomas: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Tukšs: ūdens sildītāja nosaukums",
    ed_illustration: "Ilustrēta galvene",
    ed_illustration_theme: "Galvenes motīvs",
    ed_theme_auto: "Automātiski (saule)",
    ed_theme_day: "Diena",
    ed_theme_night: "Nakts",
  },
  el: {
    title: "Θερμοσίφωνας",
    st_heating: "Θερμαίνει",
    st_ready: "Έτοιμος",
    st_boost: "Boost",
    st_away: "Απουσία",
    st_off: "Απενεργοποιημένος",
    st_error: "Σφάλμα",
    st_offline: "Εκτός σύνδεσης",
    shower_one: "{n} ντους",
    shower_many: "{n} ντους",
    litres: "{n} L στους 40 °C",
    heating_to: "Θερμαίνει στους {t}",
    target: "Στόχος {t}",
    away_until: "Απουσία έως {d}",
    away_on: "Λειτουργία διακοπών",
    t_power: "Ισχύς",
    t_today: "Σήμερα",
    t_energy: "Ενέργεια",
    t_mode: "Λειτουργία",
    t_tariff: "Τιμολόγιο",
    t_water: "Νερό",
    t_inlet: "Κρύο νερό",
    t_back: "Επιστροφή",
    away: "Απουσία",
    back: "Επέστρεψα",
    heat_now: "Θέρμανση τώρα",
    stop: "Διακοπή",
    lower: "Μείωση θερμοκρασίας",
    raise: "Αύξηση θερμοκρασίας",
    m_eco: "Eco",
    m_electric: "Ηλεκτρικός",
    m_heat_pump: "Αντλία θερμότητας",
    m_performance: "Απόδοση",
    m_high_demand: "Υψηλή ζήτηση",
    m_gas: "Αέριο",
    m_boost: "Boost",
    no_heater: "Δεν βρέθηκε θερμοσίφωνας",
    ed_entity: "Θερμοσίφωνας",
    ed_entity_helper: "Μια οντότητα water_heater, ο διακόπτης ενός δοχείου που ελέγχεται από ρελέ, ή ένας αισθητήρας ισχύος για δοχείο με ηλιακό δρομολογητή",
    ed_temperature: "Θερμοκρασία νερού",
    ed_temperature_helper: "Για δοχείο που ελέγχεται από ρελέ ή για ανάγνωση άλλου αισθητήρα",
    ed_capacity: "Χωρητικότητα δοχείου",
    ed_capacity_helper: "Λίτρα, για εκτίμηση του ζεστού νερού όταν η ενσωμάτωση δεν το δίνει",
    ed_shower_volume: "Νερό ανά ντους",
    ed_shower_volume_helper: "Λίτρα στους 40 °C, για μέτρηση των ντους",
    ed_tariff: "Τιμολόγιο",
    ed_tariff_helper: "Αισθητήρας νυχτερινού / ημερήσιου τιμολογίου, σε πλακίδιο",
    ed_show_scene: "Εικονογράφηση",
    ed_animations: "Κινούμενα σχέδια",
    ed_show_controls: "Χειρισμός",
    ed_entities: "Οντότητες (YAML)",
    solar_share: "{n}% ηλιακή",
    ed_entities_helper: "Αντικαθιστά τις οντότητες που βρέθηκαν, ανά ρόλο: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Κενό: το όνομα του θερμοσίφωνα",
    ed_illustration: "Εικονογραφημένη κεφαλίδα",
    ed_illustration_theme: "Θέμα κεφαλίδας",
    ed_theme_auto: "Αυτόματα (ήλιος)",
    ed_theme_day: "Ημέρα",
    ed_theme_night: "Νύχτα",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const rcLang = (i18n, hass, config) => {
  // The full tag when the card has it (sr-Latn), else its base language (fr-FR → fr, pt-BR → pt), else English.
  const l = config?.language || hass?.locale?.language || hass?.language || "en";
  const base = l.split("-")[0];
  return i18n[l] ? l : i18n[base] ? base : "en";
};

const rcT = (i18n, lang, key, vars = {}) => {
  const s = i18n[lang]?.[key] ?? RC_I18N[lang]?.[key] ?? i18n.en[key] ?? RC_I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
};

// Plural key for `n` items: `<base>_one`, `<base>_few` or `<base>_many` (the "other" form), from the CLDR category of
// `n` in `lang` (Serbian 1 / 2-4 / 5+, 21 / 22…). `_few` is optional: without it, `_many` is used. A `_one` text without
// {n} ("Turn this plug off?") only means exactly one.
const rcPluralKey = (i18n, lang, base, n) => {
  let cat;
  try {
    cat = new Intl.PluralRules(lang).select(n);
  } catch {
    cat = n === 1 ? "one" : "other";
  }
  const text = (k) => i18n[lang]?.[k] ?? RC_I18N[lang]?.[k];
  if (cat === "one" && (n === 1 || text(`${base}_one`)?.includes("{n}"))) return `${base}_one`;
  if (cat === "few" && text(`${base}_few`) != null) return `${base}_few`;
  return `${base}_many`;
};

const rcEsc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const rcEscRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A power in the card's language (*1,2 kW* in French), from `lang` (defaults to the browser's).
const rcWatts = (w, lang) => {
  const kw = w >= 1000;
  const digits = kw && w < 10000 ? 1 : 0;
  let text;
  try {
    text = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(kw ? w / 1000 : w);
  } catch {
    text = (kw ? w / 1000 : w).toFixed(digits);
  }
  return `${text} ${kw ? "kW" : "W"}`;
};

// Strips a prefix, a suffix and the area name from an entity name, then capitalises it.
const rcCleanName = (name, areaName, prefix, suffix) => {
  let n = (name || "").replace(prefix, "").replace(suffix, "").trim();
  if (areaName && n.toLowerCase() !== areaName.toLowerCase()) {
    n = n.replace(new RegExp(`(^${rcEscRe(areaName)}\\s+|\\s+${rcEscRe(areaName)}$)`, "i"), "");
  }
  return n.charAt(0).toUpperCase() + n.slice(1);
};

const rcMoreInfo = (node, entityId) => {
  const ev = new Event("hass-more-info", { bubbles: true, composed: true });
  ev.detail = { entityId };
  node.dispatchEvent(ev);
};

const rcNavigate = (path) => {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};

// Wires a card header to its `navigation_path`: click, and Enter on the header itself.
const rcBindNav = (head, path) => {
  head.addEventListener("click", () => rcNavigate(path));
  head.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target === head) rcNavigate(path);
  });
};

const rcUnavailable = (st) => ["unavailable", "unknown"].includes(st.state);

// HA's callService already shows a toast when the call fails, then rejects: the rejection is only swallowed here
// so that it does not end up as "Uncaught (in promise)".
const rcCall = (hass, domain, service, data) => Promise.resolve(hass.callService(domain, service, data)).catch(() => {});

// A click inside a dialog (more-info opened from the card, say) is not a click outside the card.
const rcInDialog = (ev) => ev.composedPath().some((n) => ["ha-more-info-dialog", "ha-dialog", "dialog"].includes(n.localName));

// `fn()`, computed again only when one of `deps` is no longer the same object (or value) as last time.
const rcMemo = (store, key, deps, fn) => {
  const hit = store[key];
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.value;
  const value = fn();
  store[key] = { deps, value };
  return value;
};

// ── Base card ────────────────────────────────────────────────────────────────
class RcCard extends HTMLElement {
  static getStubConfig(hass) {
    const areas = Object.keys(hass?.areas ?? {});
    return { area: areas[0] ?? "" };
  }

  // Subclasses set: static i18n, static defaults, static tag, static styles.
  static getConfigElement() {
    // biome-ignore lint/complexity/noThisInStatic: each subclass opens its own editor.
    return document.createElement(`${this.tag}-editor`);
  }

  setConfig(config) {
    if (this.constructor.needsArea && !config.area && !config.entities?.length && !config.include?.length) {
      throw new Error(rcT(this.constructor.i18n, rcLang(this.constructor.i18n, this._hass, config), "err_config"));
    }
    this._config = { ...this.constructor.defaults, ...config };
    // show_title: the header's title, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    if (!this.shadowRoot) this._attach();
    this._sig = null;
    this._render();
  }

  // The shadow root, and no rewrite of the card between a press anywhere in it and the end of the click: Home
  // Assistant updates the card several times a second, and a rewrite under the pointer replaces the element pressed,
  // so that the click lands on the card itself and does nothing (the tiles already hold it, see _bindPress; this
  // covers the rest: header button, detail button, rows, popup). The pending update is rendered once released.
  _attach() {
    const root = this.attachShadow({ mode: "open" });
    this._onPressEnd = () => {
      window.removeEventListener("pointerup", this._onPressEnd, true);
      window.removeEventListener("pointercancel", this._onPressEnd, true);
      // After the click, which comes in the same task as the release.
      setTimeout(() => {
        if (this._pressing) this._released();
      }, 0);
    };
    root.addEventListener("pointerdown", (ev) => {
      this._byPointer = true;
      if (ev.button !== 0) return;
      this._pressing = true;
      window.addEventListener("pointerup", this._onPressEnd, true);
      window.addEventListener("pointercancel", this._onPressEnd, true);
    });
    // The focus is kept across rewrites for the keyboard only (no focus ring after a mouse click or a tap).
    root.addEventListener("keydown", () => {
      this._byPointer = false;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    window.removeEventListener("pointerup", this._onPressEnd, true);
    window.removeEventListener("pointercancel", this._onPressEnd, true);
    // A press cut short by the detach never gets its release: rendered now, and the next updates too.
    if (this._pressing) this._released();
  }

  set hass(hass) {
    this._hass = hass;
    // No re-render during a drag or a press: it would replace the tile under the finger.
    if (this._dragging || this._pressing) this._deferred = true;
    else this._render();
  }

  // The tiles actually shown (`only_on` / `only_alerts` applied), nothing when the card is hidden.
  getCardSize() {
    if (this.style.display === "none") return 0;
    const n = this._shown ?? this._items?.length ?? 0;
    if (!n || !this._config) return 1;
    // A row of large tiles (`layout: tiles`) is about one and a half rows of compact ones.
    const rows = Math.ceil(n / this._cols());
    return 1 + (this._tiles() ? Math.ceil(rows * 1.5) : rows);
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _lang() {
    return rcLang(this.constructor.i18n, this._hass, this._config);
  }

  _t(key, vars) {
    return rcT(this.constructor.i18n, this._lang(), key, vars);
  }

  // `<base>_one` / `_few` / `_many` for `n`, with {n} filled in.
  _tn(base, n, vars) {
    return this._t(rcPluralKey(this.constructor.i18n, this._lang(), base, n), { ...vars, n });
  }

  _areaOf(id) {
    const e = this._hass.entities?.[id];
    if (!e) return undefined;
    return e.area_id ?? this._hass.devices?.[e.device_id]?.area_id;
  }

  _areaName() {
    const c = this._config;
    return c.area ? (this._hass.areas?.[c.area]?.name ?? c.area) : "";
  }

  // The configured `entities`; otherwise the entities of the area accepted by `_candidate`, minus `exclude`,
  // plus `include` (entities from another room or without one).
  _entries() {
    const h = this._hass;
    const c = this._config;
    const list = (l) => (l || []).map((e) => (typeof e === "string" ? { entity: e } : e)).filter((e) => h.states[e.entity]);
    if (c.entities?.length) return list(c.entities);
    this._prepare();
    const found = c.area ? this._areaIds().filter((id) => h.states[id] && this._candidate(id)).map((entity) => ({ entity })) : [];
    const ids = new Set(found.map((e) => e.entity));
    return [...found, ...list(c.include).filter((e) => !ids.has(e.entity))];
  }

  // Visible entities of the area, minus `exclude`: the registries are scanned again only when they or the config
  // change (an entity outside the entity registry has no area anyway).
  _areaIds() {
    const h = this._hass;
    const c = this._config;
    return rcMemo((this._memo ||= {}), "area", [c, h.entities, h.devices], () => {
      const exclude = new Set(c.exclude || []);
      return Object.keys(h.entities || {}).filter((id) => !exclude.has(id) && !h.entities[id].hidden && this._areaOf(id) === c.area);
    });
  }

  // Hook run before the discovery, for what `_candidate` needs.
  _prepare() {}

  // Re-render only when something visible changed.
  _changed(parts) {
    const sig = JSON.stringify([this._config, this._lang(), parts]);
    if (sig === this._sig) return false;
    this._sig = sig;
    return true;
  }

  _hide(hidden) {
    this.style.display = hidden ? "none" : "";
    return hidden;
  }

  // Status of a set of opening and safety sensors: an alarm (`leaks` active ones, the most serious being `alert`: leak,
  // smoke, co or gas), then the open ones, then the unavailable ones (`unavail`: a sensor that cannot report is no
  // all-clear), then "All closed" when there are door or window sensors (`closable`), `idle` otherwise.
  _openingStatus(leaks, open, closable, idle = "all_quiet", unavail = 0, alert = "leak") {
    if (leaks) return this._t(alert);
    if (open) return this._tn("open", open);
    if (unavail) return this._tn("unavail", unavail);
    return this._t(closable ? "all_closed" : idle);
  }

  // Subclasses implement `_collect()` (the tiles) and `_draw(items)`.
  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    this._items = this._collect();
    this._draw(this._items);
  }

  _cols() {
    return Math.min(4, Math.max(1, Number(this._config.columns) || 2));
  }

  // `layout: tiles`: one large tile per entity, the size of Home Assistant's Tile card (easier to tap on a phone).
  _tiles() {
    return this._config?.layout === "tiles";
  }

  // Overviews: the grid of room tiles (`tile(room)`), its columns, the empty and idle states, then the open room's
  // details kept in step with the rooms shown.
  _roomGrid(grid, rooms, tile) {
    const cols = Number(this._config.columns);
    // A `columns` of 1 or 2 holds on a narrow card; 3 and more go down to two under 340 px, one under 260 px.
    grid.classList.toggle("fixed", cols >= 1 && cols <= 2);
    grid.style.setProperty("--cols", String(Math.min(6, Math.max(1, cols || 3))));
    // Every room idle with the "hide idle rooms" option: the header alone says it all.
    const idle = !rooms.length && this._total > 0;
    grid.hidden = idle;
    if (idle) grid.innerHTML = "";
    else grid.innerHTML = rooms.length ? rooms.map(tile).join("") : `<div class="empty">${rcEsc(this._t("no_rooms"))}</div>`;
    if (this._openArea && !rooms.some((x) => x.id === this._openArea)) this._toggle(null);
    else if (this._openArea) this._fillPanel();
  }

  _head({ icon, title, status, chips = "", allOff = false }) {
    const c = this._config;
    return `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
        <div class="title">${rcEsc(title)}</div>
        ${chips}
        <button class="pill${allOff ? " action" : ""}" title="${rcEsc(allOff ? this._t("turn_all_off") : status)}"${allOff ? "" : " disabled"}>
          ${allOff ? '<ha-icon icon="mdi:power"></ha-icon>' : ""}<span class="pt">${rcEsc(status)}</span>
        </button>
      </div>`;
  }

  _tile(i, { cls = "", style = "", extra = "", state = i.state, title = `${i.name} — ${i.state}` }) {
    return `
      <button class="tile ${i.unavailable ? "na" : i.on ? "on" : "off"}${cls}" data-id="${rcEsc(i.id)}"
              ${style ? `style="${rcEsc(style)}"` : ""} title="${rcEsc(title)}">
        ${extra}
        <span class="ic"><ha-icon icon="${rcEsc(i.icon)}"></ha-icon></span>
        <span class="txt">
          <span class="name">${rcEsc(i.name)}</span>
          <span class="state">${state}</span>
        </span>
      </button>`;
  }

  _paint(level, head, tiles, extraClass = "") {
    // The tile or control with the keyboard focus keeps it through the redraw (a toggle, a step or a two-tap
    // confirmation from the keyboard): tiles by their data-id, controls by their data-k.
    const active = this._byPointer ? null : this.shadowRoot.activeElement;
    const focused = active?.dataset?.id;
    const focusKey = active?.dataset?.k;
    this.shadowRoot.innerHTML = `
      <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${level}${extraClass}${this._tiles() ? " layout-tiles" : ""}">
        ${head}
        ${tiles ? `<div class="grid" style="--cols:${this._cols()}">${tiles}</div>` : ""}
        ${this._afterGrid()}
      </ha-card>`;
    const root = this.shadowRoot;
    root.querySelector(".pill.action")?.addEventListener("click", (ev) => this._allOff(ev));
    if (this._config.navigation_path) rcBindNav(root.querySelector(".head"), this._config.navigation_path);
    for (const el of root.querySelectorAll(".tile")) {
      this._bindTile(el, (this._items || []).find((i) => i.id === el.dataset.id));
      if (focused && el.dataset.id === focused) el.focus({ preventScroll: true });
    }
    this._bindAfter(root);
    if (focusKey) root.querySelector(`[data-k="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  // What a card adds under its tiles (the Lights card's scenes), and its event wiring.
  _afterGrid() {
    return "";
  }

  _bindAfter() {}

  // The "turn everything off" button of the header (full card) or of the status (mini card).
  _allOff(ev) {
    ev.stopPropagation();
    const ids = (this._items || []).filter((i) => i.on).map((i) => i.id);
    if (!ids.length) return;
    // A host card may ask first (the Overview confirms before turning plugs off); otherwise off at once.
    if (this._confirmOff) this._confirmOff(ids);
    else rcCall(this._hass, "homeassistant", "turn_off", { entity_id: ids });
  }

  // Tap, hold for more-info, and an optional horizontal drag ({ move(x), end(x), step(delta), flush() }). From the
  // keyboard: Enter / Space tap, Shift+Enter or the context-menu key open the details, ←/→ step the drag by ∓/±10
  // (a held key at most every RC_REPEAT_MS), and releasing the arrow calls `flush`.
  _bindPress(el, { onTap, onHold, drag }) {
    let start = null;
    let mode = null; // null | "hold" | "drag"
    let timer = null;
    let lastStep = 0;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      start = { x: ev.clientX, y: ev.clientY };
      mode = null;
      this._pressing = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The card may have been detached mid-press (nothing else clears this timer): no hold on a dead node.
        if (mode || !this.isConnected) return;
        mode = "hold";
        // The press is settled (no tap): the details may open over the tile, so its pointerup may never come.
        this._released();
        onHold();
      }, RC_HOLD_MS);
    });
    el.addEventListener("pointermove", (ev) => {
      if (!start || mode === "hold") return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!mode && drag && Math.abs(dx) > RC_MOVE_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "drag";
        clearTimeout(timer);
        this._dragging = true;
        el.setPointerCapture(ev.pointerId);
        el.classList.add("dragging");
      } else if (!mode && (Math.abs(dx) > RC_MOVE_PX || Math.abs(dy) > RC_MOVE_PX)) {
        clearTimeout(timer); // scrolling, or dragging what cannot be dragged: not a tap
        start = null;
        this._released();
      }
      if (mode === "drag") drag.move(ev.clientX);
    });
    const end = (ev, cancelled) => {
      clearTimeout(timer);
      if (!start) return;
      const wasDrag = mode === "drag";
      if (wasDrag) {
        this._dragging = false;
        el.classList.remove("dragging");
        if (!cancelled) drag.end(ev.clientX);
        this._sig = null;
      } else if (!mode && !cancelled) {
        onTap();
      }
      start = null;
      mode = null;
      // After a drag, the next update redraws (the bar keeps the new level until the light reports it).
      this._released(!wasDrag);
    };
    // The mouse leaving the tile mid-press (no capture outside a drag) cancels it: neither a tap nor a hold.
    el.addEventListener("pointerleave", () => {
      if (!start || mode) return;
      clearTimeout(timer);
      start = null;
      this._released();
    });
    el.addEventListener("pointerup", (ev) => end(ev, false));
    el.addEventListener("pointercancel", (ev) => end(ev, true));
    el.addEventListener("contextmenu", (ev) => ev.preventDefault());
    el.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" && ev.shiftKey) || ev.key === "ContextMenu") {
        ev.preventDefault();
        if (!ev.repeat) onHold();
      } else if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (!ev.repeat) onTap();
      } else if (drag?.step && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
        ev.preventDefault();
        if (ev.repeat && ev.timeStamp - lastStep < RC_REPEAT_MS) return;
        lastStep = ev.timeStamp;
        drag.step(ev.key === "ArrowRight" ? 10 : -10);
      }
    });
    // The arrow released: the stepped level goes out now rather than after the pause.
    el.addEventListener("keyup", (ev) => {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") drag?.flush?.();
    });
  }

  // End of a press: renders now what an update brought during it.
  _released(flush = true) {
    this._pressing = false;
    if (!this._deferred || this._dragging) return;
    this._deferred = false;
    if (flush) this._render();
  }

  // Default tile: tap toggles, hold opens the details.
  _bindTile(el, item) {
    this._bindPress(el, {
      onTap: () => !item?.unavailable && rcCall(this._hass, "homeassistant", "toggle", { entity_id: el.dataset.id }),
      onHold: () => rcMoreInfo(this, el.dataset.id),
    });
  }
}

// Lights and plugs: entities that are on or off, a status counting the ones on, an optional "turn everything off".
// Subclasses set `static headIcons` ([on, off]) and `static emptyKey`, and implement `_sigOf(item)` (what a tile
// shows) and `_tileOf(item)`; `_statusExtra(lit)` adds to the status.
class RcToggleCard extends RcCard {
  _statusExtra() {
    return "";
  }

  // What the header shows, on the full card and the mini card: level, icon, status (`ofTotal`: *2/5 on*) and whether
  // the "turn everything off" button is there. Null when nothing changed, or when the card hides itself.
  _summary(items, ofTotal = false) {
    const c = this._config;
    const lit = items.filter((i) => i.on);
    const level = lit.length ? "on" : "off";
    if (!this._changed([ofTotal, items.map((i) => this._sigOf(i))])) return null;
    if (this._hide(c.hide_when_off && level === "off")) return null;

    const shown = c.only_on ? items.filter((i) => i.on || i.unavailable) : items;
    this._shown = shown.length;
    const [onIcon, offIcon] = this.constructor.headIcons;
    const n = ofTotal ? `${lit.length}/${items.length}` : lit.length;
    const status = lit.length
      ? this._t(rcPluralKey(this.constructor.i18n, this._lang(), "on", lit.length), { n })
      : this._t(items.length ? "all_off" : this.constructor.emptyKey);
    return {
      level,
      shown,
      icon: lit.length ? onIcon : offIcon,
      status: status + this._statusExtra(lit),
      allOff: c.all_off_button && lit.length > 0,
    };
  }

  _draw(items) {
    const s = this._summary(items);
    if (!s) return;
    const head = this._head({ ...s, title: this._config.title || this._areaName() || this._t("title") });
    this._paint(s.level, head, s.shown.map((i) => this._tileOf(i)).join(""));
  }
}

// ── Mini cards ───────────────────────────────────────────────────────────────
// A mini card shows what its full card (`Base`) shows on two lines: the room badge, title and status, then one chip
// per entity. Its zoom button (top right, `zoom: false` removes it) switches it to the full card and back; a click
// anywhere else brings it back too.
// The subclass implements `_drawMini(items)`, which builds the chips and calls `_paintMini`.
// Zoomed in, everything is shown (`only_alerts` and `hide_when_clear` only apply to the compact view). With
// `alertsOnly`, the compact view always shows only what needs a look (no `only_alerts` option then): quiet entities
// show once zoomed in.
const rcMini = (Base, tag, styles, { alertsOnly = false } = {}) =>
  class extends Base {
    static tag = tag;
    static defaults = (({ only_alerts, ...rest }) => ({ ...rest, ...(alertsOnly ? {} : { only_alerts }), zoom: true }))(
      Base.defaults,
    );
    static styles = `${Base.styles}${RC_MINI_STYLES}${styles}`;

    constructor() {
      super();
      // A click anywhere else brings the card back to its compact view.
      this._onUnzoom = (ev) => {
        if (rcOutside(this, ev)) rcUnzoom(this);
      };
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._unzoom ??= watchOutside(this, this._onUnzoom);
      this._unzoom.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._unzoom?.off();
      // Left (another dashboard view, a conditional card hidden): back to the compact view.
      rcUnzoom(this);
    }

    getCardSize() {
      if (this._zoomed) return super.getCardSize();
      return this.style.display === "none" ? 0 : 1;
    }

    getGridOptions() {
      return { columns: 12, min_columns: 6, rows: "auto" };
    }

    _draw(items) {
      const config = this._config;
      // The base card's own filter does the work: off zoomed in, always on in an `alertsOnly` compact view.
      if (this._zoomed) this._config = { ...config, only_alerts: false, hide_when_clear: false };
      else if (alertsOnly) this._config = { ...config, only_alerts: true };
      try {
        if (this._zoomed) super._draw(items);
        else this._drawMini(items);
      } finally {
        this._config = config;
      }
      this._addZoom();
    }

    _paintMini({ level, icon, status, chips, cls = "", allOff = false }) {
      const c = this._config;
      const nav = c.navigation_path;
      // With `allOff` the status is the "turn everything off" button, like the full card's pill.
      const st = allOff
        ? `<button class="st action" title="${rcEsc(this._t("turn_all_off"))}"><ha-icon icon="mdi:power"></ha-icon><span class="pt">${rcEsc(status)}</span></button>`
        : `<span class="st" title="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`;
      this.shadowRoot.innerHTML = `
        <style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${level}${cls}">
          <div class="mini">
            <div class="badge" title="${rcEsc(status)}"><ha-icon icon="${rcEsc(icon)}"></ha-icon></div>
            <div class="body">
              <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
                <div class="title">${rcEsc(c.title || this._areaName() || this._t("title"))}</div>
                ${st}
              </div>
              <div class="rs">${chips}</div>
            </div>
          </div>
        </ha-card>`;
      const root = this.shadowRoot;
      if (nav) rcBindNav(root.querySelector(".head"), nav);
      root.querySelector(".st.action")?.addEventListener("click", (ev) => this._allOff(ev));
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    }

    // Zoom button at the end of the header, top right in both views, added once per render.
    // Its click is the overviews' (rcZoomClick): stop the tap on the title (navigation_path), toggle, keep the
    // keyboard focus (Enter / Space: no click count) on the button that replaced this one.
    _addZoom() {
      const head = this._config.zoom && this.shadowRoot.querySelector(".head");
      if (!head || head.querySelector(".zoom")) return;
      const button = document.createElement("button");
      button.className = "zoom";
      button.title = this._t(this._zoomed ? "zoom_out" : "zoom_in");
      button.innerHTML = `<ha-icon icon="${rcZoomIcon(this)}"></ha-icon>`;
      button.addEventListener("click", (ev) => rcZoomClick(this, ev));
      head.appendChild(button);
    }
  };

// Lights and plugs mini cards: the status counts what is on out of the total (*2/5 on*), with the full card's
// "turn everything off" button; then a tinted pill (icon and name) for each entity on, its icon alone for the others.
// The subclass may implement `_chipExtra(item)`, shown after the name (a plug's power draw).
const rcToggleMini = (Base, tag, styles) =>
  class extends rcMini(Base, tag, `${RC_TOGGLE_MINI_STYLES}${styles}`) {
    _chipExtra() {
      return "";
    }

    _drawMini(items) {
      const s = this._summary(items, true);
      if (!s) return;
      const chips = s.shown
        .map((i) => {
          const cls = i.unavailable ? " na" : i.on ? " on pill" : " off";
          const style = i.on && i.color ? ` style="--t:${rcEsc(i.color)}"` : "";
          return `
          <button class="r${cls}" data-id="${rcEsc(i.id)}"${style} title="${rcEsc(i.name)} — ${rcEsc(i.state)}">
            <ha-icon icon="${rcEsc(i.icon)}"></ha-icon>${i.on ? `<span>${rcEsc(i.name)}</span>${this._chipExtra(i)}` : ""}
          </button>`;
        })
        .join("");
      this._paintMini({ level: s.level, icon: s.icon, status: s.status, chips, allOff: s.allOff });
    }
  };

// ── Overviews: the open room ─────────────────────────────────────────────────
// What both overviews share around their room tiles: a tap follows the room's `navigation_path` or unfolds its
// details in the `.panel` (filled by the subclass's `_fillPanel`, from `_roomGrid`), a click anywhere else folds it
// back and returns to the rooms needing a look. The subclass implements `_shownRooms()` (the tiles shown) and
// `_clearPanel()` (drops its detail cards); `_beforeFold()` (optional) runs first on an outside click.
const rcRoomsPanel = (Base) =>
  class extends Base {
    constructor() {
      super();
      this._onOutside = (ev) => {
        if (!rcOutside(this, ev)) return;
        this._beforeFold?.();
        if (this._openArea) this._toggle(null);
        rcUnzoom(this);
      };
    }

    // A new config rebuilds the room details, which take part of it (language, exclude, thresholds…).
    setConfig(config) {
      this._panelArea = null;
      super.setConfig(config);
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._outside ??= watchOutside(this, this._onOutside);
      this._outside.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._outside?.off();
      // Left (another dashboard view, a conditional card hidden): folded back as by a click elsewhere, so that the
      // card does not come back with a room open, zoomed or its popup open.
      this._beforeFold?.();
      if (this._openArea) this._toggle(null);
      rcUnzoom(this);
    }

    _tap(aid) {
      const x = this._shownRooms().find((r) => r.id === aid);
      if (x?.navigation_path) rcNavigate(x.navigation_path);
      else this._toggle(this._openArea === aid ? null : aid);
    }

    // Opens a room's details (the render fills the panel), or folds them back.
    _toggle(aid) {
      this._openArea = aid;
      this._panelArea = null;
      this._sig = null;
      this._render();
      if (aid) return;
      const panel = this.shadowRoot.querySelector(".panel");
      panel.hidden = true;
      panel.innerHTML = "";
      this._clearPanel();
    }
  };

// ── Editor ───────────────────────────────────────────────────────────────────
// Fields shared by the room cards' editors.
const rcAreaFields = (navigation) => [
  { name: "area", selector: { area: {} } },
  { name: "title", selector: { text: {} } },
  ...(navigation ? [{ name: "navigation_path", selector: { navigation: {} } }] : []),
  { name: "columns", selector: { number: { min: 1, max: 4, mode: "box" } } },
];
// Compact tiles (default) or large ones, the size of Home Assistant's Tile card.
const rcLayoutField = (i18n, lang) => ({
  name: "layout",
  selector: {
    select: {
      mode: "dropdown",
      options: ["compact", "tiles"].map((value) => ({ value, label: rcT(i18n, lang, `ed_layout_${value}`) })),
    },
  },
});
const rcBooleans = (...names) => names.map((name) => ({ name, selector: { boolean: {} } }));

// "Advanced" section, folded, with the options that are lists or maps (edited as YAML) and the language. Its fields
// sit at the root of the config (`flatten`).
const RC_ADVANCED_HELPERS = ["language", "entities", "thresholds", "rooms"];
const rcAdvanced = (i18n, lang, ...names) => [
  {
    name: "advanced",
    type: "expandable",
    flatten: true,
    schema: names.map((name) =>
      name === "language"
        ? {
            name,
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: rcT(i18n, lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "sr", label: "Српски" },
                  { value: "sr-Latn", label: "Srpski (latinica)" },
                  { value: "it", label: "Italiano" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pt", label: "Português (Portugal)" },
                  { value: "pl", label: "Polski" },
                  { value: "ro", label: "Română" },
                  { value: "da", label: "Dansk" },
                  { value: "sv", label: "Svenska" },
                  { value: "bg", label: "Български" },
                  { value: "ru", label: "Русский" },
                  { value: "uk", label: "Українська" },
                  { value: "hu", label: "Magyar" },
                  { value: "sk", label: "Slovenčina" },
                  { value: "cs", label: "Čeština" },
                  { value: "sl", label: "Slovenščina" },
                  { value: "lv", label: "Latviešu" },
                  { value: "el", label: "Ελληνικά" },
                ],
              },
            },
          }
        : { name, selector: { object: {} } },
    ),
  },
];
// Entity picker limited to `ids`, left out when there is none.
const rcEntitiesField = (name, ids) =>
  ids.length ? [{ name, selector: { entity: { multiple: true, include_entities: ids } } }] : [];

// Include list: the entities of the card's domains (narrowed by `card.includeMatch` when set), anywhere in the home,
// that the card does not show yet (entities already included stay in the list).
const rcIncludeField = (card, hass, config) => {
  if (!hass) return [];
  const shown = new Set(
    rcProbe(card, hass, { ...config, entities: undefined, include: [] })
      ._entries()
      .map((e) => e.entity),
  );
  const ids = Object.keys(hass.states).filter(
    (id) =>
      card.includeDomains.includes(id.split(".")[0]) &&
      (!card.includeMatch || card.includeMatch(hass, id)) &&
      !shown.has(id) &&
      !hass.entities?.[id]?.hidden &&
      !hass.entities?.[id]?.entity_category,
  );
  for (const e of config?.include || []) {
    const id = typeof e === "string" ? e : e.entity;
    if (!ids.includes(id)) ids.push(id);
  }
  return rcEntitiesField("include", ids);
};

// A detached card of class `card`, with `config` over its defaults, to run its discovery from the editor.
const rcProbe = (card, hass, config) => {
  const probe = document.createElement(card.tag);
  probe._hass = hass;
  probe._config = { ...card.defaults, ...config };
  return probe;
};

// Exclude list limited to what the card finds in the chosen room, with the card's own rules
// (entities already excluded stay in the list).
const rcExcludeField = (card, hass, config) => {
  const ids =
    hass && config?.area
      ? rcProbe(card, hass, { ...config, entities: undefined, exclude: [] })
          ._entries()
          .map((e) => e.entity)
      : [];
  return rcEntitiesField("exclude", ids);
};

// `schema(lang, hass, config)` lists the fields; options left at the card's default are not written to the YAML
// (list defaults such as `exclude: []` are not shown in the form: an empty list is never written anyway).
// `autos` maps an option to its default worked out from the config (`(hass, config) => value`): shown in the form
// while unset, and kept out of the YAML when left at it.
// Entity lists the form edits with an entity picker (ids only): an item written `{ entity, name, icon }` in YAML shows as its entity,
// and gets its name and icon back when the form changes the list (ha-room-card#77).
const RC_ENTITY_LISTS = ["include"];
const rcListIds = (list) => (Array.isArray(list) ? list.map((e) => (typeof e === "string" ? e : e?.entity)).filter(Boolean) : list);
const rcListKeep = (ids, before) =>
  Array.isArray(ids) ? ids.map((id) => (Array.isArray(before) ? before.find((e) => typeof e === "object" && e?.entity === id) : undefined) ?? id) : ids;

const rcEditor = ({ card, helpers, schema, autos = {} }) => {
  const i18n = card.i18n;
  const defaults = { show_title: true, ...Object.fromEntries(Object.entries(card.defaults).filter(([, v]) => !Array.isArray(v))) };
  return class extends HTMLElement {
    setConfig(config) {
      this._config = config;
      this._update();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _update() {
      if (!this._hass || !this._config) return;
      const lang = rcLang(i18n, this._hass, this._config);
      // Read by the label and helper callbacks, set once on the form: a language change must reach them too.
      this._lang = lang;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => rcT(i18n, this._lang, `ed_${s.name}`);
        this._form.computeHelper = (s) =>
          helpers.includes(s.name) ? rcT(i18n, this._lang, `ed_${s.name}_helper`) : undefined;
        this._form.addEventListener("value-changed", (ev) => {
          const config = { ...ev.detail.value };
          for (const k of RC_ENTITY_LISTS) if (k in config) config[k] = rcListKeep(config[k], this._config[k]);
          for (const k of Object.keys(config)) {
            const v = config[k];
            if (v === "" || v == null || (Array.isArray(v) && !v.length) || defaults[k] === v) delete config[k];
          }
          for (const [k, auto] of Object.entries(autos)) {
            const untouched = this._config[k] === undefined && config[k] === auto(this._hass, this._config);
            if (untouched || config[k] === auto(this._hass, config)) delete config[k];
          }
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      // A new data or schema object re-renders the whole form, and the schema runs the card's discovery:
      // both only change with the config, the language or the registries.
      const memo = (this._memo ||= {});
      const h = this._hass;
      this._form.data = rcMemo(memo, "data", [this._config, h.areas], () => {
        const data = { ...defaults, ...this._config };
        for (const k of RC_ENTITY_LISTS) if (k in data) data[k] = rcListIds(data[k]);
        for (const [k, auto] of Object.entries(autos)) data[k] ??= auto(h, this._config);
        return data;
      });
      this._form.schema = rcMemo(memo, "schema", [lang, this._config, h.entities, h.devices, h.areas], () =>
        schema(lang, h, this._config),
      );
    }
  };
};

const rcRegister = (card, editor, name, description) => {
  if (customElements.get(card.tag)) return;
  customElements.define(card.tag, card);
  customElements.define(`${card.tag}-editor`, editor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: card.tag,
    name,
    description,
    preview: true,
    documentationURL: "https://github.com/juju35/ha-water-heater-card",
  });
};

if (!customElements.get("water-heater-card")) {
  console.info(`%c HA-WATER-HEATER-CARD %c v${RC_VERSION} `, "background:#e8590c;color:#fff;font-weight:700", "");
}

// ── Common styles ────────────────────────────────────────────────────────────
const RC_BASE_STYLES = `
  :host {
    --rc-ok: var(--success-color, #43a047);
    --rc-warn: var(--warning-color, #ffa600);
    --rc-alert: var(--error-color, #db4437);
    --rc-info: var(--info-color, #039be5);
    --rc-light: var(--state-light-active-color, #ffb300);
    --rc-plug: var(--state-switch-on-color, var(--primary-color, #03a9f4));
    --rc-idle: var(--secondary-text-color, #9e9e9e);
    --rc-na: var(--disabled-color, #9e9e9e);
    display: block;
    min-width: 0;
  }
  /* The card answers its own width (container queries). That containment drops its content from its natural width: in
     a wrapper sized by its content (inline-block, a grid's auto column, a flex row: layout-card, button-card…) it would
     shrink to its padding. The empty grid below (no height) gives the host a natural width of 344 px there, as a
     preferred width only: its column is minmax(0, …), so the card still shrinks to its column in a grid card, a
     horizontal stack or a 1fr column, even wrapped in a <div> (hui-card in layout-card). contain-intrinsic-inline-size
     or a min-width in px would be a minimum there, and the card would overflow. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, 344px); height: 0; }
  ha-card { padding: 12px; overflow: hidden; container-type: inline-size; }
  ha-card.lvl-alert { box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc-alert) 45%, transparent), var(--ha-card-box-shadow, none); }

  .head { display: flex; align-items: center; gap: 10px; }
  .head.nav { cursor: pointer; }
  .head.nav:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .badge ha-icon { --mdc-icon-size: 24px; }
  .lvl-alert .badge { animation: rc-pulse 1.6s ease-in-out infinite; }
  /* Narrow header: the title keeps a few letters (never 0 px), the status pill shrinks and ellipsises, the icon buttons
     (zoom, power) never shrink; under 200 px the pill is only its coloured dot, its text kept for screen readers. */
  .title { flex: 1 1 0; min-width: 5ch; font-size: 16px; font-weight: 500; color: var(--primary-text-color);
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
           /* show_title: false keeps the title's room (the pill and buttons stay in place) */
  :host([hide-title]) .head > .title { visibility: hidden; }
  .pill { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative;
          display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500;
          padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, transparent);
          /* Coloured text is half the accent, half the text colour: 4.5:1 on its tint in light and dark themes, where
             the bare accent (amber above all) is not. */
          color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); }
  .pt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pill ha-icon { flex: none; }
  /* A card this narrow (6 columns of the Sections view on a phone): the title is at its few letters already, so the
     status pill goes to a line of its own under it, where its whole label fits, rather than end with "…". */
  @container (max-width: 260px) {
    .head { flex-wrap: wrap; row-gap: 4px; }
    .head::after { content: ""; order: 1; flex: 1 0 100%; }
    .head > .pill { order: 2; margin-left: 50px; max-width: calc(100% - 50px); }
  }
  @container (max-width: 200px) {
    /* Under 200 px the pill is only its dot again: back on the title's line. */
    .head { flex-wrap: nowrap; }
    .head::after { content: none; }
    .head > .pill { order: 0; margin-left: 0; max-width: none; }
    .head > .pill .pt, .st .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .head > .pill:not(.action), .st { flex: none; padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    .head > .pill:not(.action)::before, .st::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    .head > .pill.action { padding: 1px 4px; }
    /* A full card this narrow (6 columns of the Sections view on a phone): a smaller badge, no side chip in the header. */
    .head { gap: 6px; }
    .head > .badge { width: 32px; height: 32px; }
    .head > .badge ha-icon { --mdc-icon-size: 20px; }
    .head > .chip { display: none; }
  }
  .pill.action { cursor: pointer; }
  .pill.action:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
  .pill.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .pill ha-icon { --mdc-icon-size: 12px; margin-left: -2px; }

  .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  .tile { all: unset; position: relative; overflow: hidden; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: flex; align-items: center; gap: 8px; padding: 5px 8px 5px 5px; border-radius: 10px;
          touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
          background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
          border: 1px solid color-mix(in srgb, var(--t) 22%, transparent); transition: background .2s, border-color .2s; }
  .tile.off, .tile.na { background: var(--secondary-background-color, transparent); border-color: transparent; }
  .tile.na { --t: var(--rc-na); opacity: .7; }
  .tile:hover { background: color-mix(in srgb, var(--t) 15%, var(--secondary-background-color, transparent)); }
  .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .ic, .txt { position: relative; }
  .ic { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
        color: var(--t); background: color-mix(in srgb, var(--t) 20%, transparent); }
  .ic ha-icon { --mdc-icon-size: 16px; }
  .txt { display: flex; flex-direction: column; min-width: 0; }
  .name { font-size: 13px; font-weight: 500; line-height: 1.2; color: var(--primary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* A reading is never cut: on a narrow tile it goes on to a second line (the name, a label, keeps its ellipsis). */
  .state { font-size: 11px; line-height: 1.2; color: var(--secondary-text-color); overflow-wrap: break-word; }
  /* A card this narrow (a phone, 6 columns of the Sections view): one tile per row, whatever the columns option. */
  @container (max-width: 260px) { .grid { grid-template-columns: minmax(0, 1fr); } }
  /* layout: tiles — the size of Home Assistant's Tile card — 56 px high, a 40 px icon, the name over the state. */
  .layout-tiles .grid { gap: 8px; }
  .layout-tiles .tile { min-height: 56px; gap: 10px; padding: 8px 10px 8px 8px; border-radius: 12px; }
  .layout-tiles .ic { width: 40px; height: 40px; }
  .layout-tiles .ic ha-icon { --mdc-icon-size: 24px; }
  .layout-tiles .txt { gap: 2px; }
  .layout-tiles .name { font-size: 14px; line-height: 1.25; }
  .layout-tiles .state { font-size: 12px; line-height: 1.25; }

  @keyframes rc-blink { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
  @keyframes rc-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 45%, transparent) }
                        50% { box-shadow: 0 0 0 7px transparent } }
  @media (prefers-reduced-motion: reduce) { .tile, .lvl-alert .badge { animation: none; transition: none; } }
`;

// Mini cards: layout, chips and zoom button. A chip is plain (icon and text) until it needs a look: then a tinted pill.
// The zoom / detail button of the mini cards and the overviews.
const RC_ZOOM_STYLES = `
  /* 40 px to tap, laid out as the 24 px it looks (the negative margins). */
  .zoom { all: unset; flex: none; cursor: pointer; width: 40px; height: 40px; margin: -12px -12px -12px -8px; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom ha-icon { --mdc-icon-size: 16px; }
  .zoom:hover { background: color-mix(in srgb, var(--rc-idle) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
`;

// Lights and plugs mini cards: the "turn everything off" status (not filled: tinted on hover, like the zoom button)
// and the chips of the entities that are off (icon alone, grey).
const RC_TOGGLE_MINI_STYLES = `
  .st.action { all: unset; flex: 0 1 auto; min-width: 0; box-sizing: border-box; position: relative; cursor: pointer;
               display: inline-flex; align-items: center; gap: 3px; margin-left: auto; padding: 1px 6px; border-radius: 999px;
               font-size: 11px; font-weight: 500; color: var(--c); }
  .st.action ha-icon { --mdc-icon-size: 12px; flex: none; }
  .st.action:hover { background: color-mix(in srgb, var(--c) 14%, transparent); }
  .st.action:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  @container (max-width: 200px) {
    .st.action { width: auto; height: auto; padding: 1px 4px; }
    .st.action::before { content: none; }
  }
  .r.off, .r.na { padding: 0 3px; }
  .r.off ha-icon, .r.na ha-icon { margin-right: 0; }
  .r.off { --t: var(--rc-idle); }
  .r.na  { --t: var(--rc-na); opacity: .7; }
  .r small { flex: none; font-size: 10px; font-weight: 400; opacity: .8; margin-left: 4px; }
`;

// The overviews' room grid: the tiles, their icon, chips row, empty state and details panel. Each overview sets the
// tile's default tint and its own levels (`.room { --t: … }`, `.room.lvl-…`), the chips' spacing and the panel extras.
const RC_ROOM_GRID_STYLES = `
  .grid { display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
  @container (max-width: 340px) { .grid:not(.fixed) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  /* A card this narrow (6 columns of the Sections view on a phone): one room per row, whatever the columns option. Two
     left the name a letter or two ("B…") and pushed a chip out of its tile. */
  @container (max-width: 260px) { .grid.grid { grid-template-columns: minmax(0, 1fr); } }
  .grid[hidden] { display: none; }
  .room { all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
          display: grid; grid-template-columns: 26px minmax(0, 1fr); grid-template-areas: "ic name" "ic state" "chips chips";
          column-gap: 7px; align-items: center; align-content: start; padding: 6px 7px; border-radius: 10px;
          background: var(--secondary-background-color, transparent); border: 1px solid transparent;
          transition: background .2s, border-color .2s; }
  .room.lvl-warn, .room.lvl-alert {
    background: color-mix(in srgb, var(--t) 9%, var(--secondary-background-color, transparent));
    border-color: color-mix(in srgb, var(--t) 22%, transparent); }
  .room:hover { background: color-mix(in srgb, var(--t) 13%, var(--secondary-background-color, transparent)); }
  .room:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .room.sel { border-color: color-mix(in srgb, var(--primary-color) 55%, transparent); }
  .room .ic { grid-area: ic; align-self: start; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
              color: var(--t); background: color-mix(in srgb, var(--t) 16%, transparent); }
  .room.lvl-ok .ic { color: var(--primary-text-color); background: color-mix(in srgb, var(--rc-idle) 14%, transparent); }
  .room .ic ha-icon { --mdc-icon-size: 15px; }
  .room .name { grid-area: name; }
  /* The state (a sentence: "Water leak", "Too humid +1") wraps between its words only; a word too long for its line
     ends with "…" rather than being broken ("Pr|es|en|ce"). */
  .room .state { grid-area: state; overflow-wrap: normal; overflow: hidden; text-overflow: ellipsis; }
  .room:not(.lvl-ok) .state { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); }
  .chips { grid-area: chips; display: flex; flex-wrap: wrap; }
  .chips:empty { display: none; }
  .empty { grid-column: 1 / -1; padding: 12px; text-align: center; font-size: 13px; color: var(--secondary-text-color); }
  .panel { margin-top: 8px; border-radius: 12px; overflow: hidden; background: var(--secondary-background-color, transparent);
           --ha-card-background: transparent; --card-background-color: transparent;
           --ha-card-box-shadow: none; --ha-card-border-width: 0; }
  .panel[hidden] { display: none; }
  /* The unfolded room cards are custom elements with no display of their own: inline, the separator between them
     (border-top) would only paint on an empty first line box around their block <ha-card>. */
  .panel > * { display: block; }
  @media (prefers-reduced-motion: reduce) { .room { animation: none; transition: none; } }
`;

const RC_MINI_STYLES = `${RC_ZOOM_STYLES}
  /* The badge sits 12px from the card's top-left corner, like the other ha-* cards, beside the title and the readings. */
  ha-card:has(.mini) { padding: 12px; }
  .mini { display: flex; align-items: flex-start; gap: 10px; }
  /* The badge keeps the full card's size (40 px, icon 24 px): the body is at least as tall, a lone title line centred
     beside it. */
  .body { flex: 1; min-width: 0; min-height: 40px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .mini .head { gap: 8px; }
  .mini .title { line-height: 1.25; }
  .st { flex: 0 1 auto; min-width: 0; position: relative; display: inline-flex; align-items: center;
        margin-left: auto; font-size: 11px; font-weight: 500; color: var(--c); }
  .rs { display: flex; flex-wrap: wrap; gap: 2px 4px; margin-left: -4px; }
  .rs:empty { display: none; }
  /* A chip never runs past the card: a long name ends with an ellipsis. */
  .r { all: unset; cursor: pointer; display: inline-flex; align-items: baseline; gap: 1px; padding: 0 5px 0 4px;
       box-sizing: border-box; min-width: 0; max-width: 100%; overflow: hidden;
       border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 24px; white-space: nowrap; --t: var(--rc-ok);
       color: var(--primary-text-color); }
  .r ha-icon { --mdc-icon-size: 13px; flex: none; color: var(--t); align-self: center; margin-right: 2px; }
  .r > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .r.pill { color: color-mix(in srgb, var(--t) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--t) 14%, transparent); }
  .r:hover { background: color-mix(in srgb, var(--t) 20%, var(--secondary-background-color, transparent)); }
  .r:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
`;
