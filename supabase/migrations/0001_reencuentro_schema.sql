-- ============================================================================
-- Modulo REENCUENTRO — esquema (personas reportadas, coincidencias, roles)
-- Convenciones: identificadores en minuscula/snake_case. RLS se habilita en 0002.
-- Aplicar en Supabase (SQL Editor o `supabase db push`).
-- ============================================================================

-- Extensiones para el cruce tolerante (fase de matching): sin acentos + trigramas.
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Roles del modulo (RBAC). Un usuario AUTENTICADO puede tener uno o mas roles.
-- La captura NO requiere rol (es anonima/invitada); los roles son privilegiados.
-- ---------------------------------------------------------------------------
create table if not exists public.reencuentro_roles (
  user_id      uuid not null references auth.users (id) on delete cascade,
  rol          text not null check (rol in ('COORDINADOR','HOSPITAL','ALBERGUE')),
  otorgado_por uuid references auth.users (id),
  creado_en    timestamptz not null default now(),
  primary key (user_id, rol)
);

-- ---------------------------------------------------------------------------
-- Reporte de persona (esquema unico BUSCADA / ENCONTRADA).
-- ---------------------------------------------------------------------------
create table if not exists public.reencuentro_reportes (
  id                  text primary key,                 -- UUID de cliente (idempotencia de sync)
  tipo                text not null check (tipo in ('BUSCADA','ENCONTRADA')),
  estado              text not null default 'ACTIVO'
                        check (estado in ('CAPTURADO','PENDIENTE_SYNC','ACTIVO','DUPLICADO','RESUELTO','ARCHIVADO')),
  nombre              text,
  edad_aprox          int check (edad_aprox is null or (edad_aprox >= 0 and edad_aprox <= 130)),
  es_menor            boolean not null default false,
  sexo                text check (sexo in ('M','F','OTRO','DESCONOCIDO')),
  descripcion_fisica  text,
  ropa                text,
  senas_particulares  text,
  ubicacion_texto     text,
  ubicacion_lat       double precision,
  ubicacion_lng       double precision,
  foto_url            text,
  estado_vital        text check (estado_vital in ('CON_VIDA','FALLECIDA','DESCONOCIDO')),
  reportante_nombre   text,
  reportante_contacto text,
  reportante_relacion text,
  creado_por_rol      text not null check (creado_por_rol in ('FAMILIAR','SOCORRISTA','HOSPITAL','ALBERGUE','COORDINADOR')),
  creado_por_id       text not null,                    -- auth.uid()::text o id de invitado
  maestro_id          text references public.reencuentro_reportes (id) on delete set null,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  constraint estado_vital_solo_encontrada check (estado_vital is null or tipo = 'ENCONTRADA')
);

create index if not exists idx_reencuentro_reportes_tipo_estado on public.reencuentro_reportes (tipo, estado);
create index if not exists idx_reencuentro_reportes_nombre_trgm on public.reencuentro_reportes using gin (nombre gin_trgm_ops);
create index if not exists idx_reencuentro_reportes_maestro     on public.reencuentro_reportes (maestro_id);
create index if not exists idx_reencuentro_reportes_es_menor    on public.reencuentro_reportes (es_menor);

-- ---------------------------------------------------------------------------
-- Coincidencia candidata BUSCADA <-> ENCONTRADA (human-in-the-loop).
-- Regla dura a nivel de BD: una coincidencia con fallecido NO puede quedar
-- CONFIRMADA (o mas alla) sin un segundo validador distinto del revisor.
-- ---------------------------------------------------------------------------
create table if not exists public.reencuentro_coincidencias (
  id                    text primary key,
  reporte_buscada_id    text not null references public.reencuentro_reportes (id) on delete cascade,
  reporte_encontrada_id text not null references public.reencuentro_reportes (id) on delete cascade,
  estado                text not null default 'SUGERIDA'
                          check (estado in ('SUGERIDA','EN_REVISION','INFO_INSUFICIENTE','RECHAZADA','CONFIRMADA','PENDIENTE_NOTIFICACION','NOTIFICADA','CERRADA')),
  banda                 text not null check (banda in ('REVISION_PRIORITARIA','POSIBLE','BAJA')),
  evidencia             jsonb not null default '[]'::jsonb,
  involucra_fallecido   boolean not null default false,
  revisor_id            uuid references auth.users (id),
  segundo_validador_id  uuid references auth.users (id),
  motivo_rechazo        text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  constraint par_distinto check (reporte_buscada_id <> reporte_encontrada_id),
  constraint doble_validacion_fallecido check (
    not (involucra_fallecido and estado in ('CONFIRMADA','PENDIENTE_NOTIFICACION','NOTIFICADA','CERRADA'))
    or (revisor_id is not null and segundo_validador_id is not null and segundo_validador_id <> revisor_id)
  )
);

create index if not exists idx_reencuentro_coincidencias_estado_banda on public.reencuentro_coincidencias (estado, banda);
create index if not exists idx_reencuentro_coincidencias_buscada      on public.reencuentro_coincidencias (reporte_buscada_id);
create index if not exists idx_reencuentro_coincidencias_encontrada   on public.reencuentro_coincidencias (reporte_encontrada_id);
