# SPEC-003 — Panel de control (Dashboard) web administrativo

## 1. Propósito de este documento

Este documento define la implementación de un panel de control (Dashboard) administrativo oculto dentro de EricPay. El objetivo es permitir que el administrador o desarrollador vea a todos los usuarios y todas las transacciones del sistema desde una interfaz web, facilitando el monitoreo del prototipo sin tener que revisar la consola de Firebase.

Este dashboard sigue las pautas visuales definidas en [DESIGN.md](../../DESIGN.md) y se implementará como una ruta oculta del cliente que solo se activa al ejecutarse en plataformas Web.

## 2. Alcance funcional

### 2.1 Acceso y Seguridad
- **Ruta:** Accesible mediante la ruta `/dashboard` (p. ej. `http://localhost:8081/dashboard`).
- **Restricción de plataforma:** Si se intenta cargar esta ruta en un dispositivo móvil (iOS/Android), mostrará una pantalla informativa: "Panel de control reservado para la versión web".
- **Restricción de autenticación:** El usuario debe estar autenticado y su token de Firebase debe incluir el custom claim booleano `admin: true`. Una ruta oculta no constituye autorización.

### 2.2 Panel de Usuarios
- Muestra el listado de todos los usuarios registrados en el sistema.
- Información por usuario:
  - Nombre del usuario (`displayName`) y foto de perfil / inicial.
  - Correo electrónico.
  - Identificador único (`uid` / `id`).
  - Saldo actual formateado en Euros (€).

### 2.3 Panel de Transacciones
- Muestra el listado de todas las transacciones históricas en orden cronológico inverso (las más recientes primero).
- Información por transacción:
  - Identificador único de transacción (`id`).
  - Nombre/Concepto.
  - Monto formateado en Euros (€).
  - Remitente (Nombre de usuario pagador) y Destinatario (Nombre de usuario receptor).
  - Tipo de QR asociado (`one_time`, `personal`, `reusable`).
  - Fecha y hora formateada.
  - Estado de la transacción (`completed`, `pending`, etc.).

### 2.4 KPIs / Estadísticas Rápidas
Para dar una visión general del prototipo, se calcularán en caliente:
- **Volumen Total:** Suma de todos los montos de transacciones completadas.
- **Suma de Saldos:** Suma del balance actual de todos los usuarios registrados (debe cuadrar con el balance emitido inicial).
- **Total Usuarios:** Cantidad total de usuarios en el sistema.
- **Total Transacciones:** Cantidad total de transacciones registradas.

## 3. Decisiones técnicas

### 3.1 Backend: Consulta privilegiada de datos
Debido a que las reglas de seguridad de Firestore en `firestore.rules` prohíben explícitamente a un usuario normal leer transacciones donde no participa, el cliente móvil/web no puede realizar una consulta directa de todas las transacciones.

Para resolver esto sin abrir las reglas de seguridad a usuarios no autorizados, implementaremos una nueva **Cloud Function**:
- **Nombre:** `adminGetDashboardData`
- **Operación:**
  1. Verifica que el solicitante esté autenticado en Firebase Auth.
  2. Lee todos los documentos de la colección `users` usando la SDK de Admin (bypasseando reglas).
  3. Lee todos los documentos de la colección `transactions` ordenados por fecha descendente.
  4. Agrega los datos y retorna un JSON estructurado con `{ ok: true, users, transactions }`.

### 3.2 Frontend: React Native Web / Expo Router
- **Archivo:** Se creará el archivo `apps/mobile/app/dashboard.tsx`.
- **Estructura del Componente:**
  - Verificación en el cliente de `Platform.OS === 'web'`.
  - Consumo de la Cloud Function `adminGetDashboardData` en un `useEffect` al montar el componente.
  - Estado local para almacenar usuarios, transacciones y un indicador de carga (`loading`).
  - Diseño adaptativo de dos columnas para Web (pantallas medianas/grandes):
    - Columna izquierda: Tabla/Lista de Usuarios.
    - Columna derecha: Tabla/Lista de Transacciones.
  - Sección superior con tarjetas de KPIs (Volumen Total, Saldo del Sistema, etc.).

## 4. Diseño visual (Alineación con DESIGN.md)

El dashboard mantendrá la estética de EricPay usando la paleta definida:
- Fondo general de la página: `gray50` (`#F7F8FC`) para máxima legibilidad.
- Cabecera: `BrandHeader` simplificada o cabecera personalizada con fondo degradado horizontal `navy900` → `navy700`, logo "EricPay Admin Dashboard" en blanco, botón de volver a inicio / cerrar sesión.
- Tarjetas de KPIs: fondo blanco con sombras tintadas de navy `0 4px 16px rgba(11, 20, 54, 0.08)`, textos destacados en `blue600` e íconos representativos.
- Listas y tablas:
  - Bordes y separadores: `gray200` (`#E1E5F0`).
  - Textos principales: `gray900` (`#111827`).
  - Textos secundarios/fechas: `gray500` (`#6B7280`).
  - Badges de transacciones: verde para transacciones completadas (12% opacidad de `green500` y texto `green500`), rojo para errores.

## 5. Plan de verificación

### 5.1 Pruebas Automáticas y de Compilación
- Ejecutar `pnpm --filter backend-functions run build` para asegurar que el código de TypeScript de las funciones compila correctamente.
- Validar que la compilación de Expo Web (`pnpm mobile:web`) no tenga errores al resolver dependencias de Web.

### 5.2 Pruebas Manuales
1. Iniciar el servidor web de desarrollo de Expo.
2. Asignar `admin: true` mediante Firebase Admin SDK a una cuenta de prueba, renovar su ID token e iniciar sesión.
3. Navegar directamente ingresando la URL `/dashboard` en el navegador.
4. Confirmar que se visualizan correctamente:
   - Tarjetas superiores con KPIs.
   - Listado de usuarios registrados con su saldo real.
   - Listado completo de transacciones realizadas en el sistema (incluyendo transacciones entre cuentas de prueba distintas).
5. Realizar una transacción de prueba en otro navegador o emulador y pulsar "Recargar" o comprobar que al recargar el dashboard se refleja el nuevo estado.
6. Entrar a la ruta `/dashboard` desde la simulación de un dispositivo móvil (o achicar ventana/probar con User-Agent de móvil si es necesario) para asegurar que el aviso de bloqueo por plataforma funciona.
7. Iniciar sesión con una cuenta autenticada sin el claim y confirmar que el callable responde `permission-denied` sin devolver datos.
