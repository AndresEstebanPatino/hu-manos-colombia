-- ============================================================================
-- MIGRACIÓN: Fix persistencia "Reservar / Me Sumo" — Hu-Manos Colombia
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- 1. Agregar columna apoyantes_ids a necesidades (si no existe)
ALTER TABLE public.necesidades
  ADD COLUMN IF NOT EXISTS apoyantes_ids TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Crear la función RPC atómica registrar_contribucion
--    SECURITY DEFINER: corre con privilegios del creador (bypassea RLS del UPDATE)
--    El INSERT a contribuciones se hace dentro, respetando ON CONFLICT.
CREATE OR REPLACE FUNCTION public.registrar_contribucion(
  p_necesidad_id      TEXT,
  p_usuario_id        TEXT,
  p_cantidad_aportada INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_need            RECORD;
  v_nuevo_progreso  INTEGER;
  v_completado      BOOLEAN;
BEGIN
  -- Leer el estado actual con bloqueo para concurrencia segura
  SELECT progreso_actual, meta_cantidad, apoyantes_ids
    INTO v_need
    FROM public.necesidades
   WHERE id = p_necesidad_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Necesidad no encontrada: %', p_necesidad_id;
  END IF;

  IF p_usuario_id = ANY(COALESCE(v_need.apoyantes_ids, '{}'::TEXT[])) THEN
    -- Toggle OFF: retirar apoyo
    v_nuevo_progreso := GREATEST(v_need.progreso_actual - p_cantidad_aportada, 0);
    v_completado     := v_nuevo_progreso >= v_need.meta_cantidad;

    UPDATE public.necesidades
       SET progreso_actual = v_nuevo_progreso,
           apoyantes_ids   = array_remove(COALESCE(apoyantes_ids, '{}'::TEXT[]), p_usuario_id),
           completado       = v_completado
     WHERE id = p_necesidad_id;

    RETURN json_build_object(
      'progreso_actual', v_nuevo_progreso,
      'completado',      v_completado,
      'accion',          'removido'
    );

  ELSE
    -- Toggle ON: nuevo apoyo
    v_nuevo_progreso := v_need.progreso_actual + p_cantidad_aportada;
    v_completado     := v_nuevo_progreso >= v_need.meta_cantidad;

    UPDATE public.necesidades
       SET progreso_actual = v_nuevo_progreso,
           apoyantes_ids   = array_append(COALESCE(apoyantes_ids, '{}'::TEXT[]), p_usuario_id),
           completado       = v_completado
     WHERE id = p_necesidad_id;

    INSERT INTO public.contribuciones (necesidad_id, usuario_id, cantidad_aportada, confirmado)
    VALUES (p_necesidad_id, p_usuario_id, p_cantidad_aportada, true)
    ON CONFLICT DO NOTHING;

    RETURN json_build_object(
      'progreso_actual', v_nuevo_progreso,
      'completado',      v_completado,
      'accion',          'agregado'
    );
  END IF;
END;
$$;

-- Solo usuarios autenticados pueden llamar al RPC
REVOKE ALL ON FUNCTION public.registrar_contribucion(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_contribucion(TEXT, TEXT, INTEGER) TO authenticated;

-- 3. RLS en contribuciones
ALTER TABLE public.contribuciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar contribuciones" ON public.contribuciones;
CREATE POLICY "Usuarios autenticados pueden insertar contribuciones"
  ON public.contribuciones
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = usuario_id);

DROP POLICY IF EXISTS "Usuarios ven sus propias contribuciones" ON public.contribuciones;
CREATE POLICY "Usuarios ven sus propias contribuciones"
  ON public.contribuciones
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = usuario_id);

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
