/** Acciones posibles sobre un módulo */
export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar'

/** Clave de permiso: "<módulo>.<acción>", ej. "ventas.crear" */
export type PermisoClave = string

export interface Rol {
  id: string
  nombre: string
  descripcion: string
  /** Acceso total: no depende de la lista de permisos */
  esAdmin: boolean
  /** Rol base de la app: no se puede borrar ni renombrar */
  esSistema: boolean
  permisos: PermisoClave[]
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  telefono: string
  rolId: string | null
  /** Si el usuario es un comercial, sus ventas quedan a su nombre */
  comercialId: string | null
  activo: boolean
  creado: string
  /** Fecha y hora ISO del último inicio de sesión */
  ultimoAcceso?: string | null
}

/** Usuario conectado y lo que puede hacer */
export interface Sesion {
  usuario: Pick<Usuario, 'id' | 'nombre' | 'email'>
  rol: Pick<Rol, 'id' | 'nombre' | 'esAdmin'>
  /** Permisos efectivos (el admin los trae todos) */
  permisos: PermisoClave[]
}

export interface UsuarioNuevo {
  nombre: string
  email: string
  telefono: string
  password: string
  rolId: string
  comercialId: string | null
}

export type UsuarioCambios = Pick<Usuario, 'nombre' | 'telefono' | 'rolId' | 'comercialId'>

export interface RolForm {
  id?: string
  nombre: string
  descripcion: string
  permisos: PermisoClave[]
}
