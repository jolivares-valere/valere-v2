# Auditoría datos Valere CRM — pre-integración Holded

**Fecha**: 2026-04-27
**Sprint**: holded-fase0
**Autor**: Cowork (Claude)
**Migration relacionada**: `supabase/migrations/20260427_holded_data_audit.sql` (en dry-run, NO aplicada todavía)
**Plan padre**: `docs/PLAN_INTEGRACION_HOLDED.md` § Fase 0

---

## TL;DR

> Los datos del CRM están en **estado muy bueno** post-Fase 2 unificación.
> No hace falta migration de limpieza destructiva.
> Hay 4 empresas a revisar manualmente antes de activar la sincronización (3 tests + 1 real con NIF posiblemente mal tecleado).
> La integración Holded debe respetar `holded_config.excluded_nifs[]` y NO enviar registros que fallen `valida_nif_cif()`.

---

## 1. Métricas generales

| Métrica | Valor | % | Lectura |
|---|---:|---:|---|
| Empresas activas | 27 | 100 % | Coincide con Fase 2 unificación cerrada |
| Con NIF | 26 | 96 % | 1 sin NIF (registro de prueba) |
| Con dirección | 25 | 93 % | OK |
| Con `cp` (código postal) | 24 | 89 % | OK |
| Con `ciudad` | 25 | 93 % | OK |
| Con `provincia` | 1 | **4 %** | ⚠️ Columna casi vacía. Holded acepta null para ES |
| `pais` ISO-2 | 27 | 100 % | ✅ Todas 'ES' |
| Con `email_principal` | 25 | 93 % | OK |
| Con `telefono_principal` | 5 | 19 % | ⚠️ Bajo, pero no bloquea Holded |
| `tipo` rellenado | 0 | **0 %** | ⚠️ Mapper Holded asignará default `client` |
| `segmento` rellenado | 0 | 0 % | OK, opcional |

**Contactos activos**: 1 (volumen mínimo, todos los campos requeridos rellenados, formato email válido).

---

## 2. Calidad NIF/CIF

### 2.1 Distribución por clase

| Clase | Empresas | Notas |
|---|---:|---|
| CIF (empresa ES) | 25 | El grueso del CRM |
| NIF (persona ES) | 1 | Caso autónomo |
| NIE (extranjero ES) | 0 | — |
| VAT intracomunitario | 0 | — |
| INVALID (formato) | 0 | ✅ Cero NIFs con formato sintáctico roto |
| EMPTY | 1 | Empresa sin NIF |

### 2.2 Checksum (dígito de control real)

| Resultado | Empresas | % sobre las que tienen NIF |
|---|---:|---:|
| Checksum válido (`valida_nif_cif()=true`) | **23** | **88 %** |
| Checksum inválido (formato OK, dígito mal) | **3** | **12 %** |

> El checksum se valida con el algoritmo letra-control TRWAGMYFPDXBNJZSQVHLCKE (NIF/NIE) y el algoritmo de suma pares-impares estándar para CIF (con la lógica de "letra inicial determina si control es dígito, letra o ambos"). Implementación en función IMMUTABLE `public.valida_nif_cif(text)` definida en la migration.

### 2.3 Función `valida_nif_cif()` — verificación

10 tests unitarios pasados antes del despliegue:

| Caso de test | Esperado | Resultado |
|---|---|---|
| `B10759520` (Valere Consultores SL) | true | ✅ true |
| `12345678Z` (NIF persona válido) | true | ✅ true |
| `00000000T` (caso edge: ceros) | true | ✅ true |
| `X1234567L` (NIE válido) | true | ✅ true |
| `B10759521` (mismo CIF + dígito mal) | false | ✅ false |
| `A12345674` (CIF con control numérico) | true | ✅ true |
| `12345678A` (NIF con letra mal) | false | ✅ false |
| `NULL` / vacío | false | ✅ false |
| `ESB10759520` (VAT prefijo ES) | true | ✅ true |
| `XX99999999` (VAT con país inexistente) | false | ✅ false |

---

## 3. Empresas a revisar antes de sincronizar

### 3.1 Sin NIF (1)

| ID | Nombre | Origen | Acción sugerida |
|---|---|---|---|
| `295b49f0-9690-4d9d-abd8-1db0b965d631` | "Empresa Test SA" | CRM seed (no Potencias) | **Borrado lógico** (`deleted_at = now()`) o renombrar a `TEST_VALERE_NOSINCRONIZAR` para excluirla explícitamente vía `holded_config.excluded_nifs`. |

### 3.2 NIF con checksum inválido (3)

| ID | Nombre | Clase NIF | Origen | Acción sugerida |
|---|---|---|---|---|
| `aeb693ba-cf10-4726-bf08-7a1581645701` | "Industrias Valere Test S.L." | CIF (B…2) | CRM seed (no Potencias) | **Borrado lógico** — registro de pruebas obvio |
| `58fae428-5fe7-4441-87e1-e775b625aef5` | "la primera prueba sl" | CIF (B…2) | **Migrado de Potencias** (`legacy_potencia_id != null`) | **Borrado lógico** o reseteo NIF a null + flag de exclusión. Era seed del satélite |
| `e95025b4-b75f-4584-bbef-a014e806290c` | "PAZ Y BIEN 5002AP" | CIF (G…8), Valencia | CRM (no Potencias) | ⚠️ **Cliente potencialmente real** — Juan debe verificar el NIF correcto antes de activar Holded sync. Excluir hasta corrección. |

