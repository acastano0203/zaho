import { NavLink } from 'react-router-dom'
import { NAV } from './navItems'

/** Menú lateral: solo íconos en tablet (md), íconos + texto en escritorio (lg) */
export function Sidebar() {
  return (
    <nav aria-label="Módulos" className="hidden w-[68px] shrink-0 flex-col gap-0.5 border-r border-linen bg-mist px-2 py-4 md:flex lg:w-56 lg:px-3 lg:py-5">
      <span className="hidden px-3 pb-3 text-[10px] uppercase tracking-[0.24em] text-taupe lg:block">Módulos</span>
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to} title={n.label}
          className={({ isActive }) =>
            'flex h-11 items-center justify-center gap-3 rounded-md text-[11px] uppercase tracking-[0.18em] transition-colors lg:justify-start lg:px-3 ' +
            (isActive ? 'bg-white font-semibold text-ink shadow-[inset_3px_0_0_#3E3A38,0_0_0_1px_#E8E2D9]' : 'text-char hover:bg-[#EFEAE3] hover:text-ink')}>
          <span className="shrink-0">{n.icon}</span>
          <span className="sr-only lg:not-sr-only">{n.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
