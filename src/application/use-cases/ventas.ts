import type { Freq, PayMode, SaleItem } from '../../domain/entities'
import { planPreview, saleTotal } from '../../domain/rules/finance'
import type { Repositories } from '../ports/repositories'
import { attempt, fail, type UseCaseResult } from './result'
import { cop } from '../../shared/lib/format'

export interface RegisterSaleInput {
  clientId: string | null
  client: string
  phone: string
  comercialId: string | null
  items: SaleItem[]
  pay: PayMode
  due: string
  initialPayment: number
  method: string
  planMode: 'single' | 'multi'
  n: number
  freq: Freq
  first: string
}

/** Valida con reglas de dominio y delega la persistencia atómica al repositorio (RPC registrar_venta). */
export async function registerSale(r: Repositories, input: RegisterSaleInput): Promise<UseCaseResult<string>> {
  if (!input.items.length) return fail('Agrega al menos un producto')
  if (input.pay === 'credito' && !input.clientId) return fail('Elige o crea el cliente para vender a crédito')

  const total = saleTotal({ items: input.items })
  let plan = null
  if (input.pay === 'credito') {
    const saldo = total - Math.min(input.initialPayment, total)
    plan = input.planMode === 'multi' && saldo > 0 ? { freq: input.freq, cuotas: planPreview(saldo, input.n, input.freq, input.first) } : null
  }

  return attempt(
    () => r.sales.register({
      clientId: input.clientId,
      client: input.client.trim() || 'Cliente mostrador',
      phone: input.phone,
      comercialId: input.comercialId,
      pay: input.pay,
      items: input.items,
      due: input.due,
      initialPayment: input.initialPayment,
      paymentMethod: input.method,
      plan,
    }),
    () => 'Venta registrada · ' + cop(total) + (input.pay === 'credito' ? ' · creada en Cartera' : ''),
  )
}

export const cancelSale = (r: Repositories, saleId: string) =>
  attempt(() => r.sales.cancel(saleId), 'Venta anulada · stock devuelto al inventario')
