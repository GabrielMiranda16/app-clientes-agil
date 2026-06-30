import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { CompanyProvider } from '@/contexts/CompanyContext'; // Importar CompanyProvider
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

import LoginPage from '@/pages/Login';
import CEODashboard from '@/pages/CEODashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminSelecaoPage from '@/pages/AdminSelecaoPage';
import AdminParceirosPage from '@/pages/AdminParceirosPage';
import AdminLembretesPage from '@/pages/AdminLembretesPage';
import ParceiroDashboard from '@/pages/ParceiroDashboard';
import AdminClientePage from '@/pages/AdminClientePage';
import AdminSegmentoPage from '@/pages/AdminSegmentoPage';
import ClientDashboard from '@/pages/ClientDashboard';
import UnauthorizedPage from '@/pages/Unauthorized';
import SelectSegmento from '@/pages/SelectSegmento';
import SelectApolice from '@/pages/SelectApolice';
import ApoliceDashboard from '@/pages/ApoliceDashboard';
import SolicitacoesPage from '@/pages/SolicitacoesPage';
import CoparticipacaoPage from '@/pages/CoparticipacaoPage';
import CoparticipacaoClientePage from '@/pages/CoparticipacaoClientePage';
import ForceChangePassword from '@/pages/ForceChangePassword';
import TermosAceite from '@/pages/TermosAceite';
import OrcamentoPublicoPage from '@/pages/OrcamentoPublicoPage';

const AppRoutes = () => {
  const { user, authLoading } = useAuth();

  const getHomeRoute = () => {
    if (!user) return '/login';
    switch (user.perfil) {
      case 'CEO': return '/ceo';
      case 'ADM': return '/admin';
      case 'CLIENTE': return '/select-segmento';
      case 'PARCEIRO': return '/parceiro';
      default: return '/login';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route
        path="/termos-aceite"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM', 'CLIENTE', 'PARCEIRO']}>
            <TermosAceite />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ceo"
        element={
          <ProtectedRoute allowedRoles={['CEO']}>
            <CEODashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <AdminSelecaoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clientes"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orcamentos"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <AdminParceirosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/parceiros"
        element={<Navigate to="/admin/orcamentos" replace />}
      />
      <Route
        path="/admin/lembretes"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <AdminLembretesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parceiro"
        element={
          <ProtectedRoute allowedRoles={['PARCEIRO']}>
            <ParceiroDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cliente/:matrizId"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <AdminClientePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cliente/:matrizId/segmento/:segmento"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <AdminSegmentoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/solicitacoes"
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <SolicitacoesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/coparticipacao" 
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM']}>
            <CoparticipacaoPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cliente/:empresaId" 
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM', 'CLIENTE']}>
            <ClientDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cliente/:empresaId/coparticipacao" 
        element={
          <ProtectedRoute allowedRoles={['CEO', 'ADM', 'CLIENTE']}>
            <CoparticipacaoClientePage />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/select-segmento"
        element={
          <ProtectedRoute allowedRoles={['CLIENTE']}>
            <SelectSegmento />
          </ProtectedRoute>
        }
      />
      <Route
        path="/select-apolice/:segmento"
        element={
          <ProtectedRoute allowedRoles={['CLIENTE']}>
            <SelectApolice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/apolice/:apoliceId"
        element={
          <ProtectedRoute allowedRoles={['CLIENTE', 'CEO', 'ADM']}>
            <ApoliceDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/force-change-password" element={<ProtectedRoute allowedRoles={['CEO','ADM','CLIENTE','PARCEIRO']}><ForceChangePassword /></ProtectedRoute>} />
      <Route path="/orcamento/:slug" element={<OrcamentoPublicoPage />} />
      <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <CompanyProvider> {/* CompanyProvider envolvendo o Router */}
        <Router>
          <AppRoutes />
          <Toaster />
        </Router>
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;