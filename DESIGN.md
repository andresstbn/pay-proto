# DESIGN.md — Propi

Sistema visual del producto. Deriva del rebranding aprobado por el cliente (julio 2026): logo Propi (P naranja con pájaro blanco guiñando), paleta cálida naranja/marrón sobre neutros crema, tipografía Hanken Grotesk. Sustituye por completo a la identidad EricPay (navy/cian); no queda ningún uso válido de la paleta anterior.

Principio: pantallas de uso diario en fondo claro cálido (legibilidad, contraste, se ve como una app de pagos real). Los momentos de marca (login, header del balance, QR a pantalla completa) usan el **gradiente de marca** `brown700 → orange500` — el cliente pidió explícitamente conservar los gradientes como elemento de identidad.

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `brown700` | `#964900` | Color primario: botones de acción, links, iconos activos, inicio del gradiente de marca, texto sobre peach |
| `brown500` | `#86522B` | Hover/estado secundario de `brown700` |
| `orange500` | `#FF851B` | Naranja Propi (el del logo): fin del gradiente de marca, acentos fuertes, chips seleccionados |
| `orange400` | `#FFB787` | Acento suave — bordes activos, glow, detalles sobre fondo de marca; nunca texto de cuerpo |
| `peach300` | `#FFBB8B` | Acento cálido — CTA destacado, badges llamativos |
| `peach100` | `#FFDCC7` | Fondo de badge/estado sobre `peach300`, texto suave sobre gradiente |
| `white` | `#FFFFFF` | Base de UI clara, texto sobre marca |
| `gray50` | `#FCF9F8` | Fondo de pantallas claras (surface cálido) |
| `gray100` | `#F0EDED` | Fondo de cards sobre `gray50` |
| `gray200` | `#E5E2E1` | Bordes, separadores |
| `gray500` | `#574236` | Texto secundario (marrón-gris cálido) |
| `gray900` | `#1C1B1B` | Texto primario sobre fondo claro |
| `green500` | `#2FB673` | Éxito — pago completado, saldo recibido |
| `red500` | `#BA1A1A` | Error — saldo insuficiente, QR inválido, expirado |

Regla de contraste: texto sobre `brown700` o sobre el gradiente de marca siempre `white`. Texto sobre `peach300`/`peach100` siempre `brown700` (el peach no tiene contraste suficiente con blanco). No poner texto largo sobre `orange500` puro — solo sobre el gradiente, donde la zona dominante es oscura.

## Logo

`assets/brand/propi-mark.png` (1024×1024, con canal alpha, generado desde el arte original del cliente). La P naranja con el pájaro blanco. Sobre fondos de marca va dentro de una pastilla blanca o directamente sobre crema `#FFF9F2`; nunca sobre naranja plano (se pierde la P). Los iconos de app y splash se generan del mismo vector sobre crema `#FFF9F2`.

## Tipografía

**Hanken Grotesk** (Google Fonts, vía `@expo-google-fonts/hanken-grotesk`) en pesos 400/600/700/800 — se conserva del sistema anterior, también es la tipografía del nuevo branding. En React Native cada peso es una familia distinta — usar los tokens `fonts.*` de `src/theme/theme.ts`, nunca `fontWeight` sobre texto con fuente custom.

| Estilo | Tamaño / peso | Uso |
|---|---|---|
| `display` | 32 / bold | Monto grande (saldo, monto a pagar) |
| `title` | 22 / bold | Encabezado de pantalla |
| `subtitle` | 17 / semibold | Encabezado de card, nombre de sección |
| `body` | 15 / regular | Texto de cuerpo |
| `caption` | 13 / regular | Metadatos: fecha, estado, texto secundario |

## Espaciado y forma

- Escala de espaciado: `4, 8, 12, 16, 24, 32, 48`.
- Radio de borde: `16` en cards, `999` (pill) en botones primarios y badges de estado.
- Sombra de card sobre fondo claro: `0 4px 16px rgba(150, 73, 0, 0.08)` — sombra tintada de marrón, no gris puro.

## Componentes clave

**Botón primario** — `brown700`, texto blanco, pill, sombra sutil. Es la única acción con este color por pantalla (evita que compitan varios CTA).

**Botón de acento / CTA de marca** — fondo `peach300`, texto `brown700`. Úsalo con moderación.

**Card de saldo** (home) — fondo degradado `brown700 → orange500` (el gradiente de marca), monto en `display` blanco, detalle en `orange400`/`peach100` a modo de acento (un ícono o línea decorativa, nunca texto largo).

**Card de QR** — fondo blanco, borde `gray200`, el QR centrado con marco `orange400` de 2px. Nombre/monto en `title` debajo.

**Badge de estado** — pill pequeño: `pending` = `peach100` bg / `brown700` texto, `paid`/`completed` = `green500` bg 12% opacidad / `green500` texto, `expired`/`cancelled` = `gray200` bg / `gray500` texto, error = `red500`.

**Item de historial** — fila simple: avatar/inicial circular, nombre + concepto (`body`/`caption`), monto alineado a la derecha en `subtitle` (verde si entra, `gray900` si sale, con signo `+`/`-`).

## Estructura y navegación

Las cuatro pantallas principales (Home, Escanear, QR Personal, Historial) viven en una barra de tabs inferior: fondo blanco, esquinas superiores redondeadas, icono + etiqueta, activo en `brown700`, inactivo en `gray500`. Los flujos (cobrar, pagar, QRs reutilizables) se apilan encima como pantallas de stack.

**Header de marca** (componente `BrandHeader`): degradado horizontal `brown700 → orange500`, avatar con borde `orange400` de 2px, wordmark "Propi" en blanco, campana a la derecha. Presente en Home (con saludo según hora), QR Personal e Historial.

## Dónde se usa el gradiente de marca

En: pantalla de login, el header de marca de las pantallas principales, la card de saldo del Home, y las pantallas a pantalla completa de QR (cobro puntual, QR personal, QR reutilizable) y de escaneo (cámara con overlay de marca). El cuerpo de Home e Historial y los formularios van sobre `gray50` — una fintech de uso diario no puede ser naranja en todas partes, cansa y reduce legibilidad de montos y formularios.

## Qué no hacer

- No usar `orange400`/`orange500` como color de texto de cuerpo sobre blanco — falla contraste (sobre el gradiente de marca sí se permiten frases cortas de acento).
- No poner dos botones `brown700` en la misma pantalla compitiendo por atención.
- No añadir gradientes fuera de los usos de marca listados arriba — si todo brilla, nada destaca. Los gradientes se conservan, pero solo en momentos de marca.
- No poner el logo sobre naranja plano ni recolorearlo — la P es `orange500` y el pájaro blanco, siempre.
- No usar `fontWeight` en estilos: con Hanken Grotesk el peso se elige con la familia (`fonts.regular/semibold/bold/extrabold`).
