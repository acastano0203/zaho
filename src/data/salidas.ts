import type { Salida } from '../types'
import { plus } from '../lib/dates'

const G = (n: number, daysAgo: number, tipo: Salida['tipo'], desc: string, val: number, met: string, to = ''): Salida =>
  ({ id: 'G-' + String(n).padStart(2, '0'), date: plus(-daysAgo), tipo, otro: '', desc, val, met, file: '', to })

export const salidas: Salida[] = [
  G(3, 0, 'operativo', 'Empaques y bolsas', 65000, 'Efectivo'),
  G(2, 12, 'prestamo', 'Préstamo a Jorge Pineda · Para surtir su puesto', 300000, 'Nequi', 'Jorge Pineda'),
  G(1, 27, 'operativo', 'Arriendo local', 1800000, 'Transferencia'),
]
