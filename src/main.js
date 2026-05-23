const { invoke } = window.__TAURI__.core;

const state = {
  catalog: { platforms: [], genres: [] },
  selectedPlatforms: new Set(),
  selectedGenres: new Set(),
  maxPosition: 10,
  rollCount: 0,
};

const $ = (id) => document.getElementById(id);

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function persist() {
  try {
    await invoke("save_selections", {
      selections: {
        platforms: [...state.selectedPlatforms],
        genres: [...state.selectedGenres],
        max_position: state.maxPosition,
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
    span.textContent = item.name;

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

function paintResult(result) {
  $("result").classList.remove("hidden");
  $("roll-count").textContent = `#${state.rollCount}`;
  $("result-platform").textContent = result.platform.name;
  $("result-genre").textContent = result.genre.name;
  $("result-position").textContent = `#${result.position} de ${state.maxPosition}`;
  $("hint-platform").textContent = result.platform.name;
  $("hint-genre").textContent = result.genre.name;
  $("hint-position").textContent = `nº ${result.position}`;
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
    paintResult(result);
  } catch (e) {
    showError(String(e));
  }
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

async function init() {
  try {
    state.catalog = await invoke("get_catalog");
    const sel = await invoke("load_selections");
    state.selectedPlatforms = new Set(sel.platforms || []);
    state.selectedGenres = new Set(sel.genres || []);
    state.maxPosition = Number.isFinite(sel.max_position) ? sel.max_position : 10;
  } catch (e) {
    showError("No se pudo cargar el catálogo: " + e);
    return;
  }

  const slider = $("max-position");
  slider.value = state.maxPosition;
  $("max-value").textContent = state.maxPosition;
  slider.addEventListener("input", (e) => {
    state.maxPosition = parseInt(e.target.value, 10);
    $("max-value").textContent = state.maxPosition;
    persist();
  });

  renderCheckboxes("platforms-grid", state.catalog.platforms, state.selectedPlatforms);
  renderCheckboxes("genres-grid", state.catalog.genres, state.selectedGenres);

  setupToggles();

  $("roll-button").addEventListener("click", () => {
    state.rollCount = 1;
    doRoll();
  });

  $("reroll-button").addEventListener("click", () => {
    state.rollCount += 1;
    doRoll();
  });

  updateButtonState();
}

init();
