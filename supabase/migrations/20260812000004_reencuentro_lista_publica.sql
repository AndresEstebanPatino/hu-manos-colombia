-- ============================================================================
-- Modulo REENCUENTRO — Lista publica de BUSCADAS
-- DECISION DE PRODUCTO (exposicion de PII consciente):
--   Se permite LECTURA PUBLICA (anon) de reportes tipo BUSCADA, de NO-menores,
--   en estado ACTIVO, para el buscador/lista de personas desaparecidas (estilo
--   Google Person Finder). Exponer a los BUSCADOS acelera el reconocimiento.
--
--   NO se exponen: ENCONTRADA, fallecidos, ni MENORES (siguen bajo el RLS previo,
--   solo roles privilegiados / creador). Las politicas RLS son OR: esta solo
--   AMPLIA lo visible para BUSCADA-no-menor-activo; no debilita lo demas.
-- ============================================================================

create policy "reportes: lista publica de buscadas no-menores"
  on public.reencuentro_reportes for select
  to anon, authenticated
  using (
    tipo = 'BUSCADA'
    and es_menor = false
    and estado = 'ACTIVO'
  );
