import React, { useMemo, useCallback } from "react";
import { ChevronLeft, BarChart3, LayoutGrid, Calendar, ArrowRight, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatAmount, formatDate } from "../lib/utils";
import { BLOQUE_DIMENSIONS, RENDIMIENTOS_EQUIPO } from "../constants";
import { AlertTriangle, Info } from "lucide-react";

export const ProduccionBloquesScreen: React.FC<{ onBack: () => void, onNavigate: (screen: any) => void }> = ({ onBack, onNavigate }) => {
  const { avances, selectedObraId, itemsSate, certificaciones } = useApp();

  const isDataCertified = useCallback((avance: any) => {
    return (certificaciones || []).some(c => {
      if (c.obraId !== selectedObraId) return false;
      
      // Prioridad 1: Por ID (Sistema nuevo)
      if (c.avanceIds && c.avanceIds.length > 0) {
        return c.avanceIds.includes(avance.id);
      }

      // Prioridad 2: Por rango (Legacy)
      if (c.fechaInicio && c.fechaFin) {
        return avance.fecha >= c.fechaInicio && avance.fecha <= c.fechaFin;
      }

      return false;
    });
  }, [certificaciones, selectedObraId]);

  // Agrupar producción por bloque e item, capturando también las fechas y días consumidos
  const productionByBlock = useMemo(() => {
    const map: Record<string, { items: Record<string, { m2: number, days: number }>, dates: Set<string> }> = {};

    const obraAvances = (avances || [])
      .filter(a => a.id && a.obraId === selectedObraId);

    obraAvances.forEach(avance => {
      // Necesitamos evitar contar doble el mismo día para la misma partida si hay varias entradas de producción (un poco raro pero posible)
      const itemsInThisAvance = new Set<string>();

      (avance.produccion || []).forEach(prod => {
        let rawBloque = (prod.bloque || avance.bloque || "").toString().trim();
        
        let normalizedBloque = rawBloque;
        const upper = normalizedBloque.toUpperCase();
        
        if (!normalizedBloque || upper === "BLOQUE") {
          normalizedBloque = "Sin asignar";
        } else if (upper.startsWith("BLOQUE ")) {
          normalizedBloque = normalizedBloque.substring(7).toString().trim();
        }

        if (!map[normalizedBloque]) {
          map[normalizedBloque] = { items: {}, dates: new Set() };
        }

        const itemId = prod.itemId;
        if (!map[normalizedBloque].items[itemId]) {
          map[normalizedBloque].items[itemId] = { m2: 0, days: 0 };
        }
        
        map[normalizedBloque].items[itemId].m2 += prod.m2;
        
        if (!itemsInThisAvance.has(itemId)) {
          map[normalizedBloque].items[itemId].days += 1;
          itemsInThisAvance.add(itemId);
        }

        map[normalizedBloque].dates.add(avance.fecha);
      });
    });

    // Convertir a array ordenado por nombre de bloque (con "Sin asignar" al final)
    return Object.entries(map)
      .sort((a, b) => {
        if (a[0] === "Sin asignar") return 1;
        if (b[0] === "Sin asignar") return -1;
        return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
      })
      .map(([bloque, data]) => ({
        bloque,
        dates: Array.from(data.dates).sort((a, b) => b.localeCompare(a)),
        items: Object.entries(data.items).map(([itemId, stats]) => ({
          itemId,
          nombre: (itemsSate[itemId] as any)?.nombre || itemId,
          m2: stats.m2,
          daysSpent: stats.days
        }))
      }));
  }, [avances, selectedObraId, itemsSate, isDataCertified]);

  // Totales generales para cada partida en toda la obra
  const globalTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    productionByBlock.forEach(b => {
      b.items.forEach(it => {
        totals[it.itemId] = (totals[it.itemId] || 0) + it.m2;
      });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [productionByBlock]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Producción</h2>
        <div className="w-12 h-12 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
          <LayoutGrid size={24} />
        </div>
      </header>

      {/* Resumen Global */}
      <section className="bg-slate-900 dark:bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-xl">
            <BarChart3 size={18} />
          </div>
          <label className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Acumulado Obra</label>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {globalTotals.length === 0 ? (
            <p className="text-xs opacity-60">No hay producción registrada todavía.</p>
          ) : (
            globalTotals.map(([id, m2]) => (
              <div key={id} className="flex justify-between items-center bg-white/10 p-3 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-tight truncate mr-2">
                  {(itemsSate[id] as any)?.nombre || id}
                </span>
                <span className="text-lg font-black">{formatAmount(m2)} <span className="text-[10px] opacity-60">m²</span></span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Listado por Bloques */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desglose por Bloques</label>
          <button 
            onClick={() => onNavigate("calendario")}
            className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full active:scale-95 transition-all"
          >
            <Calendar size={12} /> Ir a Agenda <ArrowRight size={12} />
          </button>
        </div>
        
        <div className="space-y-6">
          {productionByBlock.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-slate-400 font-bold uppercase text-xs italic">Registra un avance para ver los datos</p>
            </div>
          ) : (
            productionByBlock.map(bloqueData => (
              <div key={bloqueData.bloque} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden border-l-4 ${bloqueData.bloque === "Sin asignar" ? "border-l-red-500" : "border-l-blue-500"}`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                        {bloqueData.bloque === "Sin asignar" ? (
                          <span className="text-red-500 italic">Sin asignar</span>
                        ) : (
                          <>Bloque <span className="text-blue-600">{bloqueData.bloque}</span></>
                        )}
                      </h3>
                      {/* Fechas asociadas */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bloqueData.dates.map(d => {
                          const certified = (certificaciones || []).some(c => 
                            c.obraId === selectedObraId && 
                            c.fechaInicio && c.fechaFin && 
                            d >= c.fechaInicio && d <= c.fechaFin
                          );
                          return (
                            <span 
                              key={d} 
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase border ${
                                certified 
                                  ? "text-slate-300 border-slate-50 dark:border-slate-800/30" 
                                  : "text-slate-400 border-slate-100 dark:border-slate-800"
                              }`}
                            >
                              {formatDate(d)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{bloqueData.items.length} Partidas</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {bloqueData.items.map(item => {
                      const normalizedNum = (bloqueData.bloque || "").toString().toUpperCase().replace("BLOQUE", "").trim();
                      const dimensions = BLOQUE_DIMENSIONS[normalizedNum] || BLOQUE_DIMENSIONS["DEFAULT"];
                      const target = dimensions[item.itemId];
                      const percentage = target ? Math.min((item.m2 / target) * 100, 100) : null;
                      
                      const estimatedDays = RENDIMIENTOS_EQUIPO[item.itemId];
                      const isCompleted = percentage !== null && percentage > 99;
                      const isOverBudget = estimatedDays && item.daysSpent > estimatedDays;
                      const diff = estimatedDays ? item.daysSpent - estimatedDays : 0;

                      return (
                        <div key={item.itemId} className="space-y-1.5">
                          <div className={`p-3 rounded-2xl border transition-colors ${isOverBudget ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30' : (isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100/50 dark:border-slate-800/50')}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-tight flex items-center gap-1 ${isOverBudget ? 'text-rose-600' : (isCompleted ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400')}`}>
                                {item.nombre}
                                {isOverBudget && <AlertTriangle size={10} className="animate-pulse" />}
                                {isCompleted && !isOverBudget && <Check size={10} />}
                              </span>
                              <span className="text-sm font-black text-slate-800 dark:text-white">
                                {formatAmount(item.m2)} {target && <span className="text-[9px] text-slate-400">/ {target}</span>} <span className="text-[9px] opacity-60">m²</span>
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">
                                <span className={isOverBudget ? 'text-rose-600' : (isCompleted ? 'text-emerald-600' : '')}>
                                  {item.daysSpent} jornadas
                                </span>
                                {estimatedDays && <span className="opacity-50"> de {estimatedDays} prev.</span>}
                              </span>
                              
                              {estimatedDays && (
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${isOverBudget ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/40' : (isCompleted ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' : 'text-slate-400 bg-slate-100 dark:bg-slate-800')}`}>
                                  {isOverBudget ? `Pérdida: ${diff}d` : (isCompleted ? 'Optimizado (OK)' : 'En curso')}
                                </span>
                              )}
                            </div>
                          </div>
                          {percentage !== null && (
                            <div className="px-2">
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <p className="text-[8px] font-black text-right mt-1 uppercase text-slate-400">
                                {Math.round(percentage)}% Completado
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
