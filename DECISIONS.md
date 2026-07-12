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

## D-006 — Estado en memoria con Context + useReducer, sin librería externa

**Fecha:** 2026-07-11
**Contexto:** D-003 fija "estado en memoria" pero no la implementación. Con un solo proyecto Expo y sin backend, una librería de estado (Zustand, Redux) es una dependencia nueva para resolver algo que React ya resuelve con Context.
**Decisión:** Un único `StoreProvider` (`src/domain/store.tsx`) con `useState` + un `useRef` como snapshot síncrono. Las validaciones de negocio (RF-001 §18) viven como funciones puras `(State, args) => State` que lanzan `DomainError` con el mensaje que ve el usuario — es la "sola capa de validación" que pide SPEC-001 §6.
**Consecuencias:** `setState` con función updater no garantiza ejecución síncrona del updater (optimización interna de React), así que las validaciones corren sobre `useRef`, no dentro del updater — evita depender de ese detalle de implementación. Motor de pagos deliberadamente simple: sin colas, sin reintentos, apto solo para una demo de una sesión.

## I-002 — Fase 0 funcional: las tres modalidades de cobro de principio a fin

**Fecha:** 2026-07-11
**Qué quedó funcionando:** Proyecto Expo + TypeScript + Expo Router scaffoldeado en la raíz. Las 13 pantallas de SPEC-001 §5 implementadas (login simulado, home, cobro puntual, QR personal, QRs reutilizables, escaneo con cámara real vía `expo-camera` + atajo "simular escaneo", confirmación, resultado, historial). Motor de dominio (`src/domain/store.tsx`) con las reglas de RF-001 §18. Tokens de DESIGN.md aplicados (`src/theme/theme.ts`, `src/components/ui.tsx`).
Verificado manualmente en `expo start --web`: Escenario 1 (cobro puntual: crear → pagar → saldo actualizado → aparece en ambos historiales) y Escenario 3 (QR reutilizable: crear → pagar → sigue activo) completos de principio a fin; Escenario 2 (QR personal con monto libre) verificado hasta la pantalla de confirmación.
**Pendiente para una siguiente sesión:** probar Escenario 2 hasta el resultado, expiración de cobros puntuales (15 min), y los casos de error de RF-001 §13 (saldo insuficiente, QR ya pagado, auto-pago) — la lógica está en `store.tsx` pero no se ejercitó cada rama manualmente.

## D-007 — La UI no expone avisos de "prototipo" o "demo"

**Fecha:** 2026-07-11
**Contexto:** La app se muestra a usuarios controlados (no es solo una demo interna de un dispositivo); el usuario pidió explícitamente tratar la UI como producto terminado en vez de recordar en pantalla que los datos son simulados.
**Decisión:** Se quitan textos tipo "Demo interna — saldo ficticio..." de las pantallas (ver `app/login.tsx`). Que los saldos y usuarios sean simulados se documenta en `docs/` y aquí, no en la interfaz.
**Consecuencias:** Nuevas pantallas no deben agregar avisos de este tipo — es una regla permanente, ahora en CLAUDE.md ("Copy de la interfaz"), no una excepción puntual de esta pantalla.

## D-008 — Migración a Firebase Cloud Real

**Fecha:** 2026-07-11
**Contexto:** SPEC-002 propone inicialmente Firebase Emulator local. Para mayor realismo y facilitar pruebas multi-dispositivo sin depender de tunelado de red (ngrok) para conectar teléfonos físicos al emulador local, el usuario solicitó desplegar y conectar a un proyecto Firebase real en la nube.
**Decisión:** Desplegar Security Rules y Cloud Functions a la nube de Firebase, y leer la configuración en el cliente usando variables de entorno `.env` cargadas mediante `process.env.EXPO_PUBLIC_FIREBASE_*`.
**Consecuencias:** Se eliminó la dependencia de emuladores locales en producción. El despliegue de reglas y funciones se realiza mediante scripts de pnpm.

## D-009 — Autenticación Híbrida: Google Web y Simulación por Email en Móvil

**Fecha:** 2026-07-11
**Contexto:** Google Sign-In oficial en Firebase mediante popups (`signInWithPopup`) funciona de inmediato en Web (`expo start --web`), pero falla nativamente en dispositivos móviles nativos/Expo Go al no haber soporte de popups en React Native sin configuración compleja de esquemas y IDs de cliente.
**Decisión:** Detectar plataforma en `login.tsx`. En Web, usar Google real (`signInWithPopup`). En móvil (Expo Go), ofrecer un input para el correo electrónico del usuario de Google y registrar/autenticar en Firebase Auth de forma transparente usando `signInWithEmailAndPassword` con una contraseña fija interna, creando un usuario real en Firebase Auth.
**Consecuencias:** Cero configuraciones complejas de cliente OAuth en Expo Go para el prototipo. Todos los usuarios (tanto web como nativos) están respaldados por credenciales reales en Firebase Auth y documentos en Firestore.

## D-010 — Fusión en Cliente de Consultas de Transacciones

**Fecha:** 2026-07-11
**Contexto:** Para garantizar la regla "Solo los usuarios involucrados podrán consultar una transacción" (RF-001 §18.15), las reglas de seguridad de Firestore impiden consultar la colección entera. Buscar transacciones donde `payerId == uid` u `recipientId == uid` en una única consulta compuesta `or()` requiere generar índices compuestos complejos en la consola de Firebase.
**Decisión:** Realizar dos consultas independientes en tiempo real (una para transacciones enviadas y otra para recibidas) y fusionarlas, deduplicarlas y ordenarlas por fecha en el cliente.
**Consecuencias:** Cero demoras por generación de índices compuestos en Firestore Cloud, logrando tiempo real inmediato sin requerir configuración adicional de índices en la consola.

