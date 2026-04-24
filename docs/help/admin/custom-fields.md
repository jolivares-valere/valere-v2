---
title: Custom fields (campos personalizados)
section: admin
audience: admin
keywords: [custom, campos, personalizados, añadir, configurar, esquema, tipos, entidades]
related:
  - empresas/crear-empresa
  - oportunidades/pipeline-kanban
---

# Custom fields (campos personalizados)

## Resumen rápido
**Admin** → **Custom fields** → elige entidad (empresas u oportunidades) → define tus campos propios. Aparecen automáticamente en el formulario y en la pestaña "Campos" de la ficha.

## Qué son

Los custom fields permiten añadir campos que no vienen por defecto en el CRM, específicos de vuestra consultoría. Ejemplos:

- **Tarifa habitual** que consumís (para predecir).
- **Clasificación interna** (VIP / estándar / puntual).
- **Próximo contacto programado**.
- **Comercializadora histórica** (con la que estuvo antes).
- **Segmento interno** (decenas, centenas, grandes).

Cada custom field vive a nivel de **tipo de entidad** (ej: todos los campos de "empresas" aplican a todas las empresas). No se pueden mezclar entidades.

## Entidades soportadas

Actualmente custom fields están disponibles para:

- **Empresas** — campos extra en la ficha de empresa.
- **Oportunidades** — campos extra en la ficha de oportunidad.

FASE 28 ya implementó esto. Próxima fase puede ampliar a contratos, contactos, etc.

## Paso a paso — crear un custom field

1. Menú → **Admin** (solo visible para rol `master` o `manager`).
2. Pestaña **Custom fields**.
3. Elige la entidad (**Empresas** u **Oportunidades**).
4. Pulsa **+ Nuevo campo**.
5. Rellena:
   - **Nombre legible** (label que verán los usuarios): "Tarifa habitual".
   - **Slug** (identificador interno): se auto-genera desde el nombre (`tarifa_habitual`). Puedes editarlo pero sin espacios.
   - **Tipo**:
     - `text` — texto libre corto.
     - `textarea` — texto libre largo.
     - `number` — número.
     - `date` — fecha.
     - `boolean` — sí/no.
     - `select` — desplegable con opciones predefinidas.
     - `multiselect` — selección múltiple.
   - **Opciones** (solo para select/multiselect): lista de valores posibles.
   - **Placeholder / help text**: texto de ayuda visible.
   - **Obligatorio**: si el campo es obligatorio al rellenar la entidad.
   - **Orden**: número para ordenar cuando hay varios (los de menor número salen primero).
6. **Guardar**.

## Dónde aparecen los custom fields

- **Formulario de creación/edición** de la entidad: pestaña adicional "Campos personalizados" o al final del formulario estándar.
- **Ficha de la entidad**: pestaña "Campos".
- **Filtros y búsqueda**: algunos tipos permiten filtrar el listado (ej: select).
- **Exports CSV**: se incluyen como columnas adicionales.

## Buenas prácticas

- **Empieza con pocos campos**: 3-5 por entidad es suficiente. Más satura la UI.
- **Usa select en lugar de text libre**: cuando sea posible (clasificaciones). Evita tener "Premium", "premium", "PREMIUM" como valores distintos.
- **Renombra con cuidado**: cambiar el slug rompe filtros y queries guardadas.
- **Slug descriptivo**: `proxima_revision_anual` mejor que `campo1`.
- **Opcionales por defecto**: marca obligatorio solo si de verdad lo necesitas — sino bloqueas la creación de entidades.

## Eliminar un custom field

⚠️ **Destructivo**: eliminar un campo borra también todos los valores guardados en esas entidades.

1. Admin → Custom fields.
2. Click en el campo → **Eliminar**.
3. Confirma.
4. Hecho.

Si no quieres borrar pero dejar de usar: marca como **inactivo** (aparecerá oculto pero los valores se conservan).

## Errores frecuentes

- **"Slug ya existe"**: ya hay otro campo con ese identificador. Cambia.
- **"Opciones vacías" (en select)**: añade al menos 2 opciones.
- **"Campo ya en uso" (al intentar borrar)**: el sistema tiene protección contra borrado si hay valores. Primero marca inactivo.

## Preguntas relacionadas

- ¿Cómo ordenar los custom fields en la ficha?
- ¿Los custom fields aparecen en el dashboard?
- ¿Puedo hacer custom fields condicionales (que solo aparezcan si otro tiene cierto valor)?
- ¿Se exportan los custom fields al CSV de empresas?
