# Movie-Shuffler — Plan de implementación

App de escritorio (Windows + macOS) que selecciona al azar una plataforma de streaming, un género y una posición 1–10, para que el usuario decida qué peli ver hoy sin más vueltas.

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Stack | **Tauri 2 (Rust + HTML/CSS/JS vanilla)** |
| OS objetivo | Windows + macOS |
| Idioma UI | Español |
| Datos plataformas/géneros | **Hardcoded en JSON estático** dentro del binario, investigados una vez |
| Significado del número | Posición al hacer scroll dentro del género filtrado en la plataforma (el usuario cuenta hasta la fila N) |
| Rango del número | **Configurable con slider**, valor por defecto `1–10`. El slider controla el máximo (`max`), el mínimo es siempre `1`. Rango del slider: 1–20. |
| Aleatoriedad | **Seed basada en fecha (YYYY-MM-DD) + contador de re-roll** → determinístico por día, re-roll determinístico también |
| Persistencia | Sí, JSON local con las selecciones del usuario (incluido el valor del slider) |
| Re-roll | Sí, con contador visible en la UI (`tirada #2`, `#3`, ...) |
| Historial / evitar repetir | No, repetir está permitido (la fecha ya da variedad) |
| Distribución | **Windows + macOS desde el día 1**, builds vía GitHub Actions |

---

## 2. Stack: por qué Tauri

Tu propuesta original era Rust, y para esta app **Tauri encaja**:

- **Binario ~5 MB**, frente a ~80 MB de Electron. Sin Chromium embebido — usa el WebView nativo del SO (WebView2 en Windows, WKWebView en macOS).
- **Una sola base de código** sirve para Win + Mac.
- **Backend en Rust** para la lógica de seed/random y persistencia, **frontend en HTML/CSS/JS vanilla** (no hace falta React para esto — sería over-engineering).
- Build cross-platform vía GitHub Actions cuando llegue el momento (necesitas un Mac o un runner de GH para el binario `.dmg`/`.app`).

**Alternativa descartada:** Electron sería más simple en JS-puro, pero el binario y la huella de memoria no compensan para una app de un solo botón. Web app pura era tentadora pero pierdes la persistencia tipo "app instalada".

### Versiones del stack

- Rust 1.93 ✅ (instalado)
- Node 20.20 ✅ (instalado)
- npm 11.13 ✅ (instalado)
- Tauri CLI ❌ (pendiente: `cargo install tauri-cli --version "^2.0"`)
- En macOS necesitarás Xcode Command Line Tools (`xcode-select --install`) para compilar allí

---

## 3. Datos investigados

### 3.1 Plataformas de streaming en España (mayo 2026)

Investigación cruzada de Xataka, Diario de León, Enterat y rincondego.com:

**Internacionales con presencia fuerte en ES:**
1. Netflix
2. Amazon Prime Video
3. Disney+
4. HBO Max
5. Apple TV+
6. SkyShowtime
7. Rakuten TV

**Españolas / locales:**
8. Movistar Plus+
9. Filmin
10. Atresplayer Premium
11. RTVE Play (gratis)
12. mitele PLUS
13. FlixOlé

→ Lista inicial del JSON: las 13 anteriores. Trivial de editar después.

### 3.2 Géneros comunes

He cruzado los catálogos públicos de Netflix, Prime Video, Disney+, HBO Max, Movistar+ y Filmin. **Géneros presentes en (casi) todas:**

1. Acción
2. Aventura
3. Animación
4. Bélico
5. Ciencia ficción
6. Comedia
7. Crimen
8. Documental
9. Drama
10. Familiar
11. Fantasía
12. Histórico
13. Misterio
14. Musical
15. Romance / Romántica
16. Suspense (Thriller)
17. Terror
18. Western

→ Estos son los géneros del JSON. Cubren la intersección razonable. Western/Musical son los más "frontera" — Disney+ los tiene escondidos pero existen.

---

## 4. Algoritmo del random

```
seed_input = "YYYY-MM-DD" + "#" + reroll_counter
seed = blake3(seed_input)   // o cualquier hash determinístico
rng = ChaCha20Rng::from_seed(seed)

plataforma = rng.choose(plataformas_seleccionadas)
genero     = rng.choose(generos_seleccionados)
posicion   = rng.gen_range(1..=max_posicion)   // max_posicion controlado por el slider, default 10
```

