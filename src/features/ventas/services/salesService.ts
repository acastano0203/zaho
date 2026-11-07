import type { AppData, CarteraEntry, Cliente, Freq, PayMode, SaleItem } from '../../../types'
import type { Result } from '../../../store/AppStore'
import { fl, today } from '../../../lib/dates'
import { cop, norm, num, uid } from '../../../lib/format'
import { autoOrders, planPreview, saleTotal } from '../../../lib/finance'

export interface SaleDraft {
  id: string | null
  clientId: string | null
  client: string
  phone: string
  com: string
  items: SaleItem[]
  pay: PayMode
  due: string
  abono: string
  planMode: 'single' | 'multi'
  n: number
  freq: Freq
  first: string
}

const qtyMap = (items: SaleItem[]) => items.reduce<Record<string, number>>((m, i) => ((m[i.pid] = (m[i.pid] || 0) + i.qty), m), {})

/** Unidades disponibles de un producto teniendo en cuenta el borrador (y la venta original si se edita) */
export function available(d: AppData, draft: SaleDraft, pid: string) {
  const p = d.products.find(x => x.id === pid)
  if (!p) return 0
  const orig = draft.id ? qtyMap(d.sales.find(s => s.id === draft.id)?.items || [])[pid] || 0 : 0
  const now = qtyMap(draft.items)[pid] || 0
  return p.stock + orig - now
}

function newCredit(id: string, client: string, draft: SaleDraft, total: number): CarteraEntry {
  const T = today()
  const ab = Math.min(num(draft.abono), total)
  const saldo = total - ab
  const plan = draft.planMode === 'multi' && saldo > 0 ? planPreview(saldo, draft.n, draft.freq, draft.first) : null
  return {
    id: 'C-' + id, kind: 'venta', saleId: id, client, clientId: draft.clientId, phone: draft.phone, com: draft.com, created: T,
    due: plan ? plan[plan.length - 1].due : draft.due,
    abonos: ab ? [{ date: T, val: ab, label: 'Abono inicial', met: 'Efectivo' }] : [],
    plan, planStart: plan && ab ? 1 : 0,
    gestiones: [{ date: T, tipo: 'Venta', nota: 'Venta a crédito' + (plan ? ' · ' + plan.length + ' cuotas de ' + cop(plan[0].amount) : ' · pago único el ' + fl(draft.due)) }],
  }
}

/** Aplica la diferencia de stock entre la venta original y el borrador */
function applyStock(d: AppData, oldItems: SaleItem[], newItems: SaleItem[]) {
  const o = qtyMap(oldItems), n = qtyMap(newItems)
  return d.products.map(p => {
    const delta = (n[p.id] || 0) - (o[p.id] || 0)
    return delta ? { ...p, stock: p.stock - delta } : p
  })
}

export function saveSale(d: AppData, draft: SaleDraft): Result {
  const client = draft.client.trim() || 'Cliente mostrador'
  const orig = draft.id ? d.sales.find(s => s.id === draft.id) : null

  // Edición que deja la venta vacía: anular
  if (orig && !draft.items.length) {
    const products = applyStock(d, orig.items, [])
    return { data: { ...d, products, sales: d.sales.filter(x => x.id !== orig.id), cartera: d.cartera.filter(c => c.saleId !== orig.id) }, msg: 'Venta ' + orig.id + ' anulada. Stock devuelto.' }
  }
  if (!draft.items.length) return { data: d, error: 'Agrega al menos un producto' }
  if (draft.pay === 'credito' && !draft.clientId) return { data: d, error: 'Elige o crea el cliente para vender a crédito' }
  for (const i of draft.items) {
    if (available(d, draft, i.pid) < 0) {
      const p = d.products.find(x => x.id === i.pid)!
      return { data: d, error: 'No hay stock suficiente de ' + p.name + ' T' + p.size }
    }
  }

  const products = applyStock(d, orig ? orig.items : [], draft.items)
  const a = autoOrders(d, d.products, products)
  const base: AppData = { ...d, products, orders: a.orders, seq: a.seq }
  const extra = a.msg ? ' · ' + a.msg : ''

  if (orig) {
    const sales = d.sales.map(x => x.id === orig.id ? { ...x, client, clientId: draft.clientId, phone: draft.phone, com: draft.com, pay: draft.pay, items: draft.items } : x)
    let cartera = d.cartera
    const has = cartera.find(c => c.saleId === orig.id)
    if (draft.pay === 'credito' && !has) cartera = cartera.concat([newCredit(orig.id, client, draft, saleTotal(draft))])
    else if (draft.pay === 'credito')
      cartera = cartera.map(c => c.saleId === orig.id ? { ...c, client, clientId: draft.clientId, phone: draft.phone, com: draft.com, ...(c.plan && c.plan.length ? {} : { due: draft.due }) } : c)
    else cartera = cartera.filter(c => c.saleId !== orig.id)
    return { data: { ...base, sales, cartera }, msg: 'Venta ' + orig.id + ' actualizada' + extra }
  }

  const n = d.seq.sale + 1
  const id = 'V-' + n
  const sale = { id, date: today(), client, clientId: draft.clientId, phone: draft.phone, com: draft.com, pay: draft.pay, items: draft.items }
  const cartera = draft.pay === 'credito' ? d.cartera.concat([newCredit(id, client, draft, saleTotal(sale))]) : d.cartera
  return {
    data: { ...base, sales: [sale, ...d.sales], cartera, seq: { ...base.seq, sale: n } },
    msg: 'Venta ' + id + ' registrada · ' + cop(saleTotal(sale)) + (draft.pay === 'credito' ? ' · creada en Cartera' : '') + extra,
  }
}

/** Elimina la venta, devuelve su stock y borra su cuenta en cartera */
export function deleteSale(d: AppData, id: string): Result {
  const s = d.sales.find(x => x.id === id)
  if (!s) return { data: d, error: 'Venta no encontrada' }
  return {
    data: { ...d, products: applyStock(d, s.items, []), sales: d.sales.filter(x => x.id !== id), cartera: d.cartera.filter(c => c.saleId !== id) },
    msg: 'Venta ' + id + ' eliminada · stock devuelto al inventario',
  }
}

export const findClient =(d: AppData, name: string) => {
  const n = norm(name).trim()
  return n ? d.clientes.find(c => norm(c.name).trim() === n) || null : null
}

/** Crea un cliente rápido desde el desplegable de la venta */
export function quickClient(d: AppData, name: string, phone: string): Result & { client?: Cliente } {
  const ex = findClient(d, name)
  if (ex) return { data: d, client: ex }
  const client: Cliente = { id: uid('K'), name: name.trim(), phone: phone.trim(), doc: '', city: '', note: '', created: today() }
  return { data: { ...d, clientes: [client, ...d.clientes] }, client, msg: 'Cliente ' + client.name + ' creado' }
}
