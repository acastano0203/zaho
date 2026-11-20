import type { AppData, DocTipo } from '../../../../domain/entities'
import { isEmail } from '../../../../domain/rules/documentos'
import type { Result } from '../../../store/AppStore'
import { uid } from '../../../../shared/lib/format'

export interface SupplierForm {
  id?: string; name: string; brands: string[]; contact: string; wa: string
  docType: DocTipo; doc: string; email: string; address: string
}

/** Datos limpios del formulario, tal como se guardan */
export const supplierInfo = (f: SupplierForm) => ({
  name: f.name.trim(), brands: f.brands, contact: f.contact.trim(), wa: f.wa.trim(),
  docType: f.docType, doc: f.doc.replace(/\D/g, ''), email: f.email.trim().toLowerCase(), address: f.address.trim().replace(/\s+/g, ' '),
})

export function saveSupplier(d: AppData, f: SupplierForm): Result {
  if (!f.name.trim()) return { data: d, error: 'Escribe el nombre del proveedor' }
  if (!f.brands.length) return { data: d, error: 'Elige al menos una marca' }
  const info = supplierInfo(f)
  if (info.doc && (info.doc.length < (info.docType === 'nit' ? 8 : 6) || info.doc.length > (info.docType === 'nit' ? 10 : 11)))
    return { data: d, error: info.docType === 'nit' ? 'El NIT debe tener entre 8 y 10 dígitos (sin el dígito de verificación)' : 'La cédula debe tener entre 6 y 11 dígitos' }
  if (info.doc && d.suppliers.some(s => s.id !== f.id && s.doc === info.doc)) return { data: d, error: 'Ya hay un proveedor con ese documento' }
  if (info.email && !isEmail(info.email)) return { data: d, error: 'El correo electrónico no es válido' }
  if (f.id) return { data: { ...d, suppliers: d.suppliers.map(s => (s.id === f.id ? { ...s, ...info } : s)) }, msg: 'Proveedor ' + info.name + ' actualizado' }
  return { data: { ...d, suppliers: [...d.suppliers, { id: uid('s'), ...info }] }, msg: 'Proveedor ' + info.name + ' creado' }
}

export function deleteSupplier(d: AppData, id: string): Result {
  const s = d.suppliers.find(x => x.id === id)
  if (!s) return { data: d, error: 'Proveedor no encontrado' }
  if (d.orders.some(o => o.sup === id && o.status !== 'Recibido'))
    return { data: d, error: s.name + ' tiene pedidos en curso. Recíbelos o elimínalos primero.' }
  return { data: { ...d, suppliers: d.suppliers.filter(x => x.id !== id) }, msg: 'Proveedor ' + s.name + ' eliminado' }
}
