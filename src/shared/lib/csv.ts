/**
 * Generación de CSV compatible con Excel en español.
 * - Separador ";" (Excel en Colombia usa coma decimal, así que su separador de lista es ";").
 * - Números enteros sin formato para que Excel los pueda sumar.
 * - El BOM (﻿) lo agrega quien descarga, para que Excel lea bien tildes y ñ.
 */
export type CsvCell = string | number | null | undefined

const SEP = ';'

function cell(v: CsvCell): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : ''
  // Evita que Excel interprete el texto como fórmula (=, +, -, @)
  const s = /^[=+\-@]/.test(v) ? "'" + v : v
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map(r => r.map(cell).join(SEP)).join('\r\n')
}
