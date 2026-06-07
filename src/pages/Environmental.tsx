import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SustainabilityIndicator } from '../types';
import { 
  Plus, 
  AlertCircle, 
  Trash2, 
  BarChart2, 
  CheckCircle2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function Environmental() {
  const { user } = useAuth();
  const [indicators, setIndicators] = useState<SustainabilityIndicator[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const [carbonFootprint, setCarbonFootprint] = useState('');
  const [waterConsumption, setWaterConsumption] = useState('');
  const [energyConsumption, setEnergyConsumption] = useState('');
  const [recycledWaste, setRecycledWaste] = useState('');

  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('sustainability_indicators')
        .select('*')
        .order('month', { ascending: true });

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      setIndicators((data || []) as SustainabilityIndicator[]);
    } catch (err: any) {
      console.warn(err);
      setError('No se pudieron recuperar los indicadores. Por favor verifique el script SQL en la pestaña "Setup BD" para asegurar que la tabla `sustainability_indicators` está creada.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!carbonFootprint || !waterConsumption || !energyConsumption || !recycledWaste) {
      setError('Por favor complete todos los indicadores de sostenibilidad del mes.');
      return;
    }

    try {
      const newIndicator: Omit<SustainabilityIndicator, 'id' | 'created_at'> = {
        month,
        carbon_footprint: Number(carbonFootprint),
        water_consumption: Number(waterConsumption),
        energy_consumption: Number(energyConsumption),
        recycled_waste: Number(recycledWaste),
        created_by: user?.id,
      };

      // Check if entry for this month already exists to overwrite or block
      const { data: existing } = await supabase
        .from('sustainability_indicators')
        .select('id')
        .eq('month', month)
        .maybeSingle();

      if (existing) {
        if (!window.confirm(`Ya existe un registro para el mes de ${month}. ¿Desea sobrescribirlo en la base de datos?`)) {
          return;
        }
        const { error: updErr } = await supabase
          .from('sustainability_indicators')
          .delete()
          .eq('id', existing.id);
        if (updErr) throw new Error(updErr.message);
      }

      const { error: insertError } = await supabase
        .from('sustainability_indicators')
        .insert([newIndicator]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess('¡Indicadores de gestión ambiental actualizados con éxito!');
      
      // Clear inputs
      setCarbonFootprint('');
      setWaterConsumption('');
      setEnergyConsumption('');
      setRecycledWaste('');

      fetchIndicators();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar los indicadores en base de datos.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desea eliminar la lectura mensual de indicadores?')) {
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

  // Format month label standard, e.g. '2026-06' -> 'Jun 2026'
  const getMonthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length < 2) return m;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[monthIndex]} ${year}`;
  };

  const chartData = indicators.map(ind => ({
    name: getMonthLabel(ind.month),
    'Huella de Carbono (t CO2)': ind.carbon_footprint,
    'Agua m³ x10': ind.water_consumption * 10,
    'Energía kWh /100': ind.energy_consumption / 100,
    'Residuos kg x10': ind.recycled_waste * 10
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
            <Plus className="w-5 h-5 text-purple-400" /> Ingresar Registro Mensual
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Período de Medición</label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Huella de Carbono (t CO2e)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej, 12.4"
                  value={carbonFootprint}
                  onChange={(e) => setCarbonFootprint(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Consumo de Agua (m³)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Ej, 85"
                  value={waterConsumption}
                  onChange={(e) => setWaterConsumption(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Consumo Eléctrico (kWh)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="Ej, 4200"
                  value={energyConsumption}
                  onChange={(e) => setEnergyConsumption(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Material Reciclado (kg)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="Ej, 780"
                  value={recycledWaste}
                  onChange={(e) => setRecycledWaste(e.target.value)}
                  className="input-field"
                />
              </div>
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
              Guardar Indicadores del Período
            </button>
          </form>
        </div>

        {/* List & Visualization Charts */}
        <div className="dash-card p-6 lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-400" /> Historial de Huella de Impacto
            </h3>

            {indicators.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm bg-slate-950/20 rounded-lg">
                No hay lecturas cargadas para graficar. Introduzca un período en el formulario lateral para visualizar tendencias.
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
                    <Bar dataKey="Huella de Carbono (t CO2)" fill="#ff3d60" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Agua m³ x10" fill="#00c5dc" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Energía kWh /100" fill="#f8c851" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Residuos kg x10" fill="#11c46e" radius={[4, 4, 0, 0]} />
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
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Huella de CO2</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Consumo de Agua</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Consumo Eléctrico</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wider">Materia Reciclada</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-400 uppercase tracking-wider">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 bg-slate-900/10">
                  {indicators.map((ind) => (
                    <tr key={ind.id} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="px-4 py-2.5 font-bold text-white">{getMonthLabel(ind.month)}</td>
                      <td className="px-4 py-2.5 font-mono text-red-400 font-semibold">{ind.carbon_footprint} tCO2e</td>
                      <td className="px-4 py-2.5 font-mono text-blue-400 font-semibold">{ind.water_consumption} m³</td>
                      <td className="px-4 py-2.5 font-mono text-amber-500 font-semibold">{ind.energy_consumption?.toLocaleString('es-CO')} kWh</td>
                      <td className="px-4 py-2.5 font-mono text-[#11c46e] font-semibold">{ind.recycled_waste?.toLocaleString('es-CO')} kg</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => ind.id && handleDelete(ind.id)}
                          className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/15"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
