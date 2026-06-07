import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function Compost() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    tridecanter_cake: '',
    process_sludge: '',
    fiber: '',
    boiler_ashes: '',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('compost_logs')
      .select('*, profiles(name)')
      .order('date', { ascending: false });
    
    if (data) setLogs(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('compost_logs').insert([
      {
        ...formData,
        tridecanter_cake: Number(formData.tridecanter_cake),
        process_sludge: Number(formData.process_sludge),
        fiber: Number(formData.fiber),
        boiler_ashes: Number(formData.boiler_ashes),
        created_by: profile?.id
      }
    ]);

    if (!error) {
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), tridecanter_cake: '', process_sludge: '', fiber: '', boiler_ashes: '', notes: '' });
      fetchLogs();
    } else {
      alert('Error guardando registro');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión Planta de Compostaje</h1>
        <p className="text-sm text-[#8b92a9]">Recepción de subproductos para transformación</p>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white mb-4">Ingreso de Subproductos Diarios</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-4 lg:col-span-1">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Fecha</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Torta de Tridecanter (TM)</label>
              <input type="number" step="0.01" required value={formData.tridecanter_cake} onChange={e => setFormData({...formData, tridecanter_cake: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Lodos del Proceso (TM)</label>
              <input type="number" step="0.01" required value={formData.process_sludge} onChange={e => setFormData({...formData, process_sludge: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Fibra (TM)</label>
              <input type="number" step="0.01" required value={formData.fiber} onChange={e => setFormData({...formData, fiber: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Cenizas de Caldera (TM)</label>
              <input type="number" step="0.01" required value={formData.boiler_ashes} onChange={e => setFormData({...formData, boiler_ashes: e.target.value})} className="input-field" />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Torta Tridecanter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Lodos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Fibra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Cenizas</th>
              </tr>
            </thead>
            <tbody className="bg-[#1e1e2b] divide-y divide-[#363952]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e2e8f0]">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.tridecanter_cake} TM</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.process_sludge} TM</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.fiber} TM</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.boiler_ashes} TM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
