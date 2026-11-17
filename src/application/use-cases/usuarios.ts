import type { Rol, RolForm, Usuario, UsuarioCambios, UsuarioNuevo } from '../../domain/entities'
import {
  dejaSinAdmin, normalizarPermisos, puedeEliminarRol, validarPassword, validarRol, validarUsuarioNuevo,
} from '../../domain/rules/permisos'
import type { AccessRepositories } from '../ports/acceso'
import { attempt, fail, type UseCaseResult } from './result'

/**
 * Casos de uso de usuarios y roles.
 * Las reglas se validan aquí (respuesta inmediata en la UI) y se vuelven a
 * validar en la base de datos (triggers / RPC / Edge Function) por seguridad.
 */
/** yo = id del usuario conectado (para impedir que se cambie el rol o se desactive a sí mismo) */
export interface Ctx { repos: AccessRepositories; usuarios: Usuario[]; roles: Rol[]; yo?: string }

export async function crearUsuario({ repos, usuarios, roles }: Ctx, u: UsuarioNuevo): Promise<UseCaseResult<string>> {
  const err = validarUsuarioNuevo(u, usuarios, roles)
  if (err) return fail(err)
  return attempt(
    () => repos.usuarios.create({ ...u, nombre: u.nombre.trim(), email: u.email.trim().toLowerCase(), telefono: u.telefono.trim() }),
    'Usuario ' + u.nombre.trim() + ' creado',
  )
}

export async function editarUsuario({ repos, usuarios, roles, yo }: Ctx, id: string, c: UsuarioCambios): Promise<UseCaseResult<void>> {
  if (!c.nombre.trim()) return fail('Escribe el nombre')
  if (id === yo && c.rolId !== usuarios.find(u => u.id === id)?.rolId) return fail('No puedes cambiar tu propio rol')
  if (!c.rolId || !roles.some(r => r.id === c.rolId)) return fail('Elige un rol')
  if (dejaSinAdmin(usuarios, roles, id, { rolId: c.rolId })) return fail('Debe quedar al menos un administrador activo')
  return attempt(() => repos.usuarios.update(id, { ...c, nombre: c.nombre.trim(), telefono: c.telefono.trim() }), 'Usuario actualizado')
}

export async function cambiarPassword({ repos }: Ctx, id: string, password: string, confirmacion: string): Promise<UseCaseResult<void>> {
  const err = validarPassword(password)
  if (err) return fail(err)
  if (password !== confirmacion) return fail('Las contraseñas no coinciden')
  return attempt(() => repos.usuarios.setPassword(id, password), 'Contraseña actualizada')
}

export async function cambiarEstado({ repos, usuarios, roles, yo }: Ctx, id: string, activo: boolean): Promise<UseCaseResult<void>> {
  if (id === yo) return fail('No puedes desactivarte a ti mismo')
  const u = usuarios.find(x => x.id === id)
  if (!u) return fail('Usuario no encontrado')
  if (!activo && dejaSinAdmin(usuarios, roles, id, { activo })) return fail('Debe quedar al menos un administrador activo')
  return attempt(() => repos.usuarios.setActivo(id, activo), u.nombre + (activo ? ' puede volver a ingresar' : ' ya no puede ingresar'))
}

export async function eliminarUsuario({ repos, usuarios, roles, yo }: Ctx, id: string): Promise<UseCaseResult<void>> {
  if (id === yo) return fail('No puedes eliminar tu propio usuario')
  const u = usuarios.find(x => x.id === id)
  if (!u) return fail('Usuario no encontrado')
  if (u.activo && dejaSinAdmin(usuarios, roles, id, { activo: false })) return fail('Debe quedar al menos un administrador activo')
  return attempt(() => repos.usuarios.remove(id), 'Usuario ' + u.nombre + ' eliminado')
}

export async function guardarRol({ repos, roles }: Ctx, f: RolForm): Promise<UseCaseResult<string>> {
  const err = validarRol(f, roles)
  if (err) return fail(err)
  const limpio = { ...f, nombre: f.nombre.trim(), descripcion: f.descripcion.trim(), permisos: normalizarPermisos(f.permisos) }
  return attempt(() => repos.roles.save(limpio), 'Rol ' + limpio.nombre + (f.id ? ' actualizado' : ' creado'))
}

export async function eliminarRol({ repos, usuarios, roles }: Ctx, id: string): Promise<UseCaseResult<void>> {
  const rol = roles.find(r => r.id === id)
  if (!rol) return fail('Rol no encontrado')
  const err = puedeEliminarRol(rol, usuarios)
  if (err) return fail(err)
  return attempt(() => repos.roles.remove(id), 'Rol ' + rol.nombre + ' eliminado')
}
