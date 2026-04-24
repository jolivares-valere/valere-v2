# 📚 `docs/help/` — Documentación de ayuda del CRM Valere

Esta carpeta es la **fuente única de verdad** de la documentación que consumen los compañeros de Valere a través del asistente del CRM. El pipeline de embeddings (`.github/workflows/regenerate-help-embeddings.yml`) convierte estos `.md` en vectores que el widget RAG consulta en tiempo real.

## Estructura

```
docs/help/
├── README.md                            # este índice
├── empezando/
│   └── primer-acceso.md                 # cómo entrar al CRM por primera vez
├── empresas/
│   ├── crear-empresa.md                 # alta de empresa
│   └── importar-csv.md                  # alta masiva desde CSV
├── oportunidades/
│   └── pipeline-kanban.md               # uso del kanban de oportunidades
├── actividades/
│   └── registrar-actividad.md           # crear llamadas/reuniones/tareas
├── contactos/
├── contratos/
├── calendario/
├── incidencias-y-renovaciones/
├── documentos/
├── notificaciones/
├── informes/
└── faqs/
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

## Estado actual

- **Docs escritos**: 5 piloto (primer-acceso, crear-empresa, importar-csv, pipeline-kanban, registrar-actividad).
- **Pipeline embeddings**: pendiente de implementar (Fase 2 del plan).
- **Widget RAG**: pendiente de implementar (Fase 4 del plan).

Ver `docs/PLAN_ASISTENTE_RAG_CRM.md` para el plan completo de implementación.
