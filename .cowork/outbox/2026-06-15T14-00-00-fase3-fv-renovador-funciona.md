# Outbox 2026-06-15 — Renovador FV funciona end-to-end

## HITO
El Renovador de sesión FusionSolar funciona de punta a punta:
- Login asistido en FusionSolar PASA el WAF (capturó 14 cookies con navegador visible local).
- EF `fv-upload-cookies` (v2) cifra y guarda server-side. JOLIVARES quedó `estado_sesion=activa`, cookies caducan 2026-06-22.

## FIX aplicado durante la prueba
- La EF `fv-upload-cookies` hacía `upsert` a fv_credenciales_secret SIN password_enc → 23502 (password_enc NOT NULL). 
- Corregido a `UPDATE` (la fila siempre existe, la crea fv-create-credential). Redesplegada v2 ACTIVE.
- ⚠️ PENDIENTE: portar este fix al repo (el index.ts en main aún tiene el upsert). Hacer parche para sync con prod.

## Renovador
- Carpeta lista para el equipo: C:\Users\joliv\.claude\Renovador_Valere_FV\ (anon key incrustada).
- El renovar_sesion_fv.py del REPO aún tiene placeholder __ANON_KEY__ → pide la key a mano. Incrustarla también en el repo.

## Pendiente
- Confirmar que el sync trae datos de las 7 plantas tras renovar (Juan lo lanza desde el CRM).
- Renovación recurrente cada ~7 días (cookies caducan). Avisos email ya implementados (Fase 3.4).
