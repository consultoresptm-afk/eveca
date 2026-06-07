import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EffluentLog } from '../types';
import { 
  Droplet, 
  Plus, 
  AlertCircle, 
  Trash2, 
  Search, 
  FileText, 
  Paperclip, 
  Upload, 
  X,
  TrendingDown,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function Effluents() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EffluentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterTank, setFilterTank] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [tank, setTank] = useState('TK1');
  const [oilLevel, setOilLevel] = useState('');
  const [recoveredOil, setRecoveredOil] = useState('');
  const [ph, setPH] = useState('');
  const [comments, setComments] = useState('');
  const [attachedDocUrl, setAttachedDocUrl] = useState('');
  const [attachedDocName, setAttachedDocName] = useState('');
  const [uploading, setUploading] = useState(false);

  // New POME & Biodigester fields
  const [pomeInput, setPomeInput] = useState('');
  const [sentToBiodigester, setSentToBiodigester] = useState(false);
  const [biodigesterDestination, setBiodigesterDestination] = useState('BD1');
  const [pomeToBiodigester, setPomeToBiodigester] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('effluents_logs')
        .select('*')
        .order('date', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      setLogs((data || []) as EffluentLog[]);
    } catch (err: any) {
      console.warn(err);
      setError('No se pudieron recuperar los registros. Por favor asegúrese de haber ejecutado el script SQL en la pestaña "Setup BD".');
    } finally {
      setLoading(false);
    }
  };

  // Convert files to Base64 directly for bulletproof database storage with no bucket config needed!
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Por seguridad del almacenamiento directo, el archivo no debe superar los 2MB. Por favor elija un documento más pequeño o redúzcalo.");
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
    reader.onerror = () => {
      alert("Hubo un error al codificar el documento.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Por seguridad del almacenamiento directo, el archivo no debe superar los 2MB. Por favor elija un documento más pequeño o redúzcalo.");
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

    if (!ph) {
      setError('Por favor digite la medición de pH.');
      return;
    }

    const isOilTank = tank === 'TK2';

    if (isOilTank) {
      if (!oilLevel) {
        setError('Por favor digite el nivel de aceite en el Tanque 2 (TK2).');
        return;
      }
    } else {
      if (!pomeInput) {
        setError(`Por favor digite la cantidad de POME ingresada en el ${tank}.`);
        return;
      }
      if (sentToBiodigester) {
        if (!pomeToBiodigester) {
          setError('Por favor digite la cantidad de POME evacuado a biodigestores.');
          return;
        }
      }
    }

    try {
      const newLogObj: Omit<EffluentLog, 'id' | 'created_at'> = {
        date: new Date(date).toISOString(),
        tank,
        oil_level: isOilTank ? Number(oilLevel) : undefined,
        recovered_oil: isOilTank && recoveredOil ? Number(recoveredOil) : undefined,
        ph: Number(ph),
        comments,
        attached_doc_url: attachedDocUrl || undefined,
        attached_doc_name: attachedDocName || undefined,
        created_by: user?.id,
        // POME field values
        pome_input: !isOilTank && pomeInput ? Number(pomeInput) : undefined,
        sent_to_biodigester: !isOilTank ? sentToBiodigester : false,
        biodigester_destination: !isOilTank && sentToBiodigester ? biodigesterDestination : undefined,
        pome_to_biodigester: !isOilTank && sentToBiodigester && pomeToBiodigester ? Number(pomeToBiodigester) : undefined,
      };

      const { error: insertError } = await supabase
        .from('effluents_logs')
        .insert([newLogObj])
        .select();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess('¡Registro de efluentes ingresado con absoluto éxito!');
      
      // Clear Form state
      setOilLevel('');
      setRecoveredOil('');
      setPH('');
      setComments('');
      setAttachedDocUrl('');
      setAttachedDocName('');
      setPomeInput('');
      setSentToBiodigester(false);
      setBiodigesterDestination('BD1');
      setPomeToBiodigester('');

      // Refresh list
      fetchLogs();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el registro en base de datos.');
    }
  };

  const handleDelete = async (logId: string) => {
    if (!window.confirm('¿Desea borrar este registro de efluente permanentemente?')) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from('effluents_logs')
        .delete()
        .eq('id', logId);

      if (delErr) {
        throw new Error(delErr.message);
      }

      setLogs(prev => prev.filter(l => l.id !== logId));
      setSuccess('Registro removido con éxito.');
    } catch (err: any) {
      alert('No se pudo borrar: ' + err.message);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesTank = filterTank === 'ALL' || log.tank === filterTank;
    const matchesSearch = log.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.tank.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTank && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Efluentes — Tanques Australianos</h1>
        <p className="text-slate-400 mt-1">Monitoreo continuo de acidez pH, alturas de película oleosa y aceites recuperados.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Form */}
        <div className="dash-card p-6 lg:col-span-1 self-start">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#00c5dc]" /> Registrar Nueva Lectura
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Medición</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Identificador Tanque</label>
              <select
                value={tank}
                onChange={(e) => setTank(e.target.value)}
                className="input-field cursor-pointer font-semibold text-[#00c5dc]"
              >
                <option value="TK1">Tanque 1 (TK1 - Recibe POME)</option>
                <option value="TK2">Tanque 2 (TK2 - Recuperación Aceite)</option>
                <option value="TK3">Tanque 3 (TK3 - Recibe POME)</option>
                <option value="TK4">Tanque 4 (TK4 - Gravedad POME)</option>
              </select>
            </div>

            {tank === 'TK2' ? (
              <div className="space-y-3 p-3.5 bg-blue-950/20 rounded-xl border border-blue-500/15">
                <div className="text-xs font-bold text-[#00c5dc] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c5dc] animate-pulse"></span>
                  Recuperación de Aceite de Industria (TK2)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nivel de Aceite (cm)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ej, 4.5"
                      value={oilLevel}
                      onChange={(e) => setOilLevel(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Aceite Extraído (L)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="Ej, 120"
                      value={recoveredOil}
                      onChange={(e) => setRecoveredOil(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 italic">
                  * El TK2 es el único dispositivo donde se separa el aceite de exportación.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-3.5 bg-emerald-950/20 rounded-xl border border-emerald-500/15">
                <div className="text-xs font-bold text-[#11c46e] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#11c46e] animate-pulse"></span>
                  Flujo de POME y Efluentes ({tank})
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Cantidad POME Ingreso ({tank}) (m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ej, 15.5"
                    value={pomeInput}
                    onChange={(e) => setPomeInput(e.target.value)}
                    className="input-field"
                  />
                  <p className="text-[9px] text-slate-400/80 mt-0.5">Volumen inicial medido en la derivación.</p>
                </div>

                <div className="border-t border-slate-800 pt-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sentToBiodigester}
                      onChange={(e) => setSentToBiodigester(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-[#11c46e] focus:ring-[#11c46e] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-300">¿Evacuar efluente a biodigestor?</span>
                  </label>
                </div>

                {sentToBiodigester && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Biodigestor Destino</label>
                      <select
                        value={biodigesterDestination}
                        onChange={(e) => setBiodigesterDestination(e.target.value)}
                        className="input-field cursor-pointer font-medium"
                      >
                        <option value="BD1">Biodigestor 1 (BD 1)</option>
                        <option value="BD2">Biodigestor 2 (BD 2)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">POME Despachado (m³)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ej, 12.4"
                        value={pomeToBiodigester}
                        onChange={(e) => setPomeToBiodigester(e.target.value)}
                        className="input-field font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Potencial de Hidrógeno (pH)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                required
                placeholder="pH recomendado: 6.5 - 8.5"
                value={ph}
                onChange={(e) => setPH(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Observaciones / Alarmas</label>
              <textarea
                placeholder="Indique si el pH se desvía, anomalías, o limpiezas..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="input-field min-h-[80px]"
              />
            </div>

            {/* Document upload box */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Adjuntar Acta / Evidencia Técnica (PDF/Img)</label>
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-700 bg-slate-950/40 hover:bg-slate-950/70 p-4 rounded-lg text-center cursor-pointer relative group transition-all"
              >
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1">
                  <Upload className="w-6 h-6 text-[#00c5dc] group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-slate-300 font-semibold">Arrastre el archivo o haga clic aquí</p>
                  <p className="text-[10px] text-slate-500">Máximo 2MB de peso</p>
                </div>
              </div>

              {/* Upload file preview indicator */}
              {attachedDocName && (
                <div className="mt-3 flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <Paperclip className="w-4 h-4 text-[#00c5dc] flex-shrink-0" />
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
              className="w-full bg-[#00c5dc] hover:bg-[#00c5dc]/90 text-slate-950 font-bold py-2.5 rounded-lg text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            >
              {uploading ? 'Codificando adjunto...' : 'Guardar en Base de Datos'}
            </button>
          </form>
        </div>

        {/* Database List Display */}
        <div className="dash-card p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Droplet className="w-5 h-5 text-[#11c46e]" /> Registros Cargados en Sistema
              </h3>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={filterTank}
                  onChange={(e) => setFilterTank(e.target.value)}
                  className="bg-slate-950 border border-slate-700 min-h-[36px] text-xs px-2 rounded-lg text-slate-300 cursor-pointer"
                >
                  <option value="ALL">Todos los Tanques</option>
                  <option value="TK1">TK1</option>
                  <option value="TK2">TK2</option>
                  <option value="TK3">TK3</option>
                  <option value="TK4">TK4</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filtrar comentarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs pl-8 pr-3 min-h-[36px] rounded-lg text-slate-300 max-w-[160px]"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#11c46e] mb-2"></div>
                <span>Recobrando base de datos de tanques...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No hay lecturas registradas para esta selección de filtros. ¡Ingrese el primero a la izquierda!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left">
                  <thead className="bg-[#0b0f19]">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha / Tanque</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Aceite (TK2)</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">POME Ingreso (m³)</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Filtro / Biodigester</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">pH</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Obs / Adjuntos</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/25">
                    {filteredLogs.map((log) => {
                      const phAlert = log.ph && (log.ph < 6.5 || log.ph > 8.5);
                      const isOilTank = log.tank === 'TK2';
                      return (
                        <tr key={log.id} className="hover:bg-slate-900/40 text-sm">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-white">{new Date(log.date).toLocaleDateString()}</div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isOilTank 
                                ? 'bg-[#00c5dc]/10 text-[#00c5dc] border border-[#00c5dc]/20' 
                                : 'bg-[#11c46e]/10 text-[#11c46e] border border-[#11c46e]/20'
                            }`}>
                              {log.tank}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {isOilTank ? (
                              <div className="space-y-0.5">
                                <span className="text-slate-300 font-bold block">{log.oil_level} cm</span>
                                {log.recovered_oil ? (
                                  <span className="text-[#11c46e] flex items-center gap-0.5 font-sans font-bold">
                                    <TrendingDown className="w-3 h-3" /> {log.recovered_oil} L
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">No aplica</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-300">
                            {!isOilTank && log.pome_input !== undefined && log.pome_input !== null ? (
                              <span>{log.pome_input} m³</span>
                            ) : (
                              <span className="text-slate-600 font-normal italic">No aplica</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {!isOilTank && log.sent_to_biodigester ? (
                              <div className="space-y-0.5">
                                <div className="text-blue-400 font-bold font-mono">{log.pome_to_biodigester} m³</div>
                                <div className="text-[10px] text-slate-500 font-semibold uppercase">Destino: <span className="text-slate-300 font-mono">{log.biodigester_destination}</span></div>
                              </div>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              phAlert ? 'bg-[#ff3d60]/10 text-[#ff3d60] border border-[#ff3d60]/20 animate-pulse' : 'bg-[#11c46e]/10 text-[#11c46e]'
                            }`}>
                              {log.ph}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px]">
                            <div className="truncate" title={log.comments}>{log.comments || 'Sin observaciones'}</div>
                            {log.attached_doc_url ? (
                              <a
                                href={log.attached_doc_url}
                                download={log.attached_doc_name || 'evidencia.pdf'}
                                className="inline-flex items-center gap-1 text-[#00c5dc] hover:underline mt-1 text-[10px]"
                              >
                                <FileText className="w-3.5 h-3.5" /> Ver Adjunto <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => log.id && handleDelete(log.id)}
                              className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/15 transition-all active:scale-90"
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
    </div>
  );
}
