# Decisión de producto — Acciones en tarjetas ("Marcar como encontrada")

> Estado: aprobado por el equipo de producto. Implementación en curso (PR #15).
> Feature: acciones sobre las tarjetas de la lista pública de personas BUSCADAS.

## Contexto

Las tarjetas de la lista pública necesitan una forma de **cerrar el caso** cuando la
persona aparece. El riesgo es claro: si cualquiera del público marca "encontrada"
sin control, se corrompe el estado del reporte y —peor— se podría notificar en falso
a una familia. La decisión aprobada es una **combinación A+B+C**: validación +
avistamiento + cierre autorizado, siempre con **human-in-the-loop**.

## Modelo resultante

### 1. Público → "La vi / Tengo información" (avistamiento)
- **No** cambia el estado de la BUSCADA.
- Crea un reporte **ENCONTRADA vinculado** con las pistas de la BUSCADA
  (`construirAvistamiento(buscada, observadorId)`), que el observador edita/confirma.
- El motor de matching lo cruza con la BUSCADA y el **coordinador valida** la
  coincidencia. Nunca auto-notifica.

### 2. Creador o Coordinador → "Marcar resuelto"
- Cierre directo autorizado. Guarda de dominio `puedeMarcarResuelto`:
  `estado resoluble ∧ (coordinador ∨ creador del reporte)`.
- Backend: `ReportMutationPort.marcarResuelto` → `SupabaseReportMutation`
  (estado → `RESUELTO`), reforzado por la RLS de UPDATE (coordinador o creador;
  `anon` no puede cerrar).

### 3. Fallecidos
- **Fuera** de esta acción. Requieren doble validación y protocolo aparte
  (sin auto-notificación). Ver `docs/seguridad/rbac-reencuentro.md`.

## Estado de implementación

- [x] Guarda `puedeMarcarResuelto` — dominio + tests (PR #15)
- [x] `construirAvistamiento` — dominio + tests (PR #15)
- [x] `ReportMutationPort` + `SupabaseReportMutation.marcarResuelto` (PR #15)
- [ ] UI: botones en la tarjeta ("La vi", "Marcar resuelto") — pendiente de
      cableado + verificación en vivo en el preview.

## Próxima decisión aprobada (wave separada) — Onboarding de coordinador de zona

- **Visitantes** que descargan la app: login sencillo + lectura rápida de la info
  (lista/búsqueda ya disponible sin sesión).
- **Crear cuenta como coordinador de zona**: onboarding **estructurado pero fácil**
  (registro guiado + verificación de rol). Se ejecuta como wave independiente,
  después del cableado UI de las acciones de tarjeta.

---

**Loose end conocido:** el plan completo de Fase 2 (starter set + mapa) y el backlog
de Fase 3 viven en la rama `docs/reencuentro-fase-2` (commit `ee25f3e`), aún **sin
mergear a `dev`**. Pendiente integrarlo o abrir su PR.