- **Mismo día, mismo contador → mismo resultado.** Determinístico.
- **Re-roll incrementa el contador**, mostrado en la UI ("Tirada #2 de hoy").
- Si al día siguiente abres la app, el contador se resetea a 0 y vuelve a salir la "peli del día".
- Crate `rand` + `rand_chacha` (RNG determinístico, no `thread_rng()`).

---

## 5. UI (boceto)

```
┌─────────────────────────────────────────────────┐
│  Movie-Shuffler                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  PLATAFORMAS                                    │
│  [✓] Netflix      [✓] Prime Video               │
│  [✓] Disney+      [ ] HBO Max                   │
│  [ ] Apple TV+    [ ] Movistar+                 │
│  [ ] Filmin       [ ] SkyShowtime               │
│  [ ] Rakuten TV   [ ] Atresplayer               │
│  [ ] RTVE Play    [ ] mitele PLUS               │
│  [ ] FlixOlé                                    │
│                                                 │
│  GÉNEROS                                        │
│  [✓] Acción       [✓] Aventura                  │
│  [✓] Comedia      [ ] Drama                     │
│  ...                                            │
│                                                 │
│  RANGO DE POSICIÓN                              │
│  Del 1 al [ 10 ]                                │
│  1 ●━━━━━━━━━○━━━━━━━━━ 20                      │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │       🎬  TIRAR DADOS                     │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─────── RESULTADO (Tirada #1) ────────────┐   │
│  │  Plataforma:  Netflix                    │   │
│  │  Género:      Comedia                    │   │
│  │  Posición:    #7  (de 10)                │   │
│  │                                          │   │
│  │  → Abre Netflix, filtra por Comedia,     │   │
│  │    cuenta hasta la 7ª película.          │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  [ Re-roll ]                                    │
└─────────────────────────────────────────────────┘
```

- HTML/CSS minimalista, sin frameworks. Posible un toque de CSS variables para tema.
- Slider HTML nativo (`<input type="range" min="1" max="20" value="10">`) con el valor mostrado al lado.
- Botón `Re-roll` aparece solo después de la primera tirada.
- Indicador visible "Tirada #N" para que sepas si estás viendo la del día o ya re-roleada.

---

## 6. Estructura del proyecto

```
C:\Git\Movie-Shuffler\
├── PLAN.md                       (este archivo)
├── README.md                     (futuro)
├── package.json                  (dev deps de Tauri)
├── src-tauri\
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── icons\
│   ├── src\
│   │   ├── main.rs               (entry point)
│   │   ├── data.rs               (carga JSON estático)
│   │   ├── random.rs             (seed + sorteo)
│   │   └── storage.rs            (persistir selecciones)
│   └── resources\
│       └── data.json             (plataformas + géneros)
├── src\                          (frontend)
│   ├── index.html
│   ├── styles.css
│   └── app.js                    (vanilla JS, llama a comandos Tauri)
└── .github\
    └── workflows\
        └── release.yml           (build cross-platform — fase 2)
```

---

## 7. Plan de implementación por fases

### Fase 1 — Scaffold (30 min)
1. `cargo install tauri-cli --version "^2.0"`
2. `npm create tauri-app@latest` con plantilla `vanilla` + `vanilla-ts` (elegir vanilla JS).
3. Verificar `npm run tauri dev` arranca una ventana.
4. Commit inicial.

### Fase 2 — Datos estáticos
1. Crear `src-tauri/resources/data.json` con plataformas + géneros (sección 3).
2. Comando Tauri `get_catalog() -> { platforms, genres }`.
3. Frontend pinta los checkboxes leyendo del comando.

### Fase 3 — Selecciones + persistencia
1. Comandos Tauri `load_selections()` / `save_selections(platforms, genres)`.
2. Guardar en `tauri::api::path::app_config_dir()` (cross-platform).
3. Frontend persiste cada cambio de checkbox.

### Fase 4 — Slider del rango de posición
1. `<input type="range">` en el HTML con `min=1 max=20 value=10`.
2. Mostrar el valor actual al lado del slider en vivo (`Del 1 al N`).
3. Persistir el valor junto a las selecciones (Fase 3).

