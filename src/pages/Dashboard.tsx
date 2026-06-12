import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Droplet, Flame, FileSpreadsheet, Camera, Zap, Leaf, ChevronRight
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

        // Pull effluents for trend chart (include date, tank and pome_input)
        const { data: effluentsData } = await supabase
          .from('effluents_logs')
          .select('date, ph, recovered_oil, oil_level, pome_input, tank')
          .order('date', { ascending: true });

        if (effluentsData && effluentsData.length > 0) {
          const formattedEffluents = effluentsData.map((item: any) => {
            const d = new Date(item.date);
            const dayMonth = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
            return {
              // X axis and tooltip will show date + tank, e.g. "11/06 · TK1"
              name: `${dayMonth} · ${item.tank}`,
              ph: Number(item.ph) || 0,
              recovered: Number(item.recovered_oil) || 0,
              pome: Number(item.pome_input) || 0,
            };
          });

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
    <div id="dashboard-root" className="space-y-6 p-6 bg-[#05070f] rounded-[36px] border border-slate-900/60 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.18)] overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-semibold">Dashboard Gerencial</p>
              <h1 className="text-3xl font-extrabold text-white mt-3">EVECA S.A.S.</h1>
              <p className="text-slate-400 mt-3 max-w-2xl text-sm">Centro integrado de gestión de sostenibilidad para efluentes, compostaje, áreas verdes y consumo de recursos.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-300">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Usuario</p>
                <p className="text-sm font-semibold text-white mt-1">{profile?.name || 'Operador de Planta'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-300">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Fecha de corte</p>
                <p className="text-sm font-semibold text-white mt-1">{currentTime}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-1">
          <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Exportar</p>
                <p className="text-sm font-semibold text-white mt-1">Reporte gerencial</p>
              </div>
              <FileSpreadsheet className="w-5 h-5 text-[#11c46e]" />
            </div>
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="w-full rounded-2xl bg-[#11c46e]/10 border border-[#11c46e]/20 px-4 py-3 text-sm font-semibold text-[#11c46e] hover:bg-[#11c46e]/20 transition disabled:opacity-50"
            >
              {isExportingExcel ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Captura</p>
                <p className="text-sm font-semibold text-white mt-1">Imagen de dashboard</p>
              </div>
              <Camera className="w-5 h-5 text-[#00c5dc]" />
            </div>
            <button
              onClick={handleCaptureDashboard}
              disabled={isExportingImage}
              className="w-full rounded-2xl bg-[#00c5dc]/10 border border-[#00c5dc]/20 px-4 py-3 text-sm font-semibold text-[#00c5dc] hover:bg-[#00c5dc]/20 transition disabled:opacity-50"
            >
              {isExportingImage ? 'Capturando...' : 'Descargar PNG'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/80 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl"></div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Efluentes</p>
          <h2 className="text-4xl font-extrabold text-white mt-4">{stats.effluentsCount || 0}</h2>
          <p className="text-slate-400 text-sm mt-3">Registros de tanques australianos.</p>
        </div>
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/80 p-6 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-[#11c46e]/10 blur-3xl"></div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Aceite recuperado</p>
          <h2 className="text-4xl font-extrabold text-[#11c46e] mt-4">{stats.totalOilRecovered ? stats.totalOilRecovered.toLocaleString('es-CO') : '0'} L</h2>
          <p className="text-slate-400 text-sm mt-3">Recuperado en planta.</p>
        </div>
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/80 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-24 w-24 rounded-full bg-[#00c5dc]/10 blur-3xl"></div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Compostaje</p>
          <h2 className="text-4xl font-extrabold text-[#00c5dc] mt-4">{stats.compostCount || 0}</h2>
          <p className="text-slate-400 text-sm mt-3">Ciclos de maduración.</p>
        </div>
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/80 p-6 relative overflow-hidden">
          <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-purple-500/10 blur-3xl"></div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Residuos</p>
          <h2 className="text-4xl font-extrabold text-purple-400 mt-4">{stats.totalWasteAprovechado ? stats.totalWasteAprovechado.toLocaleString('es-CO') : '0'} kg</h2>
          <p className="text-slate-400 text-sm mt-3">Aprovechados en planta.</p>
        </div>
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/80 p-6 relative overflow-hidden">
          <div className="absolute top-4 left-4 h-14 w-14 rounded-full bg-[#f8c851]/10 blur-3xl"></div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Último pH</p>
          <h2 className="text-4xl font-extrabold text-[#f8c851] mt-4">{stats.lastPH}</h2>
          <p className="text-slate-400 text-sm mt-3">{stats.lastPH === '-' ? 'Sin registros' : 'Acidez del último tanque'}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="rounded-[40px] border border-slate-800 bg-slate-950/85 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Flujo de efluentes</p>
              <h2 className="text-2xl font-extrabold text-white">Tendencia y recuperación</h2>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
              {hasEffluentData ? 'Activo' : 'Sin datos'}
            </span>
          </div>
          <div className="h-[440px] w-full rounded-[30px] bg-slate-900/70 p-4">
            {hasEffluentData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={effluentChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c5dc" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#00c5dc" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#11c46e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#11c46e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#64748b" fontSize={11} tick={{ fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} formatter={(value, name) => {
                    if (name === 'POME Ingresado') return [`${Number(value).toLocaleString('es-CO')} m³`, name];
                    if (name === 'Aceite Recuperado (L)') return [`${Number(value).toLocaleString('es-CO')} L`, name];
                    if (name === 'Promedio pH') return [value, name];
                    return [value, name];
                  }} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Area type="monotone" name="Promedio pH" dataKey="ph" stroke="#00c5dc" strokeWidth={2} fill="url(#colorPH)" />
                  <Area type="monotone" name="Aceite Recuperado (L)" dataKey="recovered" stroke="#11c46e" strokeWidth={2} fill="url(#colorRec)" />
                  <Area type="monotone" name="POME Ingresado" dataKey="pome" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.14} fill="#f59e0b" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-[24px] border border-dashed border-slate-800 bg-slate-900/70 flex flex-col items-center justify-center text-center px-6 py-8">
                <Droplet className="w-10 h-10 text-[#00c5dc] mb-4" />
                <p className="text-white text-lg font-bold">Sin datos de efluentes</p>
                <p className="text-slate-400 text-sm mt-2">Registra tus operaciones en el módulo de Efluentes para activar este gráfico.</p>
                <Link to="/efluentes" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#00c5dc]/10 px-4 py-2 text-[#00c5dc] text-xs font-semibold hover:bg-[#00c5dc]/20 transition-all">Ir a Efluentes</Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-semibold">Indicadores</p>
                <h3 className="text-xl font-extrabold text-white mt-2">KPIs Rápidos</h3>
              </div>
              <span className="rounded-full bg-slate-900/75 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">Actualizado</span>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex justify-between text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">
                  <span>Último pH</span>
                  <span>{stats.lastPH}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-[#00c5dc]" style={{ width: `${Math.min(Number(stats.lastPH) * 7, 100)}%` }}></div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex justify-between text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">
                  <span>Aceite Recuperado</span>
                  <span>{stats.totalOilRecovered ? stats.totalOilRecovered.toLocaleString('es-CO') : '0'} L</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-[#11c46e]" style={{ width: `${Math.min(stats.totalOilRecovered / 20, 100)}%` }}></div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex justify-between text-xs uppercase tracking-[0.25em] text-slate-400 mb-3">
                  <span>Residuos aprovechados</span>
                  <span>{stats.totalWasteAprovechado ? stats.totalWasteAprovechado.toLocaleString('es-CO') : '0'} kg</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-400" style={{ width: `${Math.min(stats.totalWasteAprovechado / 40, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-semibold">Accesos rápidos</p>
                <h3 className="text-xl font-extrabold text-white mt-2">Módulos</h3>
              </div>
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/efluentes" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 hover:border-[#00c5dc]/50 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">Tanques</p>
                <p className="text-sm text-white font-semibold">Efluentes</p>
              </Link>
              <Link to="/compostaje" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 hover:border-[#11c46e]/50 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">Biomasa</p>
                <p className="text-sm text-white font-semibold">Compostaje</p>
              </Link>
              <Link to="/areas-verdes" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 hover:border-[#f8c851]/50 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">Verde</p>
                <p className="text-sm text-white font-semibold">Áreas</p>
              </Link>
              <Link to="/gestion-ambiental" className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 hover:border-purple-400/50 transition-all">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3">Indicadores</p>
                <p className="text-sm text-white font-semibold">Gestión</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-semibold">Compostaje</p>
              <h3 className="text-xl font-extrabold text-white mt-2">Distribución de Materia</h3>
            </div>
            <Flame className="w-6 h-6 text-[#00c5dc]" />
          </div>
          {hasCompostData ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compostChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
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
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/70 text-center px-4">
              <Flame className="w-10 h-10 text-[#00c5dc] mb-4" />
              <p className="text-slate-400 text-sm">Registre composteras para ver la distribución de fases y sustratos.</p>
            </div>
          )}
          {hasCompostData && (
            <div className="mt-4 space-y-3">
              {compostChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-semibold text-white">{(item.value || 0).toLocaleString('es-CO')} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 font-semibold">Consumo</p>
              <h3 className="text-xl font-extrabold text-white mt-2">Agua y Energía</h3>
            </div>
            <Leaf className="w-6 h-6 text-[#11c46e]" />
          </div>
          {hasResourceData ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resourceChartData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                  <defs>
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111827" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tick={{ fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tick={{ fill: '#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={11} tick={{ fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155' }} formatter={(value, name) => {
                    if (name === 'Consumo de Agua') return [`${Number(value).toLocaleString('es-CO')} m³`, name];
                    if (name === 'Consumo de Energía') return [`${Number(value).toLocaleString('es-CO')} kW`, name];
                    return [value, name];
                  }} />
                  <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Area yAxisId="left" type="monotone" name="Consumo de Agua" dataKey="water" stroke="#3b82f6" strokeWidth={2} fill="url(#colorWater)" />
                  <Area yAxisId="right" type="monotone" name="Consumo de Energía" dataKey="energy" stroke="#eab308" strokeWidth={2} fill="url(#colorEnergy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/70 text-center px-4">
              <Zap className="w-10 h-10 text-amber-400 mb-4" />
              <p className="text-slate-400 text-sm">Registre consumos de agua y electricidad en Gestión Ambiental para generar este análisis.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-800 bg-slate-950/85 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-white">Actividad reciente</h3>
            <p className="text-slate-400 text-sm mt-1">Últimos registros de planta en los diferentes módulos.</p>
          </div>
          <span className="rounded-full bg-slate-900/75 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">{recentLogs.length} entradas</span>
        </div>

        <div className="space-y-4">
          {recentLogs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/70 p-6 text-center text-slate-500">
              No hay registros recientes. Agrega datos en los módulos para poblar esta vista.
            </div>
          ) : (
            recentLogs.map((log, idx) => (
              <div key={idx} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.35em] px-2 py-1 rounded-full ${
                      log.type === 'Efluentes' ? 'bg-blue-500/10 text-blue-400' : 'bg-[#11c46e]/10 text-[#11c46e]'
                    }`}>{log.type}</span>
                  </div>
                  <h5 className="text-white font-semibold">{log.title}</h5>
                  <p className="text-slate-400 text-xs mt-2 line-clamp-2">{log.comments || 'Sin comentarios adicionales.'}</p>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap self-start">{new Date(log.date).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <span>¿Tiene anomalías en base de datos?</span>
          <Link to="/setup" className="text-[#00c5dc] hover:underline font-bold flex items-center gap-1">
            Ejecutar Test de Tablas <ChevronRight className="w-3" />
          </Link>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-900/60 flex flex-col sm:flex-row justify-between gap-2 text-[10px] font-mono text-slate-500">
        <span>© {new Date().getFullYear()} EVECA S.A.S. - Centro Integrado de Planta</span>
        <span>REPORTE DE SOSTENIBILIDAD CONTROLADO • CONFIDENCIALIDAD GERENCIAL</span>
      </div>
    </div>
  );
}
