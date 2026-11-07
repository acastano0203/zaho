import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Drawer } from '../../../components/ui/Drawer'
import { Button } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Label } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { plus } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import { saleBase, saleCost, saleTotal } from '../../../lib/finance'
import type { AppData, Product } from '../../../types'
import { available, type SaleDraft } from '../services/salesService'
import { useSaleActions } from '../hooks/useSales'
import { ProductPicker } from './ProductPicker'
import { SaleItems } from './SaleItems'
import { ClientDropdown } from './ClientDropdown'
import { CreditOptions } from './CreditOptions'

function initDraft(d: AppData, editId?: string, clientId?: string): SaleDraft {
  const base = { due: plus(15), abono: '', planMode: 'single' as const, n: 3, freq: 'quincenal' as const, first: plus(15) }
  const s = editId ? d.sales.find(x => x.id === editId) : null
  if (s) {
    const c = d.cartera.find(x => x.saleId === s.id)
    return { ...base, id: s.id, clientId: s.clientId, client: s.client, phone: s.phone, com: s.com, items: s.items.map(i => ({ ...i })), pay: s.pay, due: c ? c.due : base.due }
  }
  const k = clientId ? d.clientes.find(x => x.id === clientId) : null
  return { ...base, id: null, clientId: k?.id || null, client: k?.name || '', phone: k?.phone || '', com: d.comerciales[0]?.id || '', items: [], pay: 'contado' }
}

export function SaleDrawer({ editId, clientId }: { editId?: string; clientId?: string }) {
  const { data, toast } = useApp()
  const ui = useUI()
  const { save } = useSaleActions()
  const [draft, setDraft] = useState<SaleDraft>(() => initDraft(data, editId, clientId))
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('')
  const set = (p: Partial<SaleDraft>) => setDraft(d => ({ ...d, ...p }))
  const availableOf = (pid: string) => available(data, draft, pid)

  const add = (p: Product) => {
    // Un producto recién creado aún no está en `data` de este render: se usa su stock directo
    const av = data.products.some(x => x.id === p.id) ? availableOf(p.id) : p.stock
    if (av <= 0) { toast(p.name + ' talla ' + p.size + (p.stock > 0 ? ': no quedan más unidades' : ' está agotado')); return }
    setDraft(d => {
      const ex = d.items.find(i => i.pid === p.id)
      return { ...d, items: ex ? d.items.map(i => (i.pid === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...d.items, { pid: p.id, qty: 1, price: p.price }] }
    })
  }
  const dec = (pid: string) => setDraft(d => ({ ...d, items: d.items.map(i => (i.pid === pid ? { ...i, qty: i.qty - 1 } : i)).filter(i => i.qty > 0) }))
  const remove = (pid: string) => setDraft(d => ({ ...d, items: d.items.filter(i => i.pid !== pid) }))
  const inc = (pid: string) => { const p = data.products.find(x => x.id === pid); if (p) add(p) }

  const total = saleTotal(draft), base = saleBase(draft), cost = saleCost(draft, data.products)
  const lockPlan = !!(draft.id && data.cartera.some(c => c.saleId === draft.id))
  const submit = () => { if (save(draft)) ui.closeDrawer() }

  return (
    <Drawer
      kicker={draft.id ? 'Editando · el stock se ajusta al guardar' : 'Registro rápido'}
      title={draft.id ? 'Editar venta ' + draft.id : 'Nueva venta'}
      onClose={ui.closeDrawer}
      footer={
        <>
          <div className="min-w-0">
            <span className="text-[11px] uppercase tracking-[0.22em]">Total</span>
            <div className="font-display text-xl text-ink tabular">{cop(total)}</div>
            {draft.items.length > 0 && <div className="truncate text-xs text-util">Costo {cop(cost)} · utilidad {cop(total - cost)} ({total ? Math.round(((total - cost) / total) * 100) : 0}%)</div>}
          </div>
          <Button variant="dark" size="lg" onClick={submit}>{draft.id ? (draft.items.length ? 'Guardar cambios' : 'Anular venta') : 'Registrar venta'}</Button>
        </>
      }>
      <ProductPicker q={q} brand={brand} pay={draft.pay} availableOf={availableOf} onQ={setQ} onBrand={setBrand} onAdd={add} />
      <SaleItems items={draft.items} pay={draft.pay} availableOf={availableOf} onInc={inc} onDec={dec} onRemove={remove} />
      <ClientDropdown clientId={draft.clientId} client={draft.client} phone={draft.phone} onPick={set} />
      <div className="flex flex-col gap-1.5">
        <Label>Comercial</Label>
        <Chips value={draft.com} onChange={v => set({ com: v })} options={data.comerciales.map(c => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Forma de pago</Label>
        <Segmented label="Forma de pago" value={draft.pay} onChange={v => set({ pay: v })} options={[{ value: 'contado', label: 'Contado' }, { value: 'credito', label: 'Crédito' }]} />
      </div>
      {draft.pay === 'credito' && <CreditOptions draft={draft} total={total} base={base} lockPlan={lockPlan} set={set} />}
    </Drawer>
  )
}
