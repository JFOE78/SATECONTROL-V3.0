import React, { useMemo } from "react";
import { ChevronLeft, Users, Wallet, Receipt } from "lucide-react";
import { useApp } from "../context/AppContext";

export const OperarioDetalleScreen: React.FC<{ operarioName: string, onBack: () => void }> = ({ operarioName, onBack }) => {
  const { avances, anticipos, gastos, selectedObraId } = useApp();

  const stats = useMemo(() => {
    const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const opClean = normalize(operarioName);
    const obAvances = avances.filter(a => a.obraId === selectedObraId);
    
    const jornadas = obAvances.filter(a => {
      const isSinActividad = a.produccion.length === 0 && a.motivoSinProduccion;
      return !isSinActividad && (a.operariosPresentes || []).some(o => normalize(o) === opClean);
    }).length;
    const totalAnticipos = anticipos.filter(a => a.obraId === selectedObraId && normalize(a.operario) === opClean).reduce((sum, a) => sum + a.cantidad, 0);
    const reembolsos = gastos.filter(g => g.obraId === selectedObraId && g.pagadoPor && normalize(g.pagadoPor) === opClean).reduce((sum, g) => sum + g.monto, 0);

    return { jornadas, totalAnticipos, reembolsos };
  }, [operarioName, avances, anticipos, gastos, selectedObraId]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 rounded-xl text-slate-400 shadow-sm"><ChevronLeft size={24} /></button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{operarioName}</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Ficha Personal</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm col-span-2 flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600"><Users size={32} /></div>
          <div>
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Jornadas</label>
            <span className="text-4xl font-black text-slate-800 dark:text-white">{stats.jornadas}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <label className="text-[10px] font-black text-slate-300 uppercase block mb-1">Anticipos</label>
          <span className="text-2xl font-black text-red-500">{stats.totalAnticipos}€</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <label className="text-[10px] font-black text-slate-300 uppercase block mb-1">Reembolsos</label>
          <span className="text-2xl font-black text-emerald-500">{stats.reembolsos}€</span>
        </div>
      </div>
    </div>
  );
};
