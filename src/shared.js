/**
 * Shared by the water heater cards (its names are used by the other src/ files): the water heater's entities and states, i18n helpers,
 * the base card (header, tiles, tap / hold), the mini card, the visual editor and the common styles. Same base as ha-room-card.
 * https://github.com/juju35/ha-water-heater-card
 */
const RC_VERSION = "__VERSION__";

const RC_HOLD_MS = 500;
const RC_MOVE_PX = 8;
// A held arrow key repeats some 30 times a second: one brightness step every RC_REPEAT_MS at most.
const RC_REPEAT_MS = 150;

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

// ── Overviews ────────────────────────────────────────────────────────────────
// Shared by room-overview-card and room-environment-overview-card.

// The zoom / detail button: the same icons on the overviews and the mini cards.
const rcZoomIcon = (card) => (card._zoomed ? "mdi:arrow-collapse" : "mdi:arrow-expand");

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

// ── i18n ─────────────────────────────────────────────────────────────────────
// Strings shared by the cards; a card's own dictionary wins over these.
const RC_I18N = {
  en: {
    unavailable: "Unavailable",
    on: "On",
    off: "Off",
    turn_all_off: "Turn everything off",
    ed_title: "Title",
    ed_show_title: "Show title",
    ed_advanced: "Advanced",
    ed_language: "Language",
    ed_language_helper: "Empty: the Home Assistant language",
    ed_language_auto: "Automatic",
    ed_navigation_path: "Navigation path",
    err_config: "Set `area` or `entities`",
    zoom_in: "Show the full card",
    zoom_out: "Back to the compact view",
    ed_zoom: "Zoom button",
    ed_zoom_helper: "Switches the mini card to the full card and back",
  },
  fr: {
    unavailable: "Indisponible",
    on: "Allumée",
    off: "Éteinte",
    turn_all_off: "Tout éteindre",
    ed_title: "Titre",
    ed_show_title: "Afficher le titre",
    ed_advanced: "Avancé",
    ed_language: "Langue",
    ed_language_helper: "Vide : la langue de Home Assistant",
    ed_language_auto: "Automatique",
    ed_navigation_path: "Chemin de navigation",
    err_config: "Définis `area` ou `entities`",
    zoom_in: "Afficher la carte complète",
    zoom_out: "Revenir à la vue compacte",
    ed_zoom: "Bouton zoom",
    ed_zoom_helper: "Bascule la mini-carte en carte complète, et inversement",
  },
  de: {
    unavailable: "Nicht verfügbar",
    on: "An",
    off: "Aus",
    turn_all_off: "Alles ausschalten",
    ed_title: "Titel",
    ed_show_title: "Titel anzeigen",
    ed_advanced: "Erweitert",
    ed_language: "Sprache",
    ed_language_helper: "Leer: die Sprache von Home Assistant",
    ed_language_auto: "Automatisch",
    ed_navigation_path: "Navigationspfad",
    err_config: "Lege `area` oder `entities` fest",
    zoom_in: "Vollständige Karte anzeigen",
    zoom_out: "Zurück zur kompakten Ansicht",
    ed_zoom: "Zoom-Schaltfläche",
    ed_zoom_helper: "Wechselt von der Mini-Karte zur vollständigen Karte und zurück",
  },
  es: {
    unavailable: "No disponible",
    on: "Encendido",
    off: "Apagado",
    turn_all_off: "Apagar todo",
    ed_title: "Título",
    ed_show_title: "Mostrar el título",
    ed_advanced: "Avanzado",
    ed_language: "Idioma",
    ed_language_helper: "Vacío: el idioma de Home Assistant",
    ed_language_auto: "Automático",
    ed_navigation_path: "Ruta de navegación",
    err_config: "Define `area` o `entities`",
    zoom_in: "Mostrar la tarjeta completa",
    zoom_out: "Volver a la vista compacta",
    ed_zoom: "Botón de zoom",
    ed_zoom_helper: "Cambia de la minitarjeta a la tarjeta completa y viceversa",
  },
  sr: {
    unavailable: "Недоступно",
    on: "Укључено",
    off: "Искључено",
    turn_all_off: "Искључи све",
    ed_title: "Наслов",
    ed_show_title: "Прикажи наслов",
    ed_advanced: "Напредно",
    ed_language: "Језик",
    ed_language_helper: "Празно: језик Home Assistant-а",
    ed_language_auto: "Аутоматски",
    ed_navigation_path: "Путања за навигацију",
    err_config: "Подесите `area` или `entities`",
    zoom_in: "Прикажи целу картицу",
    zoom_out: "Назад на компактни приказ",
    ed_zoom: "Дугме за увећање",
    ed_zoom_helper: "Пребацује мини картицу на пун приказ и назад",
  },
  "sr-Latn": {
    unavailable: "Nedostupno",
    on: "Uključeno",
    off: "Isključeno",
    turn_all_off: "Isključi sve",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistant-a",
    ed_language_auto: "Automatski",
    ed_navigation_path: "Putanja za navigaciju",
    err_config: "Podesite `area` ili `entities`",
    zoom_in: "Prikaži celu karticu",
    zoom_out: "Nazad na kompaktni prikaz",
    ed_zoom: "Dugme za uvećanje",
    ed_zoom_helper: "Prebacuje mini karticu na pun prikaz i nazad",
  },
  it: {
    unavailable: "Non disponibile",
    on: "Accesa",
    off: "Spenta",
    turn_all_off: "Spegni tutto",
    ed_title: "Titolo",
    ed_show_title: "Mostra il titolo",
    ed_advanced: "Avanzate",
    ed_language: "Lingua",
    ed_language_helper: "Vuoto: la lingua di Home Assistant",
    ed_language_auto: "Automatica",
    ed_navigation_path: "Percorso di navigazione",
    err_config: "Imposta `area` o `entities`",
    zoom_in: "Mostra la scheda completa",
    zoom_out: "Torna alla vista compatta",
    ed_zoom: "Pulsante zoom",
    ed_zoom_helper: "Passa dalla mini scheda alla scheda completa e viceversa",
  },
  nl: {
    unavailable: "Niet beschikbaar",
    on: "Aan",
    off: "Uit",
    turn_all_off: "Alles uitschakelen",
    ed_title: "Titel",
    ed_show_title: "Titel tonen",
    ed_advanced: "Geavanceerd",
    ed_language: "Taal",
    ed_language_helper: "Leeg: de taal van Home Assistant",
    ed_language_auto: "Automatisch",
    ed_navigation_path: "Navigatiepad",
    err_config: "Stel `area` of `entities` in",
    zoom_in: "Volledige kaart tonen",
    zoom_out: "Terug naar de compacte weergave",
    ed_zoom: "Zoomknop",
    ed_zoom_helper: "Schakelt de minikaart naar de volledige kaart en terug",
  },
  pt: {
    unavailable: "Indisponível",
    on: "Ligada",
    off: "Desligada",
    turn_all_off: "Desligar tudo",
    ed_title: "Título",
    ed_show_title: "Mostrar o título",
    ed_advanced: "Avançado",
    ed_language: "Idioma",
    ed_language_helper: "Vazio: o idioma do Home Assistant",
    ed_language_auto: "Automático",
    ed_navigation_path: "Caminho de navegação",
    err_config: "Defina `area` ou `entities`",
    zoom_in: "Mostrar o cartão completo",
    zoom_out: "Voltar à vista compacta",
    ed_zoom: "Botão de zoom",
    ed_zoom_helper: "Alterna entre o minicartão e o cartão completo",
  },
  pl: {
    unavailable: "Niedostępne",
    on: "Włączone",
    off: "Wyłączone",
    turn_all_off: "Wyłącz wszystko",
    ed_title: "Tytuł",
    ed_show_title: "Pokaż tytuł",
    ed_advanced: "Zaawansowane",
    ed_language: "Język",
    ed_language_helper: "Puste: język Home Assistanta",
    ed_language_auto: "Automatyczny",
    ed_navigation_path: "Ścieżka nawigacji",
    err_config: "Ustaw `area` lub `entities`",
    zoom_in: "Pokaż pełną kartę",
    zoom_out: "Wróć do widoku kompaktowego",
    ed_zoom: "Przycisk powiększenia",
    ed_zoom_helper: "Przełącza minikartę na pełną kartę i z powrotem",
  },
  ro: {
    unavailable: "Indisponibil",
    on: "Pornită",
    off: "Oprită",
    turn_all_off: "Oprește tot",
    ed_title: "Titlu",
    ed_show_title: "Afișează titlul",
    ed_advanced: "Avansat",
    ed_language: "Limbă",
    ed_language_helper: "Gol: limba Home Assistant",
    ed_language_auto: "Automată",
    ed_navigation_path: "Cale de navigare",
    err_config: "Setează `area` sau `entities`",
    zoom_in: "Afișează cardul complet",
    zoom_out: "Înapoi la vizualizarea compactă",
    ed_zoom: "Buton de zoom",
    ed_zoom_helper: "Comută între mini-card și cardul complet",
  },
  da: {
    unavailable: "Utilgængelig",
    on: "Tændt",
    off: "Slukket",
    turn_all_off: "Sluk alt",
    ed_title: "Titel",
    ed_show_title: "Vis titel",
    ed_advanced: "Avanceret",
    ed_language: "Sprog",
    ed_language_helper: "Tomt: Home Assistants sprog",
    ed_language_auto: "Automatisk",
    ed_navigation_path: "Navigationssti",
    err_config: "Angiv `area` eller `entities`",
    zoom_in: "Vis hele kortet",
    zoom_out: "Tilbage til den kompakte visning",
    ed_zoom: "Zoomknap",
    ed_zoom_helper: "Skifter fra minikortet til hele kortet og tilbage",
  },
  sv: {
    unavailable: "Ej tillgänglig",
    on: "På",
    off: "Av",
    turn_all_off: "Stäng av allt",
    ed_title: "Titel",
    ed_show_title: "Visa rubrik",
    ed_advanced: "Avancerat",
    ed_language: "Språk",
    ed_language_helper: "Tomt: Home Assistants språk",
    ed_language_auto: "Automatiskt",
    ed_navigation_path: "Navigeringssökväg",
    err_config: "Ange `area` eller `entities`",
    zoom_in: "Visa hela kortet",
    zoom_out: "Tillbaka till kompakt vy",
    ed_zoom: "Zoomknapp",
    ed_zoom_helper: "Växlar mellan minikortet och hela kortet",
  },
  bg: {
    unavailable: "Недостъпно",
    on: "Включен",
    off: "Изключен",
    turn_all_off: "Изключи всичко",
    ed_title: "Заглавие",
    ed_show_title: "Показване на заглавието",
    ed_advanced: "Разширени",
    ed_language: "Език",
    ed_language_helper: "Празно: езикът на Home Assistant",
    ed_language_auto: "Автоматично",
    ed_navigation_path: "Път за навигация",
    err_config: "Задайте `area` или `entities`",
    zoom_in: "Покажи пълната карта",
    zoom_out: "Обратно към компактния изглед",
    ed_zoom: "Бутон за увеличение",
    ed_zoom_helper: "Превключва от мини картата към пълната карта и обратно",
  },
  ru: {
    unavailable: "Недоступно",
    on: "Включено",
    off: "Выключено",
    turn_all_off: "Выключить всё",
    ed_title: "Заголовок",
    ed_show_title: "Показывать заголовок",
    ed_advanced: "Дополнительно",
    ed_language: "Язык",
    ed_language_helper: "Пусто: язык Home Assistant",
    ed_language_auto: "Автоматически",
    ed_navigation_path: "Путь навигации",
    err_config: "Укажите `area` или `entities`",
    zoom_in: "Показать полную карточку",
    zoom_out: "Вернуться к компактному виду",
    ed_zoom: "Кнопка масштаба",
    ed_zoom_helper: "Переключает мини-карточку на полную карточку и обратно",
  },
  uk: {
    unavailable: "Недоступно",
    on: "Увімкнено",
    off: "Вимкнено",
    turn_all_off: "Вимкнути все",
    ed_title: "Заголовок",
    ed_show_title: "Показувати заголовок",
    ed_advanced: "Додатково",
    ed_language: "Мова",
    ed_language_helper: "Порожньо: мова Home Assistant",
    ed_language_auto: "Автоматично",
    ed_navigation_path: "Шлях навігації",
    err_config: "Вкажіть `area` або `entities`",
    zoom_in: "Показати повну картку",
    zoom_out: "Повернутися до компактного вигляду",
    ed_zoom: "Кнопка масштабу",
    ed_zoom_helper: "Перемикає міні-картку на повну картку й назад",
  },
  hu: {
    unavailable: "Nem elérhető",
    on: "Be",
    off: "Ki",
    turn_all_off: "Minden kikapcsolása",
    ed_title: "Cím",
    ed_show_title: "Cím megjelenítése",
    ed_advanced: "Speciális",
    ed_language: "Nyelv",
    ed_language_helper: "Üres: a Home Assistant nyelve",
    ed_language_auto: "Automatikus",
    ed_navigation_path: "Navigációs útvonal",
    err_config: "Állítsd be az `area` vagy az `entities` értékét",
    zoom_in: "A teljes kártya megjelenítése",
    zoom_out: "Vissza a kompakt nézethez",
    ed_zoom: "Nagyítás gomb",
    ed_zoom_helper: "Vált a mini kártya és a teljes kártya között",
  },
  sk: {
    unavailable: "Nedostupné",
    on: "Zapnuté",
    off: "Vypnuté",
    turn_all_off: "Vypnúť všetko",
    ed_title: "Názov",
    ed_show_title: "Zobraziť názov",
    ed_advanced: "Rozšírené",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdne: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_navigation_path: "Navigačná cesta",
    err_config: "Nastavte `area` alebo `entities`",
    zoom_in: "Zobraziť celú kartu",
    zoom_out: "Späť na kompaktné zobrazenie",
    ed_zoom: "Tlačidlo priblíženia",
    ed_zoom_helper: "Prepína minikartu na celú kartu a späť",
  },
  cs: {
    unavailable: "Nedostupné",
    on: "Zapnuto",
    off: "Vypnuto",
    turn_all_off: "Vypnout vše",
    ed_title: "Název",
    ed_show_title: "Zobrazit název",
    ed_advanced: "Pokročilé",
    ed_language: "Jazyk",
    ed_language_helper: "Prázdné: jazyk Home Assistanta",
    ed_language_auto: "Automaticky",
    ed_navigation_path: "Navigační cesta",
    err_config: "Nastavte `area` nebo `entities`",
    zoom_in: "Zobrazit celou kartu",
    zoom_out: "Zpět na kompaktní zobrazení",
    ed_zoom: "Tlačítko přiblížení",
    ed_zoom_helper: "Přepíná minikartu na celou kartu a zpět",
  },
  sl: {
    unavailable: "Ni na voljo",
    on: "Vklopljeno",
    off: "Izklopljeno",
    turn_all_off: "Izklopi vse",
    ed_title: "Naslov",
    ed_show_title: "Prikaži naslov",
    ed_advanced: "Napredno",
    ed_language: "Jezik",
    ed_language_helper: "Prazno: jezik Home Assistanta",
    ed_language_auto: "Samodejno",
    ed_navigation_path: "Navigacijska pot",
    err_config: "Nastavite `area` ali `entities`",
    zoom_in: "Prikaži celotno kartico",
    zoom_out: "Nazaj na strnjen pogled",
    ed_zoom: "Gumb za povečavo",
    ed_zoom_helper: "Preklopi mini kartico v celotno kartico in nazaj",
  },
  lv: {
    unavailable: "Nav pieejams",
    on: "Ieslēgts",
    off: "Izslēgts",
    turn_all_off: "Izslēgt visu",
    ed_title: "Virsraksts",
    ed_show_title: "Rādīt virsrakstu",
    ed_advanced: "Papildu",
    ed_language: "Valoda",
    ed_language_helper: "Tukšs: Home Assistant valoda",
    ed_language_auto: "Automātiski",
    ed_navigation_path: "Navigācijas ceļš",
    err_config: "Iestatiet `area` vai `entities`",
    zoom_in: "Rādīt pilno karti",
    zoom_out: "Atpakaļ uz kompakto skatu",
    ed_zoom: "Tālummaiņas poga",
    ed_zoom_helper: "Pārslēdz mini karti uz pilno karti un atpakaļ",
  },
  el: {
    unavailable: "Μη διαθέσιμο",
    on: "Ενεργή",
    off: "Ανενεργή",
    turn_all_off: "Απενεργοποίηση όλων",
    ed_title: "Τίτλος",
    ed_show_title: "Εμφάνιση τίτλου",
    ed_advanced: "Για προχωρημένους",
    ed_language: "Γλώσσα",
    ed_language_helper: "Κενό: η γλώσσα του Home Assistant",
    ed_language_auto: "Αυτόματα",
    ed_navigation_path: "Διαδρομή πλοήγησης",
    err_config: "Ορίστε `area` ή `entities`",
    zoom_in: "Εμφάνιση της πλήρους κάρτας",
    zoom_out: "Επιστροφή στη συμπαγή προβολή",
    ed_zoom: "Κουμπί ζουμ",
    ed_zoom_helper: "Εναλλάσσει τη μίνι κάρτα με την πλήρη κάρτα",
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

// The Intl formats, made once per language and options (a render formats many numbers).
const whIntlCache = new Map();
const whIntl = (Kind, lang, opts) => {
  const key = `${Kind.name}|${lang}|${JSON.stringify(opts)}`;
  let f = whIntlCache.get(key);
  if (!f) whIntlCache.set(key, (f = new Kind(lang, opts)));
  return f;
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
// ── Cost and heating (#107) ──────────────────────────────────────────────────
// The cost section reads the long-term statistics of a dedicated electricity meter (kWh) and a hot-water meter (m³),
// day by day; the heating strip reads today's history of what tells the tank heats, and of the tariff.
const WH_PERIODS = ["day", "week", "month", "year"];
// How often the statistics and the history are read again (ms).
const WH_REFRESH = 5 * 60 * 1000;
// A day with less hot water than this (m³, 1 L) is a standby day: its energy only kept the water hot.
const WH_STANDBY_M3 = 0.001;

// The start of the period holding `now`, and of the one before. `monday`: weeks start on Monday (else Sunday).
const whPeriodStart = (period, now, monday = true) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "day") return [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)];
  if (period === "week") {
    const back = (d.getDay() + (monday ? 6 : 7)) % 7;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7)];
  }
  if (period === "year") return [new Date(d.getFullYear(), 0, 1), new Date(d.getFullYear() - 1, 0, 1)];
  return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() - 1, 1)];
};

