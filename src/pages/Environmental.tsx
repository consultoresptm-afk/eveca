import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Globe } from 'lucide-react';

export default function Environmental() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    water_consumption_m3: '',
    energy_consumption_kwh: '',
    hazardous_waste_kg: '',
    solid_waste_kg: '',
    recyclable_waste_kg: '',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('environmental_logs')
      .select('*, profiles(name)')
      .order('date', { ascending: false });
    
    if (data) setLogs(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('environmental_logs').insert([
      {
        ...formData,
        water_consumption_m3: Number(formData.water_consumption_m3),
        energy_consumption_kwh: Number(formData.energy_consumption_kwh),
        hazardous_waste_kg: Number(formData.hazardous_waste_kg),
        solid_waste_kg: Number(formData.solid_waste_kg),
        recyclable_waste_kg: Number(formData.recyclable_waste_kg),
        created_by: profile?.id
      }
    ]);

    if (!error) {
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), water_consumption_m3: '', energy_consumption_kwh: '', hazardous_waste_kg: '', solid_waste_kg: '', recyclable_waste_kg: '', notes: '' });
      fetchLogs();
    } else {
      alert('Error guardando registro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#4051f9]/20 rounded-lg">
          <Globe className="h-6 w-6 text-[#4051f9]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión Ambiental</h1>
          <p className="text-sm text-[#8b92a9]">Monitoreo de Impactos en Planta de Beneficio (Agua, Energía, Residuos)</p>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white mb-4">Ingreso de Mediciones y Cuantificación</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-4 lg:col-span-1">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Fecha de Lectura</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Consumo de Agua (m³)</label>
              <input type="number" step="0.01" required value={formData.water_consumption_m3} onChange={e => setFormData({...formData, water_consumption_m3: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Consumo de Energía (kWh)</label>
              <input type="number" step="0.01" required value={formData.energy_consumption_kwh} onChange={e => setFormData({...formData, energy_consumption_kwh: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Residuos Peligrosos - RESPEL (Kg)</label>
              <input type="number" step="0.01" required value={formData.hazardous_waste_kg} onChange={e => setFormData({...formData, hazardous_waste_kg: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Residuos Ordinarios (Kg)</label>
              <input type="number" step="0.01" required value={formData.solid_waste_kg} onChange={e => setFormData({...formData, solid_waste_kg: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Aprovechables (Kg)</label>
              <input type="number" step="0.01" required value={formData.recyclable_waste_kg} onChange={e => setFormData({...formData, recyclable_waste_kg: e.target.value})} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Observaciones Generales</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button type="submit" className="btn-primary">
                Guardar Registro
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#363952]">
            <thead className="bg-[#1a1a27]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Agua</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Energía</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">RESPEL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Ordinarios</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Aprovechables</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Responsable</th>
              </tr>
            </thead>
            <tbody className="bg-[#1e1e2b] divide-y divide-[#363952]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e2e8f0]">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.water_consumption_m3} m³</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.energy_consumption_kwh} kWh</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.hazardous_waste_kg} Kg</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.solid_waste_kg} Kg</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.recyclable_waste_kg || 0} Kg</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.profiles?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
