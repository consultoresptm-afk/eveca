import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GreenAreaLog } from '../types';
import { 
  TreePine, 
  Plus, 
  AlertCircle, 
  Trash2, 
  Search, 
  FileText, 
  Paperclip, 
  Upload, 
  X,
  User,
  Heart,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function GreenAreas() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<GreenAreaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [areaName, setAreaName] = useState('Jardín de Entrada');
  const [maintenanceType, setMaintenanceType] = useState('Poda');
  const [gardenerCompany, setGardenerCompany] = useState('');
  const [observations, setObservations] = useState('');
  const [attachedDocUrl, setAttachedDocUrl] = useState('');
  const [attachedDocName, setAttachedDocName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('green_areas_logs')
        .select('*')
        .order('date', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      setLogs((data || []) as GreenAreaLog[]);
    } catch (err: any) {
      console.warn(err);
      setError('No se pudieron recuperar los registros. Por favor verifique el script SQL en la pestaña "Setup BD".');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Por seguridad, el archivo de soporte no debe pesar más de 2MB.");
      return;
    }

    setUploading(true);
    setAttachedDocName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAttachedDocUrl(base64String);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!gardenerCompany || !observations) {
      setError('Por favor complete la empresa/jardinero y las observaciones del mantenimiento.');
      return;
    }

    try {
      const newLogObj: Omit<GreenAreaLog, 'id' | 'created_at'> = {
        date: new Date(date).toISOString(),
        area_name: areaName,
        maintenance_type: maintenanceType,
        gardener_company: gardenerCompany,
        observations,
        attached_doc_url: attachedDocUrl || undefined,
        attached_doc_name: attachedDocName || undefined,
        created_by: user?.id,
      };

      const { error: insertError } = await supabase
        .from('green_areas_logs')
        .insert([newLogObj]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess('¡Mantenimiento de área verde registrado con éxito en base de datos!');

      // Reset Form State
      setGardenerCompany('');
      setObservations('');
      setAttachedDocUrl('');
      setAttachedDocName('');

      fetchLogs();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el mantenimiento.');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm('¿Desea borrar este registro de mantenimiento de área verde?')) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from('green_areas_logs')
        .delete()
        .eq('id', logId);

      if (delErr) {
        throw new Error(delErr.message);
      }

      setLogs(prev => prev.filter(l => l.id !== logId));
      setSuccess('Registro eliminado correctamente.');
    } catch (err: any) {
      alert('Error al borrar: ' + err.message);
    }
  };

  const filteredLogs = logs.filter(log => {
    const textToMatch = `${log.area_name} ${log.maintenance_type} ${log.gardener_company} ${log.observations}`.toLowerCase();
    return textToMatch.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Conservación de Áreas Verdes</h1>
        <p className="text-slate-400 mt-1">Bitácora de embellecimiento, reforestación, mantenimientos biológicos y podas controladas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Form */}
        <div className="dash-card p-6 lg:col-span-1 self-start">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#f8c851]" /> Registrar Mantenimiento
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Intervención</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Área</label>
                <select
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="Jardín de Entrada">Jardín de Entrada</option>
                  <option value="Acceso Central">Acceso Central</option>
                  <option value="Zona Perimetral Norte">Zona Perimetral Norte</option>
                  <option value="Áreas de Compostaje">Áretas de Compostaje</option>
                  <option value="Bosque de Amortiguación">Bosque de Amortiguación</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Actividad</label>
                <select
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="Poda">Poda / Corte</option>
                  <option value="Riego">Riego Sistemático</option>
                  <option value="Fertilización">Fertilización Orgánica</option>
                  <option value="Control de Plagas">Control de Plagas</option>
                  <option value="Reforestación">Re-siembra / Reforestación</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Jardinero / Empresa Responsable</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ej, Jardinera El Prado S.A.S."
                  value={gardenerCompany}
                  onChange={(e) => setGardenerCompany(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Observaciones / Detalles Técnicos</label>
              <textarea
                placeholder="Inspección de malezas, volumen de poda generado..."
                required
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Adjuntar Acta / Evidencia de Poda (PDF/Img)</label>
              <div className="border-2 border-dashed border-slate-700 bg-slate-950/40 hover:bg-slate-950/70 p-4 rounded-lg text-center cursor-pointer relative group transition-all">
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1">
                  <Upload className="w-6 h-6 text-[#f8c851]" />
                  <p className="text-xs text-slate-300 font-semibold">Cargar planilla de mantenimiento</p>
                  <p className="text-[10px] text-slate-500">Hasta 2MB de peso</p>
                </div>
              </div>

              {attachedDocName && (
                <div className="mt-3 flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="w-4 h-4 text-[#f8c851] flex-shrink-0" />
                    <span className="text-slate-300 truncate font-mono">{attachedDocName}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setAttachedDocUrl(''); setAttachedDocName(''); }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-[#ff3d60]/10 border border-[#ff3d60]/20 text-[#ff3d60] p-3 rounded-md text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#ff3d60]" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-[#11c46e]/10 border border-[#11c46e]/20 text-[#11c46e] p-3 rounded-md text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#11c46e]" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-[#f8c851] hover:bg-[#f8c851]/95 text-slate-950 font-bold py-2.5 rounded-lg text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              {uploading ? 'Procesando adjunto...' : 'Guardar en Base de Datos'}
            </button>
          </form>
        </div>

        {/* Database List Display */}
        <div className="dash-card p-6 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TreePine className="w-5 h-5 text-[#11c46e]" /> Mantenimientos Realizados
            </h3>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar mantenimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs pl-8 pr-3 min-h-[36px] rounded-lg text-slate-300 w-full md:max-w-[200px]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
              <span>Recobrando bitácora de áreas verdes...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No hay reportes de áreas verdes en este momento. ¡Añada el primero con el formulario de la izquierda!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left">
                <thead className="bg-[#0b0f19]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha / Ubicación</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actividad</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Responsable</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Observaciones</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Documentación</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/25">
                  {filteredLogs.map((log) => {
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/40 text-sm">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-white">{new Date(log.date).toLocaleDateString()}</div>
                          <span className="text-slate-400 text-xs">{log.area_name}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <span className="inline-flex items-center gap-1 font-bold text-[#f8c851]">
                            <Heart className="w-3.5 h-3.5 fill-current" /> {log.maintenance_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-200 font-semibold max-w-[140px] truncate" title={log.gardener_company}>
                          {log.gardener_company}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate" title={log.observations}>
                          {log.observations}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {log.attached_doc_url ? (
                            <a
                              href={log.attached_doc_url}
                              download={log.attached_doc_name || 'areapoda.pdf'}
                              className="inline-flex items-center gap-1 text-[#00c5dc] hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" /> Planilla <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => log.id && handleDelete(log.id)}
                            className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/15 transition-all active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
}
