# SPEC-004 — Acceso social y grupos con reparto automático

## 1. Objetivo

Ampliar EricPay con acceso rápido mediante Google, Apple y Facebook, y con grupos privados cuyos ingresos por QR se reparten de forma atómica entre los miembros activos. El saldo continúa siendo ficticio, en EUR y expresado como céntimos enteros.

## 2. Autenticación social

- Email y contraseña continúan disponibles como respaldo en todas las plataformas.
- Google y Facebook se ofrecen en iOS, Android y Web.
- Apple se ofrece en iOS y Web.
- OAuth móvil se valida en un development build con el esquema `ericpay`; Expo Go deja de ser una superficie soportada para estos accesos.
- Si una identidad social comparte email con una cuenta existente, la persona confirma el acceso anterior y ambas credenciales se vinculan al mismo UID. El saldo y el historial nunca se migran a un UID nuevo.
- Los secretos de proveedor no se incluyen en el cliente ni en el repositorio.

## 3. Grupos

### 3.1 Membresía y roles

- Los grupos son privados y admiten un máximo de 20 miembros.
- Existe un propietario, cero o más administradores y miembros normales.
- El propietario puede administrar roles, transferir la propiedad y archivar el grupo.
- Propietario y administradores pueden invitar, eliminar miembros y gestionar QRs fijos.
- Cada miembro controla si participa o pausa su participación en repartos futuros.
- Un miembro nuevo comienza activo. El propietario no puede abandonar el grupo sin transferirlo o archivarlo.
- Al expulsar a un miembro se invalida la invitación vigente, para impedir que vuelva a entrar con el mismo código.

### 3.2 Invitaciones

- Cada grupo mantiene una única invitación activa, compartible mediante deep link y código manual.
- El código es aleatorio, no ambiguo y solo se persiste como hash.
- Regenerar la invitación invalida inmediatamente la anterior.
- Unirse varias veces con la misma identidad es idempotente.

### 3.3 QRs grupales

- Cada grupo tiene un QR permanente de monto libre.
- Propietario y administradores pueden crear hasta 100 QRs fijos reutilizables y desactivarlos.
- Payload abierto: `{ app: 'ericpay', version: 1, type: 'group_open', groupId }`.
- Payload fijo: `{ app: 'ericpay', version: 1, type: 'group_fixed', qrId }`.
- Los payloads antiguos de EricPay siguen siendo válidos; tipos desconocidos se rechazan.

## 4. Reparto

Al confirmar un pago, el servidor:

1. Lee la versión vigente del grupo y el QR, si es fijo.
2. Toma los miembros activos y excluye al pagador.
3. Rechaza grupos archivados, QRs inactivos, cero receptores, importes no enteros o importes menores al número de receptores.
4. Asigna `floor(total / receptores)` a cada miembro.
5. Distribuye los céntimos sobrantes desde un cursor rotatorio y avanza el cursor.
6. Descuenta el total al pagador, acredita todas las partes y crea el movimiento del pagador, un recibo privado por receptor y el evento de actividad dentro de una transacción Firestore.

`payGroup` recibe un `clientRequestId`. Repetir la misma solicitud devuelve el mismo resultado; reutilizar la clave con datos distintos se rechaza. Ningún fallo parcial modifica saldos.

## 5. Experiencia móvil

- Se añade una quinta pestaña, **Grupos**.
- La lista muestra rol, participación, miembros activos y actividad reciente.
- El detalle permite gestionar miembros, invitación, QR abierto, QRs fijos y feed de actividad.
- QR abierto: introducir importe, previsualizar y confirmar.
- QR fijo: previsualizar y confirmar.
- Un pagador externo ve nombre del grupo, total y número de receptores, pero no identidades privadas.
- El pagador ve un movimiento por el total; cada receptor ve solo su parte.
- Las notificaciones foreground indican la parte recibida y el grupo.

## 6. Seguridad y arquitectura

- Todas las mutaciones pasan por Cloud Functions; el cliente no escribe grupos, QRs, invitaciones, actividad ni transacciones.
- Solo miembros actuales leen grupo, QRs y actividad.
- El movimiento del pagador contiene el total y el número de receptores, pero ningún ID de miembro. Cada receptor lee un documento separado que contiene únicamente su propia parte.
- Las invitaciones no admiten lectura cliente.
- El backend nuevo separa handlers, casos de uso, política pura y repositorio Firestore.
- El móvil separa autenticación y grupos del store de pagos existente.
- Los logs incluyen IDs de correlación, estado y duración, nunca emails, tokens o credenciales.

## 7. Criterios de aceptación

1. Una cuenta puede entrar con cualquiera de los proveedores disponibles sin perder su UID al vincular identidades.
2. Propietario o administrador comparte una invitación; otra cuenta se une y puede pausar o reactivar su participación.
3. Un pago abierto y uno fijo se reparten correctamente entre miembros activos, excluyendo al pagador.
4. Los céntimos sobrantes rotan de forma justa entre pagos sucesivos.
5. Un reintento con el mismo `clientRequestId` no duplica saldo ni transacción.
6. Los cambios concurrentes de membresía fuerzan un reparto con el estado confirmado por el servidor.
7. Las reglas bloquean lecturas y escrituras no autorizadas.
8. Los flujos actuales de QR puntual, personal y reutilizable siguen funcionando.

## 8. Fuera de alcance

- Dinero real, bancos, tarjetas, KYC/AML o conciliación financiera.
- Chat, adjuntos, reacciones o moderación.
- Grupos de más de 20 miembros.
- Apple Sign-In en Android.
- Universal links con fallback a tiendas.
