import type { Category } from '../../../domain/entities'
import type { CategoryRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import type { SupabaseCatalog } from './catalog'

export class SupabaseCategories implements CategoryRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list(): Promise<Category[]> {
    const rows = unwrap(await supabase().from('categorias').select('id, nombre').eq('activo', true).order('nombre')) as { id: string; nombre: string }[]
    return rows.map(r => ({ id: r.id, name: r.nombre }))
  }

  async save(c: Omit<Category, 'id'> & { id?: string }) {
    const row = { nombre: c.name.trim(), activo: true }
    try {
      if (c.id) { unwrap(await supabase().from('categorias').update(row).eq('id', c.id)); return c.id }
      // Si existió y se dio de baja, se reactiva en vez de duplicarla
      const prev = unwrap(await supabase().from('categorias').select('id').eq('nombre', row.nombre).limit(1)) as { id: string }[]
      if (prev.length) { unwrap(await supabase().from('categorias').update(row).eq('id', prev[0].id)); return prev[0].id }
      return (unwrap(await supabase().from('categorias').insert(row).select('id').single()) as { id: string }).id
    } finally { this.catalog.invalidate('categorias') }
  }

  /** Baja lógica: los productos históricos siguen apuntando a la categoría */
  async remove(id: string) {
    unwrap(await supabase().from('categorias').update({ activo: false }).eq('id', id))
    this.catalog.invalidate('categorias')
  }
}
