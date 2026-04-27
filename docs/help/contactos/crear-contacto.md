---
title: Crear un contacto
section: contactos
audience: todos
keywords: [contacto, persona, añadir, agregar, crear, alta, nuevo, interlocutor, email, teléfono, decisor, firmante, responsable, gerente, director, cargo, departamento, ficha contacto]
related:
  - empresas/crear-empresa
  - empresas/anadir-contacto-a-empresa
  - contactos/contactos-sin-empresa
  - contratos/crear-contrato
  - oportunidades/crear-oportunidad
---

# Crear un contacto

## Resumen rápido
Un **contacto** es una **persona** del cliente: gerente, responsable de compras, técnico, firmante, etc. Lo más habitual es crearlos desde la ficha de la empresa → pestaña **Contactos** → botón **+ Nuevo contacto**. También se pueden crear desde el menú **Contactos** (por ejemplo para leads sin empresa todavía).

## Dónde se crea

Hay dos puntos de entrada equivalentes:

| Entrada | Cuándo usarla |
|---|---|
| **Empresas** → ficha empresa → pestaña **Contactos** → **+ Nuevo contacto** | Cuando ya tienes la empresa dada de alta y conoces a la persona dentro de ella. La empresa queda **preseleccionada** y no tienes que volver a elegirla. **Es la vía más común.** |
| **Contactos** (menú lateral) → **+ Nuevo contacto** | Para crear un contacto suelto (lead frío, persona física sin empresa todavía) o para asociarlo después. Ver `contactos/contactos-sin-empresa.md`. |

## Paso a paso (desde la ficha de la empresa)

1. Menú lateral → **Empresas**.
2. Click en la empresa a la que pertenece el contacto.
3. Pestaña **Contactos** dentro de la ficha de la empresa.
4. Botón **+ Nuevo contacto** (esquina superior derecha de la pestaña).
5. Rellena el formulario (los campos en negrita son los más importantes).

## Campos del formulario

| Campo | Obligatorio | Notas |
|---|---|---|
| **Nombre** | sí | Nombre de pila ("María"). Mínimo 2 caracteres. |
| **Apellidos** | no | Recomendado para evitar ambigüedad. |
| **Empresa** | no (rellenado si entras desde su ficha) | Una empresa por contacto en la versión actual. |
| **Cargo** | no | "Gerente", "Responsable de compras", "Director financiero", etc. |
| **Departamento** | no | Administración, Operaciones, Técnico, Compras, Dirección. |
| **Email** | no | Si se rellena, debe tener formato `nombre@dominio.com`. |
| **Teléfono fijo** | no | Centralita o teléfono de oficina. |
| **Móvil** | no | Recomendado para WhatsApp y llamadas directas. |
| **Es decisor** ✅ | no (checkbox) | Marca si esta persona toma decisiones de compra. |
| **Es firmante** ✅ | no (checkbox) | Marca si esta persona firma contratos. |
| **Tags** | no | Etiquetas libres ("clave", "técnico", "no contactar"). |
| **Notas** | no | Contexto, preferencias, observaciones útiles. |

Pulsa **Guardar** para crear el contacto.

## Decisor vs firmante — diferencias

Es uno de los puntos que más confunden:

- **Decisor**: la persona que **decide si se compra o no**. Puede ser el director general, el responsable de compras, etc. Importante para enfocar tu esfuerzo comercial — solo el decisor te da el "sí" definitivo.
- **Firmante**: la persona con **autoridad legal para firmar contratos**. A veces coincide con el decisor (en empresas pequeñas), pero en empresas medianas/grandes es otra persona (el administrador único, el apoderado).

**Caso práctico**:
- Empresa "PAZ Y BIEN, S.L.": el **decisor** es la dueña, María. Pero quien **firma** los contratos es su hermano José, que es el administrador único en el registro mercantil.
- Crearías 2 contactos: María (decisor=sí, firmante=no) y José (decisor=no, firmante=sí).

**Regla del CRM**: cuando creas un contrato, **solo aparecen en el desplegable de "firmante" los contactos marcados como firmantes**. Si no marcas a nadie como firmante, no podrás cerrar contratos en ese cliente.

## Email único por persona dentro de la empresa

El sistema impide crear dos contactos con el mismo email en la misma empresa. Si intentas duplicar, te avisa con:

> "Esta empresa ya tiene un contacto con ese email"

Solución: edita el contacto existente en lugar de crear uno nuevo.

> Sí permite el mismo email en empresas diferentes (caso del consultor externo que asesora a varias).

## Después de crear el contacto

Lo más habitual:
1. **Asociarlo a oportunidades** activas como interlocutor principal.
2. **Registrar una primera actividad** (llamada de presentación, email enviado).
3. Si es firmante, **vincularlo a contratos** existentes en preparación.
4. (Opcional) **Tag** "clave" o similar para encontrarlo rápido en búsquedas.

## Casos especiales

### Contacto sin email
Si el cliente no quiere dar email, déjalo vacío. No es obligatorio. El CRM funcionará igual, solo perderás la posibilidad de enviarle email desde el sistema.

### Contacto con email genérico
Si el email es del tipo `info@empresa.es` o `administracion@empresa.es` y no de la persona concreta, márcalo en notas: *"email es genérico de la empresa, no personal"*. Útil cuando varias personas de la empresa lo comparten.

### Contacto que aparece en otra empresa (cambio de trabajo)
Si la persona deja la empresa y entra en otra, **edita el contacto** y cambia el campo Empresa al nuevo valor (ver `contactos/contactos-sin-empresa.md` §"Mover un contacto"). El histórico de actividades se conserva.

### Contacto que es a la vez intermediario / recomendador
Crear como contacto sin empresa o con la empresa que represente. Asocialo a las oportunidades que te traiga aunque la empresa final sea otra.

### Contacto duplicado (misma persona, distintas grafías)
Si descubres dos fichas del mismo individuo (ej. "Maria Garcia" y "María García"), edita una con la información completa y elimina la otra. Si ambas tienen actividades, mueve manualmente las actividades a la canónica antes de eliminar.

## Errores frecuentes

- **"Email inválido"**: formato `nombre@dominio.com`. Si no tiene email, déjalo vacío.
- **"Esta empresa ya tiene un contacto con ese email"**: ya existe — edita en vez de crear.
- **"Nombre demasiado corto"**: mínimo 2 caracteres.
- **"Empresa no encontrada"**: si entras desde menú Contactos y eliges una empresa del desplegable, asegúrate de escribir bien el nombre o crear primero la empresa.
- **"No me deja marcar como firmante"**: tu rol no permite editar este checkbox. Pide al manager o admin.

## Preguntas relacionadas

- ¿Cómo asocio un contacto a una oportunidad?
- ¿Cómo marco un contacto como firmante para un contrato?
- ¿Puedo exportar los contactos a CSV o Excel?
- ¿Cómo añadir un contacto sin empresa (lead frío)?
- ¿Cómo cambio el contacto principal de una empresa?
- ¿Qué diferencia hay entre añadir contacto desde la ficha de la empresa y desde el menú Contactos?
