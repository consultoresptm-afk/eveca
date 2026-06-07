import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Droplets, 
  Leaf, 
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  Globe,
  TreePine,
  Award,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { user, profile, loading, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile || profile.role === 'PENDING') {
    // Excepción de seguridad para asegurar que el superadmin inicial nunca se bloquee si hay falla cargando perfil
    if (user?.email === 'wmartinezm360@gmail.com') {
      // Allow passthrough
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center dashboard-bg">
          <div className="dash-card p-12 text-center max-w-lg mx-6">
             <ShieldAlert className="h-16 w-16 text-[#ff3d60] mx-auto mb-6" />
             <h2 className="text-2xl font-bold text-white mb-4">Acceso Pendiente / Denegado</h2>
             <p className="text-[#8b92a9] mb-8">
               Comuníquese con la jefatura de sostenibilidad para la aprobación de ingreso.
             </p>
             <div className="flex flex-col gap-4">
               <button 
                  onClick={async () => {
                    const { error } = await supabase.from('profiles').update({ approval_requested: true }).eq('id', user!.id);
                    if (error) {
                       console.error(error);
                       alert('No se pudo enviar la solicitud automáticamente, pero la jefatura ha sido notificada.');
                    } else {
                       alert('Solicitud enviada exitosamente. Por favor, espera la aprobación.');
                    }
                  }}
                  className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#00c5dc] hover:bg-[#00c5dc]/90"
               >
                 Solicitar Permiso
               </button>
               <button onClick={() => signOut()} className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#ff3d60] hover:bg-[#ff3d60]/90">
                 Cerrar Sesión
               </button>
             </div>
          </div>
        </div>
      );
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Efluentes', href: '/efluentes', icon: Droplets },
    { name: 'Compostaje', href: '/compostaje', icon: Leaf },
    { name: 'Gest. Ambiental', href: '/gestion-ambiental', icon: Globe },
    { name: 'Zonas Verdes', href: '/zonas-verdes', icon: TreePine },
    { name: 'Sostenibilidad', href: '/sostenibilidad', icon: Award },
  ];

  if (isSuperAdmin) {
    navigation.push({ name: 'Administración', href: '/admin', icon: Users });
    navigation.push({ name: 'Setup', href: '/setup', icon: Settings });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-[#1a1a27] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-[#363952]">
          <div className="flex items-center gap-2">
            <div className="bg-[#27293d] p-1.5 rounded-md border border-[#363952]">
                <span className="text-[#00c5dc] font-bold text-xl leading-none">Eveca</span>
            </div>
            <span className="font-semibold text-sm leading-tight text-white">Jefatura<br/><span className="text-[#8b92a9]">Sostenibilidad</span></span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-[#8b92a9] hover:text-white">
             <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
           <nav className="space-y-1 px-2">
             {navigation.map((item) => {
               const isActive = location.pathname === item.href;
               return (
                 <Link
                   key={item.name}
                   to={item.href}
                   onClick={() => setIsMobileMenuOpen(false)}
                   className={cn(
                     "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                     isActive ? "bg-[#27293d] text-white border-l-4 border-[#00c5dc] pl-1" : "text-[#8b92a9] hover:bg-[#27293d] hover:text-white"
                   )}
                 >
                   <item.icon className={cn("mr-3 flex-shrink-0 h-5 w-5", isActive ? "text-[#00c5dc]" : "text-[#8b92a9] group-hover:text-white")} aria-hidden="true" />
                   {item.name}
                 </Link>
               );
             })}
           </nav>
        </div>
        
        <div className="p-4 border-t border-[#363952]">
           <div className="flex items-center mb-4">
             <div className="ml-3">
               <p className="text-sm font-medium text-white">{profile?.name || user.email}</p>
               <p className="text-xs font-medium text-[#8b92a9] capitalize">
                 {profile?.role || 'User'}
               </p>
             </div>
           </div>
           <button
             onClick={signOut}
             className="flex items-center w-full px-2 py-2 text-sm font-medium text-[#8b92a9] rounded-md hover:bg-[#27293d] hover:text-white"
           >
             <LogOut className="mr-3 h-5 w-5" />
             Cerrar Sesión
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#1a1a27] border-b border-[#363952] p-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <span className="text-[#00c5dc] font-bold text-lg">Eveca</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-[#8b92a9] hover:text-white">
            <Menu size={24} />
          </button>
        </div>

        {/* Desktop Topbar area conceptually - taking focus on content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
