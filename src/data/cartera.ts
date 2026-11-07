import type { CarteraEntry } from '../types'
import { fl, plus } from '../lib/dates'
import { cop } from '../lib/format'
import { planPreview, saleTotal } from '../lib/finance'
import { sales } from './sales'

const sale = (id: string) => sales.find(s => s.id === id)!
const total = (id: string) => saleTotal(sale(id))

function fromSale(id: string, extra: Partial<CarteraEntry>): CarteraEntry {
  const s = sale(id)
  return {
    id: 'C-' + id, kind: 'venta', saleId: id, client: s.client, clientId: s.clientId, phone: s.phone, com: s.com,
    created: s.date, due: s.date, abonos: [], plan: null, planStart: 0, gestiones: [], ...extra,
  }
}

// V-1002: 3 cuotas semanales con abono inicial
const plan1002 = planPreview(total('V-1002') - 60000, 3, 'semanal', plus(2))
// Préstamo a Jorge: 2 cuotas quincenales
const planLoan = planPreview(300000, 2, 'quincenal', plus(5))

export const cartera: CarteraEntry[] = [
  fromSale('V-1002', {
    due: plan1002[2].due, plan: plan1002, planStart: 1,
    abonos: [{ date: plus(-5), val: 60000, label: 'Abono inicial', met: 'Bancolombia' }],
    gestiones: [{ date: plus(-5), tipo: 'Venta', nota: 'Venta a crédito · 3 cuotas de ' + cop(plan1002[0].amount) }],
  }),
  fromSale('V-1001', {
    due: plus(-3),
    abonos: [{ date: plus(-18), val: 40000, label: 'Abono inicial', met: 'Efectivo' }],
    gestiones: [
      { date: plus(-18), tipo: 'Venta', nota: 'Venta a crédito · pago único el ' + fl(plus(-3)) },
      { date: plus(-2), tipo: 'Llamada', nota: 'Contestó, dice que paga mañana por Nequi', promesa: plus(-1) },
    ],
  }),
  {
    id: 'C-LG-02', kind: 'prestamo', client: 'Jorge Pineda', clientId: null, phone: '3017789900', com: null, created: plus(-12), due: planLoan[1].due,
    total: 300000, ref: 'Préstamo G-02', salidaId: 'G-02', met: 'Nequi', nota: 'Para surtir su puesto',
    abonos: [], plan: planLoan, planStart: 0,
    gestiones: [{ date: plus(-12), tipo: 'Préstamo', nota: 'Préstamo entregado por Nequi · 2 cuotas de ' + cop(planLoan[0].amount) }],
  },
]
