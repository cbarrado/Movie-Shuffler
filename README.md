# Movie Shuffler

App de escritorio (Windows + macOS) que decide por ti qué peli ver hoy. Sorteo determinístico por fecha: plataforma + género + posición.

## Cómo funciona

1. Marca las plataformas de streaming que tienes contratadas.
2. Marca los géneros que te apetecen.
3. Ajusta el rango de posición (por defecto 1–10).
4. Pulsa **Tirar dados**.
5. La app te dice: una plataforma, un género y una posición *N*. Tú abres esa plataforma, filtras por ese género, y eliges la peli número *N* de la lista que veas.

Mismo día = mismo resultado. Si no te gusta, **Volver a tirar** da otra opción (también determinística, pero distinta).

## Descargar

Las versiones compiladas para Windows (`.msi`) y macOS (`.dmg`, universal Intel + Apple Silicon) están en la sección [Releases](../../releases) de este repo.

### macOS — primera apertura

macOS marcará la app como "de desarrollador no identificado" (no está firmada). Para abrirla:

- Click-derecho sobre `Movie Shuffler.app` → **Abrir** → confirmar en el diálogo.
- O en Terminal: `xattr -cr /Applications/Movie\ Shuffler.app`

Solo hace falta hacerlo una vez.

### Windows — primera apertura

SmartScreen avisará: **Más información** → **Ejecutar de todos modos**.

## Desarrollo local

Requisitos: Rust ≥1.77, Node ≥20.

```bash
npm install
npm run tauri dev
```

Para generar binarios de tu plataforma:

```bash
npm run tauri build
```

## Stack

- [Tauri 2](https://tauri.app/) — backend Rust + frontend webview nativo
- Frontend vanilla HTML/CSS/JS (sin frameworks)
- `rand_chacha` + `blake3` para seed determinística por fecha

## Estructura

```
src/                  Frontend (index.html, main.js, styles.css)
src-tauri/
  src/lib.rs          Comandos Tauri (get_catalog, load_selections, save_selections, roll)
  resources/data.json Plataformas + géneros
  icons/              Icono de la app
.github/workflows/    Pipeline de release (matrix Windows + macOS)
PLAN.md               Plan de implementación con todas las decisiones
```
