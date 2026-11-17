import type { RegisterSaleCommand, SaleRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import { cuotasToJson, splitProductKey, toSale, type VentaRow } from '../mappers'
import type { SupabaseCatalog } from './catalog'

export class SupabaseSales implements SaleRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list() {
    const rows = unwrap(await supabase().from('ventas')
      .select('id, codigo, fecha, cliente_id, cliente_nombre, telefono, comercial_id, forma_pago, metodo_pago_id, venta_items(producto_id, bodega_id, cantidad, precio_base)')
      .order('fecha', { ascending: false })
      .order('numero', { ascending: false })) as VentaRow[]
    const metodo = await this.catalog.namer('metodos_pago')
    return rows.map(r => ({ ...toSale(r), met: metodo(r.metodo_pago_id) }))
  }

  /** Una sola llamada RPC: venta + items + kardex + cartera + plan, todo o nada. */
  async register(c: RegisterSaleCommand) {
    // Contado: a qué cuenta de caja entra · Crédito: medio del abono inicial
    const metodo = await this.catalog.idOf('metodos_pago', c.paymentMethod || 'Efectivo')
    const id = unwrap(await supabase().rpc('registrar_venta', {
      p_venta: {
        cliente_id: c.clientId, cliente_nombre: c.client, telefono: c.phone, comercial_id: c.comercialId || null,
        forma_pago: c.pay,
        items: c.items.map(i => { const k = splitProductKey(i.pid); return { producto_id: k.skuId, bodega_id: k.whId, cantidad: i.qty } }),
        fecha_vencimiento: c.due || null,
        abono_inicial: c.initialPayment ?? 0,
        metodo_pago_id: metodo,
        plan: c.plan ? { frecuencia: c.plan.freq, cuotas: cuotasToJson(c.plan.cuotas) } : null,
      },
    })) as string
    const v = unwrap(await supabase().from('ventas').select('codigo').eq('id', id).single()) as { codigo: string }
    return v.codigo
  }

  async cancel(codigo: string) {
    const v = unwrap(await supabase().from('ventas').select('id').eq('codigo', codigo).single()) as { id: string }
    unwrap(await supabase().rpc('anular_venta', { p_venta: v.id }))
  }
}
