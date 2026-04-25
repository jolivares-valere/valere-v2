# Borrador comunicado al equipo — Unificación CRM + Potencias + Excedentes

> Borrador listo para enviar **cuando se complete la Fase 4** de la unificación (apps satélite apuntando al CRM canónico). No mandar antes — el comunicado asume que el cutover ya está hecho.
>
> **Versiones incluidas**: email largo (formal, primer aviso), versión Slack/Teams (corta, recordatorio), versión cliente externo (si en algún momento hay que explicarlo a un comercializador o cliente final).
>
> Adapta saludo/firma al canal. Reemplaza `<FECHA_CUTOVER>` por la fecha real cuando se sepa.

---

## Asunto sugerido

**🚀 Unificación CRM Valere — Potencias y Excedentes en una sola herramienta**

(Alternativa más sobria: _"Cambios en las herramientas Valere — el CRM ahora incluye Potencias y Excedentes"_)

---

## Versión email (larga, primera comunicación)

Hola equipo,

Os escribo para anunciar un cambio importante en nuestras herramientas de trabajo que llevamos meses preparando: **a partir de <FECHA_CUTOVER>, el CRM Valere absorbe las funciones de Gestión de Potencias y Gestión de Excedentes en una sola plataforma**.

### ¿Qué cambia?

**1. Una sola URL para todo:** `https://valere-v2.pages.dev`

A partir de esa fecha, ya no usaréis las URLs separadas de la app de Potencias ni la de Excedentes. **Todo está en el CRM**: empresas, contactos, contratos, oportunidades, expedientes de potencia, comunicaciones, ofertas, propuestas y análisis comparativos.

**2. Un solo login.**

El email y contraseña con los que entráis hoy al CRM es el mismo que vais a seguir usando. Si hasta ahora usabais cuentas distintas en Potencias o Excedentes, esas cuentas se han unificado en vuestra cuenta CRM. Si tenéis dudas sobre con qué email entrar, escribidme.

**3. Los datos están todos en el mismo sitio.**

Las empresas y los CUPS (puntos de suministro) que existían en Potencias se han migrado al CRM. **No vais a perder nada**: lo que estuvierais gestionando sigue ahí, solo que ahora con una vista única en lugar de tres apps distintas.

### ¿Qué NO cambia?

- **Vuestros datos**: las 30+ empresas y los 75+ CUPS que estabais gestionando están todos disponibles, con el mismo histórico.
- **Vuestros usuarios y permisos**: seguís teniendo el mismo nivel de acceso (admin / gestor / comercial).
- **Las propuestas energéticas y análisis comparativos**: misma calculadora, misma base de comercializadoras, mismas tarifas reguladas BOE.
- **El asistente de IA del CRM**: sigue funcionando igual, ahora con más documentación de ayuda integrada.

### Ventajas concretas

- **Adiós a saltar entre apps**: ahora desde la ficha de una empresa veis sus contratos, sus expedientes de potencia, sus comunicaciones, sus propuestas, todo de un vistazo.
- **Búsqueda global única**: una sola caja de búsqueda que encuentra empresas, contactos, expedientes y CUPS.
- **Notificaciones unificadas**: alertas de plazos de potencia y de oportunidades comerciales en el mismo sitio.
- **Mejor calidad de datos**: hemos deduplicado empresas y CUPS que estaban repetidos en Potencias y CRM por separado.

### ¿Qué tenéis que hacer vosotros?

- **Actualizar marcadores**: si tenías guardadas las URLs de Potencias o Excedentes, ya no funcionan. **Sustituidlas por `https://valere-v2.pages.dev`**.
- **Avisarme si echáis algo en falta**: hemos cuidado al máximo la migración pero si veis que un dato no aparece donde debería, escribidme inmediatamente y lo resuelvo.
- **Esta primera semana, máxima atención**: si detectáis cualquier comportamiento raro, contadlo. Estamos especialmente atentos a feedback durante los primeros días.

### Timeline

