-- ============================================================================
-- Modulo REENCUENTRO — Motor de matching (cruce estructurado BUSCADA <-> ENCONTRADA)
-- La IA SUGIERE y PRIORIZA; el coordinador decide (human-in-the-loop).
-- Se ejecuta como RPC: select public.reencuentro_generar_coincidencias();
-- ============================================================================

-- Idempotencia: un unico par (buscada, encontrada) -> permite upsert sin duplicar.
alter table public.reencuentro_coincidencias
  add constraint uq_reencuentro_coincidencia_par
  unique (reporte_buscada_id, reporte_encontrada_id);

-- ---------------------------------------------------------------------------
-- Genera/actualiza coincidencias candidatas. Devuelve cuantas toco.
-- Puntaje = 0.55*nombre + 0.20*edad + 0.15*ubicacion + 0.10*sexo  (0..1).
-- Candidatos por similitud de nombre (trigrama, tolerante a acentos/typos).
-- Solo crea/refresca coincidencias en estado SUGERIDA: NUNCA pisa una que el
-- coordinador ya tomo/confirmo/rechazo.
-- ---------------------------------------------------------------------------
create or replace function public.reencuentro_generar_coincidencias()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_afectadas integer;
begin
  -- Solo un COORDINADOR (o un proceso con service_role) puede dispararlo.
  if not (public.reencuentro_tiene_rol(array['COORDINADOR']) or auth.role() = 'service_role') then
    raise exception 'Solo un COORDINADOR (o service_role) puede generar coincidencias.';
  end if;

  with pares as (
    select
      b.id as buscada_id,
      e.id as encontrada_id,
      e.estado_vital,
      similarity(unaccent(lower(b.nombre)), unaccent(lower(e.nombre))) as name_sim,
      case
        when b.edad_aprox is null or e.edad_aprox is null then 0.5
        else greatest(0, 1 - least(abs(b.edad_aprox - e.edad_aprox), 15)::numeric / 15)
      end as age_score,
      case
        when b.ubicacion_lat is not null and e.ubicacion_lat is not null then
          greatest(0, 1 - least(
            2 * 6371 * asin(sqrt(
              power(sin(radians((e.ubicacion_lat - b.ubicacion_lat) / 2)), 2) +
              cos(radians(b.ubicacion_lat)) * cos(radians(e.ubicacion_lat)) *
              power(sin(radians((e.ubicacion_lng - b.ubicacion_lng) / 2)), 2)
            )), 100)::numeric / 100)
        when b.ubicacion_texto is not null and e.ubicacion_texto is not null then
          similarity(unaccent(lower(b.ubicacion_texto)), unaccent(lower(e.ubicacion_texto)))
        else 0.4
      end as geo_score,
      case
        when b.sexo is null or e.sexo is null or b.sexo = 'DESCONOCIDO' or e.sexo = 'DESCONOCIDO' then 0.5
        when b.sexo = e.sexo then 1.0
        else 0.0
      end as sex_score,
      b.nombre as b_nombre, e.nombre as e_nombre,
      b.edad_aprox as b_edad, e.edad_aprox as e_edad,
      b.ubicacion_texto as b_ubic, e.ubicacion_texto as e_ubic
    from public.reencuentro_reportes b
    join public.reencuentro_reportes e
      on b.tipo = 'BUSCADA'
     and e.tipo = 'ENCONTRADA'
     and e.nombre % b.nombre                 -- candidato por trigrama (usa indice GIN)
    where b.estado = 'ACTIVO' and e.estado = 'ACTIVO'
      and b.nombre is not null and e.nombre is not null
  ),
  clasificadas as (
    select *,
      (0.55 * name_sim + 0.20 * age_score + 0.15 * geo_score + 0.10 * sex_score) as score
    from pares
  ),
  finales as (
    select *,
      case
        when score >= 0.75 then 'REVISION_PRIORITARIA'
        when score >= 0.55 then 'POSIBLE'
        else 'BAJA'
      end as banda
    from clasificadas
    where score >= 0.40
  )
  insert into public.reencuentro_coincidencias
    (id, reporte_buscada_id, reporte_encontrada_id, estado, banda, evidencia, involucra_fallecido)
  select
    gen_random_uuid()::text,
    buscada_id, encontrada_id, 'SUGERIDA', banda,
    jsonb_build_array(jsonb_build_object('campo', 'nombre', 'detalle', b_nombre || ' ~ ' || e_nombre))
    || case when b_edad is not null and e_edad is not null
            then jsonb_build_array(jsonb_build_object('campo', 'edad', 'detalle', b_edad::text || ' vs ' || e_edad::text))
            else '[]'::jsonb end
    || case when b_ubic is not null and e_ubic is not null
            then jsonb_build_array(jsonb_build_object('campo', 'ubicacion', 'detalle', b_ubic || ' vs ' || e_ubic))
            else '[]'::jsonb end,
    (estado_vital = 'FALLECIDA')
  from finales
  on conflict (reporte_buscada_id, reporte_encontrada_id) do update
    set banda = excluded.banda,
        evidencia = excluded.evidencia,
        involucra_fallecido = excluded.involucra_fallecido,
        actualizado_en = now()
    where reencuentro_coincidencias.estado = 'SUGERIDA';   -- no pisa lo ya revisado

  get diagnostics v_afectadas = row_count;
  return v_afectadas;
end;
$$;

-- Solo roles autenticados / procesos server pueden ejecutarla (nunca anon).
revoke all on function public.reencuentro_generar_coincidencias() from public;
revoke all on function public.reencuentro_generar_coincidencias() from anon;
grant execute on function public.reencuentro_generar_coincidencias() to authenticated;
grant execute on function public.reencuentro_generar_coincidencias() to service_role;

-- Futuro (no habilitado): agendar con pg_cron, p. ej.:
--   select cron.schedule('reencuentro-matching', '*/2 * * * *',
--     $$ select public.reencuentro_generar_coincidencias() $$);
