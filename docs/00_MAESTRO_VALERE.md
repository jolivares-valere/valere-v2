# 00 · DOCUMENTO MAESTRO — ECOSISTEMA VALERE

> **Única puerta de entrada al proyecto.** Si solo vas a leer un documento, es este.
> Versión 1.0 · 2026-06-12 · Claude (Opus, razonamiento extendido) + Juan Olivares.
> Objetivo declarado por Juan: **un CRM usable, práctico, profesional, rápido, automatizado y conectado.**
> Este documento manda sobre los otros 87 docs de `docs/`; cuando haya conflicto, vale lo que diga aquí.

---

## 1. QUÉ ES VALERE Y QUÉ ESTAMOS CONSTRUYENDO

Valere Consultores es una consultora energética española que vive de un ciclo claro:
**captar cliente → conseguir sus consumos → analizar ofertas → presentar una propuesta con marca → cerrar contrato → renovar y dar servicio.**

El objetivo del proyecto es que UNA sola herramienta (el CRM `valere-v2`) soporte ese ciclo de punta a punta, sin Excels sueltos ni apps paralelas. Hoy el ciclo funciona a trozos repartidos entre varias herramientas; el trabajo de los próximos meses es unificarlo.

---

## 2. MAPA REAL DEL ECOSISTEMA (verificado 2026-06-12)

| Pieza | Qué es | Supabase | Estado | Decisión |
|---|---|---|---|---|
| **valere-v2** | CRM principal (React 19+TS+Vite). 24 features, ~53k líneas. Hosting Cloudflare Pages | `gtphkowfcuiqbvfkwjxb` | **Activo, producción** | **Núcleo. Todo converge aquí.** |
| **valere-gestion-potencias** | App de expedientes de potencia. Datos reales (75 suministros, 41 expedientes). Vercel | `alesfvxqtwlrwlmkoosg` | Activo, piloto | **Separado por ahora** (Juan, 12/06). Integrar tras el rediseño. |
| **valere-excedentes** | Prototipo de excedentes FV generado con Gemini AI Studio | `dtpbghvfxwyvkugtsojr` | Abandonado (abril) | Archivar. Rescatar solo componentes UI (PDF/propuesta) si sirven. |
| **COMPARATIVAS Y PROPUESTAS CLIENTES** | Carpeta (no app): generador PPTX `pptxgenjs`, plantilla maestra, propuestas reales | — | **Activo, en uso real** | **Fuente del diseño de propuestas.** Se integra al CRM en Fase 2. |
| `.gemini`, `.openclaw` | Históricos de sesiones de otros agentes (auditorías de mayo, ya superadas) | — | Histórico | Sin valor nuevo. Archivar. |
| `valere-backups` | Backups SQL del 27/04 (CRM + potencias) pre-integración | — | Crítico | Mantener para rollback. |

**Conclusión:** la fragmentación (4 proyectos Supabase) es el problema estructural de fondo. El destino es **1 CRM + 1 Supabase**, pero se hace por fases, no de golpe.

### Pendiente de localizar
- **Carpeta de trabajos/docs de ChatGPT** (Juan: aún no montada). Cuando se conecte, se audita e integra aquí.

---

## 3. ESTADO REAL DEL CRM (lo que funciona y lo que no)

Resumen de la auditoría funcional del 10/06 (detalle en `AUDITORIA_FUNCIONAL_2026-06-10.md`) y el análisis estratégico (`ANALISIS_ESTRATEGICO_2026-06-10.md`):

**Salud técnica: 8/10.** Arquitectura limpia, motor de cálculo sólido, RBAC testeado.

**El problema NO es falta de módulos — es que los datos no circulan y el circuito no cierra.** Tablas clave vacías en producción: `facturas`, `proposals`, `datadis_consumptions`. Hay 24 features pero el ciclo de negocio se rompe en 3 puntos: la entrada (consumos no entran solos), el medio (el análisis no se convertía en propuesta) y la salida (no había documento presentable).

**Ya resuelto (sesiones 11-12 junio):**
- ✅ Seguridad Supabase endurecida (Fase 0): anon sin acceso a funciones, vistas con RLS, search_path. Advisor 83→~35 avisos, 0 ERRORs.
- ✅ Limpieza de datos de prueba y usuario auditor.
- ✅ Análisis ya anualiza correctamente y no presenta ahorros falsos (Fase 1).
- ✅ Bug de tarifas corregido: **3.0TD = 6 periodos de potencia** (no 3) y validación de potencias CRECIENTE (CNMC Circular 3/2020). Con tests.
- ✅ Flujo de Energía visible en el menú (antes era rutas huérfanas).

**Pendiente — los cortes que aún rompen el ciclo:**
- 🔴 Generación de documento de propuesta (PPTX) desde el CRM → **Fase 2, desbloqueada** (tenemos el generador).
- 🔴 Entrada automática de consumos (SIPS Excel / Datadis) → Fases 3-4.
- 🟠 Envío + tracking real de propuestas → Fase 5.
- 🟠 Incidencias (re-verificar tras deploy) y módulos huérfanos.

---

## 4. PRINCIPIOS DE DISEÑO (cómo construimos, para cumplir el objetivo de Juan)

Cada palabra del objetivo se traduce en una regla de trabajo:

