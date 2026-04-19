import React, { useMemo, useCallback } from "react";
import { PlusCircle, Calendar, FileText, ChevronRight, Settings, Receipt, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from "../context/AppContext";
import { ActionButton } from "../components/ActionButton";
import { Avance } from "../types";

export const Inicio: React.FC<{ onNavigate: (s: any) => void, onInstall: () => void, showInstall: boolean }> = ({ onNavigate, onInstall, showInstall }) => {
  const { 
    obras, 
    selectedObraId, 
    setSelectedObraId, 
    monthlyProfit, 
    avances, 
    calculateAvanceEconomics, 
    gastos, 
    certificaciones 
  } = useApp();

  const selectedObra = useMemo(() => obras.find(o => o.id === selectedObraId), [obras, selectedObraId]);
  
  const isDataCertified = useCallback((date: string) => {
    return (certificaciones || []).some(c => 
      c.obraId === selectedObraId && 
      c.fechaInicio && c.fechaFin && 
      date >= c.fechaInicio && date <= c.fechaFin
    );
  }, [certificaciones, selectedObraId]);

  const totalAcumulado = useMemo(() => {
    // 1. Producción NO certificada (en curso)
    const advancesEcon = (avances || [])
      .filter(a => a.obraId === selectedObraId && !isDataCertified(a.fecha))
      .reduce((acc, curr) => {
        const econ = calculateAvanceEconomics(curr);
        return {
          costeMO: acc.costeMO + (econ.costeManoObra || 0),
          beneficio: acc.beneficio + (econ.beneficio || 0)
        };
      }, { costeMO: 0, beneficio: 0 });
      
    const totalG = (gastos || [])
      .filter(g => g.obraId === selectedObraId && !isDataCertified(g.fecha))
      .reduce((sum, g) => sum + g.monto, 0);

    // 2. Certificaciones pendientes de cobro
    const montoCertsPendientes = (certificaciones || [])
      .filter(c => c.obraId === selectedObraId && c.estado !== 'cobrado')
      .reduce((sum, c) => sum + c.certificado, 0);

    const produccionEnCurso = advancesEcon.beneficio - totalG;

    return {
      costeMO: advancesEcon.costeMO,
      ingresosCurso: advancesEcon.beneficio + advancesEcon.costeMO,
      produccionEnCurso: produccionEnCurso,
      certPendiente: montoCertsPendientes,
      totalPendiente: produccionEnCurso + montoCertsPendientes
    };
  }, [avances, gastos, calculateAvanceEconomics, isDataCertified, selectedObraId, certificaciones]);

  const lastAvance = useMemo(() => 
    [...avances]
      .filter(a => a.obraId === selectedObraId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0],
    [avances, selectedObraId]
  );

  const weeklyTrend = useMemo(() => {
    const data: any[] = [];
    const now = new Date();
    const currentMonday = new Date(now);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0,0,0,0);

    for (let i = 3; i >= 0; i--) {
      const startOfWeek = new Date(currentMonday);
      startOfWeek.setDate(currentMonday.getDate() - (i * 7));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      
      const weekAvances = (avances || []).filter(a => {
        const d = new Date(a.fecha);
        return d >= startOfWeek && d <= endOfWeek && a.obraId === selectedObraId && !isDataCertified(a.fecha);
      });
      const beneficio = weekAvances.reduce((sum, a) => sum + calculateAvanceEconomics(a).beneficio, 0);
      data.push({
        name: i === 0 ? 'ACTUAL' : `S- ${i}`,
        beneficio: Math.round(beneficio),
      });
    }
    return data;
  }, [avances, calculateAvanceEconomics, isDataCertified, selectedObraId]);

  return (
    <div className="space-y-4">
      {showInstall && (
        <button 
          onClick={onInstall}
          className="w-full bg-slate-900 dark:bg-black text-white p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl"><PlusCircle size={20} /></div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Instalar App</p>
              <p className="text-[10px] font-bold opacity-60 uppercase">Acceso rápido al escritorio</p>
            </div>
          </div>
          <ChevronRight size={20} className="opacity-40" />
        </button>
      )}

      <section className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-2 px-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra Activa</label>
          <div className="flex gap-2">
            <button onClick={() => onNavigate("config")} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-transform"><Settings size={20} /></button>
            <button onClick={() => onNavigate("obras")} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">Gestionar</button>
          </div>
        </div>
        <div className="relative">
          <select 
            value={selectedObraId} 
            onChange={(e) => setSelectedObraId(e.target.value)}
            className="w-full text-xl font-black bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 appearance-none outline-none text-slate-800 dark:text-white"
          >
            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="rotate-90 text-slate-400" size={20} />
          </div>
        </div>
      </section>


      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4 shadow-xl shadow-slate-100/50 dark:shadow-none">
        <div className="flex justify-between items-center px-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Local de la Obra</label>
          <Activity size={14} className="text-blue-500 animate-pulse" />
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl space-y-3">
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase">1. Producción Bruta (En Curso)</span>
               <span className="text-sm font-black text-slate-700 dark:text-slate-300">{Math.round(totalAcumulado.ingresosCurso).toLocaleString()}€</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase">2. Certificaciones por Cobrar</span>
               <span className="text-sm font-black text-slate-700 dark:text-slate-300">{Math.round(totalAcumulado.certPendiente).toLocaleString()}€</span>
             </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-black text-slate-300 uppercase block tracking-widest mb-1 leading-tight">Total Bruto<br/>Pendiente</span>
              <span className="text-xl font-black text-slate-400 leading-none">{(Math.round(totalAcumulado.ingresosCurso + totalAcumulado.certPendiente)).toLocaleString()}€</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-blue-400 uppercase block tracking-widest mb-1 leading-tight">Beneficio Neto<br/>Estimado</span>
              <span className="text-3xl font-black text-blue-600 leading-none">{Math.round(totalAcumulado.totalPendiente).toLocaleString()}€</span>
            </div>
          </div>
        </div>

        <div className="pt-2 px-2 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-relaxed">
            * El beneficio neto deduce jornales y gastos operativos para mostrar tu ganancia real acumulada.
          </p>
        </div>
        <button 
          onClick={() => onNavigate("gastos")}
          className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white"><Receipt size={18} /></div>
            <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">Gestionar Gastos</span>
          </div>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
      </section>

      <div className="grid grid-cols-1 gap-3">
        <ActionButton onClick={() => onNavigate("registrar")} icon={<PlusCircle className="text-blue-600" size={28} />} title="REGISTRAR AVANCE" description="Añadir datos hoy" />
        <div className="grid grid-cols-2 gap-3">
          <ActionButton onClick={() => onNavigate("calendario")} icon={<Calendar className="text-orange-500" size={24} />} title="AGENDA" compact />
          <ActionButton onClick={() => onNavigate("certificacion")} icon={<FileText className="text-emerald-500" size={24} />} title="CIERRE" compact />
        </div>
      </div>
    </div>
  );
};
