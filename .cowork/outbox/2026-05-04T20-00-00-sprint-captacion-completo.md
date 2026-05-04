# Sprint Operativo Captación COMPLETO — 2026-05-04 sesión autónoma tarde

**De:** Cowork session 2026-05-04 (autonomous)
**Para:** Próxima sesión + Juan al volver

## Estado al cierre

Sprint Operativo Captación 5/5 días COMPLETO en disco. Día 1 ya commiteado en main (commit `4dfc3b1`). Días 2-5 pendientes ejecutar PS1.

### Lo que Carolina Aroca puede hacer cuando esté commiteado

1. Login → solo ve "Captación" en sidebar (sidebar oculta CRM Comercial y Potencias por su función)
2. `+ Nuevo lead` → modal con form mínimo (empresa nombre + tel obligatorios)
3. Click en card → drawer con datos + timeline actividades + acciones contextuales
4. Por etapa, ve los botones que aplican (no más, no menos)
5. Subir factura → upload Supabase Storage → vincula a oportunidad
6. Pasar a análisis → handoff a Carolina M (selector)
7. Cliente acepta/rechaza/pide visita → cierres + handoff a senior
8. Tab "Todos mis casos" → ve historial donde fue parte

### Acción inmediata Juan al volver

```powershell
cd C:\Users\joliv\valere-v2
.\COMMIT_SPRINT_DIAS2_5_2026-05-04.ps1
```

El script:
1. Pull main
2. TSC --noEmit (aborta si fallo)
3. npm test --run (aborta si fallo)
4. npm run build (aborta si fallo)
5. Stage 11 ficheros explícitos
6. Commit con `COMMIT_MSG_DIAS2_5.txt`
7. Push origin main

Si TSC o tests fallan, el script aborta y Juan me pasa el error en próxima sesión.

### Tras commit + push exitoso

1. Esperar deploy Cloudflare Pages (~2 min): `https://valere-v2.pages.dev`
2. Login Carolina Aroca (info@valereconsultores.com / `Valere2026Temporal!`):
   - Verificar que sidebar solo muestra Captación
   - Probar `+ Nuevo lead` con datos de prueba
   - Click en demo Industria Textil → drawer → "Esperando factura"
   - Subir factura ficticia (PDF cualquiera)
   - "Pasar a análisis" → seleccionar Carolina M
3. Login Carolina Maciñeiras (administracion@):
   - Verificar caso Industria Textil aparece en su bandeja
   - "Empezar análisis" → en_analisis
   - "Subir propuesta lista" → propuesta_lista
4. Login Carolina Aroca:
   - Verificar Industria Textil en "Propuestas para enviar"
   - "Descargar propuesta" + "Marcar enviada"
   - Mover a "Cliente acepta" o similar

Si el flujo end-to-end funciona, enviar onboarding a equipo.

## Archivos clave creados/modificados (todos en disco)

**BD aplicada en prod (migrations en disco):**
- `supabase/migrations/20260504_sprint_captacion_dia3_storage_policies.sql`

**Frontend:**
- `src/features/captacion/storage.ts` (nuevo)
- `src/features/captacion/components/NuevoLeadModal.tsx` (nuevo)
- `src/features/captacion/components/OportunidadAcciones.tsx` (nuevo, 600+ líneas)
- `src/features/captacion/api.ts` (modificado, hooks nuevos)
- `src/features/captacion/components/OportunidadDrawer.tsx` (modificado)
- `src/features/captacion/CaptacionPage.tsx` (modificado)

**Tests (35 nuevos):**
- `src/features/captacion/motivos.test.ts`
- `src/features/captacion/storage.test.ts`
- `src/core/auth/permissions.test.ts`

**Docs:**
- `docs/SPRINT_OPERATIVO_CAPTACION_2026-05-04.md` (actualizado con cierre)
- `docs/ESTADO.md` (actualizado)

## Posibles errores en el PS1 y cómo resolver

1. **TSC error**: copiar el error y pasármelo. Probable: algún tipo no exportado o nombre cambiado.
2. **Tests fallan**: copiar el output. Los 35 nuevos tests son puros (sin mock supabase) y deberían pasar.
3. **Build fallo**: improbable si TSC pasa, pero si pasa: copiar.
4. **stash pop conflicto**: ya no debería pasar (el Día 1 ya está commiteado, no hay versiones divergentes).
5. **Push rechazado**: alguien más empujó a main. Repetir PS1 (que hace pull primero).

## Decisiones aplicadas

- ✅ Supabase Storage como fuente de verdad
- ✅ Reuso tabla documentos polimorfica (no schema nuevo)
- ✅ Enum motivo_perdida_enum BD intacto, UI filtrada
- ✅ Handoff factura → analista MANUAL
- ✅ Vista cross-bandeja para Carolina A
- ✅ Trazabilidad completa en actividades

## Reglas mantenidas

- ❌ NO más schema (factura_fecha_prevista del Día 1 fue la última excepción)
- ❌ NO Drive Valere todavía
- ❌ NO OCR
- ❌ NO plantillas PDF auto
- ❌ NO Google Calendar
- ❌ NO permisos granulares capa B/C/D

## Próxima sesión

Si todo va OK, **siguiente paso es uso real**. NO añadir más features hasta:
- Carolina A complete ≥3 leads end-to-end real
- Equipo reporte fricciones en `docs/FEEDBACK_USO_REAL.md`
- Pasen ≥7 días de uso continuo

Si surge un bug o fricción crítica, fix puntual. Si surge una feature deseable, anotar en backlog y NO empezar.

## Frase guía mantenida

> "El modelo de datos ya soporta el flujo real. Lo siguiente no es más código, es uso real con el equipo."
> — ChatGPT, dictamen final 2026-05-01

> "Primero robustez operativa, después integraciones elegantes."
> — ChatGPT, dictamen 2026-05-04

Aplicado este sprint. Aplicar a los siguientes.
