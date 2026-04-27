# Informe Browser — Análisis Holded para integración con Valere CRM

> **Fuente**: agente Claude in Chrome lanzado por Juan el 2026-04-26.
> **Estado**: documento de referencia, preservado tal cual.
> **Plan adaptado a stack Valere**: ver `docs/PLAN_INTEGRACION_HOLDED.md` (procesado por Cowork).

---

## A. INFORME EXHAUSTIVO DE INTEGRACIÓN VALERE CRM ↔ HOLDED

### 1. Contexto y objetivos

Valere Consultores Asociados utiliza Holded como ERP/contabilidad/facturación y dispone de un CRM propio (Valere CRM). El objetivo es que ambos sistemas convivan sin duplicar información ni introducir inconsistencias. Holded expone una API REST documentada en developers.holded.com con autenticación por API Key. La integración debe ser idempotente, auditable, segura, escalable y reversible.

Los objetivos funcionales son: tener una única fuente de verdad por entidad, automatizar el ciclo lead → oportunidad → presupuesto → factura → cobro, evitar errores de tipado fiscal (NIF/CIF/VAT), reducir trabajo manual del equipo administrativo y disponer de trazabilidad completa de cada sincronización.

### 2. Inventario de entidades y mapeo Valere ↔ Holded

**Contactos**. Holded distingue empresa y persona. Campos clave que la API espera: `name`, `code` (NIF/CIF), `tradeName`, `email`, `mobile`, `phone`, `type` (client, supplier, lead, debtor, creditor), `iban`, `swift`, `billAddress` (address, postalCode, city, province, country en ISO-3166 alfa-2), `customFields`, `tags`, `notes`, `defaults` (salesChannel, expensesAccount, salesAccount, paymentMethod, language, currency).

En Valere CRM, asegurar que los contactos tengan: tipo_contacto, nombre_fiscal, nombre_comercial, nif_cif validado, vat_intracomunitario, idioma, divisa, dirección desglosada, lista de personas de contacto relacionadas con cargo y email/teléfono propios, y un campo `holded_id` único.

**Oportunidades / Leads**. Holded modela funnels con stages, y leads con notes, tasks, dates y stage. Campos a mantener en Valere: funnel_id, stage_id, contact_id, owner_id, value (importe), currency, expected_close_date, probability, source/origen, status (open, won, lost), tags, descripción larga y colecciones relacionadas de actividades (notas, tareas, llamadas, reuniones).

**Productos y servicios**. Holded acepta productos con name, sku, description, price, cost, tax, account, kind (simple, variants, pack), unit, barcode, weight, stock, warehouse. Valere CRM debe normalizar el catálogo con sku único, descripción, precio_base, iva (porcentaje), categoría, unidad y holded_id.

**Documentos comerciales** (presupuestos, proformas, facturas, albaranes, tickets, pedidos). Holded los unifica bajo `/invoicing/v1/documents/{docType}` con docType ∈ {invoice, salesreceipt, creditnote, salesorder, proform, waybill, estimate, purchase, purchaseorder, purchaserefund}. Estructura común: contactId (o nuevos datos de contacto), date, dueDate, notes, items[] (name, desc, units, subtotal, tax, retention, discount, sku, productId), tags, paymentMethod, currency, language, salesChannelId, customFields, applyEquivalenceSurcharge.

**Cobros y pagos**. Endpoint `/payments`. Campos: docType, docId, amount, date, treasuryId, paymentMethodId, notes, contactId.

**Tesorería y métodos de pago**. Treasuries devuelve cuentas (banco, caja). Cualquier cobro/pago volcado desde Valere debe referenciar un treasuryId existente en Holded.

**Cuentas contables**. ExpensesAccounts y el plan contable. Para asientos automatizados o categorización de facturas de proveedor.

**RRHH (Team API)**. Empleados con datos personales, contrato y time-tracking (clock-in/out, pausas). Útil si Valere CRM gestiona partes horarios o asignación de tareas comerciales con coste interno.

