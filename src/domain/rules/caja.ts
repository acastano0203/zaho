/**
 * Reglas de la Caja (dominio puro).
 *
 * El libro de caja NO duplica información: se arma a partir de
 *   · saldo inicial de cada cuenta
 *   · ventas de contado            → entrada
 *   · abonos de cartera            → entrada (préstamos recuperados incluidos)
 *   · salidas (gastos y préstamos) → salida
 *   · movimientos propios de caja  → otros ingresos, traslados y ajustes de arqueo
 * Cada peso entra a la cuenta que corresponde a su medio de pago.
 */
import type { AppData, CuentaDinero, MovCaja, TipoMov } from '../entities'
import { saleTotal } from './finance'

export type OrigenLinea =
  | 'inicial' | 'venta' | 'abono' | 'recuperado' | 'gasto' | 'prestamo' | 'manual' | 'traslado' | 'ajuste'

export const ORIGEN_LABEL: Record<OrigenLinea, string> = {
  inicial: 'Saldo inicial', venta: 'Venta de contado', abono: 'Abono de cliente', recuperado: 'Préstamo recuperado',
  gasto: 'Gasto', prestamo: 'Préstamo entregado', manual: 'Otro ingreso', traslado: 'Traslado', ajuste: 'Ajuste de arqueo',
}

export const CATEGORIAS_INGRESO = ['Aporte de capital', 'Préstamo recibido', 'Devolución de proveedor', 'Otro ingreso']

/** Denominaciones para contar efectivo en el arqueo (pesos colombianos) */
export const DENOMINACIONES = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50]

export interface LineaCaja {
  key: string
  date: string
  cuentaId: string
  tipo: TipoMov
  origen: OrigenLinea
  concepto: string
  val: number
  /** Id del registro de origen (venta, cuenta de cartera, salida o movimiento de caja) */
  refId?: string
  /** Saldo de la cuenta después de esta línea */
  saldoCuenta: number
  /** Saldo de todas las cuentas después de esta línea */
  saldoTotal: number
}

/** Cuenta que recibe el dinero de un medio de pago (si nadie lo tiene, la primera de efectivo) */
export function cuentaPorMetodo(cuentas: CuentaDinero[], met: string | undefined): CuentaDinero | undefined {
  const m = met || 'Efectivo'
  return cuentas.find(c => c.metodos.includes(m)) ?? cuentas.find(c => c.tipo === 'efectivo') ?? cuentas[0]
}

const ORDEN: Record<OrigenLinea, number> = { inicial: 0, venta: 1, abono: 1, recuperado: 1, manual: 1, traslado: 2, gasto: 3, prestamo: 3, ajuste: 4 }

/** Todas las líneas del libro, en orden cronológico, con saldos acumulados */
export function libroCaja(d: AppData): LineaCaja[] {
  const cuentas = d.cuentas
  if (!cuentas.length) return []
  const raw: Omit<LineaCaja, 'saldoCuenta' | 'saldoTotal'>[] = []
  const push = (l: Omit<LineaCaja, 'saldoCuenta' | 'saldoTotal' | 'cuentaId'>, met: string | undefined) => {
    const c = cuentaPorMetodo(cuentas, met)
    if (c) raw.push({ ...l, cuentaId: c.id })
  }

  cuentas.forEach(c => {
    if (c.saldoInicial) raw.push({ key: 'ini-' + c.id, date: c.fechaInicial, cuentaId: c.id, tipo: 'ingreso', origen: 'inicial', concepto: 'Saldo inicial · ' + c.nombre, val: c.saldoInicial })
  })
  d.sales.forEach(s => {
    if (s.pay !== 'contado') return
    push({ key: 'v-' + s.id, date: s.date, tipo: 'ingreso', origen: 'venta', concepto: 'Venta ' + s.id + ' · ' + s.client, val: saleTotal(s), refId: s.id }, s.met)
  })
  d.cartera.forEach(c => c.abonos.forEach((a, i) => {
    const rec = c.kind === 'prestamo'
    push({
      key: 'a-' + c.id + '-' + i, date: a.date, tipo: 'ingreso', origen: rec ? 'recuperado' : 'abono',
      concepto: (rec ? 'Devolución de préstamo' : a.label) + ' · ' + c.client + (c.saleId ? ' · ' + c.saleId : ''), val: a.val, refId: c.id,
    }, a.met)
  }))
  d.salidas.forEach(g => {
    push({ key: 'g-' + g.id, date: g.date, tipo: 'egreso', origen: g.tipo === 'prestamo' ? 'prestamo' : 'gasto', concepto: g.id + ' · ' + g.desc, val: g.val, refId: g.id }, g.met)
  })
  d.movCaja.forEach(m => {
    raw.push({ key: 'm-' + m.id, date: m.date, cuentaId: m.cuentaId, tipo: m.tipo, origen: m.origen, concepto: m.concepto, val: m.val, refId: m.id })
  })

  // Lo anterior a la apertura de la cuenta ya está incluido en su saldo inicial
  const inicio = new Map(cuentas.map(c => [c.id, c.fechaInicial]))
  const validas = raw.filter(l => l.origen === 'inicial' || l.date >= (inicio.get(l.cuentaId) ?? ''))
  validas.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : ORDEN[a.origen] - ORDEN[b.origen]))

  const saldo = new Map<string, number>()
  let total = 0
  return validas.map(l => {
    const delta = l.tipo === 'ingreso' ? l.val : -l.val
    saldo.set(l.cuentaId, (saldo.get(l.cuentaId) ?? 0) + delta)
    total += delta
    return { ...l, saldoCuenta: saldo.get(l.cuentaId)!, saldoTotal: total }
  })
}

