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
    itemsSate
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
    const bruto = listAv.reduce((sum, a) => sum + calculateAvanceEconomics(a).ingresos, 0);
    const laborCost = listAv.reduce((sum, a) => sum + calculateAvanceEconomics(a).costeManoObra, 0);
    const profit = bruto - laborCost;
    
    return { listAv, listGa, listAn, bruto, laborCost, profit };
  }, [avances, selectedObraId, isDataCertified, gastos, anticipos, calculateAvanceEconomics]);

  const operarioSettlement = useMemo(() => {
    const totalManDays = statsCurrent.listAv.reduce((sum, a) => sum + (a.operariosPresentes?.length || 0), 0);
    const pool = statsCurrent.profit;
    const sharePerJornada = totalManDays > 0 ? pool / totalManDays : 0;

    return operariosList.map(op => {
      const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const opClean = normalize(op.nombre);
      const opAvances = statsCurrent.listAv.filter(a => (a.operariosPresentes || []).some(o => normalize(o) === opClean));
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

        {/* Liquidación por Operario Desplegable */}
        <section className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800/50 transition-all">
          <button 
            onClick={() => setExpandedLiquidacion(!expandedLiquidacion)}
            className="w-full flex justify-between items-center p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Cuentas por Operario (En Curso)</span>
            </div>
            {expandedLiquidacion ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          
          {expandedLiquidacion && (
            <div className="p-4 pt-0 space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              {operarioSettlement.length === 0 ? (
                <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase italic">Sin actividad registrada en curso</p>
              ) : (
                operarioSettlement.map(o => (
                  <div key={o.nombre} className="pt-4 first:pt-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{o.nombre} ({o.jornadas}j)</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Bruto: {formatAmount(o.bruto)}€ • Neto: {formatAmount(o.cobrar)}€ 
                          {o.jornadas > 0 && <span className="text-blue-500 ml-1">• {formatAmount(o.mediaDiaria)}€/día</span>}
                        </p>
                      </div>
                      <button 
                        onClick={() => shareIndividualSettlement(o)}
                        className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl active:scale-90 transition-transform"
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-bold text-slate-500 uppercase">
                      <div className="flex justify-between italic"><span>Jornales:</span> <span>{formatAmount(o.totalJornales)}€</span></div>
                      <div className="flex justify-between italic text-emerald-500"><span>Reparto:</span> <span>+{formatAmount(o.sharedProfit)}€</span></div>
                      {o.opReembolsos > 0 && <div className="flex justify-between italic text-blue-500"><span>Gastos:</span> <span>+{formatAmount(o.opReembolsos)}€</span></div>}
                      {o.opAnticipos > 0 && <div className="flex justify-between italic text-red-500"><span>Anticipos:</span> <span>-{formatAmount(o.opAnticipos)}€</span></div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <div className="pt-2 px-2 text-center border-t border-slate-50 dark:border-slate-800/50">
          <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-relaxed">
            * El beneficio neto deduce jornales y gastos operativos para mostrar tu ganancia real acumulada.
          </p>
        </div>
        <button 
          onClick={() => onNavigate("gastos")}
          className="w-full bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all group border border-red-100/50 dark:border-red-900/20"
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-200 dark:shadow-none"><Receipt size={18} /></div>
            <span className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-tight">Gestionar Gastos</span>
          </div>
          <ChevronRight size={18} className="text-red-300" />
        </button>
      </section>

      <div className="grid grid-cols-1 gap-4">
        <ActionButton 
          onClick={() => onNavigate("registrar")} 
          icon={<PlusCircle className="text-emerald-500" size={28} />} 
          title="REGISTRAR AVANCE" 
          description="Producción hoy" 
          className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30"
        />
        <div className="grid grid-cols-3 gap-4">
          <ActionButton 
            onClick={() => onNavigate("calendario")} 
            icon={<Calendar className="text-purple-500" size={24} />} 
            title="AGENDA" 
            compact 
            className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30"
          />
          <ActionButton 
            onClick={() => onNavigate("produccion_bloques")} 
            icon={<BarChart3 className="text-blue-500" size={24} />} 
            title="PROD." 
            compact 
            className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
          />
          <ActionButton 
            onClick={() => onNavigate("certificacion")} 
            icon={<FileText className="text-indigo-500" size={24} />} 
            title="CIERRE" 
            compact 
            className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/30"
          />
        </div>
      </div>
    </div>
  );
};
