# Hu-Manos Colombia 🇨🇴
> **"Una mano para quien lo necesita"**

Aplicación móvil nativa (iOS y Android) de impacto social y gestión de emergencias comunitarias en Colombia, construida con **React Native**, **Expo (Expo Router)**, y **TypeScript**.

---

## 🚀 Características Principales

- **Acceso Instantáneo sin Registros**: Pensado para momentos de crisis y emergencias (0 formularios pesados ni autenticación requerida).
- **Feed Principal Optimizado**:
  - Selector rápido de estado: **🚨 Activas** vs **✅ Cubiertas**.
  - Buscador rápido por barrio, ciudad o palabra clave.
  - Filtro por categorías con distintivos visuales y colores pasteles:
    - 👶 **Bebés / Lactancia** (Rosa Pastel `#FFE4E6` / `#E11D48`)
    - 🍲 **Alimentos** (Verde Esmeralda `#D1FAE5` / `#10B981`)
    - 🛌 **Ropa / Cobijas** (Azul `#DBEAFE` / `#2563EB`)
    - 🔨 **Voluntarios / Mano de Obra** (Ámbar `#FEF3C7` / `#F59E0B`)
    - 🏥 **Salud / Médicos** (Rojo Pasteles `#FEE2E2` / `#DC2626`)
    - 📦 **Otros Recursos** (Púrpura `#F3E8FF` / `#9333EA`)
- **Acciones Nativas en 1 Tap**:
  - **"+1 Me Sumo / Ofrecer Ayuda"**: Incrementa dinámicamente la barra de progreso y marca automáticamente la solicitud como resuelta al alcanzar la meta.
  - **WhatsApp Directo**: Abre `https://wa.me/57...` con un mensaje precargado de solidaridad directamente en la app de WhatsApp del celular.
  - **API Nativa Share**: Comparte la alerta comunitaria por WhatsApp, SMS o redes sociales.
- **Formulario de Publicación Ultra Rápido**: Publicación en menos de 30 segundos con sanitización automática del número de WhatsApp (+57).
- **Directorio de Líneas de Emergencia Oficiales en Colombia**: Botones de llamada directa a Cruz Roja (132), Defensa Civil (144), Bomberos (119), Policía (123), Gestión del Riesgo (154) y CRUE Salud (125).

---

## 📱 Cómo Probar en un Celular Físico con Expo Go

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo de Expo**:
   ```bash
   npx expo start
   ```

3. **Escanear el código QR**:
   - **Android**: Abre la aplicación **Expo Go** en tu celular y escanea el código QR mostrado en la terminal.
   - **iOS**: Abre la cámara nativa del iPhone y escanea el código QR para abrirlo en Expo Go.
   - **Web**: Presiona `w` en la terminal o ejecuta `npm run web` para probar en el navegador.

---

## 🛠️ Estructura del Proyecto

```
hu-manos-colombia/
├── app/
│   ├── _layout.tsx           # Layout principal y StatusBar
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Navegación por pestañas
│   │   ├── index.tsx         # Feed de solicitudes
│   │   ├── create.tsx        # Formulario de publicación (+ Crear)
│   │   └── emergency.tsx     # Directorio de líneas 123 Colombia
│   ├── detail/[id].tsx       # Vista ampliada y ubicación
│   └── +not-found.tsx
├── src/
│   ├── components/           # NeedCard, Header, SearchBar, CategoryChip, ProgressBar, StatusBadge
│   ├── constants/            # Paletas de color pasteles y configuración de categorías
│   ├── data/                 # Datos semilla reales de Colombia (Pereira, Quibdó, Mocoa, Bogotá, Cali)
│   ├── services/             # Almacenamiento local (AsyncStorage) y cliente Supabase
│   └── types/                # Interfaces TypeScript
```

---

## ⚡ Conexión Opcional con Supabase Realtime

Si deseas sincronizar las solicitudes en tiempo real con una base de datos de Supabase, agrega en tu archivo `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

De lo contrario, la aplicación opera de forma **instantánea fuera de línea** utilizando `AsyncStorage` y datos semilla para una experiencia óptima desde el primer segundo.
