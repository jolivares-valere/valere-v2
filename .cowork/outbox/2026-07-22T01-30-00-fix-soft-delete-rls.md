# FIX soft-delete bloqueado por RLS — 2026-07-22 (madrugada) — HALLAZGO EN VIVO

## El bug (transversal, desde el endurecimiento RLS)
Juan intento borrar la empresa de prueba del asistente PR-3.2 y fallo con
42501 "new row violates row-level security policy for table empresas".
Diagnostico en vivo (Chrome + SQL emulando su sesion):
- No era rol ni grants (master->admin pasa todo; grants intactos; sin policies restrictivas).
- CAUSA: las policies de LECTURA con USING (deleted_at IS NULL). El soft-delete pone
  deleted_at -> la fila nueva deja de ser "visible" -> Postgres rechaza el UPDATE.
- Afecta a TODAS las tablas con ese patron (empresas, contratos, cups, renovaciones,
  documentos, contactos, actividades, incidencias, eventos): NADIE podia borrar nada.
  Nunca se habia paseado un borrado.
- Verificado: quitar e_read (en transaccion con rollback) hace funcionar el borrado.

## El fix (opcion elegida por Juan: RPC; las policies de lectura NO se relajan)
- Migracion 20260722_fix_soft_delete_rpc.sql (APLICADA): funcion soft_delete(p_tabla, p_id)
  SECURITY DEFINER con whitelist de 8 tablas y chequeo de permisos ESPEJO de las policies
  de delete de cada una (incl. casos por-fila: actividades.usuario_id, contactos via
  empresa.comercial_id). revoke a public/anon, grant a authenticated.
- Frontend: los 8 hooks de borrado (empresas, contratos, contactos, actividades,
  calendario/eventos, incidencias, renovaciones, documentos) pasan de
  .update({deleted_at}) a supabase.rpc('soft_delete', ...). Documentos conserva el
  borrado previo del fichero en Storage.
- VERIFICADO por SQL con la sesion emulada de Juan: soft_delete('empresas', <prueba>)
  -> true (con rollback; la empresa sigue viva para borrarla desde la UI en el paseo).

## Guion PowerShell Juan (sin &&; guard de rama)
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/fix-soft-delete-rls
git branch --show-current   # DEBE decir claude/fix-soft-delete-rls; si no, PARAR
npx tsc --noEmit
npm test
git add supabase/migrations/20260722_fix_soft_delete_rpc.sql src/features/actividades/api.ts src/features/calendario/api.ts src/features/contactos/api.ts src/features/contratos/api.ts src/features/documentos/api.ts src/features/empresas/api.ts src/features/incidencias/api.ts src/features/renovaciones/api.ts
git commit -m "fix: soft-delete bloqueado por RLS (42501) - RPC soft_delete security definer con permisos espejo, 8 hooks migrados"
git push -u origin claude/fix-soft-delete-rls
```

## Guion de paseo del auditor
1. Borrar "prueba para borrar" desde su ficha -> desaparece de la lista; SQL:
   deleted_at NOT NULL (soft, recuperable). Borrar tambien su contrato/renovacion/CUPS
   de prueba si procede (contrato y renovacion tienen boton; CUPS no tiene UI de borrado).
2. Negativo: un usuario NO admin (Julia) intenta borrar una empresa -> "permiso denegado".
3. Regresion: borrar un documento (fichero desaparece de Storage y de la lista).
4. Seguridad: la RPC no es ejecutable por anon (revoke verificado).

## Nota
La empresa "prueba para borrar" (b00112233) sigue VIVA a proposito con su contrato,
CUPS y renovacion de prueba — material del paseo. Tras el paseo, borrarla desde la UI
sera la prueba del fix.
