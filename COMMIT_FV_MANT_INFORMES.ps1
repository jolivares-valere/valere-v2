Set-Location $PSScriptRoot
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

git add supabase/migrations/20260430_fv_mantenimiento_informes.sql

$msg = @'
feat(fv): migracion mantenimiento externo + workflow informes

fv_empresa_mantenimiento: registro de empresas externas de mantenimiento
  (nombre, cif, telefono, contacto, contrato_ref, fechas)

fv_mantenimiento: intervenciones por planta
  tipos: revision_preventiva, revision_correctiva, limpieza_modulos,
         inspeccion, actualizacion_fw
  estados: programado, realizado, cancelado, pendiente
  campos: tecnico, descripcion, observaciones, coste, proxima_revision

fv_planta: nuevas columnas empresa_mant_id, contrato_mant_ref,
  garantia_hasta, empresa_instaladora

fv_config_informe: configuracion de entrega por cliente
  - modo_envio: revision_previa | automatico
  - gestor_id + asesor_id (con sus roles)
  - destinatarios_cliente + destinatarios_copia (arrays email)
  - dia_envio, incluir_fv, incluir_facturas, incluir_actuaciones

fv_informe_mensual: extendido con flujo de estados
  borrador -> revision_pendiente -> en_revision -> aprobado -> enviado
  campos: gestor_id, contenido_editado (jsonb), notas_gestor,
          aprobado_en, enviado_en, destinatarios, error_envio

trigger fv_notificar_informe_pendiente: crea notificacion CRM al gestor
  cuando el informe pasa a revision_pendiente

Todas las tablas con RLS. Aplicado en prod (gtphkowfcuiqbvfkwjxb).
'@

git commit -m $msg
git push origin main

Write-Host "Push OK" -ForegroundColor Green
