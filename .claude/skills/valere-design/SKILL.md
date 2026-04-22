# Skill: valere-design

Agente de diseño para Valere CRM v2.
Analiza la UI actual, aplica el branding corporativo de Valere Consultores y genera tokens + componentes consistentes.

## Contexto de branding Valere Consultores

**Empresa:** Valere Consultores — consultora energética española
**Tono de marca:** Profesional, moderno, confiable. Energía + tecnología.
**Drive con logos y assets:** https://drive.google.com/drive/folders/1JxJR7w2iuHnGJZXg4EQXr82r9g1-FoJe
**Drive empresa (output):** https://drive.google.com/drive/folders/1wZBFZuhACbDKMndJWo4S1EJLbQp8PrvN

## Tokens actuales del proyecto (src/index.css)

El proyecto ya tiene tokens `valere-*` definidos en Tailwind. Esta skill los extiende/corrige.
Tokens existentes:
- `valere-blue-dark`, `valere-blue-medium` — azul corporativo principal
- `valere-green-dark`, `valere-green-medium` — verde energía
- `valere-ink` — texto principal oscuro

## Problema de diseño documentado (DESIGN_REVIEW_2026-04-20.md)

Las features del CRM original usan `rounded-md` y las de la Calculadora usan `rounded-xl/2xl`.
La unificación aprobada es: **rounded-xl como estándar en todo el proyecto**.

## Instrucciones de uso

Cuando se invoque esta skill para un análisis de diseño:

### PASO 1 — Recopilar estado actual
- Leer `src/index.css` para ver tokens actuales
- Leer `docs/DESIGN_REVIEW_2026-04-20.md` para ver issues documentados
- Si hay acceso a Claude in Chrome: navegar a http://localhost:3000 y tomar screenshots de las pantallas principales

### PASO 2 — Analizar branding
- Acceder al Drive de logos: https://drive.google.com/drive/folders/1JxJR7w2iuHnGJZXg4EQXr82r9g1-FoJe
- Extraer: paleta de colores exacta (hex), tipografía usada, estilo de componentes

### PASO 3 — Generar especificación de tokens
Crear `docs/DESIGN_TOKENS_<fecha>.md` con:
```
## Colores
--color-primary: #XXXXXX     (azul Valere principal)
--color-primary-dark: #XXXXXX
--color-accent: #XXXXXX      (verde energía)
--color-surface: #XXXXXX     (fondo cards)
--color-text: #XXXXXX        (texto principal)
--color-text-muted: #XXXXXX  (texto secundario)

## Tipografía
--font-display: 'XXXX', sans-serif   (títulos)
--font-body: 'XXXX', sans-serif      (cuerpo)

## Espaciado y bordes
--radius-base: 0.75rem   (rounded-xl)
--shadow-card: ...
```

### PASO 4 — Generar componente de referencia HTML
Crear `docs/design-reference.html` — página HTML autocontenida con:
- Paleta de colores visual
- Tipografías
- Botones (primary, secondary, danger)
- Cards
- Badges de estado
- Formularios
- Tablas
Todo con los tokens de Valere aplicados.

### PASO 5 — Lista de cambios en código
Generar en el informe la lista exacta de archivos y cambios a hacer:
```
src/index.css              → actualizar tokens CSS
src/core/components/       → ajustar StatusBadge, StatCard, EmptyState
src/features/empresas/     → migrar rounded-md → rounded-xl
...
```

### PASO 6 — Output final
- Informe en `docs/DESIGN_TOKENS_<fecha>.md`
- Referencia HTML en `docs/design-reference.html`
- Lista de PRs a crear para implementar (el Agente Features implementa, no este agente)

## Regla crítica

Este agente ANALIZA y ESPECIFICA. No hace commits al repositorio.
Los cambios los implementa el Agente Cowork/Features (Claude Code o Cowork).
