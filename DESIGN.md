# DESIGN.md — EricPay

Sistema visual del prototipo. Inspirado en el logo de Erictech (círculo azul con degradado, punto ámbar, wordmark navy) y el hero de su sitio (navy oscuro, líneas cian brillantes, blanco). No es un clon del sitio — es una identidad propia de EricPay que toma esa paleta y la lleva a una UI de fintech: clara, de uso diario, no una landing corporativa.

Principio: pantallas de uso diario en fondo claro (legibilidad, contraste, se ve como una app de pagos real). El navy oscuro y el degradado se reservan para momentos de marca: login, header del balance, QR a pantalla completa.

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `navy900` | `#0B1436` | Fondos de marca (login, header de balance, pantalla de QR) |
| `navy700` | `#16204F` | Degradado secundario sobre navy900, cards oscuras |
| `blue600` | `#3057FF` | Color primario: botones de acción, links, iconos activos |
| `blue500` | `#4A6BFF` | Hover/estado secundario de blue600 |
| `cyan400` | `#5AD8F0` | Acento de marca — glow, bordes activos, gráficos, nunca texto de cuerpo |
| `yellow300` | `#F6D98F` | Acento cálido — CTA destacado, estado "pendiente", el punto del logo |
| `yellow100` | `#FBF0D6` | Fondo de badge/estado sobre `yellow300` |
| `white` | `#FFFFFF` | Base de UI clara, texto sobre navy |
| `gray50` | `#F7F8FC` | Fondo de pantallas claras |
| `gray100` | `#EEF1F8` | Fondo de cards sobre `gray50` |
| `gray200` | `#E1E5F0` | Bordes, separadores |
| `gray500` | `#6B7280` | Texto secundario |
| `gray900` | `#111827` | Texto primario sobre fondo claro |
| `green500` | `#2FB673` | Éxito — pago completado, saldo recibido |
| `red500` | `#E5484D` | Error — saldo insuficiente, QR inválido, expirado |

Regla de contraste: texto sobre `navy900`/`blue600` siempre `white`. Texto sobre `yellow300`/`yellow100` siempre `navy900` (el amarillo pálido no tiene contraste suficiente con blanco o gris claro).

## Tipografía

**Hanken Grotesk** (Google Fonts, vía `@expo-google-fonts/hanken-grotesk`) en pesos 400/600/700/800. Sustituye a la fuente del sistema de la Fase 0: el rediseño visual aprobado (D-013) la usa en toda la UI y es parte de la identidad. En React Native cada peso es una familia distinta — usar los tokens `fonts.*` de `src/theme/theme.ts`, nunca `fontWeight` sobre texto con fuente custom.

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
- Sombra de card sobre fondo claro: `0 4px 16px rgba(11, 20, 54, 0.08)` — sombra tintada de navy, no gris puro.

## Componentes clave

**Botón primario** — `blue600`, texto blanco, pill, sombra sutil. Es la única acción con este color por pantalla (evita que compitan varios CTA).

**Botón de acento / CTA de marca** (ej. "Contactar", acción destacada en onboarding) — fondo `yellow300`, texto `navy900`. Úsalo con moderación, es el equivalente al botón outline blanco del sitio de Erictech pero resuelto en amarillo pálido para no depender de un fondo oscuro.

**Card de saldo** (home) — fondo degradado `navy900` → `navy700`, monto en `display` blanco, detalle en `cyan400` a modo de acento (p. ej. un ícono o línea decorativa, nunca texto largo).

**Card de QR** — fondo blanco, borde `gray200`, el QR centrado con marco `cyan400` de 2px simulando el "glow" del sitio. Nombre/monto en `title` debajo.

**Badge de estado** — pill pequeño: `pending` = `yellow100` bg / `navy900` texto, `paid`/`completed` = `green500` bg 12% opacidad / `green500` texto, `expired`/`cancelled` = `gray200` bg / `gray500` texto, error = `red500`.

**Item de historial** — fila simple: avatar/inicial circular, nombre + concepto (`body`/`caption`), monto alineado a la derecha en `subtitle` (verde si entra, `gray900` si sale, con signo `+`/`-`).

## Estructura y navegación

Las cuatro pantallas principales (Home, Escanear, QR Personal, Historial) viven en una barra de tabs inferior: fondo blanco, esquinas superiores redondeadas, icono + etiqueta, activo en `blue600`, inactivo en `gray500`. Los flujos (cobrar, pagar, QRs reutilizables) se apilan encima como pantallas de stack.

**Header de marca** (componente `BrandHeader`): degradado horizontal `navy900` → `navy700`, avatar con borde `cyan400` de 2px, wordmark "EricPay" en blanco, campana a la derecha. Presente en Home (con saludo según hora), QR Personal e Historial.

## Dónde se usa el navy oscuro

En: pantalla de login, el header de marca de las pantallas principales, la card de saldo del Home, y las pantallas a pantalla completa de QR (cobro puntual, QR personal, QR reutilizable) y de escaneo (cámara con overlay navy). El cuerpo de Home e Historial y los formularios van sobre `gray50` — un fintech de uso diario no puede ser oscuro en todas partes, cansa y reduce legibilidad de montos y formularios.

## Qué no hacer

- No usar `cyan400` como color de texto de cuerpo sobre blanco — falla contraste (sobre navy sí se permite en frases cortas de acento, como hace el rediseño).
- No poner dos botones `blue600` en la misma pantalla compitiendo por atención.
- No añadir gradientes o el efecto "glow" fuera de los usos de navy listados arriba — si todo brilla, nada destaca.
- No usar `fontWeight` en estilos: con Hanken Grotesk el peso se elige con la familia (`fonts.regular/semibold/bold/extrabold`).
