-- ============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS, GPS REALTIME Y NOTIFICACIONES - HU-MANOS COLOMBIA 🇨🇴
-- Ejecuta este código en: Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Crear la tabla 'necesidades' con coordenadas latitud y longitud GPS
CREATE TABLE IF NOT EXISTS public.necesidades (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('RECURSO', 'VOLUNTARIO')),
  categoria TEXT NOT NULL CHECK (categoria IN ('BEBES_LACTANCIA', 'ALIMENTOS', 'ROPA_COBIJAS', 'MANO_DE_OBRA', 'SALUD', 'OTRO')),
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  ubicacion TEXT NOT NULL,
  contacto_whatsapp TEXT NOT NULL,
  meta_cantidad INTEGER NOT NULL DEFAULT 1,
  progreso_actual INTEGER NOT NULL DEFAULT 0,
  completado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unidad_medida TEXT DEFAULT 'unidades',
  creador_id TEXT DEFAULT 'anonimo',
  apoyantes_ids TEXT[] DEFAULT '{}'::TEXT[],
  votos_confianza INTEGER DEFAULT 0,
  voto_confianza_ids TEXT[] DEFAULT '{}'::TEXT[],
  reportes_spam INTEGER DEFAULT 0,
  reportado_por_ids TEXT[] DEFAULT '{}'::TEXT[],
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  imagen_url TEXT
);

-- Asegurar columnas si la tabla ya existía previa
ALTER TABLE public.necesidades ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION;
ALTER TABLE public.necesidades ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;
ALTER TABLE public.necesidades ADD COLUMN IF NOT EXISTS votos_confianza INTEGER DEFAULT 0;
ALTER TABLE public.necesidades ADD COLUMN IF NOT EXISTS reportes_spam INTEGER DEFAULT 0;
ALTER TABLE public.necesidades ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 1.1 Configurar Supabase Storage para Imágenes de Necesidades
INSERT INTO storage.buckets (id, name, public) 
VALUES ('necesidades-fotos', 'necesidades-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Acceso público de lectura a imágenes" ON storage.objects;
CREATE POLICY "Acceso público de lectura a imágenes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'necesidades-fotos');

DROP POLICY IF EXISTS "Permitir subir imágenes a usuarios" ON storage.objects;
CREATE POLICY "Permitir subir imágenes a usuarios" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'necesidades-fotos');

-- 2. Habilitar RLS en necesidades
ALTER TABLE public.necesidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública de solicitudes" ON public.necesidades;
CREATE POLICY "Permitir lectura pública de solicitudes" ON public.necesidades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir creación pública de solicitudes" ON public.necesidades;
CREATE POLICY "Permitir creación pública de solicitudes" ON public.necesidades FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización pública de progreso" ON public.necesidades;
CREATE POLICY "Permitir actualización pública de progreso" ON public.necesidades FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminación de solicitudes" ON public.necesidades;
CREATE POLICY "Permitir eliminación de solicitudes" ON public.necesidades FOR DELETE USING (true);

-- 3. Crear la tabla 'notificaciones' para la Campana 🔔 de la Comunidad
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'NUEVO_EVENTO',
  necesidad_id TEXT,
  creado_por TEXT DEFAULT 'anonimo',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acceso público a notificaciones" ON public.notificaciones;
CREATE POLICY "Permitir acceso público a notificaciones" ON public.notificaciones FOR ALL USING (true) WITH CHECK (true);

-- 4. Crear la tabla 'user_push_tokens' para Notificaciones Push (Expo Push Tokens)
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  push_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir registro público de push tokens" ON public.user_push_tokens;
CREATE POLICY "Permitir registro público de push tokens" ON public.user_push_tokens FOR ALL USING (true) WITH CHECK (true);

-- 5. Habilitar Suscripciones en Tiempo Real (Supabase Realtime)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.necesidades, public.notificaciones;
COMMIT;

-- 6. Cargar solicitudes iniciales de prueba (Seed Data de Colombia con Coordenadas GPS)
INSERT INTO public.necesidades (id, tipo, categoria, titulo, descripcion, ubicacion, contacto_whatsapp, meta_cantidad, progreso_actual, completado, creado_en, unidad_medida, latitud, longitud)
VALUES
  ('need-001', 'RECURSO', 'BEBES_LACTANCIA', 'Urgente: Nodriza / Leche materna para bebé de 7 meses', 'Bebé de 7 meses rescatado en albergue temporal necesita fórmula láctea etapa 2 o nodriza voluntaria. La madre se encuentra incapacitada temporalmente.', 'Cancha Barrio Boston, Pereira (Risaralda)', '+573105550192', 1, 0, FALSE, NOW() - INTERVAL '25 minutes', 'lactante / kit', 4.8133, -75.6961),
  ('need-002', 'VOLUNTARIO', 'MANO_DE_OBRA', 'Se solicitan 10 voluntarios para mover escombros y limpiar vía', 'Por deslizamiento de tierra se requiere apoyo con palas, carretillas y botas para despejar la vía principal de acceso a la vereda.', 'Vereda El Tablazo, Manizales (Caldas)', '+573124449811', 10, 4, FALSE, NOW() - INTERVAL '50 minutes', 'voluntarios', 5.0689, -75.5174),
  ('need-003', 'ROPA_COBIJAS', 'ROPA_COBIJAS', 'Cobijas térmicas y colchonetas para 15 familias en albergue', 'Familias damnificadas por creciente del río requieren cobijas limpias, aislantes y colchonetas sencillas para pasar la noche.', 'Coliseo Municipal, Quibdó (Chocó)', '+573158882030', 15, 8, FALSE, NOW() - INTERVAL '2 hours', 'kits de descanso', 5.6947, -76.6611),
  ('need-004', 'RECURSO', 'ALIMENTOS', 'Mercados no perecederos y agua potable empacada', 'Requerimos agua embotellada, arroz, enlatados y granos para la olla comunitaria del barrio afectada por lluvias intensas.', 'Comedor Comunitario Barrio Siloé, Cali (Valle del Cauca)', '+573001112233', 50, 32, FALSE, NOW() - INTERVAL '4 hours', 'mercados / paquetes', 3.4516, -76.5320)
ON CONFLICT (id) DO NOTHING;
