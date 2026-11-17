import type { AppData, CuentaDinero, MovCaja, TipoCuenta } from '../../../../domain/entities'
import type { Result } from '../../../store/AppStore'
import { grupoMovimiento, libroCaja, saldoAl, totalConteo } from '../../../../domain/rules/caja'
import { today } from '../../../../shared/lib/dates'
import { cop, norm, num, uid } from '../../../../shared/lib/format'

const cuentaDe = (d: AppData, id: string) => d.cuentas.find(c => c.id === id)

/* ------------------------------ Otros ingresos ------------------------------ */

export interface IngresoForm { cuentaId: string; date: string; categoria: string; concepto: string; val: string }

export function registrarIngreso(d: AppData, f: IngresoForm): Result {
  const val = num(f.val)
  const c = cuentaDe(d, f.cuentaId)
  if (!c) return { data: d, error: 'Elige la cuenta donde entra el dinero' }
  if (!val) return { data: d, error: 'Escribe el valor' }
  if (!f.date) return { data: d, error: 'Elige la fecha' }
  if (f.date < c.fechaInicial) return { data: d, error: c.nombre + ' se abrió el ' + c.fechaInicial + '. Usa una fecha igual o posterior.' }
  const m: MovCaja = {
    id: uid('M-'), date: f.date, cuentaId: c.id, tipo: 'ingreso', origen: 'manual', categoria: f.categoria,
    concepto: f.categoria + (f.concepto.trim() ? ' · ' + f.concepto.trim() : ''), val,
  }
  return { data: { ...d, movCaja: [...d.movCaja, m] }, msg: 'Ingreso de ' + cop(val) + ' registrado en ' + c.nombre }
}

/* --------------------------------- Traslados -------------------------------- */

export interface TrasladoForm { desde: string; hasta: string; date: string; val: string; concepto: string }

export function registrarTraslado(d: AppData, f: TrasladoForm): Result {
  const val = num(f.val)
  const a = cuentaDe(d, f.desde), b = cuentaDe(d, f.hasta)
  if (!a || !b) return { data: d, error: 'Elige las dos cuentas' }
  if (a.id === b.id) return { data: d, error: 'Las cuentas deben ser distintas' }
  if (!val) return { data: d, error: 'Escribe el valor' }
  if (f.date < a.fechaInicial || f.date < b.fechaInicial) return { data: d, error: 'La fecha es anterior a la apertura de una de las cuentas' }
  const disponible = saldoAl(libroCaja(d), a.id, f.date)
  if (val > disponible) return { data: d, error: 'En ' + a.nombre + ' hay ' + cop(disponible) + ' a esa fecha. No alcanza para trasladar ' + cop(val) + '.' }
  const t = uid('T-')
  const concepto = f.concepto.trim() || 'Traslado de ' + a.nombre + ' a ' + b.nombre
  const movs: MovCaja[] = [
    { id: uid('M-'), date: f.date, cuentaId: a.id, tipo: 'egreso', origen: 'traslado', categoria: 'Traslado', concepto: concepto + ' (sale)', val, trasladoId: t },
    { id: uid('M-'), date: f.date, cuentaId: b.id, tipo: 'ingreso', origen: 'traslado', categoria: 'Traslado', concepto: concepto + ' (entra)', val, trasladoId: t },
  ]
  return { data: { ...d, movCaja: [...d.movCaja, ...movs] }, msg: cop(val) + ' trasladados de ' + a.nombre + ' a ' + b.nombre }
}

/* ------------------------------ Arqueo / cierre ------------------------------ */

export interface ArqueoForm { cuentaId: string; contado: string; conteo?: Record<string, number>; nota: string }

export function registrarArqueo(d: AppData, f: ArqueoForm): Result {
  const c = cuentaDe(d, f.cuentaId)
  if (!c) return { data: d, error: 'Elige la cuenta' }
  const T = today()
  if (d.cierres.some(x => x.cuentaId === c.id && x.date === T))
    return { data: d, error: 'Ya hiciste el arqueo de ' + c.nombre + ' hoy. Elimínalo en la pestaña Arqueos si quieres repetirlo.' }
  const contado = f.conteo ? totalConteo(f.conteo) : num(f.contado)
  if (f.contado.trim() === '' && !f.conteo) return { data: d, error: 'Escribe cuánto dinero hay realmente' }
  const sistema = saldoAl(libroCaja(d), c.id, T)
  const dif = contado - sistema
  const cierreId = uid('A-')
  const movs: MovCaja[] = dif === 0 ? [] : [{
    id: uid('M-'), date: T, cuentaId: c.id, tipo: dif > 0 ? 'ingreso' : 'egreso', origen: 'ajuste', categoria: 'Arqueo',
    concepto: (dif > 0 ? 'Sobrante' : 'Faltante') + ' en arqueo de ' + c.nombre + (f.nota.trim() ? ' · ' + f.nota.trim() : ''), val: Math.abs(dif), cierreId,
  }]
  return {
    data: {
      ...d,
      cierres: [...d.cierres, { id: cierreId, date: T, cuentaId: c.id, saldoSistema: sistema, saldoContado: contado, nota: f.nota.trim(), conteo: f.conteo }],
      movCaja: [...d.movCaja, ...movs],
    },
    msg: 'Arqueo de ' + c.nombre + ': ' + (dif === 0 ? 'cuadra exacto' : (dif > 0 ? 'sobrante de ' : 'faltante de ') + cop(Math.abs(dif)) + ' (quedó como ajuste)'),
  }
}

