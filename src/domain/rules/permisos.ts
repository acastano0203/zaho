/**
 * Reglas de usuarios, roles y permisos (dominio puro, sin React ni Supabase).
 * El catálogo MODULOS debe coincidir con la tabla `permisos` de la migración SQL.
 */
import type { Accion, PermisoClave, Rol, RolForm, Sesion, Usuario, UsuarioNuevo } from '../entities/usuarios'

export const ACCIONES: { key: Accion; label: string }[] = [
  { key: 'ver', label: 'Ver' },
  { key: 'crear', label: 'Crear' },
  { key: 'editar', label: 'Editar' },
  { key: 'eliminar', label: 'Eliminar' },
]

export interface ModuloDef { key: string; label: string; acciones: Accion[]; ayuda?: Partial<Record<Accion, string>> }

const TODAS: Accion[] = ['ver', 'crear', 'editar', 'eliminar']

export const MODULOS: ModuloDef[] = [
  { key: 'ventas', label: 'Ventas', acciones: TODAS, ayuda: { eliminar: 'Anular ventas' } },
  { key: 'clientes', label: 'Clientes', acciones: TODAS },
  { key: 'inventario', label: 'Inventario', acciones: TODAS, ayuda: { editar: 'Incluye ajustes y traslados' } },
  { key: 'cartera', label: 'Cartera', acciones: TODAS, ayuda: { crear: 'Registrar abonos y cuentas', editar: 'Planes de pago' } },
  { key: 'proveedores', label: 'Proveedores y pedidos', acciones: TODAS, ayuda: { editar: 'Confirmar y recibir pedidos' } },
  { key: 'caja', label: 'Caja', acciones: TODAS, ayuda: { crear: 'Gastos, préstamos, ingresos y traslados', editar: 'Arqueos y cuentas' } },
  { key: 'comerciales', label: 'Comerciales', acciones: TODAS },
  { key: 'reportes', label: 'Reportes', acciones: ['ver'] },
  { key: 'usuarios', label: 'Usuarios y roles', acciones: TODAS, ayuda: { eliminar: 'Activar / desactivar usuarios' } },
  { key: 'configuracion', label: 'Configuración', acciones: ['ver', 'editar'] },
]

export const clavePermiso = (modulo: string, accion: Accion): PermisoClave => modulo + '.' + accion

export const TODOS_LOS_PERMISOS: PermisoClave[] = MODULOS.flatMap(m => m.acciones.map(a => clavePermiso(m.key, a)))

/** ¿El rol tiene el permiso? El administrador los tiene todos. */
export const rolPuede = (rol: Rol | null | undefined, clave: PermisoClave) =>
  !!rol && (rol.esAdmin || rol.permisos.includes(clave))

/** ¿La sesión tiene el permiso? */
export const sesionPuede = (s: Sesion | null | undefined, clave: PermisoClave) =>
  !!s && (s.rol.esAdmin || s.permisos.includes(clave))

/** Iniciales para el avatar: "Ana María Pérez" → "AM" */
export const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'

/** Permisos efectivos de un rol (para mostrar) */
export const permisosEfectivos = (rol: Rol): PermisoClave[] => (rol.esAdmin ? TODOS_LOS_PERMISOS : rol.permisos)

/**
 * Normaliza una lista de permisos: quita los que no existen y,
 * si marca crear/editar/eliminar en un módulo, agrega "ver" (no tiene sentido sin verlo).
 */
export function normalizarPermisos(lista: PermisoClave[]): PermisoClave[] {
  const set = new Set(lista.filter(p => TODOS_LOS_PERMISOS.includes(p)))
  for (const m of MODULOS)
    if (m.acciones.some(a => a !== 'ver' && set.has(clavePermiso(m.key, a)))) set.add(clavePermiso(m.key, 'ver'))
  return TODOS_LOS_PERMISOS.filter(p => set.has(p))
}

/* ------------------------------ Validaciones ------------------------------ */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarPassword(p: string): string | null {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'La contraseña debe tener letras y números'
  return null
}

export function validarUsuarioNuevo(u: UsuarioNuevo, existentes: Usuario[], roles: Rol[]): string | null {
  if (!u.nombre.trim()) return 'Escribe el nombre'
  const email = u.email.trim().toLowerCase()
  if (!EMAIL.test(email)) return 'Escribe un correo válido'
  if (existentes.some(x => x.email.toLowerCase() === email)) return 'Ya existe un usuario con ese correo'
  if (!roles.some(r => r.id === u.rolId)) return 'Elige un rol'
  return validarPassword(u.password)
}

export function validarRol(f: RolForm, roles: Rol[]): string | null {
  const nombre = f.nombre.trim()
  if (!nombre) return 'Escribe el nombre del rol'
  if (roles.some(r => r.id !== f.id && r.nombre.trim().toLowerCase() === nombre.toLowerCase())) return 'Ya existe un rol llamado ' + nombre
  const actual = f.id ? roles.find(r => r.id === f.id) : null
  if (actual?.esSistema && actual.nombre !== nombre) return 'El rol ' + actual.nombre + ' es del sistema y no se puede renombrar'
  if (!actual?.esAdmin && !normalizarPermisos(f.permisos).length) return 'Marca al menos un permiso'
  return null
}

/** Administradores activos (para no dejar la app sin uno) */
export const adminsActivos = (usuarios: Usuario[], roles: Rol[]) =>
  usuarios.filter(u => u.activo && roles.find(r => r.id === u.rolId)?.esAdmin)

export function puedeEliminarRol(rol: Rol, usuarios: Usuario[]): string | null {
  if (rol.esSistema) return 'El rol ' + rol.nombre + ' es del sistema y no se puede eliminar'
  const n = usuarios.filter(u => u.rolId === rol.id).length
  if (n) return 'El rol ' + rol.nombre + ' tiene ' + n + (n === 1 ? ' usuario asignado' : ' usuarios asignados') + '. Cámbialos de rol primero'
  return null
}

/** ¿Este cambio deja la aplicación sin administradores activos? */
export function dejaSinAdmin(usuarios: Usuario[], roles: Rol[], id: string, cambio: { activo?: boolean; rolId?: string | null }) {
  const simulados = usuarios.map(u => (u.id === id ? { ...u, ...cambio } : u))
  return adminsActivos(simulados, roles).length === 0
}
