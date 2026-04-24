# Handoff sprint autónomo 3 → próxima sesión

## Logro principal

**El asistente RAG del CRM está implementado end-to-end y listo para deploy.**

- ✅ Edge Function `ask-crm-docs` con adapter IA sustituible.
- ✅ Widget React `AsistentePanel` integrado en `App.tsx` (aparece en todas las páginas autenticadas).
- ✅ 20 docs `docs/help/` totales cubriendo features core del CRM.
- ✅ CLAUDE.md actualizado.

Falta solo la **activación operativa** (configurar secrets + deploy + run inicial del pipeline).

## Entregables nuevos

### Código del asistente

```
supabase/functions/_shared/ai-adapter.ts      # adapter sustituible Gemini/Claude/OpenAI
supabase/functions/ask-crm-docs/index.ts      # Edge Function principal
supabase/functions/ask-crm-docs/README.md     # docs deploy
supabase/functions/ask-crm-docs/config.toml   # verify_jwt = true

src/features/asistente-crm/
  ├── types.ts
  ├── hooks/useAsistente.ts                   # hook con estado + llamada Edge Function
  ├── components/MessageBubble.tsx            # mensaje individual con markdown
  ├── components/SourcesCitation.tsx          # citas clicables a docs
  └── AsistentePanel.tsx                      # widget flotante principal
```

### Modificaciones

- `src/App.tsx` — monta `<AsistentePanel />` dentro de `AuthGuard` (visible en todas las páginas autenticadas con lazy loading).
- `CLAUDE.md` — sección nueva "Mapa de documentación estratégica" + "Asistente RAG del CRM" + referencia Cloudflare hosting.

### 6 docs help/ adicionales (20 totales ahora)

- `docs/help/contratos/gestionar-contratos.md`
- `docs/help/cups/crear-cups.md`
- `docs/help/renovaciones/gestionar-renovaciones.md`
- `docs/help/documentos/subir-documento.md`
- `docs/help/informes/generar-informes.md`
- `docs/help/admin/gestionar-usuarios.md`

## Pasos para activar el asistente en producción

### 1. Secrets Supabase (Edge Function)

```bash
supabase secrets set --project-ref gtphkowfcuiqbvfkwjxb \
  GEMINI_API_KEY="<una de las 2 keys activas — ...R_Vs o wqag — o una nueva>" \
  ALLOWED_ORIGIN="https://valere-v2.pages.dev"
```

### 2. Deploy de la Edge Function

```bash
cd $HOME\valere-v2
npx supabase functions deploy ask-crm-docs --project-ref gtphkowfcuiqbvfkwjxb
```

### 3. Secrets GitHub (pipeline embeddings)

En GitHub → Settings → Secrets and variables → Actions:

- `GEMINI_API_KEY_EMBEDDINGS`: recomendado key separada para embeddings (permite rotar independiente del chat).
- `SUPABASE_URL`: `https://gtphkowfcuiqbvfkwjxb.supabase.co`
- `SUPABASE_SERVICE_KEY`: copiar de Supabase → Settings → API → service_role key.

### 4. Primer run del pipeline embeddings

GitHub → Actions → "Regenerate CRM help embeddings" → "Run workflow" (manual trigger).

O esperar al siguiente push con cambios en `docs/help/**`.

Tiempo esperado: 2-5 minutos según nº docs.

### 5. Validación

1. Login al CRM en `valere-v2.pages.dev`.
2. Debería aparecer la burbuja 💬 abajo a la derecha en todas las páginas.
3. Click → panel del asistente.
4. Preguntar algo que esté en la doc, ej: "¿Cómo creo una empresa?".
5. Debería responder con instrucciones + citas a `docs/help/empresas/crear-empresa.md`.

### 6. Retirada del chat-consultor viejo

Cuando el nuevo asistente esté validado funcionando:

```bash
# En Supabase dashboard
Functions → chat-consultor → Delete
# Eliminar secret obsoleto si había uno específico del viejo chat
```

En el repo:

```bash
rm -rf supabase/functions/chat-consultor
rm -rf src/features/chat-ia   # componente huérfano
# Commit + push
```

## Decisiones arquitectónicas importantes

### Adapter sustituible de IA

`supabase/functions/_shared/ai-adapter.ts` implementa una interfaz `AIAdapter` con `embed()` y `generate()`. Hoy hay implementación Gemini. Cambiar a Claude/OpenAI es:

1. Añadir `createClaudeAdapter(apiKey: string): AIAdapter` al archivo.
2. Añadir case `'claude'` en el factory `getAdapter()`.
3. Configurar env var `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY=xxx`.
4. Redeploy.

