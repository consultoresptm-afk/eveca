import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Users, History, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Admin() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isSuperAdmin) {
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchAuditLogs();
      }
    }
  }, [isSuperAdmin, activeTab, startDate, endDate]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching users:", error);
      alert('Error al cargar usuarios.');
    } else if (data) {
      console.log("Users fetched:", data);
      setUsers(data);
    }
  };

  const fetchAuditLogs = async () => {
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false });
      
    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }
    if (endDate) {
      // Add one day to end date to include the whole day
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      query = query.lt('created_at', end.toISOString());
    }

    const { data, error } = await query;
    if (!error && data) {
      setAuditLogs(data);
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = auditLogs.map(log => ({
        'Fecha y Hora': new Date(log.created_at).toLocaleString(),
        'Módulo / Tabla': log.table_name,
        'Acción': log.action,
        'Usuario': log.profiles?.name || log.profiles?.email || 'Sistema / Desconocido',
        'Payload': JSON.stringify(log.new_data || log.old_data || {})
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría');
      XLSX.writeFile(workbook, `Reporte_Auditoria_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch(err) {
      console.error(err);
      alert('Las descargas pueden estar bloqueadas en la vista incrustada. Pide a tu navegador que abra la aplicación en una nueva pestaña (haciendo clic en el ícono arriba).');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(16);
      doc.text('Reporte Gerencial de Auditoría', 14, 22);
      
      doc.setFontSize(10);
      doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
      if (startDate || endDate) {
        doc.text(`Rango de Fechas: ${startDate || 'Inicio'} hasta ${endDate || 'Fin'}`, 14, 36);
      }

      const tableColumn = ['Fecha y Hora', 'Módulo / Tabla', 'Acción', 'Usuario'];
      const tableRows = auditLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
        log.table_name,
        log.action,
        log.profiles?.name || log.profiles?.email || 'Sistema'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startDate || endDate ? 42 : 36,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 197, 220] } // Theme color
      });

      doc.save(`Reporte_Auditoria_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Las descargas pueden estar bloqueadas en la vista incrustada. Pide a tu navegador que abra la aplicación en una nueva pestaña (haciendo clic en el ícono arriba).');
    }
  };

  const approveUser = async (id: string, currentRole: string) => {
    const targetRole = currentRole === 'PENDING' ? 'EDITOR' : currentRole;
    const { error } = await supabase.from('profiles').update({ 
      role: targetRole,
      status: 'approved',
      access_requested: false,
      approval_requested: false 
    }).eq('id', id);
    if (!error) {
      fetchUsers();
    } else {
      console.error(error);
      alert('Error al aprobar usuario');
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (window.confirm(`¿Está seguro que desea eliminar permanentemente al usuario ${name}? Se revocará todo su acceso.`)) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) {
        fetchUsers();
      } else {
        console.error(error);
        alert('Error al eliminar usuario');
      }
    }
  };

    if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-16 w-16 text-[#ff3d60] mb-4" />
        <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
        <p className="text-[#8b92a9] mt-2">Solo el usuario Supremo tiene acceso a este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-[#00c5dc]" />
            Administración del Sistema
          </h1>
          <p className="text-sm text-[#8b92a9]">Gestiona usuarios y audita la actividad de la plataforma.</p>
        </div>
      </div>

      <div className="flex border-b border-[#363952]">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-[#00c5dc] text-[#00c5dc]'
              : 'border-transparent text-[#8b92a9] hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Control de Usuarios
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-[#00c5dc] text-[#00c5dc]'
              : 'border-transparent text-[#8b92a9] hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          Log de Auditoría
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="dash-card overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
             <div className="mt-2 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-[#363952]">
                      <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-[#8b92a9] sm:pl-0 uppercase">Nombre</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#8b92a9] uppercase">Email</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#8b92a9] uppercase">Rol</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#8b92a9] uppercase">Estado Solicitud</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-[#8b92a9] uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#363952]">
                      {users.map((person) => (
                        <tr key={person.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                            {person.name || 'Sin Nombre'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-[#8b92a9]">{person.email}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-[#8b92a9]">
                             <span className={
                               person.role === 'SUPERADMIN' 
                                 ? 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-purple-500/10 text-purple-400 ring-purple-500/30' 
                                 : person.role === 'PENDING'
                                 ? 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-[#f8c851]/10 text-[#f8c851] ring-[#f8c851]/30'
                                 : 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-[#00c5dc]/10 text-[#00c5dc] ring-[#00c5dc]/30'
                             }>
                               {person.role}
                             </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-[#8b92a9]">
                            {person.status === 'approved' ? <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-[#11c46e]/10 text-[#11c46e] ring-[#11c46e]/30">Aprobado</span> : (person.access_requested || person.approval_requested || person.status === 'pending' || person.role === 'PENDING') ? (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-[#f8c851]/10 text-[#f8c851] ring-[#f8c851]/30">Solicitado</span>
                            ) : '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-[#8b92a9]">
                            <div className="flex gap-2">
                              {(person.status !== 'approved' || person.role === 'PENDING' || person.approval_requested || person.access_requested) && (
                                <button
                                  onClick={() => approveUser(person.id, person.role)}
                                  className="text-xs bg-[#11c46e]/20 text-[#11c46e] hover:bg-[#11c46e]/30 px-3 py-1 rounded transition-colors"
                                >
                                  Aprobar
                                </button>
                              )}
                              {person.role !== 'SUPERADMIN' && (
                                <button
                                  onClick={() => deleteUser(person.id, person.name || person.email)}
                                  className="text-xs bg-[#ff3d60]/20 text-[#ff3d60] hover:bg-[#ff3d60]/30 px-3 py-1 rounded transition-colors"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="dash-card overflow-hidden w-full">
          <div className="px-4 py-5 border-b border-[#363952] flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="flex items-end gap-4">
               <div>
                  <label className="block text-xs font-medium text-[#8b92a9] mb-1">Desde Fecha (Inicio)</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field text-sm py-1.5 w-36" />
               </div>
               <div>
                  <label className="block text-xs font-medium text-[#8b92a9] mb-1">Hasta Fecha (Fin)</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field text-sm py-1.5 w-36" />
               </div>
               {(startDate || endDate) && (
                 <button 
                   onClick={() => { setStartDate(''); setEndDate(''); }}
                   className="text-xs text-[#ff3d60] hover:text-white transition-colors mb-2"
                 >
                   Limpiar Filtro
                 </button>
               )}
            </div>
            <div className="flex items-center gap-2">
               <button onClick={exportToExcel} disabled={auditLogs.length === 0} className="btn-secondary flex items-center gap-2 py-2 px-4 shadow-sm bg-[#1a1a27] hover:bg-[#11c46e]/10 hover:text-[#11c46e] hover:border-[#11c46e]/30 transition-all opacity-100 disabled:opacity-50">
                 <FileSpreadsheet className="w-4 h-4" />
                 Excel
               </button>
               <button onClick={exportToPDF} disabled={auditLogs.length === 0} className="btn-secondary flex items-center gap-2 py-2 px-4 shadow-sm bg-[#1a1a27] hover:bg-[#ff3d60]/10 hover:text-[#ff3d60] hover:border-[#ff3d60]/30 transition-all opacity-100 disabled:opacity-50">
                 <FileText className="w-4 h-4" />
                 PDF
               </button>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6 overflow-x-auto">
             {auditLogs.length === 0 ? (
                <p className="text-[#8b92a9] text-center text-sm py-8">No hay registros de auditoría disponibles.</p>
             ) : (
                <table className="min-w-full divide-y divide-[#363952]">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-[#8b92a9] uppercase">Fecha y Hora</th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-[#8b92a9] uppercase">Módulo / Tabla</th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-[#8b92a9] uppercase">Acción</th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-[#8b92a9] uppercase">Usuario</th>
                      <th className="px-3 py-3.5 text-left text-xs font-semibold text-[#8b92a9] uppercase">Detalles D.N. (Payload)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#363952]">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap py-3 pl-4 pr-3 text-xs text-[#8b92a9]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-white">
                          {log.table_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                            log.action === 'INSERT' ? 'bg-[#11c46e]/10 text-[#11c46e] ring-[#11c46e]/30' :
                            log.action === 'UPDATE' ? 'bg-[#f8c851]/10 text-[#f8c851] ring-[#f8c851]/30' :
                            'bg-[#ff3d60]/10 text-[#ff3d60] ring-[#ff3d60]/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-[#8b92a9]">
                          {log.profiles?.name || log.profiles?.email || 'Sistema / Desconocido'}
                        </td>
                        <td className="px-3 py-3 text-xs max-w-xs truncate text-[#8b92a9]" title={JSON.stringify(log.new_data || log.old_data)}>
                          <code>{JSON.stringify(log.new_data || log.old_data)}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
