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
  ├── DECISIONS.md           # Registro histórico de decisiones de diseño (ADR)
  └── DESIGN.md              # Guía de diseño visual e identidad corporativa (Erictech)
```

---

## 🛠️ Stack Tecnológico

* **Frontend**: React Native, Expo, Expo Router, TypeScript, `@expo/vector-icons` (Ionicons).
* **Backend**: Firebase Auth (Google y Email Fallback), Cloud Firestore, Cloud Functions v2.
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
2. Habilita **Cloud Firestore** y **Authentication** (activa los proveedores de **Google** y **Correo/Contraseña**).
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
2. Rellena los valores en `apps/mobile/.env` con la configuración de tu Web App de Firebase.
3. Ejecuta la aplicación:
   * **Para probar en Web (Login con Google Real)**:
     ```bash
     pnpm run mobile:web
     ```
   * **Para probar en Móvil (Expo Go)**:
     ```bash
     pnpm run mobile:start
     ```
     *(Abre la app **Expo Go** en tu iPhone/Android y escanea el código QR de la terminal. Asegúrate de estar en la misma red Wi-Fi).*

---

## 📦 Compilar la App de Android

### Compilación local (desarrollo, dispositivo conectado por USB)

Compila el APK de debug en tu máquina, lo instala en el dispositivo y arranca Metro:

```bash
pnpm --filter mobile run android
```

Requiere Android SDK instalado y el dispositivo con depuración USB activada. El APK queda en `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, pero necesita Metro corriendo para funcionar — no sirve como APK independiente.

### Compilación en la nube (EAS Build, APK independiente)

El proyecto ya está pre-configurado para compilarse en la nube mediante **EAS Build** soportando la estructura de monorepo con `pnpm`.

1. Inicia sesión en Expo:
   ```bash
   npx eas-cli login
   ```
2. Ejecuta la compilación desde la **raíz del proyecto**:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
3. Acepta generar un nuevo Keystore si te lo pregunta. Al finalizar (5-10 minutos), escanea el código QR resultante con tu Android para descargar e instalar el archivo `.apk`.

> **Notas:**
> * El `.env` de `apps/mobile/` se sube al build de nube vía `.easignore` (ver D-015 en DECISIONS.md). Sin él, el APK crashea al abrir.
> * El build local (keystore de debug) y el de nube (keystore de EAS) tienen firmas distintas: para pasar de uno a otro en el mismo dispositivo hay que desinstalar antes (`adb uninstall com.andresstbn.ericpay`).

---

## 📖 Documentación Interna
* Para consultar las decisiones de arquitectura y el porqué de cada paso técnico, lee [DECISIONS.md](DECISIONS.md).
* Para comprender la identidad corporativa y aplicar estilos, lee [DESIGN.md](DESIGN.md).
* Los requerimientos funcionales originales del producto se encuentran en [docs/RF-001.md](docs/RF-001.md).
