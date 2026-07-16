# Datadis sincronización — diagnóstico PROBADO EN VIVO (2026-07-06 noche)

> Diagnóstico hecho llamando a Datadis con la cuenta partner de Valere (secrets DATADIS_USERNAME/PASSWORD),
> vía una Edge Function temporal `datadis-diag-temp` (solo lectura, ya neutralizada; BORRAR del dashboard).
> Corrige diagnósticos anteriores. Este es el bueno.

## Qué se probó y qué salió (hechos, no hipótesis)

1. **Login Datadis con la cuenta de Valere: OK.** La comunicación FUNCIONA. Las credenciales están como **secrets de Edge Function**, NO en la tabla `datadis_tokens` (que está vacía y es del modelo viejo, en desuso). → El diagnóstico "faltan credenciales" es INCORRECTO.

2. **`get-supplies` SIN authorizedNif (modelo agregado partner): 200, devuelve 14 CUPS** (array). Funciona.

3. **`get-supplies?authorizedNif=<NIF cliente>`: 403 para TODOS** los clientes probados (PAZ Y BIEN, CHEMTROL, DERAZA, REAL CANOE, IBÉRICOS TALAVERA, AGRARIA, BIDAFARMA, BLUENET) · 404 en FED. ORG. MAYORES. → La vía "consulta individual por NIF" NO está operativa para la cuenta de Valere.

4. **Cruce del agregado (14 CUPS) contra la tabla `cups` del CRM, por código CUPS**:
   - 13 → mapean a **CHEMTROL ESPAÑOLA S.A.**
   - 1 → sin match en CRM (CUPS que Datadis conoce y el CRM no → el worker lo AÑADIRÍA).
   - CRM tiene 453 CUPS totales.

## Conclusiones (definitivas)

- El modelo correcto para Valere es el **PARTNER AGREGADO** (`/api-private/api/get-supplies` sin authorizedNif), NO `authorizedNif` por cliente. Encaja con lo que dijo el DPO de Datadis al firmar el convenio ("enviar datos de forma agregada").
- El código actual de `datadis-proxy` en modo `terceros` usa `authorizedNif` → por eso nunca sincronizó (403). **El arreglo central es cambiar a modelo agregado.**
- El **mapeo CUPS→empresa por código CUPS FUNCIONA** (13/14). Es el corazón del worker (el agregado NO trae NIF del titular, así que hay que cruzar por CUPS).
- **Ahora mismo el agregado partner solo contiene a CHEMTROL (14 CUPS).** El resto de clientes NO están en el agregado porque sus autorizaciones aún no se han tramitado por la vía partner en Datadis. → El volumen de datos crece según se tramitan autorizaciones. **El módulo de autorizaciones (Fase 1, ya construido) y la sincronización son EL MISMO FLUJO.**

## Worker a construir (spec, para sesión de desarrollo con diseño+auditoría)

`datadis-sync` (Edge Function, cron o disparo manual):
1. Login (secrets Valere) → `get-supplies` SIN authorizedNif (modelo agregado). Parsear el array (leer `.response` si el endpoint portal, o array directo en terceros — confirmado array directo en terceros).
2. Por cada CUPS del agregado: `norm(codigo_cups)` y cruzar con `cups` del CRM.
   - Match → actualizar datos oficiales (distribuidora, provincia, fechas, tipoPunto).
   - Sin match → registrar como "CUPS Datadis sin empresa" (staging) para revisión, NO crear a ciegas.
3. Poblar `datadis_supply_price_terms` / consumos según haga falta (get_consumption por CUPS).
4. Todo con staging + auditoría (RGPD: datos de terceros).

## Pendientes operativos (Juan / Datadis)

- **BORRAR** la función `datadis-diag-temp` del dashboard Supabase (Edge Functions → delete). Ya está neutralizada (verify_jwt + 410).
- Aclarar con Datadis por qué `authorizedNif` da 403 (probablemente esa vía no está habilitada; el partner usa la agregada). No bloquea: usamos la agregada.
- Para traer más clientes al agregado: tramitar sus autorizaciones por la vía partner (flujo del módulo de autorizaciones).

## Correcciones a diagnósticos previos
- Auditor decía "faltan credenciales / datadis_tokens vacía" → NO, credenciales en secrets, comunicación OK.
- Hipótesis "authorizedNif por cliente" → NO, da 403; el modelo es agregado.
