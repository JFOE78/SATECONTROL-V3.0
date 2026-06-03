import React, { useMemo, useCallback, useState } from "react";
import { PlusCircle, Calendar, FileText, ChevronRight, Settings, Activity, ChevronRight as ChevronRightIcon, BarChart3, Users, Check } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from "../context/AppContext";
import { ActionButton } from "../components/ActionButton";
import { Avance } from "../types";
import { formatAmount } from "../lib/utils";
import { shareService } from "../services/shareService";
import { BLOQUE_DIMENSIONS } from "../constants";

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

  const CUTOFF_DATE = "2026-05-06";

  const activeBlock = useMemo(() => {
    return localStorage.getItem("sate_active_block") || "11";
  }, [avances]);

  const activeBlockProgress = useMemo(() => {
    const blockNorm = activeBlock.trim().toUpperCase().replace("BLOQUE", "").trim();
    
    // Sum production for the active block
    const advancesM2 = (avances || [])
      .filter(a => a.obraId === selectedObraId)
      .reduce((sum, a) => {
        const match = (a.bloque || "").trim().toUpperCase().replace("BLOQUE", "").trim() === blockNorm;
        if (!match) return sum;
        return sum + (a.produccion || [])
          .filter(p => p.itemId === "fase1")
          .reduce((s, p) => s + p.m2, 0);
      }, 0);

    const certifiedM2 = (certificaciones || []).reduce((sum, c) => {
      if (c.obraId !== selectedObraId) return sum;
      return sum + (c.partidas || [])
        .filter(it => {
          const bRaw = (it.bloque || "").trim().toUpperCase().replace("BLOQUE", "").trim();
          return bRaw === blockNorm && it.itemId === "fase1";
        })
        .reduce((s, it) => s + it.m2, 0);
    }, 0);

    const totalM2 = advancesM2 + certifiedM2;
    const dims = BLOQUE_DIMENSIONS[blockNorm] || BLOQUE_DIMENSIONS["DEFAULT"];
    const targetM2 = dims["fase1"] || 634.77;

    return {
      totalM2,
      targetM2,
      percentage: Math.min((totalM2 / targetM2) * 100, 100)
    };
  }, [avances, selectedObraId, certificaciones, activeBlock]);

  const totalAcumulado = useMemo(() => {
    // 1. Producción NO certificada (en curso) desde el corte
    const advancesEcon = (avances || [])
      .filter(a => a.obraId === selectedObraId && a.fecha >= CUTOFF_DATE && !isDataCertified(a.fecha))
      .reduce((acc, curr) => {
        const econ = calculateAvanceEconomics(curr);
        return {
          costeMO: acc.costeMO + (econ.costeManoObra || 0),
          beneficio: acc.beneficio + (econ.beneficio || 0)
        };
      }, { costeMO: 0, beneficio: 0 });
      
    const totalG = (gastos || [])
      .filter(g => g.obraId === selectedObraId && g.fecha >= CUTOFF_DATE && !isDataCertified(g.fecha))
      .reduce((sum, g) => sum + g.monto, 0);

    // 2. Certificaciones pendientes de cobro (desde el corte o históricas pendientes)
    // Nota: Las certificaciones anteriores al corte ya se asumen liquidadas o descartadas si el usuario quiere "limpieza"
    const montoCertsPendientes = (certificaciones || [])
      .filter(c => c.obraId === selectedObraId && (c.fechaFin || '') >= CUTOFF_DATE && c.estado !== 'cobrado')
      .reduce((sum, c) => sum + c.certificado, 0);

    const produccionEnCurso = advancesEcon.beneficio - totalG;

    const totalCobrado = (certificaciones || [])
      .filter(c => c.obraId === selectedObraId && c.estado === 'cobrado')
      .reduce((sum, c) => sum + c.ejecutado, 0);

    return {
      ingresosCurso: advancesEcon.beneficio + advancesEcon.costeMO,
      certPendiente: montoCertsPendientes,
      totalPendiente: produccionEnCurso + montoCertsPendientes,
      totalCobrado
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

      const monthGastos = (gastos || []).filter(g => {
        const d = new Date(g.fecha);
        return d.getMonth() === m && d.getFullYear() === y && g.obraId === selectedObraId;
      });

      const totalIngresosMO = monthAvances.reduce((sum, a) => sum + calculateAvanceEconomics(a).beneficio, 0);
      const totalGastosMes = monthGastos.reduce((sum, g) => sum + g.monto, 0);
      
      data.push({
        name: monthNames[m],
        beneficio: Math.round(totalIngresosMO - totalGastosMes),
      });
    }
    return data;
  }, [avances, calculateAvanceEconomics, selectedObraId]);

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

      {/* PROGRESO EN TIEMPO REAL - BLOQUE ACTIVO */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-2">
          <div>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Avance del Bloque Activo (11 m²/operario)</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Bloque {activeBlock}</h3>
          </div>
          <button 
            onClick={() => onNavigate("asistencia")}
            className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100/50 dark:border-blue-800/10 active:scale-95 transition-all font-sans"
          >
            Configurar Tajo
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl space-y-3 border border-transparent">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1 shadow-none">PARTIDA: Corcho + Tacos</p>
              <h4 className="text-lg font-black text-slate-700 dark:text-slate-200">
                {activeBlockProgress.totalM2.toLocaleString()} m² <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md ml-1">ejecutados</span>
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">{Math.round(activeBlockProgress.percentage)}%</span>
              <p className="text-[9px] font-bold text-slate-400 uppercase">de {activeBlockProgress.targetM2} m²</p>
            </div>
          </div>

          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 rounded-full transition-all duration-700 ease-out shadow-lg" 
              style={{ width: `${activeBlockProgress.percentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider px-1 leading-none">
            <span>Inicio SATE</span>
            <span>Completado {Math.round(activeBlockProgress.percentage)}%</span>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <ActionButton 
          onClick={() => onNavigate("asistencia")} 
          icon={<Users className="text-blue-500" size={28} />} 
          title="PASO DE LISTA DIARIO" 
          description="Asistencia rápida y avance automático sin teclear" 
          className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 shadow-sm border-l-4 border-l-blue-500"
        />
        <div className="grid grid-cols-2 gap-4">
          <ActionButton 
            onClick={() => onNavigate("registrar")} 
            icon={<PlusCircle className="text-emerald-500" size={24} />} 
            title="PRODUCCIÓN MANUAL" 
            compact
            className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30"
          />
          <ActionButton 
            onClick={() => onNavigate("historial")} 
            icon={<FileText className="text-amber-500" size={24} />} 
            title="CERTIFICACIONES Y COBROS" 
            compact
            className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
          />
        </div>
      </div>
    </div>
  );
};
