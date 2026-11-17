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

export class SupabaseOrders implements OrderRepository {
  private async idByCode(codigo: string) {
    const r = unwrap(await supabase().from('pedidos').select('id').eq('codigo', codigo).single()) as { id: string }
    return r.id
  }

  async list() {
    const rows = unwrap(await supabase().from('pedidos')
      .select('codigo, fecha, proveedor_id, bodega_destino_id, estado, automatico, pedido_items(producto_id, cantidad)')
      .order('numero', { ascending: false })) as PedidoRow[]
    return rows.map(toOrder)
  }

  async send(supplierId: string, lines: OrderLine[]) {
    if (!lines.length) throw new Error('El pedido no tiene productos')
    const bodega = splitProductKey(lines[0].pid).whId
    const p = unwrap(await supabase().from('pedidos')
      .insert({ proveedor_id: supplierId, bodega_destino_id: bodega }).select('id, codigo').single()) as { id: string; codigo: string }
    unwrap(await supabase().from('pedido_items').insert(lines.map(l => ({ pedido_id: p.id, producto_id: splitProductKey(l.pid).skuId, cantidad: l.qty }))))
    return p.codigo
  }

  async updateLines(codigo: string, lines: OrderLine[]) {
    const id = await this.idByCode(codigo)
    unwrap(await supabase().from('pedido_items').delete().eq('pedido_id', id))
    unwrap(await supabase().from('pedido_items').insert(lines.map(l => ({ pedido_id: id, producto_id: splitProductKey(l.pid).skuId, cantidad: l.qty }))))
  }

  async advance(codigo: string) {
    unwrap(await supabase().rpc('avanzar_pedido', { p_pedido: await this.idByCode(codigo) }))
  }

  async remove(codigo: string) {
    unwrap(await supabase().from('pedidos').delete().eq('codigo', codigo))
  }
}
