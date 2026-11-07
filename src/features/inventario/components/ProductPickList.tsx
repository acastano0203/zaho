import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { Field, Input } from '../../../components/ui/Field'
import { norm } from '../../../lib/format'

/** Buscador corto de productos para ajustes y traslados */
export function ProductPickList({ pid, onPick }: { pid?: string; onPick: (pid: string) => void }) {
  const { data } = useApp()
  const [q, setQ] = useState('')
  const nq = norm(q)
  let list = data.products.filter(p => !nq || norm(p.name + ' ' + p.code + ' ' + p.brand).includes(nq)).slice(0, 6)
  const sel = pid ? data.products.find(p => p.id === pid) : undefined
  if (sel && !list.some(p => p.id === sel.id)) list = [sel, ...list.slice(0, 5)]

  return (
    <Field label="Producto">
      <Input placeholder="Buscar por nombre o código" value={q} onChange={e => setQ(e.target.value)} />
      <div className="max-h-52 overflow-y-auto rounded-md border border-linen bg-white">
        {list.map(p => (
          <button key={p.id} type="button" onClick={() => onPick(p.id)}
            className={'grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t border-line px-3 py-2 text-left first:border-t-0 hover:bg-mist ' + (p.id === pid ? 'bg-mist shadow-[inset_3px_0_0_#3E3A38]' : '')}>
            <span className="truncate font-semibold text-ink">{p.name} · T{p.size}</span>
            <span className="font-semibold text-ink tabular">{p.stock} und</span>
            <span className="col-span-2 truncate text-xs text-taupe">{p.brand} · {p.color} · {p.wh} · {p.code}</span>
          </button>
        ))}
      </div>
    </Field>
  )
}
