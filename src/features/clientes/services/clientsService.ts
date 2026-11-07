import type { AppData, Cliente } from '../../../types'
import type { Result } from '../../../store/AppStore'
import { today } from '../../../lib/dates'
import { norm, uid } from '../../../lib/format'

export type ClientForm = Pick<Cliente, 'name' | 'phone' | 'doc' | 'city' | 'note'> & { id?: string }

/** Elimina el cliente. Si tiene saldo pendiente no se permite. Sus ventas quedan como historial. */
export function deleteClient(d: AppData, id: string, hasDebt: boolean): Result {
  const c = d.clientes.find(x => x.id === id)
  if (!c) return { data: d, error: 'Cliente no encontrado' }
  if (hasDebt) return { data: d, error: c.name + ' tiene saldo pendiente en cartera. Salda o elimina esas cuentas primero.' }
  return {
    data: {
      ...d,
      clientes: d.clientes.filter(x => x.id !== id),
      sales: d.sales.map(s => (s.clientId === id ? { ...s, clientId: null } : s)),
      cartera: d.cartera.map(x => (x.clientId === id ? { ...x, clientId: null } : x)),
    },
    msg: 'Cliente ' + c.name + ' eliminado',
  }
}

export function saveClient(d: AppData, f: ClientForm): Result {
  const name = f.name.trim()
  if (!name) return { data: d, error: 'Escribe el nombre del cliente' }
  const dup = d.clientes.find(c => c.id !== f.id && norm(c.name).trim() === norm(name))
  if (dup) return { data: d, error: 'Ya existe un cliente llamado ' + dup.name }
  const info = { name, phone: f.phone.trim(), doc: f.doc.trim(), city: f.city.trim(), note: f.note.trim() }
  if (f.id) {
    return {
      data: {
        ...d,
        clientes: d.clientes.map(c => (c.id === f.id ? { ...c, ...info } : c)),
        sales: d.sales.map(s => (s.clientId === f.id ? { ...s, client: name, phone: info.phone } : s)),
        cartera: d.cartera.map(c => (c.clientId === f.id ? { ...c, client: name, phone: info.phone || c.phone } : c)),
      },
      msg: 'Datos de ' + name + ' actualizados',
    }
  }
  const c: Cliente = { id: uid('K'), created: today(), ...info }
  return { data: { ...d, clientes: [c, ...d.clientes] }, msg: 'Cliente ' + name + ' creado' }
}
