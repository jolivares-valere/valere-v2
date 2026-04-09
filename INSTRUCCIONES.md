# Valere v2 — Instrucciones de Puesta en Marcha

## Estado actual
- [x] Código v2 completo (27 archivos, arquitectura limpia)
- [x] Repo GitHub: https://github.com/jolivares-valere/valere-v2
- [x] Supabase proyecto creado: PROYECTO VALERE (gtphkowfcuiqbvfkwjxb)
- [x] SQL de migración preparado: `supabase-migration.sql`
- [ ] Ejecutar SQL en Supabase nuevo
- [ ] Actualizar .env con credenciales nuevas
- [ ] npm install + npm run dev
- [ ] Primer login y verificación

---

## PASO 1: Ejecutar SQL en Supabase nuevo

1. Ve a https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb
2. En el menú lateral, haz clic en **SQL Editor** (icono de terminal)
3. Copia TODO el contenido de `supabase-migration.sql` y pégalo
4. Pulsa **Run** (o Ctrl+Enter)
5. Debería ejecutarse sin errores y crear 9 tablas + datos iniciales

## PASO 2: Obtener credenciales y actualizar .env

1. En Supabase, ve a **Settings → API**
2. Copia la **Project URL** y el **anon public key**
3. Edita el archivo `.env` en la raíz del proyecto:
   ```
   VITE_SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co
   VITE_SUPABASE_ANON_KEY=[pega aquí la anon key]
   VITE_GEMINI_API_KEY=AIzaSyDqjcyy328DMa9-5mPoohJZPqvF4JfjYuE
   ```

## PASO 3: Instalar y arrancar

```bash
cd valere-v2
npm install
npm run dev
```

La app se abrirá en http://localhost:3000

## PASO 4: Primer login

1. Ve a http://localhost:3000
2. Registra tu cuenta con **jolivares@valereconsultores.com**
3. El trigger SQL te asignará automáticamente rol **master**
4. Ya tienes acceso completo a toda la app

---

## Estructura del proyecto

```
src/
├── types/database.ts        → Tipos centralizados (single source of truth)
├── lib/
│   ├── supabase.ts          → Cliente Supabase
│   ├── calculator.ts        → Motor de cálculo blindado
│   └── utils.ts             → Formateo, CSV, helpers
├── hooks/
│   ├── useAuth.tsx          → Autenticación + roles
│   └── useSupabaseQuery.ts  → Fetch genérico reutilizable
├── components/
│   ├── ErrorBoundary.tsx    → Previene pantallas blancas
│   ├── Layout.tsx           → Sidebar + header responsivo
│   ├── LoginPage.tsx        → Login con marca Valere
│   ├── EmptyState.tsx       → Estados vacíos profesionales
│   ├── StatCard.tsx         → Tarjetas KPI reutilizables
│   ├── ConsultantChat.tsx   → Chat IA con Gemini
│   └── ui/                  → 15 componentes shadcn/ui
└── modules/
    ├── Dashboard.tsx        → KPIs + actividad + chat IA
    ├── Clients.tsx          → CRUD completo de clientes
    ├── DataCapture.tsx      → Puntos suministro + facturas
    ├── Analysis.tsx         → Comparador con gráficos
    ├── Proposals.tsx        → Gestión de propuestas + export
    ├── Tracking.tsx         → Seguimiento + próximos pasos
    └── AdminPanel.tsx       → Usuarios + comercializadoras + ofertas + config
```
