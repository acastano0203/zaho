import type { AppData, Freq, TemplateKey } from '../../../types'
import type { Result } from '../../../store/AppStore'
import { fd, today } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import { allocate, buildCarRows, planPreview } from '../../../lib/finance'

export function registerAbono(d: AppData, cid: string, val: number, met: string, mode: 'auto' | 'manual', sel: number[]): Result & { done?: boolean } {
  const r = buildCarRows(d).find(x => x.c.id === cid)
  if (!r) return { data: d, error: 'Cuenta no encontrada' }
  if (!val) return { data: d, error: 'Escribe el valor del abono' }
  const pend = r.cu.filter(q => q.paid < q.amount)
  if (mode === 'manual' && !sel.length && pend.length > 1) return { data: d, error: 'Toca al menos una cuota' }
  const a = allocate(r, val, mode, sel)
  const alloc = Object.keys(a.map).map(n => ({ n: Number(n), val: a.map[Number(n)] })).sort((x, y) => x.n - y.n)
  const cartera = d.cartera.map(c => (c.id === cid ? { ...c, abonos: c.abonos.concat([{ date: today(), val: a.applied, label: 'Abono', met, alloc }]) } : c))
  const done = r.saldo - a.applied <= 0
  return {
    data: { ...d, cartera }, done,
    msg: 'Abono de ' + cop(a.applied) + (r.hasPlan ? ' aplicado a ' + alloc.map(x => 'cuota ' + x.n).join(', ') : ' registrado') + (done ? ' · cuenta saldada' : ''),
  }
}

const FREQ_PL: Record<Freq, string> = { semanal: 'semanales', quincenal: 'quincenales', mensual: 'mensuales' }

export function applyPlan(d: AppData, cid: string, n: number, freq: Freq, first: string): Result {
  const r = buildCarRows(d).find(x => x.c.id === cid)
  if (!r || r.saldo <= 0) return { data: d, error: 'La cuenta no tiene saldo' }
  const plan = planPreview(r.saldo, n, freq, first)
  const nota = 'Plan de pagos: ' + (plan.length === 1 ? '1 cuota' : plan.length + ' cuotas ' + FREQ_PL[freq]) + ' de ' + cop(plan[0].amount)
  const cartera = d.cartera.map(c => c.id === cid
    ? { ...c, plan, planStart: c.abonos.length, due: plan[plan.length - 1].due, gestiones: c.gestiones.concat([{ date: today(), tipo: 'Plan', nota }]) }
    : c)
  return { data: { ...d, cartera }, msg: 'Plan aplicado: ' + plan.length + (plan.length === 1 ? ' cuota' : ' cuotas') + ', primera el ' + fd(plan[0].due) }
}

export function addGestion(d: AppData, cid: string, tipo: string, nota: string, promesa?: string | null): Result {
  const cartera = d.cartera.map(c => (c.id === cid ? { ...c, gestiones: c.gestiones.concat([{ date: today(), tipo, nota, promesa: promesa || null }]) } : c))
  return { data: { ...d, cartera } }
}

export function saveGestion(d: AppData, cid: string, tipo: string, nota: string, promesa: string): Result {
  if (!nota.trim() && !promesa) return { data: d, error: 'Escribe qué pasó o una fecha de promesa' }
  const r = addGestion(d, cid, tipo, nota.trim() || 'Promesa de pago', promesa || null)
  return { ...r, msg: promesa ? 'Gestión guardada · promesa para el ' + fd(promesa) : 'Gestión guardada' }
}

export interface CarteraEditForm { client: string; phone: string; concepto: string; nota: string; total: string; due: string }

/** Edita datos de la cuenta. El valor total solo se cambia en préstamos y cuentas manuales. */
export function updateCartera(d: AppData, cid: string, f: CarteraEditForm): Result {
  const c = d.cartera.find(x => x.id === cid)
  if (!c) return { data: d, error: 'Cuenta no encontrada' }
  if (!f.client.trim()) return { data: d, error: 'Escribe el nombre' }
  const paid = c.abonos.reduce((a, b) => a + b.val, 0)
  const total = c.kind === 'venta' ? c.total : Number(f.total.replace(/\D/g, '')) || 0
  if (c.kind !== 'venta' && (total || 0) < paid) return { data: d, error: 'El valor no puede ser menor a lo ya abonado (' + cop(paid) + ')' }
  const hasPlan = !!(c.plan && c.plan.length)
  // Si cambia el total y hay plan, la última cuota absorbe la diferencia
  let plan = c.plan
  if (hasPlan && c.kind !== 'venta' && total !== c.total && plan) {
    const delta = (total || 0) - (c.total || 0)
    const last = plan[plan.length - 1]
    if (last.amount + delta <= 0) return { data: d, error: 'El nuevo valor deja la última cuota en cero. Rehaz el plan desde la pestaña Plan.' }
    plan = plan.map((q, i) => (i === plan!.length - 1 ? { ...q, amount: q.amount + delta } : q))
  }
  const cartera = d.cartera.map(x => x.id === cid ? {
    ...x, client: f.client.trim(), phone: f.phone.trim(), nota: f.nota.trim(), plan,
    ...(x.kind === 'manual' ? { concepto: f.concepto.trim() || x.concepto, ref: f.concepto.trim() || x.ref } : {}),
    ...(x.kind !== 'venta' ? { total } : {}),
    ...(!hasPlan && f.due ? { due: f.due } : {}),
  } : x)
  // El préstamo mantiene sincronizada su salida de dinero
  const salidas = c.kind === 'prestamo' && c.salidaId
    ? d.salidas.map(g => (g.id === c.salidaId ? { ...g, val: total || 0, to: f.client.trim(), desc: 'Préstamo a ' + f.client.trim() + (f.nota.trim() ? ' · ' + f.nota.trim() : '') } : g))
    : d.salidas
  return { data: { ...d, cartera, salidas }, msg: 'Cuenta de ' + f.client.trim() + ' actualizada' }
}

/** Elimina la cuenta. Si es un préstamo, también su salida de dinero. */
export function deleteCartera(d: AppData, cid: string): Result {
  const c = d.cartera.find(x => x.id === cid)
  if (!c) return { data: d, error: 'Cuenta no encontrada' }
  return {
    data: { ...d, cartera: d.cartera.filter(x => x.id !== cid), salidas: c.kind === 'prestamo' && c.salidaId ? d.salidas.filter(g => g.id !== c.salidaId) : d.salidas },
    msg: 'Cuenta de ' + c.client + ' eliminada de cartera',
  }
}

export function updateTemplate(d: AppData, key: TemplateKey, text: string): Result {
  return { data: { ...d, tpls: { ...d.tpls, [key]: text } } }
}