- **<FECHA_CUTOVER>**: las apps satélite redirigen al CRM. Datos migrados.
- **<FECHA_CUTOVER + 7 días>**: período de "ventana de feedback intensivo". Si todo va bien, las apps viejas se archivan.
- **<FECHA_CUTOVER + 30 días>**: se desactiva definitivamente el alojamiento de las apps viejas (los datos quedan archivados como copia de seguridad permanente).

### Soporte

Si os surge cualquier duda, escribidme. Si queréis una **demo rápida de 15 minutos** del CRM unificado para resolver dudas operativas, decidme y lo monto.

Un abrazo,
Juan

---

## Versión Slack / Teams (corta)

> 🚀 **Unificación CRM** — A partir de **<FECHA_CUTOVER>**, el CRM Valere (`https://valere-v2.pages.dev`) absorbe las apps de Potencias y Excedentes. **Una sola URL, un solo login, todos los datos**. No tenéis que hacer nada salvo actualizar marcadores. Detalles en mail. Avisad si algo no funciona como esperáis.

---

## Versión muy corta (banner / email recordatorio)

> 📌 **Recordatorio**: las URLs de Potencias y Excedentes ya no funcionan. **Todo está ahora en `https://valere-v2.pages.dev`** con vuestro login de siempre.

---

## Versión cliente / colaborador externo (si aplica)

(Por ejemplo, si una comercializadora colaboradora tenía acceso a la app de Excedentes — _no_ es el caso actual, pero plantilla por si en el futuro hace falta).

> Estimado/a [Nombre],
>
> Como parte de la mejora continua de nuestras herramientas, hemos unificado las plataformas de Valere Consultores en una sola interfaz: `https://valere-v2.pages.dev`. Tu acceso sigue activo con tus credenciales habituales. Las funcionalidades a las que tenías acceso siguen disponibles, solo que ahora desde una única URL.
>
> Si necesitas asistencia con el cambio, escríbenos a [contacto].
>
> Un saludo,
> Equipo Valere Consultores

---

## Notas para Juan (no enviar al equipo)

### Antes de mandar

- ✅ Confirmar que **Fase 2 datos** está completa y verificada (counts esperados según `scripts/unificacion_fase2_c_verificacion.sql`).
- ✅ Confirmar que **smoke tests post-cutover** han pasado (Fase 4.B del plan).
- ✅ Confirmar que **storage bucket** (PDFs Potencias) está accesible desde el CRM o que la decisión está tomada.
- ✅ Tener una hora "de ventana" reservada para resolver consultas urgentes el día del envío.

### Recomendación de timing

- **Mandar el email un viernes por la tarde** o **lunes por la mañana** (no jueves — si rompe algo, viernes es mal día para arreglar; no martes/miércoles tampoco — la semana ya está rodando).
- **Pre-aviso 48h antes en Slack** ("la semana que viene cambiamos…") para que nadie se sorprenda.

### Mensajes opcionales que puedes añadir

- Si algún compañero tiene un workflow específico (p.ej. exportar un Excel diario que ahora tiene otra ruta), añadir nota personalizada.
- Si quieres aprovechar para anunciar features nuevas que entran con la unificación (asistente RAG operativo, dashboard ejecutivo, etc.), aprovecha — pero no mezcles demasiada novedad o se pierde el mensaje principal.

### Plantilla de seguimiento (1 semana después del envío)

> Hola equipo,
>
> Una semana ya con el CRM unificado. ¿Qué tal? ¿Algún roce? ¿Algo que echáis en falta o que funciona mejor de lo esperado?
>
> Resumen de lo que hemos visto desde mi lado:
> - Consultas más frecuentes: [rellena con datos del asistente RAG]
> - Bugs reportados / resueltos: [rellena]
> - Próximas mejoras según feedback: [rellena]
>
> Seguimos.
> Juan

---

## Referencias

- `docs/COMUNICADO_NUEVO_URL_CRM.md` — comunicado anterior (cambio Vercel → Cloudflare). Útil como referencia de tono.
- `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` — plan técnico de la unificación.
- `docs/ARQUITECTURA_PROYECTOS.md` — mapa actual de las apps Valere.
