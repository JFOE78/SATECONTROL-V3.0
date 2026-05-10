import React, { useMemo, useCallback } from "react";
import { ChevronLeft, BarChart3, LayoutGrid, Calendar, ArrowRight, Check, Zap } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatAmount, formatDate } from "../lib/utils";
import { BLOQUE_DIMENSIONS } from "../constants";
import { AlertTriangle, Info } from "lucide-react";

export const ProduccionBloquesScreen: React.FC<{ onBack: () => void, onNavigate: (screen: any) => void }> = ({ onBack, onNavigate }) => {
  const { avances, selectedObraId, itemsSate, certificaciones } = useApp();

  const CUTOFF_DATE = "2026-05-06";

  const normalize = useCallback((name: string) => {
    const n = name.toUpperCase()
      .replace("BLOQUE", "")
      .replace("BLOK", "")
      .replace("BL", "")
      .replace("B-", "")
      .replace("B", "")
      .trim();
    return n || "Sin asignar";
  }, []);

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
    const map: Record<string, { items: Record<string, { m2: number, days: number }>, dates: Set<string>, displayName: string }> = {};

    const obraAvances = (avances || [])
      .filter(a => a.id && a.obraId === selectedObraId && a.fecha >= CUTOFF_DATE && !isDataCertified(a));

    obraAvances.forEach(avance => {
      const itemsInThisAvance = new Set<string>();

      (avance.produccion || []).forEach(prod => {
        const rawBloque = (prod.bloque || avance.bloque || "Sin asignar").toString().trim();
        const normalizedBloque = normalize(rawBloque);

        if (!map[normalizedBloque]) {
          map[normalizedBloque] = { items: {}, dates: new Set(), displayName: rawBloque };
        }

        const itemId = prod.itemId;
        if (!map[normalizedBloque].items[itemId]) {
          map[normalizedBloque].items[itemId] = { m2: 0, days: 0 };
        }
        
        map[normalizedBloque].items[itemId].m2 += prod.m2;
        
        if (!itemsInThisAvance.has(`${normalizedBloque}-${itemId}`)) {
          map[normalizedBloque].items[itemId].days += 1;
          itemsInThisAvance.add(`${normalizedBloque}-${itemId}`);
        }

        map[normalizedBloque].dates.add(avance.fecha);
      });
    });

    // Añadir producción certificada (Histórico)
    (certificaciones || []).forEach(c => {
      if (c.obraId !== selectedObraId) return;
      (c.partidas || []).forEach(it => {
        const rawBloque = (it.bloque || "Sin asignar").toString().trim();
        const normalizedBloque = normalize(rawBloque);
        
        if (!map[normalizedBloque]) {
          map[normalizedBloque] = { items: {}, dates: new Set(), displayName: rawBloque };
        }

        if (!map[normalizedBloque].items[it.itemId]) {
          map[normalizedBloque].items[it.itemId] = { m2: 0, days: 0 };
        }
        map[normalizedBloque].items[it.itemId].m2 += it.m2;
        
        // Añadimos una marca especial en dates para saber que tiene contenido certificado
        map[normalizedBloque].dates.add("CERTIFIED");
      });
    });

    // Convertir a array ordenado
    return Object.entries(map)
      .sort((a, b) => {
        if (a[0] === "Sin asignar") return 1;
        if (b[0] === "Sin asignar") return -1;
        return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
      })
      .map(([normKey, data]) => ({
        bloque: data.displayName,
        normKey,
        dates: Array.from(data.dates).sort((a, b) => b.localeCompare(a)),
        items: Object.entries(data.items).map(([itemId, stats]) => ({
          itemId,
          nombre: (itemsSate[itemId] as any)?.nombre || itemId,
          m2: stats.m2,
          daysSpent: stats.days
        }))
      }));
  }, [avances, selectedObraId, itemsSate, isDataCertified]);

  const activeMonitoring = useMemo(() => {
    if (!selectedObraId || !avances) return [];
    
    const items = ["fase1", "fase2", "anti", "malla", "cajeado"];
    
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
        (c.partidas || []).forEach(it => {
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
            isFinished,
            amount: stats.m2 * ((itemsSate[itemId] as any)?.precio || 0)
          });
        }
      });
    });

    return Object.entries(blocksMap)
      .sort((a, b) => {
        const aFinished = a[1].items.every(it => it.isFinished);
        const bFinished = b[1].items.every(it => it.isFinished);
        if (aFinished !== bFinished) return aFinished ? 1 : -1;
        return a[0].localeCompare(b[0], undefined, { numeric: true });
      })
      .map(([_, data]) => data);
  }, [avances, selectedObraId, itemsSate, normalize, certificaciones]);

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

      {/* MONITOREO DE EFICIENCIA / RENDIMIENTO EN VIVO */}
      {activeMonitoring.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-3 flex items-center gap-2">
            <Zap size={14} className="text-amber-500" /> Rendimiento en Vivo
          </h3>
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x no-scrollbar -mx-4 px-4">
            {activeMonitoring.map((block) => (
              <div 
                key={block.displayName} 
                className="min-w-[280px] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6 snap-center"
              >
                <div className="border-b border-slate-50 dark:border-slate-800 pb-3">
                  <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Bloque {block.displayName}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{block.items.filter(it => !it.isFinished).length} en ejecución • {block.items.filter(it => it.isFinished).length} cerradas</p>
                </div>

                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                  {block.items.map((item) => (
                    <div key={item.itemId} className={`space-y-2 p-3 rounded-[1.5rem] border transition-all ${item.isFinished ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-transparent shadow-sm'}`}>
                      <div className="flex justify-between items-start">
                        <h5 className={`text-[10px] font-black uppercase leading-tight max-w-[70%] ${item.isFinished ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {item.nombre}
                          {item.isFinished && <span className="ml-2 text-[7px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 px-1 py-0.5 rounded-lg whitespace-nowrap">✓ OK</span>}
                        </h5>
                        <p className={`text-sm font-black leading-none ${item.isFinished ? 'text-emerald-500' : 'text-blue-600'}`}>
                          {Math.round(item.percentage)}%
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
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
                          if (d === "CERTIFIED") {
                            return (
                              <span key={d} className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">
                                Certificado Histórico
                              </span>
                            );
                          }
                          const certified = (certificaciones || []).some(c => 
                            c.obraId === selectedObraId && 
                            c.fechaInicio && c.fechaFin && 
                            d >= c.fechaInicio && d <= c.fechaFin
                          );
                          return (
                            <span 
                              key={d} 
                              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase border ${
                                d >= CUTOFF_DATE 
                                  ? (certified ? "text-slate-300 border-slate-50 dark:border-slate-800/30" : "text-slate-400 border-slate-100 dark:border-slate-800")
                                  : "hidden" 
                              }`}
                            >
                              {formatDate(d)}
                            </span>
                          );
                        })}
                      </div>
                      {/* Mostrar histórico heredado si existe */}
                      {(() => {
                        const inherited = (certificaciones || []).filter(c => 
                          c.obraId === selectedObraId && 
                          c.estado === 'cobrado' && 
                          c.partidas?.some(it => normalize(it.bloque || "") === bloqueData.normKey)
                        ).reduce((acc, c) => acc + c.ejecutado, 0); // Simplificación: sumamos ejecutado si el bloque está en los items
                        
                        // Mejor: sumamos solo los items específicos de este bloque en la certificación
                        const specificInherited = (certificaciones || []).reduce((acc, c) => {
                          if (c.obraId !== selectedObraId) return acc;
                          const blockItems = (c.partidas || []).filter(it => normalize(it.bloque || "") === bloqueData.normKey);
                          return acc + blockItems.reduce((s, it) => s + (it.m2 * it.precio), 0);
                        }, 0);

                        if (specificInherited > 0) {
                          return (
                            <div className="mt-2 flex items-center gap-1.5">
                              <div className="bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-lg">
                                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Heredado: {formatAmount(specificInherited)}€</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{bloqueData.items.length} Partidas</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {bloqueData.items.map(item => {
                      const dimensions = BLOQUE_DIMENSIONS[bloqueData.normKey] || BLOQUE_DIMENSIONS["DEFAULT"];
                      const target = dimensions[item.itemId];
                      const percentage = target ? Math.min((item.m2 / target) * 100, 100) : null;
                      
                      const isCompleted = percentage !== null && percentage > 99;
                      
                      // Buscar si hay producción certificada para este item en este bloque
                      const certifiedM2 = (certificaciones || []).reduce((acc, c) => {
                        if (c.obraId !== selectedObraId) return acc;
                        return acc + (c.partidas || []).filter(it => it.itemId === item.itemId && normalize(it.bloque || "") === bloqueData.normKey).reduce((s, it) => s + it.m2, 0);
                      }, 0);

                      return (
                        <div key={item.itemId} className="space-y-1.5">
                          <div className={`p-3 rounded-2xl border transition-colors ${(isCompleted ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100/50 dark:border-slate-800/50')}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-tight flex items-center gap-1 ${(isCompleted ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400')}`}>
                                {item.nombre}
                                {isCompleted && <Check size={10} />}
                              </span>
                              <span className="text-sm font-black text-slate-800 dark:text-white">
                                {formatAmount(item.m2)} {target && <span className="text-[9px] text-slate-400">/ {target}</span>} <span className="text-[9px] opacity-60">m²</span>
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className={`text-[9px] font-black uppercase ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {isCompleted ? 'Ejecución Finalizada' : 'En Proceso'}
                                </span>
                                {certifiedM2 > 0 && (
                                  <span className="text-[8px] font-black text-blue-500 uppercase">Incluye {formatAmount(certifiedM2)} m² certificados</span>
                                )}
                              </div>
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
                                {percentage >= 100 ? 'Cerrado' : `${Math.round(percentage)}% Completado`}
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
