import React, { useMemo, useCallback, useState } from "react";
import { PlusCircle, Calendar, FileText, ChevronRight, Settings, Receipt, Activity, ChevronDown, ChevronUp, MessageCircle, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from "../context/AppContext";
import { ActionButton } from "../components/ActionButton";
import { Avance } from "../types";
import { formatAmount } from "../lib/utils";
import { shareService } from "../services/shareService";

export const Inicio: React.FC<{ onNavigate: (s: any) => void, onInstall: () => void, showInstall: boolean }> = ({ onNavigate, onInstall, showInstall }) => {
  const { 
    obras, 
    selectedObraId, 
    setSelectedObraId, 
    avances, 
    calculateAvanceEconomics, 
    gastos, 
    certificaciones,
    operariosList,
    anticipos,
    itemsSate,
    manualAdjustments
  } = useApp();

  const [expandedLiquidacion, setExpandedLiquidacion] = useState(false);

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
      ingresosCurso: advancesEcon.beneficio + advancesEcon.costeMO,
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

  const monthlyTrend = useMemo(() => {
    const data: any[] = [];
    const now = new Date();
    const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      
      const monthAvances = (avances || []).filter(a => {
        const d = new Date(a.fecha);
        return d.getMonth() === m && d.getFullYear() === y && a.obraId === selectedObraId;
      });

      const beneficio = monthAvances.reduce((sum, a) => sum + calculateAvanceEconomics(a).beneficio, 0);
      
      data.push({
        name: monthNames[m],
        beneficio: Math.round(beneficio),
      });
    }
    return data;
  }, [avances, calculateAvanceEconomics, selectedObraId]);

  const todayAvance = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (avances || []).find(a => a.fecha === todayStr && a.obraId === selectedObraId);
  }, [avances, selectedObraId]);

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

      {/* Recordatorio Hoy */}
      {!todayAvance ? (
        <button 
          onClick={() => onNavigate("registrar")}
          className="w-full bg-blue-600 p-6 rounded-[2.5rem] text-white flex flex-col items-center gap-2 shadow-xl shadow-blue-200 dark:shadow-none animate-in zoom-in duration-300"
        >
          <div className="bg-white/20 p-3 rounded-2xl">
            <Activity className="animate-pulse" size={32} />
          </div>
          <div className="text-center">
             <p className="text-lg font-black uppercase tracking-tight">Reporte de Hoy Pendiente</p>
             <p className="text-[10px] font-bold uppercase opacity-80">Registra la producción de hoy ahora</p>
          </div>
        </button>
      ) : (
        <div className="bg-emerald-500/10 dark:bg-emerald-500/5 p-4 rounded-[2rem] border border-emerald-500/20 text-center">
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">✓ Reporte de Hoy Completado</p>
        </div>
      )}

      {/* Gráfica de Tendencia */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-2">Tendencia Mensual (Beneficio)</label>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }} 
              />
              <Area type="monotone" dataKey="beneficio" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

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
          <Activity size={14} className="text-emerald-500 animate-pulse" />
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl space-y-3">
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase">1. Producción Bruta (En Curso)</span>
               <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatAmount(totalAcumulado.ingresosCurso)}€</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase">2. Certificaciones por Cobrar</span>
               <span className="text-sm font-black text-slate-700 dark:text-slate-300">{formatAmount(totalAcumulado.certPendiente)}€</span>
             </div>
          </div>

             <div className="flex justify-between items-end px-4 gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-black text-cyan-400/60 uppercase block tracking-widest mb-1 leading-tight">Total Bruto<br/>Pendiente</span>
                  <span className="text-2xl font-black text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] leading-none">
                    {formatAmount(totalAcumulado.ingresosCurso + totalAcumulado.certPendiente)}<span className="text-sm ml-0.5 opacity-70">€</span>
                  </span>
                </div>
                <div className="flex-1 text-right">
                  <span className="text-[10px] font-black text-emerald-400/60 uppercase block tracking-widest mb-1 leading-tight">Ganancia Neta<br/>Estimada</span>
                  <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] leading-none">
                    {formatAmount(totalAcumulado.totalPendiente)}<span className="text-sm ml-0.5 opacity-70">€</span>
                  </span>
                </div>
             </div>
        </div>

        <div className="pt-2 px-2 text-center border-t border-slate-50 dark:border-slate-800/50">
          <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-relaxed">
            * El beneficio neto deduce jornales y gastos operativos para mostrar tu ganancia real acumulada.
          </p>
        </div>
      </section>

      <div className="space-y-4">
        <ActionButton 
          onClick={() => onNavigate("registrar")} 
          icon={<PlusCircle className="text-emerald-500" size={28} />} 
          title="REGISTRAR PRODUCCIÓN" 
          description="Añadir las partidas ejecutadas hoy" 
          className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30"
        />
        <div className="grid grid-cols-2 gap-4">
          <ActionButton 
            onClick={() => onNavigate("produccion_bloques")} 
            icon={<BarChart3 className="text-blue-500" size={24} />} 
            title="PRODUCCIÓN POR BLOQUES" 
            compact
            className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
          />
          <ActionButton 
            onClick={() => onNavigate("historial")} 
            icon={<FileText className="text-amber-500" size={24} />} 
            title="HISTORIAL DE AVANCES" 
            compact
            className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
          />
        </div>
      </div>
    </div>
  );
};
