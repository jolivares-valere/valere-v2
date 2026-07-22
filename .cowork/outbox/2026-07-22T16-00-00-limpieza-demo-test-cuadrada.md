# OP DE DATOS — Limpieza demo/test EJECUTADA Y CUADRADA — 2026-07-22
OK de Juan + auditor (con su correccion: 3 contratos huerfanos, no 1).

## Ejecutado (todo soft-delete salvo objetos de Storage)
- 7 empresas demo/test: 4x DEMO MVP (Bodega Mediterranea, Frigorifica Norte,
  Hostal del Pino, Industria Textil ABC) + TEST P1 SELECTOR + TEST SMOKE INDUSTRIAL
  + TEST SMOKE SENIOR.
- 4 oportunidades + 1 contacto + 6 documentos (facturas/propuestas dummy de mayo,
  objetos borrados del bucket via Storage API: 6/6).
- 3 contratos huerfanos de empresas ya borradas (verificados uno a uno antes):
  c9c29e78 (prueba para borrar) · 3690b0e6 (Empresa Test SA — el "Pendiente" sin FK)
  · f6622612 (Industrias Valere Test SL).
- Renovacion de prueba e581d00a ("hnljojhnp") + CUPS inventado ES0031102233445566OP.

## RE-CUADRE (auditor) — VERDE
- contratos vivos 545 = 545 con empresa viva (0 huerfanos)
- 0 contratos sin comercializadora_id -> CA PR-3.1 "0 fuera de catalogo" PERFECTO
- 0 empresas demo/test vivas · 0 renovaciones huerfanas · 0 CUPS huerfanos

## Derivada para backlog (ya conocida por el auditor)
El borrado de una empresa NO cascadea a sus hijos (contratos/renovaciones/CUPS
quedan vivos y huerfanos). Decidir: cascada en la RPC soft_delete vs aviso bloqueante
"esta empresa tiene N contratos vivos" en el ConfirmDialog. Candidato a PR pequeno.
