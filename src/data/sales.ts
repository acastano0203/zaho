import type { PayMode, Sale, SaleItem } from '../types'
import { plus } from '../lib/dates'
import { products } from './products'
import { clientes } from './clientes'

const it = (pid: string, qty: number): SaleItem => ({ pid, qty, price: products.find(p => p.id === pid)!.price })
const S = (n: number, daysAgo: number, cid: string | null, com: string, pay: PayMode, items: SaleItem[]): Sale => {
  const k = cid ? clientes.find(c => c.id === cid)! : null
  return { id: 'V-' + n, date: plus(-daysAgo), client: k ? k.name : 'Cliente mostrador', clientId: cid, phone: k ? k.phone : '', com, pay, items }
}

export const sales: Sale[] = [
  S(1003, 0, 'k1', 'c1', 'contado', [it('p1', 1)]),
  S(1002, 5, 'k3', 'c2', 'credito', [it('p1', 1), it('p2', 1)]),
  S(1001, 18, 'k2', 'c3', 'credito', [it('p3', 1), it('p2', 1)]),
]
