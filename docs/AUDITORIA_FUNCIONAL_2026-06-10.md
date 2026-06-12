# Auditoría funcional CRM VALERE con clientes ficticios

> **Fecha:** 2026-06-10 · **Auditor:** Claude (Cowork, Fable 5) vía navegador real (Chrome) sobre **producción** `https://valere-v2.pages.dev`
> **Usuario:** `test.auditor@valereconsultores.com` (role manager + funciones admin/asesor_senior/analista/telemarketing)
> **Contexto:** sustituye al intento fallido del agente ChatGPT (sin navegador). Esta auditoría SÍ se ejecutó de verdad: cada resultado de este informe corresponde a una acción real verificada con capturas.
> **Nota:** los CIF/CUPS del prompt original (B00000001, ES...01AB) tenían checksum inválido; se usaron equivalentes válidos B12345674/B76543214 y ES0021000000000001RK/ES0021000000000002RE.

## 1. Resumen ejecutivo

Se recorrió el flujo completo de negocio con dos clientes ficticios: captación → empresa → contacto → CUPS → facturas → análisis → propuesta → tracking → contrato, más los módulos transversales (incidencias, renovaciones, documentos, importador, Datadis, FV, potencias, admin, notificaciones, asistente RAG).

**Lo que funciona mejor de lo esperado:** el tramo `empresa → contacto decisor (wizard) → CUPS → facturas → análisis → guardar propuesta → listado/tracking` **funciona de punta a punta** — el botón "Guardar Propuesta" existe en producción (el repo local parece ir por detrás del deploy). Las validaciones de NIF y CUPS funcionan, la verificación de datos pre-análisis es excelente, Captación es un módulo maduro, Plantas FV es rico y Datadis (cuenta propia) opera contra distribuidoras reales gestionando errores parciales.

**Los tres bloqueos reales del negocio:** (1) **no existe generación de PDF** — el menú de una propuesta guardada solo ofrece "Ver Detalle" y "Eliminar"; sin documento no hay nada que enseñar al cliente; (2) **el motor de comparación produce resultados absurdos** con pocas facturas: compara coste histórico de 1-2 meses contra coste anual de oferta y muestra "ahorro máximo **-32,8%**" (¡en verde y como "mejor oferta"!) — un comercial que enseñe esto pierde la venta; (3) **Incidencias está roto**: los botones "Nueva incidencia"/"Crear la primera" no abren nada.

El cuarto problema es de arquitectura de producto: el flujo que genera dinero (`/datos`, `/analisis`, `/propuestas-energia`, `/tracking`) **no está en el menú** — solo se llega por URL directa. El equipo no puede usar lo que no ve.

## 2. Datos ficticios creados (ver §14 para limpieza)

| Entidad | Dato | ID |
|---|---|---|
| Empresa | TEST_CLIENTE_VALERE_01_INDUSTRIAL (B12345674, Sevilla, industrial) | `1d46298e-43ce-454c-9773-5a68571375b6` |
| Empresa | TEST_CLIENTE_VALERE_02_FV_AUTOCONSUMO (B76543214, Córdoba, servicios) | `36a28286-159c-446b-970b-497d871a8283` |
| Contactos | Responsable Energia Test 01 / Test 02 (decisores) | — |
| CUPS | ES0021000000000001RK (6.1TD, 450/450/450/400/350/350 kW, 1,25 GWh) | `a15cd807-0ce7-46f7-9e08-8c1b1236706f` |
| CUPS | ES0021000000000002RE (3.0TD, FV 100 kWp, 320 MWh) | — |
| Facturas | C1: 05/2026 (104.500 kWh, 16.500 €, 31d) + 04/2026 (102.300 kWh, 16.100 €, 30d); C2: 05/2026 (26.700 kWh, 1.700 kWh exced., 4.200 €, 31d) | — |
| Propuestas | 2 (una por cliente, guardadas desde /analisis) | — |
| Contrato | TEST_01 ↔ "Energya-VM (TEST)", Luz, 01/07/2026→30/06/2027 | — |
| Lead/Oportunidad | TEST_LEAD_VALERE_AUDITORIA (600000003) en "Por llamar" | — |
| Usuario | test.auditor@valereconsultores.com (manager) | `492a6574-7bda-4667-aafb-d51ee7fe101a` |

