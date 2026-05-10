/**
 * Mock cliente Supabase para modo DEMO.
 *
 * Implementa la superficie mínima de la API de @supabase/supabase-js que el
 * código del CRM utiliza realmente:
 *
 *   - .from(table).select().eq().neq().is().in().or().ilike().like().not()
 *     .order().limit().range().single().maybeSingle()
 *   - .from(table).insert(payload).select().single()
 *   - .from(table).update(patch).eq().select().single()
 *   - .from(table).delete().eq()
 *   - .rpc(fn, args)
 *   - .auth: signInWithPassword, signUp, signOut, getSession, getUser,
 *           onAuthStateChange
 *   - .storage.from(bucket): upload, remove, list, getPublicUrl, createSignedUrl
 *   - .functions.invoke(name, opts)
 *
 * Filtros aplicados realmente: eq, neq, is(null), in. Resto se ignora (no
 * cambia el comportamiento visible para una auditoría).
 *
 * Garantía: ninguna llamada de red real. El primer log emitido al cargar el
 * módulo es 'DEMO MODE activo: Supabase real deshabilitado'.
 */

import { FIXTURES, DEMO_USERS_BY_EMAIL, USER_PROFILES } from './fixtures'

// Aviso de carga en consola — se imprime una sola vez por sesión.
let _bannerLogged = false
function logBannerOnce() {
  if (_bannerLogged) return
  _bannerLogged = true
  // eslint-disable-next-line no-console
  console.log(
    '%cDEMO MODE activo: Supabase real deshabilitado',
    'background:#fb923c;color:#1e293b;padding:2px 8px;border-radius:3px;font-weight:bold',
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────────────────────

type Filter =
  | ['eq', string, unknown]
  | ['neq', string, unknown]
  | ['is', string, unknown]
  | ['in', string, unknown[]]
  | ['gt', string, unknown]
  | ['gte', string, unknown]
  | ['lt', string, unknown]
  | ['lte', string, unknown]

interface QueryResult<T = unknown> {
  data: T
  error: { code?: string; message: string } | null
  count?: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// QueryBuilder
// ─────────────────────────────────────────────────────────────────────────────

class QueryBuilder<T = Record<string, unknown>> {
  private table: string
  private filters: Filter[] = []
  private orderBy: { col: string; ascending: boolean } | null = null
  private rangeArr: [number, number] | null = null
  private countMode: 'exact' | 'planned' | 'estimated' | null = null
  private isSingle = false
  private isMaybeSingle = false
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private pendingPayload: unknown = null

  constructor(table: string) {
    this.table = table
  }

  // ---- chain (filtros) ----
  select(_cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated' | null; head?: boolean }): this {
    if (opts?.count) this.countMode = opts.count
    return this
  }
  insert(payload: unknown): this { this.mode = 'insert'; this.pendingPayload = payload; return this }
  update(payload: unknown): this { this.mode = 'update'; this.pendingPayload = payload; return this }
  delete(): this { this.mode = 'delete'; return this }
  upsert(payload: unknown): this { this.mode = 'insert'; this.pendingPayload = payload; return this }

  eq(col: string, val: unknown): this { this.filters.push(['eq', col, val]); return this }
  neq(col: string, val: unknown): this { this.filters.push(['neq', col, val]); return this }
  gt(col: string, val: unknown): this { this.filters.push(['gt', col, val]); return this }
  gte(col: string, val: unknown): this { this.filters.push(['gte', col, val]); return this }
  lt(col: string, val: unknown): this { this.filters.push(['lt', col, val]); return this }
  lte(col: string, val: unknown): this { this.filters.push(['lte', col, val]); return this }
  is(col: string, val: unknown): this { this.filters.push(['is', col, val]); return this }
  in(col: string, vals: unknown[]): this { this.filters.push(['in', col, vals]); return this }

  // Filtros tipo SQL string que ignoramos por simplicidad (no afectan a la
  // auditoría visual; solo reduciría datos mostrados).
  or(_filterStr: string): this { return this }
  ilike(_col: string, _pattern: string): this { return this }
  like(_col: string, _pattern: string): this { return this }
  contains(_col: string, _val: unknown): this { return this }
  containedBy(_col: string, _val: unknown): this { return this }
  rangeGt(_col: string, _val: unknown): this { return this }
  not(_col: string, _op: string, _val: unknown): this { return this }
  match(_filter: Record<string, unknown>): this { return this }
  filter(_col: string, _op: string, _val: unknown): this { return this }
  textSearch(_col: string, _query: string): this { return this }
  overlaps(_col: string, _val: unknown): this { return this }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, ascending: opts?.ascending ?? true }
    return this
  }
  limit(n: number): this { this.rangeArr = [0, n - 1]; return this }
  range(from: number, to: number): this { this.rangeArr = [from, to]; return this }

  // ---- terminadores ----
  single(): Promise<QueryResult<T | null>> {
    this.isSingle = true
    return this.execute() as Promise<QueryResult<T | null>>
  }
  maybeSingle(): Promise<QueryResult<T | null>> {
    this.isMaybeSingle = true
    return this.execute() as Promise<QueryResult<T | null>>
  }

  // Thenable: permite `await query` directamente.
  then<TR1 = QueryResult<T[]>, TR2 = never>(
    onFulfilled?: ((value: QueryResult<T[]>) => TR1 | PromiseLike<TR1>) | null,
    onRejected?: ((reason: unknown) => TR2 | PromiseLike<TR2>) | null,
  ): Promise<TR1 | TR2> {
    return this.execute().then(onFulfilled as never, onRejected as never)
  }

  catch<TR = never>(onRejected?: ((reason: unknown) => TR | PromiseLike<TR>) | null): Promise<unknown> {
    return this.execute().catch(onRejected as never)
  }

  finally(onFinally?: (() => void) | null): Promise<unknown> {
    return this.execute().finally(onFinally as never)
  }

  // ---- ejecución ----
  private async execute(): Promise<QueryResult<unknown>> {
    const fx = (FIXTURES[this.table] ?? []) as Record<string, unknown>[]
    let rows = fx.map((r) => ({ ...r }))

    // Aplicar filtros
    for (const f of this.filters) {
      const [op, col] = f
      const val = f[2]
      if (op === 'eq') rows = rows.filter((r) => r[col] === val)
      else if (op === 'neq') rows = rows.filter((r) => r[col] !== val)
      else if (op === 'is' && val === null) rows = rows.filter((r) => r[col] == null)
      else if (op === 'is' && val !== null) rows = rows.filter((r) => r[col] === val)
      else if (op === 'in') rows = rows.filter((r) => (val as unknown[]).includes(r[col]))
      else if (op === 'gt') rows = rows.filter((r) => (r[col] as number) > (val as number))
      else if (op === 'gte') rows = rows.filter((r) => (r[col] as number) >= (val as number))
      else if (op === 'lt') rows = rows.filter((r) => (r[col] as number) < (val as number))
      else if (op === 'lte') rows = rows.filter((r) => (r[col] as number) <= (val as number))
    }

    // Sort
    if (this.orderBy) {
      const { col, ascending } = this.orderBy
      rows.sort((a, b) => {
        const av = a[col] as unknown
        const bv = b[col] as unknown
        if (av === bv) return 0
        if (av == null) return 1
        if (bv == null) return -1
        return ((av as never) < (bv as never) ? -1 : 1) * (ascending ? 1 : -1)
      })
    }

    // Total antes de range — para count exact
    const totalCount = rows.length
    if (this.rangeArr) {
      const [fr, to] = this.rangeArr
      rows = rows.slice(fr, to + 1)
    }

    // ─── INSERT ───
    if (this.mode === 'insert') {
      const inputs = Array.isArray(this.pendingPayload) ? this.pendingPayload : [this.pendingPayload]
      const enriched = (inputs as Record<string, unknown>[]).map((d) => ({
        id: cryptoRandomId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...d,
      }))
      // No persistimos: la operación se "completa" silenciosamente.
      if (this.isSingle || this.isMaybeSingle) return { data: enriched[0] ?? null, error: null }
      return { data: enriched, error: null }
    }

    // ─── UPDATE ───
    if (this.mode === 'update') {
      const sample = rows[0] ?? {}
      const updated = {
        ...sample,
        ...(this.pendingPayload as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      }
      if (this.isSingle || this.isMaybeSingle) return { data: updated, error: null }
      return { data: [updated], error: null, count: 1 }
    }

    // ─── DELETE ───
    if (this.mode === 'delete') {
      return { data: null, error: null, count: rows.length }
    }

    // ─── SELECT ───
    if (this.isSingle) {
      if (rows.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'Demo: no rows' } }
      }
      return { data: rows[0], error: null }
    }
    if (this.isMaybeSingle) {
      return { data: rows[0] ?? null, error: null }
    }
    return { data: rows, error: null, count: this.countMode ? totalCount : null }
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID()
  }
  return 'demo-' + Math.random().toString(36).slice(2)
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock de Supabase Auth
// ─────────────────────────────────────────────────────────────────────────────

interface MockSession {
  user: MockUser
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
}

interface MockUser {
  id: string
  email: string
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
  aud: string
  created_at: string
}

const DEFAULT_DEMO_PROFILE = USER_PROFILES[0] // master/admin por defecto

function buildSession(profile: typeof USER_PROFILES[number]): MockSession {
  const user: MockUser = {
    id: profile.id,
    email: profile.email ?? 'auditor@valere.demo',
    user_metadata: {
      full_name: profile.full_name,
      nombre_completo: profile.full_name,
    },
    app_metadata: { provider: 'demo' },
    aud: 'authenticated',
    created_at: profile.created_at ?? new Date().toISOString(),
  }
  return {
    user,
    access_token: 'demo.access.token',
    refresh_token: 'demo.refresh.token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
  }
}

let currentSession: MockSession | null = buildSession(DEFAULT_DEMO_PROFILE)
const authListeners: Array<(event: string, session: MockSession | null) => void> = []

class MockAuth {
  onAuthStateChange(cb: (event: string, session: MockSession | null) => void) {
    authListeners.push(cb)
    // Disparar INITIAL_SESSION en el siguiente tick para imitar Supabase real.
    Promise.resolve().then(() => cb('INITIAL_SESSION', currentSession))
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = authListeners.indexOf(cb)
            if (idx >= 0) authListeners.splice(idx, 1)
          },
        },
      },
    }
  }

  async getSession() {
    return { data: { session: currentSession }, error: null as Error | null }
  }

  async getUser() {
    return { data: { user: currentSession?.user ?? null }, error: null as Error | null }
  }

  async signInWithPassword({ email }: { email: string; password: string }) {
    // En modo demo cualquier contraseña es válida; el email selecciona el
    // perfil. Si no hay match, se usa el master/admin por defecto.
    const profile = DEMO_USERS_BY_EMAIL.get(email) ?? DEFAULT_DEMO_PROFILE
    currentSession = buildSession(profile)
    authListeners.forEach((cb) => cb('SIGNED_IN', currentSession))
    return {
      data: { session: currentSession, user: currentSession.user },
      error: null,
    }
  }

  async signUp(_input: { email: string; password: string; options?: unknown }) {
    return {
      data: { session: null, user: null },
      error: { message: 'Signup deshabilitado en modo demo' },
    }
  }

  async signOut() {
    currentSession = null
    authListeners.forEach((cb) => cb('SIGNED_OUT', null))
    return { error: null }
  }

  async resetPasswordForEmail(_email: string) {
    return { data: {}, error: null }
  }

  async updateUser(patch: Record<string, unknown>) {
    if (!currentSession) return { data: { user: null }, error: null }
    const merged = { ...currentSession.user, ...patch } as MockUser
    currentSession = { ...currentSession, user: merged }
    authListeners.forEach((cb) => cb('USER_UPDATED', currentSession))
    return { data: { user: merged }, error: null }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock de Storage
// ─────────────────────────────────────────────────────────────────────────────

class MockStorageBucket {
  constructor(private bucket: string) {}

  async upload(path: string, _file: unknown, _opts?: unknown) {
    return { data: { path: `${this.bucket}/${path}`, id: cryptoRandomId(), fullPath: `${this.bucket}/${path}` }, error: null }
  }
  async remove(_paths: string[]) {
    return { data: [], error: null }
  }
  async list(_prefix?: string, _opts?: unknown) {
    return { data: [], error: null }
  }
  getPublicUrl(path: string) {
    return { data: { publicUrl: `https://demo.invalid/${this.bucket}/${path}` } }
  }
  async createSignedUrl(path: string, _ttl: number) {
    return { data: { signedUrl: `https://demo.invalid/signed/${this.bucket}/${path}` }, error: null }
  }
  async createSignedUrls(paths: string[], _ttl: number) {
    return {
      data: paths.map((p) => ({ path: p, signedUrl: `https://demo.invalid/signed/${this.bucket}/${p}`, error: null })),
      error: null,
    }
  }
  async download(_path: string) {
    return { data: new Blob(['demo']), error: null }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock de Edge Functions
// ─────────────────────────────────────────────────────────────────────────────

class MockFunctions {
  async invoke(name: string, _opts?: { body?: unknown; headers?: unknown }) {
    // Caso especial: el asistente RAG. Devuelve respuesta canned.
    if (name === 'ask-crm-docs') {
      return {
        data: {
          answer:
            '**Modo demo**: el asistente RAG no está conectado en esta auditoría. ' +
            'En producción esta respuesta vendría de Gemini sobre los embeddings de docs/help/.',
          sources: [],
        },
        error: null,
      }
    }
    return { data: null, error: null }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente mock — superficie idéntica al supabase-js que usa el código
//
// Nota: el banner de consola se imprime en la primera llamada a cualquier
// método del cliente (`.from`, `.auth.*`, etc.), NO al cargar el módulo.
// Así, si alguien importara esto desde un build de producción (no debería),
// no se generaría ruido en consola hasta que realmente lo use.
// ─────────────────────────────────────────────────────────────────────────────

export const mockSupabase = {
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    logBannerOnce()
    return new QueryBuilder<T>(table)
  },
  rpc: async (_fn: string, _args?: Record<string, unknown>) => ({ data: null, error: null }),
  auth: new MockAuth(),
  storage: {
    from: (bucket: string) => new MockStorageBucket(bucket),
    listBuckets: async () => ({ data: [], error: null }),
  },
  functions: new MockFunctions(),
  channel: (_name: string) => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
    unsubscribe: () => {},
  }),
  removeAllChannels: () => {},
  // Marcador para distinguir el mock del cliente real en debugging.
  __isDemoMock: true as const,
}

export type MockSupabase = typeof mockSupabase
