import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Chip } from '../../../components/ui/Chip'
import { Field, Input, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { Segmented } from '../../../components/ui/Segmented'
import { METODOS } from '../../../../shared/lib/constants'
import { today } from '../../../../shared/lib/dates'
import type { TipoCuenta } from '../../../../domain/entities'
import type { CuentaForm } from '../services/cajaService'
import { useCaja, useCajaActions } from '../hooks/useCaja'
import { TIPO_CUENTA } from './CuentasCards'

export function CuentaModal({ id }: { id?: string }) {
  const ui = useUI()
  const { can } = useSession()
  const { todas } = useCaja()
  const { guardarCuenta, eliminarCuenta } = useCajaActions()
  const c = id ? todas.find(x => x.id === id) : null
  const [f, setF] = useState<CuentaForm>({
    id, nombre: c?.nombre ?? '', tipo: c?.tipo ?? 'banco', saldoInicial: c ? String(c.saldoInicial || '') : '',
    fechaInicial: c?.fechaInicial ?? today(), metodos: c?.metodos ?? [],
  })
  const up = (p: Partial<CuentaForm>) => setF({ ...f, ...p })
  const owner = (m: string) => todas.find(x => x.id !== id && x.metodos.includes(m))
  const toggle = (m: string) => up({ metodos: f.metodos.includes(m) ? f.metodos.filter(x => x !== m) : [...f.metodos, m] })

  return (
    <Modal kicker="Caja · cuentas" title={id ? 'Editar ' + (c?.nombre ?? 'cuenta') : 'Nueva cuenta'} onClose={ui.closeModal}>
      <Field label="Nombre"><Input value={f.nombre} onChange={e => up({ nombre: e.target.value })} placeholder="Ej. Davivienda, Caja menor…" autoFocus={!id} /></Field>
      <div className="flex flex-col gap-1.5">
        <Label>Tipo</Label>
        <Segmented label="Tipo de cuenta" value={f.tipo} onChange={v => up({ tipo: v as TipoCuenta })}
          options={(Object.keys(TIPO_CUENTA) as TipoCuenta[]).map(k => ({ value: k, label: TIPO_CUENTA[k] }))} />
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Saldo inicial"><MoneyInput value={f.saldoInicial} onChange={v => up({ saldoInicial: v })} /></Field>
        <Field label="Fecha de apertura"><Input type="date" value={f.fechaInicial} onChange={e => up({ fechaInicial: e.target.value })} /></Field>
      </div>
      <p className="-mt-1 text-xs text-taupe">El saldo inicial es el dinero que había en la cuenta ese día. Solo cuentan los movimientos desde esa fecha.</p>

      <div className="flex flex-col gap-1.5">
        <Label>Medios de pago que entran aquí</Label>
        <div className="flex flex-wrap gap-1.5">
          {METODOS.map(m => <Chip key={m} label={m} on={f.metodos.includes(m)} onClick={() => toggle(m)} />)}
        </div>
        <p className="text-xs text-taupe">
          Cuando una venta o abono se paga con ese medio, el dinero entra a esta cuenta.
          {f.metodos.filter(owner).length > 0 && <> Se quitarán de: {f.metodos.filter(owner).map(m => m + ' (' + owner(m)!.nombre + ')').join(', ')}.</>}
        </p>
      </div>

      <ModalActions>
        {id && can('caja.eliminar') && (
          <Button variant="ghost" className="text-bad sm:mr-auto" onClick={() => ui.openModal({
            type: 'confirm', title: 'Eliminar la cuenta ' + (c?.nombre ?? ''),
            message: 'Solo se puede si no tiene medios de pago asignados, movimientos de caja ni arqueos.',
            onConfirm: () => eliminarCuenta(id),
          })}>Eliminar cuenta</Button>
        )}
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (guardarCuenta(f)) ui.closeModal() }}>Guardar</Button>
      </ModalActions>
    </Modal>
  )
}
