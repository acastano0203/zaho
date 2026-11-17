import type { Sesion } from '../../domain/entities'
import type { AuthRepository } from '../ports/auth'
import { attempt, fail, type UseCaseResult } from './result'
import { validarPassword } from '../../domain/rules/permisos'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function iniciarSesion(auth: AuthRepository, email: string, password: string): Promise<UseCaseResult<Sesion>> {
  const e = email.trim().toLowerCase()
  if (!EMAIL.test(e)) return fail('Escribe un correo válido')
  if (!password) return fail('Escribe tu contraseña')
  return attempt(() => auth.signIn(e, password), s => 'Hola, ' + s.usuario.nombre.split(' ')[0])
}

export const cerrarSesion = (auth: AuthRepository) => attempt(() => auth.signOut(), 'Sesión cerrada')

/** Primer arranque: crea el administrador de la tienda */
export async function configurarAdministrador(
  auth: AuthRepository, d: { nombre: string; email: string; password: string; confirmacion: string },
): Promise<UseCaseResult<Sesion>> {
  if (!d.nombre.trim()) return fail('Escribe tu nombre')
  const email = d.email.trim().toLowerCase()
  if (!EMAIL.test(email)) return fail('Escribe un correo válido')
  const err = validarPassword(d.password)
  if (err) return fail(err)
  if (d.password !== d.confirmacion) return fail('Las contraseñas no coinciden')
  return attempt(() => auth.setupAdmin({ nombre: d.nombre.trim(), email, password: d.password }), s => 'Bienvenido, ' + s.usuario.nombre.split(' ')[0])
}
