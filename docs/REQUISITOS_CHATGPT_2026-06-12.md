# Requisitos rescatados del contexto de ChatGPT — 2026-06-12

> Origen: extracción de Claude Browser sobre el proyecto "CRM VALERE CONSULTORES V2" en ChatGPT (12/06/2026).
> **Cómo leer este documento:** es una fuente de REQUISITOS y de intención de negocio, NO una descripción fiable del código.
> La verdad del código es siempre el repo verificado (`00_MAESTRO_VALERE.md`). Aquí se marca qué coincide y qué diverge.

---

## 1. Aviso de fiabilidad — qué creer y qué no

El documento de ChatGPT mezcla planes con estado real. Discrepancias detectadas frente al repo `valere-v2`:

| ChatGPT dice | Repo real (`valere-v2`) | Veredicto |
|---|---|---|
| Stack **Next.js** | **Vite + React Router** | ChatGPT desactualizado. Vale el repo. |
| Tablas `clientes`, `instalaciones_fv`, `comparativas`, `propuestas_comerciales`, `leads`, `proximas_llamadas` | `empresas`, `cups`, `fv_planta`, `proposals`/`propuestas`, `oportunidades` | Nomenclatura de ChatGPT NO coincide. Vale el repo. |
| Hosting **Vercel** | **Cloudflare Pages** (migrado 2026-04-24) | ChatGPT desactualizado. |

**Conclusión:** se toman de ChatGPT los REQUISITOS DE NEGOCIO (qué debe hacer), no los nombres técnicos. Antes de codificar cualquier cosa de aquí, verificar el repo.

---

## 2. LO MÁS VALIOSO — Módulo de potencia y maxímetros (enriquece el diseño de propuesta)

Esto NO estaba en nuestro diseño base y es un diferenciador comercial real. Debe incorporarse al `DISENO_BASE_PROPUESTA_VALERE.md` como sección/módulo.

### 2.1 Datos a guardar por cada oferta (término de potencia)
- TP P1–P6 en €/kW·año.
- Si el TP está a coste regulado BOE o incluye margen comercial.
- Margen estimado de potencia por periodo.
- Estrategia de la comercializadora: `coste_boe` / `margen_bajo` / `margen_alto` / `desconocido`.
- Condiciones sobre modificación de potencia (penalizaciones, ventanas).

### 2.2 Reglas de negocio para el análisis de potencia
- **No** recomendar bajada de potencia si hay excesos recientes.
- **No** recomendar cambios cuyo ahorro sea < 200 €/año.
- Indicar **siempre** el nivel de confianza y el riesgo de la recomendación.

### 2.3 Sección PDF obligatoria: "Análisis del coste de potencia y optimización de potencias contratadas"
Debe mostrar, por suministro:
- Potencia actual contratada (P1–P6).
- Maxímetro máximo registrado.
- Percentil p95 de la demanda.
- Potencia recomendada.
- Ahorro anual estimado por el ajuste.
- Riesgo de exceso.
- Confianza del análisis.

> Encaja con el módulo `M-POT` ya previsto en el diseño (RD-ley 7/2026) — esto lo concreta con métricas exactas (maxímetro/p95/confianza) que antes no teníamos.

---

## 3. Comparativa energética — los 8 componentes OBLIGATORIOS

Confirma y amplía nuestro motor. La comparativa NO es solo término de energía; debe cubrir:
1. Término de energía por periodo (P1–P6).
2. Término de potencia por periodo.
3. RRTT / servicios de ajuste (SSAA): incluidos / no incluidos / parciales.
4. Fee Valere configurable por operación (interno, nunca visible).
5. Excesos de potencia (si hay datos).
6. Energía reactiva (si aparece en factura/SIPS).
7. Condiciones contractuales: permanencia, pago, avales, revisión regulatoria, multipunto.
8. Optimización de potencias con maxímetros mensuales (§2).

