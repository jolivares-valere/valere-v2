---
title: Filtrar y ordenar la lista de contratos
section: contratos
audience: todos
keywords: [contratos, filtro, estado, comercializadora, chips, orden, paginación, exportar, activo, incidencia, dashboard, tarjetas]
related:
  - docs/help/general/pagina-no-encontrada.md
---

# Filtrar y ordenar la lista de contratos

## Qué es
La lista de Contratos se filtra con chips de **Estado** (Borrador, Trámite, Activo, Vencido, Baja, Incidencia, Cancelado) y de **Comercializadora** (una por cada compañía con contratos). Los dos filtros son **combinables**: chip *Activo* + chip *NEXUS* = contratos activos de NEXUS, con el contador arriba mostrando el total real del filtro. Las tarjetas del Dashboard («Contratos activos», «Incidencias») siguen llevando a la lista ya filtrada.

## Cómo acceder
Desde el Dashboard, pulsa la tarjeta correspondiente; o entra en `/contratos` y añade `?estado=activo` (o el estado que busques) a la dirección.

## Acciones
Un clic activa un chip; otro clic en el mismo chip lo quita. El botón **Limpiar** quita todos los filtros a la vez. Los filtros son compatibles con «Próximos a vencer».

- **Ordenar**: haz clic en los encabezados Compañía, CUPS, Fin o Estado (segundo clic invierte el sentido).
- **Paginación**: la lista va en páginas de 20 con el total real arriba (ya no se queda en las 20 primeras filas).
- **URL compartible**: filtros, orden y página viven en la dirección — cópiala y quien la abra verá la misma vista.
- **Exportar Excel**: descarga el conjunto FILTRADO completo (todas las filas del filtro, no la página visible).

## Si algo falla
Si la lista sale vacía con un filtro puesto, comprueba el chip: puede que no haya contratos en ese estado. Quita el filtro con la X para confirmar.
