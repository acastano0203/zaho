import type { AppData } from '../../../../domain/entities'
import type { Result } from '../../../store/AppStore'
import { uid } from '../../../../shared/lib/format'

export interface CategoryForm { id?: string; name: string }

/** "  zapatos   deportivos " → "Zapatos deportivos" */
export const cleanCategory = (s: string) => {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.charAt(0).toLocaleUpperCase('es') + t.slice(1)
}
const key = (s: string) => s.trim().toLocaleLowerCase('es')

/** ¿Es una categoría de calzado? (para sugerir tallas numéricas) */
export const isShoes = (cat: string) => /zapat|calzad|tenis|sandal|bot[ai]/i.test(cat)

export function saveCategory(d: AppData, f: CategoryForm): Result {
  const name = cleanCategory(f.name)
  if (!name) return { data: d, error: 'Escribe el nombre de la categoría' }
  if (d.categories.some(c => c.id !== f.id && key(c.name) === key(name))) return { data: d, error: 'Ya existe la categoría ' + name }
  if (!f.id) return { data: { ...d, categories: [...d.categories, { id: uid('c'), name }] }, msg: 'Categoría ' + name + ' creada' }
  const old = d.categories.find(c => c.id === f.id)
  if (!old) return { data: d, error: 'Categoría no encontrada' }
  // Los productos guardan la categoría por nombre: se renombra en cascada
  return {
    data: {
      ...d,
      categories: d.categories.map(c => (c.id === f.id ? { ...c, name } : c)),
      products: d.products.map(p => (p.cat === old.name ? { ...p, cat: name } : p)),
    },
    msg: old.name === name ? 'Categoría ' + name + ' actualizada' : 'Categoría ' + old.name + ' → ' + name,
  }
}

export function deleteCategory(d: AppData, id: string): Result {
  const c = d.categories.find(x => x.id === id)
  if (!c) return { data: d, error: 'Categoría no encontrada' }
  const n = d.products.filter(p => p.cat === c.name).length
  if (n) return { data: d, error: c.name + ' tiene ' + n + (n === 1 ? ' producto' : ' productos') + '. Cámbialos de categoría primero.' }
  return { data: { ...d, categories: d.categories.filter(x => x.id !== id) }, msg: 'Categoría ' + c.name + ' eliminada' }
}
