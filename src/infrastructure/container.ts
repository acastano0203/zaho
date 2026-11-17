/**
 * COMPOSITION ROOT
 * Único lugar que conoce qué implementación concreta se usa para cada puerto.
 * Para cambiar de proveedor (otra BD, API REST propia, mocks de pruebas)
 * se crea otra fábrica y se elige aquí.
 */
import type { Repositories } from '../application/ports/repositories'
import type { AccessRepositories } from '../application/ports/acceso'
import { env } from '../config/env'
import { createSupabaseRepositories } from './supabase/repositories'
import { createSupabaseAccessRepositories } from './supabase/repositories/access'
import { createLocalAccessRepositories, createLocalAuthRepository } from './local/accessRepository'
import { createSupabaseAuthRepository } from './supabase/repositories/auth'
import type { AuthRepository } from '../application/ports/auth'

let repos: Repositories | null = null
let access: AccessRepositories | null = null
let auth: AuthRepository | null = null

export const isRemote = () => env.dataSource === 'supabase'

/** Repositorios del negocio (ventas, inventario, cartera…). Solo modo Supabase por ahora. */
export function getRepositories(): Repositories {
  if (!isRemote())
    throw new Error('VITE_DATA_SOURCE=local: la app usa el AppStore con localStorage (modo demo).')
  return (repos ??= createSupabaseRepositories())
}

/** Usuarios y roles: funciona en ambos modos (local = localStorage, supabase = BD + Edge Function). */
export function getAccessRepositories(): AccessRepositories {
  return (access ??= isRemote() ? createSupabaseAccessRepositories() : createLocalAccessRepositories())
}

/** Inicio y cierre de sesión: Supabase Auth o sesión local de demo */
export function getAuthRepository(): AuthRepository {
  return (auth ??= isRemote() ? createSupabaseAuthRepository() : createLocalAuthRepository())
}
