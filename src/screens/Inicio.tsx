import React, { useMemo, useCallback, useState } from "react";
import { PlusCircle, Calendar, FileText, ChevronRight, Settings, Receipt, Activity, ChevronDown, ChevronUp, MessageCircle, BarChart3, Zap, AlertTriangle } from "lucide-react";
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

    const activeMonitoring = useMemo(() => {
      if (!selectedObraId || !avances) return [];
      
      const CUTOFF_DATE = "2026-05-06";
      const items = ["fase1", "fase2", "anti", "malla", "cajeado"];
      
      const normalize = (name: string) => {
        return name.toUpperCase()
          .replace("BLOQUE", "")
          .replace("BLOK", "")
          .replace("BL", "")
          .replace("B-", "")
          .replace("B", "")
          .trim();
      };

      // Mapa para agrupar por bloque: Record<bloqueNorm, { displayName, items: [] }>
      const blocksMap: Record<string, { displayName: string, items: any[] }> = {};

      items.forEach(itemId => {
        const productionMap: Record<string, { m2: number, days: number, displayName: string }> = {};
        const obraAvances = (avances || []).filter(a => a.obraId === selectedObraId && a.fecha >= CUTOFF_DATE);
        
        obraAvances.forEach(a => {
          const itemsInThisAvance = new Set<string>();
          (a.produccion || []).forEach(p => {
            if (p.itemId !== itemId) return;
            const bRaw = (p.bloque || a.bloque || "S/B").toString().trim();
            const bRef = normalize(bRaw);
            
            if (!productionMap[bRef]) {
              productionMap[bRef] = { m2: 0, days: 0, displayName: bRaw };
            }
            productionMap[bRef].m2 += p.m2;
            
            if (!itemsInThisAvance.has(bRef)) {
              productionMap[bRef].days += 1;
              itemsInThisAvance.add(bRef);
            }
          });
        });

        // Sumar producción histórica certificada
        (certificaciones || []).forEach(c => {
          if (c.obraId !== selectedObraId) return;
          (c.items || []).forEach(it => {
            if (it.itemId !== itemId) return;
            const bRaw = (it.bloque || "S/B").toString().trim();
            const bRef = normalize(bRaw);
            if (!productionMap[bRef]) {
              productionMap[bRef] = { m2: 0, days: 0, displayName: bRaw };
            }
            productionMap[bRef].m2 += it.m2;
          });
        });

        Object.entries(productionMap).forEach(([normId, stats]) => {
          const dimensions = BLOQUE_DIMENSIONS[normId] || BLOQUE_DIMENSIONS["DEFAULT"];
          const targetM2 = dimensions[itemId] || 1;
          
          // Solo incluimos en "Rendimiento en Vivo" si está en curso (<99%) 
          // O si es un bloque que queremos que el usuario vea como "Recién Certificado"
          const isFinished = stats.m2 >= (targetM2 * 0.99);
          
          if (stats.m2 > 0) {
            const percentage = (stats.m2 / targetM2) * 100;

            if (!blocksMap[normId]) {
              blocksMap[normId] = { displayName: stats.displayName, items: [] };
            }

            blocksMap[normId].items.push({
              itemId,
              nombre: (itemsSate[itemId] as any)?.nombre || itemId,
              percentage,
              isFinished
            });
          }
        });
      });

      // Convertir el mapa en un array ordenado por bloque
      // Priorizar bloques "En curso" sobre "Terminados" en el orden
      return Object.entries(blocksMap)
        .sort((a, b) => {
          const aFinished = a[1].items.every(it => it.isFinished);
          const bFinished = b[1].items.every(it => it.isFinished);
          if (aFinished !== bFinished) return aFinished ? 1 : -1;
          return a[0].localeCompare(b[0], undefined, { numeric: true });
        })
        .map(([_, data]) => data);
    }, [avances, selectedObraId, itemsSate]);

  return (
    <div className="space-y-4">
      {/* MONITOREO DE EFICIENCIA */}
      {activeMonitoring.length > 0 && (
        <section className="space-y-2 p-1">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3 flex items-center gap-2">
            <Zap size={14} className="text-amber-500" /> Rendimiento en Vivo
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {activeMonitoring.map((block) => (
              <div 
                key={block.displayName} 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6"
              >
                <div className="border-b border-slate-50 dark:border-slate-800 pb-3">
                  <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Bloque {block.displayName}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{block.items.length} partidas en ejecución</p>
                </div>

                <div className="space-y-8">
                  {block.items.map((item) => (
                    <div key={item.itemId} className={`space-y-3 p-4 rounded-[2rem] border transition-all ${item.isFinished ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-transparent shadow-sm'}`}>
                      <div className="flex justify-between items-start">
                        <div className="max-w-[70%] text-left">
                          <h5 className={`text-xs font-black uppercase leading-tight ${item.isFinished ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {item.nombre}
                            {item.isFinished && <span className="ml-2 text-[8px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 px-1.5 py-0.5 rounded-lg">Cerrado</span>}
                          </h5>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-black leading-none ${item.isFinished ? 'text-emerald-500' : (item.isOver ? 'text-rose-600' : 'text-blue-600')}`}>
                            {Math.round(item.percentage)}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Progreso Ejecutado</span>
                          <span className={`text-[10px] font-black ${item.isFinished ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                            {Math.round(item.percentage)}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full transition-all duration-700 ${item.isFinished ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
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
        <div className="h-40 w-full" style={{ minHeight: '160px', minWidth: '0px' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
             <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700/50 pt-2 mt-2">
               <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">3. Cobrado (Histórico)</span>
               <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatAmount(totalAcumulado.totalCobrado)}€</span>
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
            title="CERTIFICACIONES Y COBROS" 
            compact
            className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
          />
        </div>
      </div>
    </div>
  );
};
