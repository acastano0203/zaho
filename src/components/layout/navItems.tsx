import type { ReactNode } from 'react'
import { IconBag, IconBox, IconChart, IconContacts, IconOut, IconTeam, IconTruck, IconWallet } from '../ui/Icons'

export interface NavItem { to: string; label: string; short: string; icon: ReactNode }

export const NAV: NavItem[] = [
  { to: '/ventas', label: 'Ventas', short: 'Ventas', icon: <IconBag /> },
  { to: '/clientes', label: 'Clientes', short: 'Clientes', icon: <IconContacts /> },
  { to: '/inventario', label: 'Inventario', short: 'Invent.', icon: <IconBox /> },
  { to: '/cartera', label: 'Cartera', short: 'Cartera', icon: <IconWallet /> },
  { to: '/proveedores', label: 'Proveedores', short: 'Prov.', icon: <IconTruck /> },
  { to: '/salidas', label: 'Salidas', short: 'Salidas', icon: <IconOut /> },
  { to: '/comerciales', label: 'Comerciales', short: 'Equipo', icon: <IconTeam /> },
  { to: '/reportes', label: 'Reportes', short: 'Report.', icon: <IconChart /> },
]
