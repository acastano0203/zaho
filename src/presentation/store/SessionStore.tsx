/**
 * Sesión del usuario conectado: quién es y qué puede hacer.
 * Habla con la capa de aplicación (iniciarSesion / cerrarSesion) y nunca
 * con Supabase directamente.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PermisoClave, Sesion } from '../../domain/entities'
import { sesionPuede } from '../../domain/rules/permisos'
import { cerrarSesion, configurarAdministrador, iniciarSesion } from '../../application/use-cases/auth'
import { getAuthRepository } from '../../infrastructure/container'

/** setup = primer arranque sin usuarios: se pide crear el administrador */
type Status = 'loading' | 'setup' | 'out' | 'in'

interface SessionCtx {
  status: Status
  sesion: Sesion | null
  /** ¿El usuario conectado tiene este permiso? */
  can: (p: PermisoClave) => boolean
  /** Devuelve null si entró, o el mensaje de error */
  entrar: (email: string, password: string) => Promise<string | null>
  salir: () => Promise<void>
  /** Primer arranque: crea el administrador. Devuelve null si entró, o el error */
  configurar: (d: { nombre: string; email: string; password: string; confirmacion: string }) => Promise<string | null>
  /** Vuelve a leer rol y permisos (tras editar usuarios o roles) */
  refrescar: () => Promise<void>
}

const Ctx = createContext<SessionCtx | null>(null)

/** Otros módulos se suscriben para limpiar sus cachés al cambiar de usuario */
const onChangeUser = new Set<() => void>()
export const subscribeUserChange = (fn: () => void) => { onChangeUser.add(fn); return () => { onChangeUser.delete(fn) } }
const notifyUserChange = () => onChangeUser.forEach(f => f())

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const apply = useCallback(async (s: Sesion | null) => {
    setSesion(s)
    if (s) return setStatus('in')
    const setup = await getAuthRepository().needsSetup().catch(() => false)
    setStatus(setup ? 'setup' : 'out')
  }, [])

  // Sesión guardada al recargar + cierre de sesión desde fuera (expiró / otra pestaña)
  useEffect(() => {
    const auth = getAuthRepository()
    let alive = true
    auth.current().then(s => { if (alive) void apply(s) }).catch(() => { if (alive) void apply(null) })
    const off = auth.onSignedOut(() => { notifyUserChange(); apply(null) })
    return () => { alive = false; off() }
  }, [apply])

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await iniciarSesion(getAuthRepository(), email, password)
    if (!r.ok) return r.error
    notifyUserChange()
    apply(r.value)
    return null
  }, [apply])

  const configurar = useCallback(async (d: { nombre: string; email: string; password: string; confirmacion: string }) => {
    const r = await configurarAdministrador(getAuthRepository(), d)
    if (!r.ok) return r.error
    notifyUserChange()
    await apply(r.value)
    return null
  }, [apply])

  const salir = useCallback(async () => {
    await cerrarSesion(getAuthRepository())
    notifyUserChange()
    apply(null)
  }, [apply])

  const refrescar = useCallback(async () => {
    const s = await getAuthRepository().current().catch(() => null)
    apply(s)
  }, [apply])

  const value = useMemo<SessionCtx>(() => ({
    status, sesion, entrar, salir, configurar, refrescar, can: p => sesionPuede(sesion, p),
  }), [status, sesion, entrar, salir, configurar, refrescar])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession debe usarse dentro de SessionProvider')
  return c
}
