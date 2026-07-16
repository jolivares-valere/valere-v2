# PLAN — Renovaciones: rotación de CUPS y "duplicados" de gestión

> Estado: **PROPUESTA — NADA EJECUTADO**. Pendiente OK de Juan + revisión del auditor.
> Origen: Juan detecta en el listado de Renovaciones el mismo cliente/CUPS repetido con
> comercializadoras distintas y fechas antiguas ("cuando se renueva sólo cuenta el último
> contrato vigente; los anteriores no deberían salir duplicados").

---

## 1. El instinto de Juan era correcto (y por qué el primer chequeo dio 0)

El primer análisis (por auditoría) buscó duplicados por el **enlace `cups.contrato_id`** y encontró
**0**. Pero ese eje **no puede** ver el problema: `cups.contrato_id` es único por CUPS, así que
cuando un punto rota de comercializadora, el contrato **viejo pierde el enlace** al CUPS (lo pisa el
nuevo). El duplicado no aparece como "dos renovaciones con el mismo CUPS", sino como
**"renovación nueva con CUPS" + "renovación vieja sin CUPS"**.

Midiendo por el **código CUPS del staging** (`staging_fase1_libro.cups`, que sí lo tiene todo),
el patrón sí aparece:

| Métrica | Valor |
|---|---:|
| Renovaciones activas totales | 504 |
| CUPS con **varios contratos** (historial de rotación) | **78** |
| — de ellos con **rotación de compañía** | 38 |
| — misma compañía, **fechas distintas** (re-contrato) | 8 |
| — misma compañía, **misma fecha** (duplicado exacto probable) | 22 |
| Contratos "no-últimos" (histórico superado) | 110 |
| **Renovaciones activas ('detectada') sobre contratos superados** | **98** |

Ejemplo real — **REAL CANOE NATACIÓN CLUB**, CUPS `ES0021000004717558EW`: 4 contratos
(ODF 2025-07-05 = vigente ← TOTAL 2025-04-13 ← TOTAL s/f ← VM s/f). Parecen 4 duplicados;
son la historia de rotación de **un único punto**. Sólo la renovación de ODF debería estar activa.

**Importante lo que NO es:** BLUENET (18 CUPS) y similares **no** son duplicados — son puntos de
suministro distintos de una empresa multi-sede, y cada uno se renueva por separado. Eso se arregla
en la interfaz (mostrar el CUPS por fila), no borrando nada. Ya está en el backlog de MEJORAS UI.

---

## 2. Descomposición de las 125 renovaciones "sin CUPS"

`renovaciones` no tiene columna de CUPS; el CUPS de la pantalla se deriva por
`contrato_id → cups.contrato_id`. Hay 125 renovaciones cuyo contrato no tiene CUPS enlazado:

| Categoría | Renov. | Acción propuesta |
|---|---:|---|
| B) Contrato **superado por rotación** | 89 | Cerrar como `renovado` + `nuevo_contrato_id` |
| C) **Vigente** pero perdió el enlace CUPS | 24 | Reconectar `cups.contrato_id` |
| D) CUPS único **sin fila `cups`** | 12 | Reconectar/crear fila `cups` |
| **Total** | **125** | |

(Las 98 superadas activas del punto 1 = 89 sin-CUPS + 9 que aún conservan el enlace.)

---

## 3. Remediación propuesta (3 partes, todas reversibles, ninguna borra a ciegas)

### Parte A — Cerrar renovaciones de contratos superados  ← el arreglo que pide Juan
De las 98 superadas activas:
- **46 grupos claros (45 renov. aprox.): rotación de compañía (38) + misma compañía distinta fecha (8)**
  → `estado = 'renovado'`, `nuevo_contrato_id = ` contrato vigente del mismo CUPS, nota de traza.
  Es una renovación real: el punto ya se re-contrató. **Listo para ejecutar tras OK.**
- **22 grupos "misma compañía, misma fecha" (53 renov. aprox.): duplicado exacto probable**
  → **NO cerrar automáticamente.** Puede ser el mismo contrato cargado dos veces. Requiere una
  vuelta de revisión: decidir si el contrato duplicado se `deleted_at` (soft-delete) junto a su
  renovación, o si es re-contrato legítimo. **Se lista para revisión, no se toca aún.**