## 3. Recorrido paso a paso (cronológico)

1. Login OK con el usuario auditor (la sesión previa de Juan se cerró para la prueba).
2. Dashboard: KPIs cargan; muestra 24 empresas (BD tiene 53 → scope por comercial); widget pool OMIE vivo (35,38 €/MWh).
3. Inventario de menú; detectadas rutas ausentes (/datos, /analisis, /propuestas-energia, /tracking).
4. Alta empresa TEST_01 con wizard de 2 pasos (empresa → contacto decisor obligatorio). Toast "Empresa creada".
5. Bug UX: modal de contacto más alto que el viewport sin scroll interno; Guardar inaccesible (~770px de alto); se salvó vía JS.
6. /datos (por URL): alta CUPS 6.1TD con potencias y distribución E1-E6; 2 facturas registradas.
7. /analisis: verificación de datos correcta (avisa "2 facturas — se recomienda mínimo 6"); ejecutado → "15 ofertas comparadas para 6.1TD".
8. **Resultado incoherente**: coste actual 32.600 € (2 meses) vs "mejor oferta" 43.293 € (anual) → "Ahorro máximo -10.693 € (-32,8%)", los 15 "ahorros" en rojo, pero la card en verde/azul como si fuera bueno.
9. "Guardar Propuesta" → "Propuesta guardada correctamente". Aparece en /propuestas-energia y en /tracking.
10. Menú de la propuesta: solo "Ver Detalle" y "Eliminar". **No hay PDF.** Detalle correcto.
11. Cliente 2 creado igual; en el modal CUPS, al elegir 3.0TD el formulario ofrece **solo 3 periodos de potencia** (deben ser 6). Factura con excedentes OK.
12. Análisis C2: mismo patrón (-40,9% "ahorro"). Propuesta 2 guardada.
13. Captación: lead TEST creado; panel de oportunidad con acciones (No contesta/No es decisor/Posponer/No interesa), semáforo de vencimiento; pasa a "Por llamar (1)".
14. Contratos: **2 contratos preexistentes con todas las columnas vacías y prioridad "Crítica"** (datos huérfanos). Form de alta sin campo CUPS y con comercializadora en texto libre. Contrato TEST creado OK.
15. Renovaciones: UI completa (estados, prioridades), 0 registros. No probada el alta por tiempo.
16. **Incidencias: "Nueva incidencia" y "Crear la primera" no hacen nada** (sin modal, sin error en consola).
17. Importador: 3 pestañas (Empresas/Contactos/Contratos+CUPS). Sin facturas/SIPS, sin plantilla descargable.
18. Plantas FV: módulo rico (5 plantas, KPIs, alarmas, credenciales con avisos de expiración, descuadre vs Datadis, badge "Datos de demostración"). Muestra "Incidencias CRM (4)" mientras /incidencias dice 0 → conceptos sin reconciliar.
19. /datadis: funciona con cuenta propia (14 suministros, 4 distribuidoras, manejo del CodError 902 de Datadis). En /datos, el bloque Datadis por CUPS pide **credenciales del titular** (no autorización de terceros).
20. Potencias: dashboard propio completo (ventana RDL 7/2026, 53 clientes, 75 CUPS, 35 expedientes) — sin filtro de scope, inconsistente con Empresas (24).
21. Admin (accesible para manager): usuarios con cambio de rol inline, pendientes, comercializadoras, ofertas, config, campos, importar tarifas.
22. Ficha empresa: pestaña **Propuestas = placeholder** ("Sección 'propuestas' — próximas iteraciones"); pestaña Documentos sí tiene UI ("Subir archivo"); no existe pestaña CUPS/suministros.
23. Notificaciones: panel funciona, "Sin notificaciones" (nada las dispara).
24. Asistente RAG: presente y contextual ("Contexto: propuestas-energia").
25. Operativa: varias páginas quedan en estado "cargando" indefinido (assets en pending desde Cloudflare Pages); hubo que recrear la pestaña una vez.

## 4. Resultado por módulo (resumen)

