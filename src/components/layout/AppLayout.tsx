import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useUI } from '../../store/UIStore'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Toast } from './Toast'
import { OverlayHost } from './OverlayHost'
import { AlertsPanel } from '../../features/alertas/components/AlertsPanel'
import { AlertsFab } from '../../features/alertas/components/AlertsFab'

export function AppLayout() {
  const { pathname } = useLocation()
  const ui = useUI()
  useEffect(() => { ui.setAlertsOpen(false); window.scrollTo(0, 0) }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar />
      <div className="flex flex-1 items-stretch">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pt-4 pb-40 md:px-6 md:pt-6 md:pb-24 lg:px-8 lg:pt-7">
          <Outlet />
        </main>
        <AlertsPanel />
      </div>
      <BottomNav />
      <AlertsFab />
      <Toast />
      <OverlayHost />
    </div>
  )
}
