import { NavLink } from 'react-router-dom'
import { navFor } from './navItems'
import { useSession } from '../../store/SessionStore'
import { useApp } from '../../store/AppStore'

/** Navegación inferior para celular */
export function BottomNav() {
  const { can } = useSession()
  const { data } = useApp()
  return (
    <nav aria-label="Módulos" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-linen bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {navFor(can).filter(n => n.bottom !== false).map(n => (
        <NavLink key={n.to} to={n.to}
          className={({ isActive }) =>
            'flex h-[62px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[9px] tracking-wide ' +
            (isActive ? 'font-semibold text-ink shadow-[inset_0_2px_0_#3E3A38]' : 'text-taupe')}>
          <span className="relative">
            {n.icon}
            {(n.badge?.(data) ?? 0) > 0 && <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-warn" aria-label="Hay por pedir" />}
          </span>
          <span className="max-w-full truncate">{n.short}</span>
        </NavLink>
      ))}
    </nav>
  )
}