| # | Módulo | ¿Funcionó? | Severidad problema | Nota clave |
|---|---|---|---|---|
| 1 | Captación/leads | ✅ Sí | — | Maduro. Lead → Por llamar, acciones, SLA. Duplicados en histórico |
| 2 | Empresas/clientes | ✅ Sí | Media | Wizard 2 pasos excelente. Modal sin scroll (bug viewport). Sin dedup |
| 3 | CUPS/suministros | ⚠️ Parcial | **Alta** | Alta OK con validación. **3.0TD muestra 3 periodos de potencia (son 6)**. Solo accesible vía /datos oculto. Ficha empresa sin pestaña CUPS |
| 4 | Facturas/consumos | ✅ Sí | Baja | Alta manual OK, totales correctos. Sin import masivo |
| 5 | Análisis | ⚠️ Parcial | **Crítica** | Calcula y grafica 15/14 ofertas, PERO base temporal no normalizada → ahorros negativos absurdos presentados como "mejor oferta" |
| 6 | Propuestas | ⚠️ Parcial | **Crítica** | Guardar/listar/detalle/eliminar OK. **Sin PDF** (no existe acción). Ficha empresa no las muestra |
| 7 | Envío/tracking | ⚠️ Parcial | Alta | Tracking lista análisis sin estados (pendiente/enviada/aceptada). Sin envío ni borradores (proposal_email_drafts sin UI) |
| 8 | Contratos | ⚠️ Parcial | Alta | Alta OK. Sin CUPS, sin FK comercializadora, sin vínculo propuesta. 2 contratos huérfanos en prod |
| 9 | Renovaciones | ⚠️ UI sin uso | Media | UI completa, 0 registros, sin conexión automática con contratos |
| 10 | Incidencias | ❌ No | **Crítica** | Botones de creación inertes. Módulo inoperante |
| 11 | Tareas/notificaciones | ⚠️ Parcial | Media | Campana funciona pero nada notifica. Tabla `tareas` sin UI visible |
| 12 | Documentos | ✅ Sí (UI) | Baja | Pestaña con "Subir archivo" en ficha (no se probó upload real) |
| 13 | Datadis | ⚠️ Parcial | Alta | /datadis cuenta propia OK. Flujo por CUPS pide credenciales del titular → RGPD/UX mala; falta autorización de terceros + puente a facturas |
| 14 | SIPS/importador | ⚠️ Parcial | Alta | Sin pestaña de consumos/SIPS. Sin plantillas ni preview visible |
| 15 | Fotovoltaica | ✅ Sí | Media | Muy completo. Avisos de credenciales. Incidencias FV ≠ incidencias CRM |
| 16 | Potencias | ✅ Sí | Media | Dashboard rico. Scope global inconsistente con CRM. `savings_calculations` paralelo al calculator |
| 17 | Tarifas/comercializadoras | ✅ Sí | — | 29 ofertas activas usadas por el análisis. Pipeline staging sin estrenar |
| 18 | Holded | No probado | — | Sin UI visible en menú; integración solo backend |
| 19 | Seguridad/permisos | ⚠️ Parcial | Alta | Manager ve/edita todo incl. roles de usuarios. Módulos rotos/vacíos visibles para todos. Asistente FAB tapa botones de acción |
| 20 | Dashboard | ✅ Sí | Baja | KPIs + pool OMIE vivo. Conteos inconsistentes entre módulos |

## 5. Flujo de negocio completo

```
captación ✅ → cliente ✅ → CUPS ✅ (solo vía /datos oculto) → consumo ✅ (solo manual)
→ análisis ⚠️ (calcula, pero números no presentables) → propuesta ✅ guardar / ❌ PDF
→ envío ❌ (no existe) → tracking ⚠️ (espejo sin estados) → contrato ⚠️ (manual, sin vínculos)
→ renovación ❌ (sin conexión) / incidencia ❌ (roto)
```

El flujo se rompe en: **PDF (no existe) → envío (no existe) → estados (no existen)**. Y aunque no se rompe antes, cojea: la entrada de datos es 100% manual y el camino está oculto del menú.

## 6. Hallazgos críticos

| ID | Hallazgo | Tipo | Evidencia |
|---|---|---|---|
| C1 | Sin generación de PDF de propuesta (menú: solo Ver Detalle/Eliminar) | Bloqueo funcional | §3.10 |
| C2 | Comparación coste 1-2 meses vs coste anual de oferta sin normalizar → "ahorro" -32,8%/-40,9% presentado en verde como "MEJOR" oferta | Bug de cálculo + UX | §3.8, §3.12 |
| C3 | Incidencias: creación inoperante (botones sin efecto) | Bug técnico | §3.16 |
| C4 | Flujo principal (/datos, /analisis, /propuestas-energia, /tracking) fuera del menú | Bloqueo de adopción | §3.3 |

