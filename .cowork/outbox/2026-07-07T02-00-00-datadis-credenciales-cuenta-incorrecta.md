# ⚠️ DATADIS — CREDENCIAL CONFIGURADA ES DE CHEMTROL, NO DE VALERE PARTNER (2026-07-07)

> Hallazgo destapado por Juan al pedir comprobar la cuenta partner. Corrige conclusiones anteriores.
> IMPORTANTE: la comunicación funciona, pero entra con la cuenta EQUIVOCADA.

## El hallazgo (probado en vivo)
- El secret `DATADIS_USERNAME` de las Edge Functions = **A28429348 (CIF de CHEMTROL)**, NO **B10759520 (CIF de Valere partner)**.
- Por eso: el "agregado" devuelve solo 14 CUPS (= los de CHEMTROL, su cuenta propia); `authorizedNif` daba 403 (CHEMTROL no es partner); solo CHEMTROL se sincronizó.
- Es decir: TODA la infraestructura (worker datadis-sync, cron, mapeo, protección) está bien montada, pero apunta a la cuenta de un cliente en vez de a la cuenta partner de Valere.
- Probablemente los secrets se pusieron con las credenciales de CHEMTROL en pruebas de may/jun y nunca se cambiaron.

## FIX (solo lo hace Juan — no introducir credenciales por chat/SQL)
Cambiar los 2 secrets de Datadis a la cuenta PARTNER de Valere:
1. Supabase Dashboard → Project Settings → **Edge Functions → Secrets** (o Configuration → Secrets).
2. Editar:
   - `DATADIS_USERNAME` → **B10759520** (CIF de Valere)
   - `DATADIS_PASSWORD` → contraseña de la cuenta partner de Valere en datadis.es
3. Guardar. (No hace falta redeploy: las funciones leen los secrets en caliente.)

## Tras el cambio (verificación)
- Ejecutar el worker en dry-run (con el x-cron-secret) y confirmar:
  - `datadis_total` sube de 14 a los CUPS reales de TODOS los clientes autorizados a Valere.
  - `mapeado_por_empresa` muestra varios clientes (no solo CHEMTROL).
- Si con la cuenta partner el agregado sin NIF NO trae todos, re-probar `authorizedNif` por cliente (con la cuenta partner sí debería funcionar, a diferencia de con CHEMTROL que daba 403). Ajustar el worker si hiciera falta (añadir bucle por NIF de clientes con autorización activa).

## Estado que NO hay que tocar
- Los 13 CUPS de CHEMTROL ya enriquecidos son datos reales y correctos (vinieron de su cuenta, válida). No revertir.
- Worker no-destructivo: no pisa campos de otras fases. Seguro re-ejecutar con la cuenta correcta.

## Pendiente
- Borrar `datadis-diag-temp` del dashboard (neutralizada, v10).
- Commit worker ya hecho (rama claude/ui-renovaciones-cups).
