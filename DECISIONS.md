# DECISIONS.md — EricPay

Registro único de decisiones (ADR) e incrementos. Append-only, orden cronológico. No se edita el historial, solo se añade.

Dos tipos de entrada:
- **D-xxx (Decisión):** una elección técnica o de producto no trivial. Contexto → decisión → consecuencias.
- **I-xxx (Incremento):** un hito de construcción cerrado (pantalla, flujo, integración). Qué quedó funcionando.

---

## D-001 — Fase 0 separada de Fase 1

**Fecha:** 2026-07-11
**Contexto:** RF-001 exige Firebase, Google Auth real y monorepo desde el día uno. Eso introduce riesgo (conectividad, OAuth, servicios levantados) para una demo cuyo único objetivo es validar el concepto con Mikel antes de esa inversión.
**Decisión:** Se crea SPEC-001 como Fase 0: un demo desconectado de cualquier backend, mostrable en horas.
**Consecuencias:** El código de Fase 0 no se descarta — la UI y la lógica de flujo se reaprovechan en Fase 1, solo cambia de dónde vienen los datos (store en memoria → Firestore).

## D-002 — Stack: Expo + React Native + TypeScript + Expo Router, un solo proyecto

**Fecha:** 2026-07-11
**Contexto:** RF-001 §16.1 ya fija el stack de la app móvil para Fase 1. No tiene sentido usar un stack distinto en Fase 0 si el código se va a reaprovechar.
**Decisión:** Mismo stack que RF-001, pero sin monorepo — un solo proyecto Expo, porque en Fase 0 no hay backend con el que compartir código.
**Consecuencias:** Migrar a monorepo en Fase 1 es trabajo mecánico conocido, no una decisión pendiente.

## D-003 — Estado en memoria, sin persistencia

**Fecha:** 2026-07-11
**Contexto:** Firebase (Firestore, Cloud Functions, Security Rules) es el backend de Fase 1, pero levantarlo para una demo interna añade dependencia de red y de configuración que puede fallar el día de la reunión.
**Decisión:** Store local en memoria (Zustand o Context+useState). Cada apertura de la app arranca limpia; las reglas de negocio de RF-001 §18 se validan en el cliente, centralizadas en una sola capa de lógica.
**Consecuencias:** Cero dependencia de red — la demo funciona sin wifi. La capa de validaciones se escribe para ser el punto único que luego se traduce a Firebase Security Rules + Cloud Functions en Fase 1.

## D-004 — Login simulado, sin OAuth real

**Fecha:** 2026-07-11
**Contexto:** Configurar Google OAuth (client IDs, consentimiento) solo para una demo interna de un único dispositivo no aporta nada a la validación del concepto y es una fuente extra de fallos el día de la reunión.
**Decisión:** Botones "Continuar como Daniel / Laura" con la estética de un botón de Google, usuarios de demo precargados.
**Consecuencias:** El reemplazo por Google Auth real en Fase 1 es una decisión ya tomada (RF-001 §5), no algo por definir.

## D-005 — Paleta e identidad visual basada en el logo y sitio de Erictech

**Fecha:** 2026-07-11
**Contexto:** No existe un design system previo para EricPay. El usuario prefiere buena apariencia por encima de replicar literalmente el estilo del sitio de Erictech; pidió tomar como base los azules, un amarillo pálido de acento y blanco.
**Decisión:** Ver [DESIGN.md](DESIGN.md) para la paleta y tokens completos. Resumen: navy oscuro como color de marca/headers, azul vivo como acento primario, amarillo pálido como acento de CTA/estado, base de UI clara (blanco/gris muy claro) para las pantallas de uso diario.
**Consecuencias:** Toda pantalla nueva usa estos tokens; no se introduce paleta nueva sin actualizar este documento.

---

## I-001 — Scaffold de documentación para el agente

**Fecha:** 2026-07-11
**Qué quedó funcionando:** CLAUDE.md (reglas de trabajo), DECISIONS.md (este archivo) y DESIGN.md (sistema visual) creados en la raíz del repo. Repo listo para empezar a codear la Fase 0 (SPEC-001) sobre esta base.
