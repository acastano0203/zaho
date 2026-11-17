import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../../config/env'

let client: SupabaseClient | null = null

/** Cliente único de Supabase (se crea al primer uso). */
export function supabase(): SupabaseClient {
  if (client) return client
  if (!env.supabaseUrl || !env.supabaseAnonKey)
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local')
  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}

/** Convierte la respuesta de Supabase en dato o excepción con mensaje legible. */
export function unwrap<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(translate(res.error.message, res.error.code))
  return res.data as T
}

/** Traduce errores técnicos de Postgres a mensajes para el usuario. */
function translate(message: string, code?: string): string {
  if (code === '23503') return 'No se puede eliminar: el registro está siendo usado en ventas, pedidos o cuentas.'
  if (code === '23505') return 'Ya existe un registro con esos datos.'
  if (code === '23514' && message.includes('existencias_stock_check')) return 'No hay stock suficiente.'
  if (code === '42501') return 'No tienes permiso para esta acción.'
  return message
}
