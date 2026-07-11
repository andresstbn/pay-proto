# CLAUDE.md — EricPay

Guía de trabajo para Claude Code en este repo. Léela antes de tocar código.

## Qué es esto

EricPay: prototipo de pagos simulados por QR. Dos specs, dos fases:

- [docs/SPEC/SPEC-001.md](docs/SPEC/SPEC-001.md) — **Fase 0, la que se construye ahora.** Demo ultrarrápida, un solo proyecto Expo, sin Firebase, sin monorepo, sin persistencia. Objetivo: mostrable en horas.
- [docs/RF-001.md](docs/RF-001.md) — Fase 1, prototipo completo (Firebase, Google Auth, monorepo). No se toca hasta que la Fase 0 se valide en la demo con Mikel.

No mezcles fases. Si algo de RF-001 no está en SPEC-001 (Firebase, monorepo, Google Auth real), no lo construyas todavía.

## Cómo trabajar aquí

**Prioridad: velocidad y prototipo funcional, no arquitectura.** Este código se descarta o se reemplaza en la Fase 1 — no hay usuarios reales, no hay dinero real, no hay que anticipar escalabilidad.

- Un solo proyecto Expo (React Native + TypeScript + Expo Router). Nada de monorepo, nada de paquetes compartidos.
- Estado en memoria (store simple: Zustand o Context+useState, lo que sea menos código). Sin backend, sin API, sin persistencia entre sesiones.
- Montos siempre en céntimos enteros, moneda `EUR` fija. Nunca floats para dinero.
- Antes de añadir una librería, pregúntate si Expo/React Native ya lo resuelve. No añadas dependencias para lo que se hace en pocas líneas.
- Sin abstracciones para "cuando llegue Firebase". Eso se reescribe en Fase 1; no lo prepares ahora.
- Sé económico con tokens y tiempo: respuestas cortas, sin resúmenes largos de lo que ya es obvio en el diff. Si el código lo explica, no lo repitas en prosa.

## Commits

Sin restricciones: haz commit cuando termines un incremento con sentido (una pantalla, un flujo, una decisión aplicada). No pidas permiso para commitear. Mensajes cortos, en español, describiendo el qué.

## Documentación obligatoria

Cada vez que tomes una decisión técnica o de producto no trivial (elegir una librería, cambiar de enfoque, resolver una ambigüedad de la spec), o cada vez que cierres un incremento (una pantalla, un flujo completo, un hito), añade una entrada a [DECISIONS.md](DECISIONS.md). Es un solo archivo, formato ADR, append-only — no lo reescribas, no lo dividas en varios archivos.

No documentes lo obvio (instalar una dependencia estándar, seguir lo que ya dice la spec al pie de la letra). Documenta lo que alguien no podría reconstruir solo leyendo el código: por qué se eligió X sobre Y, qué se dejó fuera y por qué.

## Diseño visual

Sigue [DESIGN.md](DESIGN.md) para colores, tipografía y componentes. No inventes paleta nueva ni sigas el estilo de otra app — ya está definida ahí.

## Referencias rápidas

- Pantallas mínimas requeridas: SPEC-001 §5 (mismo listado que RF-001 §15).
- Reglas de negocio (no pagarse a sí mismo, sin saldos negativos, etc.): RF-001 §18 — aplican igual en Fase 0, solo que validadas en cliente en vez de backend.
- Guion de demo (para saber qué flujo priorizar si hay que recortar): SPEC-001 §7.
