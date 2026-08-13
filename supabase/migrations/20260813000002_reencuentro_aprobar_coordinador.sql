-- ============================================================================
-- Modulo REENCUENTRO — Aprobacion de coordinador (camino 'b', atomico)
-- Un COORDINADOR aprueba una solicitud PENDIENTE en UNA transaccion:
--   1) otorga el rol COORDINADOR (idempotente),
--   2) marca la solicitud APROBADA (revisado_por/en),
--   3) registra la auditoria append-only.
-- SECURITY DEFINER: corre como owner, pero auth.uid() sigue siendo el del que
-- llama, asi que la verificacion de rol y la autoria quedan a nombre del coordinador.
-- El dueno (camino 'a') no usa esto: opera via service_role en el SQL Editor.
-- Aplicar con `supabase db push`.
-- ============================================================================

create or replace function public.reencuentro_aprobar_coordinador(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public.reencuentro_solicitudes_coordinador%rowtype;
begin
  if not public.reencuentro_tiene_rol(array['COORDINADOR']) then
    raise exception 'No autorizado: se requiere rol COORDINADOR';
  end if;

  select * into v_solicitud
  from public.reencuentro_solicitudes_coordinador
  where id = p_solicitud_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado <> 'PENDIENTE' then
    raise exception 'La solicitud ya fue procesada (estado: %)', v_solicitud.estado;
  end if;

  -- 1) Otorga el rol COORDINADOR (idempotente por PK user_id+rol).
  insert into public.reencuentro_roles (user_id, rol, otorgado_por)
  values (v_solicitud.user_id, 'COORDINADOR', auth.uid())
  on conflict (user_id, rol) do nothing;

  -- 2) Marca la solicitud como aprobada.
  update public.reencuentro_solicitudes_coordinador
  set estado = 'APROBADA', revisado_por = auth.uid(), revisado_en = now(), actualizado_en = now()
  where id = p_solicitud_id;

  -- 3) Auditoria append-only.
  insert into public.reencuentro_aprobaciones
    (solicitud_id, aprobador_id, usuario_aprobado_id, rol_otorgado, zona)
  values
    (p_solicitud_id, auth.uid(), v_solicitud.user_id, 'COORDINADOR', v_solicitud.zona);
end;
$$;

-- Rechazo: solo marca la solicitud (no otorga rol, no audita privilegios).
create or replace function public.reencuentro_rechazar_coordinador(
  p_solicitud_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.reencuentro_tiene_rol(array['COORDINADOR']) then
    raise exception 'No autorizado: se requiere rol COORDINADOR';
  end if;

  update public.reencuentro_solicitudes_coordinador
  set estado = 'RECHAZADA', motivo_rechazo = p_motivo,
      revisado_por = auth.uid(), revisado_en = now(), actualizado_en = now()
  where id = p_solicitud_id and estado = 'PENDIENTE';

  if not found then
    raise exception 'Solicitud no encontrada o ya procesada';
  end if;
end;
$$;

-- Los autenticados pueden invocar; la funcion valida el rol adentro.
grant execute on function public.reencuentro_aprobar_coordinador(uuid) to authenticated;
grant execute on function public.reencuentro_rechazar_coordinador(uuid, text) to authenticated;
