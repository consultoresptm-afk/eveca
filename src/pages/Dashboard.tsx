import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Droplets, TrendingUp, Flame, Leaf, TreePine, Award, Trash2, Zap, AlertTriangle, Users, Scissors, Recycle, Download, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';

export default function Dashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rawData, setRawData] = useState<any>({
    effluents: [],
    compost: [],
    environmental: [],
    greenAreas: [],
    sustainability: []
  });
  const [stats, setStats] = useState({
    effluents: {
      totalPome: 0,
      totalOil: 0,
      totalBiodigester: 0,
    },
    compost: {
      totalCake: 0,
      totalSludge: 0,
      totalFiber: 0,
      totalAshes: 0,
    },
    environmental: {
      totalWater: 0,
      totalEnergy: 0,
      totalHazardous: 0,
      totalSolid: 0,
      totalRecyclables: 0,
    },
    greenAreas: {
      totalMowed: 0,
      totalCompostApplied: 0,
      totalTrees: 0,
    },
    sustainability: {
      totalTraining: 0,
      totalInspections: 0,
      totalNC: 0,
      totalSocial: 0,
    }
  });

  const [effluentData, setEffluentData] = useState<any[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch data
      let effluentsQuery = supabase.from('effluents_logs').select('*').order('date', { ascending: true });
      let compostQuery = supabase.from('compost_logs').select('*');
      let environmentalQuery = supabase.from('environmental_logs').select('*').order('date', { ascending: true });
      let greenAreasQuery = supabase.from('green_areas_logs').select('*');
      let sustainabilityQuery = supabase.from('sustainability_logs').select('*');

      if (startDate) {
        effluentsQuery = effluentsQuery.gte('date', startDate);
        compostQuery = compostQuery.gte('date', startDate);
        environmentalQuery = environmentalQuery.gte('date', startDate);
        greenAreasQuery = greenAreasQuery.gte('date', startDate);
        sustainabilityQuery = sustainabilityQuery.gte('date', startDate);
      }

      if (endDate) {
        effluentsQuery = effluentsQuery.lte('date', endDate);
        compostQuery = compostQuery.lte('date', endDate);
        environmentalQuery = environmentalQuery.lte('date', endDate);
        greenAreasQuery = greenAreasQuery.lte('date', endDate);
        sustainabilityQuery = sustainabilityQuery.lte('date', endDate);
      }

      const [effluentsRes, compostRes, envRes, greenRes, susRes] = await Promise.all([
        effluentsQuery, compostQuery, environmentalQuery, greenAreasQuery, sustainabilityQuery
      ]);

      const effluents = effluentsRes.data || [];
      const compost = compostRes.data || [];
      const environmental = envRes.data || [];
      const greenAreas = greenRes.data || [];
      const sustainability = susRes.data || [];

      setRawData({ effluents, compost, environmental, greenAreas, sustainability });

      let updatedStats = {
        effluents: { totalPome: 0, totalOil: 0, totalBiodigester: 0 },
        compost: { totalCake: 0, totalSludge: 0, totalFiber: 0, totalAshes: 0 },
        environmental: { totalWater: 0, totalEnergy: 0, totalHazardous: 0, totalSolid: 0, totalRecyclables: 0 },
        greenAreas: { totalMowed: 0, totalCompostApplied: 0, totalTrees: 0 },
        sustainability: { totalTraining: 0, totalInspections: 0, totalNC: 0, totalSocial: 0 }
      };

      if (effluents) {
        updatedStats.effluents.totalPome = effluents.reduce((acc, curr) => acc + curr.tk1_pome_in, 0);
        updatedStats.effluents.totalOil = effluents.reduce((acc, curr) => acc + curr.tk2_oil_recovered, 0);
        updatedStats.effluents.totalBiodigester = effluents.reduce((acc, curr) => acc + curr.tk3_pome_to_biodigester, 0);

        const formattedChart = effluents.map(item => ({
          name: new Date(item.date).toLocaleDateString(),
          'POME Recibido (TK1)': item.tk1_pome_in,
          'Aceite Recuperado (TK2)': item.tk2_oil_recovered,
          'POME a Biodigestor (TK3)': item.tk3_pome_to_biodigester
        }));
        setEffluentData(formattedChart);
      }

      if (compost) {
         updatedStats.compost.totalCake = compost.reduce((acc, curr) => acc + curr.tridecanter_cake, 0);
         updatedStats.compost.totalSludge = compost.reduce((acc, curr) => acc + curr.process_sludge, 0);
         updatedStats.compost.totalFiber = compost.reduce((acc, curr) => acc + curr.fiber, 0);
         updatedStats.compost.totalAshes = compost.reduce((acc, curr) => acc + curr.boiler_ashes, 0);
      }
      
      if (environmental) {
         updatedStats.environmental.totalWater = environmental.reduce((acc, curr) => acc + curr.water_consumption_m3, 0);
         updatedStats.environmental.totalEnergy = environmental.reduce((acc, curr) => acc + curr.energy_consumption_kwh, 0);
         updatedStats.environmental.totalHazardous = environmental.reduce((acc, curr) => acc + curr.hazardous_waste_kg, 0);
         updatedStats.environmental.totalSolid = environmental.reduce((acc, curr) => acc + curr.solid_waste_kg, 0);
         updatedStats.environmental.totalRecyclables = environmental.reduce((acc, curr) => acc + (curr.recyclable_waste_kg || 0), 0);

         const formattedEnvChart = environmental.map(item => ({
          name: new Date(item.date).toLocaleDateString(),
          'Consumo Agua (m³)': item.water_consumption_m3,
          'Consumo Energía (kWh)': item.energy_consumption_kwh / 100, // Scaled for visibility
          'Peligrosos (Kg)': item.hazardous_waste_kg,
          'Ordinarios (Kg)': item.solid_waste_kg,
          'Aprovechables (Kg)': item.recyclable_waste_kg || 0,
        }));
        setEnvironmentalData(formattedEnvChart);
      }

      if (greenAreas) {
         updatedStats.greenAreas.totalMowed = greenAreas.reduce((acc, curr) => acc + curr.mowed_area_m2, 0);
         updatedStats.greenAreas.totalCompostApplied = greenAreas.reduce((acc, curr) => acc + curr.compost_applied_kg, 0);
         updatedStats.greenAreas.totalTrees = greenAreas.reduce((acc, curr) => acc + curr.trees_planted, 0);
      }

      if (sustainability) {
         updatedStats.sustainability.totalTraining = sustainability.reduce((acc, curr) => acc + curr.training_hours, 0);
         updatedStats.sustainability.totalInspections = sustainability.reduce((acc, curr) => acc + curr.inspections_conducted, 0);
         updatedStats.sustainability.totalNC = sustainability.reduce((acc, curr) => acc + curr.rspo_non_conformities, 0);
         updatedStats.sustainability.totalSocial = sustainability.reduce((acc, curr) => acc + curr.social_activities, 0);
      }

      setStats(updatedStats);
    }

    fetchData();

    // Set up real-time subscriptions
    const channels = [
      'effluents_logs',
      'compost_logs',
      'environmental_logs',
      'green_areas_logs',
      'sustainability_logs'
    ].map(table => 
      supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
          console.log(`Change received on ${table}! Reloading data...`);
          fetchData();
        })
        .subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [startDate, endDate]);

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ['Categoría', 'Métrica', 'Valor', 'Unidad'],
        ['Efluentes', 'POME Recibido', stats.effluents.totalPome, 'TM'],
        ['Efluentes', 'Aceite Recuperado', stats.effluents.totalOil, 'TM'],
        ['Efluentes', 'POME a Biodigestor', stats.effluents.totalBiodigester, 'TM'],
        ['Compostaje', 'Torta Tridecanter', stats.compost.totalCake, 'TM'],
        ['Compostaje', 'Lodos de Proceso', stats.compost.totalSludge, 'TM'],
        ['Compostaje', 'Fibra', stats.compost.totalFiber, 'TM'],
        ['Compostaje', 'Cenizas Caldera', stats.compost.totalAshes, 'TM'],
        ['Ambiental', 'Consumo Agua', stats.environmental.totalWater, 'm³'],
        ['Ambiental', 'Consumo Energía', stats.environmental.totalEnergy, 'kWh'],
        ['Ambiental', 'Residuos Peligrosos', stats.environmental.totalHazardous, 'Kg'],
        ['Ambiental', 'Residuos Ordinarios', stats.environmental.totalSolid, 'Kg'],
        ['Ambiental', 'Residuos Aprovechables', stats.environmental.totalRecyclables, 'Kg'],
        ['Zonas Verdes', 'Área Podada', stats.greenAreas.totalMowed, 'm²'],
        ['Zonas Verdes', 'Compost Aplicado', stats.greenAreas.totalCompostApplied, 'Kg'],
        ['Zonas Verdes', 'Árboles Sembrados', stats.greenAreas.totalTrees, 'Und'],
        ['Sostenibilidad', 'Hrs Entrenamiento', stats.sustainability.totalTraining, 'Hrs'],
        ['Sostenibilidad', 'Inspecciones Internas', stats.sustainability.totalInspections, 'Und'],
        ['Sostenibilidad', 'No Conformidades RSPO', stats.sustainability.totalNC, 'Und'],
        ['Sostenibilidad', 'Actividades de Comunidad', stats.sustainability.totalSocial, 'Und']
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen BSC');

      if (rawData.effluents.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawData.effluents), 'Efluentes');
      if (rawData.compost.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawData.compost), 'Compostaje');
      if (rawData.environmental.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawData.environmental), 'Ambiental');
      if (rawData.greenAreas.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawData.greenAreas), 'Zonas Verdes');
      if (rawData.sustainability.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawData.sustainability), 'Sostenibilidad');

      XLSX.writeFile(workbook, `Reporte_Sostenibilidad_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Las descargas pueden estar bloqueadas en la vista incrustada. Pide a tu navegador que abra la aplicación en una nueva pestaña (haciendo clic en el ícono arriba).');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('Reporte Gerencial de Sostenibilidad (BSC)', 14, 22);
      
      doc.setFontSize(10);
      doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
      if (startDate || endDate) {
        doc.text(`Periodo: ${startDate || 'Inicio'} hasta ${endDate || 'Fin'}`, 14, 36);
      } else {
        doc.text('Periodo: Histórico Completo', 14, 36);
      }

      const tableColumn = ['Categoría', 'Métrica', 'Valor', 'Unidad'];
      const tableRows = [
        ['Efluentes', 'POME Recibido', stats.effluents.totalPome.toLocaleString(), 'TM'],
        ['Efluentes', 'Aceite Recuperado', stats.effluents.totalOil.toLocaleString(), 'TM'],
        ['Efluentes', 'POME a Biodigestor', stats.effluents.totalBiodigester.toLocaleString(), 'TM'],
        ['Compostaje', 'Torta Tridecanter', stats.compost.totalCake.toLocaleString(), 'TM'],
        ['Compostaje', 'Lodos de Proceso', stats.compost.totalSludge.toLocaleString(), 'TM'],
        ['Compostaje', 'Fibra', stats.compost.totalFiber.toLocaleString(), 'TM'],
        ['Compostaje', 'Cenizas Caldera', stats.compost.totalAshes.toLocaleString(), 'TM'],
        ['Ambiental', 'Consumo Agua', stats.environmental.totalWater.toLocaleString(), 'm³'],
        ['Ambiental', 'Consumo Energía', stats.environmental.totalEnergy.toLocaleString(), 'kWh'],
        ['Ambiental', 'Residuos Peligrosos', stats.environmental.totalHazardous.toLocaleString(), 'Kg'],
        ['Ambiental', 'Residuos Ordinarios', stats.environmental.totalSolid.toLocaleString(), 'Kg'],
        ['Ambiental', 'Residuos Aprovechables', stats.environmental.totalRecyclables.toLocaleString(), 'Kg'],
        ['Zonas Verdes', 'Área Podada', stats.greenAreas.totalMowed.toLocaleString(), 'm²'],
        ['Zonas Verdes', 'Compost Aplicado', stats.greenAreas.totalCompostApplied.toLocaleString(), 'Kg'],
        ['Zonas Verdes', 'Árboles Sembrados', stats.greenAreas.totalTrees.toLocaleString(), 'Und'],
        ['Sostenibilidad', 'Hrs Entrenamiento', stats.sustainability.totalTraining.toLocaleString(), 'Hrs'],
        ['Sostenibilidad', 'Inspecciones Internas', stats.sustainability.totalInspections.toLocaleString(), 'Und'],
        ['Sostenibilidad', 'No Conformidades RSPO', stats.sustainability.totalNC.toLocaleString(), 'Und'],
        ['Sostenibilidad', 'Actividades de Comunidad', stats.sustainability.totalSocial.toLocaleString(), 'Und']
      ];

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 197, 220] }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      if (rawData.effluents.length > 0) {
        doc.setFontSize(12);
        doc.text('Detalle Operativo: Efluentes', 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Fecha', 'POME Recibido (TM)', 'Aceite Recuperado (TM)', 'Biodigestor (TM)']],
          body: rawData.effluents.map((row: any) => [format(new Date(row.date), 'dd/MM/yyyy'), row.tk1_pome_in, row.oil_recovered_kg, row.tk2_biodigester_in]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 197, 220] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      if (rawData.compost.length > 0) {
        doc.setFontSize(12);
        doc.text('Detalle Operativo: Compostaje', 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Fecha', 'Lote', 'Torta (TM)', 'Lodos (TM)', 'Fibra (TM)', 'Cenizas (TM)']],
          body: rawData.compost.map((row: any) => [format(new Date(row.date), 'dd/MM/yyyy'), row.batch_id || '-', row.cake_tons, row.sludge_tons, row.fiber_tons, row.ashes_tons]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [17, 196, 110] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      if (rawData.environmental.length > 0) {
        doc.setFontSize(12);
        doc.text('Detalle Operativo: Ambiental', 14, currentY);
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Fecha', 'Agua (m³)', 'Energía (kWh)', 'Pel. (Kg)', 'Ord. (Kg)', 'Aprov. (Kg)']],
            body: rawData.environmental.map((row: any) => [format(new Date(row.date), 'dd/MM/yyyy'), row.water_consumption_m3, row.energy_consumption_kwh, row.hazardous_waste_kg, row.solid_waste_kg, row.recyclable_waste_kg]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [248, 200, 81] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      if (rawData.greenAreas.length > 0) {
        doc.setFontSize(12);
        doc.text('Detalle Operativo: Zonas Verdes', 14, currentY);
        autoTable(doc, {
            startY: currentY + 5,
            head: [['Fecha', 'Podada (m²)', 'Compost (Kg)', 'Árboles (Und)']],
            body: rawData.greenAreas.map((row: any) => [format(new Date(row.date), 'dd/MM/yyyy'), row.mowed_area_m2, row.compost_applied_kg, row.trees_planted]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [34, 197, 94] }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      if (rawData.sustainability.length > 0) {
         doc.setFontSize(12);
         doc.text('Detalle Operativo: Sostenibilidad Corporativa', 14, currentY);
         autoTable(doc, {
             startY: currentY + 5,
             head: [['Fecha', 'Entrenamiento (Hrs)', 'Inspecciones', 'No Conf.', 'Comunidad']],
             body: rawData.sustainability.map((row: any) => [format(new Date(row.date), 'dd/MM/yyyy'), row.training_hours, row.inspections_conducted, row.rspo_non_conformities, row.social_activities]),
             styles: { fontSize: 8 },
             headStyles: { fillColor: [59, 130, 246] }
         });
         currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      doc.save(`Reporte_Sostenibilidad_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Las descargas pueden estar bloqueadas en la vista incrustada. Pide a tu navegador que abra la aplicación en una nueva pestaña (haciendo clic en el ícono arriba).');
    }
  };

  const exportToImage = async () => {
    if (!dashboardRef.current) return;
    
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        backgroundColor: '#0f1015',
        pixelRatio: 2,
        filter: (node) => {
          // Ignore buttons or elements with the ignore data attribute
          if ((node as HTMLElement)?.dataset?.html2canvasIgnore === 'true') {
            return false;
          }
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Dashboard_Sostenibilidad_${format(new Date(), 'yyyy-MM-dd')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting image:", err);
      alert('Error en la descarga. Si estás dentro de la previsualización (iFrame), es posible que las descargas estén bloqueadas. Por favor, abre la aplicación en una nueva pestaña.');
    }
  };

  return (
    <div className="space-y-6" ref={dashboardRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tablero Jefatura de Sostenibilidad</h1>
          <p className="text-sm text-[#8b92a9]">Perspectiva operativa y estratégica de la Jefatura de Sostenibilidad.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2" data-html2canvas-ignore="true">
              <div>
                 <label className="block text-[10px] font-medium text-[#8b92a9] mb-1">Desde Fecha</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field text-sm py-1.5 w-32" />
              </div>
              <div>
                 <label className="block text-[10px] font-medium text-[#8b92a9] mb-1">Hasta Fecha</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field text-sm py-1.5 w-32" />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-xs text-[#ff3d60] hover:text-white transition-colors self-end mb-2 ml-2"
                >
                  Limpiar
                </button>
              )}
           </div>
           <div className="flex items-center gap-2 self-end mb-1" data-html2canvas-ignore="true">
              <button onClick={exportToImage} className="btn-secondary flex items-center gap-2 py-2 px-4 shadow-sm bg-[#1a1a27] hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/30 transition-all text-xs">
                <ImageIcon className="w-4 h-4" />
                Imagen
              </button>
              <button onClick={exportToExcel} className="btn-secondary flex items-center gap-2 py-2 px-4 shadow-sm bg-[#1a1a27] hover:bg-[#11c46e]/10 hover:text-[#11c46e] hover:border-[#11c46e]/30 transition-all text-xs">
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button onClick={exportToPDF} className="btn-secondary flex items-center gap-2 py-2 px-4 shadow-sm bg-[#1a1a27] hover:bg-[#ff3d60]/10 hover:text-[#ff3d60] hover:border-[#ff3d60]/30 transition-all text-xs">
                <FileText className="w-4 h-4" />
                PDF
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ÁREA: EFLUENTES */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="bg-[#1e1e2b] px-6 py-4 border-b border-[#363952] flex items-center gap-3">
            <Droplets className="h-6 w-6 text-[#00c5dc]" />
            <h2 className="text-lg font-bold text-white">Gestión de Efluentes</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1a1a27] rounded-lg p-4 text-center border border-[#363952]">
                <p className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide">POME Recibido</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.effluents.totalPome.toLocaleString()}</p>
                <p className="text-xs text-[#8b92a9]">TM</p>
              </div>
              <div className="bg-[#1e1e2b] rounded-lg p-4 text-center border border-[#f8c851]/30">
                <p className="text-[10px] font-semibold text-[#f8c851] uppercase tracking-wide">Aceite Recup.</p>
                <p className="text-2xl font-bold text-[#f8c851] mt-1">{stats.effluents.totalOil.toLocaleString()}</p>
                <p className="text-xs text-[#f8c851]/70">TM</p>
              </div>
              <div className="bg-[#1e1e2b] rounded-lg p-4 text-center border border-[#ff3d60]/30">
                <p className="text-[10px] font-semibold text-[#ff3d60] uppercase tracking-wide">A Biodigestor</p>
                <p className="text-2xl font-bold text-[#ff3d60] mt-1">{stats.effluents.totalBiodigester.toLocaleString()}</p>
                <p className="text-xs text-[#ff3d60]/70">TM</p>
              </div>
            </div>
            <div className="h-48 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={effluentData}>
                  <defs>
                    <linearGradient id="colorOil" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f8c851" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f8c851" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363952" />
                  <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="#8b92a9" />
                  <YAxis fontSize={10} width={30} stroke="#8b92a9" />
                  <Tooltip fontSize={12} contentStyle={{ backgroundColor: '#27293d', borderColor: '#363952', color: '#fff' }} />
                  <Area type="monotone" dataKey="Aceite Recuperado (TK2)" stroke="#f8c851" fillOpacity={1} fill="url(#colorOil)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ÁREA: PLANTA DE COMPOSTAJE */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="bg-[#1e1e2b] px-6 py-4 border-b border-[#363952] flex items-center gap-3">
            <Recycle className="h-6 w-6 text-[#11c46e]" />
            <h2 className="text-lg font-bold text-white">Planta de Compostaje</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-[#1a1a27] rounded-lg border border-[#363952]">
                <Leaf className="h-6 w-6 text-[#11c46e] mr-4" />
                <div>
                  <p className="text-sm font-medium text-[#8b92a9]">Torta Tridecanter</p>
                  <p className="text-xl font-bold text-white">{stats.compost.totalCake.toLocaleString()} <span className="text-sm font-normal text-[#8b92a9]">TM</span></p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-[#1a1a27] rounded-lg border border-[#363952]">
                <Droplets className="h-6 w-6 text-[#00c5dc] mr-4" />
                <div>
                  <p className="text-sm font-medium text-[#8b92a9]">Lodos de Proceso</p>
                  <p className="text-xl font-bold text-white">{stats.compost.totalSludge.toLocaleString()} <span className="text-sm font-normal text-[#8b92a9]">TM</span></p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-[#1a1a27] rounded-lg border border-[#363952]">
                <TreePine className="h-6 w-6 text-[#f8c851] mr-4" />
                <div>
                  <p className="text-sm font-medium text-[#8b92a9]">Fibra</p>
                  <p className="text-xl font-bold text-white">{stats.compost.totalFiber.toLocaleString()} <span className="text-sm font-normal text-[#8b92a9]">TM</span></p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-[#1a1a27] rounded-lg border border-[#363952]">
                <Flame className="h-6 w-6 text-[#ff3d60] mr-4" />
                <div>
                  <p className="text-sm font-medium text-[#8b92a9]">Cenizas Caldera</p>
                  <p className="text-xl font-bold text-white">{stats.compost.totalAshes.toLocaleString()} <span className="text-sm font-normal text-[#8b92a9]">TM</span></p>
                </div>
              </div>
            </div>
            <div className="mt-6 bg-[#1a1a27] rounded-lg p-4 text-center border border-[#11c46e]/30">
                <p className="text-sm text-[#11c46e] font-medium tracking-wide">VOL. RECIBIDO PARA TRANSFORMACIÓN</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {(stats.compost.totalCake + stats.compost.totalSludge + stats.compost.totalFiber + stats.compost.totalAshes).toLocaleString()} TM
                </p>
            </div>
          </div>
        </div>

        {/* ÁREA: GESTIÓN AMBIENTAL */}
        <div className="dash-card flex flex-col overflow-hidden xl:col-span-2">
          <div className="bg-[#1e1e2b] px-6 py-4 border-b border-[#363952] flex items-center gap-3">
            <Zap className="h-6 w-6 text-[#4051f9]" />
            <h2 className="text-lg font-bold text-white">Gestión Ambiental (Recursos y Residuos)</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="col-span-1 space-y-4">
               <div className="bg-[#1a1a27] rounded-lg p-3 border border-[#4051f9]/30 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-semibold text-[#4051f9] uppercase tracking-wide">Consumo Agua</p>
                   <p className="text-xl font-bold text-white">{stats.environmental.totalWater.toLocaleString()} m³</p>
                 </div>
                 <Droplets className="h-8 w-8 text-[#4051f9]/50" />
               </div>
               <div className="bg-[#1a1a27] rounded-lg p-3 border border-[#f8c851]/30 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-semibold text-[#f8c851] uppercase tracking-wide">Consumo Energía</p>
                   <p className="text-xl font-bold text-white">{stats.environmental.totalEnergy.toLocaleString()} kWh</p>
                 </div>
                 <Zap className="h-8 w-8 text-[#f8c851]/50" />
               </div>
               <div className="bg-[#1a1a27] rounded-lg p-3 border border-[#ff3d60]/30 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-semibold text-[#ff3d60] uppercase tracking-wide">Residuos Peligrosos</p>
                   <p className="text-xl font-bold text-white">{stats.environmental.totalHazardous.toLocaleString()} Kg</p>
                 </div>
                 <AlertTriangle className="h-8 w-8 text-[#ff3d60]/50" />
               </div>
               <div className="bg-[#1a1a27] rounded-lg p-3 border border-[#363952] flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide">Residuos Ordinarios</p>
                   <p className="text-xl font-bold text-white">{stats.environmental.totalSolid.toLocaleString()} Kg</p>
                 </div>
                 <Trash2 className="h-8 w-8 text-[#8b92a9]/50" />
               </div>
               <div className="bg-[#1a1a27] rounded-lg p-3 border border-[#11c46e]/30 flex justify-between items-center">
                 <div>
                   <p className="text-[10px] font-semibold text-[#11c46e] uppercase tracking-wide">Res. Aprovechables</p>
                   <p className="text-xl font-bold text-white">{stats.environmental.totalRecyclables.toLocaleString()} Kg</p>
                 </div>
                 <Recycle className="h-8 w-8 text-[#11c46e]/50" />
               </div>
             </div>
             <div className="col-span-2 flex flex-col gap-6">
               <div className="h-56">
                 <h3 className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide mb-2 text-center">Consumo de Recursos</h3>
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={environmentalData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363952" />
                     <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="#8b92a9" />
                     <YAxis yAxisId="left" fontSize={10} width={40} stroke="#8b92a9" />
                     <YAxis yAxisId="right" orientation="right" fontSize={10} width={40} stroke="#8b92a9" />
                     <Tooltip contentStyle={{ backgroundColor: '#27293d', borderColor: '#363952', color: '#fff' }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                     <Line yAxisId="left" type="monotone" name="Agua (m³)" dataKey="Consumo Agua (m³)" stroke="#4051f9" strokeWidth={3} dot={{r: 4, fill: '#1a1a27', strokeWidth: 2}} />
                     <Line yAxisId="right" type="monotone" name="Energía (kWh x100)" dataKey="Consumo Energía (kWh)" stroke="#f8c851" strokeWidth={3} dot={{r: 4, fill: '#1a1a27', strokeWidth: 2}} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
               <div className="h-56">
                 <h3 className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide mb-2 text-center">Generación de Residuos</h3>
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={environmentalData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#363952" />
                     <XAxis dataKey="name" fontSize={10} tickMargin={10} stroke="#8b92a9" />
                     <YAxis fontSize={10} width={40} stroke="#8b92a9" />
                     <Tooltip contentStyle={{ backgroundColor: '#27293d', borderColor: '#363952', color: '#fff' }} cursor={{ fill: '#27293d' }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                     <Bar name="Peligrosos (Kg)" dataKey="Peligrosos (Kg)" fill="#ff3d60" radius={[4, 4, 0, 0]} />
                     <Bar name="Ordinarios (Kg)" dataKey="Ordinarios (Kg)" fill="#8b92a9" radius={[4, 4, 0, 0]} />
                     <Bar name="Aprovechables (Kg)" dataKey="Aprovechables (Kg)" fill="#11c46e" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>
        </div>

        {/* ÁREA: SOSTENIBILIDAD CORPORATIVA */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="bg-[#1e1e2b] px-6 py-4 border-b border-[#363952] flex items-center gap-3">
            <Award className="h-6 w-6 text-[#6a62b4]" />
            <h2 className="text-lg font-bold text-white">Sostenibilidad Corporativa</h2>
          </div>
          <div className="p-6 flex-1">
             <div className="grid grid-cols-2 gap-4 h-full">
                <div className="bg-[#1a1a27] rounded-xl p-5 flex flex-col justify-center items-center text-center border border-[#363952]">
                  <span className="bg-[#6a62b4]/20 p-2 rounded-full mb-3">
                    <Users className="h-6 w-6 text-[#6a62b4]" />
                  </span>
                  <p className="text-3xl font-bold text-white">{stats.sustainability.totalTraining}</p>
                  <p className="text-xs font-medium text-[#8b92a9] mt-1 uppercase tracking-wide">Hrs Entrenamiento</p>
                </div>
                <div className="bg-[#1a1a27] rounded-xl p-5 flex flex-col justify-center items-center text-center border border-[#363952]">
                  <span className="bg-[#4051f9]/20 p-2 rounded-full mb-3">
                    <Award className="h-6 w-6 text-[#4051f9]" />
                  </span>
                  <p className="text-3xl font-bold text-white">{stats.sustainability.totalInspections}</p>
                  <p className="text-xs font-medium text-[#8b92a9] mt-1 uppercase tracking-wide">Inspecciones Internas</p>
                </div>
                <div className="bg-[#1a1a27] rounded-xl p-5 flex flex-col justify-center items-center text-center border border-[#ff3d60]/30">
                  <span className="bg-[#ff3d60]/20 p-2 rounded-full mb-3">
                    <AlertTriangle className="h-6 w-6 text-[#ff3d60]" />
                  </span>
                  <p className="text-3xl font-bold text-[#ff3d60]">{stats.sustainability.totalNC}</p>
                  <p className="text-xs font-medium text-[#ff3d60] mt-1 uppercase tracking-wide">NC RSPO</p>
                </div>
                <div className="bg-[#1a1a27] rounded-xl p-5 flex flex-col justify-center items-center text-center border border-[#11c46e]/30">
                  <span className="bg-[#11c46e]/20 p-2 rounded-full mb-3">
                    <Users className="h-6 w-6 text-[#11c46e]" />
                  </span>
                  <p className="text-3xl font-bold text-[#11c46e]">{stats.sustainability.totalSocial}</p>
                  <p className="text-xs font-medium text-[#11c46e] mt-1 uppercase tracking-wide">Act. de Comunidad</p>
                </div>
             </div>
          </div>
        </div>

        {/* ÁREA: ZONAS VERDES */}
        <div className="dash-card flex flex-col overflow-hidden">
          <div className="bg-[#1e1e2b] px-6 py-4 border-b border-[#363952] flex items-center gap-3">
            <TreePine className="h-6 w-6 text-[#11c46e]" />
            <h2 className="text-lg font-bold text-white">Mant. Zonas Verdes</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
             <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-5 w-5 text-[#8b92a9]" />
                      <span className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide">Área Podada</span>
                    </div>
                    <span className="text-xl font-bold text-white">{stats.greenAreas.totalMowed.toLocaleString()} m²</span>
                  </div>
                  <div className="w-full bg-[#1a1a27] rounded-full h-2">
                    <div className="bg-[#00c5dc] h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-[#8b92a9]" />
                      <span className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide">Compost Aplicado</span>
                    </div>
                    <span className="text-xl font-bold text-white">{stats.greenAreas.totalCompostApplied.toLocaleString()} Kg</span>
                  </div>
                  <div className="w-full bg-[#1a1a27] rounded-full h-2">
                    <div className="bg-[#f8c851] h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2">
                      <TreePine className="h-5 w-5 text-[#8b92a9]" />
                      <span className="text-[10px] font-semibold text-[#8b92a9] uppercase tracking-wide">Árboles Sembrados</span>
                    </div>
                    <span className="text-xl font-bold text-white">{stats.greenAreas.totalTrees.toLocaleString()} Und</span>
                  </div>
                  <div className="w-full bg-[#1a1a27] rounded-full h-2">
                    <div className="bg-[#11c46e] h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

