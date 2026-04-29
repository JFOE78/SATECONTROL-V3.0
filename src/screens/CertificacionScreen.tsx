import React, { useMemo, useState, useEffect, useCallback } from "react";
import { ChevronLeft, FileDown, MessageCircle, Trash2, Edit2, ChevronDown, ChevronUp, Plus, Wand2, Check, X, Calendar as CalIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Certificacion, Anticipo } from "../types";
import { shareService } from "../services/shareService";
import { formatDate, formatAmount } from "../lib/utils";

export const CertificacionScreen: React.FC<{ onBack: () => void, onOperarioClick: (n: string) => void }> = ({ onBack, onOperarioClick }) => {
  const { 
    avances, 
    selectedObraId, 
    obras, 
    anticipos, setAnticipos,
    certificaciones, setCertificaciones, 
    calculateAvanceEconomics, 
    notify, 
    operariosList,
    itemsSate,
    gastos,
    manualAdjustments, setManualAdjustments
  } = useApp();
  
  const obra = obras.find(o => o.id === selectedObraId);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [expandedCert, setExpandedCert] = useState<string | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [incentivoExtra, setIncentivoExtra] = useState(0);
  const [showAnticiposList, setShowAnticiposList] = useState(false);

  // Manual anticipo state
  const [showManualAnticipo, setShowManualAnticipo] = useState(false);
  const [manualAnticipoOp, setManualAnticipoOp] = useState("");
  const [manualAnticipoAmount, setManualAnticipoAmount] = useState<number>(400);

  const [excludedAvanceIds, setExcludedAvanceIds] = useState<string[]>([]);
  const [showAvancesList, setShowAvancesList] = useState(false);

  const [adjustmentItem, setAdjustmentItem] = useState<{ id: string; name: string } | null>(null);
  const [adjustmentInput, setAdjustmentInput] = useState("");

  const applyAdjustment = () => {
    if (!adjustmentItem) return;
    const num = parseFloat(adjustmentInput);
    if (!isNaN(num)) {
      setManualAdjustments(prev => ({ ...prev, [adjustmentItem.id]: (prev[adjustmentItem.id] || 0) + num }));
      setAdjustmentItem(null);
      setAdjustmentInput("");
      notify("Ajuste aplicado", "success");
    } else {
      notify("Introduce un número válido", "error");
    }
  };

  // Sync dates with filtered advances if empty
  useEffect(() => {
    if (!periodoInicio || !periodoFin) {
      const lastCert = [...certificaciones].filter(c => c.id !== editingCertId && c.obraId === selectedObraId).sort((a,b) => (b.fechaFin || '').localeCompare(a.fechaFin || ''))[0];
      
      if (lastCert && lastCert.fechaFin) {
        const lastDate = new Date(lastCert.fechaFin);
        lastDate.setDate(lastDate.getDate() + 1);
        const nextStart = lastDate.toISOString().split('T')[0];
        setPeriodoInicio(nextStart);
        
        // Find last available avance date for the end
        const obraAvances = (avances || []).filter(a => a.obraId === selectedObraId).sort((a,b) => a.fecha.localeCompare(b.fecha));
        if (obraAvances.length > 0) {
          setPeriodoFin(obraAvances[obraAvances.length - 1].fecha);
        } else {
          setPeriodoFin(nextStart);
        }
      } else {
        const obraAvances = (avances || []).filter(a => a.obraId === selectedObraId);
        if (obraAvances.length > 0) {
          const sorted = [...obraAvances].sort((a,b) => a.fecha.localeCompare(b.fecha));
          if (!periodoInicio) setPeriodoInicio(sorted[0].fecha);
          if (!periodoFin) setPeriodoFin(sorted[sorted.length - 1].fecha);
        }
      }
    }
  }, [selectedObraId, certificaciones, avances, editingCertId]);

  const isDataCertified = useCallback((avance: any) => {
    return (certificaciones || []).some(c => {
      // Si estamos editando esta certificación, no bloquear sus propios avances
      if (c.id === editingCertId) return false;
      if (c.obraId !== selectedObraId) return false;

      // Prioridad 1: Bloqueo por ID específico (Nuevo sistema)
      if (c.avanceIds && c.avanceIds.length > 0) {
        return c.avanceIds.includes(avance.id);
      }

      // Prioridad 2: Fallback por rango de fechas (Sistema antiguo/legacy)
      if (c.fechaInicio && c.fechaFin) {
        return avance.fecha >= c.fechaInicio && avance.fecha <= c.fechaFin;
      }

      return false;
    });
  }, [certificaciones, selectedObraId, editingCertId]);

  const rawDataInPeriod = useMemo(() => {
    let list = (avances || []).filter(a => a.obraId === selectedObraId);
    if (periodoInicio) list = list.filter(a => a.fecha >= periodoInicio);
    if (periodoFin) list = list.filter(a => a.fecha <= periodoFin);
    
    // El filtro base es lo que NO está en OTRA certificación
    return list.filter(a => !isDataCertified(a));
  }, [avances, selectedObraId, periodoInicio, periodoFin, isDataCertified]);

  const dataFiltered = useMemo(() => {
    return rawDataInPeriod.filter(a => !excludedAvanceIds.includes(a.id));
  }, [rawDataInPeriod, excludedAvanceIds]);

  const stats = useMemo(() => {
    const itemStats: Record<string, number> = {};
    dataFiltered.forEach(a => {
      (a.produccion || []).forEach(p => {
        itemStats[p.itemId] = (itemStats[p.itemId] || 0) + p.m2;
      });
    });

    // Add manual adjustments
    Object.entries(manualAdjustments).forEach(([id, extra]) => {
      itemStats[id] = (itemStats[id] || 0) + (extra as number);
    });

    const bruto = Object.entries(itemStats).reduce((sum, [id, m2]) => {
      const price = (itemsSate[id] as any)?.precio || 0;
      return sum + (m2 * price);
    }, 0);

    const laborCost = dataFiltered.reduce((sum, a) => sum + calculateAvanceEconomics(a).costeManoObra, 0);
    const realProfit = bruto - laborCost;

    const currentAnticipos = (anticipos || [])
      .filter(an => {
        let ok = an.obraId === selectedObraId;
        const cleanInicio = periodoInicio.trim();
        const cleanFin = periodoFin.trim();
        if (cleanInicio) ok = ok && an.fecha >= cleanInicio;
        if (cleanFin) ok = ok && an.fecha <= cleanFin;
        return ok;
      });
    const totalAnticipos = currentAnticipos.reduce((sum, an) => sum + an.cantidad, 0);
    
    const processedGastos = (gastos || [])
      .filter(g => {
        let ok = g.obraId === selectedObraId;
        if (periodoInicio) ok = ok && g.fecha >= periodoInicio;
        if (periodoFin) ok = ok && g.fecha <= periodoFin;
        return ok;
      });

    return { bruto, laborCost, realProfit, anticipos: totalAnticipos, listAnticipos: currentAnticipos, items: itemStats, processedGastos };
  }, [dataFiltered, anticipos, selectedObraId, periodoInicio, periodoFin, calculateAvanceEconomics, gastos, manualAdjustments, itemsSate]);

  const toggleExcludeAvance = (id: string) => {
    setExcludedAvanceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const operarioBreakdown = useMemo(() => {
    const totalManDays = dataFiltered.reduce((sum, a) => sum + (a.operariosPresentes?.length || 0), 0);
    const pool = stats.realProfit + incentivoExtra;
    const sharePerJornada = totalManDays > 0 ? pool / totalManDays : 0;

    return operariosList.map(op => {
      const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const opClean = normalize(op.nombre);
      const opAvances = dataFiltered.filter(a => (a.operariosPresentes || []).some(o => normalize(o) === opClean));
      const jornadas = opAvances.length;
      const totalJornales = jornadas * op.coste;
      const sharedProfit = sharePerJornada * jornadas;
      
      const opAnticipos = stats.listAnticipos.filter(an => normalize(an.operario) === opClean).reduce((sum, an) => sum + an.cantidad, 0);
      const opReembolsos = stats.processedGastos.filter(g => g.pagadoPor && normalize(g.pagadoPor) === opClean).reduce((sum, g) => sum + g.monto, 0);

      return {
        ...op,
        jornadas,
        totalJornales,
        sharedProfit,
        opAnticipos,
        opReembolsos,
        cobrar: totalJornales + sharedProfit + opReembolsos - opAnticipos
      };
    });
  }, [operariosList, dataFiltered, stats, incentivoExtra]);

  const handleAutoAnticipos = () => {
    const activeOps = operariosList.filter(op => 
      dataFiltered.some(a => (a.operariosPresentes || []).includes(op.nombre))
    );
    if (activeOps.length === 0) return notify("No hay operarios activos en el periodo", "info");
    
    const today = new Date().toISOString().split('T')[0];
    const newAnticipos: Anticipo[] = activeOps.map(op => ({
      id: crypto.randomUUID(),
      fecha: today,
      obraId: selectedObraId,
      operario: op.nombre,
      cantidad: 400
    }));

    setAnticipos(prev => [...prev, ...newAnticipos]);
    notify("Anticipos de 400€ generados", "success");
  };

  const addManualAnticipo = () => {
    if (!manualAnticipoOp || !manualAnticipoAmount) return;
    const newAn: Anticipo = {
      id: crypto.randomUUID(),
      fecha: periodoFin || new Date().toISOString().split('T')[0],
      obraId: selectedObraId,
      operario: manualAnticipoOp,
      cantidad: manualAnticipoAmount
    };
    setAnticipos(prev => [...prev, newAn]);
    setManualAnticipoOp("");
    setShowManualAnticipo(false);
    notify("Anticipo añadido", "success");
  };

  const deleteAnticipo = (id: string) => {
    setAnticipos(prev => prev.filter(an => an.id !== id));
    notify("Anticipo borrado", "info");
  };

  const handleSaveCert = () => {
    if (dataFiltered.length === 0) return;
    
    // Save detailed snapshot
    const itemsSnapshot = Object.entries(stats.items).map(([id, m2]) => ({
      itemId: id,
      nombre: (itemsSate[id] as any)?.nombre || id,
      precio: (itemsSate[id] as any)?.precio || 0,
      m2: m2 as number
    }));

    const anticiposSnapshot = stats.listAnticipos.map(an => ({
      operario: an.operario,
      cantidad: an.cantidad,
      fecha: an.fecha
    }));

    const newCert: Certificacion = {
      id: editingCertId || crypto.randomUUID(),
      obraId: selectedObraId,
      mes: periodoFin.substring(0, 7),
      fechaInicio: periodoInicio,
      fechaFin: periodoFin,
      ejecutado: stats.bruto,
      anticipos: stats.anticipos,
      incentivoExtra,
      certificado: stats.bruto - stats.anticipos + incentivoExtra,
      estado: "pendiente",
      avanceIds: dataFiltered.map(a => a.id),
      items: itemsSnapshot,
      anticiposDetalle: anticiposSnapshot
    };

    if (editingCertId) {
      setCertificaciones(prev => prev.map(c => c.id === editingCertId ? newCert : c));
      setEditingCertId(null);
      notify("Certificación actualizada", "success");
    } else {
      setCertificaciones(prev => [...prev, newCert]);
      notify("Cierre guardado con éxito", "success");
    }

    // Reset states
    setExcludedAvanceIds([]);
    setIncentivoExtra(0);
    setManualAdjustments({});
  };

  const startEdit = (c: Certificacion) => {
    setEditingCertId(c.id);
    setPeriodoInicio(c.fechaInicio || "");
    setPeriodoFin(c.fechaFin || "");
    setIncentivoExtra(c.incentivoExtra || 0);
    
    // Restaurar los excluidos: son los que están en el periodo de la cert pero no están en c.avanceIds
    const obraAvances = (avances || []).filter(a => a.obraId === selectedObraId);
    let inPeriod = obraAvances;
    if (c.fechaInicio) inPeriod = inPeriod.filter(a => a.fecha >= c.fechaInicio!);
    if (c.fechaFin) inPeriod = inPeriod.filter(a => a.fecha <= c.fechaFin!);
    
    const certIds = c.avanceIds || [];
    const excluded = inPeriod
      .filter(a => !certIds.includes(a.id))
      .map(a => a.id);
    
    setExcludedAvanceIds(excluded);

    // RESTORE MANUAL ADJUSTMENTS
    // manual adjustments = (c.items m2) - (sum m2 in advances)
    const adjMap: Record<string, number> = {};
    if (c.items && certIds.length > 0) {
      const includedAvances = obraAvances.filter(a => certIds.includes(a.id));
      const advanceItemStats: Record<string, number> = {};
      includedAvances.forEach(a => {
         (a.produccion || []).forEach(p => {
            advanceItemStats[p.itemId] = (advanceItemStats[p.itemId] || 0) + p.m2;
         });
      });

      c.items.forEach(it => {
         const diff = it.m2 - (advanceItemStats[it.itemId] || 0);
         if (Math.abs(diff) > 0.01) {
            adjMap[it.itemId] = diff;
         }
      });
    }
    setManualAdjustments(adjMap);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleEstado = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCertificaciones(prev => prev.map(c => {
      if (c.id === id) {
        const next = c.estado === 'cobrado' ? 'pendiente' : 'cobrado';
        notify(`Estado cambiado a: ${next.toUpperCase()}`, "success");
        return { ...c, estado: next };
      }
      return c;
    }));
  };

  const deleteCert = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirmDeleteId === id) {
      setCertificaciones(prev => prev.filter(c => c.id !== id));
      if (expandedCert === id) setExpandedCert(null);
      setConfirmDeleteId(null);
      notify("Registro eliminado del historial", "success");
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      notify("Pulsa otra vez para confirmar el borrado", "info");
    }
  };

  const handleExportPDF = () => {
    if (!obra) return;

    // Detailed production breakdown for the PDF
    const prodMap: Record<string, { m2: number, name: string, price: number }> = {};
    (dataFiltered || []).forEach(a => {
      (a.produccion || []).forEach(p => {
        const item = itemsSate[p.itemId];
        const key = `${a.bloque || '?'}-${p.itemId}`;
        if (!prodMap[key]) {
          prodMap[key] = { m2: 0, name: item?.nombre || p.itemId, price: item?.precio || 0 };
        }
        prodMap[key].m2 += p.m2;
      });
    });

    const detailedItems = Object.entries(prodMap).map(([key, data]) => {
      const bloque = key.split('-')[0];
      return [
        bloque,
        data.name,
        `${formatAmount(data.m2)} m2`,
        `${formatAmount(data.price)}€`,
        `${formatAmount(data.m2 * data.price)}€`
      ];
    });

    const cert: Certificacion = {
      id: crypto.randomUUID(),
      obraId: selectedObraId,
      mes: periodoFin.substring(0, 7),
      fechaInicio: periodoInicio,
      fechaFin: periodoFin,
      ejecutado: stats.bruto,
      anticipos: stats.anticipos,
      certificado: stats.bruto - stats.anticipos,
      estado: "pendiente"
    };
    shareService.generateCertificacionPDF(cert, obra, stats.listAnticipos, { items: detailedItems }, itemsSate);
    notify("Generando PDF...", "info");
  };

  const handleWhatsApp = () => {
    if (!obra) return;
    
    // Convert YYYY-MM to MM/YYYY
    const formatMonth = (m: string) => {
      if (!m) return '';
      const [y, mm] = m.split('-');
      return `${mm}/${y}`;
    };

    // Calculate production grouping by Block and Item
    const prodMap: Record<string, { m2: number, name: string, price: number }> = {};
    (dataFiltered || []).forEach(a => {
      (a.produccion || []).forEach(p => {
        const item = itemsSate[p.itemId];
        const key = `${a.bloque || '?'}-${p.itemId}`;
        if (!prodMap[key]) {
          prodMap[key] = { m2: 0, name: item?.nombre || p.itemId, price: item?.precio || 0 };
        }
        prodMap[key].m2 += p.m2;
      });
    });

    const prodDetails = Object.entries(prodMap).map(([key, data]) => {
      const bloque = key.split('-')[0];
      return `- Bloque ${bloque}: ${data.name} (${formatAmount(data.m2)} m²) @ ${formatAmount(data.price)}€ = ${formatAmount(data.m2 * data.price)}€`;
    }).join('\n');

    const opsSettlement = operarioBreakdown.filter(o => o.jornadas > 0).map(o => {
      const activeOpsCount = operarioBreakdown.filter(x => x.jornadas > 0).length;
      const opIncentive = (incentivoExtra || 0) / (activeOpsCount || 1);
      
      return `*${o.nombre}* (${o.jornadas}j):\n` +
        `  • Jornales: ${formatAmount(o.totalJornales)}€\n` +
        `  • Reparto: +${formatAmount(o.sharedProfit)}€\n` +
        (opIncentive > 0 ? `  • Bonus/Inc: +${formatAmount(opIncentive)}€\n` : '') +
        (o.opReembolsos > 0 ? `  • Devolución Gastos: +${formatAmount(o.opReembolsos)}€\n` : '') +
        (o.opAnticipos > 0 ? `  • Anticipos: -${formatAmount(o.opAnticipos)}€\n` : '') +
        `  *TOTAL A COBRAR: ${formatAmount(o.cobrar + opIncentive)}€*`;
    }).join('\n\n');

    const text = `*CERTIFICACIÓN MENSUAL - ${obra.nombre}*\n` +
      `*Mes:* ${formatMonth(periodoFin.substring(0, 7))}\n` +
      `*Estado: PENDIENTE*\n\n` +
      `*PARTIDAS ESTIMADAS:*\n` +
      prodDetails + `\n\n` +
      `*RESUMEN ECONÓMICO:* \n` +
      `*TOTAL BRUTO A CERTIFICAR: ${formatAmount(stats.bruto)}€*\n` +
      `- Anticipos: ${formatAmount(stats.anticipos)}€\n` +
      (incentivoExtra > 0 ? `- Incentivo Bonus: ${formatAmount(incentivoExtra)}€\n` : '') +
      `*NETO A PERCIBIR: ${formatAmount(stats.bruto - stats.anticipos + incentivoExtra)}€*\n\n` +
      `*LIQUIDACIÓN PERSONAL:*\n` +
      opsSettlement;
    
    shareService.shareViaWhatsApp(text);
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Certificación</h2>
        <div className="flex gap-2">
          <button onClick={handleWhatsApp} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><MessageCircle size={20} /></button>
          <button onClick={handleExportPDF} className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileDown size={20} /></button>
        </div>
      </header>

      {editingCertId && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl flex justify-between items-center animate-pulse">
          <p className="text-xs font-black text-amber-700 uppercase">MODO EDICIÓN ACTIVADO</p>
          <button onClick={() => setEditingCertId(null)} className="text-amber-700 bg-amber-200 p-1 rounded-lg"><X size={16} /></button>
        </div>
      )}

      {/* Filtro Periodo */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Inicio Periodo</label>
            <div className="relative group">
              <CalIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 pointer-events-none transition-colors" />
              <input 
                type="date" 
                value={periodoInicio} 
                onChange={e => setPeriodoInicio(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 pl-9 p-3 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none ring-0 focus:ring-2 focus:ring-blue-500/20 transition-all [color-scheme:light] dark:[color-scheme:dark]" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Fin Periodo</label>
            <div className="relative group">
              <CalIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 pointer-events-none transition-colors" />
              <input 
                type="date" 
                value={periodoFin} 
                onChange={e => setPeriodoFin(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 pl-9 p-3 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none ring-0 focus:ring-2 focus:ring-blue-500/20 transition-all [color-scheme:light] dark:[color-scheme:dark]" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Listado de Avances (Selección) */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Partes de Trabajo en Periodo</label>
          <button 
            onClick={() => setShowAvancesList(!showAvancesList)}
            className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full"
          >
            {showAvancesList ? "Ocultar" : `Ver ${rawDataInPeriod.length}`}
            {showAvancesList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showAvancesList && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {rawDataInPeriod.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-4 uppercase font-bold">No hay partes pendientes en este rango</p>
            ) : (
              [...rawDataInPeriod].sort((a,b) => b.fecha.localeCompare(a.fecha)).map(a => {
                const isExcluded = excludedAvanceIds.includes(a.id);
                return (
                  <div 
                    key={a.id} 
                    onClick={() => toggleExcludeAvance(a.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                      isExcluded 
                        ? "bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-50" 
                        : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        !isExcluded ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-700"
                      }`}>
                        {!isExcluded && <Check size={12} />}
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase ${isExcluded ? "text-slate-400" : "text-slate-800 dark:text-white"}`}>
                          {formatDate(a.fecha)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          {a.bloque ? `Bloque ${a.bloque}` : "Sin bloque"} • {a.operariosPresentes?.length || 0} op.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${isExcluded ? "text-slate-400" : "text-blue-600"}`}>
                        {formatAmount(calculateAvanceEconomics(a).ingresos)}€
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {!showAvancesList && rawDataInPeriod.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              {dataFiltered.length} de {rawDataInPeriod.length} partes seleccionados
            </span>
          </div>
        )}
      </section>

      {/* Resumen Principal */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Bruto Ejecutado</label>
          <div className="text-4xl font-black text-slate-800 dark:text-white">{formatAmount(stats.bruto)}€</div>
        </div>
        
        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Producción del Mes</label>
           <div className="space-y-1 grid grid-cols-1 divide-y divide-slate-50 dark:divide-slate-800">
              {Object.entries(stats.items).map(([id, m2]) => (
                <div key={id} className="py-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{(itemsSate[id] as any)?.nombre || id}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-slate-800 dark:text-white">{formatAmount(m2 as number)} m²</span>
                       <button 
                        onClick={() => {
                          setAdjustmentItem({ id, name: (itemsSate[id] as any)?.nombre || id });
                          setAdjustmentInput("");
                        }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                       >
                         <Edit2 size={12} />
                       </button>
                    </div>
                  </div>
                  {manualAdjustments[id] !== undefined && Math.abs(manualAdjustments[id]) > 0.001 && (
                    <div className="flex justify-end gap-2">
                      <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full uppercase">
                        Ajuste: {manualAdjustments[id] > 0 ? '+' : ''}{formatAmount(manualAdjustments[id])} m²
                      </span>
                      <button 
                        onClick={() => {
                          const newAdj = { ...manualAdjustments };
                          delete newAdj[id];
                          setManualAdjustments(newAdj);
                        }}
                        className="text-red-400"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
           </div>
           
           <div className="pt-4">
              <button 
                onClick={() => {
                  setAdjustmentItem({ id: "", name: "" }); // Mode select
                  setAdjustmentInput("");
                }}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all"
              >
                <Plus size={14} /> Ajustar m² extra (Partida no listada)
              </button>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Ingresos Mes</label>
            <p className="text-xl font-black text-slate-800 dark:text-white">{formatAmount(stats.bruto)}€</p>
          </div>
          <div className="text-right">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Beneficio Real</label>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatAmount(stats.realProfit)}€</p>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 italic uppercase font-bold text-center leading-relaxed">
          * Beneficio = Ingresos - Coste de todos los jornales del equipo ({formatAmount(stats.laborCost)}€)
        </p>
      </section>

      {/* Gestión de Anticipos */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <label className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Anticipos (Pendientes)</label>
          <div className="flex gap-2">
            <button onClick={handleAutoAnticipos} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-blue-600 rounded-xl text-[10px] font-black uppercase">
              <Wand2 size={14} /> Auto-Generar
            </button>
            <button onClick={() => setShowManualAnticipo(true)} className="p-2 bg-blue-600 text-white rounded-xl"><Plus size={18} /></button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-3xl font-black text-red-500">{stats.anticipos.toLocaleString()}€</div>
          <button 
            onClick={() => setShowAnticiposList(!showAnticiposList)}
            className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl"
          >
            {showAnticiposList ? "Ocultar" : "Ver Detalle"}
            {showAnticiposList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showManualAnticipo && (
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl space-y-3">
             <select 
               value={manualAnticipoOp} 
               onChange={e => setManualAnticipoOp(e.target.value)}
               className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-xs font-black outline-none"
             >
               <option value="">Seleccionar Operario</option>
               {operariosList.map(op => <option key={op.nombre} value={op.nombre}>{op.nombre}</option>)}
             </select>
             <input 
               type="number" 
               placeholder="Cantidad €" 
               value={manualAnticipoAmount} 
               onChange={e => setManualAnticipoAmount(Number(e.target.value))} 
               className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-xs font-black outline-none" 
             />
             <div className="flex gap-2">
               <button onClick={addManualAnticipo} className="flex-1 bg-blue-600 text-white p-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                 <Check size={14} /> Añadir
               </button>
               <button onClick={() => setShowManualAnticipo(false)} className="bg-slate-200 p-3 rounded-xl"><X size={14} /></button>
             </div>
          </div>
        )}

        {showAnticiposList && (
          <div className="space-y-2 divide-y divide-slate-50 dark:divide-slate-800 border-t border-slate-50 dark:border-slate-800 pt-4">
            {stats.listAnticipos.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Sin anticipos registrados en este periodo</p>
            ) : (
              stats.listAnticipos.map(an => (
                <div key={an.id} className="flex justify-between items-center py-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{an.operario}</p>
                    <p className="text-[9px] font-bold text-slate-400">{formatDate(an.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-red-500">-{an.cantidad}€</span>
                    <button onClick={() => deleteAnticipo(an.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Incentivo Extra */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Bonus / Incentivo Extra</label>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl overflow-hidden">
           <input 
             type="number" 
             value={incentivoExtra} 
             onChange={e => setIncentivoExtra(Number(e.target.value))}
             className="w-full min-w-0 bg-transparent font-black text-2xl text-blue-600 outline-none"
           />
           <span className="text-xl font-black text-slate-400 flex-shrink-0">€</span>
        </div>
        <p className="text-[9px] text-slate-400 uppercase text-center font-bold">* Se reparte equitativamente entre los operarios activos</p>
      </section>

      {/* Cuentas por Operario (En Curso) */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter px-2">Cuentas por Operario (En Curso)</h3>
        <div className="space-y-4">
          {operarioBreakdown.filter(o => o.jornadas > 0).map(o => {
            const activeOpsCount = operarioBreakdown.filter(x => x.jornadas > 0).length;
            const opIncentive = (incentivoExtra || 0) / (activeOpsCount || 1);
            
            return (
              <div 
                key={o.nombre} 
                onClick={() => onOperarioClick(o.nombre)}
                className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{o.nombre}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{o.jornadas} jornadas trabajadas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-600">{formatAmount(o.cobrar + opIncentive)}€</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase">A Percibir</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-1 text-[10px] border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="text-slate-400 font-bold uppercase">Jornales</div>
                  <div className="text-right font-black text-slate-600 dark:text-slate-400">{formatAmount(o.totalJornales)}€</div>
                  
                  <div className="text-slate-400 font-bold uppercase">Beneficio (+Bonus)</div>
                  <div className="text-right font-black text-emerald-500">+{formatAmount(o.sharedProfit + opIncentive)}€</div>
                  
                  {o.opReembolsos > 0 && (
                    <>
                      <div className="text-slate-400 font-bold uppercase">Devolución Gastos</div>
                      <div className="text-right font-black text-blue-500">+{formatAmount(o.opReembolsos)}€</div>
                    </>
                  )}
                  
                  {o.opAnticipos > 0 && (
                    <>
                      <div className="text-slate-400 font-bold uppercase">Anticipos</div>
                      <div className="text-right font-black text-red-500">-{formatAmount(o.opAnticipos)}€</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Resultado Final */}
      <section className="bg-slate-900 dark:bg-blue-600 p-8 rounded-[3rem] text-white shadow-xl space-y-4">
        <div className="text-center">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Bruto a Certificar</label>
          <div className="text-5xl font-black">{stats.bruto.toLocaleString()}€</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase opacity-60">Anticipos</p>
            <p className="text-xl font-black text-red-300">-{stats.anticipos.toLocaleString()}€</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase opacity-60">Neto Final</p>
            <p className="text-xl font-black text-emerald-300">{(stats.bruto - stats.anticipos + incentivoExtra).toLocaleString()}€</p>
          </div>
        </div>
      </section>

      <div className="px-4">
        <button 
          onClick={handleSaveCert}
          disabled={dataFiltered.length === 0}
          className="w-full bg-slate-900 dark:bg-black text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-lg disabled:opacity-30 flex items-center justify-center gap-3"
        >
          {editingCertId ? 'Actualizar Certificación' : 'Guardar Certificación'}
        </button>
      </div>

      <section className="space-y-3 pt-12">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Certificaciones Liquidadas (Histórico)</label>
        <div className="space-y-4">
           {certificaciones.filter(c => c.id !== editingCertId && c.obraId === selectedObraId).sort((a,b) => b.mes.localeCompare(a.mes)).map(c => {
             const isExpanded = expandedCert === c.id;
             return (
               <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div 
                      onClick={() => setExpandedCert(isExpanded ? null : c.id)}
                      className="p-6 flex justify-between items-center cursor-pointer"
                    >
                      <div className="flex gap-4 items-center">
                        <button 
                          onClick={(e) => toggleEstado(c.id, e)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            c.estado === 'cobrado' 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {c.estado === 'cobrado' && <Check size={14} />}
                        </button>
                        <div>
                          <h4 className={`font-black uppercase text-sm leading-none ${c.estado === 'cobrado' ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                            {c.estado === 'cobrado' ? 'COBRADA Y LIQUIDADA' : 'PENDIENTE DE PAGO'}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Periodo: {c.fechaInicio ? formatDate(c.fechaInicio) : '??'} / {c.fechaFin ? formatDate(c.fechaFin) : '??'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-300 uppercase leading-none">Total Neto</p>
                          <p className={`text-lg font-black leading-none ${c.estado === 'cobrado' ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {c.certificado.toLocaleString()}€
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                      </div>
                    </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-800/20">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Partidas Ejecutadas</label>
                        <div className="space-y-1">
                          {c.items?.map(it => (
                            <div key={it.itemId} className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                               <span>{it.nombre} ({it.precio}€)</span>
                               <span>{Math.round(it.m2)} m²</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-red-300 uppercase tracking-widest px-1">Anticipos Aplicados</label>
                        <div className="space-y-1">
                          {c.anticiposDetalle?.map((an, idx) => (
                              <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                <span>{an.operario} ({formatDate(an.fecha)})</span>
                                <span className="text-red-500">-{an.cantidad}€</span>
                              </div>
                            ))}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-black text-red-600 text-[11px]">
                             <span>Total Anticipos</span>
                             <span>-{c.anticipos.toLocaleString()}€</span>
                          </div>
                        </div>
                      </div>

                    <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => startEdit(c)}
                          className="flex-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 py-3 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-center gap-2 text-[10px] font-black uppercase"
                        >
                          <Edit2 size={16} className="pointer-events-none" /> Editar
                        </button>
                        <button 
                          onClick={(e) => deleteCert(c.id, e)}
                          className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${
                            confirmDeleteId === c.id 
                            ? "bg-red-600 text-white border-red-600 animate-pulse" 
                            : "bg-red-50 dark:bg-red-900/10 text-red-600 border-red-100 dark:border-red-900/20"
                          }`}
                        >
                          <Trash2 size={16} className="pointer-events-none" /> 
                          {confirmDeleteId === c.id ? "¿CONFIRMAR?" : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  )}
               </div>
             );
           })}
        </div>
      </section>
      {/* Modal Ajuste Manual */}
      {adjustmentItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Ajustar Producción</h3>
              <button onClick={() => setAdjustmentItem(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><X size={20} /></button>
            </div>

            {adjustmentItem.id === "" ? (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Seleccionar Partida</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-blue-500"
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) {
                      setAdjustmentItem({ id, name: (itemsSate[id] as any)?.nombre || id });
                    }
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {Object.keys(itemsSate).map(id => (
                    <option key={id} value={id}>{(itemsSate[id] as any)?.nombre || id}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Partida Seleccionada</p>
                  <p className="text-sm font-black text-blue-600 px-2 mt-1 uppercase">{adjustmentItem.name}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Metros Extra (+ o -)</label>
                  <input 
                    autoFocus
                    type="number" 
                    step="0.01"
                    placeholder="Ej: 10.5 o -5"
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xl font-black outline-none border-2 border-transparent focus:border-blue-500"
                    value={adjustmentInput}
                    onChange={e => setAdjustmentInput(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={applyAdjustment}
                    className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs"
                  >
                    Confirmar Cambio
                  </button>
                  <button 
                    onClick={() => setAdjustmentItem({ id: "", name: "" })}
                    className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black py-4 rounded-2xl uppercase text-[10px]"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
