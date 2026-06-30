# Diseño · Reestructuración del CRM (información útil, consolidada y conectada)

> **Fecha:** 2026-06-14 · **Autor:** Claude (Cowork, sesión de diseño — solo `.md`, sin tocar código)
> **Alcance:** cómo reorganizar la información y la navegación para que el CRM se *perciba* y *sea* útil.
> Responde directamente al objetivo de Juan: "usable, práctico, profesional, rápido, automatizado, conectado".
> **No ejecuta nada en Supabase.** SQL = propuestas.

---

## 0. El diagnóstico, en una frase

> El CRM **no está poco desarrollado: está poco conectado y mal presentado.** Tiene 24 features y 88 tablas, pero
> el menú expone ~30 rutas a todo el mundo, mezcla módulos rotos/vacíos con los buenos, y los datos no se enlazan
> entre sí. La sensación de "CRM a medias" viene de eso, no de falta de funcionalidad.

Tres palancas, en orden de impacto/coste:
1. **Navegación por rol** (alto impacto, bajo coste — el RBAC ya existe).
2. **Conectar los datos que no fluyen** (alto impacto, coste medio — vínculos de FK + UI).
3. **Cerrar o terminar las features huérfanas** (impacto medio, coste variable).

---

## 1. Navegación por rol, no por inventario

Hoy: ~30 entradas de menú, todas visibles para todos. La auditoría lo marca como **bloqueo de adopción** (C4):
el flujo que genera dinero (`/datos`, `/analisis`, `/propuestas-energia`, `/tracking`) ni siquiera estaba en el menú,
mientras módulos rotos sí se veían.

El RBAC ya existe (`src/core/auth/permissions.ts`, `puedeAccederRuta`, testeado). **Solo falta aplicarlo al menú y
agrupar.** Propuesta de agrupación:

| Grupo | Rutas | Roles que lo ven |
|---|---|---|
| **Comercial** | Captación · Oportunidades (kanban) · Empresas · Contactos · Propuestas | telemarketing, comercial, asesor_senior, manager, master |
| **Energía** | Datos · Análisis · Propuestas energía · Datadis · Importador | analista, asesor_senior, manager, master |
| **Operación** | Contratos · Renovaciones · Incidencias · Potencias · Fotovoltaica | asesor_senior, manager, master |
| **Agenda** | Hoy · Mis llamadas · Actividades · Calendario · Notificaciones | todos (filtrado por scope) |
| **Admin** | Usuarios · Comercializadoras · Ofertas · Tarifas · Config · Holded | manager (parcial), master |

Reglas:
- Cada rol ve **solo sus grupos**. Carolina (telemarketing) ve Comercial + Agenda; un analista ve Energía + Agenda;
  Juan (master) lo ve todo.
- **Nada de rutas muertas o módulos rotos en el menú.** Un módulo sin función (o roto) no se muestra hasta que funciona.
- El flujo feliz (dato → análisis → propuesta) debe estar a 1-2 clics y visible para quien lo usa.

> Esto es **el cambio de mayor ratio impacto/esfuerzo de todo el proyecto**. No toca backend, no toca datos: solo
> ordena lo que ya hay. Cambia por completo la percepción de "CRM a medias".

---

## 2. Consolidar el modelo de datos: que la información se conecte

La auditoría (§9) lista los datos que NO fluyen. Cada uno es un vínculo que falta:

| Dato que no fluye | Causa | Arreglo (propuesta) |
|---|---|---|
| Propuesta → ficha empresa | pestaña placeholder | `propuestas.empresa_id` + listar en ficha (doc Propuestas §1.3) |
| Propuesta → contrato | sin FK | `contratos.propuesta_id` (doc Propuestas §1.3) |
| Contrato → comercializadora | texto libre | `contratos.comercializadora_id` FK |
| Contrato → renovación | sin automatismo | trigger/cron: contrato próximo a vencer → crea `renovaciones` |
| Datadis caché → facturas | falta puente | doc Datadis §4 |
| FV producción → autoconsumo | falta cruce | doc FV §4 |
| Alta CUPS/factura/propuesta → timeline empresa | el audit_log lo registra, la UI no lo muestra | leer `audit_log` en la pestaña "Actividad reciente" |

### 2.1 Origen del consumo: una sola verdad
Todas las fuentes de consumo (manual, SIPS, Datadis, telemedida) convergen en `facturas` con columna `origen` y
**precedencia única**: `manual > telemedida > datadis > sips` (definida en docs Datadis §4 y Telemedida §4).
Una sola tabla de consumo, una sola regla. El análisis nunca tiene que adivinar de dónde viene el dato.

### 2.2 Una sola fórmula de ahorro
Hoy hay dos motores de ahorro: el `calculator` de energía y `savings_calculations` (Potencias, 41 filas).
**Dos motores = dos verdades.** Converger al `calculator`. (Doc Propuestas §4.)

### 2.3 Documentación = realidad (deuda que degrada a todos los agentes)
`CLAUDE.md` describe 22 tablas; producción tiene **88**. Los módulos potencias, FV, Datadis, Holded, captación,
telemetría **no están reflejados**. Todo agente que entra trabaja con un mapa obsoleto.
**Acción (solo docs, la puedo hacer yo en otra sesión):** regenerar la sección de schema de `CLAUDE.md` con las 88
tablas reales agrupadas por dominio. (La regeneración de *tipos TS* sí es código → agente técnico.)

---

## 3. Features huérfanas: terminar o cerrar

La auditoría (§8) lista los módulos fantasma. Decisión propuesta para cada uno:

