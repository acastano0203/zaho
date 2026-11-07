import { Link } from 'react-router-dom'
import { useUI } from '../../store/UIStore'
import { LogoMark } from '../ui/Icons'
import { useKpis } from './useKpis'

export function TopBar() {
  const kpis = useKpis()
  const ui = useUI()
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-linen bg-white px-4 py-3 md:px-6 xl:flex-nowrap xl:gap-5">
      <Link to="/ventas" aria-label="ZAHO inicio" className="flex flex-1 items-center gap-2.5 text-ink xl:flex-none">
        <LogoMark stroke="#3E3A38" />
        <span className="flex flex-col">
          <span className="font-display text-lg leading-none tracking-[0.2em] md:text-[22px]">ZAHO</span>
          <span className="mt-1.5 text-[9px] font-light uppercase tracking-[0.32em] text-taupe">Inventario · Tienda multimarca</span>
        </span>
      </Link>

      <button type="button" onClick={() => ui.openDrawer({ type: 'sale' })}
        className="h-11 shrink-0 rounded-md bg-char px-4 text-[11px] font-bold tracking-[0.2em] text-cream hover:bg-ink md:px-5 md:text-xs xl:order-last">
        + NUEVA VENTA
      </button>

      <div aria-label="Indicadores del día"
        className="no-scrollbar order-last -mx-4 flex w-[calc(100%+2rem)] snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:w-full md:gap-0 md:px-0 md:pb-0 xl:order-none xl:min-w-0 xl:flex-1">
        {kpis.map(k => (
          <div key={k.label}
            className="flex w-[68%] shrink-0 snap-start flex-col gap-1 rounded-md border border-linen bg-paper px-3.5 py-3 sm:w-[40%] md:w-auto md:min-w-0 md:flex-1 md:rounded-none md:border-0 md:border-l md:bg-transparent md:px-4 md:py-0.5 md:first:border-l-0 xl:first:border-l">
            <span className="truncate text-[10px] uppercase tracking-[0.2em] text-taupe">{k.label}</span>
            <span className={'whitespace-nowrap font-display text-[15px] tabular xl:text-[17px] ' + (k.danger ? 'text-bad' : 'text-ink')}>{k.value}</span>
            <span className="truncate text-xs text-taupe">{k.sub}</span>
          </div>
        ))}
      </div>
    </header>
  )
}
