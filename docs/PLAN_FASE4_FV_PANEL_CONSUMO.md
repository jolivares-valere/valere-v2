# Plan Fase 4 — Panel FV completo (generación + consumo + excedentes)

> **Estado:** PROPUESTA. Datos de FusionSolar YA caracterizados (captura real 2026-06-15). NO se ha tocado código.
> **Continúa:** Fase 1 (credenciales) y Fase 3 (sync semi-automático) ya desplegadas y funcionando.

---

## 1. Hallazgo clave (confirmado con captura de tráfico real)

FusionSolar EU5 **SÍ expone consumo, autoconsumo y excedentes por planta** (no hace falta Datadis para esto),
siempre que la planta tenga medidor (`existMeter: true`). Confirmado en Hotel Sierra Luz (NE=137403508).

**Endpoint:** `GET /rest/pvms/web/station/v3/overview/energy-balance?stationDn=<dn>&timeDim=<2=día>&timeZone=...`
Responde `{ success, data: { ... } }` con arrays por intervalo del día + totales.

### Campos de `data`
| Campo (array) | Total | Significado |
|---|---|---|
| `productPower` | `totalProductPower` | Generación FV |
| `usePower` | `totalUsePower` | Consumo total |
| `selfUsePower` | `totalSelfUsePower` | Autoconsumo (de la propia solar) |
| `onGridPower` | `totalOnGridPower` | Excedentes / vertido a red |
| `mainsUsePower` / — | `totalBuyPower` | Energía comprada a red |
| `chargePower`/`dischargePower` | — | Batería (no aplica a estas plantas) |
| `meterActivePower` | — | Potencia del medidor |

Flags útiles: `existMeter`, `existUsePower`, `existInverter`, `existEnergyStore`.

Otros endpoints capturados (referencia):
- `/station/v3/overview/energy-flow` y `/station/v1/overview/energyflow-live`: diagrama de flujo sol→casa→red, tiempo real.
- `/report/v1/station/home-station-kpi-chart`: barras del home.

> Captura completa: `outputs/fv_captura_184.json` (bodies truncados a 8000 chars; re-capturar sin truncar si se necesitan valores exactos de los arrays largos).

---

## 2. Estado actual del conector (lo que falta)

`scripts/fv-sync/fusionsolar_client.py` solo conoce 3 endpoints de datos y **solo lee generación**
(`station-list` → currentPower/dayEnergy). NO llama a `energy-balance`. Por eso el CRM hoy solo muestra producción.

---

## 3. Fases de construcción

### F4.1 — Ampliar el conector (Python)
- Añadir método `get_energy_balance(station_code, day)` en `FusionSolarClient` que llame a `energy-balance`.
- Usar `context.request` (no fetch desde page) y el origen del PORTAL (uni003eu5), como station-list.
- Parsear `productPower`, `usePower`, `selfUsePower`, `onGridPower`, `totalBuyPower` (+ totales).
- Manejar `existMeter:false` (plantas sin medidor → solo generación, consumo/excedente = null).

### F4.2 — Esquema BD
- Ampliar `fv_kpi_diario` con: `consumo_kwh`, `autoconsumo_kwh`, `excedente_kwh`, `compra_red_kwh` (todas nullable).
- (Opcional) tabla `fv_energy_curva` para la curva intradía si se quiere granularidad por intervalo.
- Migración versionada + aplicar tras aprobación.

### F4.3 — sync_job
- Tras `get_station_list`, por cada planta con `existMeter`, llamar `get_energy_balance` y hacer upsert de los nuevos campos en `fv_kpi_diario`.
- Respetar el rate-limit (FusionSolar es estricto): espaciar llamadas.

### F4.4 — Panel en el CRM (frontend)
- Nueva vista/pestaña tipo FusionSolar: gráfica con generación + consumo + autoconsumo + excedentes.
- Reusar recharts (ya en uso en ProduccionTab). Selector de planta + rango (día/mes/año).
- Tarjetas resumen: total generado, consumido, autoconsumo %, vertido, comprado.

### F4.5 — Verificación
- Renovar sesión → sync → comprobar que entran consumo/excedentes de las plantas con medidor.
- TSC 0 + tests. Auditoría.

---

## 4. Dependencias y avisos
- Requiere sesión FusionSolar activa (renovador Fase 3) — ya funciona.
- Plantas SIN medidor: solo tendrán generación (consumo/excedente quedarán null). Es correcto.
- El rate-limit de FusionSolar puede obligar a sincronizar por lotes.

---

## 5. Aprobaciones
1. ✅ Confirmado que FusionSolar da consumo/excedentes (captura real).
2. ⏳ Migración BD (columnas nuevas en fv_kpi_diario).
3. ⏳ Empezar por F4.1 (conector) — recomendado de abajo a arriba.
