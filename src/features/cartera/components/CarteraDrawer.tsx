import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI, type CarSec } from '../../../store/UIStore'
import { Drawer } from '../../../components/ui/Drawer'
import { Button } from '../../../components/ui/Button'
import { Box, Dot, Pill, Progress, Stat } from '../../../components/ui/Display'
import { Label } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { WaIcon } from '../../../components/ui/Icons'
import { C } from '../../../lib/constants'
import { fl } from '../../../lib/dates'
import { cop, phone } from '../../../lib/format'
import { stInfo } from '../../../lib/finance'
import { comName } from '../../../lib/selectors'
import { waLabel } from './CarteraTable'
import { CarteraDetailTab } from './CarteraDetailTab'
import { CarteraPlanTab } from './CarteraPlanTab'
import { CarteraAbonoTab } from './CarteraAbonoTab'
import { CarteraSeguimientoTab } from './CarteraSeguimientoTab'

export function CarteraDrawer({ cid, sec: initial = 'detalle' }: { cid: string; sec?: CarSec }) {
  const { data, carRows } = useApp()
  const ui = useUI()
  const [sec, setSec] = useState<CarSec>(initial)
  const r = carRows.find(x => x.c.id === cid)
  if (!r) return null
  const i = stInfo(r.st, r.c.kind)
  const nPaid = r.cu.filter(q => q.paid >= q.amount).length

  let prom = '', promColor = C.warn
  if (r.promSt === 'incumplida') { prom = 'Prometió pagar el ' + fl(r.prom!.promesa!) + ' y no ha abonado.'; promColor = C.bad }
  else if (r.promSt === 'hoy') prom = 'Prometió pagar hoy.'
  else if (r.promSt === 'pendiente') prom = 'Prometió pagar el ' + fl(r.prom!.promesa!) + '.'

  return (
    <Drawer wide onClose={ui.closeDrawer} title={r.c.client}
      kicker={r.c.kind === 'prestamo' ? 'Préstamo por recuperar' : 'Cartera · ' + (r.c.saleId || r.c.ref) + ' · ' + comName(data, r.c.com)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-taupe tabular">{phone(r.c.phone)}</span>
        <Pill color={i.color}>{i.label}</Pill>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between gap-3"><Label>Pagado · {r.pct}%</Label><span className="text-taupe tabular">{cop(r.paid)} de {cop(r.total)}</span></div>
        <Progress lg value={r.pct} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Saldo" value={cop(r.saldo)} sub="por cobrar" />
        <Stat label="Próxima cuota" value={r.next ? cop(r.next.amount - r.next.paid) : '—'} sub={r.next ? fl(r.next.due) : 'Sin cuotas pendientes'} />
        <Stat label="Días" value={r.saldo <= 0 ? '—' : r.days < 0 ? -r.days : r.days === 0 ? 'Hoy' : r.days}
          sub={r.saldo <= 0 ? 'cuenta saldada' : r.days < 0 ? 'días de mora' : r.days === 0 ? 'vence la cuota' : 'para la próxima cuota'} />
        <Stat label="Cuotas" value={nPaid + ' / ' + r.cu.length} sub={r.hasPlan ? 'cuotas pagadas' : 'pago único, sin plan'} />
      </div>
      {prom && <Box warn className="flex-row items-center"><Dot color={promColor} /><span>{prom}</span></Box>}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <Segmented full label="Sección" value={sec} onChange={setSec}
          options={[{ value: 'detalle', label: 'Detalle' }, { value: 'plan', label: 'Plan' }, { value: 'abono', label: 'Abonar' }, { value: 'seg', label: 'Seguimiento' }]} />
        <Button onClick={() => ui.openModal({ type: 'wa', cid })}><WaIcon />{waLabel(r)}</Button>
      </div>

      {sec === 'detalle' && <CarteraDetailTab r={r} goPlan={() => setSec('plan')} goAbono={() => setSec('abono')} />}
      {sec === 'plan' && <CarteraPlanTab r={r} goAbono={() => setSec('abono')} />}
      {sec === 'abono' && <CarteraAbonoTab key={r.c.abonos.length} r={r} onDone={done => setSec(done ? 'seg' : 'plan')} />}
      {sec === 'seg' && <CarteraSeguimientoTab r={r} />}
    </Drawer>
  )
}