**Proyectos**. Projects, Tasks, Time Tracking. Permite imputar horas a proyecto y luego facturarlas.

### 3. Reglas de mapeo y normalización imprescindibles

Cada registro relacional debe tener un campo `holded_id` (string, indexado, único, nullable), un `holded_etag` o hash del último payload enviado para detectar cambios reales, y `holded_synced_at` (timestamp UTC). Sin estos tres campos no hay sincronización fiable.

Los NIF/CIF deben validarse en Valere antes de enviar (algoritmo de letra de control para NIF, algoritmo de dígito para CIF, formato VAT intracomunitario con prefijo de país). Holded rechaza códigos mal formados.

Los países deben almacenarse en ISO-3166 alfa-2 (ES, FR, PT, DE…) y las divisas en ISO-4217 (EUR, USD, GBP). Los idiomas en ISO-639-1 (es, en, ca…). Las fechas siempre en UTC y formato ISO-8601, convirtiendo en presentación según zona horaria del usuario.

Los importes deben almacenarse en céntimos (entero) o en decimal con 4 decimales para evitar errores de redondeo, y convertirse al formato que espera Holded (decimal con 2 decimales) solo en el momento de la llamada.

Los impuestos deben gestionarse con un catálogo de IVA y retenciones sincronizado contra Holded, no como texto libre. Para operaciones intracomunitarias, exportaciones, recargo de equivalencia y exenciones, definir tipos específicos.

Las direcciones deben estar desglosadas siempre (calle, número, piso/puerta, código postal, ciudad, provincia, país). Si Valere hoy guarda direcciones concatenadas, ejecutar una migración con parser y revisión manual de los casos dudosos antes de activar la sincronización.

### 4. Arquitectura técnica recomendada

La integración debe vivir en una capa de servicios independiente, no embebida en la lógica de negocio de Valere CRM. Esto permite cambiar Holded por otro ERP en el futuro y aislar fallos.

Componentes recomendados: un cliente HTTP `HoldedClient` con autenticación, gestión de rate-limit, reintentos con backoff exponencial, timeout configurable y logging estructurado; una capa de mappers/transformers que convierte entidades Valere a payload Holded y viceversa; un orquestador con cola asíncrona (Redis + un worker tipo BullMQ, Sidekiq, Celery o Symfony Messenger según stack) que encola operaciones de sincronización; un cron/scheduler que cada X minutos ejecuta un pull de cambios de Holded (polling, ya que Holded no ofrece webhooks unificados); un panel de administración con estado de cada sincronización, errores, reintentos manuales y logs; y un módulo de auditoría que registre cada llamada con timestamp, usuario disparador, payload enviado, respuesta recibida y resultado.

La política de fuente de verdad debe definirse explícitamente por entidad. Recomendación: contactos editables en ambos lados con resolución last-write-wins basada en updated_at; productos como fuente de verdad Holded; documentos comerciales como fuente de verdad Holded una vez emitidos (Valere los puede crear pero no modificar tras emisión); leads y oportunidades como fuente de verdad Valere CRM; cobros como fuente de verdad Holded.

### 5. Seguridad y cumplimiento

La API Key de Holded debe almacenarse cifrada en base de datos (AES-256 con clave en KMS o variable de entorno protegida), nunca en código fuente ni en frontend. Establecer rotación periódica (cada 90 días) y permisos por rol en Valere CRM para decidir quién puede disparar sincronizaciones manuales.

Todas las comunicaciones por HTTPS con verificación de certificado. Logs sin datos sensibles (enmascarar IBAN, NIF parcialmente, tokens). Cumplimiento RGPD: registro de tratamientos, base legal documentada para enviar datos de contactos a Holded (que es encargado de tratamiento), y mecanismo para borrar/anonimizar contactos en ambos sistemas cuando se ejerza derecho de supresión.

Backups antes de cada sincronización masiva. Modo "dry-run" obligatorio en migraciones iniciales para validar el mapeo sin escribir en Holded.

### 6. Gestión de errores, reintentos y conflictos

