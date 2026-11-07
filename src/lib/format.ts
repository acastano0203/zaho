/** Formato de pesos colombianos: $1.234.500 */
export function cop(v: number): string {
  const n = Math.round(Number(v) || 0)
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (n < 0 ? '-$' : '$') + s
}

/** Extrae solo dígitos de un texto ("$12.000" -> 12000) */
export const num = (v: unknown) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0

export const norm = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const firstName = (n: string) => String(n || '').split(' ')[0]
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function phone(p: string): string {
  const d = String(p || '').replace(/\D/g, '')
  return d.length === 10 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : p || '—'
}

export const waLink = (p: string, text = '') =>
  'https://wa.me/57' + String(p || '').replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : '')

export const uid = (prefix: string) => prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36)

export const plural = (n: number, one: string, many: string) => n + ' ' + (n === 1 ? one : many)
