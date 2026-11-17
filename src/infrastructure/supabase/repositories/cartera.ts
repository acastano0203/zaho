import type { CarteraRepository, PlanInput, RegisterPaymentCommand } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import { cuotasToJson, toCartera, type CuentaRow } from '../mappers'
import type { SupabaseCatalog } from './catalog'

const SELECT = `
  id, tipo, cliente_id, cliente_nombre, telefono, comercial_id, fecha_creacion, fecha_vencimiento, valor_total, concepto, nota, metodo_pago_id,
  ventas(codigo), salidas(codigo),
  abonos(id, fecha, valor, etiqueta, metodo_pago_id, plan_id, created_at, abono_aplicaciones(cuota_id, valor)),
  planes_pago(id, vigente, created_at, cuotas(id, numero, fecha_vencimiento, valor)),
  recargos_cartera(id, fecha, tipo, porcentaje, base, valor, nota, created_at, cuotas(numero)),
  gestiones_cobro(fecha, tipo, nota, fecha_promesa, created_at)`

export class SupabaseCartera implements CarteraRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list() {
    const [rows, metodo] = await Promise.all([
      supabase().from('cuentas_cobrar').select(SELECT).order('numero').then(r => unwrap(r) as unknown as CuentaRow[]),
      this.catalog.namer('metodos_pago'),
    ])
    return rows.map(r => toCartera(r, metodo))
  }

  async registerPayment(c: RegisterPaymentCommand) {
    let aplicaciones: { cuota_id: string; valor: number }[] = []
    if (c.allocations.length) {
      const cuotas = unwrap(await supabase().from('cuotas')
        .select('id, numero, planes_pago!inner(cuenta_id, vigente)')
        .eq('planes_pago.cuenta_id', c.accountId).eq('planes_pago.vigente', true)) as unknown as { id: string; numero: number }[]
      aplicaciones = c.allocations.map(a => {
        const q = cuotas.find(x => x.numero === a.n)
        if (!q) throw new Error('Cuota ' + a.n + ' no encontrada')
        return { cuota_id: q.id, valor: a.val }
      })
    }
    return unwrap(await supabase().rpc('registrar_abono', {
      p_cuenta: c.accountId, p_valor: c.amount, p_metodo: await this.catalog.idOf('metodos_pago', c.method),
      p_aplicaciones: aplicaciones, p_etiqueta: c.label ?? 'Abono',
    })) as string
  }

  async applyPlan(accountId: string, plan: PlanInput, note: string) {
    unwrap(await supabase().rpc('aplicar_plan', { p_cuenta: accountId, p_frecuencia: plan.freq, p_cuotas: cuotasToJson(plan.cuotas), p_nota: note }))
  }

  async addFollowUp(accountId: string, tipo: string, nota: string, promesa?: string | null) {
    unwrap(await supabase().from('gestiones_cobro').insert({ cuenta_id: accountId, tipo, nota, fecha_promesa: promesa || null }))
  }

  async addLateFee(accountId: string, f: { tipo: 'pct' | 'valor'; pct?: number; base: number; val: number; cuota?: number; nota: string }) {
    unwrap(await supabase().rpc('registrar_recargo', {
      p_cuenta: accountId, p_tipo: f.tipo === 'pct' ? 'porcentaje' : 'valor', p_porcentaje: f.pct ?? null,
      p_base: f.base, p_valor: f.val, p_cuota_numero: f.cuota ?? null, p_nota: f.nota,
    }))
  }

  async removeLateFee(id: string) {
    unwrap(await supabase().from('recargos_cartera').delete().eq('id', id))
  }

  async createManual(i: Parameters<CarteraRepository['createManual']>[0]) {
    return unwrap(await supabase().rpc('registrar_cuenta_manual', {
      p: {
        cliente_id: i.clientId, cliente_nombre: i.client, telefono: i.phone, comercial_id: i.comercialId, valor_total: i.total,
        concepto: i.concepto, nota: i.nota, fecha: i.date, fecha_vencimiento: i.due, abono_inicial: i.initialPayment,
        metodo_pago_id: await this.catalog.idOf('metodos_pago', i.method),
        plan: i.plan ? { frecuencia: i.plan.freq, cuotas: cuotasToJson(i.plan.cuotas) } : null,
      },
    })) as string
  }

  async update(id: string, p: { client?: string; phone?: string; nota?: string; concepto?: string; total?: number; due?: string; cuota?: { id: string; amount: number } }) {
    const row = unwrap(await supabase().from('cuentas_cobrar')
      .update({
        ...(p.client !== undefined && { cliente_nombre: p.client }), ...(p.phone !== undefined && { telefono: p.phone }),
        ...(p.nota !== undefined && { nota: p.nota }), ...(p.concepto !== undefined && { concepto: p.concepto }),
        ...(p.total !== undefined && { valor_total: p.total }), ...(p.due !== undefined && { fecha_vencimiento: p.due }),
      })
      .eq('id', id).select('tipo, salida_id').single()) as { tipo: string; salida_id: string | null }
    // Cambió el total con plan vigente: la última cuota absorbe la diferencia
    if (p.cuota) unwrap(await supabase().from('cuotas').update({ valor: p.cuota.amount }).eq('id', p.cuota.id))
    // El préstamo mantiene sincronizada su salida de dinero
    if (row.tipo === 'prestamo' && row.salida_id && (p.total !== undefined || p.client !== undefined))
      unwrap(await supabase().from('salidas').update({
        ...(p.total !== undefined && { valor: p.total }),
        ...(p.client !== undefined && { beneficiario: p.client, descripcion: 'Préstamo a ' + p.client }),
      }).eq('id', row.salida_id))
  }

  async remove(id: string) {
    const c = unwrap(await supabase().from('cuentas_cobrar').select('salida_id').eq('id', id).single()) as { salida_id: string | null }
    // Si es un préstamo se borra su salida (y la cuenta cae en cascada)
    if (c.salida_id) unwrap(await supabase().from('salidas').delete().eq('id', c.salida_id))
    else unwrap(await supabase().from('cuentas_cobrar').delete().eq('id', id))
  }
}
