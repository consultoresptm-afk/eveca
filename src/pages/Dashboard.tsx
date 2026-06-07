import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Droplet, Flame, TreePine, FileText, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    effluentsCount: 0,
    compostCount: 0,
    greenCount: 0,
    lastPH: 7.2,
    totalOilRecovered: 0,
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Fallback Charts Data
  const sampleEffluentTrends = [
    { name: 'Ene', ph: 7.1, recovered: 450, oil_level: 2.3 },
    { name: 'Feb', ph: 7.4, recovered: 520, oil_level: 2.1 },
    { name: 'Mar', ph: 6.9, recovered: 610, oil_level: 1.8 },
    { name: 'Abr', ph: 7.2, recovered: 580, oil_level: 2.4 },
    { name: 'May', ph: 7.3, recovered: 710, oil_level: 2.0 },
    { name: 'Jun', ph: 7.1, recovered: 800, oil_level: 1.5 },
  ];

  const sampleCompostDistribution = [
    { name: 'Compost maduro', value: 3400, color: '#11c46e' },
    { name: 'Compost en maduración', value: 1800, color: '#00c5dc' },
    { name: 'Materia prima nueva', value: 2900, color: '#f8c851' },
  ];

  useEffect(() => {
    async function loadStats() {
      try {
        // Query counts safely
        const { count: effluentsCount } = await supabase
          .from('effluents_logs')
          .select('*', { count: 'exact', head: true });
        
        const { count: compostCount } = await supabase
          .from('compost_logs')
          .select('*', { count: 'exact', head: true });

        const { count: greenCount } = await supabase
          .from('green_areas_logs')
          .select('*', { count: 'exact', head: true });

        // Calculate total recovered oil from actual database entries
        const { data: oilData } = await supabase
          .from('effluents_logs')
          .select('recovered_oil, ph')
          .order('date', { ascending: false });

        let totalOil = 0;
        let lastLoggedPH = 7.2;

        if (oilData && oilData.length > 0) {
          totalOil = oilData.reduce((acc, curr) => acc + (Number(curr.recovered_oil) || 0), 0);
          if (oilData[0].ph) {
            lastLoggedPH = Number(oilData[0].ph);
          }
        }

        setStats({
          effluentsCount: effluentsCount || 0,
          compostCount: compostCount || 0,
          greenCount: greenCount || 0,
          lastPH: lastLoggedPH,
          totalOilRecovered: totalOil,
        });

        // Pull recent entries
        const tempLogs: any[] = [];
        const { data: recentEffluents } = await supabase.from('effluents_logs').select('id, date, comments, tank').limit(2);
        const { data: recentCompost } = await supabase.from('compost_logs').select('id, date, comments, temperature').limit(2);
        
        if (recentEffluents) {
          recentEffluents.forEach(e => tempLogs.push({ ...e, type: 'Efluentes', title: `Operación en tanque ${e.tank}` }));
        }
        if (recentCompost) {
          recentCompost.forEach(c => tempLogs.push({ ...c, type: 'Compostaje', title: `Control de Compostaje — Temp ${c.temperature}°C` }));
        }

        setRecentLogs(tempLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4));

      } catch (err) {
        console.warn("Could not query stats directly, tables might not exist yet:", err);
      }
    }
    loadStats();

    // Realtime channel subscriptions to update stats dynamically
    const channel = supabase
      .channel('plant-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'effluents_logs' }, () => {
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compost_logs' }, () => {
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'green_areas_logs' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c5dc]/5 rounded-full blur-3xl -z-10"></div>
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">EVECA S.A.S.</h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm">
            Bienvenido, <span className="text-slate-100 font-semibold">{profile?.name || 'Operador de Planta'}</span>. Este es el centro integrado de Sostenibilidad, optimización de tanques australianos, reciclaje orgánico y conservación de áreas verdes.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/setup" className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1">
            <HelpCircle className="w-4 h-4" /> Diagnóstico BD
          </Link>
        </div>
      </div>

      {/* Numerical Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="dash-card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#111827]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efluentes</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-md">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white">{stats.effluentsCount || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Registros de Tanques</p>
          </div>
        </div>

        <div className="dash-card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#111827]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#11c46e]/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aceite Recuperado</span>
            <div className="p-2 bg-[#11c46e]/10 text-[#11c46e] rounded-md">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#11c46e]">
              {stats.totalOilRecovered ? stats.totalOilRecovered.toLocaleString('es-CO') : '0'} L
            </h3>
            <p className="text-xs text-slate-400 mt-1">Total de efluente mitigado</p>
          </div>
        </div>

        <div className="dash-card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#111827]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#00c5dc]/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compostaje</span>
            <div className="p-2 bg-[#00c5dc]/10 text-[#00c5dc] rounded-md">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#00c5dc]">{stats.compostCount || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Ciclos de maduración</p>
          </div>
        </div>

        <div className="dash-card p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 to-[#111827]">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#f8c851]/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Último pH</span>
            <div className="p-2 bg-[#f8c851]/10 text-[#f8c851] rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-[#f8c851]">{stats.lastPH || '7.2'}</h3>
            <p className="text-xs text-slate-400 mt-1">Acidez neutra promedio</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dash-card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Consolidado Histórico de Efluentes</h3>
              <p className="text-slate-400 text-xs mt-0.5">Control de pH y volúmenes de aceites mitigados</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase">Proyección Estimada / Histórico</span>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleEffluentTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c5dc" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00c5dc" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#11c46e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#11c46e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} />
                <Legend iconType="circle" />
                <Area type="monotone" name="Promedio pH" dataKey="ph" stroke="#00c5dc" strokeWidth={2} fillOpacity={1} fill="url(#colorPH)" />
                <Area type="monotone" name="Aceite Recuperado (L)" dataKey="recovered" stroke="#11c46e" strokeWidth={2} fillOpacity={1} fill="url(#colorRec)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dash-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Materia Compost</h3>
            <p className="text-slate-400 text-xs mb-6">Distribución actual de masa y sustratos (kg)</p>
            
            <div className="h-[200px] w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sampleCompostDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sampleCompostDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} kg`} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {sampleCompostDistribution.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-400 font-medium">{item.name}</span>
                </div>
                <span className="text-white font-bold">{item.value.toLocaleString('es-CO')} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Actions list & Recent operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="dash-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Actividades y Accesos rápidos</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Módulos</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/efluentes" className="p-4 bg-slate-900 border border-slate-800 hover:border-[#00c5dc]/30 hover:bg-slate-850 rounded-lg group transition-all text-left">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-md w-fit mb-3 group-hover:scale-110 transition-transform">
                <Droplet className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Efluentes</h4>
              <p className="text-slate-500 text-[11px] mt-1">Registrar tanques australianos</p>
            </Link>

            <Link to="/compostaje" className="p-4 bg-slate-900 border border-slate-800 hover:border-[#11c46e]/30 hover:bg-slate-850 rounded-lg group transition-all text-left">
              <div className="p-2 bg-[#11c46e]/10 text-[#11c46e] rounded-md w-fit mb-3 group-hover:scale-110 transition-transform">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Compostaje</h4>
              <p className="text-slate-500 text-[11px] mt-1">Temperaturas y humedad</p>
            </Link>

            <Link to="/areas-verdes" className="p-4 bg-slate-900 border border-slate-800 hover:border-[#f8c851]/30 hover:bg-slate-850 rounded-lg group transition-all text-left">
              <div className="p-2 bg-[#f8c851]/10 text-[#f8c851] rounded-md w-fit mb-3 group-hover:scale-110 transition-transform">
                <TreePine className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Áreas Verdes</h4>
              <p className="text-slate-500 text-[11px] mt-1">Mantenimientos y podas</p>
            </Link>

            <Link to="/gestion-ambiental" className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-650 hover:bg-slate-850 rounded-lg group transition-all text-left">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-md w-fit mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Indicadores</h4>
              <p className="text-slate-500 text-[11px] mt-1">Metas de sostenibilidad</p>
            </Link>
          </div>
        </div>

        <div className="dash-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Logs Recientes en Planta</h3>
              <p className="text-[10px] text-[#00c5dc] bg-[#00c5dc]/10 px-2.5 py-0.5 rounded font-semibold uppercase tracking-widest">Base de Datos</p>
            </div>

            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <div className="text-slate-500 text-xs italic py-6 text-center">
                  No se han registrado operaciones en el sistema todavía. Use los módulos laterales para ingresar su primer registro.
                </div>
              ) : (
                recentLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-3 justify-between items-start bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                    <div>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
                        log.type === 'Efluentes' ? 'bg-blue-500/10 text-blue-400' : 'bg-[#11c46e]/10 text-[#11c46e]'
                      }`}>
                        {log.type}
                      </span>
                      <h5 className="font-semibold text-white text-sm mt-1.5">{log.title}</h5>
                      <p className="text-slate-400 text-xs mt-0.5 max-w-[280px] truncate">{log.comments || 'Sin comentarios adicionales.'}</p>
                    </div>
                    <span className="text-slate-500 text-[10px] whitespace-nowrap mt-1">{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
            <span>¿Tiene anomalías en base de datos?</span>
            <Link to="/setup" className="text-[#00c5dc] hover:underline font-bold flex items-center gap-1">
              Ejecutar Test de Tablas <ChevronRight className="w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
