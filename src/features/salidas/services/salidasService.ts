import type { AppData, CarteraEntry, Freq, Salida, SalidaTipo } from '../../../types'
import type { Result } from '../../../store/AppStore'
import type { SalidaKind } from '../../../store/UIStore'
import { fl } from '../../../lib/dates'
import { cop, num, uid } from '../../../lib/format'
import { planPreview } from '../../../lib/finance'
import { findClient } from '../../ventas/services/salesService'

export interface SalidaForm {
  kind: SalidaKind
  date: string
  tipo: SalidaTipo
  sub: string
  desc: string
  val: string
  met: string
  file: string
  otro: string
  to: string
  toPhone: string
  dev: string
  concepto: string
  abono: string
  com: string
  mode: 'single' | 'multi'
  n: number
  freq: Freq
  first: string
}

export interface SalidaEditForm { tipo: SalidaTipo; otro: string; desc: string; val: string; date: string; met: string }

/** Edita un gasto. Los préstamos se editan desde su cuenta en Cartera para no descuadrar abonos. */
export function updateSalida(d: AppData, id: string, f: SalidaEditForm): Result {
  const g = d.salidas.find(x => x.id === id)
  if (!g) return { data: d, error: 'Salida no encontrada' }
  const val = num(f.val)
  if (!val) return { data: d, error: 'Escribe el valor' }
  return {
    data: { ...d, salidas: d.salidas.map(x => (x.id === id ? { ...x, tipo: f.tipo, otro: f.otro, desc: f.desc.trim() || x.desc, val, date: f.date, met: f.met } : x)) },
    msg: 'Salida ' + id + ' actualizada',
  }
}

/** Elimina la salida. Si es un préstamo, también su cuenta en Cartera. */
export function deleteSalida(d: AppData, id: string): Result {
  const g = d.salidas.find(x => x.id === id)
  if (!g) return { data: d, error: 'Salida no encontrada' }
  return {
    data: { ...d, salidas: d.salidas.filter(x => x.id !== id), cartera: g.tipo === 'prestamo' ? d.cartera.filter(c => c.salidaId !== id) : d.cartera },
    msg: 'Salida ' + id + ' eliminada' + (g.tipo === 'prestamo' ? ' junto con su cuenta en Cartera' : ''),
  }
}

export function saveSalida(d: AppData, f: SalidaForm): Result & { cid?: string } {
  const val = num(f.val)

  if (f.kind === 'deuda') {
    if (!f.to.trim()) return { data: d, error: 'Escribe el nombre del cliente' }
    if (!val) return { data: d, error: 'Escribe el valor total de la cuenta' }
    const ab = Math.min(num(f.abono), val)
    const saldo = val - ab
    const plan = f.mode === 'multi' && saldo > 0 ? planPreview(saldo, f.n, f.freq, f.first) : null
    const cid = uid('C-M')
    let clientes = d.clientes
    let kc = findClient(d, f.to)
    if (!kc) {
      kc = { id: uid('K'), name: f.to.trim(), phone: f.toPhone.trim(), doc: '', city: '', note: '', created: f.date }
      clientes = [kc, ...clientes]
    }
    const concepto = f.concepto.trim() || 'Cuenta por cobrar'
    const entry: CarteraEntry = {
      id: cid, kind: 'manual', client: kc.name, clientId: kc.id, phone: f.toPhone || kc.phone, com: f.com || null,
      due: plan ? plan[plan.length - 1].due : f.dev, total: val, ref: concepto, concepto, nota: f.desc.trim(), created: f.date,
      abonos: ab ? [{ date: f.date, val: ab, label: 'Abono inicial', met: f.met }] : [], plan, planStart: plan && ab ? 1 : 0,
      gestiones: [{ date: f.date, tipo: 'Registro', nota: concepto + (plan ? ' · ' + plan.length + ' cuotas de ' + cop(plan[0].amount) : ' · vence el ' + fl(f.dev)) }],
    }
    return { data: { ...d, cartera: d.cartera.concat([entry]), clientes }, cid, msg: 'Cuenta de ' + entry.client + ' creada en Cartera · saldo ' + cop(saldo) }
  }

  const isLoan = f.kind === 'prestamo'
  if (!val) return { data: d, error: isLoan ? 'Escribe el valor prestado' : 'Escribe el valor del gasto' }
  if (isLoan && !f.to.trim()) return { data: d, error: 'Escribe a quién le prestas' }
  const n = d.seq.out + 1
  const id = 'G-' + String(n).padStart(2, '0')
  const tipo: SalidaTipo = isLoan ? 'prestamo' : f.tipo
  const desc = isLoan ? 'Préstamo a ' + f.to.trim() + (f.desc.trim() ? ' · ' + f.desc.trim() : '') : f.desc.trim() || f.sub || 'Sin descripción'
  const g: Salida = { id, date: f.date, tipo, otro: f.otro, desc, val, met: f.met, file: f.file, to: f.to }
  let cartera = d.cartera
  let cid: string | undefined
  if (isLoan) {
    const plan = f.mode === 'multi' ? planPreview(val, f.n, f.freq, f.first) : null
    cid = 'C-L' + id
    cartera = cartera.concat([{
      id: cid, kind: 'prestamo', client: f.to.trim(), clientId: null, phone: f.toPhone, com: null, due: plan ? plan[plan.length - 1].due : f.dev,
      total: val, abonos: [], ref: 'Préstamo ' + id, plan, planStart: 0, salidaId: id, met: f.met, nota: f.desc.trim(), created: f.date,
      gestiones: [{ date: f.date, tipo: 'Préstamo', nota: 'Préstamo entregado por ' + f.met + (plan ? ' · ' + plan.length + ' cuotas de ' + cop(plan[0].amount) : ' · devuelve el ' + fl(f.dev)) }],
    }])
  }
  return {
    data: { ...d, salidas: [g, ...d.salidas], cartera, seq: { ...d.seq, out: n } }, cid,
    msg: isLoan ? 'Préstamo de ' + cop(val) + ' a ' + f.to.trim() + ' registrado en Salidas y en Cartera' : 'Gasto ' + id + ' registrado · ' + cop(val),
  }
}
