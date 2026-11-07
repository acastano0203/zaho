import type { AppData } from '../../../types'
import type { Result } from '../../../store/AppStore'
import { uid } from '../../../lib/format'

export interface ComercialForm { id?: string; name: string; phone: string; pct: string }

/** Elimina el comercial. Sus ventas y cuentas quedan sin comercial asignado. */
export function deleteComercial(d: AppData, id: string): Result {
  const c = d.comerciales.find(x => x.id === id)
  if (!c) return { data: d, error: 'Comercial no encontrado' }
  if (d.comerciales.length <= 1) return { data: d, error: 'Debe quedar al menos un comercial para registrar ventas' }
  return {
    data: { ...d, comerciales: d.comerciales.filter(x => x.id !== id), cartera: d.cartera.map(x => (x.com === id ? { ...x, com: null } : x)) },
    msg: 'Comercial ' + c.name + ' eliminado',
  }
}

export function saveComercial(d: AppData, f: ComercialForm): Result {
  if (!f.name.trim()) return { data: d, error: 'Escribe el nombre' }
  const pct = Number(String(f.pct).replace(',', '.')) || 0
  const comerciales = f.id
    ? d.comerciales.map(c => (c.id === f.id ? { ...c, name: f.name.trim(), phone: f.phone.trim(), pct } : c))
    : d.comerciales.concat([{ id: uid('c'), name: f.name.trim(), phone: f.phone.trim(), pct }])
  return { data: { ...d, comerciales }, msg: f.id ? 'Comercial actualizado' : 'Comercial creado' }
}
