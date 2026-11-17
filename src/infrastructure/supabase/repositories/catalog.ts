import type { CatalogRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'

type Kind = 'marcas' | 'categorias' | 'bodegas' | 'metodos_pago'
type Row = { id: string; nombre: string }

/**
 * Catálogos con caché en memoria: los repositorios los usan para
 * traducir nombres (lo que maneja la UI) a ids (lo que guarda la BD).
 */
export class SupabaseCatalog implements CatalogRepository {
  private cache = new Map<Kind, Promise<Row[]>>()

  private rows(kind: Kind): Promise<Row[]> {
    const cached = this.cache.get(kind)
    if (cached) return cached
    const fetchRows = async () => {
      const q = supabase().from(kind).select('id, nombre').eq('activo', true)
      return unwrap(await (kind === 'metodos_pago' ? q.order('orden') : q.order('nombre'))) as Row[]
    }
    const p = fetchRows()
    p.catch(() => this.cache.delete(kind))
    this.cache.set(kind, p)
    return p
  }

  invalidate(kind?: Kind) { if (kind) this.cache.delete(kind); else this.cache.clear() }

  async idOf(kind: Kind, nombre: string | undefined | null): Promise<string | null> {
    if (!nombre) return null
    const r = (await this.rows(kind)).find(x => x.nombre === nombre)
    if (!r) throw new Error('No existe "' + nombre + '" en ' + kind.replace('_', ' '))
    return r.id
  }

  /** Resolutor síncrono id → nombre (para mappers) */
  async namer(kind: Kind) {
    const map = new Map((await this.rows(kind)).map(r => [r.id, r.nombre]))
    return (id: string | null) => (id ? map.get(id) : undefined)
  }

  brands = async () => (await this.rows('marcas')).map(r => r.nombre)
  categories = async () => (await this.rows('categorias')).map(r => r.nombre)
  warehouses = async () => (await this.rows('bodegas')).map(r => r.nombre)
  paymentMethods = async () => (await this.rows('metodos_pago')).map(r => r.nombre)
}
