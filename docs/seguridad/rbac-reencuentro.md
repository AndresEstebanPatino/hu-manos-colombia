# RBAC del módulo Reencuentro

Modelo de acceso decidido el 2026-08-12. Implementado en `supabase/migrations/0002_reencuentro_rls.sql`.

## Principio
- **Captura** = anónima/invitada (FAMILIAR, SOCORRISTA). Cero fricción en emergencia.
- **Lectura y gestión sensible** = roles privilegiados con **auth verificada**: COORDINADOR, HOSPITAL, ALBERGUE.
- **Menores**: su PII nunca es visible para el público anónimo.
- Prohibido `using (true)` en tablas con PII (a diferencia del tablón `necesidades`).

## Matriz de acceso

| Acción | anon (captura) | Creador autenticado | HOSPITAL / ALBERGUE | COORDINADOR |
|---|---|---|---|---|
| Crear reporte (captura) | ✅ | ✅ | ✅ | ✅ |
| Leer reporte | ❌ | Solo el suyo y **no menor** | ✅ todos | ✅ todos |
| Actualizar reporte | ❌ | Solo el suyo | ❌ | ✅ |
| Borrar reporte | ❌ | ❌ | ❌ | ✅ |
| Leer coincidencias | ❌ | ❌ | ✅ | ✅ |
| Crear/confirmar/rechazar coincidencia | ❌ | ❌ | ❌ | ✅ |
| Gestionar roles | ❌ | ❌ | ❌ | ✅ |

> Regla dura adicional (a nivel de BD, no solo RLS): una coincidencia con **fallecido** no puede quedar `CONFIRMADA` o más allá sin un **segundo validador distinto del revisor** (`constraint doble_validacion_fallecido`).

## Bootstrap del primer coordinador
No hay coordinador previo que pueda otorgar el rol, así que el **primer COORDINADOR se crea manualmente** (Supabase SQL Editor con `service_role`), tras crear su usuario en Auth:

```sql
insert into public.reencuentro_roles (user_id, rol)
values ('<uuid-del-usuario>', 'COORDINADOR');
```

## Cómo aplicar
```bash
# Con Supabase CLI (recomendado):
supabase db push
# o pegar 0001_ y luego 0002_ en el SQL Editor del dashboard, en orden.
```

## Cómo probar (pendiente — requiere Supabase)
> No se pudo ejecutar aquí (sin instancia). Cuando haya acceso, verificar en `supabase start` local con tests pgTAP o manuales:
- [ ] anon puede **insertar** captura pero **no leer** ningún reporte.
- [ ] un creador autenticado lee **solo el suyo** y **no** si es menor.
- [ ] HOSPITAL/ALBERGUE leen reportes pero **no** gestionan coincidencias.
- [ ] COORDINADOR lee/gestiona todo.
- [ ] no se puede `CONFIRMAR` una coincidencia con fallecido sin segundo validador distinto.
- [ ] borrado denegado a todos salvo COORDINADOR.

Relacionado: `docs/seguridad/revision-rls-y-secretos.md` (revisión del RLS público de las tablas existentes).
