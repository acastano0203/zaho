import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Field, TextArea } from '../../../components/ui/Field'
import { WaIcon } from '../../../components/ui/Icons'
import { TPL_LABEL } from '../../../lib/constants'
import { phone, waLink } from '../../../lib/format'
import { fillTpl } from '../../../lib/finance'
import type { CarRow, TemplateKey } from '../../../types'
import { useCarteraActions } from '../hooks/useCartera'

export const defaultTpl = (r: CarRow): TemplateKey =>
  r.c.kind === 'prestamo' ? 'prestamo' : r.st === 'ven' ? 'vencida' : r.st === 'pag' ? 'gracias' : 'recordatorio'

export function WhatsAppModal({ cid, tpl }: { cid: string; tpl?: TemplateKey }) {
  const { data, carRows, toast } = useApp()
  const ui = useUI()
  const { log } = useCarteraActions()
  const r = carRows.find(x => x.c.id === cid)
  const [key, setKey] = useState<TemplateKey>(() => tpl || (r ? defaultTpl(r) : 'recordatorio'))
  const [text, setText] = useState(() => (r ? fillTpl(data.tpls[key], r.c.client, r.saldo, r.refDue) : ''))
  if (!r) return null

  const pick = (k: TemplateKey) => { setKey(k); setText(fillTpl(data.tpls[k], r.c.client, r.saldo, r.refDue)) }
  const options = r.c.kind === 'prestamo'
    ? [{ value: 'prestamo' as const, label: 'Recordatorio de préstamo' }]
    : [{ value: 'recordatorio' as const, label: 'Recordatorio' }, { value: 'vencida' as const, label: 'Deuda vencida' }, { value: 'gracias' as const, label: 'Agradecimiento' }]

  const sent = () => {
    // Se deja abrir el enlace y luego se registra la gestión
    setTimeout(() => {
      log(cid, 'WhatsApp', 'Enviado: ' + TPL_LABEL[key])
      ui.closeModal()
      toast('WhatsApp abierto para ' + r.c.client + ' · quedó en el seguimiento')
    }, 0)
  }

  return (
    <Modal kicker={r.c.kind === 'prestamo' ? 'Préstamo por recuperar' : 'Cartera · ' + (r.c.saleId || r.c.ref)} title={r.c.client} onClose={ui.closeModal}>
      <Chips value={key} onChange={pick} options={options} />
      <Field label={'Mensaje para ' + phone(r.c.phone)}><TextArea rows={6} value={text} onChange={e => setText(e.target.value)} /></Field>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <ButtonLink variant="dark" href={waLink(r.c.phone, text)} onClick={sent}><WaIcon size={16} />Enviar</ButtonLink>
      </ModalActions>
    </Modal>
  )
}
