# Valere v2 — Instrucciones de Puesta en Marcha

## Estado actual
- [x] Codigo v2 completo (45 archivos, 5.335 lineas, arquitectura limpia)
- [x] Repo GitHub: https://github.com/jolivares-valere/valere-v2
- [x] Supabase proyecto creado: PROYECTO VALERE (gtphkowfcuiqbvfkwjxb)
- [x] SQL de migracion preparado: `supabase-migration.sql`
- [x] 5 bugs criticos encontrados y corregidos en revision de codigo
- [x] Configuracion para deploy en Vercel (vercel.json)
- [ ] **PENDIENTE**: Ejecutar SQL en Supabase nuevo
- [ ] **PENDIENTE**: Actualizar .env con anon key nueva
- [ ] **PENDIENTE**: Deploy en Vercel (o desarrollo local en disco C:\)

---

## OPCION A: Deploy en Vercel (RECOMENDADA - no necesita npm install local)

### 1. Ejecutar SQL en Supabase
1. Ve a https://supabase.com/dashboard/project/gtphkowfcuiqbvfkwjxb
2. En el menu lateral: **SQL Editor** (icono de terminal)
3. Copia TODO el contenido de `supabase-migration.sql` y pegalo
4. Pulsa **Run** (Ctrl+Enter)
5. Debe crear 9 tablas + datos iniciales sin errores

### 2. Deploy en Vercel
1. Ve a https://vercel.com y registrate con GitHub (jolivares-valere)
2. Pulsa **"Add New" → "Project"**
3. Importa el repo **jolivares-valere/valere-v2**
4. En "Environment Variables", anade:
   - `VITE_SUPABASE_URL` = `https://gtphkowfcuiqbvfkwjxb.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = [copiar de Supabase Settings → API → anon public]
   - `VITE_GEMINI_API_KEY` = `AIzaSyDqjcyy328DMa9-5mPoohJZPqvF4JfjYuE`
5. Pulsa **Deploy**
6. En 2-3 minutos tendras la app en `valere-v2.vercel.app`
7. (Opcional) Configura dominio personalizado: `app.valereconsultores.com`

### 3. Primer login
1. Abre la URL de Vercel
2. Pulsa "Crear Cuenta" con **jolivares@valereconsultores.com**
3. El trigger SQL te asigna automaticamente rol **master**
4. Acceso completo a toda la app

---

## OPCION B: Desarrollo local (para modificar codigo)

### IMPORTANTE: Mover a disco local
Google Drive NO sirve para desarrollo (npm install falla por I/O lento).
Debes clonar el repo a disco local:

```bash
cd C:\dev
git clone https://github.com/jolivares-valere/valere-v2.git
cd valere-v2
```

### Configurar .env
Crea el archivo `.env` en la raiz:
```
VITE_SUPABASE_URL=https://gtphkowfcuiqbvfkwjxb.supabase.co
VITE_SUPABASE_ANON_KEY=[pegar de Supabase Settings -> API]
VITE_GEMINI_API_KEY=AIzaSyDqjcyy328DMa9-5mPoohJZPqvF4JfjYuE
```

### Instalar y arrancar
```bash
npm install
npm run dev
```
La app se abrira en http://localhost:3000

---

## Estructura del proyecto

```
valere-v2/
├── supabase-migration.sql   -> Script SQL para crear todas las tablas
├── vercel.json              -> Configuracion de deploy
├── src/
│   ├── types/database.ts    -> Tipos centralizados (single source of truth)
│   ├── lib/
│   │   ├── supabase.ts      -> Cliente Supabase
│   │   ├── calculator.ts    -> Motor de calculo blindado
│   │   └── utils.ts         -> Formateo, CSV, helpers
│   ├── hooks/
│   │   ├── useAuth.tsx      -> Autenticacion + roles
│   │   └── useSupabaseQuery.ts -> Fetch generico reutilizable
│   ├── components/
│   │   ├── ErrorBoundary.tsx -> Previene pantallas blancas
│   │   ├── Layout.tsx       -> Sidebar + header responsivo
│   │   ├── LoginPage.tsx    -> Login con marca Valere
│   │   ├── EmptyState.tsx   -> Estados vacios profesionales
│   │   ├── StatCard.tsx     -> Tarjetas KPI reutilizables
│   │   ├── ConsultantChat.tsx -> Chat IA con Gemini
│   │   └── ui/              -> 15 componentes shadcn/ui
│   └── modules/
│       ├── Dashboard.tsx    -> KPIs + actividad + chat IA
│       ├── Clients.tsx      -> CRUD completo de clientes
│       ├── DataCapture.tsx  -> Puntos suministro + facturas
│       ├── Analysis.tsx     -> Comparador con graficos
│       ├── Proposals.tsx    -> Gestion de propuestas + export
│       ├── Tracking.tsx     -> Seguimiento + proximos pasos
│       └── AdminPanel.tsx   -> Usuarios + comercializadoras + ofertas + config
```

## Lovable
El repo esta en GitHub y puede importarse directamente en Lovable:
1. Ve a lovable.dev
2. Crea nuevo proyecto → Importar desde GitHub
3. Selecciona `jolivares-valere/valere-v2`
4. Lovable puede modificar la UI y hacer push de los cambios al repo
