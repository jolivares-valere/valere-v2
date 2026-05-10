# Mensaje para la próxima sesión Cowork

**Fecha:** 2026-05-05
**De:** Cowork (sesión cierre Fase 2-3 + vencimiento prospecto)
**Para:** próxima sesión Cowork / Code

---

## Contexto

Sprint Fase 2-3 separación CRM/Captación + vencimiento contrato prospecto cerrado:
- Commit `0260ae3` desplegado en `origin/main`.
- TSC 0, tests 74/74, build OK.
- Cloudflare Pages deploy ~2 min después del push.

Juan validó el plan y firmó el cierre.

## Orden de prioridad acordado (Juan + ChatGPT 2026-05-05)

```
1. Smoke corto separación/vencimientos
2. Filtros módulos CRM restantes
3. Badge vencimiento en cards
4. Regenerar tipos + quitar casts
5. Tests semáforo
```

**Regla:** no meter nada más hasta confirmar que Carolina puede trabajar con la separación sin confusión.

---

## 1. Smoke corto (Juan lo hace en navegador, no requiere código)

Hard refresh `valere-v2.pages.dev` y validar:

- [ ] `/empresas` muestra 24 clientes, NO 33.
- [ ] `/captacion` sigue mostrando los 9 prospectos.
- [ ] Crear lead nuevo → SQL: `SELECT estado_relacion, contexto FROM empresas e JOIN oportunidades o ON o.empresa_id=e.id WHERE e.nombre LIKE 'TEST_FASE23_%' ORDER BY e.created_at DESC LIMIT 1;` debe devolver `prospecto / captacion`.
- [ ] Vencimiento prospecto: 15d→rojo, 50d→naranja, 80d→amarillo, 200d→verde.
- [ ] Convertir a cliente: solo admin/senior + etapa cerrada_ganada/contrato_firmado/activo.

**Si Juan reporta confusión o bug, parar y arreglar antes de seguir con el resto del orden.**

---

## 2. Filtros módulos CRM restantes (P1 importante)

Auditar y filtrar por `estado_relacion='cliente'` (vía join o vía cups que cuelgue de empresa cliente) en:

- `src/features/datadis/...` — DatadisPage no debe mostrar prospectos.
- `src/features/renovaciones/RenovacionesPage.tsx` — solo contratos de clientes.
- `src/features/incidencias/IncidenciasPage.tsx` — solo de empresas cliente.
- `src/features/contratos/...` — `ContratosPage` debería ya estar OK (los prospectos no tienen contratos), pero verificar el listado.

**Patrón:** join `empresa:empresas!inner(estado_relacion)` + `.eq('empresa.estado_relacion', 'cliente')`. Si los tipos generados no incluyen `estado_relacion`, usar el mismo cast `(supabase as any)` ya documentado.

---

## 3. Badge "Vence en X días" en BandejaCard

Carolina necesita ver el semáforo sin abrir el drawer.

- Archivo: `src/features/captacion/components/BandejaCard.tsx`.
- Helper ya disponible: `calcularSemaforoVencimiento` en `src/features/captacion/api.ts`.
- Añadir prop `fecha_vencimiento_contrato_prospecto` a la card y pintar badge pequeño con clase color cuando `sem.color !== 'sin_dato'`.
- Verificar que `v_mis_oportunidades` y `v_captacion_todos_mis_casos` exponen el campo. Si no, ALTER VIEW para añadirlo (las vistas tienen `security_invoker=true`).

---

## 4. Regenerar tipos Supabase + quitar casts

```bash
npx supabase gen types typescript --project-id gtphkowfcuiqbvfkwjxb > src/core/types/database.ts
```

Luego buscar y quitar los 4 casts marcados con `// Quitar este cast cuando se regeneren los tipos`:
- `src/features/empresas/api.ts:32`
- `src/features/oportunidades/api.ts:30`
- `src/features/dashboard/api.ts:51`
- `src/components/search/GlobalSearch.tsx:26`

También revisar `src/features/captacion/api.ts` por uso de `supabaseAny` que podría reducirse.

**Riesgo:** regenerar tipos puede arrastrar errores TSC en otros sitios donde había `Database = any`. Si pasa, hacer en branch separada y cerrar errores antes de merge.

---

## 5. Tests unitarios `calcularSemaforoVencimiento`

Helper puro, fácil de testear con `vi.useFakeTimers`.

```ts
// src/features/captacion/calcularSemaforoVencimiento.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcularSemaforoVencimiento } from './api'

describe('calcularSemaforoVencimiento', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('null/undefined → sin_dato', () => {
    expect(calcularSemaforoVencimiento(null).color).toBe('sin_dato')
    expect(calcularSemaforoVencimiento(undefined).color).toBe('sin_dato')
    expect(calcularSemaforoVencimiento('').color).toBe('sin_dato')
  })
  it('fecha pasada → vencido', () => {
    expect(calcularSemaforoVencimiento('2026-04-01').color).toBe('vencido')
  })
  it('15 días → rojo', () => {
    expect(calcularSemaforoVencimiento('2026-05-20').color).toBe('rojo')
  })
  it('50 días → naranja', () => {
    expect(calcularSemaforoVencimiento('2026-06-24').color).toBe('naranja')
  })
  it('80 días → amarillo', () => {
    expect(calcularSemaforoVencimiento('2026-07-24').color).toBe('amarillo')
  })
  it('200 días → verde', () => {
    expect(calcularSemaforoVencimiento('2026-11-21').color).toBe('verde')
  })
})
```

---

## Notas sueltas

- Migration mirrors al día: `20260505_fase1_separacion_captacion_crm.sql` y `20260505_vencimiento_contrato_prospecto.sql`.
- Ningún flujo del sprint depende de un cron — todo es visualización síncrona.
- Si Carolina pide notificaciones / cron de "vence pronto", abrir scope nuevo. NO añadirlo en este pase.