El informe al cliente debe demostrar: cuánto paga por energía, cuánto por potencia, el margen oculto de cada comercializadora, los riesgos de cada oferta, el ahorro adicional por ajuste de potencias, y por qué Valere aporta más valor.

**Fases (de ChatGPT, coherentes con nuestro roadmap):**
- **Fase 1 (construir primero):** carga manual/Excel/PDF de tarifas con confirmación visual · comparación TE+TP+RRTT+fee · carga de consumos por periodos · informe PDF con diseño Valere · análisis básico de potencia con maxímetros.
- **Fase 2 (tras validar en uso real):** ESIOS para RRTT automáticos · DATADIS para consumos · envío automático por email · seguimiento post-firma · comparativa real vs simulada.

---

## 4. FV / telemedida — diagnóstico ya cerrado (ahorra trabajo)

- **4 plataformas de telemedida FV:** FusionSolar (Huawei, principal), Telegest, Linkener, CGNET.
- **FusionSolar histórico — DECISIÓN TOMADA:** el endpoint `day-real-kpi` histórico está bloqueado por WAF (HTTP 503 consistente) desde automatización headless, aunque la sesión sea válida. **NO seguir invirtiendo en headless.** Solución adoptada: sync incremental diario (crece solo) + **importador CSV manual** para retrocarga puntual.
- `station-list` es la fuente estable para realtime (HTTP 200 OK).
- Guard anti-contaminación en `fv_kpi_diario` (ignora filas de 0.000 kWh falsas del WAF). 17 filas corruptas ya eliminadas (commit 63a8abf).

> Conecta con lo que ya vimos del bloqueo de cookies de FusionSolar. La vía es importador CSV, no scraping del histórico.

---

## 5. Pendientes operativos que confirma ChatGPT (cruzar con ESTADO.md)
- Migración SQL **fase28.6** pendiente de aplicar en prod (con backup previo).
- Regenerar tipos Supabase y eliminar `as any` restantes.
- **Pipeline Visalia:** ejecutar `dry_run=true` y revisar ANTES de escribir en `comercializadora_ofertas`.
- Importador CSV FusionSolar histórico → `fv_kpi_diario` (pendiente diseñar).
- Endurecimiento seguridad FV: segregar secretos fuera del repo, auditar RLS, revisar Edge Functions.

---

## 6. Agentes IA configurados en ChatGPT (referencia)
- **"VALERE — Auditor de Uso CRM"** (`agt_6a29062a...`): el que intentó la auditoría funcional (sin navegador). Su trabajo lo cubrió la auditoría que hicimos en navegador (`AUDITORIA_FUNCIONAL_2026-06-10.md`).
- **"VALERE — Triaje de Correo Profesional"** (`agt_6a22d3f1...`): clasifica emails entrantes por prioridad, integrado con Gmail vía Slack. Funcionalidad potencialmente útil para el CRM (triaje → crear tarea/actividad), futuro.

Principios de los agentes (alineados con nuestras reglas): identificarse como IA, no decisiones críticas sin validación humana, registrar todo, separar pruebas/producción.

---

## 7. Acciones derivadas (para integrar en el roadmap del maestro)
1. **Añadir el módulo de maxímetros (§2) al `DISENO_BASE_PROPUESTA_VALERE.md`** — métricas exactas para la sección de optimización de potencias. Alta prioridad: es diferenciador comercial.
2. Ampliar el motor de comparativa para cubrir los 8 componentes (§3) — reactiva y excesos no están aún.
3. Importador CSV FusionSolar histórico (§4) — nuevo, encaja en Fase 6 (FV).
4. Cruzar pendientes (§5) con `ESTADO.md`: Visalia dry_run y fase28.6 ya estaban registrados; coinciden.

> Estos requisitos se reflejan en `00_MAESTRO_VALERE.md`. La nomenclatura técnica de ChatGPT NO se adopta; se usa la del repo.
