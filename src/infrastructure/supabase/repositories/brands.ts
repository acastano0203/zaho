import type { Brand } from '../../../domain/entities'
import type { BrandRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import type { SupabaseCatalog } from './catalog'

type Row = { id: string; nombre: string; color: string | null; activo: boolean }
const DEFAULT_COLOR = '#8A837C'

export class SupabaseBrands implements BrandRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list(): Promise<Brand[]> {
    const rows = unwrap(await supabase().from('marcas').select('id, nombre, color, activo').eq('activo', true).order('nombre')) as Row[]
    return rows.map(r => ({ id: r.id, name: r.nombre, color: r.color || DEFAULT_COLOR }))
  }

  async save(b: Omit<Brand, 'id'> & { id?: string }) {
    const row = { nombre: b.name.trim(), color: b.color, activo: true }
    try {
      if (b.id) { unwrap(await supabase().from('marcas').update(row).eq('id', b.id)); return b.id }
      // Si la marca existió y se dio de baja, se reactiva en vez de duplicarla
      const prev = unwrap(await supabase().from('marcas').select('id').eq('nombre', row.nombre).limit(1)) as { id: string }[]
      if (prev.length) { unwrap(await supabase().from('marcas').update(row).eq('id', prev[0].id)); return prev[0].id }
      return (unwrap(await supabase().from('marcas').insert(row).select('id').single()) as { id: string }).id
    } finally { this.catalog.invalidate('marcas') }
  }

  /** Baja lógica: los productos históricos siguen apuntando a la marca */
  async remove(id: string) {
    const enUso = unwrap(await supabase().from('proveedor_marcas').select('marca_id').eq('marca_id', id).limit(1)) as unknown[]
    if (enUso.length) throw new Error('La marca tiene un proveedor asignado. Quítala del proveedor primero.')
    unwrap(await supabase().from('marcas').update({ activo: false }).eq('id', id))
    this.catalog.invalidate('marcas')
  }
}
