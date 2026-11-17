import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Segmented } from '../../../components/ui/Segmented'
import { Box, Row } from '../../../components/ui/Display'
import { Field, Input, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { fd } from '../../../../shared/lib/dates'
import { cop } from '../../../../shared/lib/format'
import { previewRecargo, type RecargoForm } from '../services/carteraService'
import { useCarteraActions } from '../hooks/useCartera'

/**
 * Recargo por mora: solo para cuentas vencidas.
 * Con una cuenta muestra su detalle; con varias (selección de la grilla) aplica
 * el mismo porcentaje o valor fijo a cada una.
 */
export function RecargoModal({ cids, onDone }: { cids: string[]; onDone?: () => void }) {
  const { data } = useApp()
  const ui = useUI()
  const { recargoMasivo } = useCarteraActions()
  const [tipo, setTipo] = useState<RecargoForm['tipo']>('pct')
  const [pct, setPct] = useState('')
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')

  const f: RecargoForm = { tipo, pct, valor, nota }
  const previews = cids.map(cid => previewRecargo(data, cid, f)).filter(p => !!p)
  const validas = previews.filter(p => p.r.st === 'ven' && p.base > 0 && !!p.cuota)
  const omitidas = previews.filter(p => !validas.includes(p))
  const total = validas.reduce((a, p) => a + Math.max(p.val, 0), 0)
  const una = cids.length === 1 ? validas[0] : undefined
  const puede = validas.length > 0 && validas.every(p => p.val > 0)

  const aplicar = () => { if (recargoMasivo(validas.map(p => p.r.c.id), f)) { onDone?.(); ui.closeModal() } }
  const kicker = una ? 'Cartera · ' + una.r.c.client : 'Cartera · ' + validas.length + (validas.length === 1 ? ' cuenta vencida' : ' cuentas vencidas')

  return (
    <Modal kicker={kicker} title="Recargo por mora" onClose={ui.closeModal}>
      {!validas.length ? (
        <Box><p className="text-[13px] text-char">
          {cids.length === 1 ? 'Esta cuenta no tiene cuotas vencidas.' : 'Ninguna de las cuentas seleccionadas está vencida.'} El recargo por mora solo se aplica cuando la cuenta pasa su fecha de pago.
        </p></Box>
      ) : (
        <>
          {una ? (
            <Box warn>
              <div className="text-[13px]">
                <Row label="Monto vencido" value={cop(una.base)} />
                <Row label="Días de mora" value={String(-una.r.days)} />
                <Row label={una.r.hasPlan ? 'Se suma a la cuota' : 'Vencía el'} value={una.r.hasPlan && una.cuota ? una.cuota.n + ' (' + fd(una.cuota.due) + ')' : fd(una.r.refDue)} />
              </div>
            </Box>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Cómo se calcula el recargo</Label>
            <Segmented label="Tipo de recargo" value={tipo} onChange={setTipo}
              options={[{ value: 'pct', label: 'Porcentaje' }, { value: 'valor', label: una ? 'Valor fijo' : 'Valor fijo por cuenta' }]} />
          </div>
          {tipo === 'pct' ? (
            <Field label="Porcentaje sobre lo vencido">
              <Input inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} placeholder="Ej. 2,5" autoFocus />
            </Field>
          ) : (
            <Field label={una ? 'Valor del recargo' : 'Valor del recargo para cada cuenta'}><MoneyInput value={valor} onChange={setValor} /></Field>
          )}
          <Field label="Observación (opcional)"><Input value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. acordado por teléfono" /></Field>

          {una ? (
            <div className="rounded-md border border-linen bg-paper px-4 py-1 text-[13px]">
              <Row label="Saldo actual" value={cop(una.r.saldo)} />
              <Row label="+ Recargo" value={una.val > 0 ? cop(una.val) : '—'} />
              <Row strong label="Nuevo saldo" value={cop(una.r.saldo + Math.max(una.val, 0))} />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-linen bg-white text-[13px]">
              <div className="sticky top-0 grid grid-cols-[minmax(0,1fr)_88px_80px_88px] gap-2 border-b border-linen bg-paper px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-char">
                <span>Cliente</span><span className="text-right">Vencido</span><span className="text-right">Recargo</span><span className="text-right">Nuevo saldo</span>
              </div>
              {validas.map(p => (
                <div key={p.r.c.id} className="grid grid-cols-[minmax(0,1fr)_88px_80px_88px] items-center gap-2 border-t border-line px-3 py-1.5 first:border-t-0 tabular">
                  <span className="min-w-0 truncate text-ink" title={p.r.c.client}>{p.r.c.client} <span className="text-xs text-taupe">· {-p.r.days} d</span></span>
                  <span className="text-right">{cop(p.base)}</span>
                  <span className="text-right font-semibold text-ink">{p.val > 0 ? cop(p.val) : '—'}</span>
                  <span className="text-right">{cop(p.r.saldo + Math.max(p.val, 0))}</span>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2 border-t border-linen bg-paper px-3 py-2 font-semibold text-ink tabular">
                <span>Total recargos</span><span className="text-right">{total > 0 ? cop(total) : '—'}</span>
              </div>
            </div>
          )}
          {omitidas.length > 0 && (
            <p className="-mt-1 text-xs text-bad">No se aplicará a {omitidas.map(p => p.r.c.client).join(', ')}: no {omitidas.length === 1 ? 'está vencida' : 'están vencidas'}.</p>
          )}
          <p className="-mt-1 text-xs text-taupe">El recargo se cobra primero con el siguiente abono y queda registrado en el seguimiento de cada cuenta.</p>
        </>
      )}
      <ModalActions>
        <Button onClick={ui.closeModal}>{validas.length ? 'Cancelar' : 'Cerrar'}</Button>
        {validas.length > 0 && (
          <Button variant="dark" disabled={!puede} onClick={aplicar}>
            {una ? 'Aplicar recargo' : 'Aplicar a ' + validas.length + (validas.length === 1 ? ' cuenta' : ' cuentas')}
          </Button>
        )}
      </ModalActions>
    </Modal>
  )
}