## I-003 — Fase 1 funcional: Monorepo y Backend Firebase Real en la Nube

**Fecha:** 2026-07-11
**Qué quedó funcionando:** Proyecto reestructurado a monorepo con `pnpm workspaces` (app en `apps/mobile` y backend en `apps/backend`). Integración completa del SDK de Firebase y persistencia de sesión real. Implementación de reglas de Firestore y Cloud Functions v2 con base de datos transaccional atómica. Interfaces de confirmación, creación de cobros y QRs modificadas para adaptarse a llamadas asíncronas de base de datos.


## D-011 — Login con Email y Contraseña con Auto-registro (reemplaza D-009)

**Fecha:** 2026-07-11
**Contexto:** La simulación de Google por email en móvil (D-009) usaba una contraseña fija interna y la pantalla de login llamaba a un método que ya no existía en el store. Se necesitaba autenticación real que funcione en simuladores de iOS, donde Google Sign-In es problemático.
**Decisión:** Login con email y contraseña reales (`signInWithEmailAndPassword`). Si las credenciales no corresponden a una cuenta existente, se registra automáticamente (`createUserWithEmailAndPassword`) en el mismo flujo — no hay pantalla de registro separada. El proveedor Email/Password ya estaba habilitado en el proyecto de Firebase. Google Sign-In se mantiene solo en Web.
**Consecuencias:** Un solo formulario cubre login y registro. Contra: un usuario que se equivoque de contraseña en un email nuevo crea una cuenta sin querer — aceptable en prototipo; si molesta, se separa el flujo en un incremento futuro.

**Actualización (2026-07-11):** a petición del usuario se conservan ambas formas también en móvil: el botón "Continuar con Google" sigue visible en todas las plataformas. En Web usa Google real (popup); en móvil usa el email del formulario con la contraseña fija interna de D-009 (no hay popups en React Native y Google nativo requiere development build). Ambos caminos convergen en cuentas reales de Firebase Auth.

## D-012 — Downgrade de Expo SDK 57 a SDK 54

**Fecha:** 2026-07-11
**Contexto:** El Expo Go disponible en el App Store solo soporta SDK 54 (la versión para SDK 57 lleva meses en la cola de revisión de Apple). Con el proyecto en SDK 57 era imposible probar en un iPhone físico sin membresía del Apple Developer Program (`eas go`) o development build.
**Decisión:** Bajar el proyecto a SDK 54 (`expo install --fix` para alinear todas las dependencias; react-native 0.86→0.81, expo-router 7→6, etc.). Se fijó `react-native-reanimated` a 4.1.7 explícitamente porque pnpm resolvía el peer opcional de expo-router a la versión de SDK 57.
**Consecuencias:** La app corre en el Expo Go del App Store en iPhone físico. Cuando Apple apruebe el Expo Go de SDK 57 (o se adopte development build), se puede volver a subir.

## D-013 — Rediseño visual sobre mockup aprobado, sin ampliar alcance funcional

**Fecha:** 2026-07-11
**Contexto:** El usuario aportó un mockup HTML (Home, Escanear, QR Personal, Historial) y pidió llevarlo al código sin romper funcionalidad. El mockup contradecía DESIGN.md en tipografía y uso del navy, mostraba solo 3 acciones rápidas (perdiendo acceso a Cobrar y QRs reutilizables), e incluía elementos sin feature detrás (banner Inversión, notificaciones, subir desde galería, guardar QR).
**Decisión:** (confirmada con el usuario) Adoptar el lenguaje visual completo: tabs inferiores con expo-router, tipografía Hanken Grotesk, headers con degradado navy, escáner a pantalla completa con overlay. Las acciones del Home son las 4 reales (Escanear, Recibir, Cobrar, Reutilizables) con el estilo del mockup — "Enviar" se omite porque enviar = escanear. Los elementos sin feature se incluyen como visuales estáticos marcados con `ponytail:`; Compartir usa el Share nativo y el chip "has ahorrado" se calcula del neto real del mes (se oculta si no es positivo). La moneda sigue siendo EUR (la fija la SPEC) aunque el mockup usara $. El simulador de escaneo se conserva como panel inferior dentro de la pantalla de cámara.
**Consecuencias:** Tres dependencias nuevas pequeñas (`expo-linear-gradient`, `expo-font`, `@expo-google-fonts/hanken-grotesk`). Las 4 pantallas principales se movieron a `app/(tabs)/` sin cambiar sus rutas. DESIGN.md actualizado (tipografía, navegación, uso del navy). Los flujos de cobro/pago no se tocaron: heredan la fuente vía `Txt`.

## D-014 — El botón de Google solo existe en Web (reemplaza la actualización de D-011)

**Fecha:** 2026-07-11
**Contexto:** Bug reportado por el usuario: en móvil, "Continuar con Google" exigía escribir el email y fallaba con "Contraseña incorrecta" en cuentas ya registradas. La causa es que en móvil ese botón nunca fue Google: era la simulación de D-009 (email del formulario + contraseña fija interna `password123`). Si la cuenta se creó con una contraseña propia, la contraseña fija jamás coincide — el fallo es inherente al truco, no un defecto de implementación. Google nativo real sigue sin ser viable en Expo Go (requiere development build + OAuth nativo).
**Decisión:** Eliminar la simulación: `loginWithGoogle` es solo el popup real de Web y el botón se renderiza únicamente cuando `Platform.OS === 'web'`. En móvil el único camino es email y contraseña (con auto-registro, D-011).
**Consecuencias:** En móvil desaparece la confusión y el error; en Web nada cambia salvo que Google ya no pide el campo de email. Las cuentas creadas por el viejo truco siguen siendo válidas: entran con su email y `password123`... o con Google en Web si el email coincide.
