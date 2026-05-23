const { invoke } = window.__TAURI__.core;

const i18n = {
  es: {
    subtitle: "¿Qué peli toca hoy?",
    platforms_title: "Plataformas",
    genres_title: "Géneros",
    select_all_f: "Todas",
    select_none_f: "Ninguna",
    select_all_m: "Todos",
    select_none_m: "Ninguno",
    range_title: "Rango de posición",
    range_label: "Del <b>1</b> al <b>{max}</b>",
    roll_button: "🎲 Tirar dados",
    roll_header: "Tirada <b>#{n}</b> de hoy",
    result_platform: "Plataforma",
    result_genre: "Género",
    result_position: "Posición",
    position_of: "#{n} de {max}",
    hint: "Abre <strong>{platform}</strong>, filtra por <strong>{genre}</strong> y cuenta hasta la peli <strong>nº {position}</strong>.",
    reroll: "↻ Volver a tirar",
    error_load: "No se pudo cargar el catálogo: ",
  },
  en: {
    subtitle: "What movie tonight?",
    platforms_title: "Platforms",
    genres_title: "Genres",
    select_all_f: "All",
    select_none_f: "None",
    select_all_m: "All",
    select_none_m: "None",
    range_title: "Position range",
    range_label: "From <b>1</b> to <b>{max}</b>",
    roll_button: "🎲 Roll the dice",
    roll_header: "Roll <b>#{n}</b> today",
    result_platform: "Platform",
    result_genre: "Genre",
    result_position: "Position",
    position_of: "#{n} of {max}",
    hint: "Open <strong>{platform}</strong>, filter by <strong>{genre}</strong> and count to movie <strong>#{position}</strong>.",
    reroll: "↻ Re-roll",
    error_load: "Could not load catalog: ",
  },
};

const state = {
  catalog: { platforms: [], genres: [] },
  selectedPlatforms: new Set(),
  selectedGenres: new Set(),
  maxPosition: 10,
  rollCount: 0,
  lang: "es",
  lastResult: null,
};

const $ = (id) => document.getElementById(id);

const t = (key, vars = {}) => {
  let s = (i18n[state.lang] && i18n[state.lang][key]) || i18n.es[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
};

const fmt = (template, vars) => {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
};

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function itemName(item) {
  if (state.lang === "en" && item.name_en) return item.name_en;
  return item.name;
}

async function persist() {
  try {
    await invoke("save_selections", {
      selections: {
        platforms: [...state.selectedPlatforms],
        genres: [...state.selectedGenres],
        max_position: state.maxPosition,
        lang: state.lang,
      },
    });
  } catch (e) {
    console.error("Failed to persist selections:", e);
  }
}

function renderCheckboxes(containerId, items, selectedSet) {
  const container = $(containerId);
  container.innerHTML = "";
  for (const item of items) {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    if (selectedSet.has(item.id)) label.classList.add("checked");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = item.id;
    input.checked = selectedSet.has(item.id);
    input.addEventListener("change", () => {
      if (input.checked) {
        selectedSet.add(item.id);
        label.classList.add("checked");
      } else {
        selectedSet.delete(item.id);
        label.classList.remove("checked");
      }
      updateButtonState();
      persist();
    });

    const span = document.createElement("span");
    span.textContent = itemName(item);

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  }
}

function updateButtonState() {
  $("roll-button").disabled =
    state.selectedPlatforms.size === 0 || state.selectedGenres.size === 0;
}

function showError(msg) {
  const el = $("error");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function paintRangeLabel() {
  $("range-label").innerHTML = t("range_label", { max: state.maxPosition });
}

function paintResult() {
  if (!state.lastResult) return;
  const r = state.lastResult;
  $("result").classList.remove("hidden");
  $("roll-header").innerHTML = t("roll_header", { n: state.rollCount });
  $("result-platform").textContent = itemName(r.platform);
  $("result-genre").textContent = itemName(r.genre);
  $("result-position").textContent = t("position_of", {
    n: r.position,
    max: state.maxPosition,
  });
  $("hint").innerHTML = t("hint", {
    platform: itemName(r.platform),
    genre: itemName(r.genre),
    position: r.position,
  });
}

async function doRoll() {
  try {
    const result = await invoke("roll", {
      rerollCounter: state.rollCount - 1,
      selectedPlatforms: [...state.selectedPlatforms],
      selectedGenres: [...state.selectedGenres],
      maxPosition: state.maxPosition,
      date: todayIsoDate(),
    });
    state.lastResult = result;
    paintResult();
  } catch (e) {
    showError(String(e));
  }
}

function applyI18n() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  paintRangeLabel();
  paintResult();

  document.querySelectorAll(".lang-switcher button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });

  renderCheckboxes("platforms-grid", state.catalog.platforms, state.selectedPlatforms);
  renderCheckboxes("genres-grid", state.catalog.genres, state.selectedGenres);
}

function setupToggles() {
  document.querySelectorAll("button[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.toggle;
      const mode = btn.dataset.mode;
      const items =
        target === "platforms" ? state.catalog.platforms : state.catalog.genres;
      const set =
        target === "platforms"
          ? state.selectedPlatforms
          : state.selectedGenres;

      set.clear();
      if (mode === "all") {
        items.forEach((i) => set.add(i.id));
      }

      const containerId = target === "platforms" ? "platforms-grid" : "genres-grid";
      renderCheckboxes(containerId, items, set);
      updateButtonState();
      persist();
    });
  });
}

function setupLangSwitcher() {
  document.querySelectorAll(".lang-switcher button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.lang;
      if (next === state.lang) return;
      state.lang = next;
      applyI18n();
      persist();
    });
  });
}

async function init() {
  try {
    state.catalog = await invoke("get_catalog");
    const sel = await invoke("load_selections");
    state.selectedPlatforms = new Set(sel.platforms || []);
    state.selectedGenres = new Set(sel.genres || []);
    state.maxPosition = Number.isFinite(sel.max_position) ? sel.max_position : 10;
    state.lang = sel.lang === "en" ? "en" : "es";
  } catch (e) {
    showError("Catalog load failed: " + e);
    return;
  }

  const slider = $("max-position");
  slider.value = state.maxPosition;
  slider.addEventListener("input", (e) => {
    state.maxPosition = parseInt(e.target.value, 10);
    paintRangeLabel();
    paintResult();
    persist();
  });

  setupToggles();
  setupLangSwitcher();

  $("roll-button").addEventListener("click", () => {
    state.rollCount = 1;
    doRoll();
  });

  $("reroll-button").addEventListener("click", () => {
    state.rollCount += 1;
    doRoll();
  });

  applyI18n();
  updateButtonState();
}

init();
