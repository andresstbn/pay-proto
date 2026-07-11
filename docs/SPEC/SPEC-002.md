# SPEC-002 — Migración a backend real (Fase 1, sobre la base de SPEC-001)

## 1. Propósito de este documento

SPEC-001 (Fase 0) demostró las tres modalidades de cobro por QR de principio a fin con estado en memoria y login simulado, sin backend. Este documento define cómo pasar de ese código a un backend real — Firebase Authentication, Cloud Firestore, Cloud Functions y Security Rules — tal como ya preveía RF-001 §16 desde el principio. No es una demo nueva: es la implementación de la Fase 1 que SPEC-001 §9 dejó pendiente para "cuando la reunión valide el concepto".

## 2. Por qué esta migración es un incremento separado

El código de Fase 0 no se descarta — la UI, el sistema de diseño y la lógica de flujo (RF-001 §18) ya están construidos y probados manualmente. Lo que cambia es de dónde vienen los datos. Separar esto en su propio incremento permite:

- Migrar la capa de datos sin tocar pantallas ni el sistema de diseño.
- Traducir las validaciones ya escritas en `src/domain/store.tsx` a Cloud Functions y Security Rules, en vez de redefinirlas desde cero.
- Reestructurar a monorepo justo cuando aparece una segunda pieza (el backend) que lo justifica — no antes.

## 3. Qué NO cambia

- Las pantallas (`app/*`), el sistema de diseño (`src/theme`, `src/components/ui.tsx`) y los tres flujos de cobro por QR.
- Las reglas de negocio de RF-001 §18 (no pagarse a sí mismo, sin saldos negativos, un cobro puntual solo se paga una vez, etc.) — se trasladan de capa, no se redefinen.
- El payload del QR (`{app: 'ericpay', type, id}`) y su validación.
- Los montos en céntimos enteros, moneda `EUR`.

## 4. Criterio de éxito

Esta migración se considera completa cuando la app funciona igual que en la Fase 0 desde la perspectiva del usuario, pero:

1. El login es Google real, no botones simulados.
2. Los saldos y transacciones viven en Firestore, no en memoria — sobreviven a cerrar y reabrir la app.
3. Ningún cliente puede escribir un saldo directamente; solo Cloud Functions, protegidas además por Security Rules.
4. Dos dispositivos distintos ven la actualización de saldo e historial del otro sin recargar manualmente.

## 5. Alcance funcional

### 5.1 Autenticación

Sustituir los botones "Continuar como Daniel/Laura" (D-004) por Firebase Authentication con proveedor de Google (RF-001 §5). Primer login crea el perfil en Firestore con los mismos campos de RF-001 §17.1 y saldo inicial configurable. Los usuarios de demo dejan de estar precargados en código.

### 5.2 Backend

Modelo de datos de RF-001 §17 implementado en Firestore tal cual. La capa de validación única que hoy vive en `src/domain/store.tsx` se traduce a:

- **Cloud Functions** para crear cobros, pagar, y crear/desactivar QRs reutilizables — con la misma atomicidad que ya exige RF-001 §12 (transacciones de Firestore).
- **Firestore Security Rules** como segunda barrera: cada usuario solo lee lo que le corresponde, y ningún cliente escribe saldos directamente.

### 5.3 Tiempo real y persistencia

Listeners de Firestore reemplazan el estado de React como mecanismo de actualización en vivo. La sesión persiste entre aperturas de la app, a diferencia de la Fase 0.

### 5.4 Monorepo

`pnpm workspaces` (RF-001 §16.3) separando app móvil, backend/config de Firebase, y código compartido — este último solo si emerge una necesidad concreta, no de antemano.

## 6. Decisiones técnicas: qué cambia respecto a la Fase 0

| Decisión Fase 0 (SPEC-001) | Decisión Fase 1 (este SPEC) | Motivo |
| --- | --- | --- |
| Login simulado con botones Daniel/Laura | Firebase Authentication con Google | Es el mecanismo real que RF-001 §5 siempre pidió; Fase 0 lo pospuso para ir rápido a la demo |
| Estado en memoria (`StoreProvider` con Context) | Cloud Firestore como fuente de verdad | Necesario para persistencia real y para que dos dispositivos vean la misma información |
| Validaciones en cliente, una sola capa en `store.tsx` | Cloud Functions + Firestore Security Rules | El cliente ya no puede ser la única barrera si los datos son reales |
| Un solo proyecto Expo | `pnpm workspaces` (app + backend + compartido) | Recién ahora hay una segunda pieza (el backend) con la que separar código |
| Sin persistencia entre sesiones | Sesión persistente vía Firebase Auth | Ya no es una demo de una sola sesión |

## 7. Qué se reutiliza vs. qué se reemplaza del código de Fase 0

**Se reutiliza sin cambios de fondo:** pantallas (`app/*`), tema y componentes (`src/theme`, `src/components/ui.tsx`), el payload y la validación del QR, las reglas de negocio de RF-001 §18 (ya verificadas manualmente en Fase 0).

**Se reemplaza:** `src/domain/store.tsx` (Context en memoria) por el SDK de Firestore + llamadas a Cloud Functions; `app/login.tsx` (botones simulados) por el flujo de Google Sign-In; los usuarios de demo hardcodeados por altas reales en el primer login.

## 8. Riesgos y mitigaciones

- **Reescribir de más:** el riesgo principal de esta migración es tratarla como una reescritura completa en vez de un reemplazo quirúrgico de la capa de datos. Mitigación: si una pantalla no necesita cambiar para hablar con Firestore en vez de con el Context, no se toca.
- **Reglas de negocio duplicadas y divergentes:** traducir RF-001 §18 a Cloud Functions/Security Rules sin dejar rastro de por qué cada regla existe. Mitigación: cada regla ya tiene su mensaje de error y su condición en `store.tsx` — se traduce 1 a 1, no se reinterpreta.
- **Persistencia real expone datos de la Fase 0:** los usuarios "Daniel" y "Laura" hardcodeados no deben migrarse como si fueran cuentas reales. Mitigación: Firestore arranca vacío; esos usuarios solo existían en memoria y no tienen equivalente que migrar.

## 9. Qué pasa después

Fuera de alcance de este SPEC, igual que en RF-001 §19: dinero real, integraciones bancarias, tarjetas, SEPA, criptomonedas, Apple/Google Pay, múltiples monedas, comisiones, KYC/AML, panel administrativo, notificaciones push, publicación obligatoria en tiendas. Esta migración no amplía el alcance funcional de RF-001 — solo cambia dónde vive el estado.
