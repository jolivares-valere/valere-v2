# Modo Franja — listo para commit

## Cambios en esta sesión
- `src/features/datadis/SupplyDetailPage.tsx` — ConsumoTab reescrito con Modo Franja
- `src/features/datadis/normalizers.ts` — ya tenía `points: ConsumoHourlyPoint[]` (commit anterior)

## Nuevas funcionalidades ConsumoTab
- Toggle **Vista mensual / Modo franja** (botón superior derecho)
- **Modo franja**: selector de mes, slider hora inicio (0–22), slider hora fin (1–23), filtro Todos/Laborables/Fin sem.
- **KPIs franja**: total kWh, % del mes, día pico (resaltado en rojo en el gráfico), hora pico
- **Gráfico diario**: barras por día del mes filtradas por la franja, día pico en rojo
- Auto-selección del último mes disponible al entrar en modo franja
- Guards: slider hora fin > hora inicio (auto-ajuste al mover)

## Tipos nuevos añadidos
- `ConsumoMode = 'mensual' | 'franja'`
- `FranjaTipo = 'todos' | 'lab' | 'fds'`
- `useEffect` añadido al import de React

## Comando para commit (PowerShell)
```powershell
cd C:\Users\joliv\valere-v2
npx tsc --noEmit
git add src/features/datadis/SupplyDetailPage.tsx src/features/datadis/normalizers.ts
git commit -m "feat(datadis): modo franja horaria en ConsumoTab"
git push origin main
```

## Validar en producción
1. Ir a Datadis → CUPS → Tab Consumo
2. Hacer clic en "Modo franja ⏱"
3. Seleccionar mes, mover sliders de hora, cambiar tipo de día
4. Verificar: KPIs actualizan, gráfico diario aparece, día pico en rojo