## 7. Hallazgos altos y medios

**Altos:** modelo tarifario 3.0TD con 3 periodos de potencia (A1); contratos huérfanos en prod + form sin CUPS/comercializadora-FK/propuesta (A2); pestaña Propuestas de ficha empresa = placeholder (A3); sin envío de propuestas ni estados en tracking (A4); Datadis por CUPS basado en credenciales del titular (A5); importador sin facturas/SIPS (A6); manager puede cambiar roles en /admin incluido master (A7).

**Medios:** duplicados (ABRASIVOS ×2, Herba ×2) y registros basura (dzt, xfgj, prueba, carolina, empresa 1) + 4 "DEMO MVP" mezclados con producción (M1); modal contacto sin scroll en viewports bajos (M2); scoping inconsistente 24 vs 53 clientes entre CRM y Potencias (M3); páginas en "loading" indefinido intermitente — assets pending en Cloudflare (M4); incidencias FV (4) vs incidencias CRM (0) sin reconciliar (M5); CUPS recién creado no se autoselecciona (M6); toasts persistentes apilados (M7); FAB del asistente tapa botones de acción de tablas (M8).

**Bajos:** ahorro negativo en verde; campo email del login con autofill de un NIF guardado; placeholder del CUPS idéntico al ejemplo; columna "Ahorro Anual" en tracking cuando el dato no es anual.

## 8. Módulos fantasma o desconectados

`/tracking` (espejo sin función propia), pestaña Propuestas de ficha empresa (placeholder), Incidencias (UI sin acción), Renovaciones (sin disparadores), tabla `tareas`/`alertas`/`eventos` (sin UI), `proposal_email_drafts` (sin UI), Holded (sin UI), pipeline `tariff_staging` (sin pantalla de revisión).

## 9. Datos que no fluyen

Propuesta → ficha de empresa (no aparece); propuesta → contrato (sin vínculo); contrato → renovación (sin automatismo); Datadis caché (44 entradas) → `datadis_consumptions`/`facturas` (0 filas); FV producción → análisis/autoconsumo (sin cruce); actividad del flujo de datos (alta CUPS/factura/propuesta) → timeline "Actividad reciente" de la empresa (queda "Sin actividades" — el audit_log lo registra pero la UI no lo muestra).

## 10. UX y adopción

Carolina puede usar Captación sin ayuda (está bien resuelto). Un analista NO puede ejecutar el flujo de análisis sin que alguien le pase las URLs ocultas. Juan ve demasiado: 20+ entradas de menú con módulos vacíos o rotos mezclados con los buenos, lo que transmite "CRM a medias" aunque el 70% funcione. La percepción de poca utilidad viene de: rutas ocultas + números de ahorro absurdos + ausencia de documento final + módulos rotos visibles.

## 11. Seguridad y permisos visibles

Manager edita roles de cualquier usuario en /admin (incluido subir a master) — limitar a master. El usuario auditor ve TODOS los datos reales (53 empresas, contactos con emails/teléfonos) — coherente con su rol pero recordar RGPD al crear usuarios de prueba; **borrar el usuario auditor al terminar**. Las "Vista global" y los scopes por comercial no son consistentes entre módulos. No se observaron credenciales ni tokens expuestos en UI. (El backend tiene además los 27 SECURITY DEFINER ejecutables por anon documentados en `ANALISIS_ESTRATEGICO_2026-06-10.md` §2.2.)

## 12. Recomendaciones priorizadas

**Hacer ya (desbloquea el negocio):**
1. Normalizar la comparación del análisis (anualizar coste histórico por días facturados o comparar período a período) + bloquear/avisar con <3 facturas + corregir colores/sentido de "ahorro" negativo (C2).
2. Generador de PDF de propuesta con el diseño "comparativas comercializadoras" (C1) — es el sprint S3 del plan estratégico.
3. Reparar creación de incidencias (C3).
4. Sacar al menú la sección "Energía": Datos, Análisis, Propuestas, Tracking (C4).
5. Corregir periodos de potencia 3.0TD → 6 (A1).

