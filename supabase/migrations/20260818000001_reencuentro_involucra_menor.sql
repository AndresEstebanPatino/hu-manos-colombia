-- ============================================================================
-- Modulo REENCUENTRO — Salvaguarda para coincidencias con menores de edad
-- Agrega columna `involucra_menor` a `reencuentro_coincidencias` y actualiza
-- la función RPC de matching `reencuentro_generar_coincidencias()`
-- ============================================================================

-- 1. Añadir columna involucra_menor a la tabla public.reencuentro_coincidencias
alter table public.reencuentro_coincidencias
  add column if not exists involucra_menor boolean not null default false;

-- 2. Actualizar la función de matching public.reencuentro_generar_coincidencias()
create or replace function public.reencuentro_generar_coincidencias()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_afectadas integer;
begin
  if not (
    auth.role() is null
    or auth.role() = 'service_role'
    or public.reencuentro_tiene_rol(array['COORDINADOR'])
  ) then
    raise exception 'Solo un COORDINADOR (o service_role) puede generar coincidencias.';
  end if;

  with pares as (
    select
      b.id as buscada_id,
      e.id as encontrada_id,
      e.estado_vital,
      (b.es_menor or e.es_menor) as involucra_menor,
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
     and e.nombre % b.nombre
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
    (id, reporte_buscada_id, reporte_encontrada_id, estado, banda, evidencia, involucra_fallecido, involucra_menor)
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
    (estado_vital = 'FALLECIDA'),
    involucra_menor
  from finales
  on conflict (reporte_buscada_id, reporte_encontrada_id) do update
    set banda = excluded.banda,
        evidencia = excluded.evidencia,
        involucra_fallecido = excluded.involucra_fallecido,
        involucra_menor = excluded.involucra_menor,
        actualizado_en = now()
    where reencuentro_coincidencias.estado = 'SUGERIDA';

  get diagnostics v_afectadas = row_count;
  return v_afectadas;
end;
$$;

-- 3. Actualizar retroactivamente coincidencias existentes
update public.reencuentro_coincidencias c
set involucra_menor = (b.es_menor or e.es_menor)
from public.reencuentro_reportes b, public.reencuentro_reportes e
where c.reporte_buscada_id = b.id
  and c.reporte_encontrada_id = e.id;

-- 4. Aplicar principio de precaución retroactivo a reportes preexistentes sin edad
update public.reencuentro_reportes
set es_menor = true
where edad_aprox is null and es_menor = false;
