---
title: Búsqueda global (encontrar empresas, contactos, contratos rápido)
section: buscador
audience: todos
keywords: [buscar, busqueda, buscador, search, global, encontrar, localizar, atajo, ctrl k, command k, lupa, barra busqueda, omnisearch, palette]
related:
  - empresas/crear-empresa
  - contactos/crear-contacto
  - contratos/gestionar-contratos
  - dashboard/interpretar-dashboard
---

# Búsqueda global

## Resumen rápido
Pulsa **Ctrl + K** (Windows/Linux) o **⌘ + K** (Mac) en cualquier página del CRM, o el icono de **lupa** 🔍 de la barra superior, escribe lo que buscas y aparecen resultados de empresas, contactos, contratos, oportunidades, CUPS y documentos. Pulsa **Enter** sobre el resultado para abrir su ficha.

## Qué se puede buscar

El buscador global cruza varias entidades a la vez:

- **Empresas**: por nombre comercial, NIF/CIF, alias.
- **Contactos**: por nombre, apellidos, email, teléfono.
- **Contratos**: por número de contrato, comercializadora, empresa asociada.
- **Oportunidades**: por título, empresa o etapa.
- **CUPS**: por código CUPS completo o parcial.
- **Documentos**: por nombre del archivo (PDF, Excel, etc.).

Las búsquedas son **insensibles a mayúsculas/minúsculas y acentos**: "muñoz" encuentra "MUÑOZ" y "munoz".

## Cómo usar

### Atajo de teclado
1. Pulsa **Ctrl+K** (Windows) o **⌘+K** (Mac) desde cualquier pantalla.
2. Se abre un modal central con el input de búsqueda.
3. Escribe **mínimo 2 caracteres** para que empiece a buscar.
4. Los resultados aparecen agrupados por tipo (Empresas, Contactos, Contratos, etc.).
5. Usa **flechas ↑/↓** para navegar y **Enter** para abrir la ficha del resultado seleccionado.
6. **Esc** cierra el modal sin abrir nada.

### Click en la lupa
1. Pulsa el icono 🔍 de la barra superior (esquina derecha).
2. Mismo modal, mismo comportamiento.

### Búsqueda inline en cada listado
Cada página de listado (Empresas, Contactos, Contratos, etc.) tiene **su propio buscador** arriba que filtra solo dentro de esa lista. Útil si ya sabes qué tipo buscas.

## Trucos

- **Buscar por NIF/CIF**: introduce los dígitos directamente, con o sin guiones — el sistema normaliza ("B12-345-678" encuentra "B12345678").
- **Buscar por dominio de email**: escribe "@empresa.es" y aparecen todos los contactos de ese dominio.
- **Buscar CUPS parciales**: los CUPS son largos (20-22 caracteres). Los últimos 4-6 dígitos suelen bastar.
- **Buscar por nombre del comercial**: si tu rol es manager o admin, escribir el nombre del comercial filtra empresas/oportunidades asignadas a esa persona.
- **Búsqueda por contacto encuentra la empresa**: si buscas "María García" y María es contacto de Empresa X, aparece tanto el contacto como la empresa.

## Filtrado por sección al abrir una respuesta

Cuando abres un resultado, el sistema te lleva a la ficha completa. Si pulsas **flecha izquierda** (←) o el botón **Atrás** del navegador, vuelves a los resultados de búsqueda — útil para abrir varios resultados sin perder la consulta.

## Búsqueda y permisos

El buscador respeta tus permisos:
- **Comerciales**: solo ven resultados de empresas/contratos asignados a ellos.
- **Managers**: ven todo lo de su equipo.
- **Master/admin**: ven todo.

Si esperas un resultado y no aparece, puede ser que la entidad esté asignada a otro comercial fuera de tu visibilidad. Pide al manager.

## Errores frecuentes

- **"No hay resultados"**: revisa la ortografía y prueba con menos caracteres (ej: "valer" en vez de "valere consultores"). El buscador hace match parcial.
- **"El buscador no se abre con Ctrl+K"**: hay extensiones del navegador (Vimium, etc.) que capturan el atajo. Usa el icono lupa o desactiva la extensión.
- **"Los resultados tardan mucho"**: el buscador es instantáneo (<1s). Si tarda, suele ser conexión lenta — recarga la página.
- **"Aparece una empresa que ya no existe"**: el índice de búsqueda se refresca cada minuto. Si acabas de borrar una empresa, espera un minuto y reintenta.

## Diferencias entre búsqueda global y filtros de listado

| Búsqueda global (Ctrl+K) | Filtros de listado |
|---|---|
| Cruza todas las entidades. | Solo dentro de una entidad. |
| Best para "buscar a María" sin saber dónde está. | Best para "ver todas las empresas de Sevilla". |
| Resultados limitados (top 10 por tipo). | Listado completo paginado. |
| No guarda el filtro. | Algunos filtros se pueden guardar como vista. |

## Preguntas relacionadas

- ¿Cómo busco una empresa por su NIF?
- ¿Por qué no encuentro un contacto que sé que existe?
- ¿Puedo buscar por etiqueta o tag?
- ¿Hay forma de buscar dentro del contenido de los documentos PDF subidos?
- ¿Cómo guardar una búsqueda como vista personalizada?