### Parte B — Reconectar el enlace CUPS de las vigentes (C + D = 36)
Para los contratos **vigentes** que perdieron/no tienen `cups.contrato_id`, reconstruir el enlace
cruzando por el código CUPS del staging (24 casos) o creando la fila `cups` que falta (12 casos).
Así su renovación vuelve a mostrar el CUPS. No cambia estado ni prioridad.

### Parte C — UI (workstream MEJORAS UI, ya en backlog)
Mostrar el código CUPS en cada fila; "sin CUPS"/nº contrato como identificador; opcional agrupar por
empresa con sedes desplegables. Esto elimina la confusión visual de raíz.

---

## 4. Borrador SQL — SÓLO Parte A grupos claros (NO EJECUTAR)

```sql
-- Cierra como 'renovado' las renovaciones de contratos superados por rotación
-- (rotación de compañía O misma compañía con fecha distinta), enlazándolas al vigente.
-- NO toca los grupos "misma compañía, misma fecha" (duplicado a revisar).
BEGIN;
WITH cc AS (
  SELECT c.id AS contrato_id, c.fecha_inicio, c.fecha_firma, c.compania,
         upper(regexp_replace(coalesce(s.cups,''),'\s','','g')) AS cups_norm
  FROM contratos c
  JOIN staging_fase1_libro s ON c.external_id='LV:'||s.libro||':'||s.hoja||':'||s.fila
  WHERE coalesce(s.cups,'')<>''
),
meta AS (  -- clasificación por grupo CUPS
  SELECT cups_norm, count(*) n, count(DISTINCT compania) nc, count(DISTINCT fecha_inicio) nf
  FROM cc GROUP BY cups_norm HAVING count(*)>1
),
ranked AS (
  SELECT cc.contrato_id, cc.cups_norm,
    row_number() OVER (PARTITION BY cc.cups_norm
      ORDER BY cc.fecha_inicio DESC NULLS LAST, cc.fecha_firma DESC NULLS LAST, cc.contrato_id) AS rn,
    first_value(cc.contrato_id) OVER (PARTITION BY cc.cups_norm
      ORDER BY cc.fecha_inicio DESC NULLS LAST, cc.fecha_firma DESC NULLS LAST, cc.contrato_id) AS vigente_id
  FROM cc
)
UPDATE renovaciones r
SET estado = 'renovado',
    nuevo_contrato_id = rk.vigente_id,
    notas = coalesce(r.notas||' | ','')||'Auto-cerrada: contrato superado por rotación (dedup Fase1.3)',
    updated_at = now()
FROM ranked rk
JOIN meta m ON m.cups_norm = rk.cups_norm
WHERE r.contrato_id = rk.contrato_id
  AND r.deleted_at IS NULL
  AND r.estado = 'detectada'
  AND rk.rn > 1                          -- no vigente
  AND (m.nc > 1 OR (m.nc = 1 AND m.nf > 1));  -- rotación compañía O re-contrato; excluye dup-misma-fecha
-- Recuento esperado: ~45.
COMMIT;
```

**Revert:** `UPDATE renovaciones SET estado='detectada', nuevo_contrato_id=NULL WHERE notas LIKE '%dedup Fase1.3%';`

---

## 5. Decisiones antes de ejecutar

1. **Juan:** ¿ejecuto la Parte A grupos claros (~45 renov. → `renovado`)? Reduce el pipeline de
   pendientes a lo realmente vigente.
2. **Juan:** los 22 grupos "misma compañía, misma fecha" (posible doble carga): ¿los reviso uno a uno
   y propongo soft-delete del contrato duplicado, o los dejo como están de momento?
3. **Auditor:** revisión del criterio "vigente = fecha_inicio más reciente" y del borrador SQL antes
   de tocar producción (mismo rigor que la carga).

> Impacto en el sello de la Fase 1: el recuento de renovaciones críticas/altas cambiará al cerrar las
> superadas. Conviene rehacer el desglose de prioridades tras la Parte A y anotarlo en el informe.
