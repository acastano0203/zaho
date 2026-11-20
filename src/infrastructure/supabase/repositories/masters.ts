import type { Cliente, Comercial, Supplier, TemplateKey, Templates } from '../../../domain/entities'
import type { ClientRepository, ComercialRepository, SettingsRepository, SupplierRepository } from '../../../application/ports/repositories'
import { supabase, unwrap } from '../client'
import { toCliente, toComercial, toSupplier } from '../mappers'
import type { SupabaseCatalog } from './catalog'

export class SupabaseClients implements ClientRepository {
  async list() {
    const rows = unwrap(await supabase().from('clientes').select('id, nombre, telefono, documento, ciudad, nota, created_at').order('nombre'))
    return (rows as Parameters<typeof toCliente>[0][]).map(toCliente)
  }

  async save(c: Omit<Cliente, 'id' | 'created'> & { id?: string; newId?: string }) {
    const row = { nombre: c.name.trim(), telefono: c.phone || null, documento: c.doc || null, ciudad: c.city || null, nota: c.note || null }
    if (!c.id) return (unwrap(await supabase().from('clientes').insert({ ...row, ...(c.newId && { id: c.newId }) }).select('id').single()) as { id: string }).id
    unwrap(await supabase().from('clientes').update(row).eq('id', c.id))
    // Copias históricas del nombre en cuentas abiertas
    unwrap(await supabase().from('cuentas_cobrar').update({ cliente_nombre: row.nombre, telefono: row.telefono }).eq('cliente_id', c.id))
    return c.id
  }

  async remove(id: string) {
    const deuda = unwrap(await supabase().from('v_cartera').select('id').eq('cliente_id', id).gt('saldo', 0).limit(1)) as unknown[]
    if (deuda.length) throw new Error('El cliente tiene saldo pendiente en cartera. Salda o elimina esas cuentas primero.')
    unwrap(await supabase().from('clientes').delete().eq('id', id))
  }
}

export class SupabaseComerciales implements ComercialRepository {
  async list() {
    const rows = unwrap(await supabase().from('comerciales').select('id, nombre, telefono, comision_pct').eq('activo', true).order('nombre'))
    return (rows as Parameters<typeof toComercial>[0][]).map(toComercial)
  }

  async save(c: Omit<Comercial, 'id'> & { id?: string }) {
    const row = { nombre: c.name.trim(), telefono: c.phone || null, comision_pct: c.pct }
    if (!c.id) return (unwrap(await supabase().from('comerciales').insert(row).select('id').single()) as { id: string }).id
    unwrap(await supabase().from('comerciales').update(row).eq('id', c.id))
    return c.id
  }

  /** Baja lógica: conserva el historial de ventas y comisiones */
  async remove(id: string) {
    unwrap(await supabase().from('comerciales').update({ activo: false }).eq('id', id))
  }
}

export class SupabaseSuppliers implements SupplierRepository {
  constructor(private catalog: SupabaseCatalog) {}

  async list() {
    const rows = unwrap(await supabase().from('proveedores')
      .select('id, nombre, contacto, whatsapp, tipo_documento, documento, email, direccion, proveedor_marcas(marcas(nombre))').eq('activo', true).order('nombre'))
    return (rows as unknown as Parameters<typeof toSupplier>[0][]).map(toSupplier)
  }

  async save(s: Omit<Supplier, 'id'> & { id?: string }) {
    const row = {
      nombre: s.name.trim(), contacto: s.contact || null, whatsapp: s.wa || null,
      tipo_documento: s.doc ? s.docType ?? 'nit' : null, documento: s.doc || null, email: s.email || null, direccion: s.address || null,
    }
    const id = s.id
      ? (unwrap(await supabase().from('proveedores').update(row).eq('id', s.id)), s.id)
      : (unwrap(await supabase().from('proveedores').insert(row).select('id').single()) as { id: string }).id
    const marcas = await Promise.all(s.brands.map(b => this.catalog.idOf('marcas', b)))
    unwrap(await supabase().from('proveedor_marcas').delete().eq('proveedor_id', id))
    if (marcas.length) unwrap(await supabase().from('proveedor_marcas').insert(marcas.map(m => ({ proveedor_id: id, marca_id: m }))))
    return id
  }

  async remove(id: string) {
    const abiertos = unwrap(await supabase().from('pedidos').select('id').eq('proveedor_id', id).neq('estado', 'recibido').limit(1)) as unknown[]
    if (abiertos.length) throw new Error('El proveedor tiene pedidos en curso. Recíbelos o elimínalos primero.')
    unwrap(await supabase().from('proveedores').update({ activo: false }).eq('id', id))
  }
}

export class SupabaseSettings implements SettingsRepository {
  async templates() {
    const rows = unwrap(await supabase().from('plantillas_mensaje').select('clave, texto')) as { clave: TemplateKey; texto: string }[]
    return Object.fromEntries(rows.map(r => [r.clave, r.texto])) as Templates
  }

  async updateTemplate(key: TemplateKey, text: string) {
    unwrap(await supabase().from('plantillas_mensaje').update({ texto: text }).eq('clave', key))
  }

  private async config() {
    return unwrap(await supabase().from('configuracion').select('resumen_diario, recargo_credito_pct').single()) as { resumen_diario: boolean; recargo_credito_pct: number }
  }

  dailySummary = async () => (await this.config()).resumen_diario
  creditSurchargePct = async () => Number((await this.config()).recargo_credito_pct)

  async setDailySummary(on: boolean) {
    unwrap(await supabase().from('configuracion').update({ resumen_diario: on }).eq('id', true))
  }
}
