import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppStoreProvider, useApp } from './store/AppStore'
import { Button } from './components/ui/Button'
import { missingConfig } from '../config/env'
import { UIProvider } from './store/UIStore'
import { SessionProvider, useSession } from './store/SessionStore'
import { AppLayout } from './components/layout/AppLayout'
import { navFor } from './components/layout/navItems'
import { Empty } from './components/ui/Display'
import { LogoMark } from './components/ui/Icons'
import LoginPage from './pages/LoginPage'
import VentasPage from './pages/VentasPage'
import ClientesPage from './pages/ClientesPage'
import InventarioPage from './pages/InventarioPage'
import CarteraPage from './pages/CarteraPage'
import ProveedoresPage from './pages/ProveedoresPage'
import PedidosPage from './pages/PedidosPage'
import CajaPage from './pages/CajaPage'
import ComercialesPage from './pages/ComercialesPage'
import ReportesPage from './pages/ReportesPage'
import UsuariosPage from './pages/UsuariosPage'

/** Pantalla mientras se verifica la sesión guardada */
function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-mist text-ink" aria-busy="true">
      <LogoMark stroke="#3E3A38" width={40} height={46} className="animate-pulse" />
      <span className="text-[10px] uppercase tracking-[0.32em] text-taupe">Cargando…</span>
    </div>
  )
}

/** Solo deja ver la página si el usuario tiene el permiso */
function Guard({ perm, children }: { perm: string; children: ReactNode }) {
  const { can } = useSession()
  if (can(perm)) return <>{children}</>
  return <Empty className="mt-6">No tienes permiso para ver este módulo. Si lo necesitas, pídeselo al administrador.</Empty>
}

/** Inicio: primer módulo que el usuario puede ver */
function Home() {
  const { can } = useSession()
  const first = navFor(can)[0]
  if (first) return <Navigate to={first.to} replace />
  return <Empty className="mt-6">Tu rol no tiene acceso a ningún módulo todavía. Pídele al administrador que te asigne permisos.</Empty>
}

/** Modo Supabase: trae los datos de la base al entrar */
function DataGate({ children }: { children: ReactNode }) {
  const { sync, reload } = useApp()
  useEffect(() => { if (sync.status === 'idle') void reload() }, [sync.status, reload])
  if (sync.status === 'ready') return <>{children}</>
  if (sync.status === 'error') return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-mist px-6 text-center text-ink">
      <p className="max-w-md text-[14px]">No se pudieron cargar los datos de la base de datos.</p>
      <p className="max-w-md text-xs text-taupe">{sync.error}</p>
      <Button variant="dark" onClick={() => void reload()}>Reintentar</Button>
    </div>
  )
  return <Splash />
}

function AppRoutes() {
  const { status } = useSession()
  if (status === 'loading') return <Splash />
  if (status === 'out' || status === 'setup') return <LoginPage />
  return <DataGate><LoggedIn /></DataGate>
}

function LoggedIn() {
  const page = (perm: string, el: ReactNode) => <Guard perm={perm}>{el}</Guard>
  return (
    <UIProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="ventas" element={page('ventas.ver', <VentasPage />)} />
          <Route path="clientes" element={page('clientes.ver', <ClientesPage />)} />
          <Route path="inventario" element={page('inventario.ver', <InventarioPage />)} />
          <Route path="cartera" element={page('cartera.ver', <CarteraPage />)} />
          <Route path="pedidos" element={page('pedidos.ver', <PedidosPage />)} />
          <Route path="proveedores" element={page('proveedores.ver', <ProveedoresPage />)} />
          <Route path="caja" element={page('caja.ver', <CajaPage />)} />
          <Route path="salidas" element={<Navigate to="/caja" replace />} />
          <Route path="comerciales" element={page('comerciales.ver', <ComercialesPage />)} />
          <Route path="reportes" element={page('reportes.ver', <ReportesPage />)} />
          <Route path="usuarios" element={page('usuarios.ver', <UsuariosPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UIProvider>
  )
}

/** Versión publicada sin las variables de Supabase: no se abre nada */
function ConfigError({ faltan }: { faltan: string[] }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-mist px-6 text-center text-ink">
      <LogoMark stroke="#3E3A38" width={40} height={46} />
      <h1 className="text-lg">Falta configurar la conexión con la base de datos</h1>
      <p className="max-w-md text-[13px] text-char">
        El servidor donde está publicada la app no tiene estas variables: <b>{faltan.join(', ')}</b>.
        Agrégalas en la configuración del hosting y vuelve a desplegar.
      </p>
    </div>
  )
}

export default function App() {
  const faltan = missingConfig()
  if (faltan.length) return <ConfigError faltan={faltan} />
  return (
    <AppStoreProvider>
      <SessionProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </SessionProvider>
    </AppStoreProvider>
  )
}
