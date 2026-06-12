/**
 * Pantalla standalone de usuarios pendientes de aprobación.
 *
 * Ruta: /admin/pendientes  (montada en src/App.tsx)
 * Rol requerido: master | manager  (gate adicional dentro del componente para
 *   defensa en profundidad por si alguien sortea el AuthGuard).
 *
 * Sprint: sprint-domingo-auth-selfsignup (2026-06-12).
 *
 * Reutiliza el RPC `admin_reject_user` y las Edge Functions
 * `notify-user-approval-decision` ya existentes (migration 20260426).
 *
 * Diferencias con el tab embebido en AdminPage:
 *   - Escribe los campos canónicos `is_approved`, `approved_by`, `approved_at`
 *     (el trigger DB mantiene `approved` en sync — ver migration 20260612000001).
 *   - Vive como página propia, navegable desde el sidebar como "Pendientes".
 */

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/core/components/EmptyState'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { supabase } from '@/core/supabase/client'
import { useAuth } from '@/core/hooks/useAuth'

interface PendingUserRow {
  id: string
  email: string | null
  nombre: string | null
  apellidos: string | null
  full_name: string | null
  status: string | null
  is_approved: boolean | null
  approved: boolean | null
  created_at: string | null
}

const NOTIFY_USER_FN = 'notify-user-approval-decision'

export default function PendingUsersPage() {
  const { user } = useAuth()
  const allowed = user?.role === 'master' || user?.role === 'manager'

  if (!allowed) {
    return (
      <div className="p-8">
        <Card className="border-none shadow-md bg-white">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">
              No tienes permisos para ver esta pantalla. Solo los roles{' '}
              <strong>master</strong> y <strong>manager</strong> pueden gestionar
              aprobaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <PendingUsersTable currentUserId={user!.id} />
}

function PendingUsersTable({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<PendingUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rolesByUser, setRolesByUser] = useState<Record<string, string>>({})
  const [toReject, setToReject] = useState<PendingUserRow | null>(null)

  const fetchPendientes = useCallback(async () => {
    setLoading(true)
    // Filtramos por is_approved=false (canónico). El trigger DB ya sincroniza
    // approved, así que ambos están alineados.
    const { data, error } = await supabase
      .from('user_profiles')
      .select(
        'id, email, nombre, apellidos, full_name, status, is_approved, approved, created_at',
      )
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Error al cargar pendientes')
      setRows([])
    } else {
      const list = (data ?? []) as PendingUserRow[]
      setRows(list)
      setRolesByUser((prev) => {
        const next = { ...prev }
        for (const u of list) if (!next[u.id]) next[u.id] = 'client'
        return next
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchPendientes()
  }, [fetchPendientes])

  const aprobar = async (u: PendingUserRow) => {
    const role = rolesByUser[u.id] ?? 'client'
    setActingId(u.id)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_approved: true,
          approved_by: currentUserId,
          // approved_at lo rellena el trigger BD automáticamente
          status: 'active',
          role,
        })
        .eq('id', u.id)
      if (error) throw error
      toast.success(`Usuario aprobado como ${role}`)
      // Notificación best-effort
      try {
        await supabase.functions.invoke(NOTIFY_USER_FN, {
          body: {
            userId: u.id,
            decision: 'approved',
            userEmail: u.email,
            userName: u.full_name ?? `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim(),
          },
        })
      } catch {
        toast.info('Aprobado. El email de notificación falló (revisa logs).')
      }
      await fetchPendientes()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al aprobar'
      toast.error(msg)
    } finally {
      setActingId(null)
    }
  }

  const rechazar = async () => {
    if (!toReject) return
    const u = toReject
    setActingId(u.id)
    try {
      const userEmail = u.email
      const userName =
        u.full_name ?? `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim()
      const rpcFn = supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
      const { error } = await rpcFn('admin_reject_user', { p_user_id: u.id })
      if (error) throw error
      toast.success('Usuario rechazado')
      try {
        await supabase.functions.invoke(NOTIFY_USER_FN, {
          body: { userId: u.id, decision: 'rejected', userEmail, userName },
        })
      } catch {
        toast.info('Rechazado. El email de notificación falló (revisa logs).')
      }
      setToReject(null)
      await fetchPendientes()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al rechazar'
      toast.error(msg)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-valere-blue-dark">
          Usuarios pendientes
        </h1>
        <p className="text-valere-ink/50 mt-1">
          Aprueba o rechaza solicitudes de acceso al CRM.
        </p>
      </div>

      <Card className="border-none shadow-md bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <table className="w-full">
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} cols={5} />
                ))}
              </tbody>
            </table>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<UserPlus className="w-8 h-8" />}
              title="No hay solicitudes pendientes"
              description="Cuando alguien solicite acceso desde /signup aparecerá aquí."
            />
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="font-bold text-valere-blue-dark pl-6">
                    Nombre
                  </TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">
                    Email
                  </TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">
                    Solicitado
                  </TableHead>
                  <TableHead className="font-bold text-valere-blue-dark">
                    Rol al aprobar
                  </TableHead>
                  <TableHead className="font-bold text-valere-blue-dark pr-6 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => {
                  const composedName = `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim()
                  const displayName = (u.full_name ?? composedName) || '—'
                  const fecha = u.created_at
                    ? new Date(u.created_at).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—'
                  const isActing = actingId === u.id
                  return (
                    <TableRow
                      key={u.id}
                      className="border-slate-50 hover:bg-slate-50/30"
                    >
                      <TableCell className="pl-6 font-semibold text-valere-blue-dark">
                        {displayName}
                      </TableCell>
                      <TableCell className="text-valere-ink/70 text-sm">
                        {u.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-valere-ink/60 text-xs">
                        {fecha}
                      </TableCell>
                      <TableCell>
                        <select
                          value={rolesByUser[u.id] ?? 'client'}
                          onChange={(e) =>
                            setRolesByUser((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          disabled={isActing}
                          className="px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                        >
                          <option value="client">Cliente</option>
                          <option value="consultant">Consultor</option>
                          <option value="manager">Manager</option>
                          <option value="master">Master</option>
                        </select>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => aprobar(u)}
                            disabled={isActing}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-valere-green-dark text-white rounded-lg hover:bg-valere-green-medium disabled:opacity-50"
                          >
                            {isActing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => setToReject(u)}
                            disabled={isActing}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Rechazar
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!toReject}
        title="Rechazar solicitud"
        message={`¿Seguro que quieres rechazar la solicitud de ${
          toReject?.email ?? 'este usuario'
        }? Se borrará la cuenta y se le enviará un email.`}
        confirmLabel="Rechazar"
        variant="danger"
        submitting={actingId === toReject?.id}
        onConfirm={rechazar}
        onCancel={() => setToReject(null)}
      />
    </div>
  )
}
