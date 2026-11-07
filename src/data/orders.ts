import type { Order } from '../types'
import { plus } from '../lib/dates'

export const orders: Order[] = [
  { id: 'O-103', date: plus(-2), sup: 's2', lines: [{ pid: 'p3', qty: 4 }], status: 'Enviado', auto: true },
  { id: 'O-102', date: plus(-9), sup: 's2', lines: [{ pid: 'p2', qty: 2 }], status: 'Recibido', auto: false },
  { id: 'O-101', date: plus(-20), sup: 's1', lines: [{ pid: 'p1', qty: 6 }], status: 'Recibido', auto: false },
]
