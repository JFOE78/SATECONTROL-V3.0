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
    gastos
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

  // Sync dates with filtered advances if empty
  useEffect(() => {
    if (!periodoInicio || !periodoFin) {
      const lastCert = [...certificaciones].filter(c => c.obraId === selectedObraId).sort((a,b) => (b.fechaFin || '').localeCompare(a.fechaFin || ''))[0];
      
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
  }, [selectedObraId, certificaciones, avances]);

  const isDataCertified = useCallback((date: string) => {
    return (certificaciones || []).some(c => 
      c.id !== editingCertId && // Si editamos, permitimos recuperarlos
      c.obraId === selectedObraId && 
      c.fechaInicio && c.fechaFin && 
      date >= c.fechaInicio && date <= c.fechaFin
    );
  }, [certificaciones, selectedObraId, editingCertId]);

  const dataFiltered = useMemo(() => {
    let list = (avances || []).filter(a => a.obraId === selectedObraId);
    if (periodoInicio) list = list.filter(a => a.fecha >= periodoInicio);
    if (periodoFin) list = list.filter(a => a.fecha <= periodoFin);
    
    return list.filter(a => !isDataCertified(a.fecha));
  }, [avances, selectedObraId, periodoInicio, periodoFin, isDataCertified]);

  const stats = useMemo(() => {
    const bruto = dataFiltered.reduce((sum, a) => sum + calculateAvanceEconomics(a).ingresos, 0);
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
    
    const itemStats: Record<string, number> = {};
    dataFiltered.forEach(a => {
      (a.produccion || []).forEach(p => {
        itemStats[p.itemId] = (itemStats[p.itemId] || 0) + p.m2;
      });
    });

    const processedGastos = (gastos || [])
      .filter(g => {
        let ok = g.obraId === selectedObraId;
        if (periodoInicio) ok = ok && g.fecha >= periodoInicio;
        if (periodoFin) ok = ok && g.fecha <= periodoFin;
        return ok;
      });

    return { bruto, laborCost, realProfit, anticipos: totalAnticipos, listAnticipos: currentAnticipos, items: itemStats, processedGastos };
  }, [dataFiltered, anticipos, selectedObraId, periodoInicio, periodoFin, calculateAvanceEconomics, gastos]);

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
  };

  const startEdit = (c: Certificacion) => {
    setEditingCertId(c.id);
    setPeriodoInicio(c.fechaInicio || "");
    setPeriodoFin(c.fechaFin || "");
    setIncentivoExtra(c.incentivoExtra || 0);
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
      `- Total Ejecutado: ${formatAmount(stats.bruto)}€\n` +
      `- Anticipos: ${formatAmount(stats.anticipos)}€\n` +
      (incentivoExtra > 0 ? `- Incentivo Bonus: ${formatAmount(incentivoExtra)}€\n` : '') +
      `*NETO A CERTIFICAR: ${formatAmount(stats.bruto - stats.anticipos + incentivoExtra)}€*\n\n` +
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

      {/* Resumen Principal */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Ejecutado</label>
          <div className="text-4xl font-black text-slate-800 dark:text-white">{formatAmount(stats.bruto)}€</div>
        </div>
        
        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Producción del Mes</label>
           <div className="space-y-1 grid grid-cols-1 divide-y divide-slate-50 dark:divide-slate-800">
              {Object.entries(stats.items).map(([id, m2]) => (
                <div key={id} className="flex justify-between py-2 items-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{(itemsSate[id] as any)?.nombre || id}</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{formatAmount(m2 as number)} m²</span>
                </div>
              ))}
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
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl">
           <input 
             type="number" 
             value={incentivoExtra} 
             onChange={e => setIncentivoExtra(Number(e.target.value))}
             className="flex-1 bg-transparent font-black text-2xl text-blue-600 outline-none"
           />
           <span className="text-xl font-black text-slate-400">€</span>
        </div>
        <p className="text-[9px] text-slate-400 uppercase text-center font-bold">* Se reparte equitativamente entre los operarios activos</p>
      </section>

      {/* Resultado Neto Final */}
      <section className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-xl space-y-2 text-center">
        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">A Certificar Neto</label>
        <div className="text-5xl font-black">{(stats.bruto - stats.anticipos + incentivoExtra).toLocaleString()}€</div>
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
    </div>
  );
};
