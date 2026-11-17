import type { Freq } from '../../domain/entities'
import { planPreview } from '../../domain/rules/finance'
import type { ExpenseCommand, Repositories } from '../ports/repositories'
import { attempt, fail, type UseCaseResult } from './result'
import { cop } from '../../shared/lib/format'

export async function registerExpense(r: Repositories, cmd: ExpenseCommand): Promise<UseCaseResult<string>> {
  if (!cmd.amount) return fail('Escribe el valor del gasto')
  return attempt(() => r.salidas.createExpense({ ...cmd, desc: cmd.desc.trim() || 'Sin descripción' }), 'Gasto registrado · ' + cop(cmd.amount))
}

export interface LoanInput {
  to: string; phone: string; amount: number; method: string; date: string; due: string; note: string
  mode: 'single' | 'multi'; n: number; freq: Freq; first: string
}

/** Préstamo = salida de dinero + cuenta por cobrar, en una sola transacción (RPC registrar_prestamo). */
export async function registerLoan(r: Repositories, i: LoanInput): Promise<UseCaseResult<string>> {
  if (!i.amount) return fail('Escribe el valor prestado')
  if (!i.to.trim()) return fail('Escribe a quién le prestas')
  const plan = i.mode === 'multi' ? { freq: i.freq, cuotas: planPreview(i.amount, i.n, i.freq, i.first) } : null
  return attempt(
    () => r.salidas.registerLoan({ to: i.to.trim(), phone: i.phone, amount: i.amount, method: i.method, date: i.date, due: i.due, note: i.note, plan }),
    'Préstamo de ' + cop(i.amount) + ' a ' + i.to.trim() + ' registrado en Salidas y en Cartera',
  )
}
