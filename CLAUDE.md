# CLAUDE.md — Propi

Guía de trabajo para Claude Code en este repo. Léela antes de tocar código.

## Qué es esto

Propi (antes EricPay): app de pagos por QR. El alcance vigente en cada momento vive en `docs/` — hay
requerimientos funcionales (`docs/RF-*.md`) y specs de implementación (`docs/SPEC/SPEC-*.md`),
numerados en orden. Antes de construir algo, revisa `docs/` para saber qué RF/SPEC está activo
y qué fase del producto corresponde al código actual — no asumas que un RF o SPEC concreto
sigue siendo el vigente sin comprobarlo, cada incremento puede introducir uno nuevo.

No mezcles el alcance de fases distintas: si un RF describe algo que la fase actual del código
todavía no tiene, no lo construyas hasta que exista un incremento que lo pida explícitamente.

## Cómo trabajar aquí

**Prioridad: velocidad y prototipo funcional, no arquitectura especulativa.** No hay que
anticipar escala ni casos de uso que nadie pidió todavía.

- Antes de añadir una librería, pregúntate si la plataforma (Expo/React Native) ya lo resuelve. No añadas dependencias para lo que se hace en pocas líneas.
- Sin abstracciones para "cuando llegue X". Si un incremento futuro lo necesita, se construye en ese incremento, no antes.
- Montos siempre en céntimos enteros, moneda fija. Nunca floats para dinero.
- Sé económico con tokens y tiempo: respuestas cortas, sin resúmenes largos de lo que ya es obvio en el diff. Si el código lo explica, no lo repitas en prosa.

## Git, ramas y commits

- Antes de preparar cambios que vayan a publicarse, crea una rama descriptiva
  desde la rama base actualizada (`feat/*`, `fix/*`, `docs/*` o `chore/*`).
- Nunca hagas commit, push o tag sin autorización explícita del usuario.
- Nunca subas directamente a `main`. Solo se permite como excepción si el
  usuario pide de forma explícita ese destino en el mismo encargo.
- Usa mensajes cortos que describan el qué. Cambios de naturaleza distinta
  (docs, UI, refactor) van en commits separados, no mezclados.
- Antes de subir, ejecuta las validaciones del alcance y confirma que el remoto
  recibirá únicamente la rama de trabajo, sin `--force`.

## Documentación obligatoria

Cada vez que tomes una decisión técnica o de producto no trivial (elegir una librería, cambiar de enfoque, resolver una ambigüedad de la spec), o cada vez que cierres un incremento (una pantalla, un flujo completo, un hito), añade una entrada a [DECISIONS.md](DECISIONS.md). Es un solo archivo, formato ADR, append-only — no lo reescribas, no lo dividas en varios archivos.

No documentes lo obvio (instalar una dependencia estándar, seguir lo que ya dice la spec al pie de la letra). Documenta lo que alguien no podría reconstruir solo leyendo el código: por qué se eligió X sobre Y, qué se dejó fuera y por qué.

## Diseño visual

Sigue [DESIGN.md](DESIGN.md) para colores, tipografía y componentes. No inventes paleta nueva ni sigas el estilo de otra app — ya está definida ahí.

## Copy de la interfaz

La UI se trata como producto terminado, no como prototipo interno. No incluyas avisos tipo "esto es una demo", "saldo ficticio" o similares en pantallas visibles al usuario, aunque por debajo los datos sean simulados — eso se documenta en `docs/` y en DECISIONS.md, no en la interfaz.
