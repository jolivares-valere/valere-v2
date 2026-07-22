# GATE V3 — Guion del examen (22-jul-2026, examinada: Julia Ruiz)

> Primer gate ante un usuario AJENO al circuito de desarrollo. Julia NO recibe ayuda
> verbal. La doc RAG del CRM esta permitida (es parte del producto). El auditor
> cronometra y cuadra por SQL. Juan solo entrega la "hoja de encargo" y calla.

## Preparacion (Juan, 5 min antes)
1. Elegir UNA venta NAGINI real pendiente de alta (de las 6 restantes via Zoco) y
   apuntar en un papel: razon social, NIF, ciudad, CUPS, tarifa de acceso, potencias
   y energias del contrato, fecha inicio y fin. SIN instrucciones de como meterlo.
2. Verificar que Julia entra al CRM (soporte@valereconsultores.com) y que hay un PDF
   subido en el sistema (el contrato de JIMENEZ ROSALES SL, alta NAGINI de ayer).
3. El auditor abre cronometro y toma acta.

## TAREA 1 — "Da de alta esta venta en el CRM" (objetivo <2 min)
Se le entrega el papel y nada mas. Exito si SIN AYUDA:
- Encuentra sola el camino (menu "Nueva venta").
- Completa los 4 pasos: empresa (buscar o crear) -> CUPS -> contrato (comercializadora
  del desplegable; los periodos que pinta el formulario segun tarifa) -> renovacion.
- Llega a la pantalla "Venta dada de alta" con los 3 enlaces.
CRONO: desde el primer clic en el menu hasta la pantalla de exito.

## TAREA 2 — "Encuentra el contrato en PDF de JIMENEZ ROSALES y abrelo" (objetivo <1 min)
Exito si llega al PDF (buscador global o Empresas -> ficha -> pestana Documentos,
o Contratos -> detalle -> Documentos) y lo abre a 1 clic.

## CA del auditor (cuadre SQL inmediato, sin esperar)
```sql
-- lo creado por Julia en los ultimos 15 min, todo enlazado:
select e.nombre, c.codigo_cups, ct.compania, ct.comercializadora_id is not null as fk_ok,
       ct.fecha_fin, r.prioridad, r.estado
from contratos ct
join empresas e on e.id = ct.empresa_id
left join cups c on c.contrato_id = ct.id
left join renovaciones r on r.contrato_id = ct.id and r.deleted_at is null
where ct.created_at > now() - interval '15 minutes';
```
- 1 empresa (o existente reutilizada) + 1 CUPS + 1 contrato con comercializadora_id
  (NAGINI, cero texto libre) + 1 renovacion 'detectada' con prioridad coherente.
- Si la tarifa es 2.0TD: p3_kw..p6_kw NULL y energia_p4..p6 NULL (no 0 inventado).
- La renovacion aparece en /renovaciones (pipeline o bandeja sin fecha segun tenga fecha fin).

## Veredicto
- CIERRA: ambas tareas sin ayuda, cronos <2 min y <1 min, cuadre SQL verde.
- CIERRA CONDICIONAL: lo logra pero con tropiezos de UI dignos de fix (anotarlos:
  cada tropiezo de Julia es una mejora de backlog, no un fallo suyo).
- NO CIERRA: se queda atascada o necesita ayuda -> anotar DONDE exactamente; ese
  punto es el trabajo de la proxima iteracion.

## Nota de contexto para el acta
Julia es role master (sin restricciones): este gate mide USABILIDAD, no permisos.
El gate de permisos por rol (comercial/visor) queda para cuando haya usuarios de esos
roles operando.
