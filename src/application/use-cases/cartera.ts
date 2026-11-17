import type { CarRow, Freq } from '../../domain/entities'
import { allocate, planPreview } from '../../domain/rules/finance'
import type { Repositories } from '../ports/repositories'
import { attempt, fail, type UseCaseResult } from './result'
import { cop } from '../../shared/lib/format'
import { fd } from '../../shared/lib/dates'

/**
 * Registra un abono. El reparto entre cuotas lo decide el DOMINIO (allocate)
 * y la infraestructura solo lo persiste.
 */
export async function registerPayment(
  r: Repositories, row: CarRow, amount: number, method: string, mode: 'auto' | 'manual', selected: number[],
): Promise<UseCaseResult<string>> {
  if (!amount) return fail('Escribe el valor del abono')
  if (row.saldo <= 0) return fail('La cuenta ya está saldada')
  const pend = row.cu.filter(q => q.paid < q.amount)
  if (mode === 'manual' && !selected.length && pend.length > 1) return fail('Toca al menos una cuota')

  const a = allocate(row, amount, mode, selected)
  const allocations = row.hasPlan
    ? Object.entries(a.map).map(([n, val]) => ({ n: Number(n), val })).sort((x, y) => x.n - y.n)
    : []
  const done = row.saldo - a.applied <= 0

  return attempt(
    () => r.cartera.registerPayment({ accountId: row.c.id, amount: a.applied, method, allocations }),
    'Abono de ' + cop(a.applied) + (done ? ' · cuenta saldada' : ' registrado'),
  )
}

const FREQ_PL: Record<Freq, string> = { semanal: 'semanales', quincenal: 'quincenales', mensual: 'mensuales' }

export async function applyPaymentPlan(r: Repositories, row: CarRow, n: number, freq: Freq, first: string): Promise<UseCaseResult<void>> {
  if (row.saldo <= 0) return fail('La cuenta no tiene saldo')
  const cuotas = planPreview(row.saldo, n, freq, first)
  const nota = 'Plan de pagos: ' + (cuotas.length === 1 ? '1 cuota' : cuotas.length + ' cuotas ' + FREQ_PL[freq]) + ' de ' + cop(cuotas[0].amount)
  return attempt(() => r.cartera.applyPlan(row.c.id, { freq, cuotas }, nota), 'Plan aplicado, primera cuota el ' + fd(cuotas[0].due))
}

export async function saveFollowUp(r: Repositories, accountId: string, tipo: string, nota: string, promesa: string): Promise<UseCaseResult<void>> {
  if (!nota.trim() && !promesa) return fail('Escribe qué pasó o una fecha de promesa')
  return attempt(
    () => r.cartera.addFollowUp(accountId, tipo, nota.trim() || 'Promesa de pago', promesa || null),
    promesa ? 'Gestión guardada · promesa para el ' + fd(promesa) : 'Gestión guardada',
  )
}
