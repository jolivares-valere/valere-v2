# SIPS F1 â€” Buscador de CUPS cableado (para siguiente sesiÃ³n)

Rama: `claude/f1-sips-cups` (rebuild limpio desde main). PR pendiente de abrir/mergear.

## Estado
- EF `resolver-sips-cups` desplegada y ACTIVE. Reutiliza `datadis-proxy` (v13) y sus secrets.
- Pantalla `/buscador-cups` cableada (ruta + menÃº CRM Comercial + permiso asesor_senior).
- Verificado tsc 0 + tests antes del commit.

## Pendiente (siguiente mÃ³dulo: "Suministros iteraciÃ³n 2")
- Enganchar `sipsToAutofill()` (ya listo en `src/features/sips/api.ts`) a un formulario de alta/ediciÃ³n de CUPS comercial (que aÃºn NO existe: Suministros solo lee `cups`).
- Alternativa provisional: botÃ³n "Traer de Datadis" en Potencias `NuevoExpedienteModal` (Ãºnico punto que crea CUPS hoy).
- ProspecciÃ³n sin autorizaciÃ³n previa: valorar agregador SIPS comercial (decisiÃ³n de negocio).