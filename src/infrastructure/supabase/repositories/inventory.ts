import type { OrderLine } from '../../../domain/entities'
import type { OrderRepository, ProductCommand, ProductRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import { splitProductKey, toOrder, toProduct, type InventarioRow, type PedidoRow } from '../mappers'
import type { SupabaseCatalog } from './catalog'

export class SupabaseProducts implements ProductRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list() {
    const rows = unwrap(await supabase().from('v_inventario').select('*').order('nombre')) as InventarioRow[]
    return rows.map(toProduct)
  }

  async create(c: ProductCommand) {
    const [marca, categoria, bodega] = await Promise.all([
      this.catalog.idOf('marcas', c.brand), this.catalog.idOf('categorias', c.cat), this.catalog.idOf('bodegas', c.warehouse),
    ])
    return unwrap(await supabase().rpc('crear_producto', {
      p_producto: { codigo: c.code, nombre: c.name, marca_id: marca, categoria_id: categoria, talla: c.size, color: c.color, costo: c.cost, precio: c.price },
      p_bodega: bodega, p_stock: c.stock, p_minimo: c.min,
    })) as string
  }

  async update(key: string, c: Omit<ProductCommand, 'warehouse' | 'stock'>) {
    const { skuId, whId } = splitProductKey(key)
    const [marca, categoria] = await Promise.all([this.catalog.idOf('marcas', c.brand), this.catalog.idOf('categorias', c.cat)])
    unwrap(await supabase().from('productos').update({
      codigo: c.code, nombre: c.name, marca_id: marca, categoria_id: categoria, talla: c.size, color: c.color, costo: c.cost, precio: c.price,
    }).eq('id', skuId))
    unwrap(await supabase().from('existencias').update({ stock_minimo: c.min }).eq('producto_id', skuId).eq('bodega_id', whId))
  }

  async remove(key: string) {
    unwrap(await supabase().from('productos').delete().eq('id', splitProductKey(key).skuId))
  }

  async adjustStock(key: string, newStock: number, reason: string) {
    const { skuId, whId } = splitProductKey(key)
    unwrap(await supabase().rpc('ajustar_stock', { p_producto: skuId, p_bodega: whId, p_nuevo_stock: newStock, p_motivo: reason }))
  }

  async transfer(key: string, toWarehouse: string, qty: number) {
    const { skuId, whId } = splitProductKey(key)
    const hasta = await this.catalog.idOf('bodegas', toWarehouse)
    unwrap(await supabase().rpc('trasladar_stock', { p_producto: skuId, p_desde: whId, p_hasta: hasta, p_cantidad: qty }))
  }
}

/** Una fila por referencia (la BD no admite la misma referencia dos veces en un pedido) */
function itemsBySku(lines: OrderLine[]) {
  const m = new Map<string, number>()
  for (const l of lines) if (l.qty > 0) { const { skuId } = splitProductKey(l.pid); m.set(skuId, (m.get(skuId) ?? 0) + l.qty) }
  return [...m].map(([producto_id, cantidad]) => ({ producto_id, cantidad }))
}

export class SupabaseOrders implements OrderRepository {
  constructor(private catalog: SupabaseCatalog) {}

  private async idByCode(codigo: string) {
    const r = unwrap(await supabase().from('pedidos').select('id').eq('codigo', codigo).single()) as { id: string }
    return r.id
  }

  async list() {
    const [rows, bodega] = await Promise.all([
      supabase().from('pedidos')
        .select('codigo, fecha, proveedor_id, bodega_destino_id, estado, automatico, pedido_items(producto_id, cantidad)')
        .order('numero', { ascending: false }).then(unwrap) as Promise<PedidoRow[]>,
      this.catalog.namer('bodegas'),
    ])
    return rows.map(r => ({ ...toOrder(r), wh: bodega(r.bodega_destino_id) }))
  }

  async send(supplierId: string, lines: OrderLine[], warehouse: string) {
    const items = itemsBySku(lines)
    if (!items.length) throw new Error('El pedido no tiene productos')
    const bodega = await this.catalog.idOf('bodegas', warehouse)
    const p = unwrap(await supabase().from('pedidos')
      .insert({ proveedor_id: supplierId, bodega_destino_id: bodega }).select('id, codigo').single()) as { id: string; codigo: string }
    unwrap(await supabase().from('pedido_items').insert(items.map(i => ({ pedido_id: p.id, ...i }))))
    return p.codigo
  }

  async updateLines(codigo: string, lines: OrderLine[]) {
    const id = await this.idByCode(codigo)
    unwrap(await supabase().from('pedido_items').delete().eq('pedido_id', id))
    unwrap(await supabase().from('pedido_items').insert(itemsBySku(lines).map(i => ({ pedido_id: id, ...i }))))
  }

  async advance(codigo: string) {
    unwrap(await supabase().rpc('avanzar_pedido', { p_pedido: await this.idByCode(codigo) }))
  }

  /** La BD suma lo recibido a la existencia de la bodega de llegada (stock + recibido) */
  async receive(codigo: string, received: OrderLine[]) {
    unwrap(await supabase().rpc('recibir_pedido', { p_pedido: await this.idByCode(codigo), p_items: itemsBySku(received) }))
  }

  async remove(codigo: string) {
    unwrap(await supabase().from('pedidos').delete().eq('codigo', codigo))
  }
}