> **Patrón aplicado**: `valida_nif_cif()` enmascara los NIFs en este informe para no exponerlos. La migration produce los IDs completos en la vista `holded_audit_empresas` para acceso autorizado.

---

## 4. Direcciones

| Métrica | Empresas |
|---|---:|
| Desglose mínimo Holded (`direccion + cp + ciudad + pais`) | **25 / 27 (93 %)** |
| Con código postal embebido en `direccion` (heurística `\d{5}`) | 4 |
| Con 3+ comas en `direccion` (heurística concatenada) | 1 |

Holded acepta `billAddress` con `address` (línea libre: calle + número + piso), `postalCode`, `city`, `province`, `country`. Nuestro schema ya encaja 1:1, **excepto que `provincia` está vacía en 26/27 filas**. Para empresas españolas Holded no requiere `province`, así que no es bloqueante en Fase 1; en Fase 3 (sync contactos bidireccional) propondremos un job de inferencia provincia desde código postal (lookup a tabla INE) como mejora opcional.

---

## 5. Volumen y dedupe

- **Duplicados por NIF normalizado**: 0. La Fase 2 unificación dedupó correctamente (30 clients Potencias → 24 únicos por CIF, ya integrados con los 3 originales del CRM = 27).
- **Volumen primera sincronización Valere → Holded**: 27 contactos. Trivial para token bucket 5 req/s.
- **Volumen primera sincronización Holded → Valere**: "varios miles" según informe Browser. **Crítico**: Fase 3 debe paginar.

---

## 6. Recomendaciones para Fase 1 (infraestructura)

Sin bloquear el sprint actual, estos hallazgos se traducen en estos requisitos:

1. **`holded_config.excluded_nifs`** debe nacer con valores adicionales además de `TEST_VALERE_NOSINCRONIZAR`:
   - Por defecto: `ARRAY['TEST_VALERE_NOSINCRONIZAR']`.
   - Tras revisión Juan: añadir los normalized NIFs de las 4 empresas problemáticas si no se borran lógicamente.

2. **Mapper `valere_empresa → holded_contact`** debe:
   - Llamar `valida_nif_cif(empresa.nif)`. Si false, escribir warning en `holded_integration_logs` y marcar `holded_sync_queue.status='skipped_invalid_nif'`. **No enviar a Holded**.
   - Filtrar contactos cuyo `nif_normalizado` esté en `excluded_nifs`.
   - Asignar `type = 'client'` por defecto cuando `empresa.tipo IS NULL`.
   - Si `empresa.provincia IS NULL` y `pais = 'ES'`, dejar Holded `province` también null (Holded permite null).

3. **Validación previa en frontend**: añadir `valida_nif_cif()` como Edge Function callable o como helper en `src/core/utils/` para que el formulario de creación/edición de empresa rechace NIFs inválidos antes de guardarlos. **No bloqueante para Fase 1**, candidato a sprint de UX.

4. **No es necesaria migration de limpieza destructiva**. Borrar lógicamente 3 registros de prueba (Empresa Test SA, Industrias Valere Test SL, la primera prueba sl) es cosmético, no técnico. Juan decide.

---

## 7. Acciones pendientes Juan

| # | Acción | Esfuerzo | Cuándo |
|---|---|---|---|
| A1 | Revisar el NIF real de **PAZ Y BIEN 5002AP** y corregir desde la UI | 5 min | Antes de activar sync live |
| A2 | Decidir si borrar lógicamente las 3 empresas de prueba (Empresa Test SA / Industrias Valere Test / la primera prueba sl) o renombrarlas a `TEST_VALERE_NOSINCRONIZAR` | 5 min | Antes de Fase 3 |
| A3 | Aplicar la migration `20260427_holded_data_audit.sql` en prod via MCP `apply_migration` (necesita OK explícito de Juan) | 1 min | Tras revisar este informe |
| A4 | (Opcional) Confirmar si quieres rellenar `provincia` para las 26 empresas que no la tienen, o lo dejamos vacío hasta Fase 3 | depende | Tras Fase 3 |

---

## 8. Métricas para tracking de salud datos

Una vez aplicada la migration, las vistas siguientes son consultables:

```sql
-- Resumen agregado
SELECT * FROM public.holded_audit_resumen;

-- Detalle por empresa
SELECT id, nombre, nif_clase, nif_checksum_ok, direccion_holded_lista
FROM public.holded_audit_empresas
WHERE NOT nif_checksum_ok OR NOT direccion_holded_lista;

-- Duplicados (esperado: 0 filas)
SELECT * FROM public.holded_audit_duplicados_nif;
```

Estas vistas se incorporarán al panel admin en Fase 1 (tab "Holded" → sección "Salud datos").

---

## 9. Conclusión

**Fase 0 cerrada**. El estado de datos permite arrancar Fase 1 (infraestructura) sin migration de limpieza pesada. Los 4 casos detectados quedan documentados aquí y se tratarán por exclusión explícita (`excluded_nifs[]`) o corrección manual (PAZ Y BIEN), sin bloquear el sprint.