// An off-peak state of a tariff sensor: `on` for a binary sensor, else its name (HC, off-peak, heures creuses…).
const WH_OFF_PEAK = /(^|[^a-z])(hc|off_?peak|offpeak|creuses?|low|nt|niedertarif|valle|nacht|night|nuit|dal)([^a-z]|$)/;
const whOffPeak = (id, state) => (id.startsWith("binary_sensor.") ? state === "on" : WH_OFF_PEAK.test(whNorm(state)));

// The spans (ms) during which `test(state)` holds, from a compressed history (`s`, `lu` in seconds), until `end`.
const whSpans = (rows, test, end) => {
  const out = [];
  let from = null;
  for (const r of rows || []) {
    const t = (r.lu ?? r.lc) * 1000;
    const on = test(r.s);
    if (on && from == null) from = t;
    else if (!on && from != null) {
      out.push([from, t]);
      from = null;
    }
  }
  if (from != null) out.push([from, end]);
  return out;
};

// The parts of span `[a, b]` outside every span of `cover`.
const whOutside = ([a, b], cover) => {
  let parts = [[a, b]];
  for (const [c, d] of cover)
    parts = parts.flatMap(([x, y]) =>
      d <= x || c >= y
        ? [[x, y]]
        : [
            [x, c],
            [d, y],
          ].filter(([p, q]) => q > p),
    );
  return parts;
};

