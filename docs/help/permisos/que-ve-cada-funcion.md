---
title: Qué ve cada función en el CRM
section: permisos
audience: todos
keywords: [permisos, función, rol, sidebar, captación, análisis, senior, admin]
related:
  - empezando/primer-acceso
---

# Qué ve cada función en el CRM

## Cuándo usar
Cuando entras al CRM y no encuentras un módulo que esperabas, o cuando alguien del equipo te pregunta qué puede hacer.

## Resumen rápido por función

| Función | Sidebar | Pantalla principal |
|---|---|---|
| `telemarketing` (Carolina Aroca) | Solo "Captación" | `/captacion` con 5 pestañas |
| `analista` (Carolina Maciñeiras) | Solo "Análisis facturas" | `/analisis-captacion` con 3 pestañas |
| `asesor_senior` (Antonio) | "Cartera senior" + items CRM Comercial | `/cartera-senior` con 3 pestañas |
| `admin` + `master` (Juan) | Todo: CRM Comercial + Captación + Cartera + Potencias + Admin | `/dashboard` |

## Detalle por función

### Telemarketing (Carolina Aroca)
**Ve**:
- Captación con 5 pestañas: Por llamar / Esperando factura / Propuestas para enviar / Seguimientos / Todos mis casos.
- Botón "+ Nuevo lead".

**No ve**:
- Empresas, Contactos, Contratos, Oportunidades (son módulos del CRM Comercial).
- Datadis, Importador, Plantas FV.
- Análisis facturas, Cartera senior.
- Admin, Potencias.

Si teclea una URL prohibida, la app la redirige a `/captacion`.

### Analista (Carolina Maciñeiras)
**Ve**:
- Análisis facturas con 3 pestañas: Facturas pendientes / En análisis / Propuestas en preparación.

**No ve**:
- Captación, Cartera senior.
- CRM Comercial, Potencias, Admin.

Excepción: puede entrar al detalle de una empresa concreta (`/empresas/<id>`) en lectura, no a la lista general.

### Asesor senior (Antonio Rodriguez)
**Ve**:
- Cartera senior con 3 pestañas: Asignados a mí / Propuestas en preparación / Seguimientos directos.
- CRM Comercial: Empresas, Contactos, Contratos, Oportunidades, Dashboard, Calendario, Actividades.

**No ve**:
- Captación, Análisis facturas (no es su flujo).
- Admin, Potencias.

### Admin / Master (Juan)
**Ve todo**: CRM Comercial completo, Captación, Análisis facturas, Cartera senior, Datadis, Importador, Plantas FV, Potencias, Admin.

## Si algo no encaja
- **Veo más de lo que debería** → avisa a Juan; puede haber un fallo de permisos.
- **Falta un módulo que necesito** → habla con Juan, quizá hay que ampliar tu función.
- **No puedo acceder a una URL** → redirige a tu pantalla por defecto. Es comportamiento normal: solo accedes a lo tuyo.
