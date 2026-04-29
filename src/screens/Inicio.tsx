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

  const statsCurrent = useMemo(() => {
    const listAv = (avances || []).filter(a => a.obraId === selectedObraId && !isDataCertified(a.fecha));
    const listGa = (gastos || []).filter(g => g.obraId === selectedObraId && !isDataCertified(g.fecha));
    const listAn = (anticipos || []).filter(an => an.obraId === selectedObraId && !isDataCertified(an.fecha));
    
    const adjustmentTotal = Object.entries(manualAdjustments).reduce((sum, [_, m2]) => {
      const itemId = _ as string;
      const price = (itemsSate[itemId] as any)?.precio || 0;
      return sum + ((m2 as number) * price);
    }, 0);

    const bruto = listAv.reduce((sum, a) => sum + calculateAvanceEconomics(a).ingresos, 0) + adjustmentTotal;
    const laborCost = listAv.reduce((sum, a) => sum + calculateAvanceEconomics(a).costeManoObra, 0);
    const profit = bruto - laborCost;
    
    return { listAv, listGa, listAn, bruto, laborCost, profit };
  }, [avances, selectedObraId, isDataCertified, gastos, anticipos, calculateAvanceEconomics, manualAdjustments, itemsSate]);

  const operarioSettlement = useMemo(() => {
    const totalManDays = statsCurrent.listAv.reduce((sum, a) => {
      const isSinActividad = a.produccion.length === 0 && a.motivoSinProduccion;
      return sum + (isSinActividad ? 0 : (a.operariosPresentes?.length || 0));
    }, 0);
    const pool = statsCurrent.profit;
    const sharePerJornada = totalManDays > 0 ? pool / totalManDays : 0;

    return operariosList.map(op => {
      const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const opClean = normalize(op.nombre);
      const opAvances = statsCurrent.listAv.filter(a => {
        const isSinActividad = a.produccion.length === 0 && a.motivoSinProduccion;
        return !isSinActividad && (a.operariosPresentes || []).some(o => normalize(o) === opClean);
      });
      const jornadas = opAvances.length;
      const totalJornales = jornadas * op.coste;
      const sharedProfit = sharePerJornada * jornadas;
      
      const opAnticipos = statsCurrent.listAn.filter(an => normalize(an.operario) === opClean).reduce((sum, an) => sum + an.cantidad, 0);
      const opReembolsos = statsCurrent.listGa.filter(g => g.pagadoPor && normalize(g.pagadoPor) === opClean).reduce((sum, g) => sum + g.monto, 0);
      const bruto = totalJornales + sharedProfit + opReembolsos;

      return {
        ...op,
        jornadas,
        totalJornales,
        sharedProfit,
        opAnticipos,
        opReembolsos,
        bruto,
        cobrar: bruto - opAnticipos,
        mediaDiaria: jornadas > 0 ? (totalJornales + sharedProfit) / jornadas : 0
      };
    }).filter(o => o.jornadas > 0 || o.opAnticipos > 0 || o.opReembolsos > 0);
  }, [operariosList, statsCurrent]);

  const shareIndividualSettlement = (o: any) => {
    const text = `*CUENTAS - ${o.nombre}*\n` +
      `*Obra:* ${selectedObra?.nombre || 'Obra'}\n` +
      `*Estado:* PRODUCCIÓN EN CURSO\n\n` +
      `- Jornales (${o.jornadas}j): ${formatAmount(o.totalJornales)}€\n` +
      `- Reparto Beneficio: +${formatAmount(o.sharedProfit)}€\n` +
      (o.opReembolsos > 0 ? `- Devolución Gastos: +${formatAmount(o.opReembolsos)}€\n` : '') +
      `*TOTAL BRUTO: ${formatAmount(o.bruto)}€*\n` +
      (o.mediaDiaria > 0 ? `*Media Diaria (J+R): ${formatAmount(o.mediaDiaria)}€/día*\n` : '') +
      (o.opAnticipos > 0 ? `- Anticipos: -${formatAmount(o.opAnticipos)}€\n` : '') +
      `*TOTAL NETO A COBRAR: ${formatAmount(o.cobrar)}€*`;
    
    shareService.shareViaWhatsApp(text);
  };

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

             <div className="flex justify-between items-center px-4">
               <div>
                 <span className="text-[10px] font-black text-slate-300 uppercase block tracking-widest mb-1 leading-tight">Total Bruto<br/>Pendiente</span>
                 <span className="text-xl font-black text-slate-400 leading-none">{formatAmount(totalAcumulado.ingresosCurso + totalAcumulado.certPendiente)}€</span>
               </div>
               <div className="text-right">
                 <span className="text-[10px] font-black text-emerald-400 uppercase block tracking-widest mb-1 leading-tight">Ganancia Neta<br/>Estimada</span>
                 <span className="text-3xl font-black text-emerald-500 shadow-emerald-500/20 drop-shadow-sm leading-none">{formatAmount(totalAcumulado.totalPendiente)}€</span>
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
