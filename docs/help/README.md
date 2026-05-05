# 📚 `docs/help/` — Documentación de ayuda del CRM Valere

Esta carpeta es la **fuente única de verdad** de la documentación que consumen los compañeros de Valere a través del asistente del CRM. El pipeline de embeddings (`.github/workflows/regenerate-help-embeddings.yml`) convierte estos `.md` en vectores que el widget RAG consulta en tiempo real.

## Estructura

```
docs/help/
├── README.md                            # este índice
├── AUTH-SIGNUP-Y-APROBACION.md          # alta de usuarios y aprobación admin
│
├── empezando/
│   └── primer-acceso.md                 # cómo entrar al CRM por primera vez
│
├── permisos/
│   └── que-ve-cada-funcion.md           # qué módulos ve cada rol/función
│
├── captacion/                           # Carolina Aroca (telemarketing)
│   ├── crear-lead.md                    # alta rápida de lead
│   ├── pedir-factura.md                 # llamar y registrar resultado
│   ├── subir-factura.md                 # cliente envía factura → upload
│   ├── pasar-a-analisis.md              # handoff a Carolina M
│   ├── enviar-propuesta.md              # marcar propuesta enviada al cliente
│   └── cerrar-caso.md                   # ganada / perdida / visita / programar
│
├── analisis-captacion/                  # Carolina Maciñeiras (analista)
│   ├── recibir-caso.md                  # qué hacer al recibir factura
│   ├── empezar-analisis.md              # estándar vs senior — cómo decidir
│   └── subir-propuesta.md               # subir propuesta + handoff vuelta
│
├── cartera-senior/                      # Antonio / Juan (asesor senior)
│   └── preparar-y-subir-propuesta-senior.md
│
├── empresas/
│   ├── crear-empresa.md
│   ├── importar-csv.md
│   └── anadir-contacto-a-empresa.md
│
├── contactos/
│   └── crear-contacto.md
│
├── oportunidades/
│   ├── pipeline-kanban.md               # NOTA: legacy /oportunidades; el flujo
│   ├── estados-y-etapas.md              # nuevo es Captación + bandejas multi-rol
│   └── crear-oportunidad.md
│
├── actividades/
│   ├── registrar-actividad.md
│   └── configurar-recordatorio.md
│
├── calendario/
│   └── ver-agenda.md
│
├── contratos/
│   ├── crear-contrato.md
│   └── gestionar-contratos.md
│
├── cups/
│   └── crear-cups.md
│
├── dashboard/
│   └── interpretar-dashboard.md
│
├── datos/
│   └── captura-facturas.md              # módulo Calculadora (energía)
│
├── analisis/
│   └── comparativo-ofertas.md           # módulo Calculadora
│
├── propuestas-energia/
│   └── generar-propuesta.md             # módulo Calculadora
│
├── documentos/
│   └── subir-documento.md
│
├── incidencias/
│   └── registrar-incidencia.md
│
├── renovaciones/
│   └── gestionar-renovaciones.md
│
├── informes/
│   └── generar-informes.md
│
├── notificaciones/
│   └── gestionar-notificaciones.md
│
├── admin/
│   ├── custom-fields.md
│   └── gestionar-usuarios.md
│
└── potencias/
    └── README.md                        # módulo Potencias (otra app interna)
```

## Convenciones de cada `.md`

Cada documento DEBE empezar con frontmatter YAML con estos campos obligatorios:

```yaml
---
title: Título corto y descriptivo
section: empresas              # obligatorio — corresponde al primer nivel de ruta (/empresas)
audience: todos                # todos | comerciales | admin | master
keywords: [empresa, cliente, alta, nuevo]
related:                       # rutas relativas a otros docs relacionados
  - empresas/importar-csv
  - contactos/asociar-contacto
---
```

Y seguir esta estructura de contenido:

```markdown
# Título

## Resumen rápido
1-2 líneas con la respuesta directa a la pregunta más común sobre el tema.

## Paso a paso
1. Primer paso.
2. Segundo paso.
3. Etc.

## Errores frecuentes
- **"Mensaje de error exacto"**: qué significa y cómo solucionarlo.

## Preguntas relacionadas
- Pregunta 1
- Pregunta 2
```

**Por qué estas convenciones**:

- **Frontmatter** permite al RAG filtrar por `section` (la UI detecta automáticamente en qué página está el usuario y filtra).
- **Resumen rápido** se prioriza para respuestas cortas del bot.
- **Paso a paso** se cita literalmente cuando alguien pregunta "cómo X".
- **Errores frecuentes** suelen ser las consultas más comunes — el bot los encuentra rápido.
- **Preguntas relacionadas** alimentan sugerencias contextuales en el widget.

## Cómo añadir un doc nuevo

1. Crear el `.md` en la subcarpeta correspondiente (`docs/help/<section>/<nombre>.md`).
2. Rellenar el frontmatter y la estructura estándar.
3. Commit + push a una rama + PR a `main`.
4. Cuando se mergea a `main`, la GitHub Action `regenerate-help-embeddings` detecta el cambio y regenera los embeddings automáticamente.
5. El widget del CRM ya puede responder preguntas sobre ese doc.

## Cómo editar un doc existente

Igual que el punto anterior. El pipeline detecta cambios en cualquier archivo bajo `docs/help/**` y regenera solo lo afectado.

## Qué NO hacer

- **NO meter secrets ni credenciales** en estos docs — se suben a embeddings y potencialmente a los logs del bot.
- **NO asumir conocimiento técnico** del usuario. Son compañeros de Valere (consultores energéticos), no desarrolladores. Evitar jerga técnica (React, Supabase, RLS, etc.) salvo que sea imprescindible.
- **NO usar capturas de pantalla pesadas** — los embeddings solo procesan texto. Si es imprescindible mostrar la UI, usar descripción textual + link a imagen en Drive.

## Estado actual (2026-05-04)

- **Docs escritos**: 38 documentos organizados por módulo + Sprint Operativo Captación completo (10 docs nuevos: 6 captación + 3 análisis + 1 senior + permisos).
- **Pipeline embeddings**: implementado (`.github/workflows/regenerate-help-embeddings.yml`). Se dispara con cualquier cambio bajo `docs/help/**`.
- **Widget RAG**: implementado en `src/features/asistente-crm/AsistentePanel.tsx`, accesible desde todas las páginas del CRM.

## Convención de formato (validada con ChatGPT 2026-05-04)

Cada doc operativo del flujo nuevo (Sprint Captación) sigue este formato:

```
CUÁNDO USAR    — escenario concreto
QUÉ HACE       — qué consigue la acción
PASOS          — 3 a 5 pasos numerados
QUÉ DEBE PASAR — resultado esperado en pantalla
SI FALLA       — errores típicos y cómo resolverlos
```

Cortos (15-25 líneas), accionables, sin teoría. La ayuda no es manual: es respuesta inmediata a la pregunta "estoy aquí, qué hago".

Los docs antiguos (módulos legacy CRM Comercial / Calculadora) usan el formato anterior (Resumen rápido / Paso a paso / Errores frecuentes / Preguntas relacionadas) — están bien, no los reescribimos.

Ver `docs/PLAN_ASISTENTE_RAG_CRM.md` para arquitectura completa del asistente.