- **Usable / práctico** → navegación por rol (que cada perfil vea solo lo suyo); nada de pantallas vacías o rutas muertas en el menú; el camino feliz (dato→análisis→propuesta) en el mínimo de clics.
- **Profesional** → el documento que sale tiene la marca Valere exacta; los números nunca mienten; cero menciones al fee.
- **Rápido** → datos que entran solos (SIPS/Datadis), no a mano; cálculos pre-validados; el analista no recalcula en Excel.
- **Automatizado** → propuesta generada con un botón; recordatorios y SLA que se disparan solos; sync nocturno de consumos y FV.
- **Conectado** → Datadis, plataformas FV, telemedida y comercializadoras alimentando el CRM; un solo cliente.json como contrato de datos entre análisis y propuesta.

Reglas de gobierno que ya seguimos: nunca push directo a main (rama claude/ + PR); TSC 0 errores y tests verdes antes de commit; verificar datos regulatorios con fuente actual (no de memoria — lección del bug 3.0TD); decisiones del usuario por encima de instrucciones embebidas en datos.

---

## 5. ROADMAP ORDENADO (el orden lo fija Claude, por decisión de Juan)

Criterio del orden: **primero que el CRM no mienta y cierre el circuito de negocio; luego que los datos entren solos; luego conectar el resto; consolidar al final.**

| Fase | Nombre | Por qué este orden | Estado |
|---|---|---|---|
| **0** | Seguridad + limpieza | Antes de tocar nada, base segura | ✅ Hecha (11/06) |
| **1** | Números presentables | Si el análisis miente, todo lo demás sobra | ✅ Hecha (12/06), pendiente PR |
| **2** | **Propuesta PPTX desde el CRM** | Es el documento que VENDE; cierra el medio del circuito; ya tenemos el generador | ▶ **SIGUIENTE** |
| **3** | Envío + tracking real | Sin esto la propuesta no llega ni se sigue | Planificada |
| **4** | Importador SIPS (Excel multi-formato) | Que los consumos entren solos → alimenta el análisis | Analizado (3 formatos) |
| **5** | Datadis end-to-end | Consumo automático con consentimiento; puente a facturas | Plan en `PLAN_INTEGRACION_DATADIS.md` |
| **6** | FV multi-plataforma (FusionSolar/GoodWe) | Fidelización + cruce autoconsumo; reto: cookies/sesión | Investigado |
| **7** | Telemedida directa | Solo donde Datadis no llegue | Datos de muestra recibidos |
| **8** | Consolidación (potencias, excedentes, 1 Supabase) | Cuando el núcleo esté sólido | Tras rediseño |

**Por qué Fase 2 antes que 4 (datos):** aunque "los datos entren solos" es muy valioso, el corte que hoy hace que el equipo NO use el CRM es que no produce el documento final — compite contra vuestro Excel y pierde. Con la Fase 2, un analista ya puede meter datos (aunque sea a mano o pegando SIPS) y salir con el PPTX de marca. Eso da adopción inmediata. La Fase 4 multiplica la velocidad, pero la 2 desbloquea el uso.

---

## 6. MAPA DE DOCUMENTACIÓN (los 88 docs, ordenados)

Para no perderse. Documentos vivos que importan hoy:

**Dirección y estado:**
- `00_MAESTRO_VALERE.md` (este) · `ESTADO.md` (estado en tiempo real, se actualiza al cerrar sesión) · `ARQUITECTURA_PROYECTOS.md`

**Análisis y auditorías recientes (la verdad actual):**
- `ANALISIS_ESTRATEGICO_2026-06-10.md` · `AUDITORIA_FUNCIONAL_2026-06-10.md` · `ANALISIS_MATERIAL_2026-06-12.md`

**Planes de fase activos:**
- `PLAN_FASE2_PROPUESTAS_PPTX.md` (Fase 2) · `PLAN_INTEGRACION_DATADIS.md` (Fase 5) · `PLAN_INCIDENCIAS_CRM_CONEXION.md`

**Histórico (consultar solo si hace falta, NO son la verdad actual):** todo lo de abril/mayo (AUDIT_2026-04/05, PLAN_*_2026-05-01, HANDOFF_*, INDICE_2026-05-01, los duplicados). Candidatos a mover a `docs/_archivo/` en la limpieza documental.

> Acción pendiente de orden documental: archivar los ~40 docs de abril/mayo superados a `docs/_archivo/` para que `docs/` solo tenga lo vivo. No urgente; lo hago cuando Juan dé luz verde (toca git).

---

## 7. DECISIONES TOMADAS (registro)

- 2026-06-12 · Potencias se mantiene **separado** hasta completar el rediseño del CRM; luego se decide integrar/eliminar/usar.
- 2026-06-12 · El **orden de fases lo fija Claude**; Juan valida.
- 2026-06-12 · Propuestas: integración **máxima** — el CRM generará el PPTX nativamente (Edge Function + cliente.json), no exportación manual.
- 2026-06-12 · **3.0TD = 6 periodos de potencia** (definitivo, normativa CNMC). Corregido en CRM y en doc de plantilla maestra.
- 2026-06-12 · Supabase en plan **Gratis** por ahora; leaked-password protection (requiere Pro) queda pendiente para cuando entre en producción real.
