# Revisión de Seguridad — Secretos y RLS

**Fecha:** 2026-08-12 · **Rama:** `fix/supabase-security` · **Motivo:** el módulo Reencuentro almacenará PII de personas desaparecidas y menores; el patrón de seguridad actual no es apto para ese dato.

---

## 1. Secretos hardcodeados — RESUELTO en código

- **Antes:** `src/lib/supabase.ts` tenía la URL real del proyecto y una key como fallback hardcodeado.
- **Ahora:** se leen **solo** de `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Sin env → placeholders → `isSupabaseConfigured()` devuelve `false` → la app opera en modo local/offline (comportamiento documentado en el README).
- **Añadido:** `.env.example` con las variables requeridas. `.env` sigue en `.gitignore`.

> ⚠️ **Historial git:** los valores anteriores quedaron en el commit inicial `4c8c884`. La *anon/publishable key* de Supabase está diseñada para ser pública (su protección es el RLS, no el secreto). Aun así, si se considera sensible, **rotarla** en el dashboard de Supabase. **El riesgo real no es la key: es el RLS público (§2).**

---

## 2. Revisión del RLS actual (`supabase_setup.sql`)

| Tabla | Política actual | Riesgo | Recomendación |
|---|---|---|---|
| `necesidades` | Público en SELECT/INSERT/**UPDATE**/**DELETE** | Cualquiera con la anon key puede **borrar o editar** cualquier solicitud | Mantener SELECT+INSERT público (es un tablón); **quitar DELETE público**; acotar UPDATE a progreso/apoyo. Requiere identidad. |
| `notificaciones` | Público en ALL | INSERT público = spam de notificaciones | SELECT público OK; **INSERT restringido** (server / trigger, no cliente anónimo) |
| `user_push_tokens` | Público en ALL | Tokens push semi-sensibles; cualquiera **lee todos** | **No público:** cada usuario gestiona solo su token (`auth.uid()`) |

**Veredicto:** para un tablón comunitario abierto, el patrón público de `necesidades` es defendible en lectura, pero **el DELETE público y el acceso total a `user_push_tokens` deben corregirse**. Para PII (Reencuentro) el patrón público **no aplica en absoluto**.

---

## 3. Regla dura para el módulo Reencuentro (PII)

- **Prohibido** `USING (true)` / `WITH CHECK (true)` en tablas con PII.
- **RBAC por rol**: `familiar`, `socorrista`, `hospital`, `albergue`, `coordinador`. Cada rol ve/escribe solo lo que le corresponde.
- **Menores** (`es_menor = true`): acceso restringido; sin exposición pública; foto/PII solo para roles autorizados.
- El **coordinador** (valida coincidencias sensibles) exige **identidad verificable**, no invitado anónimo.

---

## 4. Bloqueante de fondo: modelo de autenticación

Hoy la app opera mayormente **anónima/invitado** (`AuthContext` → `signInQuick` / `signInAnonymously`). Un RBAC real necesita identidad verificable al menos para roles sensibles (coordinador, hospital). **Decisión de producto + tech antes de la Ola 0 backend.**

---

## 5. Propuesta de policies endurecidas (para revisar/aplicar coordinadamente)

> No aplicado automáticamente: requiere migración coordinada + pruebas para no romper la app de necesidades. Ejemplos ilustrativos:

```sql
-- necesidades: quitar DELETE público
DROP POLICY IF EXISTS "Permitir eliminación de solicitudes" ON public.necesidades;
-- (opcional) permitir DELETE solo al creador cuando haya auth real:
-- CREATE POLICY "Borrado solo del creador" ON public.necesidades
--   FOR DELETE USING (auth.uid()::text = creador_id);

-- user_push_tokens: cada quien gestiona su propio token
DROP POLICY IF EXISTS "Permitir registro público de push tokens" ON public.user_push_tokens;
CREATE POLICY "Token propio: lectura"  ON public.user_push_tokens FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Token propio: escritura" ON public.user_push_tokens FOR ALL   USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
```

Para las tablas del módulo Reencuentro, el RBAC se define desde cero en la Ola 0 (Backend) — ver `roadmap-y-orquestacion.md` §7.

---

## Checklist

- [x] Credenciales fuera del código (solo env) + `.env.example`.
- [ ] Rotar anon key si se considera sensible (dashboard Supabase).
- [ ] Quitar DELETE público de `necesidades` (migración coordinada).
- [ ] Cerrar `user_push_tokens` a token propio.
- [ ] Definir modelo de auth para roles sensibles (pre Ola 0 backend).
- [ ] RBAC real en las tablas de Reencuentro (Ola 0 backend).
