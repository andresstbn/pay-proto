# SPEC-000 — Demo ultrarrápida de EricPay (Fase 0, previa al RF-001)

## 1. Propósito de este documento

Este documento define un demo mínimo, independiente del RF-001, cuyo único objetivo es **mostrarle a Mikel (Erictel) la experiencia de EricPay en persona, de forma rápida y confiable, antes de entrar en la conversación sobre redes de pago, bancos o proveedores financieros.**

El RF-001 sigue siendo válido como especificación del **prototipo funcional completo** (Fase 1): Firebase real, autenticación con Google, monorepo, reglas de seguridad. Esa fase se retoma **después** de esta reunión, una vez que Mikel haya visto y validado el concepto.

Este demo y el RF-001 no compiten — este es el paso 0 que reduce el riesgo del paso 1.

## 2. Por qué existe una Fase 0 separada

El RF-001 compromete de entrada a levantar autenticación real con Google, un backend en Firebase (Firestore, Security Rules, Cloud Functions, Emulator Suite) y un monorepo. Ese es el nivel de rigor correcto para un prototipo que se va a seguir construyendo, pero no es necesario para validar si la idea le gusta a Mikel — y además introduce riesgo el día de la demo: conectividad, credenciales OAuth, servicios que deben estar arriba.

Separar la Fase 0 permite:

- Tener algo mostrable en horas, no en días.
- Que la demo funcione sin conexión y sin dependencias externas, eliminando la principal causa de que una demo en vivo falle.
- Invertir en Firebase, Google Auth y el monorepo solo si la reunión confirma que vale la pena seguir.

## 3. Qué NO es este demo

- No es el prototipo funcional del RF-001. No usa Firebase, no usa Google Auth real, no usa monorepo.
- No está pensado para publicarse, instalarse por otros usuarios ni pilotarse con datos reales.
- No es el lugar para discutir redes de pago, bancos o proveedores — esa conversación viene después, y precisamente el propósito del demo es ganarse el derecho a tenerla.
- No busca ser "seguro" en el sentido de producción; busca ser confiable en el sentido de "no se cae en medio de la reunión".

## 4. Criterio de éxito

El demo se considera exitoso si, en una sola sesión en vivo (idealmente un solo teléfono, sin depender de wifi del lugar), se puede:

1. Mostrar los tres modelos de cobro por QR (puntual, personal, reutilizable) de principio a fin.
2. Que Mikel entienda la propuesta de valor sin que se le tenga que explicar con diapositivas — la propia interacción la comunica.
3. Terminar la demo con una pregunta de Mikel sobre "¿y cómo conectamos esto con dinero real / bancos?" — esa pregunta es la señal de que ya se ganó el derecho a la conversación de redes de pago.

Si la demo genera dudas sobre si el concepto de pago por QR es el correcto, eso también es una salida válida — mejor descubrirlo aquí que después de construir el RF-001 completo.

## 5. Alcance funcional

Los mismos tres flujos del RF-001 (§4), pero ejecutados en un solo dispositivo alternando entre dos usuarios de demo precargados (por ejemplo, "Daniel" y "Laura"), en lugar de requerir dos teléfonos físicos:

- **Cobro puntual:** crear un cobro con monto y concepto, generar QR, "pagar" cambiando de usuario, ver el estado pasar de pendiente a pagado.
- **QR personal:** mostrar el QR fijo de un usuario, escanearlo (o simularlo), introducir el monto como pagador, confirmar.
- **QR reutilizable:** crear un QR de monto fijo (ej. "Café — €3,50"), pagarlo, mostrar que sigue activo y se puede volver a usar.

Pantallas mínimas: login simulado, pantalla principal con saldo, los tres flujos de creación/visualización de QR, pantalla de escaneo, confirmación de pago, resultado, historial. (Es el mismo listado del RF-001 §15 — no se reduce el número de pantallas, se reduce lo que hay _detrás_ de ellas.)

## 6. Decisiones técnicas para ir rápido

