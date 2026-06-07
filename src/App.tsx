import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Effluents from './pages/Effluents';
import Compost from './pages/Compost';
import GreenAreas from './pages/GreenAreas';
import Environmental from './pages/Environmental';
import Setup from './pages/Setup';
import Admin from './pages/Admin';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c5dc] mb-4"></div>
        <p className="font-semibold text-slate-400">Verificando Credenciales de Acceso...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<Login />} />

          {/* Secure Corporate Console routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="efluentes" element={<Effluents />} />
            <Route path="compostaje" element={<Compost />} />
            <Route path="areas-verdes" element={<GreenAreas />} />
            <Route path="gestion-ambiental" element={<Environmental />} />
            <Route path="setup" element={<Setup />} />
            <Route path="administracion" element={<Admin />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
