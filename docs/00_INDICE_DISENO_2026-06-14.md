# Índice · Diseño estratégico y de integraciones — 2026-06-14

> **Sesión Cowork de análisis y diseño (solo `.md`, sin tocar código).** Profundiza el diseño de las integraciones
> y la reestructuración del CRM, partiendo del material ya existente (maestro, análisis 10/06, auditoría funcional,
> diseño LOWFIT, requisitos ChatGPT, sprint 7d, blueprint Datadis). **No duplica:** los presupone y construye lo que faltaba.
> Profundidad: **listo-para-construir** (esquemas SQL propuestos, contratos de datos, pseudocódigo de Edge Functions).
> Todo el SQL es **propuesta** — no se ha ejecutado nada en Supabase.

## Documentos de esta tanda

| Doc | Qué cubre | Para quién |
|---|---|---|
| [`DISENO_DATADIS_PUENTE_2026-06-14.md`](DISENO_DATADIS_PUENTE_2026-06-14.md) | Consentimiento de terceros, sync cron, **puente `datadis_consumptions`→`facturas`**, cobertura de dato | Agente técnico (Fase 5) |
| [`DISENO_TELEMEDIDA_2026-06-14.md`](DISENO_TELEMEDIDA_2026-06-14.md) | Colector por pasarela (Telegest/Linkener/CGNET), tabla `curvas_carga`, `telemetry-ingest`, maxímetros | Agente técnico (Fase 7) |
| [`DISENO_FV_MULTIPLATAFORMA_2026-06-14.md`](DISENO_FV_MULTIPLATAFORMA_2026-06-14.md) | Interfaz `FVAdapter`, adaptadores FusionSolar/GoodWe/SolarEdge, **cruce autoconsumo FV×Datadis×pool** | Agente técnico (Fase 6) |
| [`DISENO_MODULO_PROPUESTAS_2026-06-14.md`](DISENO_MODULO_PROPUESTAS_2026-06-14.md) | Unificar `propuestas`, contrato `cliente.json` completo, 8 componentes, optimización de potencia | Agente técnico (Fase 2 + motor) |
| [`DISENO_REESTRUCTURACION_CRM_2026-06-14.md`](DISENO_REESTRUCTURACION_CRM_2026-06-14.md) | **Menú por rol**, vínculos de datos, features huérfanas, higiene de datos | Agente técnico + diseño |

## Hilo conductor (cómo encajan)

```
ENTRADA de consumo (3 docs convergen en `facturas` con `origen`)
  Datadis  ─┐
  Telemedida├─→ facturas(origen, periodo_dias) ──→ /analisis (sin teclear, sin mentir)
  SIPS/man ─┘                                            │
FV (genera) ──→ cruce autoconsumo ──────────────────────┤
                                                         ▼
                                              MÓDULO PROPUESTAS
                                              cliente.json → PPTX LOWFIT
                                                         │
REESTRUCTURACIÓN (transversal): menú por rol · vínculos propuesta↔empresa↔contrato · una sola verdad de consumo y de ahorro
```

## Prioridad recomendada (mi opinión, alineada con el maestro)

1. **Menú por rol** (reestructuración §1) — casi gratis, cambia la percepción del producto. *No depende de nada.*
2. **Unificar `propuestas`** — gratis hoy (0 filas), carísimo en 3 meses.
3. **Generador PPTX (Fase 2)** — el diseño LOWFIT ya está cerrado; sale con datos pegados a mano.
4. **Puente Datadis** — mejor coste/beneficio de las integraciones; la técnica ya está hecha.
5. FV (cruce autoconsumo con lo que ya hay) → SolarEdge/GoodWe → Telemedida (la última, Datadis la cubre casi toda).

## Decisiones pendientes de Juan (consolidadas de los 5 docs)

**Bloqueantes de integración:**
- Datadis **D1**: ¿cuenta de empresa Valere en datadis.es para autorizaciones de terceros? (prerequisito Fase 5)
- Telemedida **T1**: de Telegest/Linkener/CGNET, ¿cuál tiene API REST y cuáles solo CSV/FTP/email?
- FV **F1/F2**: ¿qué plataformas FV tienen los clientes? ¿cuenta de organización SEMS de GoodWe?

**Bloqueantes de propuesta:**
- Propuestas **P2**: subir el **logo horizontal oficial** a carpeta conectada (sin él, el PPTX sale con logo incorrecto).

**De reestructuración:**
- **R1**: validar la agrupación de menú por rol (qué ve Carolina vs analista).
- **R2**: ¿OK a regenerar la sección schema de `CLAUDE.md` (22→88 tablas, solo docs)?
- **R3**: datos basura/DEMO en `empresas`: ¿borrar o marcar `es_demo` y filtrar?

(La lista completa de "datos que faltan" está al final de cada documento.)
