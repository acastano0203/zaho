/**
 * Usuarios, roles y sesión en localStorage (modo local, VITE_DATA_SOURCE=local).
 * No trae usuarios precargados: la primera vez la app pide crear el administrador.
 * Las contraseñas se guardan como hash SHA-256 solo para que el login de la demo
 * se comporte como uno real. NO es seguridad de producción: en producción la
 * autenticación la hace Supabase Auth.
 */
import type { Rol, RolForm, Sesion, Usuario, UsuarioCambios, UsuarioNuevo } from '../../domain/entities'
import type { AccessRepositories, RolRepository, UsuarioRepository } from '../../application/ports/acceso'
import type { AuthRepository } from '../../application/ports/auth'
import { TODOS_LOS_PERMISOS } from '../../domain/rules/permisos'
import { today } from '../../shared/lib/dates'
import { uid } from '../../shared/lib/format'

const KEY = 'zaho-access-v3'
const SESSION_KEY = 'zaho-session-v1'

interface Store {
  roles: Rol[]
  usuarios: Usuario[]
  /** userId → hash de la contraseña */
  claves: Record<string, string>
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zaho:' + text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function seed(): Store {
  const roles: Rol[] = [
    { id: 'r-admin', nombre: 'Administrador', descripcion: 'Acceso total a la aplicación', esAdmin: true, esSistema: true, permisos: [] },
    {
      id: 'r-vend', nombre: 'Vendedor', descripcion: 'Registra ventas y clientes, consulta inventario', esAdmin: false, esSistema: false,
      permisos: ['ventas.ver', 'ventas.crear', 'ventas.editar', 'clientes.ver', 'clientes.crear', 'clientes.editar', 'inventario.ver', 'cartera.ver', 'cartera.crear', 'comerciales.ver'],
    },
    {
      id: 'r-cobr', nombre: 'Cobrador', descripcion: 'Gestiona la cartera: abonos, planes y seguimiento', esAdmin: false, esSistema: false,
      permisos: ['cartera.ver', 'cartera.crear', 'cartera.editar', 'clientes.ver', 'clientes.editar', 'ventas.ver'],
    },
  ]
  return { roles, usuarios: [], claves: {} }
}

async function load(): Promise<Store> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Store
      // El módulo Salidas pasó a llamarse Caja
      s.roles = s.roles.map(r => ({ ...r, permisos: r.permisos.map(p => p.replace(/^salidas./, 'caja.')) }))
      return s
    }
  } catch { /* sin almacenamiento */ }
  const s = seed()
  save(s)
  return s
}

function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignorar */ }
}

async function mutate<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
  const s = await load()
  const r = await fn(s)
  save(s)
  return r
}

/* ------------------------------ Usuarios y roles ------------------------------ */

class LocalUsuarios implements UsuarioRepository {
  list = async () => (await load()).usuarios.slice().sort((a, b) => a.nombre.localeCompare(b.nombre))

  create = (u: UsuarioNuevo) => mutate(async s => {
    const id = uid('u-')
    s.usuarios.push({ id, nombre: u.nombre, email: u.email, telefono: u.telefono, rolId: u.rolId, comercialId: u.comercialId, activo: true, creado: today() })
    s.claves[id] = await sha256(u.password)
    return id
  })

  update = (id: string, c: UsuarioCambios) => mutate(s => {
    s.usuarios = s.usuarios.map(u => (u.id === id ? { ...u, ...c } : u))
  })

  setPassword = (id: string, password: string) => mutate(async s => { s.claves[id] = await sha256(password) })

  setActivo = (id: string, activo: boolean) => mutate(s => {
    s.usuarios = s.usuarios.map(u => (u.id === id ? { ...u, activo } : u))
  })

  remove = (id: string) => mutate(s => {
    s.usuarios = s.usuarios.filter(u => u.id !== id)
    delete s.claves[id]
  })
}

class LocalRoles implements RolRepository {
  list = async () => (await load()).roles

  save = (f: RolForm) => mutate(s => {
    if (f.id) {
      s.roles = s.roles.map(r => (r.id === f.id ? { ...r, nombre: f.nombre, descripcion: f.descripcion, permisos: r.esAdmin ? [] : f.permisos } : r))
      return f.id
    }
    const id = uid('r-')
    s.roles.push({ id, nombre: f.nombre, descripcion: f.descripcion, esAdmin: false, esSistema: false, permisos: f.permisos })
    return id
  })

  remove = (id: string) => mutate(s => { s.roles = s.roles.filter(r => r.id !== id) })
}

export const createLocalAccessRepositories = (): AccessRepositories => ({ usuarios: new LocalUsuarios(), roles: new LocalRoles() })

/* ----------------------------------- Sesión ----------------------------------- */

/** Arma la sesión con los datos ACTUALES (si le quitan permisos, aplica al recargar) */
function buildSession(s: Store, userId: string): Sesion | null {
  const u = s.usuarios.find(x => x.id === userId)
  const r = u ? s.roles.find(x => x.id === u.rolId) : null
  if (!u || !u.activo || !r) return null
  return {
    usuario: { id: u.id, nombre: u.nombre, email: u.email },
    rol: { id: r.id, nombre: r.nombre, esAdmin: r.esAdmin },
    permisos: r.esAdmin ? TODOS_LOS_PERMISOS : r.permisos,
  }
}

class LocalAuth implements AuthRepository {
  async current() {
    let userId: string | null = null
    try { userId = localStorage.getItem(SESSION_KEY) } catch { /* sin almacenamiento */ }
    if (!userId) return null
    const ses = buildSession(await load(), userId)
    if (!ses) this.clear()
    return ses
  }

  async signIn(email: string, password: string) {
    return mutate(async s => {
      const u = s.usuarios.find(x => x.email.toLowerCase() === email)
      // Mismo mensaje para correo inexistente o clave errada: no revela qué correos existen
      if (!u || s.claves[u.id] !== (await sha256(password))) throw new Error('Correo o contraseña incorrectos')
      if (!u.activo) throw new Error('Tu usuario está desactivado. Habla con el administrador.')
      const ses = buildSession(s, u.id)
      if (!ses) throw new Error('Tu usuario no tiene un rol asignado. Habla con el administrador.')
      u.ultimoAcceso = new Date().toISOString()
      try { localStorage.setItem(SESSION_KEY, u.id) } catch { /* ignorar */ }
      return ses
    })
  }

  async signOut() { this.clear() }

  async needsSetup() { return (await load()).usuarios.length === 0 }

  async setupAdmin(d: { nombre: string; email: string; password: string }) {
    await mutate(async s => {
      if (s.usuarios.length) throw new Error('Ya existe un administrador. Inicia sesión.')
      const admin = s.roles.find(r => r.esAdmin)!
      const id = uid('u-')
      s.usuarios.push({ id, nombre: d.nombre, email: d.email, telefono: '', rolId: admin.id, comercialId: null, activo: true, creado: today() })
      s.claves[id] = await sha256(d.password)
    })
    return this.signIn(d.email, d.password)
  }

  private clear() {
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignorar */ }
  }

  /** Cerrar sesión en otra pestaña cierra esta también */
  onSignedOut(cb: () => void) {
    const h = (e: StorageEvent) => { if (e.key === SESSION_KEY && !e.newValue) cb() }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }
}

export const createLocalAuthRepository = (): AuthRepository => new LocalAuth()