Errores 4xx (validación) no se reintentan: se marcan como error en el log y se notifican al panel de administración para corrección manual. Errores 5xx y de red se reintentan con backoff exponencial (1s, 2s, 4s, 8s, 16s, 32s) hasta 6 intentos; pasados, se mueven a una "dead letter queue" para revisión.

Rate-limit: respetar la cabecera de Holded si la expone, y en su defecto limitar el cliente a un máximo conservador (por ejemplo 5 req/segundo) con un token bucket.

Conflictos: cuando un registro se ha modificado en ambos lados desde la última sincronización, marcar como "conflicto pendiente" y mostrarlo en panel para resolución humana. No sobrescribir nunca silenciosamente.

Idempotencia: cada operación de sincronización debe llevar un `idempotency_key` interno (uuid + entidad + acción) para que un reintento no genere duplicados. Antes de crear un contacto, buscar primero por NIF/CIF o por holded_id si ya está mapeado.

### 7. Plan de implantación por fases

- **Fase 0** — Auditoría y limpieza de datos en Valere CRM: validar NIFs, desglosar direcciones, normalizar países, deduplicar contactos. Sin esto, cualquier integración propaga la suciedad a Holded.
- **Fase 1** — Infraestructura: capa HoldedClient, almacenamiento seguro de API Key, módulo de logs y auditoría, panel administrativo básico, entorno sandbox aislado del entorno productivo de Holded.
- **Fase 2** — Sincronización de catálogos (read-only desde Holded a Valere): funnels, stages, productos, tesorerías, métodos de pago, series de facturación, cuentas contables, tags.
- **Fase 3** — Sincronización de contactos bidireccional con dry-run inicial.
- **Fase 4** — Sincronización de oportunidades/leads y sus actividades.
- **Fase 5** — Emisión de documentos comerciales desde Valere a Holded.
- **Fase 6** — Sincronización de cobros y conciliación.
- **Fase 7** — Proyectos y time tracking si aplica.
- **Fase 8** — Optimización: caché de catálogos, métricas, alertas, dashboard de salud.

### 8. Riesgos detectados y mitigación

Datos sucios en Valere → migración previa obligatoria. Holded sin webhooks → polling con marca de tiempo y comparación de hashes. Cambios de la API de Holded → versionar el cliente, monitorizar el changelog y tener tests de contrato. Dependencia de un único API Key → permisos diferenciados por uso y plan de continuidad si Holded sufre downtime. Volumen alto de contactos → primera sincronización por lotes paginados con control de progreso.

### 9. Criterios de aceptación de la integración

La integración se considera lista cuando: el 100% de los contactos en Valere tiene holded_id válido o motivo documentado de exclusión; cualquier alta/edición en Valere se refleja en Holded en menos de 5 minutos; todos los errores son visibles en panel y reintentables; existe documentación técnica completa del mapeo de campos; hay tests automatizados de contrato contra Holded en sandbox; el equipo administrativo puede operar sin tocar Holded directamente para los flujos automatizados; y existe procedimiento de rollback documentado.

---

## B. Notas del agente Browser sobre cuenta Holded de Valere

- Empresa: VALERE CONSULTORES ASOCIADOS SL (CIF B10759520).
- Módulos activos: Inicio, Contactos, Ventas, Compras, CRM (Embudo, Actividades, Calendario, Reservas, Reuniones), RRHH, Inventario, Proyectos, Tesorería, Contabilidad e Impuestos.
- Embudo creado: "Embudo 1".
- Volumen importante de contactos (empresas y personas) ya cargados.

---

## C. Prompt original que el agente Browser propuso para Claude Desktop

> **Cowork nota**: el prompt original asume stack indefinido (PHP/Symfony, Node/NestJS, Python/Django, .NET) y no conoce el repo Valere CRM. Ver `docs/PLAN_INTEGRACION_HOLDED.md` para el prompt corregido al stack real (Supabase + React + Edge Functions) y dirigido a una nueva sesión Cowork (no Claude Desktop).

[Prompt original preservado como referencia histórica — ver versión adaptada en plan]
