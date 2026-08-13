-- ============================================================================
-- Modulo REENCUENTRO — Onboarding de coordinador de zona
-- Modelo de aprobacion (decidido 2026-08-13): a + b, SIN rol ADMIN.
--   a) RAIZ DE CONFIANZA / SEMILLA: el dueno (SQL Editor / service_role) crea los
--      primeros coordinadores y otorga HOSPITAL/ALBERGUE. service_role omite RLS.
--   b) ESCALA: un COORDINADOR autenticado aprueba nuevas solicitudes y solo puede
--      otorgar el rol COORDINADOR (nunca HOSPITAL/ALBERGUE — eso queda para 'a').
--   + AUDITORIA append-only de cada aprobacion (quien aprobo a quien, cuando, zona).
--   ADMIN: se deja como opcion de Fase 3 (aditivo); hoy seria YAGNI.
--
-- DEPENDENCIA DE CONFIG (MVP): el registro inserta la solicitud con la sesion del
-- propio aspirante (RLS user_id = auth.uid()). Para que exista sesion tras signUp,
-- el proyecto debe tener DESHABILITADA la confirmacion por email (Auth > Providers >
-- Email > "Confirm email" = off), acorde a un onboarding de baja friccion en
-- emergencia. Si se habilita confirmacion, la insercion debe moverse a post-confirm.
--
-- Aplicar en Supabase (SQL Editor o `supabase db push`).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Solicitud de coordinador: una por usuario. Nace PENDIENTE.
-- ---------------------------------------------------------------------------
create table if not exists public.reencuentro_solicitudes_coordinador (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users (id) on delete cascade,
  nombre_completo text not null,
  email           text not null,
  telefono        text not null,
  zona            text not null,
  organizacion    text,
  estado          text not null default 'PENDIENTE'
                    check (estado in ('PENDIENTE','APROBADA','RECHAZADA')),
  revisado_por    uuid references auth.users (id),
  revisado_en     timestamptz,
  motivo_rechazo  text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists idx_reencuentro_solicitudes_estado
  on public.reencuentro_solicitudes_coordinador (estado);

-- ---------------------------------------------------------------------------
-- Auditoria APPEND-ONLY de aprobaciones (accountability del camino 'b').
-- Sin politicas UPDATE/DELETE => inmutable para usuarios autenticados.
-- ---------------------------------------------------------------------------
create table if not exists public.reencuentro_aprobaciones (
  id                  uuid primary key default gen_random_uuid(),
  solicitud_id        uuid references public.reencuentro_solicitudes_coordinador (id) on delete set null,
  aprobador_id        uuid not null references auth.users (id),
  usuario_aprobado_id uuid not null references auth.users (id),
  rol_otorgado        text not null default 'COORDINADOR' check (rol_otorgado = 'COORDINADOR'),
  zona                text,
  creado_en           timestamptz not null default now()
);

create index if not exists idx_reencuentro_aprobaciones_usuario
  on public.reencuentro_aprobaciones (usuario_aprobado_id);

-- ============================ RLS: solicitudes ============================
alter table public.reencuentro_solicitudes_coordinador enable row level security;

-- El aspirante crea SU propia solicitud, obligatoriamente en estado PENDIENTE
-- (no puede auto-aprobarse).
create policy "solicitudes: crea la propia (PENDIENTE)"
  on public.reencuentro_solicitudes_coordinador for insert
  to authenticated
  with check (user_id = auth.uid() and estado = 'PENDIENTE');

-- Lectura: el propio aspirante ve la suya; el COORDINADOR ve todas (para revisar).
create policy "solicitudes: lectura propia o coordinador"
  on public.reencuentro_solicitudes_coordinador for select
  to authenticated
  using (user_id = auth.uid() or public.reencuentro_tiene_rol(array['COORDINADOR']));

-- Aprobar/rechazar: solo COORDINADOR (camino 'b'). El dueno via service_role omite RLS.
create policy "solicitudes: revision solo coordinador"
  on public.reencuentro_solicitudes_coordinador for update
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR']))
  with check (public.reencuentro_tiene_rol(array['COORDINADOR']));

-- ============================ RLS: aprobaciones ============================
alter table public.reencuentro_aprobaciones enable row level security;

-- Solo un COORDINADOR registra la aprobacion, y a su propio nombre.
create policy "aprobaciones: inserta coordinador (a su nombre)"
  on public.reencuentro_aprobaciones for insert
  to authenticated
  with check (public.reencuentro_tiene_rol(array['COORDINADOR']) and aprobador_id = auth.uid());

-- Lectura del historial: solo coordinadores.
create policy "aprobaciones: lectura coordinador"
  on public.reencuentro_aprobaciones for select
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR']));
-- (Sin UPDATE ni DELETE => append-only para autenticados.)

-- ============================ Refuerzo del camino 'b' ============================
-- Un COORDINADOR autenticado solo puede OTORGAR el rol COORDINADOR (no HOSPITAL/
-- ALBERGUE). Reemplaza la gestion "de todos los roles" por una acotada al rol
-- COORDINADOR. HOSPITAL/ALBERGUE se otorgan solo via service_role (camino 'a').
drop policy if exists "roles: gestion solo coordinador" on public.reencuentro_roles;

create policy "roles: coordinador otorga solo COORDINADOR"
  on public.reencuentro_roles for all
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR']))
  with check (public.reencuentro_tiene_rol(array['COORDINADOR']) and rol = 'COORDINADOR');
