import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { Field, Select, TextArea } from '../../../components/ui/Field'
import { WaIcon } from '../../../components/ui/Icons'
import { WAREHOUSES } from '../../../../shared/lib/constants'
import { phone, waLink } from '../../../../shared/lib/format'
import { suggestQty, suggestionsFor } from '../../../../domain/rules/finance'
import { normalizeLines } from '../../../../domain/rules/pedidos'
import type { AppData, OrderLine } from '../../../../domain/entities'
import { orderText } from '../services/ordersService'
import { useOrderActions } from '../hooks/usePedidos'
import { OrderProductList } from './OrderProductList'

/** Cantidades sugeridas: lo que está bajo el mínimo (y el producto desde el que se abrió) */
function initialLines(d: AppData, supId: string, wh: string, firstPid?: string): OrderLine[] {
  if (!supId) return []
  let prods = suggestionsFor(d, supId)
  const f = firstPid ? d.products.find(p => p.id === firstPid) : undefined
  if (f) prods = [f, ...prods.filter(p => p.id !== f.id)]
  return normalizeLines(d, prods.map(p => ({ pid: p.id, qty: suggestQty(p) })), wh)
}

/** Bodega sugerida: la del producto desde el que se abrió o la que más se repite en lo sugerido */
function defaultWarehouse(d: AppData, supId: string, firstPid?: string) {
  const f = firstPid ? d.products.find(p => p.id === firstPid) : undefined
  if (f) return f.wh
  const count = new Map<string, number>()
  for (const p of supId ? suggestionsFor(d, supId) : []) count.set(p.wh, (count.get(p.wh) ?? 0) + 1)
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? WAREHOUSES[0]
}

/** Arma un pedido para un proveedor y lo envía por WhatsApp o correo. Sin `sup`, se elige en el modal. */
export function OrderModal({ sup: supInicial, firstPid }: { sup?: string; firstPid?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { send } = useOrderActions()
  const [supId, setSupId] = useState(supInicial ?? '')
  const [wh, setWh] = useState(() => defaultWarehouse(data, supInicial ?? '', firstPid))
  const [lines, setLines] = useState<OrderLine[]>(() => initialLines(data, supInicial ?? '', wh, firstPid))
  // Si el usuario escribe su propio mensaje, ya no se regenera solo
  const [custom, setCustom] = useState<string | null>(null)
  const sup = data.suppliers.find(s => s.id === supId)
  const text = custom ?? (sup && lines.length ? orderText(data, sup.id, lines, wh) : '')

  const pickSupplier = (sid: string) => {
    const w = defaultWarehouse(data, sid)
    setSupId(sid); setWh(w); setLines(initialLines(data, sid, w)); setCustom(null)
  }
  const pickWarehouse = (w: string) => { setWh(w); setLines(normalizeLines(data, lines, w)) }
  const register = () => setTimeout(() => { if (send(supId, lines, wh)) ui.closeModal() }, 0)
  const mailto = sup?.email ? 'mailto:' + sup.email + '?subject=' + encodeURIComponent('Pedido ZAHO') + '&body=' + encodeURIComponent(text) : ''

  return (
    <Modal kicker="Nuevo pedido" title={sup?.name ?? 'Elige el proveedor'} onClose={ui.closeModal}>
      <div className={'grid grid-cols-1 gap-3.5 ' + (supInicial ? '' : 'sm:grid-cols-[minmax(0,1fr)_200px]')}>
        {!supInicial && (
          <Field label="Proveedor">
            <Select value={supId} onChange={e => pickSupplier(e.target.value)}
              options={[{ value: '', label: data.suppliers.length ? 'Elegir…' : 'No hay proveedores creados' }, ...data.suppliers.map(s => ({ value: s.id, label: s.name + ' · ' + s.brands.join(', ') }))]} />
          </Field>
        )}
        {(sup || supInicial) && (
          <Field label="Llega a">
            <Select value={wh} onChange={e => pickWarehouse(e.target.value)} options={WAREHOUSES} />
          </Field>
        )}
      </div>

      {sup && (
        <>
          <OrderProductList key={sup.id} supplier={sup} wh={wh} lines={lines} onChange={setLines} />
          {lines.length > 0 && (
            <Field label={
              <span className="flex items-center justify-between gap-2">
                <span className="truncate">Mensaje para {sup.contact || sup.name}{sup.wa ? ' · ' + phone(sup.wa) : ''}</span>
                {custom !== null && <button type="button" className="shrink-0 text-[11px] normal-case tracking-normal underline underline-offset-4" onClick={() => setCustom(null)}>Volver al mensaje automático</button>}
              </span>
            }>
              <TextArea rows={6} value={text} onChange={e => setCustom(e.target.value)} />
            </Field>
          )}
          {!sup.wa && !sup.email && <p className="text-xs text-warn">Este proveedor no tiene WhatsApp ni correo. El pedido se registra y se lo haces llegar por tu cuenta.</p>}
        </>
      )}

      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        {sup && lines.length > 0 && (
          <>
            {mailto && <ButtonLink href={mailto} onClick={register}>Enviar por correo</ButtonLink>}
            {sup.wa
              ? <ButtonLink variant="dark" href={waLink(sup.wa, text)} onClick={register}><WaIcon size={16} />Pedir por WhatsApp</ButtonLink>
              : !mailto && <Button variant="dark" onClick={register}>Registrar pedido</Button>}
          </>
        )}
      </ModalActions>
    </Modal>
  )
}
