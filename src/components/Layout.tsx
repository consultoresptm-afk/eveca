import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Droplet, 
  Activity, 
  TreePine, 
  Settings, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  Building,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, profile, loading, signOut, isSuperAdmin, setProfileState } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [requestError, setRequestError] = useState('');

  const handleRequestAccess = async () => {
    if (!user) return;
    setIsSending(true);
    setRequestError('');
    setSuccessMessage('');
    try {
      // 1. Upsert profile in Supabase to guarantee record creation
      const userNameValue = profile?.name || user.email?.split('@')[0] || 'Nuevo Usuario';
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: userNameValue,
          status: 'pending',
          access_requested_at: new Date().toISOString(),
          approval_requested: true,
          role: profile?.role || 'PENDING'
        });

      if (dbError) {
        throw new Error(`Error en base de datos: ${dbError.message}`);
      }

      // 2. Refresh local profile cache to prevent double sending and show pending status immediately
      setProfileState({
        id: user.id,
        email: user.email || '',
        name: userNameValue,
        status: 'pending',
        approval_requested: true,
        access_requested_at: new Date().toISOString(),
        role: profile?.role || 'PENDING'
      });

      // 3. Call server-side API proxy to send email via Resend
      const appUrl = window.location.origin;
      const res = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: profile?.name || user.email?.split('@')[0] || 'Usuario Nuevo',
          userEmail: user.email,
          appUrl
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn("Resend email server proxy returned error status, but DB is updated:", errorData);
      }

      setSuccessMessage("✅ Solicitud enviada. La Jefatura de Sostenibilidad revisará tu acceso pronto.");
    } catch (err: any) {
      console.error(err);
      setRequestError(err.message || 'Ocurrió un error inesperado al tramitar tu solicitud.');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c5dc] mb-4"></div>
        <p className="font-medium text-slate-400">Verificando sesión en Eveca...</p>
      </div>
    );
  }

  if (!user) {
    // React Router will redirect, but safeguard in-render anyway
    return null;
  }

  // Bypass modal gate for supreme admin & authenticated approved profiles
  const isApproved = user.email === 'wmartinezm360@gmail.com' || profile?.status === 'approved' || profile?.role === 'SUPERADMIN';

  if (!isApproved) {
    const hasRequested = profile?.approval_requested === true || !!successMessage;
    
    return (
      <div className="min-h-screen flex items-center justify-center dashboard-bg p-4">
        <div className="dash-card p-8 md:p-12 text-center max-w-lg w-full relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ff3d60]"></div>
          
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[#ff3d60]/10 rounded-full text-[#ff3d60]">
              <ShieldAlert className="h-12 w-12" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Pendiente / Denegado</h2>
          <p className="text-slate-400 text-sm mb-6">
            Para ingresar al sistema de sostenibilidad, tu usuario debe recibir la habilitación correspondiente de la Jefatura de Sostenibilidad.
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-8 text-left text-xs text-slate-400 space-y-2">
            <div className="flex gap-2">
              <span className="text-[#00c5dc] font-bold">•</span>
              <span><strong>Usuario:</strong> {user.email}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#00c5dc] font-bold">•</span>
              <span><strong>Nombre:</strong> {profile?.name || 'Nuevo Ingreso'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#00c5dc] font-bold">•</span>
              <span><strong>Estado de Cuenta:</strong> <span className="text-amber-500 font-semibold uppercase">{profile?.status || 'Sin iniciar'}</span></span>
            </div>
          </div>
           
          <div className="flex flex-col gap-3">
            {hasRequested ? (
              <div className="bg-[#f8c851]/10 text-[#f8c851] p-4 rounded-md text-xs border border-[#f8c851]/20 flex items-center gap-2 text-left">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#f8c851]" />
                <span>Solicitud ya enviada. Espera la aprobación de la Jefatura.</span>
              </div>
            ) : successMessage ? (
              <div className="bg-[#11c46e]/10 text-[#11c46e] p-4 rounded-md text-xs border border-[#11c46e]/20 flex items-center gap-2 text-left">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#11c46e]" />
                <span>{successMessage}</span>
              </div>
            ) : null}

            {requestError && (
              <div className="bg-[#ff3d60]/10 text-[#ff3d60] p-4 rounded-md text-left text-xs border border-[#ff3d60]/20">
                {requestError}
              </div>
            )}

            <button 
              onClick={handleRequestAccess}
              disabled={hasRequested || isSending}
              className="w-full px-5 py-3 border border-transparent text-sm font-bold rounded-lg text-[#0b0f19] bg-[#00c5dc] hover:bg-[#00c5dc]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#0bf19] mr-1"></div>
                  Procesando...
                </>
              ) : hasRequested ? (
                'Solicitud Enviada'
              ) : (
                'Solicitar Permiso'
              )}
            </button>

            <button 
              onClick={() => signOut()} 
              className="w-full px-5 py-3 border border-slate-700 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar Links config
  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Efluentes', href: '/efluentes', icon: Droplet },
    { name: 'Compostaje', href: '/compostaje', icon: Activity },
    { name: 'Áreas Verdes', href: '/areas-verdes', icon: TreePine },
    { name: 'Gestión Ambiental', href: '/gestion-ambiental', icon: Building },
    { name: 'Setup BD', href: '/setup', icon: Settings },
  ];

  if (isSuperAdmin) {
    navItems.push({ name: 'Administración', href: '/administracion', icon: Users });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0b0f19]">
      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center bg-slate-950 border-b border-slate-800 p-4 text-white z-50">
        <div className="flex items-center gap-2">
          <Building className="w-6 h-6 text-[#11c46e]" />
          <span className="font-bold tracking-wide">EVECA S.A.S.</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Main Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 bg-slate-950 border-r border-slate-800 w-64 p-6 flex flex-col justify-between z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 hidden md:flex border-b border-slate-800/60 pb-6">
            <div className="p-2 bg-[#11c46e]/10 text-[#11c46e] rounded-lg">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-wider text-lg">EVECA</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Sostenibilidad S.A.S.</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group
                    ${isActive 
                      ? 'bg-[#00c5dc]/10 text-[#00c5dc] border-l-2 border-[#00c5dc]' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#00c5dc]' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Sign Out */}
        <div className="border-t border-slate-800 pt-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[#00c5dc] font-bold">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-white text-sm font-bold truncate leading-tight">{profile?.name || user.email?.split('@')[0]}</h4>
              <p className="text-slate-500 text-[11px] truncate leading-tight">{user.email}</p>
              <div className="mt-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#11c46e]/10 text-[#11c46e] border border-[#11c46e]/20 font-semibold uppercase">
                  {profile?.role || 'LECTOR'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              signOut();
              navigate('/login');
            }}
            className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-lg text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-[100vh] dashboard-bg p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
export default Layout;
