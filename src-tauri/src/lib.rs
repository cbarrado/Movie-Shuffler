use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha20Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const CATALOG_JSON: &str = include_str!("../resources/data.json");

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Item {
    id: String,
    name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    name_en: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Catalog {
    platforms: Vec<Item>,
    genres: Vec<Item>,
}

#[derive(Serialize, Deserialize, Debug)]
struct Selections {
    #[serde(default)]
    platforms: Vec<String>,
    #[serde(default)]
    genres: Vec<String>,
    #[serde(default = "default_max_position")]
    max_position: u32,
    #[serde(default = "default_lang")]
    lang: String,
}

fn default_max_position() -> u32 {
    10
}

fn default_lang() -> String {
    "es".into()
}

impl Default for Selections {
    fn default() -> Self {
        Self {
            platforms: vec![],
            genres: vec![],
            max_position: default_max_position(),
            lang: default_lang(),
        }
    }
}

fn parse_catalog() -> Result<Catalog, String> {
    serde_json::from_str::<Catalog>(CATALOG_JSON)
        .map_err(|e| format!("Error parsing embedded catalog: {e}"))
}

fn selections_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Could not resolve config dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create config dir: {e}"))?;
    Ok(dir.join("selections.json"))
}

#[tauri::command]
fn get_catalog() -> Result<Catalog, String> {
    parse_catalog()
}

#[tauri::command]
fn load_selections(app: tauri::AppHandle) -> Result<Selections, String> {
    let path = selections_path(&app)?;
    if !path.exists() {
        return Ok(Selections::default());
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("Could not read selections: {e}"))?;
    serde_json::from_str::<Selections>(&text)
        .map_err(|e| format!("Could not parse selections: {e}"))
}

#[tauri::command]
fn save_selections(app: tauri::AppHandle, selections: Selections) -> Result<(), String> {
    let path = selections_path(&app)?;
    let text = serde_json::to_string_pretty(&selections)
        .map_err(|e| format!("Could not serialize selections: {e}"))?;
    fs::write(&path, text).map_err(|e| format!("Could not write selections: {e}"))
}

#[derive(Serialize, Debug)]
struct RollResult {
    platform: Item,
    genre: Item,
    position: u32,
}

#[tauri::command]
fn roll(
    reroll_counter: u32,
    selected_platforms: Vec<String>,
    selected_genres: Vec<String>,
    max_position: u32,
    date: String,
) -> Result<RollResult, String> {
    if selected_platforms.is_empty() {
        return Err("Selecciona al menos una plataforma".into());
    }
    if selected_genres.is_empty() {
        return Err("Selecciona al menos un género".into());
    }
    let max_pos = max_position.max(1);

    let catalog = parse_catalog()?;

    let platforms: Vec<Item> = catalog
        .platforms
        .into_iter()
        .filter(|p| selected_platforms.contains(&p.id))
        .collect();
    let genres: Vec<Item> = catalog
        .genres
        .into_iter()
        .filter(|g| selected_genres.contains(&g.id))
        .collect();

    if platforms.is_empty() {
        return Err("Las plataformas seleccionadas no existen en el catálogo".into());
    }
    if genres.is_empty() {
        return Err("Los géneros seleccionados no existen en el catálogo".into());
    }

    let seed_input = format!("{date}#{reroll_counter}");
    let hash = blake3::hash(seed_input.as_bytes());
    let seed: [u8; 32] = *hash.as_bytes();
    let mut rng = ChaCha20Rng::from_seed(seed);

    let p_idx = rng.gen_range(0..platforms.len());
    let g_idx = rng.gen_range(0..genres.len());
    let position = rng.gen_range(1..=max_pos);

    Ok(RollResult {
        platform: platforms[p_idx].clone(),
        genre: genres[g_idx].clone(),
        position,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_catalog,
            load_selections,
            save_selections,
            roll,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
