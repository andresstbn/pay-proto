# EricPay 📱💳

EricPay es un prototipo funcional (Fase 1) de aplicación móvil de pagos simulados mediante códigos QR. El proyecto utiliza un backend en la nube con **Firebase (Authentication, Firestore y Cloud Functions)** y está organizado en un monorepo gestionado por **`pnpm workspaces`**.

---

## 🏛️ Arquitectura del Proyecto

El repositorio está dividido en los siguientes módulos:

```text
pay-proto/
  ├── apps/
  │   ├── mobile/            # Aplicación móvil híbrida (React Native + Expo Router)
  │   └── backend/           # Configuración de Firebase y Cloud Functions
  │       └── functions/     # Código de servidor (TypeScript, Node 22)
  ├── docs/                  # Requerimientos (RF-001) y Especificaciones (SPEC)
  │   └── README.md          # Índice de incrementos, estado y verificación
  ├── DECISIONS.md           # Registro histórico de decisiones de diseño (ADR)
  └── DESIGN.md              # Guía de diseño visual e identidad corporativa (Erictech)
```

---

## 🛠️ Stack Tecnológico

* **Frontend**: React Native, Expo, Expo Router, TypeScript, `@expo/vector-icons` (Ionicons).
* **Backend**: Firebase Auth (email y proveedores sociales), Cloud Firestore, Cloud Functions v2.
* **Seguridad**: Firestore Security Rules (para proteger transacciones e historiales).
* **Gestor de Paquetes**: `pnpm` (workspaces).

---

## 🚀 Guía de Instalación y Configuración

### 1. Requisitos Previos
Asegúrate de tener instalado:
* [Node.js](https://nodejs.org/) (versión 20 o 22 recomendada).
* [pnpm](https://pnpm.io/) (`corepack enable pnpm` o `npm install -g pnpm`).
* [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`).

### 2. Instalación de Dependencias
Instala los paquetes para todos los proyectos del monorepo desde la raíz:
```bash
pnpm install
```

### 3. Configuración de Firebase (Backend)
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Cloud Firestore** y **Authentication**. Activa **Correo/Contraseña** y **Google**; Facebook y Apple se habilitan cuando se aprovisionen sus clientes para `SPEC-004`.
3. Mejora el plan de tu proyecto a **Blaze (Pay-as-you-go)**. *(Tranquilo, la capa gratuita es sumamente generosa y no pagarás nada en etapa de desarrollo/demos).*
4. Configura tu ID de proyecto real en el archivo `apps/backend/.firebaserc`:
   ```json
   {
     "projects": {
       "default": "tu-proyecto-id"
     }
   }
   ```
5. Inicia sesión en Firebase desde la terminal:
   ```bash
   npx firebase-tools login
   ```
6. Despliega las reglas y las funciones desde la carpeta del backend:
   ```bash
   # Desde la raíz:
   pnpm --filter backend run deploy:rules
   pnpm --filter backend run deploy:functions
   ```

### 4. Configuración de la App Móvil (apps/mobile)
1. Crea un archivo `.env` en la carpeta `apps/mobile/` copiando la plantilla:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```
2. Rellena los valores `EXPO_PUBLIC_FIREBASE_*` con la configuración de la Web App de Firebase.
3. Para OAuth móvil, completa también los client IDs públicos de Google y Facebook de `.env.example`. Nunca añadas App Secrets, tokens ni claves privadas al cliente.
4. Ejecuta la aplicación:
   * **Para probar en Web (Login con Google Real)**:
     ```bash
     pnpm run mobile:web
     ```
   * **Para probar en Móvil (Expo Go)**:
     ```bash
     pnpm run mobile:start
     ```
     *(Abre la app **Expo Go** en tu iPhone/Android y escanea el código QR de la terminal. Asegúrate de estar en la misma red Wi-Fi).*

> Email/contraseña sigue funcionando en Expo Go. Google/Facebook/Apple en móvil
> requieren un **development build**, porque OAuth necesita el esquema propio
> `ericpay://`. Configura los tres identificadores públicos adicionales de
> `apps/mobile/.env.example`, habilita los proveedores en Firebase y ejecuta el
> perfil `development` de EAS. Apple se muestra en iOS y Web; Google/Facebook en
> iOS, Android y Web. Ningún App Secret o clave privada debe guardarse en `.env`.

> **Estado de `SPEC-004`:** grupos, reparto y exportación de QR están operativos.
> OAuth móvil está implementado, pero no se considera cerrado hasta completar
> los clientes nativos, el acceso EAS, un development build y una prueba E2E.

---

## 📦 Compilar la App de Android

### Compilación local (desarrollo, dispositivo conectado por USB)

Compila el APK de debug en tu máquina, lo instala en el dispositivo y arranca Metro:

```bash
pnpm --filter mobile run android
```

Requiere Android SDK instalado y el dispositivo con depuración USB activada. El APK queda en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, pero necesita Metro corriendo para funcionar — no sirve como APK independiente.

### Compilación en la nube (EAS Build, APK independiente)

El proyecto ya contiene `apps/mobile/eas.json` y `expo-dev-client`. Ejecuta EAS
desde `apps/mobile`, que es la raíz de la aplicación Expo.

1. Inicia sesión en Expo:
   ```bash
   cd apps/mobile
   pnpm dlx eas-cli login
   ```
2. Comprueba la cuenta y el acceso al proyecto enlazado:
   ```bash
   pnpm dlx eas-cli whoami
   pnpm dlx eas-cli project:info
   ```
   Si `project:info` devuelve `Entity not authorized`, el propietario de la
   organización debe invitar al usuario mostrado por `whoami` con rol
   **Developer** o superior. No enlaces un proyecto nuevo hasta decidir qué
   ocurre con los builds y el keystore anteriores.
3. Para Google Login en Android, registra una app Firebase con package
   `com.andresstbn.ericpay`, añade el SHA-1 del keystore de EAS y configura
   `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
4. Genera el development build que permite probar OAuth:
   ```bash
   pnpm dlx eas-cli build --platform android --profile development
   ```
5. Para un APK independiente sin herramientas de desarrollo usa el perfil
   `preview`. Acepta generar un keystore si todavía no existe.

> **Notas:**
> * El `.env` de `apps/mobile/` se sube al build de nube vía `.easignore` (ver D-015 en DECISIONS.md). Sin él, el APK crashea al abrir.
> * El build local (keystore de debug) y el de nube (keystore de EAS) tienen firmas distintas: para pasar de uno a otro en el mismo dispositivo hay que desinstalar antes (`adb uninstall com.andresstbn.ericpay`).

---

## 📖 Documentación Interna
* El estado de las SPEC e incrementos se consulta en [docs/README.md](docs/README.md).
* Para consultar las decisiones de arquitectura y el porqué de cada paso técnico, lee [DECISIONS.md](DECISIONS.md).
* Para comprender la identidad corporativa y aplicar estilos, lee [DESIGN.md](DESIGN.md).
* Los requerimientos funcionales originales del producto se encuentran en [docs/RF-001.md](docs/RF-001.md).
