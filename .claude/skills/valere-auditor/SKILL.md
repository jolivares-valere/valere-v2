# Skill: valere-auditor

Auditoría automática del proyecto Valere CRM v2.
Ejecutar al final de cada feature y antes de cada merge a main.

## Qué hace esta skill

1. Verifica TypeScript sin errores (`npx tsc --noEmit`)
2. Ejecuta los 39 tests (`npm test -- --run`)
3. Verifica que el build funciona (`npm run build`)
4. Revisa que no haya tablas legacy en el código (`clients`, `supply_points`, `users_profile`)
5. Revisa que no haya `confirm()` nativos (usar ConfirmDialog)
6. Revisa que no haya `console.log` sin pasar por `logError`
7. Genera informe en `docs/AUDIT_<YYYY-MM-DD>.md`

## Instrucciones de ejecución

Cuando se invoque esta skill, ejecuta en este orden EXACTO:

### PASO 1 — TypeScript
```bash
cd /ruta/al/repo && npx tsc --noEmit 2>&1
```
Resultado esperado: sin output (0 errores). Si hay errores, DETENER y reportar.

### PASO 2 — Tests
```bash
npm test -- --run 2>&1 | tail -10
```
Resultado esperado: "39 passed". Si falla alguno, DETENER y reportar cuál.

### PASO 3 — Build
```bash
npm run build 2>&1 | tail -5
```
Resultado esperado: "✓ built in Xs". Si falla, DETENER y reportar.

### PASO 4 — Búsqueda de código legacy
```bash
grep -r "from.*clients\b\|\.from('clients')\|\.from(\"clients\")" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
grep -r "supply_points\|users_profile" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "// "
```
Resultado esperado: sin output. Si hay resultados, son referencias a tablas eliminadas — reportar.

### PASO 5 — Confirmaciones nativas
```bash
grep -rn "confirm(" src/ --include="*.tsx" | grep -v "ConfirmDialog\|// "
```
Resultado esperado: sin output.

### PASO 6 — console.log sin logError
```bash
grep -rn "console\.log\|console\.error\|console\.warn" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|// "
```
Resultado esperado: sin output (todo debe usar logError del logger).

### PASO 7 — Generar informe

Crea el archivo `docs/AUDIT_<YYYY-MM-DD>.md` con:
- Fecha y hora
- Resultado de cada paso (✅ OK / ❌ FALLO + detalle)
- Lista de issues encontrados con severidad (P0/P1/P2)
- Recomendaciones

### PASO 8 — Commit del informe
```bash
git add docs/AUDIT_<fecha>.md
git commit -m "audit: informe automático $(date +%Y-%m-%d)"
```

## Formato del informe

```markdown
# Audit Valere CRM — YYYY-MM-DD HH:MM

## Resumen
- TSC: ✅ 0 errores / ❌ N errores
- Tests: ✅ 39/39 / ❌ N/39
- Build: ✅ OK / ❌ FALLO
- Código legacy: ✅ Limpio / ❌ N referencias
- confirm() nativos: ✅ 0 / ❌ N
- console.log: ✅ 0 / ❌ N

## Issues encontrados

| Severidad | Archivo | Descripción |
|---|---|---|
| P0 | src/... | ... |

## Estado general
✅ LISTO PARA MERGE / ❌ BLOQUEADO — resolver antes de merge
```
