import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Label } from '../../../components/ui/Field'
import { BRAND_COLORS } from '../../../../shared/lib/constants'
import type { BrandForm } from '../services/brandsService'
import { useBrandActions } from '../hooks/useBrands'
import { BrandTile } from './BrandTile'

export function BrandModal({ id }: { id?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { save } = useBrandActions()
  const b = id ? data.brands.find(x => x.id === id) : undefined
  const [f, setF] = useState<BrandForm>({ id, name: b?.name || '', color: b?.color || BRAND_COLORS[data.brands.length % BRAND_COLORS.length] })
  const nProds = b ? data.products.filter(p => p.brand === b.name).length : 0
  const submit = () => { if (save(f)) ui.closeModal() }

  return (
    <Modal kicker="Marcas" title={id ? 'Editar marca' : 'Nueva marca'} onClose={ui.closeModal}>
      <div className="overflow-hidden rounded-md border border-linen"><BrandTile name={f.name} color={f.color} tall /></div>
      <Field label="Nombre">
        <Input autoFocus placeholder="Ej. Tommy Hilfiger" value={f.name} maxLength={40}
          onChange={e => setF({ ...f, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') submit() }} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Label>Color de la tarjeta</Label>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setF({ ...f, color: c })} aria-pressed={f.color === c} aria-label={'Color ' + c}
              className={'h-10 w-10 rounded-md border-2 transition-transform md:h-8 md:w-8 ' + (f.color === c ? 'scale-110 border-gold' : 'border-transparent')}
              style={{ background: c }} />
          ))}
        </div>
      </div>
      {nProds > 0 && <p className="text-xs text-taupe">Si cambias el nombre, sus {nProds} productos y el proveedor que la surte quedan con el nombre nuevo.</p>}
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={submit}>Guardar</Button>
      </ModalActions>
    </Modal>
  )
}
