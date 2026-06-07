import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { TreePine, Upload, ImageIcon, Loader2 } from 'lucide-react';

export default function GreenAreas() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    mowed_area_m2: '',
    compost_applied_kg: '',
    trees_planted: '',
    notes: '',
    photo_before: '',
    photo_after: ''
  });

  const [files, setFiles] = useState<{before: File | null, after: File | null}>({
    before: null,
    after: null
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('green_areas_logs')
      .select('*, profiles(name)')
      .order('date', { ascending: false });
    
    if (data) setLogs(data);
  };

  const uploadFile = async (file: File, prefix: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('green_areas_photos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('green_areas_photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    let beforeUrl = formData.photo_before;
    let afterUrl = formData.photo_after;

    try {
      if (files.before) {
        beforeUrl = await uploadFile(files.before, 'before');
      }
      if (files.after) {
        afterUrl = await uploadFile(files.after, 'after');
      }

      const { error } = await supabase.from('green_areas_logs').insert([
        {
          date: formData.date,
          notes: formData.notes,
          photo_before: beforeUrl,
          photo_after: afterUrl,
          mowed_area_m2: Number(formData.mowed_area_m2),
          compost_applied_kg: Number(formData.compost_applied_kg),
          trees_planted: Number(formData.trees_planted),
          created_by: profile?.id
        }
      ]);

      if (!error) {
        setFormData({ 
          date: format(new Date(), 'yyyy-MM-dd'), 
          mowed_area_m2: '', 
          compost_applied_kg: '', 
          trees_planted: '', 
          notes: '',
          photo_before: '',
          photo_after: ''
        });
        setFiles({ before: null, after: null });
        fetchLogs();
      } else {
        alert('Error guardando registro');
        console.error(error);
      }
    } catch (err) {
       console.error("Upload Error:", err);
       alert('Error con los archivos, revise si tiene permisos en Setup.');
    } finally {
       setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#11c46e]/20 rounded-lg">
          <TreePine className="h-6 w-6 text-[#11c46e]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Mantenimiento Zonas Verdes</h1>
          <p className="text-sm text-[#8b92a9]">Gestión de poda, reforestación y aplicación de abonos orgánicos</p>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-white mb-4">Registro Operativo de Campo</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-4 lg:col-span-1">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Fecha Operación</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Área Podada / Cercada (m²)</label>
              <input type="number" step="0.01" required value={formData.mowed_area_m2} onChange={e => setFormData({...formData, mowed_area_m2: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Compost Propio Aplicado (Kg)</label>
              <input type="number" step="0.01" required value={formData.compost_applied_kg} onChange={e => setFormData({...formData, compost_applied_kg: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Árboles Sembrados (Und)</label>
              <input type="number" step="1" required value={formData.trees_planted} onChange={e => setFormData({...formData, trees_planted: e.target.value})} className="input-field" />
            </div>
            
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-[#8b92a9] mb-1">Foto - Antes del Mantenimiento</label>
               <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-before" className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#363952] border-dashed rounded-lg cursor-pointer bg-[#1a1a27] hover:bg-[#202030] transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-[#8b92a9]" />
                          <p className="mb-2 text-sm text-[#8b92a9]"><span className="font-semibold">Haga clic para subir</span> o arrastre</p>
                          <p className="text-xs text-[#8b92a9]">SVG, PNG, JPG (MAX. 5MB)</p>
                          {files.before && <p className="text-sm text-[#00c5dc] mt-2 truncate w-48 text-center">{files.before.name}</p>}
                      </div>
                      <input id="dropzone-before" type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setFiles({...files, before: e.target.files[0]})} />
                  </label>
               </div>
            </div>

            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-[#8b92a9] mb-1">Foto - Después del Mantenimiento</label>
               <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-after" className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#363952] border-dashed rounded-lg cursor-pointer bg-[#1a1a27] hover:bg-[#202030] transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-[#8b92a9]" />
                          <p className="mb-2 text-sm text-[#8b92a9]"><span className="font-semibold">Haga clic para subir</span> o arrastre</p>
                          <p className="text-xs text-[#8b92a9]">SVG, PNG, JPG (MAX. 5MB)</p>
                          {files.after && <p className="text-sm text-[#00c5dc] mt-2 truncate w-48 text-center">{files.after.name}</p>}
                      </div>
                      <input id="dropzone-after" type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setFiles({...files, after: e.target.files[0]})} />
                  </label>
               </div>
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-[#8b92a9] mb-1">Observaciones (Zonas intervenidas, novedades)</label>
              <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button type="submit" disabled={isUploading} className="btn-primary flex items-center justify-center gap-2">
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUploading ? 'Subiendo Archivos...' : 'Guardar Registro'}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Área Podada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Abono Aplicado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Fotos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#8b92a9] uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-[#1e1e2b] divide-y divide-[#363952]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#e2e8f0]">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.mowed_area_m2} m²</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">{log.compost_applied_kg} Kg</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b92a9]">
                    <div className="flex gap-2">
                       {log.photo_before && (
                         <a href={log.photo_before} target="_blank" rel="noreferrer" className="text-xs bg-[#f8c851]/10 text-[#f8c851] px-2 py-1 rounded flex items-center gap-1 hover:bg-[#f8c851]/20">
                           <ImageIcon className="w-3 h-3" /> Antes
                         </a>
                       )}
                       {log.photo_after && (
                         <a href={log.photo_after} target="_blank" rel="noreferrer" className="text-xs bg-[#11c46e]/10 text-[#11c46e] px-2 py-1 rounded flex items-center gap-1 hover:bg-[#11c46e]/20">
                           <ImageIcon className="w-3 h-3" /> Después
                         </a>
                       )}
                    </div>
                  </td>
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
