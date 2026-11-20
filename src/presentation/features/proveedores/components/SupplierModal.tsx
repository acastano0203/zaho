import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Segmented } from '../../../components/ui/Segmented'
import { Field, Input, Label } from '../../../components/ui/Field'
import { isEmail, nitDV } from '../../../../domain/rules/documentos'
import type { DocTipo } from '../../../../domain/entities'
import type { SupplierForm } from '../services/suppliersService'
import { useSupplierActions } from '../hooks/useSuppliers'
import { BrandPicker } from './BrandPicker'

const Section = ({ children }: { children: string }) => (
  <span className="-mb-1 border-b border-line pb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink">{children}</span>
)

export function SupplierModal({ id }: { id?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { saveSupplier } = useSupplierActions()
  const s = id ? data.suppliers.find(x => x.id === id) : undefined
  const [f, setF] = useState<SupplierForm>({
    id, name: s?.name || '', brands: s?.brands || [], contact: s?.contact || '', wa: s?.wa || '',
    docType: s?.docType || 'nit', doc: s?.doc || '', email: s?.email || '', address: s?.address || '',
  })
  const set = <K extends keyof SupplierForm>(k: K, v: SupplierForm[K]) => setF(prev => ({ ...prev, [k]: v }))

  const digits = f.doc.replace(/\D/g, '')
  const dv = f.docType === 'nit' && digits.length >= 8 ? nitDV(digits) : null
  const emailBad = !!f.email.trim() && !isEmail(f.email.trim())

  return (
    <Modal kicker="Proveedores" title={id ? 'Modificar proveedor' : 'Nuevo proveedor'} onClose={ui.closeModal}>
      <Section>Datos de la empresa</Section>
      <Field label="Razón social o nombre"><Input placeholder="Nombre de la empresa" value={f.name} onChange={e => set('name', e.target.value)} /></Field>

      <div className="flex flex-col gap-1.5">
        <Label>Identificación</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Segmented<DocTipo> label="Tipo de documento" value={f.docType} onChange={v => set('docType', v)}
            options={[{ value: 'nit', label: 'NIT' }, { value: 'cc', label: 'Cédula' }]} />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input inputMode="numeric" aria-label={f.docType === 'nit' ? 'NIT' : 'Cédula'}
              placeholder={f.docType === 'nit' ? '900123456' : '1020304050'} maxLength={f.docType === 'nit' ? 13 : 14}
              value={f.doc} onChange={e => set('doc', e.target.value.replace(/[^\d.\s]/g, ''))} />
            {f.docType === 'nit' && (
              <span className="inline-flex h-11 min-w-14 shrink-0 flex-col items-center justify-center rounded-md border border-linen bg-mist px-2 md:h-10" title="Dígito de verificación">
                <span className="text-[9px] uppercase tracking-[0.18em] text-taupe">DV</span>
                <span className="font-display text-sm leading-none text-ink">{dv ?? '–'}</span>
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-taupe">
          {f.docType === 'nit' ? 'Escribe el NIT sin el dígito de verificación; se calcula solo.' : 'Número de cédula de la persona natural.'}
        </span>
      </div>

      <Field label="Dirección">
        <Input autoComplete="street-address" placeholder="Calle 10 # 43-25, Medellín" value={f.address} onChange={e => set('address', e.target.value)} />
      </Field>

      <BrandPicker value={f.brands} onChange={brands => set('brands', brands)} supplierId={id} />

      <Section>Contacto</Section>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Persona de contacto"><Input value={f.contact} onChange={e => set('contact', e.target.value)} /></Field>
        <Field label="WhatsApp"><Input inputMode="tel" placeholder="300 000 0000" value={f.wa} onChange={e => set('wa', e.target.value)} /></Field>
      </div>
      <Field label="Correo electrónico">
        <Input type="email" inputMode="email" autoComplete="email" placeholder="pedidos@proveedor.com" value={f.email}
          aria-invalid={emailBad} className={emailBad ? 'border-bad' : ''} onChange={e => set('email', e.target.value)} />
        {emailBad && <span className="text-xs text-bad">Revisa el correo: falta la @ o el dominio.</span>}
      </Field>

      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (saveSupplier(f)) ui.closeModal() }}>Guardar</Button>
      </ModalActions>
    </Modal>
  )
}