**Cero impacto** en el resto del sistema (frontend, pgvector, Edge Function logic).

### Detección automática de sección

El hook `useAsistente` detecta la ruta actual y filtra el RAG por sección. Si el usuario está en `/empresas`, la búsqueda prioriza chunks de `section: "empresas"`. Mejora precisión sin requerir input del usuario.

### Widget lazy-loaded

`AsistentePanel` se carga con `lazy(() => import(...))` — no pesa en el bundle inicial. Solo se descarga cuando el usuario entra al CRM autenticado.

### Seguridad

- `verify_jwt = true` en la Edge Function — solo usuarios autenticados.
- Máx 500 caracteres por pregunta (anti-abuse).
- CORS restringido a `valere-v2.pages.dev` y `localhost:3000`.
- Service role key solo dentro de la Edge Function, nunca al cliente.
- RLS en `crm_help_embeddings`: `authenticated` lectura, `service_role` escritura.

## Pendientes restantes

### Docs help/ que faltan (~10 más, no urgente)

- contratos/alertas-vencimiento.md
- cups/datadis-integracion.md
- actividades/tipos-actividad.md (ampliación del registrar)
- admin/aprobar-altas.md
- admin/roles-y-permisos.md
- datos/captura-facturas.md
- analisis/comparativo-ofertas.md
- propuestas-energia/generar-propuesta.md
- tracking/seguimiento-propuestas.md
- faqs/preguntas-frecuentes.md

Cada uno ~15-20 min. Pueden escribirse según uso real del asistente indique qué falta.

### Rotación defensiva keys Gemini (opcional)

Ahora que el asistente usa Gemini, sería buen momento para hacer rotación defensiva de las 2 keys (`...R_Vs` y `...wqag`) antes del primer deploy:

1. Crear nueva key en Google AI Studio (nombre claro: "crm-asistente-rag-2026-04").
2. Configurarla como `GEMINI_API_KEY` en Supabase secrets + `GEMINI_API_KEY_EMBEDDINGS` en GitHub.
3. Validar que el asistente funciona.
4. Revocar `...R_Vs` y `...wqag`.
5. Nueva key es la única activa + conocida.

## Comandos PowerShell para commitear todo

```powershell
cd $HOME\valere-v2

git status
# Muchos archivos nuevos.

git add docs/ESTADO.md CLAUDE.md src/App.tsx src/features/asistente-crm supabase/functions/_shared supabase/functions/ask-crm-docs docs/help/contratos/gestionar-contratos.md docs/help/cups docs/help/renovaciones docs/help/documentos docs/help/informes docs/help/admin/gestionar-usuarios.md ".cowork/outbox/2026-04-25T00-15-00-sprint-autonomo-3-asistente-completo.md"

git commit -m "feat(asistente): implementacion end-to-end del asistente RAG del CRM

- Edge Function ask-crm-docs con adapter IA sustituible (Gemini/Claude/OpenAI)
- Widget React AsistentePanel flotante integrado en AppShell
- 20 docs help/ totales (6 nuevos: contratos gestionar, cups, renovaciones, documentos, informes, admin usuarios)
- CLAUDE.md: mapa docs estrategica + seccion asistente RAG + hosting Cloudflare

Listo para deploy: configurar secrets + supabase functions deploy + activar workflow embeddings.
Reemplaza chat-consultor (huerfana)."

git push origin claude/docs-cierre-2026-04-23
```

## Mensaje para Juan al retomar sesión

"He leído el estado. El asistente RAG del CRM está implementado end-to-end — falta solo activación operativa (secrets + deploy + primer run del pipeline). La guía paso a paso está en el handoff. ¿Arrancamos con la activación o hay algo más urgente?"

## Reglas aprendidas en este sprint

- **Lazy loading del widget**: importante hacerlo con `lazy()` + `<Suspense fallback={null}>` para que el usuario no se entere (si el widget falla de cargar, no debe bloquear la UI).
- **Detección automática de sección en el hook**: usar `useLocation()` del router. Primer split del pathname = sección. Un patrón simple que mejora mucho la UX sin pedir nada al usuario.
- **Adapter de IA como archivo compartido `_shared/`**: Supabase Edge Functions soportan archivos compartidos entre funciones. Mantiene el código DRY.
- **System prompt estricto en el adapter**: prevenir respuestas fuera de contexto ("No encuentro información..." literal, sin hablar de temas ajenos). Clave para que el asistente NO alucine funcionalidades que no existen en la doc.
