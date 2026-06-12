# Mensaje para la próxima sesión — 2026-06-10

1. **Leer primero `docs/ANALISIS_ESTRATEGICO_2026-06-10.md`.** Define la nueva dirección: cerrar el circuito consumo→análisis→propuesta→envío antes de abrir módulos nuevos. Roadmap S1-S7 en sección 7.
2. **No empezar S2-S7 sin las respuestas de Juan** a la sección 8 (7 puntos). S1 (seguridad Supabase) sí puede arrancar sin decisiones: REVOKE EXECUTE FROM anon en las 27 funciones SECURITY DEFINER, security_invoker en las 3 vistas (retailer_offers, fv_credenciales_safe, fv_sync_health_latest — verificar que no rompen el frontend), SET search_path en 16 funciones, activar leaked password protection, borrar tablas `_migration_*` y `*_backup_20260511` (export previo a documentos).
3. **Unificación proposals+propuestas**: hacerla en S1 mientras ambas están a 0 filas.
4. `git pull origin main` dio error "did not send all necessary objects" en esta sesión — diagnosticar (puede ser transitorio de GitHub o corrupción local parcial).
5. Heredado sin tocar: backfill Visalia dry_run=true (aprobado 04/06), escenario Make backfill, pantalla tariff_staging.
