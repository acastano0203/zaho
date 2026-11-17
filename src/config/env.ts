/**
 * Configuración por entorno (archivo .env / .env.local en la raíz).
 *   VITE_DATA_SOURCE=local | supabase
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 */
export type DataSource = 'local' | 'supabase'

export const env = {
  dataSource: (import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'local') as DataSource,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
}
