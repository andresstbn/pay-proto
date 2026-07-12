# Mapa de producto y documentación — EricPay

Este índice separa el alcance pedido, las decisiones tomadas y la evidencia de
que un incremento quedó realmente operativo. La numeración es acumulativa: una
SPEC posterior puede ampliar o reemplazar parte de una anterior sin borrar su
historial.

## Cómo leer la documentación

- [`RF-001`](RF-001.md) define los requisitos base del prototipo.
- `SPEC-xxx` define el alcance y los criterios de aceptación de una fase o
  funcionalidad.
- `D-xxx` en [`DECISIONS.md`](../DECISIONS.md) registra una decisión técnica o
  de producto no trivial.
- `I-xxx` en [`DECISIONS.md`](../DECISIONS.md) cierra un incremento e indica qué
  quedó funcionando y cómo se verificó.
- [`README.md`](../README.md) contiene la operación local, Firebase y EAS.
- [`DESIGN.md`](../DESIGN.md) es la fuente de verdad visual.

## Estado de los incrementos

| SPEC | Incremento | Estado | Dependencias | Verificación |
| --- | --- | --- | --- | --- |
| [SPEC-001](SPEC/SPEC-001.md) — Demo ultrarrápida, Fase 0 | `I-002` | Cerrado · histórico | `RF-001`, `D-001` a `D-006` | Tres modalidades QR demostradas con estado local; sustituido por la Fase 1. |
| [SPEC-002](SPEC/SPEC-002.md) — Backend real, Fase 1 | `I-003` | Cerrado · operativo | `SPEC-001`, `RF-001`, `D-008` a `D-010` | Firebase Auth, Firestore, Functions y sesión persistente integrados. |
| [SPEC-003](SPEC/SPEC-003.md) — Dashboard administrativo | `I-004` | Implementado · acceso condicionado | `SPEC-002`, `D-018` | Build de Functions y política de claim administrativo probados; el uso requiere `admin: true`. |
| [SPEC-004](SPEC/SPEC-004.md) — Acceso social y grupos | `I-005`, `I-006`, `I-007` | Parcialmente operativo | `SPEC-002`, `D-016`, `D-017`, `D-019`, clientes OAuth y EAS | Backend: 21/21 tests y 5/5 reglas; producción: 22 Functions activas y 5 índices `READY`; móvil: 61/61 tests. OAuth móvil sigue pendiente de aprovisionamiento y prueba E2E. |

## Incremento vigente

La evolución vigente es [`SPEC-004`](SPEC/SPEC-004.md):

- **Operativo:** grupos privados, reparto atómico, reglas e índices desplegados.
- **Implementado y probado automáticamente:** exportación del QR personal y del
  QR abierto de grupo como PNG; queda por registrar la comprobación manual
  completa de la hoja nativa y la galería.
- **Implementado pero no cerrado:** Google, Facebook y Apple en móvil.
- **Pendiente para cerrar OAuth móvil:** registrar las apps nativas y sus
  clientes OAuth, configurar los identificadores públicos, recuperar acceso al
  proyecto EAS, generar development builds y completar una prueba E2E en
  dispositivos reales.

## Regla de actualización

1. Antes de implementar, identificar aquí la SPEC vigente y sus dependencias.
2. Añadir una entrada `D-xxx` cuando una decisión cambie el enfoque o el criterio
   de cierre.
3. Añadir una entrada `I-xxx` solo cuando el incremento tenga evidencia de
   verificación; código escrito no equivale por sí solo a funcionalidad
   operativa.
4. Actualizar esta tabla y el estado de la SPEC sin reescribir el historial de
   [`DECISIONS.md`](../DECISIONS.md).
5. Mantener pasos de credenciales y despliegue en [`README.md`](../README.md),
   nunca valores sensibles dentro del repositorio.
