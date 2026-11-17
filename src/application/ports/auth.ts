import type { Sesion } from '../../domain/entities'

export interface AuthRepository {
  /** Sesión guardada (al recargar la página). null si no hay nadie conectado. */
  current(): Promise<Sesion | null>
  /** Inicia sesión. Lanza error con mensaje legible si falla. */
  signIn(email: string, password: string): Promise<Sesion>
  signOut(): Promise<void>
  /** true en el primer arranque (no existe ningún usuario): la UI pide crear el administrador */
  needsSetup(): Promise<boolean>
  /** Crea el primer administrador e inicia su sesión */
  setupAdmin(datos: { nombre: string; email: string; password: string }): Promise<Sesion>
  /** Avisa cuando la sesión se cierra desde fuera (expiró, otra pestaña…). Devuelve la función para dejar de escuchar. */
  onSignedOut(cb: () => void): () => void
}
