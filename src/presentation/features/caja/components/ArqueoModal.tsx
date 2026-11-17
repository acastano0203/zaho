import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Label, Select } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { Box, Row } from '../../../components/ui/Display'
import { DENOMINACIONES, totalConteo } from '../../../../domain/rules/caja'
import { cop, num } from '../../../../shared/lib/format'
import { useCaja, useCajaActions } from '../hooks/useCaja'

/**
 * Arqueo de caja: se cuenta el dinero real y se compara con el sistema.
 * En efectivo se cuenta por billetes y monedas; en Nequi o banco se escribe el saldo del extracto.
 */
export function ArqueoModal({ cuentaId }: { cuentaId?: string }) {
  const ui = useUI()
  const { todas, cuentas } = useCaja()
  const { arqueo } = useCajaActions()
  const [id, setId] = useState(cuentaId ?? todas[0]?.id ?? '')
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [contado, setContado] = useState('')
  const [nota, setNota] = useState('')
  const cuenta = todas.find(c => c.id === id)
  const sistema = cuentas.find(c => c.cuenta.id === id)?.saldo ?? 0
  const efectivo = cuenta?.tipo === 'efectivo'
  const real = efectivo ? totalConteo(conteo) : num(contado)
  const tieneDato = efectivo ? Object.values(conteo).some(n => n > 0) : contado !== ''
  const dif = real - sistema

  const submit = () => {
    if (arqueo({ cuentaId: id, contado: efectivo ? String(real) : contado, conteo: efectivo ? conteo : undefined, nota })) ui.closeModal()
  }

  return (
    <Modal kicker="Caja · cierre del día" title={'Arqueo' + (cuenta ? ' de ' + cuenta.nombre : '')} onClose={ui.closeModal}>
      {!cuentaId && (
        <Field label="Cuenta"><Select value={id} onChange={e => { setId(e.target.value); setConteo({}); setContado('') }} options={todas.map(c => ({ value: c.id, label: c.nombre }))} /></Field>
      )}

      {efectivo ? (
        <div className="flex flex-col gap-2">
          <Label>Cuenta los billetes y monedas</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {DENOMINACIONES.map(den => (
              <label key={den} className="flex items-center gap-2">
                <span className="w-[72px] shrink-0 text-right text-[13px] text-char tabular">{cop(den)}</span>
                <span className="text-stone">×</span>
                <Input inputMode="numeric" className="h-10 w-full px-2 text-center" aria-label={'Cantidad de ' + cop(den)}
                  value={conteo[den] || ''} onChange={e => setConteo({ ...conteo, [den]: num(e.target.value) })} />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <Field label="Saldo real (según la app del banco o Nequi)"><MoneyInput value={contado} onChange={setContado} /></Field>
      )}

      <Box warn={tieneDato && dif !== 0}>
        <div className="text-[13px]">
          <Row label="Según el sistema" value={cop(sistema)} />
          <Row label="Contado / real" value={tieneDato ? cop(real) : '—'} />
          <Row strong label={!tieneDato ? 'Diferencia' : dif === 0 ? 'Cuadra exacto' : dif > 0 ? 'Sobrante' : 'Faltante'}
            value={tieneDato ? cop(Math.abs(dif)) : '—'} />
        </div>
        {tieneDato && dif !== 0 && (
          <p className="text-xs text-char">Al guardar, la diferencia queda registrada como <b>ajuste de arqueo</b> y el saldo de la cuenta pasa a ser {cop(real)}.</p>
        )}
      </Box>

      <Field label="Observación (opcional)"><Input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. faltó registrar un pago de domicilio" /></Field>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" disabled={!tieneDato} onClick={submit}>Guardar arqueo</Button>
      </ModalActions>
    </Modal>
  )
}
