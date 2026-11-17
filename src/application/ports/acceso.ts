import type { Rol, RolForm, Usuario, UsuarioCambios, UsuarioNuevo } from '../../domain/entities'

export interface UsuarioRepository {
  list(): Promise<Usuario[]>
  /** Crea la cuenta de acceso y su perfil. Devuelve el id. */
  create(u: UsuarioNuevo): Promise<string>
  update(id: string, cambios: UsuarioCambios): Promise<void>
  setPassword(id: string, password: string): Promise<void>
  setActivo(id: string, activo: boolean): Promise<void>
  /** Borra la cuenta. Su historial (ventas, abonos…) se conserva sin autor. */
  remove(id: string): Promise<void>
}

export interface RolRepository {
  list(): Promise<Rol[]>
  /** Crea o actualiza el rol con su lista completa de permisos. Devuelve el id. */
  save(f: RolForm): Promise<string>
  remove(id: string): Promise<void>
}

export interface AccessRepositories {
  usuarios: UsuarioRepository
  roles: RolRepository
}
