import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { Stepper } from '../../../components/ui/Display'
import { Field, TextArea } from '../../../components/ui/Field'
import { WaIcon } from '../../../components/ui/Icons'
import { phone, waLink } from '../../../lib/format'
import { suggestQty, suggestionsFor } from '../../../lib/finance'
import type { OrderLine } from '../../../types'
import { orderText } from '../services/suppliersService'
import { useSupplierActions } from '../hooks/useSuppliers'

export function OrderModal({ sup: supId, firstPid }: { sup: string; firstPid?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { send } = useSupplierActions()
  const sup = data.suppliers.find(s => s.id === supId)!
  const [lines, setLines] = useState<OrderLine[]>(() => {
    let prods = suggestionsFor(data, supId)
    const f = firstPid ? data.products.find(p => p.id === firstPid) : undefined
    if (f) prods = [f, ...prods.filter(p => p.id !== f.id)]
    return prods.map(p => ({ pid: p.id, qty: suggestQty(p) }))
  })
  const [text, setText] = useState(() => orderText(data, supId, lines))

  const qty = (pid: string, d: number) => {
    const next = lines.map(l => (l.pid === pid ? { ...l, qty: Math.max(0, l.qty + d) } : l)).filter(l => l.qty > 0)
    setLines(next)
    setText(orderText(data, supId, next))
  }
  const sent = () => setTimeout(() => { if (send(supId, lines)) ui.closeModal() }, 0)

  return (
    <Modal kicker={'Pedido · ' + (sup.auto ? 'proveedor en automático' : 'pedido manual')} title={sup.name} onClose={ui.closeModal}>
      <div className="rounded-md border border-linen bg-white">
        {lines.map(l => {
          const p = data.products.find(x => x.id === l.pid)!
          return (
            <div key={l.pid} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
              <div className="min-w-0"><div className="font-semibold text-ink">{p.name}</div><div className="text-xs text-taupe">Talla {p.size} · {p.color} · stock {p.stock} / mín {p.min}</div></div>
              <Stepper small value={l.qty} onDec={() => qty(l.pid, -1)} onInc={() => qty(l.pid, 1)} />
            </div>
          )
        })}
        {!lines.length && <p className="p-4 text-center text-[13px] text-taupe">Sin productos en el pedido.</p>}
      </div>
      <Field label={'Mensaje para ' + sup.contact + ' · ' + phone(sup.wa)}><TextArea rows={7} value={text} onChange={e => setText(e.target.value)} /></Field>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        {lines.length > 0 && <ButtonLink variant="dark" href={waLink(sup.wa, text)} onClick={sent}><WaIcon size={16} />Pedir por WhatsApp</ButtonLink>}
      </ModalActions>
    </Modal>
  )
}
