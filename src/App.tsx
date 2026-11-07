import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppStoreProvider } from './store/AppStore'
import { UIProvider } from './store/UIStore'
import { AppLayout } from './components/layout/AppLayout'
import VentasPage from './pages/VentasPage'
import ClientesPage from './pages/ClientesPage'
import InventarioPage from './pages/InventarioPage'
import CarteraPage from './pages/CarteraPage'
import ProveedoresPage from './pages/ProveedoresPage'
import SalidasPage from './pages/SalidasPage'
import ComercialesPage from './pages/ComercialesPage'
import ReportesPage from './pages/ReportesPage'

export default function App() {
  return (
    <AppStoreProvider>
      <HashRouter>
        <UIProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/ventas" replace />} />
              <Route path="ventas" element={<VentasPage />} />
              <Route path="clientes" element={<ClientesPage />} />
              <Route path="inventario" element={<InventarioPage />} />
              <Route path="cartera" element={<CarteraPage />} />
              <Route path="proveedores" element={<ProveedoresPage />} />
              <Route path="salidas" element={<SalidasPage />} />
              <Route path="comerciales" element={<ComercialesPage />} />
              <Route path="reportes" element={<ReportesPage />} />
              <Route path="*" element={<Navigate to="/ventas" replace />} />
            </Route>
          </Routes>
        </UIProvider>
      </HashRouter>
    </AppStoreProvider>
  )
}
