import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Button } from '../../../components/ui/Button'
import { Card, Pill, Row } from '../../../components/ui/Display'
import { fd, fl, today } from '../../../../shared/lib/dates'
import { C } from '../../../../shared/lib/constants'
import { daysLabel, stInfo } from '../../../../domain/rules/finance'
import { cop, phone } from '../../../../shared/lib/format'
import { comName } from '../../../lib/selectors'
import { useSession } from '../../../store/SessionStore'
import { IconTrash } from '../../../components/ui/Icons'
import { useCarteraActions } from '../hooks/useCartera'
import type { CarRow, CuotaCalc } from '../../../../domain/entities'

/** Estado de una cuota según lo abonado y su fecha */
function cuotaSt(q: CuotaCalc, T: string) {
  if (q.paid >= q.amount) return { label: 'Pagada', color: C.ok }
  if (q.due < T) return { label: q.paid > 0 ? 'Vencida · parcial' : 'Vencida', color: C.bad }
  if (q.paid > 0) return { label: 'Abono parcial', color: C.warn }
  return { label: 'Pendiente', color: C.stone }
}

export function CarteraDetailTab({ r, goPlan, goAbono }: { r: CarRow; goPlan: () => void; goAbono: () => void }) {
  const { data } = useApp()
  const ui = useUI()
  const { can } = useSession()
  const { quitarRecargo } = useCarteraActions()
  const ab0 = r.c.abonos.find(a => a.label === 'Abono inicial')
  const planTxt = r.hasPlan ? r.cu.length + ' cuotas · ' + fd(r.cu[0].due) + ' a ' + fd(r.cu[r.cu.length - 1].due) : 'Pago único · ' + fl(r.c.due)

  let rows: [string, string][]
  if (r.sale) {
    rows = [['Venta', r.sale.id + ' · ' + fl(r.sale.date)], ['Comercial', comName(data, r.c.com)], ['Valor de la venta', cop(r.total - r.mora)],
      ['Abono inicial', ab0 ? cop(ab0.val) : 'Sin abono'], ['Plan de pagos', planTxt], ['Teléfono', phone(r.c.phone)]]
  } else if (r.c.kind === 'prestamo') {
    rows = [['Valor prestado', cop(r.total - r.mora)], ['Entregado el', fl(r.c.created)], ['Cómo se entregó', r.c.met || '—'],
      ['Salida registrada', r.c.salidaId || r.c.ref || '—'], ['Plan de devolución', planTxt], ['Nota', r.c.nota || '—'], ['WhatsApp', phone(r.c.phone)]]
  } else {
    rows = [['Concepto', r.c.concepto || r.c.ref || '—'], ['Registrada el', fl(r.c.created)], ['Valor total', cop(r.total - r.mora)],
      ['Abono inicial', ab0 ? cop(ab0.val) : 'Sin abono'], ['Comercial', comName(data, r.c.com)], ['Plan de pagos', planTxt], ['Nota', r.c.nota || '—'], ['WhatsApp', phone(r.c.phone)]]
  }

  if (r.mora > 0) rows.splice(1, 0, ['Recargos por mora', '+' + cop(r.mora)], ['Total a cobrar', cop(r.total)])
  const recargos = (r.c.recargos ?? []).slice().reverse()
  const T = today()
  const abonos = r.c.abonos.slice().reverse()
  const ultimo = r.c.abonos[r.c.abonos.length - 1]
  const st = stInfo(r.st, r.c.kind)
  const estado: [string, string][] = [
    ['Estado', st.label], ['Creada el', fl(r.c.created)],
    [r.saldo > 0 ? 'Próximo vencimiento' : 'Vencimiento', fl(r.refDue)], ['Días', daysLabel(r)],
    ['Total', cop(r.total)], ['Pagado', cop(r.paid) + ' · ' + r.pct + '%'], ['Saldo', cop(r.saldo)],
    ['Último abono', ultimo ? cop(ultimo.val) + ' · ' + fd(ultimo.date) : 'Sin abonos'],
  ]

  return (
    <>
      {r.sale && (
        <div className="rounded-md border border-linen bg-white">
          {r.sale.items.map(it => {
            const p = data.products.find(x => x.id === it.pid)
            const up = it.price
            return (
              <div key={it.pid} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{p?.name || '—'}</div>
                  <div className="text-xs text-taupe">{p ? p.brand + ' · Talla ' + p.size + ' · ' + p.color + ' · ' + it.qty + ' × ' + cop(up) : ''}</div>
                </div>
                <span className="font-semibold text-ink tabular">{cop(it.qty * up)}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="px-4 py-1">
          <div className="flex items-center justify-between pt-2.5 pb-1"><span className="text-[11px] uppercase tracking-[0.22em] text-char">Estado de la cuenta</span><Pill color={st.color}>{st.label}</Pill></div>
          {estado.slice(1).map(([l, v]) => <Row key={l} label={l} value={v} />)}
        </Card>
        <Card className="bg-cream px-4 py-1">
          {rows.map(([l, v]) => <Row key={l} label={l} value={v} />)}
        </Card>
      </div>
      {r.cu.length > 0 && (
        <div className="rounded-md border border-linen bg-white text-[13px]">
          <div className="grid grid-cols-[44px_minmax(0,1fr)_90px_90px_auto] gap-2 border-b border-linen bg-paper px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-char">
            <span>Cuota</span><span>Vence</span><span className="text-right">Valor</span><span className="text-right">Abonado</span><span className="text-right">Estado</span>
          </div>
          {r.cu.map(q => {
            const i = cuotaSt(q, T)
            return (
              <div key={q.n} className="grid grid-cols-[44px_minmax(0,1fr)_90px_90px_auto] items-center gap-2 border-t border-line px-3 py-1.5 first:border-t-0 tabular">
                <span className="text-taupe">{r.hasPlan ? q.n + '/' + r.cu.length : 'Única'}</span>
                <span>{fd(q.due)}</span>
                <span className="text-right text-ink">{cop(q.amount)}</span>
                <span className="text-right">{cop(Math.min(q.paid, q.amount))}</span>
                <span className="flex justify-end"><Pill color={i.color}>{i.label}</Pill></span>
              </div>
            )
          })}
        </div>
      )}
      <div className="rounded-md border border-linen bg-white text-[13px]">
        <div className="px-3 pt-2.5 pb-1 text-[11px] uppercase tracking-[0.22em] text-char">Historial de abonos</div>
        {abonos.length ? abonos.map((a, ix) => (
          <div key={a.id ?? ix} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-line px-3 py-1.5">
            <div className="min-w-0">
              <div className="text-ink">{fd(a.date)} · {a.label}</div>
              <div className="truncate text-xs text-taupe">{(a.met || 'Sin medio de pago') + (a.alloc?.length ? ' · ' + a.alloc.map(x => 'cuota ' + x.n).join(', ') : '')}</div>
            </div>
            <span className="font-semibold text-ink tabular">{cop(a.val)}</span>
          </div>
        )) : <p className="border-t border-line px-3 py-2 text-taupe">Todavía no hay abonos.</p>}
      </div>
      {recargos.length > 0 && (
        <div className="rounded-md border border-warn/50 bg-[#FBF5EA]">
          <div className="px-3 pt-2.5 text-[11px] uppercase tracking-[0.22em] text-char">Recargos por mora</div>
          {recargos.map(x => (
            <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-t border-line px-3 py-2 first:border-t-0">
              <div className="min-w-0 text-[13px]">
                <div className="text-ink">{fd(x.date)} · {x.tipo === 'pct' ? String(x.pct).replace('.', ',') + '% sobre ' + cop(x.base) : 'Valor fijo'}</div>
                {x.nota && <div className="truncate text-xs text-taupe">{x.nota}</div>}
              </div>
              <span className="font-semibold text-ink tabular">{cop(x.val)}</span>
              {can('cartera.editar') ? (
                <Button size="sm" variant="ghost" className="text-bad md:w-8 md:px-0" aria-label="Quitar recargo" title="Quitar recargo"
                  onClick={() => ui.openModal({ type: 'confirm', title: 'Quitar recargo de ' + cop(x.val), message: 'El saldo de la cuenta baja en ' + cop(x.val) + '.', cta: 'Quitar', onConfirm: () => quitarRecargo(r.c.id, x.id) })}>
                  <IconTrash size={15} />
                </Button>
              ) : <span />}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {r.sale && <Button onClick={() => ui.openDrawer({ type: 'sale', editId: r.sale!.id })}>Editar venta</Button>}
        <Button onClick={goPlan}>Ver plan de pagos</Button>
        {r.st === 'ven' && r.saldo > 0 && can('cartera.editar') && (
          <Button onClick={() => ui.openModal({ type: 'recargo', cids: [r.c.id] })}>Recargo por mora</Button>
        )}
        {r.saldo > 0 && <Button variant="dark" onClick={goAbono}>Registrar abono</Button>}
      </div>
    </>
  )
}
