import type { Salida } from '../../../domain/entities'
import type { ExpenseCommand, RegisterLoanCommand, SalidaRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import { cuotasToJson, toSalida, type SalidaRow } from '../mappers'
import type { SupabaseCatalog } from './catalog'

const BUCKET = 'comprobantes'

export class SupabaseSalidas implements SalidaRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list() {
    const [rows, metodo] = await Promise.all([
      supabase().from('salidas')
        .select('codigo, fecha, tipo, tipo_otro, descripcion, valor, metodo_pago_id, beneficiario, comprobante_path')
        .order('fecha', { ascending: false }).order('numero', { ascending: false })
        .then(r => unwrap(r) as SalidaRow[]),
      this.catalog.namer('metodos_pago'),
    ])
    return rows.map(r => toSalida(r, metodo))
  }

  private async upload(file: File) {
    const path = new Date().toISOString().slice(0, 7) + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^\w.-]/g, '_')
    unwrap(await supabase().storage.from(BUCKET).upload(path, file))
    return path
  }

  async createExpense(c: ExpenseCommand) {
    const comprobante = c.file ? await this.upload(c.file) : null
    const r = unwrap(await supabase().from('salidas').insert({
      fecha: c.date, tipo: c.tipo, tipo_otro: c.otro || null, descripcion: c.desc, valor: c.amount,
      metodo_pago_id: await this.catalog.idOf('metodos_pago', c.method), comprobante_path: comprobante,
    }).select('codigo').single()) as { codigo: string }
    return r.codigo
  }

  async registerLoan(c: RegisterLoanCommand) {
    return unwrap(await supabase().rpc('registrar_prestamo', {
      p_beneficiario: c.to, p_telefono: c.phone, p_valor: c.amount, p_metodo: await this.catalog.idOf('metodos_pago', c.method),
      p_fecha: c.date, p_vence: c.plan ? c.plan.cuotas[c.plan.cuotas.length - 1].due : c.due, p_nota: c.note ?? null,
      p_plan: c.plan ? { frecuencia: c.plan.freq, cuotas: cuotasToJson(c.plan.cuotas) } : null,
    })) as string
  }

  async update(codigo: string, p: Partial<Pick<Salida, 'tipo' | 'otro' | 'desc' | 'val' | 'date' | 'met'>>) {
    unwrap(await supabase().from('salidas').update({
      ...(p.tipo !== undefined && { tipo: p.tipo }), ...(p.otro !== undefined && { tipo_otro: p.otro }),
      ...(p.desc !== undefined && { descripcion: p.desc }), ...(p.val !== undefined && { valor: p.val }),
      ...(p.date !== undefined && { fecha: p.date }),
      ...(p.met !== undefined && { metodo_pago_id: await this.catalog.idOf('metodos_pago', p.met) }),
    }).eq('codigo', codigo))
  }

  /** Si es un préstamo, su cuenta en cartera se borra en cascada. */
  async remove(codigo: string) {
    unwrap(await supabase().from('salidas').delete().eq('codigo', codigo))
  }

  /** URL temporal para ver un comprobante privado */
  async receiptUrl(path: string) {
    const r = unwrap(await supabase().storage.from(BUCKET).createSignedUrl(path, 300)) as { signedUrl: string }
    return r.signedUrl
  }
}
