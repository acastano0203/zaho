import type { AppData } from '../../../../domain/entities'
import type { Result } from '../../../store/AppStore'
import { uid } from '../../../../shared/lib/format'

export interface BrandForm { id?: string; name: string; color: string }

const norm = (s: string) => s.trim().toLocaleLowerCase('es')

export function saveBrand(d: AppData, f: BrandForm): Result {
  const name = f.name.trim().replace(/\s+/g, ' ')
  if (!name) return { data: d, error: 'Escribe el nombre de la marca' }
  if (d.brands.some(b => b.id !== f.id && norm(b.name) === norm(name))) return { data: d, error: 'Ya existe la marca ' + name }
  if (!f.id) return { data: { ...d, brands: [...d.brands, { id: uid('b'), name, color: f.color }] }, msg: 'Marca ' + name + ' creada' }

  const old = d.brands.find(b => b.id === f.id)
  if (!old) return { data: d, error: 'Marca no encontrada' }
  // Productos y proveedores guardan la marca por nombre: se renombra en cascada
  const ren = (n: string) => (n === old.name ? name : n)
  return {
    data: {
      ...d,
      brands: d.brands.map(b => (b.id === f.id ? { ...b, name, color: f.color } : b)),
      products: old.name === name ? d.products : d.products.map(p => ({ ...p, brand: ren(p.brand) })),
      suppliers: old.name === name ? d.suppliers : d.suppliers.map(s => ({ ...s, brands: s.brands.map(ren) })),
    },
    msg: 'Marca ' + name + ' actualizada',
  }
}

export function deleteBrand(d: AppData, id: string): Result {
  const b = d.brands.find(x => x.id === id)
  if (!b) return { data: d, error: 'Marca no encontrada' }
  const n = d.products.filter(p => p.brand === b.name).length
  if (n) return { data: d, error: b.name + ' tiene ' + n + (n === 1 ? ' producto' : ' productos') + ' en inventario. Cámbialos de marca o elimínalos primero.' }
  const sup = d.suppliers.find(s => s.brands.includes(b.name))
  if (sup) return { data: d, error: b.name + ' la surte ' + sup.name + '. Quítala del proveedor primero.' }
  return { data: { ...d, brands: d.brands.filter(x => x.id !== id) }, msg: 'Marca ' + b.name + ' eliminada' }
}
