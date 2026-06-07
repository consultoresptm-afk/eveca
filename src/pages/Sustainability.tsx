import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Award } from 'lucide-react';

export default function Sustainability() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    training_hours: '',
    inspections_conducted: '',
    rspo_non_conformities: '',
    social_activities: '',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('sustainability_logs')
      .select('*, profiles(name)')
      .order('date', { ascending: false });
    
    if (data) setLogs(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('sustainability_logs').insert([
      {
        ...formData,
        training_hours: Number(formData.training_hours),
        inspections_conducted: Number(formData.inspections_conducted),
        rspo_non_conformities: Number(formData.rspo_non_conformities),
        social_activities: Number(formData.social_activities),
        created_by: profile?.id
      }
    ]);

    if (!error) {
      setFormData({ date: format(new Date(), 'yyyy-MM-dd'), training_hours: '', inspections_conducted: '', rspo_non_conformities: '', social_activities: '', notes: '' });
      fetchLogs();
    } else {
      alert('Error guardando registro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#6a62b4]/20 rounded-lg">
          <Award className="h-6 w-6 text-[#6a62b4]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Sostenibilidad Corporativa</h1>
          <p className="text-sm text-[#8b92a9]">Gestión de Certificaciones (RSPO), capacitaciones y comunidad</p>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white mb-4">Registro de Indicadores ESG</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-4 lg:col-span-1">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Fecha</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Horas Entrenamiento ESG</label>
              <input type="number" step="0.5" required value={formData.training_hours} onChange={e => setFormData({...formData, training_hours: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Inspecciones Internas</label>
              <input type="number" step="1" required value={formData.inspections_conducted} onChange={e => setFormData({...formData, inspections_conducted: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">No Conformidades (RSPO/ISCC)</label>
              <input type="number" step="1" required value={formData.rspo_non_conformities} onChange={e => setFormData({...formData, rspo_non_conformities: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Iniciativas Sociales / Comunidad</label>
              <input type="number" step="1" required value={formData.social_activities} onChange={e => setFormData({...formData, social_activities: e.target.value})} className="input-field" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Detalles de Actividades</label>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Capacitación (Hrs)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Inspecciones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">NC RSPO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Act. Sociales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-[#1e1e2b] divide-y divide-[#363952]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e2e8f0]">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.training_hours}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.inspections_conducted}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#ff3d60]">{log.rspo_non_conformities > 0 ? log.rspo_non_conformities : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.social_activities}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9] max-w-xs truncate" title={log.notes}>{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
