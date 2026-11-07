import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Product, TemplateKey } from '../types'

export type CarSec = 'detalle' | 'plan' | 'abono' | 'seg'
export type SalidaKind = 'gasto' | 'prestamo' | 'deuda'

export type DrawerState =
  | { type: 'sale'; editId?: string; clientId?: string }
  | { type: 'saleDetail'; id: string }
  | { type: 'client'; id: string }
  | { type: 'cartera'; cid: string; sec?: CarSec }
  | { type: 'salida'; kind: SalidaKind; origin: 'salidas' | 'cartera' }
  | null

export type ModalState =
  | { type: 'wa'; cid: string; tpl?: TemplateKey }
  | { type: 'order'; sup: string; firstPid?: string }
  | { type: 'product'; id?: string; onCreated?: (p: Product) => void }
  | { type: 'confirm'; title: string; message: string; cta?: string; onConfirm: () => boolean | void }
  | { type: 'supplier'; id?: string }
  | { type: 'orderEdit'; id: string }
  | { type: 'salidaEdit'; id: string }
  | { type: 'carteraEdit'; cid: string }
  | { type: 'adjust'; pid?: string }
  | { type: 'transfer'; pid?: string }
  | { type: 'clientForm'; id?: string }
  | { type: 'comercial'; id?: string }
  | null

interface UICtx {
  drawer: DrawerState
  modal: ModalState
  alertsOpen: boolean
  openDrawer: (d: DrawerState) => void
  closeDrawer: () => void
  openModal: (m: ModalState) => void
  closeModal: () => void
  setAlertsOpen: (v: boolean) => void
}

const Ctx = createContext<UICtx | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const value: UICtx = {
    drawer, modal, alertsOpen, setAlertsOpen,
    openDrawer: d => { setAlertsOpen(false); setModal(null); setDrawer(d) },
    closeDrawer: () => setDrawer(null),
    openModal: m => { setAlertsOpen(false); setModal(m) },
    closeModal: () => setModal(null),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI debe usarse dentro de UIProvider')
  return c
}