// One period's figures from daily statistics rows: kWh, m³, their costs at each day's mean price (else `now`), and
// the standby days (energy but no hot water).
const whTally = (rows, priceE, priceW) => {
  const t = { kwh: 0, m3: 0, eCost: 0, wCost: 0, standbyKwh: 0, standbyCost: 0, standbyDays: 0, days: 0 };
  for (const r of rows) {
    const e = Math.max(0, r.e ?? 0);
    const w = Math.max(0, r.w ?? 0);
    const pe = r.pe ?? priceE;
    const pw = r.pw ?? priceW;
    t.days += r.e != null || r.w != null ? 1 : 0;
    t.kwh += e;
    t.m3 += w;
    t.eCost += pe != null ? e * pe : 0;
    t.wCost += pw != null ? w * pw : 0;
    if (r.w != null && r.e != null && w < WH_STANDBY_M3 && e > 0) {
      t.standbyDays += 1;
      t.standbyKwh += e;
      t.standbyCost += pe != null ? e * pe : 0;
    }
  }
  // The cost of a m³ of hot water: its electricity and its cold water, over the water drawn.
  const metered = rows.some((r) => r.e != null);
  t.perM3 = metered && t.m3 >= WH_STANDBY_M3 && priceE != null && priceW != null ? (t.eCost + t.wCost) / t.m3 : null;
  return t;
};

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
    ed_show_subtitle: "Show subtitle",
    ed_entities: "Entities (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Overrides of the found entities, by role: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Empty: the water heater's name",
    ed_illustration: "Illustrated header",
    ed_illustration_theme: "Header theme",
    ed_theme_auto: "Automatic (follows the theme)",
    ed_theme_day: "Day",
    ed_theme_night: "Night",
    cost: "Cost",
    p_day: "Day",
    p_week: "Week",
    p_month: "Month",
    p_year: "Year",
    per_m3: "per m³ of hot water",
    vs_prev: "{n} vs previous",
    t_electricity: "Electricity",
    t_hot_water: "Hot water",
    t_standby: "Standby",
    day_one: "{n} day",
    day_many: "{n} days",
    no_data: "No data for this period yet",
    heating_today: "Today’s heating",
    peak_time: "{d} at peak rate",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Off-peak",
    lg_heating: "Heating",
    lg_peak: "Peak rate",
    ed_cost: "Cost and heating",
    ed_energy_meter: "Electricity meter",
    ed_energy_meter_helper: "The tank’s own energy meter (kWh, with long-term statistics)",
    ed_water_meter: "Hot water meter",
    ed_water_meter_helper: "The hot water meter (m³ or L, with long-term statistics)",
    ed_energy_price: "Electricity price",
    ed_energy_price_helper: "Per kWh; or a price entity below (dynamic price)",
    ed_energy_price_entity: "Electricity price entity",
    ed_water_price: "Water price",
    ed_water_price_helper: "Cold water, per m³; or a price entity below",
    ed_water_price_entity: "Water price entity",
    ed_cost_period: "Period shown first",
    ed_show_cost: "Cost",
    ed_show_timeline: "Heating strip",
    ed_show_timeline_helper: "Today’s heating over 24 h, with the tariff’s off-peak hours",
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
    ed_show_subtitle: "Afficher le sous-titre",
    ed_entities: "Entités (YAML)",
    solar_share: "{n} % solaire",
    ed_entities_helper: "Remplace les entités trouvées, par rôle : temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vide : le nom du chauffe-eau",
    ed_illustration: "En-tête illustré",
    ed_illustration_theme: "Thème de l’en-tête",
    ed_theme_auto: "Automatique (suit le thème)",
    ed_theme_day: "Jour",
    ed_theme_night: "Nuit",
    cost: "Coût",
    p_day: "Jour",
    p_week: "Semaine",
    p_month: "Mois",
    p_year: "Année",
    per_m3: "le m³ d’eau chaude",
    vs_prev: "{n} vs précédent",
    t_electricity: "Électricité",
    t_hot_water: "Eau chaude",
    t_standby: "Maintien",
    day_one: "{n} jour",
    day_many: "{n} jours",
    no_data: "Pas encore de données sur cette période",
    heating_today: "Chauffe du jour",
    peak_time: "{d} en heures pleines",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Heures creuses",
    lg_heating: "Chauffe",
    lg_peak: "Heures pleines",
    ed_cost: "Coût et chauffe",
    ed_energy_meter: "Compteur électrique",
    ed_energy_meter_helper: "Le compteur d’énergie du ballon (kWh, avec statistiques long terme)",
    ed_water_meter: "Compteur d’eau chaude",
    ed_water_meter_helper: "Le compteur d’eau chaude (m³ ou L, avec statistiques long terme)",
    ed_energy_price: "Prix de l’électricité",
    ed_energy_price_helper: "Par kWh ; ou une entité de prix ci-dessous (prix dynamique)",
    ed_energy_price_entity: "Entité du prix de l’électricité",
    ed_water_price: "Prix de l’eau",
    ed_water_price_helper: "Eau froide, par m³ ; ou une entité de prix ci-dessous",
    ed_water_price_entity: "Entité du prix de l’eau",
    ed_cost_period: "Période affichée d’abord",
    ed_show_cost: "Coût",
    ed_show_timeline: "Frise de chauffe",
    ed_show_timeline_helper: "La chauffe du jour sur 24 h, avec les heures creuses du tarif",
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
    ed_show_subtitle: "Untertitel anzeigen",
    ed_entities: "Entitäten (YAML)",
    solar_share: "{n}% Solar",
    ed_entities_helper: "Ersetzt die gefundenen Entitäten, nach Rolle: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Leer: der Name des Warmwasserspeichers",
    ed_illustration: "Illustrierte Kopfzeile",
    ed_illustration_theme: "Thema der Kopfzeile",
    ed_theme_auto: "Automatisch (folgt dem Design)",
    ed_theme_day: "Tag",
    ed_theme_night: "Nacht",
    cost: "Kosten",
    p_day: "Tag",
    p_week: "Woche",
    p_month: "Monat",
    p_year: "Jahr",
    per_m3: "pro m³ Warmwasser",
    vs_prev: "{n} ggü. vorher",
    t_electricity: "Strom",
    t_hot_water: "Warmwasser",
    t_standby: "Bereitschaft",
    day_one: "{n} Tag",
    day_many: "{n} Tage",
    no_data: "Noch keine Daten für diesen Zeitraum",
    heating_today: "Heizen heute",
    peak_time: "{d} zum Hochtarif",
    dur_min: "{n} Min.",
    dur_h: "{h} Std. {m}",
    lg_off_peak: "Niedertarif",
    lg_heating: "Heizen",
    lg_peak: "Hochtarif",
    ed_cost: "Kosten und Heizen",
    ed_energy_meter: "Stromzähler",
    ed_energy_meter_helper: "Der eigene Energiezähler des Speichers (kWh, mit Langzeitstatistik)",
    ed_water_meter: "Warmwasserzähler",
    ed_water_meter_helper: "Der Warmwasserzähler (m³ oder L, mit Langzeitstatistik)",
    ed_energy_price: "Strompreis",
    ed_energy_price_helper: "Pro kWh; oder unten eine Preis-Entität (dynamischer Preis)",
    ed_energy_price_entity: "Strompreis-Entität",
    ed_water_price: "Wasserpreis",
    ed_water_price_helper: "Kaltwasser, pro m³; oder unten eine Preis-Entität",
    ed_water_price_entity: "Wasserpreis-Entität",
    ed_cost_period: "Zuerst angezeigter Zeitraum",
    ed_show_cost: "Kosten",
    ed_show_timeline: "Heizleiste",
    ed_show_timeline_helper: "Das Heizen heute über 24 h, mit den Niedertarifzeiten",
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
    ed_show_subtitle: "Mostrar subtítulo",
    ed_entities: "Entidades (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Sustituye las entidades encontradas, por función: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vacío: el nombre del calentador",
    ed_illustration: "Encabezado ilustrado",
    ed_illustration_theme: "Tema del encabezado",
    ed_theme_auto: "Automático (sigue el tema)",
    ed_theme_day: "Día",
    ed_theme_night: "Noche",
    cost: "Coste",
    p_day: "Día",
    p_week: "Semana",
    p_month: "Mes",
    p_year: "Año",
    per_m3: "por m³ de agua caliente",
    vs_prev: "{n} vs anterior",
    t_electricity: "Electricidad",
    t_hot_water: "Agua caliente",
    t_standby: "Mantenimiento",
    day_one: "{n} día",
    day_many: "{n} días",
    no_data: "Aún no hay datos para este periodo",
    heating_today: "Calentamiento de hoy",
    peak_time: "{d} en hora punta",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Hora valle",
    lg_heating: "Calentando",
    lg_peak: "Hora punta",
    ed_cost: "Coste y calentamiento",
    ed_energy_meter: "Contador eléctrico",
    ed_energy_meter_helper: "El contador de energía propio del termo (kWh, con estadísticas a largo plazo)",
    ed_water_meter: "Contador de agua caliente",
    ed_water_meter_helper: "El contador de agua caliente (m³ o L, con estadísticas a largo plazo)",
    ed_energy_price: "Precio de la electricidad",
    ed_energy_price_helper: "Por kWh; o una entidad de precio abajo (precio dinámico)",
    ed_energy_price_entity: "Entidad del precio de la electricidad",
    ed_water_price: "Precio del agua",
    ed_water_price_helper: "Agua fría, por m³; o una entidad de precio abajo",
    ed_water_price_entity: "Entidad del precio del agua",
    ed_cost_period: "Periodo mostrado primero",
    ed_show_cost: "Coste",
    ed_show_timeline: "Franja de calentamiento",
    ed_show_timeline_helper: "El calentamiento de hoy en 24 h, con las horas valle de la tarifa",
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
    ed_show_subtitle: "Прикажи поднаслов",
    ed_entities: "Ентитети (YAML)",
    solar_share: "{n}% соларно",
    ed_entities_helper: "Замењује пронађене ентитете, по улози: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Празно: назив бојлера",
    ed_illustration: "Илустровано заглавље",
    ed_illustration_theme: "Тема заглавља",
    ed_theme_auto: "Аутоматски (прати тему)",
    ed_theme_day: "Дан",
    ed_theme_night: "Ноћ",
    cost: "Трошак",
    p_day: "Дан",
    p_week: "Недеља",
    p_month: "Месец",
    p_year: "Година",
    per_m3: "по m³ топле воде",
    vs_prev: "{n} у односу на претходни",
    t_electricity: "Струја",
    t_hot_water: "Топла вода",
    t_standby: "Одржавање",
    day_one: "{n} дан",
    day_few: "{n} дана",
    day_many: "{n} дана",
    no_data: "Још нема података за овај период",
    heating_today: "Данашње грејање",
    peak_time: "{d} по вишој тарифи",
    dur_min: "{n} мин",
    dur_h: "{h} ч {m}",
    lg_off_peak: "Нижа тарифа",
    lg_heating: "Грејање",
    lg_peak: "Виша тарифа",
    ed_cost: "Трошак и грејање",
    ed_energy_meter: "Бројило струје",
    ed_energy_meter_helper: "Сопствено бројило енергије бојлера (kWh, са дугорочном статистиком)",
    ed_water_meter: "Бројило топле воде",
    ed_water_meter_helper: "Бројило топле воде (m³ или L, са дугорочном статистиком)",
    ed_energy_price: "Цена струје",
    ed_energy_price_helper: "По kWh; или ентитет цене испод (динамичка цена)",
    ed_energy_price_entity: "Ентитет цене струје",
    ed_water_price: "Цена воде",
    ed_water_price_helper: "Хладна вода, по m³; или ентитет цене испод",
    ed_water_price_entity: "Ентитет цене воде",
    ed_cost_period: "Период приказан прво",
    ed_show_cost: "Трошак",
    ed_show_timeline: "Трака грејања",
    ed_show_timeline_helper: "Данашње грејање за 24 h, са нижом тарифом",
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
    ed_show_subtitle: "Prikaži podnaslov",
    ed_entities: "Entiteti (YAML)",
    solar_share: "{n}% solarno",
    ed_entities_helper: "Zamenjuje pronađene entitete, po ulozi: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prazno: naziv bojlera",
    ed_illustration: "Ilustrovano zaglavlje",
    ed_illustration_theme: "Tema zaglavlja",
    ed_theme_auto: "Automatski (prati temu)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noć",
    cost: "Trošak",
    p_day: "Dan",
    p_week: "Nedelja",
    p_month: "Mesec",
    p_year: "Godina",
    per_m3: "po m³ tople vode",
    vs_prev: "{n} u odnosu na prethodni",
    t_electricity: "Struja",
    t_hot_water: "Topla voda",
    t_standby: "Održavanje",
    day_one: "{n} dan",
    day_few: "{n} dana",
    day_many: "{n} dana",
    no_data: "Još nema podataka za ovaj period",
    heating_today: "Današnje grejanje",
    peak_time: "{d} po višoj tarifi",
    dur_min: "{n} min",
    dur_h: "{h} č {m}",
    lg_off_peak: "Niža tarifa",
    lg_heating: "Grejanje",
    lg_peak: "Viša tarifa",
    ed_cost: "Trošak i grejanje",
    ed_energy_meter: "Brojilo struje",
    ed_energy_meter_helper: "Sopstveno brojilo energije bojlera (kWh, sa dugoročnom statistikom)",
    ed_water_meter: "Brojilo tople vode",
    ed_water_meter_helper: "Brojilo tople vode (m³ ili L, sa dugoročnom statistikom)",
    ed_energy_price: "Cena struje",
    ed_energy_price_helper: "Po kWh; ili entitet cene ispod (dinamička cena)",
    ed_energy_price_entity: "Entitet cene struje",
    ed_water_price: "Cena vode",
    ed_water_price_helper: "Hladna voda, po m³; ili entitet cene ispod",
    ed_water_price_entity: "Entitet cene vode",
    ed_cost_period: "Period prikazan prvo",
    ed_show_cost: "Trošak",
    ed_show_timeline: "Traka grejanja",
    ed_show_timeline_helper: "Današnje grejanje za 24 h, sa nižom tarifom",
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
    ed_show_subtitle: "Mostra sottotitolo",
    ed_entities: "Entità (YAML)",
    solar_share: "{n}% solare",
    ed_entities_helper: "Sostituisce le entità trovate, per ruolo: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vuoto: il nome dello scaldabagno",
    ed_illustration: "Intestazione illustrata",
    ed_illustration_theme: "Tema dell’intestazione",
    ed_theme_auto: "Automatico (segue il tema)",
    ed_theme_day: "Giorno",
    ed_theme_night: "Notte",
    cost: "Costo",
    p_day: "Giorno",
    p_week: "Settimana",
    p_month: "Mese",
    p_year: "Anno",
    per_m3: "al m³ di acqua calda",
    vs_prev: "{n} vs precedente",
    t_electricity: "Elettricità",
    t_hot_water: "Acqua calda",
    t_standby: "Mantenimento",
    day_one: "{n} giorno",
    day_many: "{n} giorni",
    no_data: "Ancora nessun dato per questo periodo",
    heating_today: "Riscaldamento di oggi",
    peak_time: "{d} in fascia di punta",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Fascia fuori punta",
    lg_heating: "Riscaldamento",
    lg_peak: "Fascia di punta",
    ed_cost: "Costo e riscaldamento",
    ed_energy_meter: "Contatore elettrico",
    ed_energy_meter_helper: "Il contatore di energia dello scaldabagno (kWh, con statistiche a lungo termine)",
    ed_water_meter: "Contatore acqua calda",
    ed_water_meter_helper: "Il contatore dell’acqua calda (m³ o L, con statistiche a lungo termine)",
    ed_energy_price: "Prezzo dell’elettricità",
    ed_energy_price_helper: "Per kWh; oppure un’entità prezzo qui sotto (prezzo dinamico)",
    ed_energy_price_entity: "Entità prezzo elettricità",
    ed_water_price: "Prezzo dell’acqua",
    ed_water_price_helper: "Acqua fredda, per m³; oppure un’entità prezzo qui sotto",
    ed_water_price_entity: "Entità prezzo acqua",
    ed_cost_period: "Periodo mostrato per primo",
    ed_show_cost: "Costo",
    ed_show_timeline: "Striscia di riscaldamento",
    ed_show_timeline_helper: "Il riscaldamento di oggi sulle 24 h, con le fasce fuori punta della tariffa",
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
    ed_show_subtitle: "Ondertitel tonen",
    ed_entities: "Entiteiten (YAML)",
    solar_share: "{n}% zon",
    ed_entities_helper: "Vervangt de gevonden entiteiten, per rol: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Leeg: de naam van de boiler",
    ed_illustration: "Geïllustreerde koptekst",
    ed_illustration_theme: "Thema van de koptekst",
    ed_theme_auto: "Automatisch (volgt het thema)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nacht",
    cost: "Kosten",
    p_day: "Dag",
    p_week: "Week",
    p_month: "Maand",
    p_year: "Jaar",
    per_m3: "per m³ warm water",
    vs_prev: "{n} t.o.v. vorige",
    t_electricity: "Elektriciteit",
    t_hot_water: "Warm water",
    t_standby: "Stand-by",
    day_one: "{n} dag",
    day_many: "{n} dagen",
    no_data: "Nog geen gegevens voor deze periode",
    heating_today: "Verwarmen vandaag",
    peak_time: "{d} tegen piektarief",
    dur_min: "{n} min",
    dur_h: "{h} u {m}",
    lg_off_peak: "Daltarief",
    lg_heating: "Verwarmen",
    lg_peak: "Piektarief",
    ed_cost: "Kosten en verwarmen",
    ed_energy_meter: "Elektriciteitsmeter",
    ed_energy_meter_helper: "De eigen energiemeter van de boiler (kWh, met langetermijnstatistieken)",
    ed_water_meter: "Warmwatermeter",
    ed_water_meter_helper: "De warmwatermeter (m³ of L, met langetermijnstatistieken)",
    ed_energy_price: "Elektriciteitsprijs",
    ed_energy_price_helper: "Per kWh; of hieronder een prijsentiteit (dynamische prijs)",
    ed_energy_price_entity: "Prijsentiteit elektriciteit",
    ed_water_price: "Waterprijs",
    ed_water_price_helper: "Koud water, per m³; of hieronder een prijsentiteit",
    ed_water_price_entity: "Prijsentiteit water",
    ed_cost_period: "Eerst getoonde periode",
    ed_show_cost: "Kosten",
    ed_show_timeline: "Verwarmingsbalk",
    ed_show_timeline_helper: "Het verwarmen van vandaag over 24 u, met de daluren van het tarief",
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
    ed_show_subtitle: "Mostrar subtítulo",
    ed_entities: "Entidades (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Substitui as entidades encontradas, por função: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Vazio: o nome do termoacumulador",
    ed_illustration: "Cabeçalho ilustrado",
    ed_illustration_theme: "Tema do cabeçalho",
    ed_theme_auto: "Automático (segue o tema)",
    ed_theme_day: "Dia",
    ed_theme_night: "Noite",
    cost: "Custo",
    p_day: "Dia",
    p_week: "Semana",
    p_month: "Mês",
    p_year: "Ano",
    per_m3: "por m³ de água quente",
    vs_prev: "{n} vs anterior",
    t_electricity: "Eletricidade",
    t_hot_water: "Água quente",
    t_standby: "Manutenção",
    day_one: "{n} dia",
    day_many: "{n} dias",
    no_data: "Ainda sem dados para este período",
    heating_today: "Aquecimento de hoje",
    peak_time: "{d} em hora de ponta",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Vazio",
    lg_heating: "Aquecimento",
    lg_peak: "Ponta",
    ed_cost: "Custo e aquecimento",
    ed_energy_meter: "Contador de eletricidade",
    ed_energy_meter_helper: "O contador de energia próprio do termoacumulador (kWh, com estatísticas de longo prazo)",
    ed_water_meter: "Contador de água quente",
    ed_water_meter_helper: "O contador de água quente (m³ ou L, com estatísticas de longo prazo)",
    ed_energy_price: "Preço da eletricidade",
    ed_energy_price_helper: "Por kWh; ou uma entidade de preço abaixo (preço dinâmico)",
    ed_energy_price_entity: "Entidade do preço da eletricidade",
    ed_water_price: "Preço da água",
    ed_water_price_helper: "Água fria, por m³; ou uma entidade de preço abaixo",
    ed_water_price_entity: "Entidade do preço da água",
    ed_cost_period: "Período mostrado primeiro",
    ed_show_cost: "Custo",
    ed_show_timeline: "Faixa de aquecimento",
    ed_show_timeline_helper: "O aquecimento de hoje em 24 h, com as horas de vazio da tarifa",
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
    ed_show_subtitle: "Pokaż podtytuł",
    ed_entities: "Encje (YAML)",
    solar_share: "{n}% słoneczna",
    ed_entities_helper: "Zastępuje znalezione encje, według roli: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Puste: nazwa podgrzewacza",
    ed_illustration: "Ilustrowany nagłówek",
    ed_illustration_theme: "Motyw nagłówka",
    ed_theme_auto: "Automatycznie (według motywu)",
    ed_theme_day: "Dzień",
    ed_theme_night: "Noc",
    cost: "Koszt",
    p_day: "Dzień",
    p_week: "Tydzień",
    p_month: "Miesiąc",
    p_year: "Rok",
    per_m3: "za m³ ciepłej wody",
    vs_prev: "{n} vs poprzedni",
    t_electricity: "Prąd",
    t_hot_water: "Ciepła woda",
    t_standby: "Podtrzymanie",
    day_one: "{n} dzień",
    day_few: "{n} dni",
    day_many: "{n} dni",
    no_data: "Brak jeszcze danych dla tego okresu",
    heating_today: "Grzanie dzisiaj",
    peak_time: "{d} w taryfie szczytowej",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Taryfa pozaszczytowa",
    lg_heating: "Grzanie",
    lg_peak: "Taryfa szczytowa",
    ed_cost: "Koszt i grzanie",
    ed_energy_meter: "Licznik prądu",
    ed_energy_meter_helper: "Własny licznik energii zasobnika (kWh, ze statystykami długoterminowymi)",
    ed_water_meter: "Licznik ciepłej wody",
    ed_water_meter_helper: "Licznik ciepłej wody (m³ lub L, ze statystykami długoterminowymi)",
    ed_energy_price: "Cena prądu",
    ed_energy_price_helper: "Za kWh; lub encja ceny poniżej (cena dynamiczna)",
    ed_energy_price_entity: "Encja ceny prądu",
    ed_water_price: "Cena wody",
    ed_water_price_helper: "Zimna woda, za m³; lub encja ceny poniżej",
    ed_water_price_entity: "Encja ceny wody",
    ed_cost_period: "Okres pokazywany najpierw",
    ed_show_cost: "Koszt",
    ed_show_timeline: "Pasek grzania",
    ed_show_timeline_helper: "Dzisiejsze grzanie na 24 h, z godzinami taryfy pozaszczytowej",
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
    ed_show_subtitle: "Afișează subtitlul",
    ed_entities: "Entități (YAML)",
    solar_share: "{n}% solar",
    ed_entities_helper: "Înlocuiește entitățile găsite, după rol: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Gol: numele boilerului",
    ed_illustration: "Antet ilustrat",
    ed_illustration_theme: "Tema antetului",
    ed_theme_auto: "Automat (urmează tema)",
    ed_theme_day: "Zi",
    ed_theme_night: "Noapte",
    cost: "Cost",
    p_day: "Zi",
    p_week: "Săptămână",
    p_month: "Lună",
    p_year: "An",
    per_m3: "pe m³ de apă caldă",
    vs_prev: "{n} față de anterior",
    t_electricity: "Electricitate",
    t_hot_water: "Apă caldă",
    t_standby: "Menținere",
    day_one: "{n} zi",
    day_few: "{n} zile",
    day_many: "{n} de zile",
    no_data: "Încă nu există date pentru această perioadă",
    heating_today: "Încălzirea de azi",
    peak_time: "{d} la tarif de vârf",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Tarif redus",
    lg_heating: "Încălzire",
    lg_peak: "Tarif de vârf",
    ed_cost: "Cost și încălzire",
    ed_energy_meter: "Contor electric",
    ed_energy_meter_helper: "Contorul de energie propriu al boilerului (kWh, cu statistici pe termen lung)",
    ed_water_meter: "Contor de apă caldă",
    ed_water_meter_helper: "Contorul de apă caldă (m³ sau L, cu statistici pe termen lung)",
    ed_energy_price: "Prețul electricității",
    ed_energy_price_helper: "Pe kWh; sau o entitate de preț mai jos (preț dinamic)",
    ed_energy_price_entity: "Entitatea prețului electricității",
    ed_water_price: "Prețul apei",
    ed_water_price_helper: "Apă rece, pe m³; sau o entitate de preț mai jos",
    ed_water_price_entity: "Entitatea prețului apei",
    ed_cost_period: "Perioada afișată prima",
    ed_show_cost: "Cost",
    ed_show_timeline: "Bandă de încălzire",
    ed_show_timeline_helper: "Încălzirea de azi pe 24 h, cu orele cu tarif redus",
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
    ed_show_subtitle: "Vis undertitel",
    ed_entities: "Enheder (YAML)",
    solar_share: "{n}% sol",
    ed_entities_helper: "Erstatter de fundne enheder, efter rolle: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Tom: varmtvandsbeholderens navn",
    ed_illustration: "Illustreret overskrift",
    ed_illustration_theme: "Overskriftens tema",
    ed_theme_auto: "Automatisk (følger temaet)",
    ed_theme_day: "Dag",
    ed_theme_night: "Nat",
    cost: "Omkostning",
    p_day: "Dag",
    p_week: "Uge",
    p_month: "Måned",
    p_year: "År",
    per_m3: "pr. m³ varmt vand",
    vs_prev: "{n} vs forrige",
    t_electricity: "El",
    t_hot_water: "Varmt vand",
    t_standby: "Standby",
    day_one: "{n} dag",
    day_many: "{n} dage",
    no_data: "Endnu ingen data for denne periode",
    heating_today: "Opvarmning i dag",
    peak_time: "{d} til spidslasttarif",
    dur_min: "{n} min",
    dur_h: "{h} t {m}",
    lg_off_peak: "Lavlast",
    lg_heating: "Opvarmning",
    lg_peak: "Spidslast",
    ed_cost: "Omkostning og opvarmning",
    ed_energy_meter: "Elmåler",
    ed_energy_meter_helper: "Beholderens egen energimåler (kWh, med langtidsstatistik)",
    ed_water_meter: "Varmtvandsmåler",
    ed_water_meter_helper: "Varmtvandsmåleren (m³ eller L, med langtidsstatistik)",
    ed_energy_price: "Elpris",
    ed_energy_price_helper: "Pr. kWh; eller en prisentitet nedenfor (dynamisk pris)",
    ed_energy_price_entity: "Elpris-entitet",
    ed_water_price: "Vandpris",
    ed_water_price_helper: "Koldt vand, pr. m³; eller en prisentitet nedenfor",
    ed_water_price_entity: "Vandpris-entitet",
    ed_cost_period: "Periode vist først",
    ed_show_cost: "Omkostning",
    ed_show_timeline: "Opvarmningsbånd",
    ed_show_timeline_helper: "Dagens opvarmning over 24 t, med tariffens lavlasttimer",
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
    ed_show_subtitle: "Visa undertitel",
    ed_entities: "Entiteter (YAML)",
    solar_share: "{n}% sol",
    ed_entities_helper: "Ersätter de hittade entiteterna, per roll: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Tomt: beredarens namn",
    ed_illustration: "Illustrerad rubrik",
    ed_illustration_theme: "Rubrikens tema",
    ed_theme_auto: "Automatiskt (följer temat)",
    ed_theme_day: "Dag",
    ed_theme_night: "Natt",
    cost: "Kostnad",
    p_day: "Dag",
    p_week: "Vecka",
    p_month: "Månad",
    p_year: "År",
    per_m3: "per m³ varmvatten",
    vs_prev: "{n} jmf. föregående",
    t_electricity: "El",
    t_hot_water: "Varmvatten",
    t_standby: "Standby",
    day_one: "{n} dag",
    day_many: "{n} dagar",
    no_data: "Ingen data för den här perioden ännu",
    heating_today: "Uppvärmning i dag",
    peak_time: "{d} på högtaxa",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Lågtaxa",
    lg_heating: "Uppvärmning",
    lg_peak: "Högtaxa",
    ed_cost: "Kostnad och uppvärmning",
    ed_energy_meter: "Elmätare",
    ed_energy_meter_helper: "Tankens egen energimätare (kWh, med långtidsstatistik)",
    ed_water_meter: "Varmvattenmätare",
    ed_water_meter_helper: "Varmvattenmätaren (m³ eller L, med långtidsstatistik)",
    ed_energy_price: "Elpris",
    ed_energy_price_helper: "Per kWh; eller en prisentitet nedan (dynamiskt pris)",
    ed_energy_price_entity: "Elpris-entitet",
    ed_water_price: "Vattenpris",
    ed_water_price_helper: "Kallvatten, per m³; eller en prisentitet nedan",
    ed_water_price_entity: "Vattenpris-entitet",
    ed_cost_period: "Period som visas först",
    ed_show_cost: "Kostnad",
    ed_show_timeline: "Uppvärmningsremsa",
    ed_show_timeline_helper: "Dagens uppvärmning över 24 h, med tariffens lågtaxetimmar",
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
    ed_show_subtitle: "Покажи подзаглавие",
    ed_entities: "Обекти (YAML)",
    solar_share: "{n}% слънчево",
    ed_entities_helper: "Заменя намерените обекти, по роля: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Празно: името на бойлера",
    ed_illustration: "Илюстрирано заглавие",
    ed_illustration_theme: "Тема на заглавието",
    ed_theme_auto: "Автоматично (следва темата)",
    ed_theme_day: "Ден",
    ed_theme_night: "Нощ",
    cost: "Разход",
    p_day: "Ден",
    p_week: "Седмица",
    p_month: "Месец",
    p_year: "Година",
    per_m3: "на m³ топла вода",
    vs_prev: "{n} спрямо предишния",
    t_electricity: "Ток",
    t_hot_water: "Топла вода",
    t_standby: "Поддържане",
    day_one: "{n} ден",
    day_many: "{n} дни",
    no_data: "Все още няма данни за този период",
    heating_today: "Днешно загряване",
    peak_time: "{d} по дневна тарифа",
    dur_min: "{n} мин",
    dur_h: "{h} ч {m}",
    lg_off_peak: "Нощна тарифа",
    lg_heating: "Загряване",
    lg_peak: "Дневна тарифа",
    ed_cost: "Разход и загряване",
    ed_energy_meter: "Електромер",
    ed_energy_meter_helper: "Собственият енергиен брояч на бойлера (kWh, с дългосрочна статистика)",
    ed_water_meter: "Водомер за топла вода",
    ed_water_meter_helper: "Водомерът за топла вода (m³ или L, с дългосрочна статистика)",
    ed_energy_price: "Цена на тока",
    ed_energy_price_helper: "За kWh; или обект за цена по-долу (динамична цена)",
    ed_energy_price_entity: "Обект за цена на тока",
    ed_water_price: "Цена на водата",
    ed_water_price_helper: "Студена вода, за m³; или обект за цена по-долу",
    ed_water_price_entity: "Обект за цена на водата",
    ed_cost_period: "Период, показан първо",
    ed_show_cost: "Разход",
    ed_show_timeline: "Лента на загряването",
    ed_show_timeline_helper: "Днешното загряване за 24 ч, с часовете на нощната тарифа",
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
    ed_show_subtitle: "Показывать подзаголовок",
    ed_entities: "Объекты (YAML)",
    solar_share: "{n}% солнце",
    ed_entities_helper: "Заменяет найденные объекты, по роли: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Пусто: имя водонагревателя",
    ed_illustration: "Иллюстрированный заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматически (следует теме)",
    ed_theme_day: "День",
    ed_theme_night: "Ночь",
    cost: "Стоимость",
    p_day: "День",
    p_week: "Неделя",
    p_month: "Месяц",
    p_year: "Год",
    per_m3: "за м³ горячей воды",
    vs_prev: "{n} к прошлому",
    t_electricity: "Электричество",
    t_hot_water: "Горячая вода",
    t_standby: "Поддержание",
    day_one: "{n} день",
    day_few: "{n} дня",
    day_many: "{n} дней",
    no_data: "Пока нет данных за этот период",
    heating_today: "Нагрев сегодня",
    peak_time: "{d} по пиковому тарифу",
    dur_min: "{n} мин",
    dur_h: "{h} ч {m}",
    lg_off_peak: "Льготный тариф",
    lg_heating: "Нагрев",
    lg_peak: "Пиковый тариф",
    ed_cost: "Стоимость и нагрев",
    ed_energy_meter: "Счётчик электроэнергии",
    ed_energy_meter_helper: "Собственный счётчик энергии бойлера (kWh, с долгосрочной статистикой)",
    ed_water_meter: "Счётчик горячей воды",
    ed_water_meter_helper: "Счётчик горячей воды (m³ или L, с долгосрочной статистикой)",
    ed_energy_price: "Цена электроэнергии",
    ed_energy_price_helper: "За kWh; или объект цены ниже (динамическая цена)",
    ed_energy_price_entity: "Объект цены электроэнергии",
    ed_water_price: "Цена воды",
    ed_water_price_helper: "Холодная вода, за m³; или объект цены ниже",
    ed_water_price_entity: "Объект цены воды",
    ed_cost_period: "Период по умолчанию",
    ed_show_cost: "Стоимость",
    ed_show_timeline: "Полоса нагрева",
    ed_show_timeline_helper: "Нагрев за сегодня на 24 ч, с часами льготного тарифа",
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
    ed_show_subtitle: "Показувати підзаголовок",
    ed_entities: "Об'єкти (YAML)",
    solar_share: "{n}% сонячна",
    ed_entities_helper: "Замінює знайдені об'єкти, за роллю: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Порожньо: назва водонагрівача",
    ed_illustration: "Ілюстрований заголовок",
    ed_illustration_theme: "Тема заголовка",
    ed_theme_auto: "Автоматично (за темою)",
    ed_theme_day: "День",
    ed_theme_night: "Ніч",
    cost: "Вартість",
    p_day: "День",
    p_week: "Тиждень",
    p_month: "Місяць",
    p_year: "Рік",
    per_m3: "за м³ гарячої води",
    vs_prev: "{n} до попереднього",
    t_electricity: "Електрика",
    t_hot_water: "Гаряча вода",
    t_standby: "Підтримання",
    day_one: "{n} день",
    day_few: "{n} дні",
    day_many: "{n} днів",
    no_data: "Ще немає даних за цей період",
    heating_today: "Нагрів сьогодні",
    peak_time: "{d} за піковим тарифом",
    dur_min: "{n} хв",
    dur_h: "{h} год {m}",
    lg_off_peak: "Пільговий тариф",
    lg_heating: "Нагрів",
    lg_peak: "Піковий тариф",
    ed_cost: "Вартість і нагрів",
    ed_energy_meter: "Лічильник електрики",
    ed_energy_meter_helper: "Власний лічильник енергії бойлера (kWh, з довгостроковою статистикою)",
    ed_water_meter: "Лічильник гарячої води",
    ed_water_meter_helper: "Лічильник гарячої води (m³ або L, з довгостроковою статистикою)",
    ed_energy_price: "Ціна електрики",
    ed_energy_price_helper: "За kWh; або об’єкт ціни нижче (динамічна ціна)",
    ed_energy_price_entity: "Об’єкт ціни електрики",
    ed_water_price: "Ціна води",
    ed_water_price_helper: "Холодна вода, за m³; або об’єкт ціни нижче",
    ed_water_price_entity: "Об’єкт ціни води",
    ed_cost_period: "Період за замовчуванням",
    ed_show_cost: "Вартість",
    ed_show_timeline: "Смуга нагріву",
    ed_show_timeline_helper: "Нагрів за сьогодні на 24 год, з годинами пільгового тарифу",
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
    ed_show_subtitle: "Alcím megjelenítése",
    ed_entities: "Entitások (YAML)",
    solar_share: "{n}% nap",
    ed_entities_helper: "Felülírja a talált entitásokat, szerepkör szerint: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Üres: a vízmelegítő neve",
    ed_illustration: "Illusztrált fejléc",
    ed_illustration_theme: "A fejléc témája",
    ed_theme_auto: "Automatikus (a témát követi)",
    ed_theme_day: "Nappal",
    ed_theme_night: "Éjszaka",
    cost: "Költség",
    p_day: "Nap",
    p_week: "Hét",
    p_month: "Hónap",
    p_year: "Év",
    per_m3: "/ m³ meleg víz",
    vs_prev: "{n} az előzőhöz",
    t_electricity: "Áram",
    t_hot_water: "Meleg víz",
    t_standby: "Készenlét",
    day_one: "{n} nap",
    day_many: "{n} nap",
    no_data: "Még nincs adat erre az időszakra",
    heating_today: "Mai fűtés",
    peak_time: "{d} csúcsidőben",
    dur_min: "{n} perc",
    dur_h: "{h} ó {m}",
    lg_off_peak: "Völgyidő",
    lg_heating: "Fűtés",
    lg_peak: "Csúcsidő",
    ed_cost: "Költség és fűtés",
    ed_energy_meter: "Villanyóra",
    ed_energy_meter_helper: "A tároló saját energiamérője (kWh, hosszú távú statisztikával)",
    ed_water_meter: "Melegvízmérő",
    ed_water_meter_helper: "A melegvízmérő (m³ vagy L, hosszú távú statisztikával)",
    ed_energy_price: "Áramár",
    ed_energy_price_helper: "kWh-nként; vagy lent egy ár entitás (dinamikus ár)",
    ed_energy_price_entity: "Áramár entitás",
    ed_water_price: "Vízár",
    ed_water_price_helper: "Hideg víz, m³-enként; vagy lent egy ár entitás",
    ed_water_price_entity: "Vízár entitás",
    ed_cost_period: "Elsőként mutatott időszak",
    ed_show_cost: "Költség",
    ed_show_timeline: "Fűtési sáv",
    ed_show_timeline_helper: "A mai fűtés 24 órán, a tarifa völgyidejével",
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
    ed_show_subtitle: "Zobraziť podnadpis",
    ed_entities: "Entity (YAML)",
    solar_share: "{n}% solár",
    ed_entities_helper: "Nahrádza nájdené entity, podľa role: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prázdne: názov ohrievača",
    ed_illustration: "Ilustrovaná hlavička",
    ed_illustration_theme: "Téma hlavičky",
    ed_theme_auto: "Automaticky (podľa témy)",
    ed_theme_day: "Deň",
    ed_theme_night: "Noc",
    cost: "Náklady",
    p_day: "Deň",
    p_week: "Týždeň",
    p_month: "Mesiac",
    p_year: "Rok",
    per_m3: "za m³ teplej vody",
    vs_prev: "{n} oproti predch.",
    t_electricity: "Elektrina",
    t_hot_water: "Teplá voda",
    t_standby: "Udržiavanie",
    day_one: "{n} deň",
    day_few: "{n} dni",
    day_many: "{n} dní",
    no_data: "Pre toto obdobie zatiaľ nie sú údaje",
    heating_today: "Dnešný ohrev",
    peak_time: "{d} vo vysokej tarife",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Nízka tarifa",
    lg_heating: "Ohrev",
    lg_peak: "Vysoká tarifa",
    ed_cost: "Náklady a ohrev",
    ed_energy_meter: "Elektromer",
    ed_energy_meter_helper: "Vlastný merač energie zásobníka (kWh, s dlhodobými štatistikami)",
    ed_water_meter: "Merač teplej vody",
    ed_water_meter_helper: "Merač teplej vody (m³ alebo L, s dlhodobými štatistikami)",
    ed_energy_price: "Cena elektriny",
    ed_energy_price_helper: "Za kWh; alebo entita ceny nižšie (dynamická cena)",
    ed_energy_price_entity: "Entita ceny elektriny",
    ed_water_price: "Cena vody",
    ed_water_price_helper: "Studená voda, za m³; alebo entita ceny nižšie",
    ed_water_price_entity: "Entita ceny vody",
    ed_cost_period: "Predvolené obdobie",
    ed_show_cost: "Náklady",
    ed_show_timeline: "Pás ohrevu",
    ed_show_timeline_helper: "Dnešný ohrev za 24 h, s hodinami nízkej tarify",
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
    ed_show_subtitle: "Zobrazit podtitul",
    ed_entities: "Entity (YAML)",
    solar_share: "{n}% solár",
    ed_entities_helper: "Nahrazuje nalezené entity, podle role: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prázdné: název ohřívače",
    ed_illustration: "Ilustrované záhlaví",
    ed_illustration_theme: "Motiv záhlaví",
    ed_theme_auto: "Automaticky (podle motivu)",
    ed_theme_day: "Den",
    ed_theme_night: "Noc",
    cost: "Náklady",
    p_day: "Den",
    p_week: "Týden",
    p_month: "Měsíc",
    p_year: "Rok",
    per_m3: "za m³ teplé vody",
    vs_prev: "{n} oproti předch.",
    t_electricity: "Elektřina",
    t_hot_water: "Teplá voda",
    t_standby: "Udržování",
    day_one: "{n} den",
    day_few: "{n} dny",
    day_many: "{n} dní",
    no_data: "Pro toto období zatím nejsou data",
    heating_today: "Dnešní ohřev",
    peak_time: "{d} ve vysokém tarifu",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Nízký tarif",
    lg_heating: "Ohřev",
    lg_peak: "Vysoký tarif",
    ed_cost: "Náklady a ohřev",
    ed_energy_meter: "Elektroměr",
    ed_energy_meter_helper: "Vlastní měřič energie zásobníku (kWh, s dlouhodobými statistikami)",
    ed_water_meter: "Vodoměr teplé vody",
    ed_water_meter_helper: "Vodoměr teplé vody (m³ nebo L, s dlouhodobými statistikami)",
    ed_energy_price: "Cena elektřiny",
    ed_energy_price_helper: "Za kWh; nebo entita ceny níže (dynamická cena)",
    ed_energy_price_entity: "Entita ceny elektřiny",
    ed_water_price: "Cena vody",
    ed_water_price_helper: "Studená voda, za m³; nebo entita ceny níže",
    ed_water_price_entity: "Entita ceny vody",
    ed_cost_period: "Výchozí období",
    ed_show_cost: "Náklady",
    ed_show_timeline: "Pás ohřevu",
    ed_show_timeline_helper: "Dnešní ohřev za 24 h, s hodinami nízkého tarifu",
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
    ed_show_subtitle: "Prikaži podnaslov",
    ed_entities: "Entitete (YAML)",
    solar_share: "{n}% sonce",
    ed_entities_helper: "Nadomesti najdene entitete, po vlogi: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Prazno: ime grelnika",
    ed_illustration: "Ilustrirana glava",
    ed_illustration_theme: "Tema glave",
    ed_theme_auto: "Samodejno (sledi temi)",
    ed_theme_day: "Dan",
    ed_theme_night: "Noč",
    cost: "Strošek",
    p_day: "Dan",
    p_week: "Teden",
    p_month: "Mesec",
    p_year: "Leto",
    per_m3: "na m³ tople vode",
    vs_prev: "{n} glede na prejšnje",
    t_electricity: "Elektrika",
    t_hot_water: "Topla voda",
    t_standby: "Vzdrževanje",
    day_one: "{n} dan",
    day_few: "{n} dni",
    day_many: "{n} dni",
    no_data: "Za to obdobje še ni podatkov",
    heating_today: "Današnje gretje",
    peak_time: "{d} v višji tarifi",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Nižja tarifa",
    lg_heating: "Gretje",
    lg_peak: "Višja tarifa",
    ed_cost: "Strošek in gretje",
    ed_energy_meter: "Števec elektrike",
    ed_energy_meter_helper: "Lastni števec energije bojlerja (kWh, z dolgoročno statistiko)",
    ed_water_meter: "Števec tople vode",
    ed_water_meter_helper: "Števec tople vode (m³ ali L, z dolgoročno statistiko)",
    ed_energy_price: "Cena elektrike",
    ed_energy_price_helper: "Na kWh; ali entiteta cene spodaj (dinamična cena)",
    ed_energy_price_entity: "Entiteta cene elektrike",
    ed_water_price: "Cena vode",
    ed_water_price_helper: "Hladna voda, na m³; ali entiteta cene spodaj",
    ed_water_price_entity: "Entiteta cene vode",
    ed_cost_period: "Privzeto obdobje",
    ed_show_cost: "Strošek",
    ed_show_timeline: "Pas gretja",
    ed_show_timeline_helper: "Današnje gretje v 24 h, z urami nižje tarife",
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
    ed_show_subtitle: "Rādīt apakšvirsrakstu",
    ed_entities: "Entītijas (YAML)",
    solar_share: "{n}% saules",
    ed_entities_helper: "Aizstāj atrastās entītijas, pēc lomas: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Tukšs: ūdens sildītāja nosaukums",
    ed_illustration: "Ilustrēta galvene",
    ed_illustration_theme: "Galvenes motīvs",
    ed_theme_auto: "Automātiski (pēc motīva)",
    ed_theme_day: "Diena",
    ed_theme_night: "Nakts",
    cost: "Izmaksas",
    p_day: "Diena",
    p_week: "Nedēļa",
    p_month: "Mēnesis",
    p_year: "Gads",
    per_m3: "par m³ karstā ūdens",
    vs_prev: "{n} pret iepriekšējo",
    t_electricity: "Elektrība",
    t_hot_water: "Karstais ūdens",
    t_standby: "Uzturēšana",
    day_one: "{n} diena",
    day_many: "{n} dienas",
    no_data: "Šim periodam vēl nav datu",
    heating_today: "Šodienas uzsildīšana",
    peak_time: "{d} maksimuma tarifā",
    dur_min: "{n} min",
    dur_h: "{h} h {m}",
    lg_off_peak: "Zemais tarifs",
    lg_heating: "Uzsildīšana",
    lg_peak: "Maksimuma tarifs",
    ed_cost: "Izmaksas un uzsildīšana",
    ed_energy_meter: "Elektrības skaitītājs",
    ed_energy_meter_helper: "Boilera paša enerģijas skaitītājs (kWh, ar ilgtermiņa statistiku)",
    ed_water_meter: "Karstā ūdens skaitītājs",
    ed_water_meter_helper: "Karstā ūdens skaitītājs (m³ vai L, ar ilgtermiņa statistiku)",
    ed_energy_price: "Elektrības cena",
    ed_energy_price_helper: "Par kWh; vai cenas vienība zemāk (dinamiska cena)",
    ed_energy_price_entity: "Elektrības cenas vienība",
    ed_water_price: "Ūdens cena",
    ed_water_price_helper: "Aukstais ūdens, par m³; vai cenas vienība zemāk",
    ed_water_price_entity: "Ūdens cenas vienība",
    ed_cost_period: "Vispirms rādītais periods",
    ed_show_cost: "Izmaksas",
    ed_show_timeline: "Uzsildīšanas josla",
    ed_show_timeline_helper: "Šodienas uzsildīšana 24 h, ar tarifa zemā tarifa stundām",
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
    ed_show_subtitle: "Εμφάνιση υπότιτλου",
    ed_entities: "Οντότητες (YAML)",
    solar_share: "{n}% ηλιακή",
    ed_entities_helper: "Αντικαθιστά τις οντότητες που βρέθηκαν, ανά ρόλο: temperature, inlet, level, litres, showers, power, energy, heating, boost, away, away_end, error, energy_grid, energy_solar",
    ed_title_helper: "Κενό: το όνομα του θερμοσίφωνα",
    ed_illustration: "Εικονογραφημένη κεφαλίδα",
    ed_illustration_theme: "Θέμα κεφαλίδας",
    ed_theme_auto: "Αυτόματα (ακολουθεί το θέμα)",
    ed_theme_day: "Ημέρα",
    ed_theme_night: "Νύχτα",
    cost: "Κόστος",
    p_day: "Ημέρα",
    p_week: "Εβδομάδα",
    p_month: "Μήνας",
    p_year: "Έτος",
    per_m3: "ανά m³ ζεστού νερού",
    vs_prev: "{n} έναντι προηγ.",
    t_electricity: "Ρεύμα",
    t_hot_water: "Ζεστό νερό",
    t_standby: "Συντήρηση",
    day_one: "{n} ημέρα",
    day_many: "{n} ημέρες",
    no_data: "Δεν υπάρχουν ακόμη δεδομένα για αυτή την περίοδο",
    heating_today: "Θέρμανση σήμερα",
    peak_time: "{d} σε ώρες αιχμής",
    dur_min: "{n} λεπτά",
    dur_h: "{h} ώ {m}",
    lg_off_peak: "Μειωμένο τιμολόγιο",
    lg_heating: "Θέρμανση",
    lg_peak: "Ώρες αιχμής",
    ed_cost: "Κόστος και θέρμανση",
    ed_energy_meter: "Μετρητής ρεύματος",
    ed_energy_meter_helper: "Ο δικός μετρητής ενέργειας του θερμοσίφωνα (kWh, με μακροπρόθεσμα στατιστικά)",
    ed_water_meter: "Μετρητής ζεστού νερού",
    ed_water_meter_helper: "Ο μετρητής ζεστού νερού (m³ ή L, με μακροπρόθεσμα στατιστικά)",
    ed_energy_price: "Τιμή ρεύματος",
    ed_energy_price_helper: "Ανά kWh· ή μια οντότητα τιμής παρακάτω (δυναμική τιμή)",
    ed_energy_price_entity: "Οντότητα τιμής ρεύματος",
    ed_water_price: "Τιμή νερού",
    ed_water_price_helper: "Κρύο νερό, ανά m³· ή μια οντότητα τιμής παρακάτω",
    ed_water_price_entity: "Οντότητα τιμής νερού",
    ed_cost_period: "Περίοδος που εμφανίζεται πρώτη",
    ed_show_cost: "Κόστος",
    ed_show_timeline: "Λωρίδα θέρμανσης",
    ed_show_timeline_helper: "Η σημερινή θέρμανση σε 24 ώρες, με τις ώρες μειωμένου τιμολογίου",
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

  _areaName() {
    const c = this._config;
    return c.area ? (this._hass.areas?.[c.area]?.name ?? c.area) : "";
  }

  // Re-render only when something visible changed.
  _changed(parts) {
    const sig = JSON.stringify([this._config, this._lang(), parts]);
    if (sig === this._sig) return false;
    this._sig = sig;
    return true;
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

const rcBooleans = (...names) => names.map((name) => ({ name, selector: { boolean: {} } }));

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
    preview: false,
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
