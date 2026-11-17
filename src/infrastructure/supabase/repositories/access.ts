import type { Rol, RolForm, UsuarioCambios, UsuarioNuevo } from '../../../domain/entities'
import type { AccessRepositories, RolRepository, UsuarioRepository } from '../../../application/ports/acceso'
import { supabase, unwrap } from '../client'

/** Llama a la Edge Function admin-usuarios (usa la service key en el servidor) */
async function adminUsuarios<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke('admin-usuarios', { body })
  if (error) {
    // El mensaje útil viene en el cuerpo de la respuesta
    const ctx = (error as { context?: Response }).context
    const detail = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null
    throw new Error(detail?.error ?? error.message)
  }
  return data as T
}

interface PerfilRow {
  id: string; nombre: string; email: string | null; telefono: string | null; rol_id: string | null
  comercial_id: string | null; activo: boolean; created_at: string; ultimo_acceso: string | null
}

class SupabaseUsuarios implements UsuarioRepository {
  async list() {
    const rows = unwrap(await supabase().from('perfiles')
      .select('id, nombre, email, telefono, rol_id, comercial_id, activo, created_at, ultimo_acceso').order('nombre')) as PerfilRow[]
    return rows.map(r => ({
      id: r.id, nombre: r.nombre, email: r.email ?? '', telefono: r.telefono ?? '', rolId: r.rol_id,
      comercialId: r.comercial_id, activo: r.activo, creado: r.created_at.slice(0, 10), ultimoAcceso: r.ultimo_acceso,
    }))
  }

  async create(u: UsuarioNuevo) {
    const r = await adminUsuarios<{ id: string }>({
      action: 'crear', email: u.email, password: u.password, nombre: u.nombre, telefono: u.telefono,
      rol_id: u.rolId, comercial_id: u.comercialId,
    })
    return r.id
  }

  async update(id: string, c: UsuarioCambios) {
    unwrap(await supabase().from('perfiles')
      .update({ nombre: c.nombre, telefono: c.telefono || null, rol_id: c.rolId, comercial_id: c.comercialId })
      .eq('id', id))
  }

  async setPassword(id: string, password: string) {
    await adminUsuarios({ action: 'password', user_id: id, password })
  }

  async setActivo(id: string, activo: boolean) {
    await adminUsuarios({ action: 'estado', user_id: id, activo })
  }

  async remove(id: string) {
    await adminUsuarios({ action: 'eliminar', user_id: id })
  }
}

interface RolRow { id: string; nombre: string; descripcion: string | null; es_admin: boolean; es_sistema: boolean; rol_permisos: { permiso: string }[] }

class SupabaseRoles implements RolRepository {
  async list(): Promise<Rol[]> {
    const rows = unwrap(await supabase().from('roles')
      .select('id, nombre, descripcion, es_admin, es_sistema, rol_permisos(permiso)')
      .order('es_admin', { ascending: false }).order('nombre')) as RolRow[]
    return rows.map(r => ({
      id: r.id, nombre: r.nombre, descripcion: r.descripcion ?? '', esAdmin: r.es_admin, esSistema: r.es_sistema,
      permisos: r.rol_permisos.map(p => p.permiso),
    }))
  }

  /** Rol + permisos en una transacción (RPC guardar_rol) */
  async save(f: RolForm) {
    return unwrap(await supabase().rpc('guardar_rol', {
      p_id: f.id ?? null, p_nombre: f.nombre, p_descripcion: f.descripcion, p_permisos: f.permisos,
    })) as string
  }

  async remove(id: string) {
    unwrap(await supabase().from('roles').delete().eq('id', id))
  }
}

export const createSupabaseAccessRepositories = (): AccessRepositories => ({ usuarios: new SupabaseUsuarios(), roles: new SupabaseRoles() })