/** Saldo de una cuenta al final de un día (incluido) */
export function saldoAl(lineas: LineaCaja[], cuentaId: string, fecha: string) {
  const ls = lineas.filter(l => l.cuentaId === cuentaId && l.date <= fecha)
  return ls.length ? ls[ls.length - 1].saldoCuenta : 0
}

export interface ResumenCuenta {
  cuenta: CuentaDinero
  saldo: number
  entradasHoy: number
  salidasHoy: number
}

export function resumenCuentas(d: AppData, lineas: LineaCaja[], hoy: string): ResumenCuenta[] {
  return d.cuentas.map(c => {
    const ls = lineas.filter(l => l.cuentaId === c.id)
    const deHoy = ls.filter(l => l.date === hoy && l.origen !== 'inicial')
    return {
      cuenta: c,
      saldo: ls.length ? ls[ls.length - 1].saldoCuenta : 0,
      entradasHoy: deHoy.filter(l => l.tipo === 'ingreso').reduce((a, l) => a + l.val, 0),
      salidasHoy: deHoy.filter(l => l.tipo === 'egreso').reduce((a, l) => a + l.val, 0),
    }
  })
}

/** Libro filtrado por cuenta y periodo, con saldo anterior y final (como un libro de caja impreso) */
export function libroPeriodo(lineas: LineaCaja[], cuentaId: string, desde: string, hasta: string) {
  const deCuenta = cuentaId ? lineas.filter(l => l.cuentaId === cuentaId) : lineas
  const saldoDe = (l: LineaCaja) => (cuentaId ? l.saldoCuenta : l.saldoTotal)
  const antes = deCuenta.filter(l => l.date < desde)
  const filas = deCuenta.filter(l => l.date >= desde && l.date <= hasta)
  const saldoAnterior = antes.length ? saldoDe(antes[antes.length - 1]) : 0
  const entradas = filas.filter(l => l.tipo === 'ingreso').reduce((a, l) => a + l.val, 0)
  const salidas = filas.filter(l => l.tipo === 'egreso').reduce((a, l) => a + l.val, 0)
  return { filas: filas.map(l => ({ ...l, saldo: saldoDe(l) })), saldoAnterior, entradas, salidas, saldoFinal: saldoAnterior + entradas - salidas }
}

/** Total contado a partir de billetes y monedas */
export const totalConteo = (conteo: Record<string, number>) =>
  Object.entries(conteo).reduce((a, [den, n]) => a + Number(den) * (Number(n) || 0), 0)

/** Movimientos de caja que se borran juntos (las dos patas de un traslado) */
export function grupoMovimiento(movs: MovCaja[], id: string) {
  const m = movs.find(x => x.id === id)
  if (!m) return []
  return m.trasladoId ? movs.filter(x => x.trasladoId === m.trasladoId) : [m]
}

/** Cuentas por defecto al iniciar */
export const cuentasPorDefecto = (fecha: string): CuentaDinero[] => [
  { id: 'cta-efectivo', nombre: 'Caja general', tipo: 'efectivo', saldoInicial: 0, fechaInicial: fecha, metodos: ['Efectivo'] },
  { id: 'cta-nequi', nombre: 'Nequi', tipo: 'billetera', saldoInicial: 0, fechaInicial: fecha, metodos: ['Nequi'] },
  { id: 'cta-banco', nombre: 'Bancolombia', tipo: 'banco', saldoInicial: 0, fechaInicial: fecha, metodos: ['Bancolombia', 'Transferencia', 'Tarjeta'] },
]
