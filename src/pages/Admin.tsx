import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types';
import { 
  Users, 
  CheckCircle, 
  Trash2, 
  UserX, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  RefreshCw,
  Clock
} from 'lucide-react';

export default function Admin() {
  const { user: currentAuthUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      setUsers((data || []) as Profile[]);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError('No se pudieron cargar los usuarios. Verifique que la tabla `profiles` esté creada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const approveUser = async (profileId: string, currentRole: string) => {
    setActionLoading(profileId);
    try {
      // If the current role remains PENDING, we elevate them to EDITOR for active editing
      const targetRole = currentRole === 'PENDING' ? 'EDITOR' : currentRole;
      
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          role: targetRole,
          status: 'approved',
          approval_requested: false
        })
        .eq('id', profileId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      // Live update locally
      setUsers(prev => prev.map(u => u.id === profileId 
        ? { ...u, role: targetRole as any, status: 'approved', approval_requested: false } 
        : u
      ));
    } catch (err: any) {
      console.error(err);
      alert('Error al aprobar el acceso: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (profileId: string) => {
    if (!window.confirm('¿Está completamente seguro de que desea eliminar a este usuario del sistema? Se removerán sus credenciales de acceso de la tabla de perfiles.')) {
      return;
    }

    setActionLoading(profileId);
    try {
      const { error: deleteErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (deleteErr) {
        throw new Error(deleteErr.message);
      }

      setUsers(prev => prev.filter(u => u.id !== profileId));
      alert('Se eliminó el perfil con éxito. Para dar de baja el usuario permanentemente en Supabase Auth, recuerde borrarlo en su consola de Supabase Auth console.');
    } catch (err: any) {
      console.error(err);
      alert('Error al eliminar usuario: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <UserX className="w-16 h-16 text-[#ff3d60] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
        <p className="text-slate-400 max-w-md">
          Este panel de control de usuarios solo está disponible para el Administrador Supremo de Sostenibilidad (<code className="bg-slate-950 p-1 rounded">wmartinezm360@gmail.com</code>).
        </p>
      </div>
    );
  }

  const pendingCount = users.filter(u => u.status === 'pending' || u.approval_requested === true).length;
  const approvedCount = users.filter(u => u.status === 'approved' && u.approval_requested !== true).length;

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(filter.toLowerCase()) || 
    u.email?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Panel de Control de Accesos</h1>
          <p className="text-slate-400">Apruebe e introduzca nuevos editores a la plataforma de gestión de Eveca S.A.S.</p>
        </div>
        <button 
          onClick={fetchUsers} 
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 self-start md:self-auto active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="dash-card p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white leading-none">{users.length}</h4>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Usuarios Totales</p>
          </div>
        </div>

        <div className="dash-card p-6 flex items-center gap-4">
          <div className="p-3 bg-[#f8c851]/10 text-[#f8c851] rounded-lg">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white leading-none">{pendingCount}</h4>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Solicitudes Pendientes</p>
          </div>
        </div>

        <div className="dash-card p-6 flex items-center gap-4">
          <div className="p-3 bg-[#11c46e]/10 text-[#11c46e] rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white leading-none">{approvedCount}</h4>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Habilitados Editor/Admin</p>
          </div>
        </div>
      </div>

      {/* Alert Error Box */}
      {error && (
        <div className="bg-[#ff3d60]/10 border border-[#ff3d60]/20 text-[#ff3d60] p-4 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* User Table Base */}
      <div className="dash-card overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
          <h3 className="font-bold text-white text-lg">Control de Usuarios</h3>
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field pl-9 bg-slate-950 border-slate-800 text-sm max-h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00c5dc] mb-2"></div>
            <span>Cargando planilla de usuarios...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron usuarios que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-850">
              <thead className="bg-[#0b0f19]">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre Completo</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Rol asignado</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Estado Solicitud</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                {filteredUsers.map((person) => {
                  const isUserApproved = person.status === 'approved' && person.approval_requested !== true;
                  const isCurrentUser = person.id === currentAuthUser?.id;
                  
                  return (
                    <tr key={person.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-white">
                        {person.name || 'Sin Nombre'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {person.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset
                          ${person.role === 'SUPERADMIN' 
                            ? 'bg-[#00c5dc]/10 text-[#00c5dc] ring-[#00c5dc]/30' 
                            : person.role === 'EDITOR' 
                              ? 'bg-blue-500/10 text-blue-400 ring-blue-500/30' 
                              : 'bg-slate-800 text-slate-400 ring-slate-700/60'
                          }
                        `}>
                          {person.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {isUserApproved ? (
                          <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset bg-[#11c46e]/10 text-[#11c46e] ring-[#11c46e]/30">
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ring-1 ring-inset bg-[#f8c851]/10 text-[#f8c851] ring-[#f8c851]/30 animate-pulse">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-3">
                          {!isUserApproved && (
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => approveUser(person.id, person.role)}
                              className="inline-flex items-center gap-1.5 text-xs bg-[#11c46e] hover:bg-[#11c46e]/90 text-slate-950 px-3.5 py-1.5 rounded-md font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" /> Aprobar Acceso
                            </button>
                          )}
                          {!isCurrentUser && (
                            <button
                              disabled={actionLoading !== null}
                              onClick={() => deleteUser(person.id)}
                              className="inline-flex items-center gap-1.5 text-xs bg-red-650/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 hover:border-red-500 px-3.5 py-1.5 rounded-md font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          )}
                          {isCurrentUser && (
                            <span className="text-slate-500 text-xs italic">Eres tú (Admin)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
