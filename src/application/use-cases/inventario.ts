import type { Product } from '../../domain/entities'
import type { ProductCommand, Repositories } from '../ports/repositories'
import { attempt, fail, type UseCaseResult } from './result'

export async function createProduct(r: Repositories, cmd: ProductCommand): Promise<UseCaseResult<string>> {
  if (!cmd.name.trim() || !cmd.price) return fail('Nombre y precio son obligatorios')
  return attempt(() => r.products.create({ ...cmd, name: cmd.name.trim(), color: cmd.color.trim() || '—' }), 'Producto ' + cmd.code + ' creado')
}

export const adjustStock = (r: Repositories, p: Product, qty: number, reason: string) =>
  attempt(() => r.products.adjustStock(p.id, qty, reason), 'Stock de ' + p.name + ' T' + p.size + ': ' + p.stock + ' → ' + qty + ' (' + reason + ')')

export async function transferStock(r: Repositories, p: Product, toWarehouse: string, qty: number): Promise<UseCaseResult<void>> {
  if (!qty || qty > p.stock) return fail('Hay ' + p.stock + ' und disponibles en ' + p.wh)
  if (toWarehouse === p.wh) return fail('Elige una bodega distinta')
  return attempt(() => r.products.transfer(p.id, toWarehouse, qty), qty + ' und de ' + p.name + ' trasladadas a ' + toWarehouse)
}

export const advanceOrder = (r: Repositories, orderId: string) => attempt(() => r.orders.advance(orderId), 'Pedido actualizado')
