# Re-paseo PR-3.3: 3 hallazgos resueltos — 2026-07-22

## Hallazgo 1: listado vacio (la subida grababa pero no se veia)
- CAUSA (verificada en vivo con la peticion de red): documentos_subido_por_fkey apuntaba
  a auth.users, no a user_profiles -> el embed del listado devolvia PGRST200/400 DESDE
  SIEMPRE. Tercer bug de nacimiento de la feature (tamanio + tipo check + FK embed):
  Documentos nunca habia funcionado de punta a punta.
- FIX BBDD (migracion 20260722_fix_documentos_subido_por_fk.sql, APLICADA con OK):
  FK re-apuntado a user_profiles (pre-check 0 huerfanos). Verificado 200 con full_name.
- FIX frontend: el estado vacio se comia el error (vacio deshonesto) -> estado de error
  con Reintentar en DocumentosTab.

## Hallazgo 2: objetos huerfanos en Storage
- El upload sube bytes ANTES del insert; si el insert fallaba (bugs pre-fix), el fichero
  quedaba huerfano. FIX: borrado compensatorio (si el insert falla, remove del objeto).

## Hallazgo 3: doble-click en "Confirmar subida" creaba filas duplicadas
- El paseo dejo 2 FILAS vivas (00:20 y 00:21), no 1 como parecia. FIX: guard isPending
  en handleUpload (ademas del disabled ya existente).

## Correccion a la purga propuesta por el auditor
- 381f47dc NO era huerfano: era el objeto de la 2a fila (doble-click). Purga ejecutada
  con OK de Juan: soft-delete fila 4dba8fc4 (00:21) + remove de 381f47dc, f694c423 y
  53d1b2f0 via Storage API (la tabla storage.objects esta protegida contra DELETE SQL).
- CUADRE FINAL VERDE: 1 fila viva (00:20, Contrato (1).pdf, tipo contrato, cia Nagini)
  + 1 objeto (…6aa07978.pdf). Verificado por SQL.

## Guion PowerShell Juan (sin &&; guard de rama)
```powershell
cd C:\Users\joliv\valere-v2
git checkout main
git pull origin main
git checkout -b claude/fix-pr33-listado-huerfanos
git branch --show-current   # DEBE decir claude/fix-pr33-listado-huerfanos; si no, PARAR
npx tsc --noEmit
npm test
git add supabase/migrations/20260722_fix_documentos_subido_por_fk.sql src/features/documentos
git commit -m "fix(pr3.3): FK subido_por a user_profiles (listado 400 de nacimiento) + borrado compensatorio de huerfanos + guard doble-click + error honesto en tab"
git push -u origin claude/fix-pr33-listado-huerfanos
```

## Re-re-paseo (esperemos que el ultimo)
1. Ficha del contrato NAGINI -> pestana Documentos LISTA el PDF con chip "contrato" y
   "Juan Olivares"; abrir a 1 clic.
2. Subir un segundo documento con doble-click rapido en Confirmar -> UNA sola fila.
3. Provocar un fallo de insert (p.ej. sin sesion no se puede; basta verificar en codigo
   el remove compensatorio) -> sin huerfanos nuevos en Storage.
4. Borrar el documento de prueba (ejercita ademas la RPC soft_delete en documentos).
