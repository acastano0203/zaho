import type { DocTipo } from '../entities'

const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

/** Dígito de verificación de un NIT colombiano (algoritmo DIAN) */
export function nitDV(nit: string): number | null {
  const d = nit.replace(/\D/g, '')
  if (!d || d.length > PESOS.length) return null
  const sum = d.split('').reverse().reduce((a, c, i) => a + Number(c) * PESOS[i], 0)
  const r = sum % 11
  return r > 1 ? 11 - r : r
}

/** 900123456 → "900.123.456-8" (NIT) · 1020304050 → "1.020.304.050" (cédula) */
export function formatDoc(tipo: DocTipo | undefined, doc: string | undefined): string {
  const d = (doc ?? '').replace(/\D/g, '')
  if (!d) return ''
  const miles = d.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (tipo === 'nit') { const dv = nitDV(d); return miles + (dv === null ? '' : '-' + dv) }
  return miles
}

export const DOC_LABEL: Record<DocTipo, string> = { nit: 'NIT', cc: 'C.C.' }

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
