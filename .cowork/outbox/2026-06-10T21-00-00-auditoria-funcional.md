# Mensaje para la próxima sesión — auditoría funcional 2026-06-10 (tarde)

1. Leer `docs/AUDITORIA_FUNCIONAL_2026-06-10.md`. Auditoría REAL ejecutada en prod con navegador. Prompt técnico listo en su §13.
2. **Datos TEST viven en producción** (2 empresas TEST_, 2 CUPS, 2 propuestas, 1 contrato, 1 lead) + usuario `test.auditor@valereconsultores.com` con rol manager. NO borrar sin confirmación de Juan; SQL de limpieza en §14 del informe.
3. Prioridades de fix surgidas (orden): normalización temporal del análisis (C2) → PDF propuesta (C1, espera diseño de Juan) → incidencias rotas (C3) → menú grupo Energía (C4) → periodos potencia 3.0TD (A1).
4. OJO: el deploy de prod va POR DELANTE del repo local en algunas cosas (botón Guardar Propuesta, pestaña Documentos con UI). Antes de tocar código: aclarar el error de `git pull` ("did not send all necessary objects") y confirmar qué commit está deployado en Cloudflare Pages.
5. El informe del agente ChatGPT no aportó datos (su entorno no tenía navegador); esta auditoría lo reemplaza.
