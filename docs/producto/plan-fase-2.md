# Plan Fase 2 — Reencuentro: MVP usable + UX

**Goal:** MVP usable end-to-end — el coordinador entra, cruza, valida y notifica; con UX de descubrimiento (lista, búsqueda, mapa) y cifras limpias e interoperables.

## Estado base (Fase 1, en `dev`)
Captura offline + sync (NetInfo) · modelo de datos único · **matching validado en Postgres** (unaccent+pg_trgm) · tablero del coordinador cableado · RLS/RBAC · blindaje de fallecidos codificado · backend aplicado a Supabase (ref `xrxuzvvvorxukyoeqibg`).

## Auth heredado (hallazgo)
El `AuthModal`/`AuthContext` traen **Google** (requiere Google Cloud → hoy cae a perfil **simulado**), **teléfono OTP** (stub, no verifica), **invitado anónimo** (funciona). **No hay email/contraseña.** Fase 2 añade email/password (nativo Supabase). El rol COORDINADOR solo se asigna a cuentas reales.

## Olas (orden de ejecución)

| # | Ola | Alcance | Gate / dependencia |
|---|---|---|---|
| 1 | **Login coordinador + gating** | email/password en AuthContext + AuthModal; `isCoordinador` (query `reencuentro_roles`); pestaña "Coordinación" role-gated | DB lista |
| 2 | **Lista + búsqueda + filtros + compartir** | lista pública (menores ocultos); búsqueda tolerante (unaccent/pg_trgm); filtros (tipo/zona/edad/estado/foto); compartir reporte por WhatsApp | reportes en DB |
| 3 | **Captura geo: GPS + geocoding** | GPS auto-rellena ubicación; autocompletar dirección con **Nominatim (OSM)**; reverse-geocode | adaptador Nominatim (HTTP, sin key) |
| 4 | **Mapa de reportes (open-source)** | pines BUSCADA/ENCONTRADA + clustering + filtro por zona; **MapLibre GL** o **Leaflet + tiles OSM** (sin llaves Google) | coords que alimenta la Ola 3 |
| 5 | **Notificación familiar (HITL) + seguimiento + 2ª validación fallecidos** | confirmar con vida → aviso al reportante; seguimiento del reporte; fallecido → no notifica + tarea de protocolo + exige 2º validador ≠ revisor | `user_push_tokens` + migración menor |
| 6 | **Deduplicación** | `reencuentro_generar_duplicados()` → `maestro_id`/`DUPLICADO` reversible; UI de fusión; hilo único multi-familiar | migración → `db push` |
| 7 | **PFIF export** | mapeo dominio→PFIF (person/note) + export | mapeo puro (testeable) |
| 8 | **Foto en captura** | expo-image-picker + expo-image-manipulator + Storage bucket (RBAC, menores) + subida diferida | bucket (migración/config) |

**Dependencia clave:** Ola 3 (GPS) alimenta las coordenadas que la Ola 4 (mapa) necesita.

## Criterios de aceptación (clave, testables)
- **1:** coordinador con email/pass ve el tablero con datos; invitado no ve la pestaña ni datos (RLS).
- **2:** la lista oculta PII de menores al público; la búsqueda tolera acentos/typos; compartir abre WhatsApp con el enlace del reporte.
- **3:** al capturar, el GPS rellena la ubicación; el autocompletado sugiere direcciones reales de OSM.
- **4:** el mapa muestra los reportes con coords, diferenciando BUSCADA/ENCONTRADA; filtra por zona.
- **5:** sin confirmación humana no se notifica; fallecido → no notifica por app y exige 2º validador distinto del revisor.
- **6:** dos BUSCADA casi iguales → sugiere fusión reversible; no infla cifras.
- **7:** el export cumple el esquema PFIF (person/note).
- **8:** la foto se comprime en el dispositivo y sube tras el registro (no bloquea); menores restringidos.

## Gates donde el loop pausa para el humano
- Aplicar migraciones (Olas 5/6/8 → `db push` + smoke).
- Push nativo real (necesita dev build/EAS; como MVP registramos avisos en tabla).
- Google OAuth real y protocolo de fallecidos: fuera de scope (externos).

## Reglas del loop
Bounded + TDD, una rama/PR por ola, reindex (codebase memory) antes de cada ola, yo escribo migraciones / el humano las aplica, pauso en los gates.
