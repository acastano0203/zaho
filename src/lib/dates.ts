const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const ML = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WD = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const MONTHS_SHORT = MS

const pad = (n: number) => (n < 10 ? '0' : '') + n

export function today(): string {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function toUTC(s: string): number {
  const p = s.split('-').map(Number)
  return Date.UTC(p[0], p[1] - 1, p[2])
}

export const diff = (a: string, b: string) => Math.round((toUTC(a) - toUTC(b)) / 86400000)
export const addDays = (s: string, k: number) => new Date(toUTC(s) + k * 86400000).toISOString().slice(0, 10)
export const plus = (k: number) => addDays(today(), k)

export function addMonths(s: string, k: number): string {
  const p = s.split('-').map(Number)
  const last = new Date(Date.UTC(p[0], p[1] - 1 + k + 1, 0)).getUTCDate()
  return new Date(Date.UTC(p[0], p[1] - 1 + k, Math.min(p[2], last))).toISOString().slice(0, 10)
}

/** 7 nov */
export function fd(s: string): string {
  const p = s.split('-')
  return Number(p[2]) + ' ' + MS[Number(p[1]) - 1]
}
/** 7 de noviembre */
export function fl(s: string): string {
  const p = s.split('-')
  return Number(p[2]) + ' de ' + ML[Number(p[1]) - 1]
}
export const wd = (s: string) => WD[new Date(toUTC(s)).getUTCDay()]
export const weekdayIndex = (s: string) => new Date(toUTC(s)).getUTCDay()
export const monthName = (s: string = today()) => ML[Number(s.slice(5, 7)) - 1]