| Decisión RF-001 (Fase 1)             | Decisión Fase 0 (este demo)                                                                   | Motivo                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Google Authentication real           | Login simulado: botones "Continuar como Daniel / Laura" con la estética de un botón de Google | Evita configurar OAuth, client IDs y consentimiento solo para una demo interna |
| Firebase Firestore + Cloud Functions | Estado en memoria (un store local en la app)                                                  | Cero dependencia de red; la demo funciona sin wifi ni backend levantado        |
| Firebase Security Rules              | Validaciones equivalentes ejecutadas en el cliente, centralizadas en una sola capa de lógica  | Mismas reglas de negocio (RF-001 §18), sin necesidad de un backend desplegado  |
| Monorepo pnpm workspaces             | Un solo proyecto Expo                                                                         | No hay nada que compartir todavía entre app y backend porque no hay backend    |
| Persistencia entre sesiones          | No persiste — cada apertura de la app arranca limpia                                          | No es un requisito para una demo de una sola sesión                            |

Se mantiene: React Native + Expo + TypeScript (RF-001 §16.1), montos en céntimos enteros (§16.4), y generación/lectura de QR reales con cámara — con un atajo de "simular escaneo" como respaldo, para no depender de que la cámara enfoque bien en el momento de la reunión.

Esto significa que la Fase 0 no es código desechable: es el mismo stack de la Fase 1, así que la lógica de UI y de flujo se puede reaprovechar cuando se conecte Firebase de verdad. Lo único que cambia es de dónde vienen los datos.

## 7. Guion de demo sugerido

1. Abrir la app, iniciar sesión como "Daniel". Mostrar la pantalla principal con el saldo ficticio.
2. Cobro puntual: crear un cobro de €25,00 "Almuerzo", mostrar el QR generado.
3. Cambiar a "Laura", escanear (o simular escaneo de) ese QR, revisar y confirmar el pago. Mostrar el resultado con saldo actualizado.
4. Volver a "Daniel", mostrar que la solicitud ya aparece como pagada y que la transacción está en el historial de ambos.
5. QR personal: mostrar el QR fijo de Daniel, cambiar a Laura, escanearlo, introducir un monto libre (ej. €10,00), confirmar. Señalar que ese mismo QR se puede volver a usar.
6. QR reutilizable: crear "Café — €3,50" desde Daniel, pagarlo desde Laura, y remarcar que el QR sigue activo para más pagos — este es el caso que más se acerca a un caso de negocio real (comercio).
7. Cerrar mostrando el historial de transacciones de ambos usuarios.
8. Dejar que la conversación fluya hacia "¿cómo se conecta esto con dinero real?" — ahí empieza la discusión de redes de pago, ya con el concepto validado.

## 8. Riesgos del día de la demo y mitigaciones

- **Cámara no enfoca / mala luz:** botón de "simular escaneo" que resuelve el mismo flujo sin depender de la cámara.
- **Batería / imprevistos de hardware:** tener un GIF o video corto de respaldo grabado previamente con el flujo completo.
- **Preguntas sobre seguridad o dinero real durante la demo:** tener lista una frase corta ("esto es saldo ficticio, hoy estamos validando la experiencia; la parte de dinero real y redes de pago es justo lo siguiente que quiero conversar contigo") para no desviar la demo hacia una conversación que aún no toca.
- **Confusión sobre qué es real y qué es simulado:** decirlo explícitamente al empezar la demo, en una frase, para que Mikel no piense que ya hay un backend con dinero real detrás.

## 9. Qué pasa después

Si la reunión valida el concepto, el siguiente paso es retomar el RF-001 tal como está escrito: Firebase real, Google Auth, monorepo, reglas de seguridad — y en paralelo abrir la conversación sobre redes de pago, que es donde el RF-001 explícitamente dice que no entra (§19, "Fuera de alcance").

Este demo no se descarta: su store en memoria se reemplaza por Firestore y su login simulado por Google Auth real, pero las pantallas, el flujo y las validaciones de negocio (RF-001 §18) se conservan.
