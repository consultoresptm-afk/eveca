import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Droplet, Flame, TreePine, FileText, CheckCircle2, ChevronRight, Recycle,
  FileSpreadsheet, Camera, Loader2, Zap, Leaf
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    effluentsCount: 0,
    compostCount: 0,
    greenCount: 0,
    lastPH: '-' as string | number,
    totalOilRecovered: 0,
    totalWasteAprovechado: 0,
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [effluentChartData, setEffluentChartData] = useState<any[]>([]);
  const [compostChartData, setCompostChartData] = useState<any[]>([]);
  const [hasEffluentData, setHasEffluentData] = useState(false);
  const [hasCompostData, setHasCompostData] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [resourceChartData, setResourceChartData] = useState<any[]>([]);
  const [hasResourceData, setHasResourceData] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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
        let lastLoggedPH: string | number = '-';

        if (oilData && oilData.length > 0) {
          totalOil = oilData.reduce((acc, curr) => acc + (Number(curr.recovered_oil) || 0), 0);
          const firstWithPH = oilData.find(item => item.ph !== null && item.ph !== undefined);
          if (firstWithPH) {
            lastLoggedPH = Number(firstWithPH.ph);
          }
        }

        // Pull sustainability indicators totals for waste KPI and resource consumption chart
        const { data: indicators } = await supabase
          .from('sustainability_indicators')
          .select('month, water_consumption, energy_consumption, organic_waste, recyclable_waste')
          .order('month', { ascending: true });

        let totalWasteVal = 0;
        if (indicators && indicators.length > 0) {
          totalWasteVal = indicators.reduce((acc, curr) => {
            const org = Number(curr.organic_waste) || 0;
            const rec = Number(curr.recyclable_waste) || 0;
            return acc + org + rec;
          }, 0);

          const monthNamesFull = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const formattedRes = indicators.map(item => {
            let label = item.month;
            if (item.month && item.month.includes('-')) {
              const parts = item.month.split('-');
              const yearShort = parts[0].substring(2);
              const mIdx = parseInt(parts[1], 10) - 1;
              if (mIdx >= 0 && mIdx < 12) {
                label = `${monthNamesFull[mIdx]} '${yearShort}`;
              }
            }
            return {
              name: label,
              water: Number(item.water_consumption) || 0,
              energy: Number(item.energy_consumption) || 0,
              monthRaw: item.month
            };
          });
          setResourceChartData(formattedRes);
          setHasResourceData(formattedRes.some(r => r.water > 0 || r.energy > 0));
        } else {
          setResourceChartData([]);
          setHasResourceData(false);
        }

        setStats({
          effluentsCount: effluentsCount || 0,
          compostCount: compostCount || 0,
          greenCount: greenCount || 0,
          lastPH: lastLoggedPH,
          totalOilRecovered: totalOil,
          totalWasteAprovechado: totalWasteVal,
        });

        // Pull effluents for trend chart
        const { data: effluentsData } = await supabase
          .from('effluents_logs')
          .select('date, ph, recovered_oil, oil_level')
          .order('date', { ascending: true });

        if (effluentsData && effluentsData.length > 0) {
          const grouped: Record<string, { name: string, ph: number, recovered: number, count: number }> = {};
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

          effluentsData.forEach(item => {
            const d = new Date(item.date);
            const month = monthNames[d.getMonth()];
            if (!grouped[month]) {
              grouped[month] = { name: month, ph: 0, recovered: 0, count: 0 };
            }
            grouped[month].ph += Number(item.ph) || 0;
            grouped[month].recovered += Number(item.recovered_oil) || 0;
            grouped[month].count += 1;
          });

          const formattedEffluents = Object.values(grouped).map(g => ({
            name: g.name,
            ph: Number((g.ph / g.count).toFixed(1)),
            recovered: Number(g.recovered.toFixed(1))
          }));

          setEffluentChartData(formattedEffluents);
          setHasEffluentData(formattedEffluents.length > 0);
        } else {
          setEffluentChartData([]);
          setHasEffluentData(false);
        }

        // Pull compost for distribution chart
        const { data: compostData } = await supabase
          .from('compost_logs')
          .select('date, raw_material_in, temperature, humidity')
          .order('date', { ascending: true });

        if (compostData && compostData.length > 0) {
          let highTempMat = 0;
          let midTempMat = 0;
          let rawMat = 0;

          compostData.forEach(item => {
            const t = Number(item.temperature) || 0;
            const m = Number(item.raw_material_in) || 0;
            if (t >= 55) {
              highTempMat += m;
            } else if (t >= 40) {
              midTempMat += m;
            } else {
              rawMat += m;
            }
          });

          const formattedCompost = [
            { name: 'Fase Termofílica (>55°C)', value: highTempMat, color: '#ff4d4d' },
            { name: 'Fase Mesofílica (40-55°C)', value: midTempMat, color: '#00c5dc' },
            { name: 'Materia prima / Maduración', value: rawMat, color: '#11c46e' },
          ].filter(item => item.value > 0);

          if (formattedCompost.length > 0) {
            setCompostChartData(formattedCompost);
            setHasCompostData(true);
          } else {
            const totalKg = compostData.reduce((acc, curr) => acc + (Number(curr.raw_material_in) || 0), 0);
            setCompostChartData([
              { name: 'Materia orgánica ingresada', value: totalKg, color: '#11c46e' }
            ]);
            setHasCompostData(totalKg > 0);
          }
        } else {
          setCompostChartData([]);
          setHasCompostData(false);
        }

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sustainability_indicators' }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const [effRes, compRes, greenRes, susRes] = await Promise.all([
        supabase.from('effluents_logs').select(`*, profiles(name)`).order('date', { ascending: false }),
        supabase.from('compost_logs').select(`*, profiles(name)`).order('date', { ascending: false }),
        supabase.from('green_areas_logs').select(`*, profiles(name)`).order('date', { ascending: false }),
        supabase.from('sustainability_indicators').select(`*, profiles(name)`).order('month', { ascending: false })
      ]);

      const wb = XLSX.utils.book_new();

      const execSummary = [
        { "INDICADORES DEL SISTEMA": "EVECA S.A.S. - REPORTE DE SOSTENIBILIDAD", "VALOR / ESTADO": "CENTRO INTEGRADO GERENCIAL" },
        { "INDICADORES DEL SISTEMA": "", "VALOR / ESTADO": "" },
        { "INDICADORES DEL SISTEMA": "Fecha de exportación", "VALOR / ESTADO": new Date().toLocaleDateString('es-CO') },
        { "INDICADORES DEL SISTEMA": "Generado por", "VALOR / ESTADO": profile?.name || 'Jefatura de Sostenibilidad' },
        { "INDICADORES DEL SISTEMA": "", "VALOR / ESTADO": "" },
        { "INDICADORES DEL SISTEMA": "INDICADOR CLAVE (KPI)", "VALOR / ESTADO": "VALOR ACUMULADO" },
        { "INDICADORES DEL SISTEMA": "Mitigación de Efluentes - Aceite Recuperado (L)", "VALOR / ESTADO": stats.totalOilRecovered },
        { "INDICADORES DEL SISTEMA": "Economía Circular - Residuos Aprovechados (kg)", "VALOR / ESTADO": stats.totalWasteAprovechado },
        { "INDICADORES DEL SISTEMA": "Registros Totales de Monitoreo de Efluentes", "VALOR / ESTADO": stats.effluentsCount },
        { "INDICADORES DEL SISTEMA": "Ciclos de Compostaje Controlados", "VALOR / ESTADO": stats.compostCount },
        { "INDICADORES DEL SISTEMA": "Mantenimientos de Áreas Verdes Ejecutados", "VALOR / ESTADO": stats.greenCount },
        { "INDICADORES DEL SISTEMA": "Último pH medido en campo", "VALOR / ESTADO": stats.lastPH }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(execSummary, { skipHeader: true });
      wsSummary['!cols'] = [{ wch: 45 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Ejecutivo");

      if (effRes.data) {
        const effData = effRes.data.map(item => ({
          "Fecha": new Date(item.date).toLocaleDateString('es-CO') + ' ' + new Date(item.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
          "Tanque": item.tank,
          "Tipo de Registro": item.tank === 'TK2' ? 'Recuperación de Aceite' : 'Flujo de POME',
          "Nivel de Aceite (cm)": item.tank === 'TK2' && item.oil_level !== null ? Number(item.oil_level) : '-',
          "Aceite Extraído (L)": item.tank === 'TK2' && item.recovered_oil !== null ? Number(item.recovered_oil) : '-',
          "POME Ingreso (m³)": item.tank !== 'TK2' && item.pome_input !== null ? Number(item.pome_input) : '-',
          "Evacuación a Biodigestor": item.sent_to_biodigester ? 'SÍ' : 'NO',
          "Destino Biodigestor": item.biodigester_destination || '-',
          "Volumen Despachado (m³)": item.pome_to_biodigester !== null ? Number(item.pome_to_biodigester) : '-',
          "Potencial pH": item.ph !== null ? Number(item.ph) : '-',
          "Observaciones Técnicas": item.comments || 'Sin novedades',
          "Registrado Por": item.profiles?.name || 'Operación Planta',
          "Documento Adjunto": item.attached_doc_url || 'No adjunto'
        }));
        const wsEff = XLSX.utils.json_to_sheet(effData);
        wsEff['!cols'] = [
          { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 24 }, { wch: 12 }, { wch: 45 }, { wch: 20 }, { wch: 50 }
        ];
        XLSX.utils.book_append_sheet(wb, wsEff, "Bitácora Efluentes");
      }

      if (compRes.data) {
        const compData = compRes.data.map(item => ({
          "Fecha": new Date(item.date).toLocaleDateString('es-CO'),
          "Materia Prima Ingreso (kg)": item.raw_material_in !== null ? Number(item.raw_material_in) : 0,
          "Temperatura (°C)": item.temperature !== null ? Number(item.temperature) : 0,
          "Humedad (%)": item.humidity !== null ? Number(item.humidity) : 0,
          "¿Volteado de Pila?": item.turned ? 'SÍ' : 'NO',
          "Observaciones de Proceso": item.comments || 'Sin novedades',
          "Registrado Por": item.profiles?.name || 'Operación Planta',
          "Documento Adjunto": item.attached_doc_url || 'No adjunto'
        }));
        const wsComp = XLSX.utils.json_to_sheet(compData);
        wsComp['!cols'] = [
          { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 20 }, { wch: 50 }
        ];
        XLSX.utils.book_append_sheet(wb, wsComp, "Biomasa y Compostaje");
      }

      if (greenRes.data) {
        const greenData = greenRes.data.map(item => ({
          "Fecha": new Date(item.date).toLocaleDateString('es-CO'),
          "Nombre de Área": item.area_name,
          "Tipo de Mantenimiento": item.maintenance_type,
          "Empresa/Jardinero Ejecutor": item.gardener_company || 'Interno',
          "Observaciones de Poda/Mantenimiento": item.observations || 'Sin observaciones',
          "Registrado Por": item.profiles?.name || 'Operación Planta',
          "Documento Adjunto": item.attached_doc_url || 'No adjunto'
        }));
        const wsGreen = XLSX.utils.json_to_sheet(greenData);
        wsGreen['!cols'] = [
          { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 45 }, { wch: 20 }, { wch: 50 }
        ];
        XLSX.utils.book_append_sheet(wb, wsGreen, "Mantenimiento Áreas Verdes");
      }

      if (susRes.data) {
        const susData = susRes.data.map(item => ({
          "Período (Mes)": item.month,
          "Consumo de Agua (m³)": item.water_consumption !== null ? Number(item.water_consumption) : 0,
          "Consumo Eléctrico (kW)": item.energy_consumption !== null ? Number(item.energy_consumption) : 0,
          "Residuos Orgánicos (kg)": item.organic_waste !== null ? Number(item.organic_waste) : 0,
          "Residuos Peligrosos (kg)": item.hazardous_waste !== null ? Number(item.hazardous_waste) : 0,
          "Residuos Aprovechables (kg)": item.recyclable_waste !== null ? Number(item.recyclable_waste) : 0,
          "Registrado Por": item.profiles?.name || 'Gestión Sostenibilidad'
        }));
        const wsSus = XLSX.utils.json_to_sheet(susData);
        wsSus['!cols'] = [
          { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 22 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSus, "Indicadores Gestión Ambiental");
      }

      XLSX.writeFile(wb, `Reporte_Gerencial_Sostenibilidad_EVECA_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleCaptureDashboard = async () => {
    const node = document.getElementById('dashboard-root');
    if (!node) {
      console.error('El elemento dashboard-root no existe en el DOM');
      return;
    }
    try {
      setIsExportingImage(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#030712',
        style: {
          borderRadius: '0px',
        }
      });
      const link = document.createElement('a');
      link.download = `EVECA_Dashboard_Sostenibilidad_${new Date().toISOString().substring(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al capturar la imagen del dashboard:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div id="dashboard-root" className="space-y-8 p-4 md:p-6 bg-slate-950/20 border border-transparent rounded-2xl">
      {/* Cabecera Corporativa de Control de Gestión */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0b0f19] to-slate-900 border border-slate-800 p-4 px-6 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest block">SISTEMA INTEGRADO DE GESTIÓN</span>
            <span className="text-sm font-bold text-white tracking-wide">EVECA S.A.S. • REPORTE GERENCIAL</span>
          </div>
        </div>
        <div className="flex flex-col sm:items-end font-mono">
          <span className="text-[10px] text-slate-500 font-bold">JEFATURA DE SOSTENIBILIDAD</span>
          <span className="text-xs text-slate-300 font-semibold mt-0.5">
            FECHA DE CORTE: <span className="text-[#00c5dc] font-bold">{currentTime}</span>
          </span>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 md:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c5dc]/5 rounded-full blur-3xl -z-10"></div>
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">EVECA S.A.S.</h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-sm">
            Bienvenido, <span className="text-slate-100 font-semibold">{profile?.name || 'Operador de Planta'}</span>. Este es el centro integrado de la Jefatura de Sostenibilidad.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCaptureDashboard}
            disabled={isExportingImage}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isExportingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#00c5dc]" />
                Capturando...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-[#00c5dc]" />
                Dashboard
              </>
            )}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="px-4 py-2 bg-[#11c46e]/10 hover:bg-[#11c46e]/20 disabled:opacity-50 text-[#11c46e] border border-[#11c46e]/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isExportingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Numerical Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Residuos Aprovechados</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-md">
              <Recycle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-purple-400">
              {stats.totalWasteAprovechado ? stats.totalWasteAprovechado.toLocaleString('es-CO') : '0'} kg
            </h3>
            <p className="text-xs text-slate-400 mt-1">Gestión Ambiental valorizada</p>
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
            <h3 className="text-3xl font-extrabold text-[#f8c851]">{stats.lastPH}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {stats.lastPH === '-' ? 'Sin registros' : 'Acidez del último tanque'}
            </p>
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
            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase">
              {hasEffluentData ? 'Tiempo Real / Histórico' : 'Sin Datos en la BD'}
            </span>
          </div>

          {!hasEffluentData ? (
            <div className="h-[300px] w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-6 text-center">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full mb-3">
                <Droplet className="w-8 h-8 animate-pulse" />
              </div>
              <h4 className="text-white font-bold text-sm">Histórico de Efluentes Vacío</h4>
              <p className="text-slate-400 text-xs max-w-sm mt-1">
                No se han registrado operaciones de tanques australianos todavía. Agregue su primer reporte técnico en el módulo de efluentes para activar este gráfico.
              </p>
              <Link to="/efluentes" className="mt-4 px-4 py-2 bg-[#00c5dc] hover:bg-[#00a9bd] text-slate-950 rounded-lg text-xs font-bold font-sans transition-all">
                Registrar Primer Efluente
              </Link>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={effluentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          )}
        </div>

        <div className="dash-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Materia Compost</h3>
            <p className="text-slate-400 text-xs mb-6">Distribución actual de masa y sustratos (kg)</p>
            
            {!hasCompostData ? (
              <div className="h-[200px] w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-4 text-center">
                <div className="p-2.5 bg-[#11c46e]/10 text-[#11c46e] rounded-full mb-2">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-white font-bold text-xs">Sin Registros de Compost</h4>
                <p className="text-slate-400 text-[11px] max-w-xs mt-1">
                  Una vez registre cargas de materia prima o controles de compostaje, verá la distribución térmica y de biomasa aquí.
                </p>
                <Link to="/compostaje" className="mt-3 px-3 py-1.5 bg-[#11c46e]/20 hover:bg-[#11c46e]/30 text-[#11c46e] rounded-lg text-[10px] font-bold font-sans transition-all">
                  Registrar Compostaje
                </Link>
              </div>
            ) : (
              <div className="h-[200px] w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={compostChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {compostChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} kg`} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {hasCompostData && (
            <div className="space-y-2 mt-4">
              {compostChartData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-400 font-medium">{item.name}</span>
                  </div>
                  <span className="text-white font-bold">{(item.value || 0).toLocaleString('es-CO')} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Consumo de Recursos (Agua y Energía) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="dash-card p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-400" />
                Histórico de Consumo de Recursos (Agua y Energía)
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Evolución mensual combinada del consumo de electricidad (kW) y agua potable (m³)</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-bold uppercase w-fit">
              {hasResourceData ? 'Datos de Planta Consolidados' : 'Sin Datos en la BD'}
            </span>
          </div>

          {!hasResourceData ? (
            <div className="h-[280px] w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 p-6 text-center">
              <div className="flex gap-3 mb-3 text-slate-500">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full">
                  <Droplet className="w-6 h-6" />
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h4 className="text-white font-bold text-sm">Historial de Consumo Vacío</h4>
              <p className="text-slate-400 text-xs max-w-md mt-1">
                No se han registrado consumos en los indicadores de sostenibilidad mensual todavía. Ingrese datos bajo el módulo de Gestión Ambiental para visualizar e interactuar con esta gráfica.
              </p>
              <Link to="/gestion-ambiental" className="mt-4 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold font-sans transition-all">
                Registrar Consumos Mensuales
              </Link>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resourceChartData} margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tickFormatter={(v) => `${v} m³`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={11} tickFormatter={(v) => `${v} kW`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                    formatter={(value, name) => {
                      if (name === "Consumo de Agua") return [`${Number(value).toLocaleString('es-CO')} m³`, name];
                      if (name === "Consumo de Energía") return [`${Number(value).toLocaleString('es-CO')} kW`, name];
                      return [value, name];
                    }}
                  />
                  <Legend iconType="circle" />
                  <Area yAxisId="left" type="monotone" name="Consumo de Agua" dataKey="water" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWater)" />
                  <Area yAxisId="right" type="monotone" name="Consumo de Energía" dataKey="energy" stroke="#eab308" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEnergy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
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

      {/* Footer Gerencial de Exportación */}
      <div className="pt-6 border-t border-slate-900/60 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono text-slate-500">
        <span>© {new Date().getFullYear()} EVECA S.A.S. - Centro Integrado de Planta.</span>
        <span className="text-slate-600">REPORTE DE SOSTENIBILIDAD CONTROLADO • CONFIDENCIALIDAD NIVEL GERENCIAL</span>
      </div>
    </div>
  );
}