**Hacer después:**
6. Vincular propuesta↔empresa (ficha) y propuesta→contrato; añadir CUPS y comercializadora-FK al contrato (A2/A3).
7. Envío de propuesta vía Resend + estados en tracking (A4).
8. Importador de facturas/SIPS Excel (A6) y flujo Datadis de autorización de terceros + puente a facturas (A5).
9. Deduplicación de empresas + limpiar registros basura y separar datos DEMO (M1).
10. Restringir cambio de roles a master (A7); revisar modales en viewports bajos (M2); unificar scoping (M3).

**Congelar o eliminar:**
11. Contratos huérfanos: depurar las 2 filas vacías.
12. /tracking como página separada (fusionar con propuestas cuando haya estados).
13. No abrir módulos nuevos hasta cerrar el circuito (alineado con `ANALISIS_ESTRATEGICO_2026-06-10.md`).

## 13. Prompt para Claude/Codex (siguiente sesión técnica)

```
Lee docs/AUDITORIA_FUNCIONAL_2026-06-10.md y docs/ANALISIS_ESTRATEGICO_2026-06-10.md.
Trabaja en rama claude/fix-auditoria-funcional. Orden de ataque:
1. src/features/analisis/AnalisisPage.tsx + src/core/energia/calculator.ts:
   normalización temporal de la comparación (anualizar por billed_days o compare
   por período); umbral mínimo de facturas; signo/color de ahorro coherente.
   Añade tests con los casos TEST_01 (6.1TD, 2 facturas) y TEST_02 (3.0TD+FV).
2. Tarifas: corregir mapa de periodos de potencia (3.0TD = 6 periodos) en el form
   de /datos y en el calculator/adapters.
3. Incidencias: localizar el handler del botón "Nueva incidencia" (IncidenciasPage)
   y reparar la apertura del modal.
4. AppShell/menú: añadir grupo "Energía" con /datos, /analisis, /propuestas-energia,
   /tracking respetando RBAC.
5. PDF propuesta: plantilla HTML→PDF en Edge Function (esperar diseño de Juan).
Verifica: npx tsc --noEmit (0 errores) y npm test -- --run antes de commit.
NO borres los datos TEST_ hasta que Juan confirme (sección 14).
```

## 14. Limpieza de datos de prueba (ejecutar cuando Juan confirme)

```sql
-- Orden: hijos → padres. IDs en §2.
DELETE FROM proposals WHERE cups_id IN (SELECT id FROM cups WHERE cups IN ('ES0021000000000001RK','ES0021000000000002RE'));
DELETE FROM facturas WHERE cups_id IN (SELECT id FROM cups WHERE cups IN ('ES0021000000000001RK','ES0021000000000002RE'));
DELETE FROM contratos WHERE empresa_id IN ('1d46298e-43ce-454c-9773-5a68571375b6','36a28286-159c-446b-970b-497d871a8283');
DELETE FROM cups WHERE cups IN ('ES0021000000000001RK','ES0021000000000002RE');
DELETE FROM contactos WHERE empresa_id IN ('1d46298e-43ce-454c-9773-5a68571375b6','36a28286-159c-446b-970b-497d871a8283');
DELETE FROM oportunidades WHERE empresa_id IN (SELECT id FROM empresas WHERE nombre LIKE 'TEST_LEAD_VALERE%' OR id IN ('1d46298e-43ce-454c-9773-5a68571375b6','36a28286-159c-446b-970b-497d871a8283'));
DELETE FROM actividades WHERE empresa_id IN (SELECT id FROM empresas WHERE nombre LIKE 'TEST_%VALERE%');
DELETE FROM empresas WHERE nombre IN ('TEST_CLIENTE_VALERE_01_INDUSTRIAL','TEST_CLIENTE_VALERE_02_FV_AUTOCONSUMO','TEST_LEAD_VALERE_AUDITORIA');
-- Usuario auditor (tras revocar con Juan):
-- SELECT admin_reject_user('492a6574-7bda-4667-aafb-d51ee7fe101a'); o DELETE FROM auth.users WHERE id='492a6574-7bda-4667-aafb-d51ee7fe101a';
-- Nota: verificar también empresas creadas automáticamente por el lead TEST y los 2 contratos huérfanos preexistentes (estos últimos NO son de esta auditoría).
```
