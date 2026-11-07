import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Dot, Switch } from '../../../components/ui/Display'
import { IconReset, IconX, LogoMark, WaIcon } from '../../../components/ui/Icons'
import { useAlerts } from '../hooks/useAlerts'

/** Columna fija en escritorio grande; pantalla completa en celular/tablet */
export function AlertsPanel() {
  const alerts = useAlerts()
  const ui = useUI()
  const { data, commit, reset } = useApp()

  const toggleDaily = () => commit(d => ({
    data: { ...d, daily: !d.daily },
    msg: !d.daily ? 'Te llegará el resumen diario a las 8:00 a.m.' : 'Resumen diario desactivado',
  }))

  return (
    <aside aria-label="Alertas"
      className={(ui.alertsOpen ? 'fixed inset-0 z-55 block overflow-x-hidden overflow-y-auto' : 'relative hidden overflow-hidden') +
        ' border-l border-linen bg-paper text-char xl:relative xl:inset-auto xl:z-auto xl:block xl:w-[340px] xl:shrink-0 xl:overflow-hidden'}>
      <LogoMark className="pointer-events-none absolute -right-16 -bottom-8 opacity-5" width={380} height={380} />
      <div className="relative z-1 flex flex-col gap-4 px-5 pt-5 pb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base tracking-wider text-ink">
            Alertas <span className="ml-1.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-bad px-1.5 align-middle font-sans text-xs text-cream">{alerts.length}</span>
          </h2>
          <button type="button" onClick={() => ui.setAlertsOpen(false)} aria-label="Cerrar alertas"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-sand-dark xl:hidden">
            <IconX size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-linen bg-white p-3">
          <Switch on={data.daily} onClick={toggleDaily} label="Recibir resumen diario en WhatsApp" />
          <span className="text-[13px] leading-snug">Recibir resumen diario en mi WhatsApp a las 8:00 a.m.</span>
        </div>

        <div className="flex flex-col">
          {alerts.map(a => (
            <div key={a.key} className="grid grid-cols-[10px_minmax(0,1fr)] gap-x-3 gap-y-2.5 border-t border-linen py-3.5">
              <Dot color={a.color} className="mt-1.5" />
              <div>
                <div className="text-sm leading-snug text-ink">{a.text}</div>
                <div className="mt-0.5 text-xs text-taupe">{a.sub}</div>
              </div>
              <button type="button" onClick={a.act}
                className="col-start-2 inline-flex h-11 items-center gap-2 justify-self-start rounded-md border border-char bg-white px-3 text-xs text-ink hover:bg-cream md:h-9">
                {a.isWa && <WaIcon />}{a.btn}
              </button>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-[13px] text-taupe">Sin alertas por ahora. Aquí aparecen cobros por vencer, préstamos y productos por pedir.</p>
          )}
        </div>

        <button type="button" onClick={() => { if (confirm('¿Restablecer todos los datos de ejemplo? Se perderán los cambios.')) reset() }}
          className="mt-2 inline-flex h-11 items-center gap-2 self-start text-xs text-taupe underline underline-offset-4 hover:text-ink">
          <IconReset size={14} /> Restablecer datos de ejemplo
        </button>
      </div>
    </aside>
  )
}
