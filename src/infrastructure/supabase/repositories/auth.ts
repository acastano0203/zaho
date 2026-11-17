import type { Sesion } from '../../../domain/entities'
import type { AuthRepository } from '../../../application/ports/auth'
import { supabase } from '../client'

interface SesionRow {
  id: string; nombre: string; email: string | null; activo: boolean
  rol: { id: string | null; nombre: string | null; es_admin: boolean | null }
  permisos: string[]
}

/** Convierte la respuesta de mi_sesion()/registrar_acceso(); null si no puede entrar */
function toSesion(r: SesionRow | null): Sesion | null {
  if (!r || !r.activo || !r.rol?.id) return null
  return {
    usuario: { id: r.id, nombre: r.nombre, email: r.email ?? '' },
    rol: { id: r.rol.id, nombre: r.rol.nombre ?? '', esAdmin: !!r.rol.es_admin },
    permisos: r.permisos ?? [],
  }
}

function authMessage(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos'
  if (/banned/i.test(msg)) return 'Tu usuario está desactivado. Habla con el administrador.'
  if (/email not confirmed/i.test(msg)) return 'Tu correo aún no está confirmado'
  if (/rate limit|too many/i.test(msg)) return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
  if (/fetch|network/i.test(msg)) return 'Sin conexión con el servidor. Revisa tu internet.'
  return msg
}

class SupabaseAuth implements AuthRepository {
  async current() {
    const { data } = await supabase().auth.getSession()
    if (!data.session) return null
    const { data: s, error } = await supabase().rpc('mi_sesion')
    if (error) return null
    const ses = toSesion(s as SesionRow | null)
    if (!ses) await supabase().auth.signOut()          // lo desactivaron mientras tenía sesión
    return ses
  }

  async signIn(email: string, password: string) {
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    if (error) throw new Error(authMessage(error.message))
    const { data, error: e2 } = await supabase().rpc('registrar_acceso')
    if (e2) { await supabase().auth.signOut(); throw new Error(authMessage(e2.message)) }
    const row = data as SesionRow | null
    const ses = toSesion(row)
    if (!ses) {
      await supabase().auth.signOut()
      throw new Error(row && !row.activo ? 'Tu usuario está desactivado. Habla con el administrador.' : 'Tu usuario no tiene un rol asignado. Habla con el administrador.')
    }
    return ses
  }

  async signOut() {
    // scope 'local': cierra este navegador sin invalidar otras sesiones del usuario
    const { error } = await supabase().auth.signOut({ scope: 'local' })
    if (error) throw new Error(authMessage(error.message))
  }

  /** En Supabase el primer administrador se crea desde el panel (Authentication → Users) */
  async needsSetup() { return false }

  async setupAdmin(): Promise<Sesion> {
    throw new Error('Crea el primer administrador desde el panel de Supabase (Authentication → Users)')
  }

  onSignedOut(cb: () => void) {
    const { data } = supabase().auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') cb() })
    return () => data.subscription.unsubscribe()
  }
}

export const createSupabaseAuthRepository = (): AuthRepository => new SupabaseAuth()
