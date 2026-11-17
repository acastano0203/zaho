/**
 * Estado del módulo Usuarios. Es el primer módulo que trabaja con la arquitectura
 * nueva: componente → hook → caso de uso → repositorio (local o Supabase).
 *
 * Este mini-store asíncrono es temporal: cuando entre TanStack Query se reemplaza
 * por useQuery/useMutation y los componentes no cambian.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Rol, RolForm, Usuario, UsuarioCambios, UsuarioNuevo } from '../../../../domain/entities'
import { adminsActivos } from '../../../../domain/rules/permisos'
import type { UseCaseResult } from '../../../../application/use-cases/result'
import {
  cambiarEstado, cambiarPassword, crearUsuario, editarUsuario, eliminarRol, eliminarUsuario, guardarRol,
} from '../../../../application/use-cases/usuarios'
import { getAccessRepositories, isRemote } from '../../../../infrastructure/container'
import { useApp } from '../../../store/AppStore'
import { subscribeUserChange, useSession } from '../../../store/SessionStore'

interface State { usuarios: Usuario[]; roles: Rol[]; loading: boolean; error: string; loaded: boolean }

let state: State = { usuarios: [], roles: [], loading: false, error: '', loaded: false }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(l => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

// Al entrar o salir otro usuario se descarta lo cargado (puede tener otros permisos)
subscribeUserChange(() => set({ usuarios: [], roles: [], loading: false, error: '', loaded: false }))

async function refresh() {
  set({ loading: true, error: '' })
  try {
    const repos = getAccessRepositories()
    const [usuarios, roles] = await Promise.all([repos.usuarios.list(), repos.roles.list()])
    set({ usuarios, roles, loading: false, loaded: true })
  } catch (e) {
    set({ loading: false, loaded: true, error: e instanceof Error ? e.message : String(e) })
  }
}

/** Datos de usuarios y roles, cargados una vez y compartidos entre componentes */
export function useAccessData() {
  const s = useSyncExternalStore(subscribe, () => state)
  useEffect(() => { if (!state.loaded && !state.loading) void refresh() }, [])

  return useMemo(() => {
    const rolDe = (id: string | null) => s.roles.find(r => r.id === id) ?? null
    const usuariosPorRol = (id: string) => s.usuarios.filter(u => u.rolId === id).length
    return { ...s, rolDe, usuariosPorRol, admins: adminsActivos(s.usuarios, s.roles).length, refresh }
  }, [s])
}

/** Acciones: ejecutan el caso de uso, muestran el resultado y refrescan la lista */
export function useAccessActions() {
  const { toast } = useApp()
  const { sesion, refrescar } = useSession()
  const yo = sesion?.usuario.id

  const run = useCallback(async <T,>(fn: (ctx: Parameters<typeof crearUsuario>[0]) => Promise<UseCaseResult<T>>) => {
    const r = await fn({ repos: getAccessRepositories(), usuarios: state.usuarios, roles: state.roles, yo })
    if (!r.ok) { toast(r.error); return false }
    if (r.msg) toast(r.msg)
    await refresh()
    await refrescar()            // por si cambió el nombre o los permisos del propio usuario
    return true
  }, [toast, yo, refrescar])

  return {
    crear: (u: UsuarioNuevo) => run(ctx => crearUsuario(ctx, u)),
    editar: (id: string, c: UsuarioCambios) => run(ctx => editarUsuario(ctx, id, c)),
    password: (id: string, p: string, confirm: string) => run(ctx => cambiarPassword(ctx, id, p, confirm)),
    estado: (id: string, activo: boolean) => run(ctx => cambiarEstado(ctx, id, activo)),
    eliminar: (id: string) => run(ctx => eliminarUsuario(ctx, id)),
    guardarRol: (f: RolForm) => run(ctx => guardarRol(ctx, f)),
    eliminarRol: (id: string) => run(ctx => eliminarRol(ctx, id)),
  }
}

/** En modo demo no hay inicio de sesión ni contraseñas */
export const modoDemo = () => !isRemote()