### Fase 5 — Random determinístico
1. Crates `rand = "0.8"`, `rand_chacha = "0.3"`, `blake3 = "1"` en `Cargo.toml`.
2. Comando `roll(reroll_counter: u32, max_position: u32) -> { platform, genre, position }`.
3. Frontend: botón "Tirar dados" → llama `roll(0, slider_value)`, muestra resultado.
4. Botón "Re-roll" incrementa contador local y vuelve a llamar.
5. Mostrar "Tirada #N" y "Posición #X de N" visibles.

### Fase 6 — Pulido UI
1. CSS limpio (tipografía, espaciado, dark mode opcional).
2. Validar mínimo 1 plataforma + 1 género antes de habilitar el botón.
3. Icono de la app: **dos dados** (símbolo universal de azar). Genero un SVG simple → exporto a los tamaños que Tauri necesita (`icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`, `128x128@2x.png`) con `tauri icon icon.png`.

### Fase 7 — Distribución cross-platform (GitHub Actions)
1. `git init` + repo en GitHub (privado o público).
2. Workflow `.github/workflows/release.yml` con matrix:
   - `windows-latest` → `.msi`
   - `macos-latest` → `.dmg` (universal binary: Intel + Apple Silicon)
3. Trigger por tag `v*` → crea release con ambos artefactos adjuntos.
4. Tu amigo descarga el `.dmg` de la página de Releases.
5. Sin firma de código la primera vez:
   - Windows: SmartScreen avisará → "Más información" → "Ejecutar de todos modos".
   - macOS: avisará de desarrollador no identificado → click-derecho sobre la app → "Abrir" → confirmar. **O** ejecutar `xattr -cr Movie-Shuffler.app` desde Terminal.
6. Si más adelante quieres quitar los avisos: 99 USD/año Apple Developer + ~100€/año cert Windows (probablemente no merece la pena para uso personal).

---

## 8. Qué tienes ya / qué falta

| Necesario | Estado |
|---|---|
| Rust + Cargo | ✅ Instalado (1.93) |
| Node + npm | ✅ Instalado (20.20 / 11.13) |
| Directorio del proyecto | ✅ `C:\Git\Movie-Shuffler` vacío |
| Tauri CLI | ❌ Falta: `cargo install tauri-cli --version "^2.0"` |
| Build target Windows | ✅ Tu propio Windows lo compila |
| Build target macOS | ✅ Vía GitHub Actions (`macos-latest`). Gratis para repos públicos; 2000 min/mes gratis para privados. |
| Cuenta GitHub | ✅ `cbarrado` autenticado con scopes `repo` + `workflow` |
| Icono de la app | ⚠️ Por generar — dos dados (azar), SVG → PNG → `tauri icon` en Fase 6 |
| Repo git local | ⚠️ `Movie-Shuffler` no es repo aún (`git init` en Fase 1) |

---

## 9. Preguntas abiertas / decisiones a tomar más tarde

Ninguna pendiente — todas las decisiones de scope están cerradas. Detalles menores (color del tema, dark mode, copy exacto de los textos) se deciden mientras se implementa la Fase 6.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El usuario filtra por género y la plataforma muestra <10 películas | Aviso visual en el resultado: "Si el género tiene menos de 10 pelis, cuenta hasta donde llegue y vuelve al principio." Opcional: pedir al usuario que confirme el rango max. |
| Los géneros que hardcodeo no se llaman igual en cada plataforma (Netflix dice "Suspense", HBO dice "Thriller") | En el JSON, cada género tiene `display_name` ES + un campo `aliases` con cómo se llama en cada plataforma — pero como el usuario hace el match visualmente, basta con el `display_name`. |
| Las plataformas cambian su catálogo de géneros | Editas el `data.json` y recompilas (10 segundos). O lo movemos a archivo externo si te molesta recompilar. |
| Distribución sin firma genera avisos del SO | Aceptable para uso personal; si lo distribuyes, cuesta ~100€/año el cert de Windows + 99 USD/año de Apple Developer. |

---

## Siguiente paso

Si estás conforme con todo, dilo y arranco la **Fase 1 (scaffold)**. Si quieres ajustar algo antes —idioma, géneros, alcance macOS, lo que sea— me lo dices y actualizo este mismo archivo.
