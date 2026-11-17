import type { CierreCaja, CuentaDinero, MovCaja, TipoCuenta } from '../../../domain/entities'
import type { CajaRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'

const n = (v: unknown) => Number(v ?? 0)
const TIPO: Record<string, TipoCuenta> = { efectivo: 'efectivo', billetera: 'billetera', banco: 'banco' }

interface CuentaRow { id: string; nombre: string; tipo: string; saldo_inicial: number | string; fecha_inicial: string; metodos_pago: { nombre: string }[] }
interface MovRow { id: string; fecha: string; cuenta_id: string; tipo: 'ingreso' | 'egreso'; origen: MovCaja['origen']; categoria: string; concepto: string; valor: number | string; traslado_id: string | null; cierre_id: string | null }
interface CierreRow { id: string; fecha: string; cuenta_id: string; saldo_sistema: number | string; saldo_contado: number | string; nota: string | null; conteo: Record<string, number> | null }

/** Caja: cuentas de dinero, movimientos propios (otros ingresos, traslados, ajustes) y arqueos */
export class SupabaseCaja implements CajaRepository {
  async snapshot() {
    const db = supabase()
    const [cuentas, movs, cierres] = await Promise.all([
      db.from('cuentas_dinero').select('id, nombre, tipo, saldo_inicial, fecha_inicial, metodos_pago(nombre)').eq('activa', true).order('orden').then(r => unwrap(r) as CuentaRow[]),
      db.from('movimientos_caja').select('id, fecha, cuenta_id, tipo, origen, categoria, concepto, valor, traslado_id, cierre_id').order('created_at').then(r => unwrap(r) as MovRow[]),
      db.from('cierres_caja').select('id, fecha, cuenta_id, saldo_sistema, saldo_contado, nota, conteo').order('created_at').then(r => unwrap(r) as CierreRow[]),
    ])
    return {
      cuentas: cuentas.map((c): CuentaDinero => ({
        id: c.id, nombre: c.nombre, tipo: TIPO[c.tipo] ?? 'efectivo', saldoInicial: n(c.saldo_inicial), fechaInicial: c.fecha_inicial,
        metodos: (c.metodos_pago ?? []).map(m => m.nombre),
      })),
      movCaja: movs.map((m): MovCaja => ({
        id: m.id, date: m.fecha, cuentaId: m.cuenta_id, tipo: m.tipo, origen: m.origen, categoria: m.categoria, concepto: m.concepto, val: n(m.valor),
        trasladoId: m.traslado_id ?? undefined, cierreId: m.cierre_id ?? undefined,
      })),
      cierres: cierres.map((x): CierreCaja => ({
        id: x.id, date: x.fecha, cuentaId: x.cuenta_id, saldoSistema: n(x.saldo_sistema), saldoContado: n(x.saldo_contado), nota: x.nota ?? '',
        conteo: x.conteo ?? undefined,
      })),
    }
  }

  async addMovement(m: Omit<MovCaja, 'id'>) {
    unwrap(await supabase().from('movimientos_caja').insert({
      fecha: m.date, cuenta_id: m.cuentaId, tipo: m.tipo, origen: m.origen, categoria: m.categoria, concepto: m.concepto, valor: m.val,
    }))
  }

  async transfer(desde: string, hasta: string, val: number, date: string, concepto: string) {
    unwrap(await supabase().rpc('registrar_traslado', { p_desde: desde, p_hasta: hasta, p_valor: val, p_fecha: date, p_concepto: concepto || null }))
  }

  async count(cuentaId: string, contado: number, conteo: Record<string, number> | undefined, nota: string) {
    unwrap(await supabase().rpc('registrar_arqueo', { p_cuenta: cuentaId, p_contado: contado, p_conteo: conteo ?? null, p_nota: nota || null }))
  }

  /** El ajuste del arqueo se borra en cascada */
  async removeCount(id: string) {
    unwrap(await supabase().from('cierres_caja').delete().eq('id', id))
  }

  /** Si es un traslado, un trigger borra también la otra pata */
  async removeMovement(id: string) {
    unwrap(await supabase().from('movimientos_caja').delete().eq('id', id))
  }

  async saveAccount(c: CuentaDinero, isNew: boolean) {
    const db = supabase()
    const row = { nombre: c.nombre, tipo: c.tipo, saldo_inicial: c.saldoInicial, fecha_inicial: c.fechaInicial }
    const id = isNew
      ? (unwrap(await db.from('cuentas_dinero').insert(row).select('id').single()) as { id: string }).id
      : (unwrap(await db.from('cuentas_dinero').update(row).eq('id', c.id)), c.id)
    // Cada medio de pago entra a una sola cuenta
    if (!isNew) unwrap(await db.from('metodos_pago').update({ cuenta_id: null }).eq('cuenta_id', id))
    if (c.metodos.length) unwrap(await db.from('metodos_pago').update({ cuenta_id: id }).in('nombre', c.metodos))
  }

  async removeAccount(id: string) {
    unwrap(await supabase().from('cuentas_dinero').delete().eq('id', id))
  }
}