export function eliminarArqueo(d: AppData, id: string): Result {
  if (!d.cierres.some(x => x.id === id)) return { data: d, error: 'Arqueo no encontrado' }
  return {
    data: { ...d, cierres: d.cierres.filter(x => x.id !== id), movCaja: d.movCaja.filter(m => m.cierreId !== id) },
    msg: 'Arqueo eliminado (y su ajuste, si tenía)',
  }
}

/* ------------------------- Borrar movimiento de caja ------------------------- */

export function eliminarMovimiento(d: AppData, id: string): Result {
  const grupo = grupoMovimiento(d.movCaja, id)
  if (!grupo.length) return { data: d, error: 'Movimiento no encontrado' }
  if (grupo[0].cierreId) return eliminarArqueo(d, grupo[0].cierreId)
  const ids = new Set(grupo.map(m => m.id))
  return {
    data: { ...d, movCaja: d.movCaja.filter(m => !ids.has(m.id)) },
    msg: grupo.length > 1 ? 'Traslado eliminado (salida y entrada)' : 'Movimiento eliminado',
  }
}

/* ---------------------------------- Cuentas ---------------------------------- */

export interface CuentaForm { id?: string; nombre: string; tipo: TipoCuenta; saldoInicial: string; fechaInicial: string; metodos: string[] }

export function guardarCuenta(d: AppData, f: CuentaForm): Result {
  const nombre = f.nombre.trim()
  if (!nombre) return { data: d, error: 'Escribe el nombre de la cuenta' }
  if (d.cuentas.some(c => c.id !== f.id && norm(c.nombre) === norm(nombre))) return { data: d, error: 'Ya existe una cuenta llamada ' + nombre }
  if (!f.fechaInicial) return { data: d, error: 'Elige la fecha de apertura' }
  const firstMov = d.movCaja.filter(m => m.cuentaId === f.id).map(m => m.date).sort()[0]
  if (f.id && firstMov && f.fechaInicial > firstMov)
    return { data: d, error: 'Hay movimientos de caja desde el ' + firstMov + '. La apertura no puede ser posterior.' }
  const cuenta: CuentaDinero = { id: f.id ?? uid('cta-'), nombre, tipo: f.tipo, saldoInicial: num(f.saldoInicial), fechaInicial: f.fechaInicial, metodos: f.metodos }
  // Cada medio de pago entra a una sola cuenta: se le quita a las demás
  const otras = d.cuentas.filter(c => c.id !== cuenta.id).map(c => ({ ...c, metodos: c.metodos.filter(m => !f.metodos.includes(m)) }))
  const cuentas = f.id ? d.cuentas.map(c => (c.id === f.id ? cuenta : otras.find(o => o.id === c.id)!)) : [...otras, cuenta]
  return { data: { ...d, cuentas }, msg: 'Cuenta ' + nombre + (f.id ? ' actualizada' : ' creada') }
}

export function eliminarCuenta(d: AppData, id: string): Result {
  const c = cuentaDe(d, id)
  if (!c) return { data: d, error: 'Cuenta no encontrada' }
  if (d.cuentas.length <= 1) return { data: d, error: 'Debe quedar al menos una cuenta' }
  if (c.metodos.length) return { data: d, error: 'Primero asigna sus medios de pago (' + c.metodos.join(', ') + ') a otra cuenta' }
  if (d.movCaja.some(m => m.cuentaId === id) || d.cierres.some(x => x.cuentaId === id))
    return { data: d, error: c.nombre + ' tiene movimientos o arqueos. Elimínalos primero.' }
  return { data: { ...d, cuentas: d.cuentas.filter(x => x.id !== id) }, msg: 'Cuenta ' + c.nombre + ' eliminada' }
}
