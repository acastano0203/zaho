import { useUI } from '../../../store/UIStore'
import { IconBell } from '../../../components/ui/Icons'
import { useAlerts } from '../hooks/useAlerts'

/** Botón flotante para abrir alertas cuando no hay columna lateral */
export function AlertsFab() {
  const ui = useUI()
  const n = useAlerts().length
  return (
    <button type="button" onClick={() => ui.setAlertsOpen(true)} aria-label="Ver alertas"
      className="fixed right-4 bottom-[84px] z-40 inline-flex h-[52px] items-center gap-2.5 rounded-full border border-char bg-char px-4 text-xs font-bold tracking-[0.16em] text-cream shadow-lg md:bottom-6 xl:hidden">
      <IconBell />ALERTAS
      <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-bad px-1.5 tracking-normal">{n}</span>
    </button>
  )
}
