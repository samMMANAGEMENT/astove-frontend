import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import DashboardSelector from "./components/DashboardSelector";
import UsersListPage from "./pages/UsersListPage";
import SucursalesPage from "./pages/SucursalesPage";
import ClientesPage from "./pages/ClientesPage";
import ProductosPage from "./pages/ProductosPage";
import VentasPage from "./pages/VentasPage";
import DefaultLayout from "./layout/default";
import ProtectedRoute from "./components/ProtectedRoute";
import { LoadingOverlay } from "./components/ui";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorPage from "./pages/ErrorPage";
import ZonasPage from "./pages/ZonesPage";
import ServiciosPage from "./pages/ServiciosPage";
import ServicesRegister from "./pages/ServicesRegister";
import PagosPage from "./pages/PagosPage";
import OperadoresPage from "./pages/OperadoresPage";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import IngresosAdicionalesPage from "./pages/IngresosAdicionalesPage";
import GastosPage from "./pages/GastosPage";
import InventarioPage from "./pages/InventarioPage";
import AgendasPage from "./pages/AgendasPage";
import AgendaCalendarioPage from "./pages/AgendaCalendarioPage";
import FacturacionPage from "./pages/FacturacionPage";


function AppContent() {
  const { isPostLoginLoading } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DefaultLayout>
              <DashboardSelector />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/usuarios/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <UsersListPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/sucursales/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <SucursalesPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/clientes/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <ClientesPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/productos" element={
          <ProtectedRoute>
            <DefaultLayout>
              <ProductosPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/ventas" element={
          <ProtectedRoute>
            <DefaultLayout>
              <VentasPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/zonas/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <ZonasPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/servicios/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <ServiciosPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/servicios/registrar" element={
          <ProtectedRoute>
            <DefaultLayout>
              <ServicesRegister />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/ingresos-adicionales" element={
          <ProtectedRoute>
            <DefaultLayout>
              <IngresosAdicionalesPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/gastos" element={
          <ProtectedRoute>
            <DefaultLayout>
              <GastosPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/pagos/registrar" element={
          <ProtectedRoute>
            <DefaultLayout>
              <PagosPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/operadores/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <OperadoresPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/roles-permisos" element={
          <ProtectedRoute>
            <DefaultLayout>
              <RolesPermissionsPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/reportes/analytics" element={
          <ProtectedRoute>
            <DefaultLayout>
              <AnalyticsPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/inventario/lista" element={
          <ProtectedRoute>
            <DefaultLayout>
              <InventarioPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/agendas" element={
          <ProtectedRoute>
            <DefaultLayout>
              <AgendasPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/agendas/:agendaId/calendario" element={
          <ProtectedRoute>
            <DefaultLayout>
              <AgendaCalendarioPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/facturacion" element={
          <ProtectedRoute>
            <DefaultLayout>
              <FacturacionPage />
            </DefaultLayout>
          </ProtectedRoute>
        } />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<Navigate to="/error" />} />
      </Routes>
      <LoadingOverlay isVisible={isPostLoginLoading} />
      <ToastContainer />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;