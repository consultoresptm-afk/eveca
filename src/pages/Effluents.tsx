import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function Effluents() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    tk1_pome_in: '',
    tk2_oil_recovered: '',
    tk3_pome_to_biodigester: '',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('effluents_logs')
      .select('*, profiles(name)')
      .order('date', { ascending: false });
    
    if (data) setLogs(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('effluents_logs').insert([
      {
        ...formData,
        tk1_pome_in: Number(formData.tk1_pome_in),
        tk2_oil_recovered: Number(formData.tk2_oil_recovered),
        tk3_pome_to_biodigester: Number(formData.tk3_pome_to_biodigester),
        created_by: profile?.id
      }
    ]);

    if (!error) {
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), tk1_pome_in: '', tk2_oil_recovered: '', tk3_pome_to_biodigester: '', notes: '' });
      fetchLogs();
    } else {
      alert('Error guardando registro');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión de Efluentes</h1>
        <p className="text-sm text-[#8b92a9]">Control de Tanques Australianos y Biodigestores</p>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white mb-4">Ingresar Nuevo Registro Diario</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Fecha</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">TK1: POME del Tridecanter (TM)</label>
              <input type="number" step="0.01" required value={formData.tk1_pome_in} onChange={e => setFormData({...formData, tk1_pome_in: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">TK2: Aceite Recuperado (TM)</label>
              <input type="number" step="0.01" required value={formData.tk2_oil_recovered} onChange={e => setFormData({...formData, tk2_oil_recovered: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">TK3: POME a Biodigestor (TM)</label>
              <input type="number" step="0.01" required value={formData.tk3_pome_to_biodigester} onChange={e => setFormData({...formData, tk3_pome_to_biodigester: e.target.value})} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Notas Adicionales</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field" />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="btn-primary">
                Guardar Registro
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="dash-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#363952]">
            <thead className="bg-[#1a1a27]">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">TK1 POME In</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">TK2 Aceite Rec.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">TK3 a Biodigestor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Registrado por</th>
              </tr>
            </thead>
            <tbody className="bg-[#1e1e2b] divide-y divide-[#363952]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e2e8f0]">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.tk1_pome_in} TM</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.tk2_oil_recovered} TM</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.tk3_pome_to_biodigester} TM</td>
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
