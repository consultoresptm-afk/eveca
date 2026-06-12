import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CompostLog } from '../types';
import { 
  Flame, 
  Plus, 
  AlertCircle, 
  Trash2, 
  Search, 
  FileText, 
  Paperclip, 
  Upload, 
  X,
  Thermometer,
  CloudRain,
  CheckCircle2,
  ExternalLink,
  Edit3
} from 'lucide-react';

export default function Compost() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CompostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [rawMaterial, setRawMaterial] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [turned, setTurned] = useState(false);
  const [comments, setComments] = useState('');
  const [attachedDocUrl, setAttachedDocUrl] = useState('');
  const [attachedDocName, setAttachedDocName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('compost_logs')
        .select('*')
        .order('date', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      setLogs((data || []) as CompostLog[]);
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
      alert("Por seguridad de la base de datos, el archivo no debe superar los 2MB. Por favor elija un documento comprimido.");
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

  const resetForm = () => {
    setDate(new Date().toISOString().substring(0, 10));
    setRawMaterial('');
    setTemperature('');
    setHumidity('');
    setTurned(false);
    setComments('');
    setAttachedDocUrl('');
    setAttachedDocName('');
    setEditingLogId(null);
    setError('');
  };

  const handleEdit = (log: CompostLog) => {
    setEditingLogId(log.id || null);
    setDate(new Date(log.date).toISOString().substring(0, 10));
    setRawMaterial(log.raw_material_in?.toString() || '');
    setTemperature(log.temperature?.toString() || '');
    setHumidity(log.humidity?.toString() || '');
    setTurned(!!log.turned);
    setComments(log.comments || '');
    setAttachedDocUrl(log.attached_doc_url || '');
    setAttachedDocName(log.attached_doc_name || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!rawMaterial || !temperature || !humidity) {
      setError('Por favor complete los campos de materia prima, temperatura y humedad.');
      return;
    }

    try {
      const newLogObj: Omit<CompostLog, 'id' | 'created_at'> = {
        date: new Date(date).toISOString(),
        raw_material_in: Number(rawMaterial),
        temperature: Number(temperature),
        humidity: Number(humidity),
        turned,
        comments,
        attached_doc_url: attachedDocUrl || undefined,
        attached_doc_name: attachedDocName || undefined,
        created_by: user?.id,
      };

      const { error: dbError } = editingLogId
        ? await supabase
            .from('compost_logs')
            .update(newLogObj)
            .eq('id', editingLogId)
        : await supabase
            .from('compost_logs')
            .insert([newLogObj]);

      if (dbError) {
        throw new Error(dbError.message);
      }

      setSuccess(editingLogId ? '¡Registro de Compostaje actualizado con éxito!' : '¡Registro de Compostaje guardado de forma robusta!');
      resetForm();
      fetchLogs();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el registro de compost.');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm('¿Desea borrar este registro de compostaje?')) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from('compost_logs')
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
    return log.comments?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Compostaje y Reciclaje Orgánico</h1>
        <p className="text-slate-400 mt-1">Control de pilas de descomposición aerobica, humedades y volteos de materia biodegradable.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Form */}
        <div className="dash-card p-6 lg:col-span-1 self-start">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#11c46e]" /> {editingLogId ? 'Editar Lectura de Pila' : 'Nueva Lectura de Pila'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Entrada/Medición</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Materia Prima (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Ej, 450"
                  value={rawMaterial}
                  onChange={(e) => setRawMaterial(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="35 - 65"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Humedad de Pila (%)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  required
                  placeholder="40 - 60"
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="relative inline-flex items-center cursor-pointer min-h-[42px] px-2 select-none">
                  <input 
                    type="checkbox" 
                    checked={turned}
                    onChange={(e) => setTurned(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:border-slate-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#11c46e] peer-checked:after:bg-slate-950"></div>
                  <span className="ml-3 text-xs font-semibold text-slate-400">Pila Volteada</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Observaciones</label>
              <textarea
                placeholder="Fase termófila, control de olores, calidad visual..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Adjuntar Recibo / Balanza de Entrada (PDF/Img)</label>
              <div className="border-2 border-dashed border-slate-700 bg-slate-950/40 hover:bg-slate-950/70 p-4 rounded-lg text-center cursor-pointer relative group transition-all">
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1">
                  <Upload className="w-6 h-6 text-[#11c46e]" />
                  <p className="text-xs text-slate-300 font-semibold">Cargar comprobante de compostaje</p>
                  <p className="text-[10px] text-slate-500">Hasta 2MB de peso</p>
                </div>
              </div>

              {attachedDocName && (
                <div className="mt-3 flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="w-4 h-4 text-[#11c46e] flex-shrink-0" />
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
              className="w-full bg-[#11c46e] hover:bg-[#11c46e]/90 text-slate-950 font-bold py-2.5 rounded-lg text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              {uploading ? 'Procesando adjunto...' : editingLogId ? 'Actualizar Registro' : 'Guardar Compost en BD'}
            </button>

            {editingLogId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="mt-2 w-full bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-2 rounded-lg text-xs tracking-wider transition-all hover:scale-[1.01] active:scale-95"
              >
                Cancelar edición
              </button>
            )}
          </form>
        </div>

        {/* Database List Display */}
        <div className="dash-card p-6 lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#00c5dc]" /> Lista de Controles en Pila
            </h3>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar comentarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs pl-8 pr-3 min-h-[36px] rounded-lg text-slate-300 w-full md:max-w-[200px]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00c5dc] mb-2"></div>
              <span>Recuperando base de datos de compostaje...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No hay lecturas de compost asignadas para este filtro. Ingrese una lectura para poblar la planilla.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left">
                <thead className="bg-[#0b0f19]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de Control</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Entrada (kg)</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Temperatura</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Humedad</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Volteada</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Comprobante</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Borrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/25">
                  {filteredLogs.map((log) => {
                    const tempIsHigh = log.temperature > 65;
                    const tempIsLow = log.temperature < 35;
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/40 text-sm">
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-white">
                          {new Date(log.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-slate-200">
                          {log.raw_material_in?.toLocaleString('es-CO')} kg
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            tempIsHigh ? 'text-orange-500' : tempIsLow ? 'text-blue-400' : 'text-[#11c46e]'
                          }`}>
                            <Thermometer className="w-3.5 h-3.5" /> {log.temperature}°C
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <CloudRain className="w-3.5 h-3.5 text-blue-400" /> {log.humidity}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.turned ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#11c46e]/10 text-[#11c46e] border border-[#11c46e]/25 uppercase shadow">
                              SÍ (Volteada)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500 uppercase">
                              NO
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[120px] truncate">
                          {log.attached_doc_url ? (
                            <a
                              href={log.attached_doc_url}
                              download={log.attached_doc_name || 'compost.pdf'}
                              className="inline-flex items-center gap-1 text-[#00c5dc] hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" /> Comprobante <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-650">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => handleEdit(log)}
                              className="text-slate-300 hover:text-[#00c5dc] p-1 rounded hover:bg-slate-700/30 transition-all active:scale-90"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => log.id && handleDelete(log.id)}
                              className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/15 transition-all active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
    </div>
  );
}
