import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SustainabilityIndicator } from '../types';
import { 
  Plus, 
  AlertCircle, 
  Trash2, 
  BarChart2, 
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function Environmental() {
  const { user } = useAuth();
  const [indicators, setIndicators] = useState<SustainabilityIndicator[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  // Form State (day granularity)
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 10)); // 'YYYY-MM-DD'
  const [waterConsumption, setWaterConsumption] = useState('');
  const [energyConsumption, setEnergyConsumption] = useState('');
  const [organicWaste, setOrganicWaste] = useState('');
  const [hazardousWaste, setHazardousWaste] = useState('');
  const [recyclableWaste, setRecyclableWaste] = useState('');

  useEffect(() => {
    fetchIndicators();
  }, []);

  const [rangeDays, setRangeDays] = useState<number>(30); // default: last month

  const fetchIndicators = async () => {
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('sustainability_indicators')
        .select('*')
        .order('month', { ascending: false });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      setIndicators((data || []) as SustainabilityIndicator[]);
    } catch (err: any) {
      console.warn(err);
      setError('No se pudieron recuperar los indicadores. Por favor verifique el script SQL en la pestaña "Setup BD" para asegurar que la tabla `sustainability_indicators` está creada.');
    }
  };

  const resetForm = () => {
    setMonth(new Date().toISOString().substring(0, 10));
    setWaterConsumption('');
    setEnergyConsumption('');
    setOrganicWaste('');
    setHazardousWaste('');
    setRecyclableWaste('');
    setEditingIndicatorId(null);
    setError('');
  };

  const handleEdit = (indicator: SustainabilityIndicator) => {
    setEditingIndicatorId(indicator.id || null);
    setMonth(indicator.month);
    setWaterConsumption(indicator.water_consumption?.toString() || '');
    setEnergyConsumption(indicator.energy_consumption?.toString() || '');
    setOrganicWaste(indicator.organic_waste?.toString() || '');
    setHazardousWaste(indicator.hazardous_waste?.toString() || '');
    setRecyclableWaste(indicator.recyclable_waste?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (![waterConsumption, energyConsumption, organicWaste, hazardousWaste, recyclableWaste].some(Boolean)) {
      setError('Por favor ingrese al menos un indicador (agua, energía o residuos).');
      return;
    }

    try {
      const newIndicator: any = {
        month,
        created_by: user?.id,
      };

      if (waterConsumption) newIndicator.water_consumption = Number(waterConsumption);
      if (energyConsumption) newIndicator.energy_consumption = Number(energyConsumption);
      if (organicWaste) newIndicator.organic_waste = Number(organicWaste);
      if (hazardousWaste) newIndicator.hazardous_waste = Number(hazardousWaste);
      if (recyclableWaste) newIndicator.recyclable_waste = Number(recyclableWaste);

      const { data: existing } = await supabase
        .from('sustainability_indicators')
        .select('id')
        .eq('month', month)
        .maybeSingle();

      if (editingIndicatorId) {
        const { error: updateError } = await supabase
          .from('sustainability_indicators')
          .update(newIndicator)
          .eq('id', editingIndicatorId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else if (existing) {
        if (!window.confirm(`Ya existe un registro para el día ${formatDateFull(month)}. ¿Desea actualizar solo los campos ingresados?`)) {
          return;
        }

        const { error: updateError } = await supabase
          .from('sustainability_indicators')
          .update(newIndicator)
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase
          .from('sustainability_indicators')
          .insert([newIndicator]);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      setSuccess('¡Indicadores de gestión ambiental actualizados con éxito!');
      
      // Clear inputs
      resetForm();
      fetchIndicators();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar los indicadores en base de datos.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desea eliminar la lectura de indicadores para este día?')) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from('sustainability_indicators')
        .delete()
        .eq('id', id);

      if (delErr) {
        throw new Error(delErr.message);
      }

      setIndicators(prev => prev.filter(i => i.id !== id));
      setSuccess('Registro eliminado correctamente.');
    } catch (err: any) {
      alert('Error al borrar: ' + err.message);
    }
  };

  // Format date labels
  const parseLocalDate = (dateString: string) => {
    const [year, monthStr, dayStr] = dateString.split('-');
    const yearNum = Number(year);
    const monthNum = Number(monthStr) - 1;
    const dayNum = Number(dayStr);
    return new Date(yearNum, monthNum, dayNum);
  };

  const formatDateFull = (d: string) => {
    const [year, monthStr, dayStr] = d.split('-');
    if (!year || !monthStr || !dayStr) return d;
    return `${dayStr}/${monthStr}/${year}`;
  };

  const formatDateShort = (d: string) => {
    const [year, monthStr, dayStr] = d.split('-');
    if (!year || !monthStr || !dayStr) return d;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthIndex = Number(monthStr) - 1;
    return `${String(dayStr).padStart(2, '0')}/${months[monthIndex] ?? monthStr}`;
  };

  const filterByRange = (items: typeof indicators, days: number) => {
    if (!days) return items;
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return items.filter(i => {
      const d = parseLocalDate(i.month);
      return d >= cutoff && d <= now;
    });
  };

  const filtered = filterByRange(indicators, rangeDays);

  const chartData = filtered.map(ind => ({
    name: formatDateShort(ind.month),
    'Agua m³ x10': (ind.water_consumption || 0) * 10,
    'Energía kW /100': (ind.energy_consumption || 0) / 100,
    'Residuos Orgánicos (kg)': ind.organic_waste || 0,
    'Residuos Peligrosos (kg)': ind.hazardous_waste || 0,
    'Residuos Aprovechables (kg)': ind.recyclable_waste || 0
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Indicadores de Gestión Ambiental</h1>
        <p className="text-slate-400 mt-1">Monitoreo continuo de cumplimiento corporativo de Objetivos de Desarrollo Sostenible (ODS).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Form */}
        <div className="dash-card p-6 lg:col-span-1 self-start">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" /> {editingIndicatorId ? 'Editar Registro Diario' : 'Ingresar Registro Diario'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Período de Medición</label>
              <input
                type="date"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Consumo de Agua (m³)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej, 85"
                  value={waterConsumption}
                  onChange={(e) => setWaterConsumption(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Consumo Eléctrico (kW)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Ej, 4200"
                  value={energyConsumption}
                  onChange={(e) => setEnergyConsumption(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Residuos Orgánicos (kg)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Ej, 1200"
                  value={organicWaste}
                  onChange={(e) => setOrganicWaste(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Residuos Peligrosos (kg)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Ej, 45"
                  value={hazardousWaste}
                  onChange={(e) => setHazardousWaste(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Residuos Aprovechables (kg)</label>
              <input
                type="number"
                step="1"
                placeholder="Ej, 650"
                value={recyclableWaste}
                onChange={(e) => setRecyclableWaste(e.target.value)}
                className="input-field"
              />
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
              className="w-full bg-[#00c5dc] hover:bg-[#00c5dc]/90 text-slate-950 font-bold py-2.5 rounded-lg text-xs tracking-wider transition-all hover:scale-[1.02] active:scale-95"
            >
              {editingIndicatorId ? 'Actualizar Registro' : 'Guardar Registro del Día'}
            </button>

            {editingIndicatorId && (
              <button
                type="button"
                onClick={() => resetForm()}
                className="mt-2 w-full bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-2 rounded-lg text-xs tracking-wider transition-all hover:scale-[1.01] active:scale-95"
              >
                Cancelar edición
              </button>
            )}
          </form>
        </div>
        {/* List & Visualization Charts */}
        <div className="dash-card p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-400" /> Historial de Huella de Impacto
            </h3>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Rango</label>
              <select
                value={String(rangeDays)}
                onChange={(e) => setRangeDays(Number(e.target.value))}
                className="input-field text-xs"
              >
                <option value={7}>Última semana</option>
                <option value={30}>Último mes</option>
                <option value={90}>Últimos 3 meses</option>
                <option value={0}>Todo</option>
              </select>
            </div>
          </div>

          <div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm bg-slate-950/20 rounded-lg">
                No hay lecturas cargadas para graficar. Introduzca un día en el formulario lateral para visualizar tendencias.
              </div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="Agua m³ x10" fill="#00c5dc" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Energía kW /100" fill="#f8c851" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Residuos Orgánicos (kg)" fill="#11c46e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Residuos Peligrosos (kg)" fill="#ff3d60" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Residuos Aprovechables (kg)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-2">Planilla de Historial</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-[#0b0f19]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Período</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Consumo Agua</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Consumo Eléctrico</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">R. Orgánicos</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">R. Peligrosos</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">R. Aprovechables</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-400 uppercase tracking-wider">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 bg-slate-900/10">
                  {filtered.map((ind) => (
                    <tr key={ind.id} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="px-4 py-2.5 font-bold text-white">{formatDateFull(ind.month)}</td>
                      <td className="px-4 py-2.5 font-mono text-blue-400 font-semibold">{ind.water_consumption != null ? `${ind.water_consumption} m³` : '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-amber-500 font-semibold">{ind.energy_consumption != null ? `${ind.energy_consumption.toLocaleString('es-CO')} kW` : '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-[#11c46e] font-semibold">{ind.organic_waste != null ? `${ind.organic_waste.toLocaleString('es-CO')} kg` : '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-red-400 font-semibold">{ind.hazardous_waste != null ? `${ind.hazardous_waste.toLocaleString('es-CO')} kg` : '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-purple-400 font-semibold">{ind.recyclable_waste != null ? `${ind.recyclable_waste.toLocaleString('es-CO')} kg` : '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => ind.id && handleEdit(ind)}
                            className="text-slate-300 hover:text-[#00c5dc] p-1 rounded hover:bg-slate-700/30 transition-all active:scale-90"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => ind.id && handleDelete(ind.id)}
                            className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/15"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
  );
}