| Feature | Estado | Decisión propuesta |
|---|---|---|
| `documentos` | BD con **108 docs**, UI parcial | **Terminar la UI** — es útil y el dato ya existe. Pestaña en ficha empresa con listado + subida (ya hay "Subir archivo") |
| Incidencias | **roto** (botón inerte), 1 fila | **Reparar** (C3 auditoría) — es operación real, no fantasma |
| `notificaciones` | API sin disparadores, 0 filas | **Conectar** a los disparadores del sprint Carolina (SLA) que ya existen |
| `renovaciones` | UI completa, 0 filas | **Conectar** a contratos (trigger de vencimiento) — §2 |
| `chat-ia` | panel sin ruta | **Decidir**: o ruta visible o borrar. (Hay además el asistente RAG que sí funciona — no confundir) |
| `/tracking` | espejo sin estados | **Fusionar** con Propuestas cuando haya estados (doc Propuestas §1.1) |
| `proposal_email_drafts` | sin UI, 0 filas | Se activa con el envío Resend (Fase 5) |
| `tareas`, `alertas`, `eventos` | sin UI | Mantener latentes; activar con la Agenda cuando toque |
| Holded | solo backend, sin UI | Mantener backend; UI admin si se necesita |

> **Principio:** un módulo o **funciona y se ve**, o **no se ve**. Nada a medias en el menú. Esto es coherente con el
> "congelar módulos nuevos" del análisis estratégico: no abrir más, sino terminar/cerrar lo abierto.

---

## 4. Higiene de datos (saneamiento)

De la auditoría y el análisis estratégico, pendiente (no urgente, requiere git/SQL → agente técnico con OK de Juan):
- **Duplicados y basura** en `empresas`: ABRASIVOS ×2, Herba ×2, registros `dzt/xfgj/prueba/carolina/empresa 1`,
  4 "DEMO MVP" mezclados con producción. Deduplicar + separar DEMO.
- **2 contratos huérfanos** preexistentes (columnas vacías, prioridad "Crítica"). Depurar.
- **7 tablas `_migration_*_map`** (decisión Juan 12/06: **NO borrar todavía**). Mantener hasta nueva orden.
- **3 tablas `*_backup_20260511`** (`fv_*`): eliminar tras verificar (decisión Juan: no borrar aún → mantener).
- Scoping inconsistente: CRM muestra 24 empresas (scope comercial) vs Potencias 75 CUPS (global). Unificar criterio de scope.

---

## 5. Orden de ejecución recomendado (encaja con el maestro y el sprint)

| Prioridad | Acción | Coste | Impacto | Toca |
|---|---|---|---|---|
| 1 | **Menú por rol + agrupación** (§1) | Bajo | **Muy alto** | Frontend (RBAC ya existe) |
| 2 | **Unificar `propuestas`** (doc Propuestas §1) | Bajo | Alto | Migración + 3 features |
| 3 | **Vínculos propuesta↔empresa↔contrato** (§2) | Medio | Alto | FK + UI ficha |
| 4 | **Terminar `documentos` + reparar Incidencias** (§3) | Medio | Medio | Frontend |
| 5 | **CLAUDE.md = 88 tablas reales** (§2.3) | Bajo | Medio (DX) | Solo docs (puedo hacerlo) |
| 6 | **Conectar notificaciones/renovaciones** (§3) | Medio | Medio | Triggers + UI |
| 7 | **Saneamiento de datos** (§4) | Medio | Medio | SQL (con OK Juan) |

Los puntos 1-4 **no dependen de las integraciones** (Datadis/telemedida/FV) — se pueden hacer en paralelo al sprint
técnico y dan adopción inmediata.

---

## 6. Mi opinión honesta

Si solo pudieras hacer **una cosa** esta semana para que el CRM se sienta útil, sería **el menú por rol (§1)**. Es
casi gratis (el RBAC ya está), no toca datos, y elimina de un plumazo la sensación de "CRM a medias" que viene de ver
20 entradas con módulos rotos. Un analista que entra y ve exactamente sus 4-5 herramientas, funcionando, percibe un
producto terminado aunque por detrás haya el mismo código.

La segunda es **conectar lo que ya existe** (§2): que una propuesta aparezca en la ficha de su empresa, que un contrato
sepa de qué propuesta nació, que el timeline muestre la actividad que el `audit_log` ya guarda. Son vínculos pequeños
con efecto desproporcionado en la sensación de "todo está conectado".

Lo que **no haría todavía** es abrir nada nuevo ni perfeccionar módulos que nadie usa. El análisis estratégico tenía
razón: el problema es de circulación y presentación, no de cantidad. La reestructuración es, sobre todo, **quitar y
conectar**, no añadir.

### Datos que me faltan
- **R1:** ¿la agrupación de menú de §1 encaja con cómo trabaja realmente cada rol? Especialmente: ¿qué ve exactamente
  Carolina y qué ve un analista? Ajústame los grupos si no cuadran.
- **R2:** ¿confirmas que puedo regenerar la sección de schema de `CLAUDE.md` (solo docs) en una próxima sesión? Es
  deuda que degrada a todos los agentes.
- **R3:** sobre los datos basura/DEMO en `empresas`: ¿los limpio (preparo el SQL para que lo ejecutes) o prefieres
  marcarlos como `es_demo=true` y filtrarlos en la UI sin borrar?

---

*Fuentes internas (verificadas en vivo 2026-06-14): Supabase `gtphkowfcuiqbvfkwjxb` (88 tablas). Base: `ANALISIS_ESTRATEGICO_2026-06-10.md` §6, `AUDITORIA_FUNCIONAL_2026-06-10.md` §8-§12, `00_MAESTRO_VALERE.md` §4.*
