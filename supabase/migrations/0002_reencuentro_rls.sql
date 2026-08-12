-- ============================================================================
-- Modulo REENCUENTRO — RLS / RBAC
-- Modelo (decidido 2026-08-12):
--   - CAPTURA: anonima/invitada (FAMILIAR/SOCORRISTA) — sin friccion en emergencia.
--   - LECTURA/GESTION sensible: roles privilegiados con AUTH verificada
--     (COORDINADOR / HOSPITAL / ALBERGUE).
--   - MENORES: su PII nunca es visible al publico anonimo.
--   - Prohibido `using (true)` en tablas con PII (a diferencia del patron de 'necesidades').
-- ============================================================================

-- Helper: el usuario actual tiene alguno de los roles dados.
-- SECURITY DEFINER para leer reencuentro_roles sin recursion de RLS.
create or replace function public.reencuentro_tiene_rol(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reencuentro_roles r
    where r.user_id = auth.uid()
      and r.rol = any(roles)
  );
$$;

-- ============================ roles ============================
alter table public.reencuentro_roles enable row level security;

create policy "roles: lectura propia o coordinador"
  on public.reencuentro_roles for select
  to authenticated
  using (user_id = auth.uid() or public.reencuentro_tiene_rol(array['COORDINADOR']));

-- Solo un COORDINADOR gestiona roles. NOTA: el primer coordinador se crea
-- manualmente (SQL Editor / service_role), porque no hay coordinador previo.
create policy "roles: gestion solo coordinador"
  on public.reencuentro_roles for all
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR']))
  with check (public.reencuentro_tiene_rol(array['COORDINADOR']));

-- ============================ reportes ============================
alter table public.reencuentro_reportes enable row level security;

-- CAPTURA: cualquiera (anon o autenticado) crea un reporte de captura.
create policy "reportes: captura publica"
  on public.reencuentro_reportes for insert
  to anon, authenticated
  with check (
    estado in ('CAPTURADO','PENDIENTE_SYNC','ACTIVO')
    and maestro_id is null
  );

-- LECTURA: NO publica. Roles privilegiados ven todo; el creador ve lo suyo
-- (y nunca datos de menores por la via del creador anonimo).
create policy "reportes: lectura por rol o creador"
  on public.reencuentro_reportes for select
  to authenticated
  using (
    public.reencuentro_tiene_rol(array['COORDINADOR','HOSPITAL','ALBERGUE'])
    or (creado_por_id = auth.uid()::text and es_menor = false)
  );

-- ACTUALIZACION: coordinador (estado/dedup/matching) o el creador (editar lo suyo).
create policy "reportes: actualizacion coordinador o creador"
  on public.reencuentro_reportes for update
  to authenticated
  using (
    public.reencuentro_tiene_rol(array['COORDINADOR'])
    or creado_por_id = auth.uid()::text
  )
  with check (
    public.reencuentro_tiene_rol(array['COORDINADOR'])
    or creado_por_id = auth.uid()::text
  );

-- BORRADO: solo coordinador (nada de borrado publico).
create policy "reportes: borrado solo coordinador"
  on public.reencuentro_reportes for delete
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR']));

-- ============================ coincidencias ============================
alter table public.reencuentro_coincidencias enable row level security;

-- Lectura: solo roles privilegiados. JAMAS publico ni familiares.
create policy "coincidencias: lectura roles privilegiados"
  on public.reencuentro_coincidencias for select
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR','HOSPITAL','ALBERGUE']));

-- Gestion (crear/confirmar/rechazar): solo COORDINADOR.
create policy "coincidencias: gestion solo coordinador"
  on public.reencuentro_coincidencias for all
  to authenticated
  using (public.reencuentro_tiene_rol(array['COORDINADOR']))
  with check (public.reencuentro_tiene_rol(array['COORDINADOR']));
