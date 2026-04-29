import React, { useMemo, useState, useCallback } from "react";
import { ChevronLeft, MessageCircle, Info, TrendingUp, TrendingDown, Clock, Search, Calculator } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatAmount } from "../lib/utils";
import { shareService } from "../services/shareService";
import { motion, AnimatePresence } from "motion/react";

export const OperariosScreen: React.FC<{ onBack: () => void, onOperarioClick: (n: string) => void }> = ({ onBack, onOperarioClick }) => {
  const { 
    avances, 
    selectedObraId, 
    obras, 
    operariosList, 
    gastos, 
    anticipos, 
    certificaciones, 
    itemsSate, 
    manualAdjustments, 
    calculateAvanceEconomics,
    notify 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'curso' | 'simulacion'>('curso');
  const [incentivoExtra, setIncentivoExtra] = useState(0);

  const selectedObra = obras.find(o => o.id === selectedObraId);

  const isDataCertified = useCallback((date: string) => {
    return (certificaciones || []).some(c => 
      c.obraId === selectedObraId && 
      c.fechaInicio && c.fechaFin && 
      date >= c.fechaInicio && date <= c.fechaFin
    );
  }, [certificaciones, selectedObraId]);

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

  // CÁLCULO PARA VISTA EN CURSO
  const operarioSettlementCurso = useMemo(() => {
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
    });
  }, [operariosList, statsCurrent]);

  // CÁLCULO PARA VISTA SIMULACIÓN (CON INCENTIVO)
  const operarioSettlementSimulacion = useMemo(() => {
    const totalManDays = statsCurrent.listAv.reduce((sum, a) => {
      const isSinActividad = a.produccion.length === 0 && a.motivoSinProduccion;
      return sum + (isSinActividad ? 0 : (a.operariosPresentes?.length || 0));
    }, 0);
    const pool = statsCurrent.profit + (incentivoExtra || 0);
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
      const sharedProfitAndBonus = sharePerJornada * jornadas;
      
      const opAnticipos = statsCurrent.listAn.filter(an => normalize(an.operario) === opClean).reduce((sum, an) => sum + an.cantidad, 0);
      const opReembolsos = statsCurrent.listGa.filter(g => g.pagadoPor && normalize(g.pagadoPor) === opClean).reduce((sum, g) => sum + g.monto, 0);
      const bruto = totalJornales + sharedProfitAndBonus + opReembolsos;

      return {
        ...op,
        jornadas,
        totalJornales,
        sharedProfit: sharedProfitAndBonus,
        opAnticipos,
        opReembolsos,
        bruto,
        cobrar: bruto - opAnticipos,
        mediaDiaria: jornadas > 0 ? (totalJornales + sharedProfitAndBonus) / jornadas : 0
      };
    });
  }, [operariosList, statsCurrent, incentivoExtra]);

  const currentSettlement = activeTab === 'simulacion' ? operarioSettlementSimulacion : operarioSettlementCurso;

  const filteredOperarios = useMemo(() => {
    const list = currentSettlement.filter(o => o.jornadas > 0);
    if (!searchTerm) return list;
    const clean = searchTerm.toLowerCase();
    return list.filter(o => o.nombre.toLowerCase().includes(clean));
  }, [currentSettlement, searchTerm]);

  const shareIndividualSettlement = (o: any) => {
    const text = `*CUENTAS - ${o.nombre}*\n` +
      `*Obra:* ${selectedObra?.nombre || 'Obra'}\n` +
      `*Estado:* ${activeTab === 'simulacion' ? 'SIMULACIÓN DE CIERRE (+BONUS)' : 'PRODUCCIÓN EN CURSO'}\n\n` +
      `- Jornales (${o.jornadas}j): ${formatAmount(o.totalJornales)}€\n` +
      `- Reparto (+Bonus): +${formatAmount(o.sharedProfit)}€\n` +
      (o.opReembolsos > 0 ? `- Devolución Gastos: +${formatAmount(o.opReembolsos)}€\n` : '') +
      `*TOTAL BRUTO: ${formatAmount(o.bruto)}€*\n` +
      (o.mediaDiaria > 0 ? `*Media Diaria (J+R): ${formatAmount(o.mediaDiaria)}€/día*\n` : '') +
      (o.opAnticipos > 0 ? `- Anticipos: -${formatAmount(o.opAnticipos)}€\n` : '') +
      `*TOTAL NETO A COBRAR: ${formatAmount(o.cobrar)}€*`;
    
    shareService.shareViaWhatsApp(text);
    notify("Cuentas enviadas", "success");
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Operarios</h2>
        <div className="w-12" />
      </header>

      {/* Tabs de Selección de Vista */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('curso')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
            activeTab === 'curso' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={16} /> En Curso
        </button>
        <button 
          onClick={() => setActiveTab('simulacion')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
            activeTab === 'simulacion' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Calculator size={16} /> Simulación Cierre
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'curso' ? (
          <motion.section 
            key="sh-curso"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-950 p-6 rounded-[2.5rem] text-white shadow-xl space-y-2 border border-slate-800"
          >
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Ejecución Real (Acumulado)</span>
              <Clock size={14} />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{formatAmount(statsCurrent.bruto)}€</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Bruto acumulado actual</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">+{formatAmount(statsCurrent.profit)}€</p>
                <p className="text-[10px] font-bold text-emerald-900 uppercase">Beneficio hoy</p>
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section 
            key="sh-simulacion"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-950 p-6 rounded-[2.5rem] text-white shadow-xl space-y-4 border border-slate-800"
          >
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Estimación de Liquidación</span>
              <Calculator size={14} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-black text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.6)]">{formatAmount(statsCurrent.profit + incentivoExtra)}€</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Fondo de Reparto Total</p>
              </div>
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-1">
                <label className="text-[9px] font-black uppercase text-indigo-400/60 ml-1">Bonus Extra €</label>
                <input 
                  type="number" 
                  value={incentivoExtra} 
                  onChange={e => setIncentivoExtra(Number(e.target.value))}
                  className="w-full bg-transparent font-black text-2xl text-white outline-none placeholder:text-white/10"
                  placeholder="0"
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="BUSCAR OPERARIO..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 pl-12 pr-4 p-4 rounded-2xl text-xs font-black uppercase text-slate-800 dark:text-white border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {filteredOperarios.length === 0 ? (
          <div className="text-center py-20">
             <Info className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 text-xs font-black uppercase italic">No se han encontrado operarios activos</p>
          </div>
        ) : (
          filteredOperarios.map(o => (
            <div 
              key={o.nombre}
              onClick={() => onOperarioClick(o.nombre)}
              className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer shadow-sm group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black uppercase ${
                    activeTab === 'simulacion' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-blue-600'
                  }`}>
                    {o.nombre.substring(0,2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-none">{o.nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{o.jornadas} jornadas registradas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black leading-none ${o.cobrar >= 0 ? (activeTab === 'simulacion' ? 'text-indigo-600' : 'text-blue-600') : 'text-red-500'}`}>
                    {formatAmount(o.cobrar)}€
                  </p>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-1">Neto A Cobrar</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-50 dark:border-slate-800/50 mb-4">
                  <div className="bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Bruto Total</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">{formatAmount(o.bruto)}€</p>
                  </div>
                  <div className={`${activeTab === 'simulacion' ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'bg-blue-50/50 dark:bg-blue-900/10'} p-2 rounded-xl`}>
                    <p className={`text-[8px] font-black uppercase mb-1 flex items-center gap-1 ${activeTab === 'simulacion' ? 'text-indigo-400' : 'text-blue-400'}`}>
                      <TrendingUp size={8} /> Media Diaria
                    </p>
                    <p className={`text-xs font-black ${activeTab === 'simulacion' ? 'text-indigo-600' : 'text-blue-600'}`}>{formatAmount(o.mediaDiaria)}€/día</p>
                  </div>
              </div>

              <div className="space-y-1.5 px-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                   <span>Jornales ({o.jornadas}j):</span>
                   <span className="text-slate-800 dark:text-slate-300">{formatAmount(o.totalJornales)}€</span>
                </div>
                <div className={`flex justify-between text-[10px] uppercase font-bold ${activeTab === 'simulacion' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                   <span>Reparto Beneficio {activeTab === 'simulacion' ? '+ Bonus' : ''}:</span>
                   <span>+{formatAmount(o.sharedProfit)}€</span>
                </div>
                {o.opReembolsos > 0 && (
                  <div className="flex justify-between text-[10px] uppercase font-bold text-blue-500">
                     <span>Reembolso Gastos:</span>
                     <span>+{formatAmount(o.opReembolsos)}€</span>
                  </div>
                )}
                {o.opAnticipos > 0 && (
                  <div className="flex justify-between text-[10px] uppercase font-bold text-red-500">
                     <span>Anticipos Deducidos:</span>
                     <span className="flex items-center gap-1"><TrendingDown size={10} /> -{formatAmount(o.opAnticipos)}€</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex justify-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); shareIndividualSettlement(o); }}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[10px] font-black uppercase transition-all ${
                    activeTab === 'simulacion' 
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border-indigo-100 dark:border-indigo-900/30' 
                    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30'
                  }`}
                >
                  <MessageCircle size={14} /> Compartir {activeTab === 'simulacion' ? 'Simulacion' : 'Cuentas'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-2">
         <p className="text-[10px] font-black text-slate-400 uppercase italic">
           {activeTab === 'curso' 
             ? "* Cuentas basadas en la producción real registrada hasta el momento."
             : "* Simulación proyectada incluyendo un bonus compensatorio en el beneficio."
           }
         </p>
      </div>
    </div>
  );
};
