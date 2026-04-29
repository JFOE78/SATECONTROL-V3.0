import React, { useMemo, useState, useCallback } from "react";
import { ChevronLeft, MessageCircle, Info, TrendingUp, TrendingDown, Clock, Search } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatAmount } from "../lib/utils";
import { shareService } from "../services/shareService";

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
    });
  }, [operariosList, statsCurrent]);

  const filteredOperarios = useMemo(() => {
    if (!searchTerm) return operarioSettlement;
    const clean = searchTerm.toLowerCase();
    return operarioSettlement.filter(o => o.nombre.toLowerCase().includes(clean));
  }, [operarioSettlement, searchTerm]);

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

      <section className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl space-y-2">
        <div className="flex justify-between items-center opacity-80">
          <span className="text-[10px] font-black uppercase tracking-widest">Ejecución en Curso</span>
          <Clock size={14} />
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-3xl font-black">{formatAmount(statsCurrent.bruto)}€</p>
            <p className="text-[10px] font-bold opacity-60 uppercase">Bruto acumulado hoy</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-emerald-300">+{formatAmount(statsCurrent.profit)}€</p>
            <p className="text-[10px] font-bold opacity-60 uppercase">Beneficio a repartir</p>
          </div>
        </div>
      </section>

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
             <p className="text-slate-400 text-xs font-black uppercase italic">No se han encontrado operarios</p>
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
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-blue-600 uppercase">
                    {o.nombre.substring(0,2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">{o.nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{o.jornadas} jornadas trabajadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${o.cobrar >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{formatAmount(o.cobrar)}€</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase">Neto a Liquidar</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-50 dark:border-slate-800/50 mb-4">
                  <div className="bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Bruto Total</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">{formatAmount(o.bruto)}€</p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-xl">
                    <p className="text-[8px] font-black text-blue-400 uppercase mb-1 flex items-center gap-1"><TrendingUp size={8} /> Media Diaria</p>
                    <p className="text-xs font-black text-blue-600">{formatAmount(o.mediaDiaria)}€/día</p>
                  </div>
              </div>

              <div className="space-y-1.5 px-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                   <span>Jornales:</span>
                   <span className="text-slate-800 dark:text-slate-300">{formatAmount(o.totalJornales)}€</span>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold text-emerald-500">
                   <span>Reparto Beneficio:</span>
                   <span>+{formatAmount(o.sharedProfit)}€</span>
                </div>
                {o.opReembolsos > 0 && (
                  <div className="flex justify-between text-[10px] uppercase font-bold text-blue-500">
                     <span>Devolución Gastos:</span>
                     <span>+{formatAmount(o.opReembolsos)}€</span>
                  </div>
                )}
                {o.opAnticipos > 0 && (
                  <div className="flex justify-between text-[10px] uppercase font-bold text-red-500">
                     <span>Anticipos:</span>
                     <span className="flex items-center gap-1"><TrendingDown size={10} /> -{formatAmount(o.opAnticipos)}€</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex justify-end">
                <button 
                  onClick={(e) => { e.stopPropagation(); shareIndividualSettlement(o); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle size={14} /> Compartir Cuentas
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-2">
         <p className="text-[10px] font-black text-slate-400 uppercase italic">
           * Estas cuentas reflejan el estado de la obra en curso, antes de cerrar el periodo actual.
         </p>
      </div>
    </div>
  );
};
