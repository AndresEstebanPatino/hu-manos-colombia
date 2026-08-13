# Backend con Supabase CLI — flujo programático

Cómo aplicamos y evolucionamos la base de datos **de forma reproducible y versionada** (el schema es código, vive en `supabase/migrations/`).

Proyecto: `AndresEstebanPatino's Project` · ref **`xrxuzvvvorxukyoeqibg`** · región Frankfurt.

---

## Idea central
El esquema NO se toca a mano en el dashboard. Cada cambio es un **archivo de migración** en `supabase/migrations/` (en git), y se aplica con **un comando** (`npm run db:push`). Así cualquiera reproduce la DB idéntica, y el matching/futuros cambios entran igual.

CLI instalado como devDep → se usa con `npm run ...` (no requiere install global).

---

## 1. Setup por única vez (lo corres tú — usa tu token)
```bash
# 1) Autenticarse (pega el access token de https://supabase.com/dashboard/account/tokens)
npx supabase login

# 2) Linkear el repo con el proyecto (te pedirá la DB password del proyecto)
npm run db:link
```
> El link guarda el ref/credenciales en `supabase/.temp/` (ya está en `.gitignore`, no se commitea).

## 2. Aplicar el schema (migraciones)
```bash
npm run db:push
```
Aplica en orden:
- `2026...01_reencuentro_schema.sql` (tablas + índices + constraints, incl. doble validación de fallecidos)
- `2026...02_reencuentro_rls.sql` (RLS/RBAC)

Verás en el dashboard → **Database → Migrations** que quedan registradas.

## 3. Crear el primer coordinador (programático)
No hay coordinador previo que otorgue el rol, así que se crea con la **service_role key** (secreta):
```bash
# PowerShell
$env:SUPABASE_URL="https://xrxuzvvvorxukyoeqibg.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key de Settings > API>"
$env:COORD_EMAIL="coordinador@tu-dominio.com"
$env:COORD_PASSWORD="una-clave-fuerte"
npm run bootstrap:coord
```
> La **service_role key** salta el RLS: úsala SOLO en scripts locales/servidor, NUNCA en la app ni en git.

## 4. Conectar la app (.env)
Crea `.env` en la raíz (ya está en `.gitignore`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xrxuzvvvorxukyoeqibg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key de Settings > API>
```
La app usa la **anon key** (pública, protegida por RLS). Nunca la service_role.

---

## Cómo seguimos evolucionando el schema (p. ej. el matching)
```bash
# 1) Nueva migración (genera un archivo con timestamp)
npx supabase migration new matching_rpc

# 2) Editar el .sql generado (yo lo escribo: funciones pg_trgm/unaccent + RPC)

# 3) Aplicar
npm run db:push
```
Así el **motor de matching** entra como una migración más, versionada y reproducible. Sin tocar el dashboard a mano.

---

## Alternativas (si algún día no quieres el CLI)
- **Management API:** `POST https://api.supabase.com/v1/projects/xrxuzvvvorxukyoeqibg/database/query` con un Personal Access Token (Bearer) y `{ "query": "<SQL>" }`.
- **psql directo:** `psql "<connection string de Settings > Database>" -f supabase/migrations/<archivo>.sql`.

---

## Reparto (qué hago yo / qué haces tú)
- **Yo:** escribo/edito migraciones y scripts (versionados en git), abro PRs.
- **Tú:** corres los comandos autenticados (`login`, `db:link`, `db:push`, `bootstrap:coord`) porque usan tus tokens/keys, que no debo manipular.
