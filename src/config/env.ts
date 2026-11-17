/**
 * Configuración por entorno (archivo .env / .env.local en la raíz, o variables del hosting).
 *   VITE_DATA_SOURCE=local | supabase
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 *
 * Importante: Vite copia estas variables dentro del código AL COMPILAR (npm run build).
 * En el hosting deben estar configuradas antes de compilar; cambiarlas exige volver a desplegar.
 */
export type DataSource = 'local' | 'supabase'

const raw = import.meta.env.VITE_DATA_SOURCE

/**
 * El modo local (datos de prueba en el navegador) solo se permite en desarrollo y
 * si se pide explicitamente. Una version publicada siempre usa Supabase: si faltan
 * sus variables, la app muestra un error de configuracion en vez de abrir el modo local.
 */
const dataSource: DataSource = raw === 'local' && import.meta.env.DEV ? 'local' : 'supabase'

export const env = {
  dataSource,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
}

/** Variables que faltan para conectarse a Supabase (vacío = todo bien) */
export function missingConfig(): string[] {
  if (env.dataSource !== 'supabase') return []
  const faltan: string[] = []
  if (!env.supabaseUrl || !/^https:\/\/.+/.test(env.supabaseUrl)) faltan.push('VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) faltan.push('VITE_SUPABASE_ANON_KEY')
  return faltan
}
