import type { ReactNode } from 'react'
import { IconBag, IconBox, IconChart, IconContacts, IconCash, IconShield, IconTeam, IconTruck, IconWallet } from '../ui/Icons'

export interface NavItem {
  to: string
  label: string
  short: string
  icon: ReactNode
  /** Permiso necesario para ver el módulo */
  perm: string
  /** false = no aparece en la barra inferior del celular (se llega desde la barra superior) */
  bottom?: boolean
}

export const NAV: NavItem[] = [
  { to: '/ventas', label: 'Ventas', short: 'Ventas', icon: <IconBag />, perm: 'ventas.ver' },
  { to: '/clientes', label: 'Clientes', short: 'Clientes', icon: <IconContacts />, perm: 'clientes.ver' },
  { to: '/inventario', label: 'Inventario', short: 'Invent.', icon: <IconBox />, perm: 'inventario.ver' },
  { to: '/cartera', label: 'Cartera', short: 'Cartera', icon: <IconWallet />, perm: 'cartera.ver' },
  { to: '/proveedores', label: 'Proveedores', short: 'Prov.', icon: <IconTruck />, perm: 'proveedores.ver' },
  { to: '/caja', label: 'Caja', short: 'Caja', icon: <IconCash />, perm: 'caja.ver' },
  { to: '/comerciales', label: 'Comerciales', short: 'Equipo', icon: <IconTeam />, perm: 'comerciales.ver' },
  { to: '/reportes', label: 'Reportes', short: 'Report.', icon: <IconChart />, perm: 'reportes.ver' },
  { to: '/usuarios', label: 'Usuarios', short: 'Usuarios', icon: <IconShield />, perm: 'usuarios.ver', bottom: false },
]

/** Módulos que puede ver el usuario conectado */
export const navFor = (can: (p: string) => boolean) => NAV.filter(i => can(i.perm))
