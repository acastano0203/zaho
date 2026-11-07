import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Label } from '../../../components/ui/Field'
import { IconChevron } from '../../../components/ui/Icons'
import { cop, norm, phone as fmtPhone } from '../../../lib/format'
import { findClient } from '../services/salesService'
import { useSaleActions } from '../hooks/useSales'

interface Props {
  clientId: string | null
  client: string
  phone: string
  onPick: (c: { clientId: string | null; client: string; phone: string }) => void
}

/** Selector de cliente con búsqueda y creación rápida */
export function ClientDropdown({ clientId, client, phone, onPick }: Props) {
  const { data, carRows } = useApp()
  const { quickClient } = useSaleActions()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const owes = (id: string) => carRows.filter(r => r.c.clientId === id).reduce((a, r) => a + r.saldo, 0)
  const nq = norm(q)
  const list = data.clientes.filter(c => !nq || norm(c.name + ' ' + c.phone + ' ' + c.doc).includes(nq)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8)
  const txt = q.trim()
  const canCreate = !!txt && !findClient(data, txt)
  const sel = clientId ? owes(clientId) : 0

  const pick = (v: { clientId: string | null; client: string; phone: string }) => { onPick(v); setOpen(false); setQ('') }
  const create = () => {
    const id = quickClient(txt, newPhone)
    if (id) { pick({ clientId: id, client: txt, phone: newPhone.trim() }); setNewPhone('') }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label>Cliente</Label>
      <button type="button" onClick={() => { setOpen(!open); setQ('') }} aria-expanded={open} aria-haspopup="listbox"
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-md border border-sand-dark bg-white px-3 py-1.5 text-left hover:border-char">
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{clientId ? client : 'Cliente mostrador'}</span>
          <span className="text-xs text-taupe">
            {clientId ? [phone ? fmtPhone(phone) : 'Sin teléfono', sel ? 'ya debe ' + cop(sel) : ''].filter(Boolean).join(' · ') : 'Toca para elegir o crear un cliente'}
          </span>
        </span>
        <IconChevron size={16} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-10 flex flex-col gap-2 rounded-md border border-sand-dark bg-white p-2.5 shadow-[0_8px_24px_rgba(43,40,38,.08)]">
          <Input autoFocus placeholder="Buscar por nombre o teléfono" aria-label="Buscar cliente" value={q} onChange={e => setQ(e.target.value)} />
          <div className="flex max-h-56 flex-col overflow-y-auto" role="listbox">
            {!nq && (
              <Option on={!clientId} name="Cliente mostrador" meta="Venta de contado sin cliente registrado" onClick={() => pick({ clientId: null, client: '', phone: '' })} />
            )}
            {list.map(c => {
              const s = owes(c.id)
              return <Option key={c.id} on={clientId === c.id} name={c.name}
                meta={[c.phone ? fmtPhone(c.phone) : 'Sin teléfono', s ? 'debe ' + cop(s) : ''].filter(Boolean).join(' · ')}
                onClick={() => pick({ clientId: c.id, client: c.name, phone: c.phone })} />
            })}
          </div>
          {canCreate && (
            <div className="grid grid-cols-1 items-end gap-2 border-t border-linen pt-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field label={'WhatsApp de ' + txt + ' (opcional)'}>
                <Input inputMode="tel" placeholder="300 000 0000" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              </Field>
              <Button variant="dark" onClick={create}>Crear “{txt}”</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Option({ on, name, meta, onClick }: { on: boolean; name: string; meta: string; onClick: () => void }) {
  return (
    <button type="button" role="option" aria-selected={on} onClick={onClick}
      className={'flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left hover:bg-mist ' + (on ? 'bg-cream shadow-[inset_3px_0_0_#3E3A38]' : '')}>
      <span className="font-semibold text-ink">{name}</span>
      <span className="text-xs text-taupe">{meta}</span>
    </button>
  )
}
