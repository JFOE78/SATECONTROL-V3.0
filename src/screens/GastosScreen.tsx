import React, { useState } from "react";
import { ChevronLeft, PlusCircle, Trash2, Receipt } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Gasto } from "../types";
import { formatDate, formatAmount } from "../lib/utils";

export const GastosScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { gastos, setGastos, selectedObraId, notify, operariosList } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [pagadoPor, setPagadoPor] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const obraGastos = gastos.filter(g => g.obraId === selectedObraId);

  const handleSave = () => {
    if (!concepto || !monto) return;
    const newGasto: Gasto = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString().split('T')[0],
      obraId: selectedObraId,
      concepto,
      monto: Number(monto),
      pagadoPor: pagadoPor || undefined
    };
    setGastos([...gastos, newGasto]);
    setModalOpen(false);
    setConcepto("");
    setMonto("");
    setPagadoPor("");
    notify("Gasto registrado", "success");
  };

  const deleteGasto = (id: string) => {
    if (confirmDeleteId === id) {
      setGastos(gastos.filter(g => g.id !== id));
      setConfirmDeleteId(null);
      notify("Gasto eliminado", "success");
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      notify("Pulsa otra vez para confirmar", "info");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white dark:bg-slate-900 rounded-xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Gastos</h2>
      </header>

      <section className="bg-red-600 rounded-[2.5rem] p-8 text-white flex justify-between items-center shadow-lg shadow-red-100 dark:shadow-none">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Obra</label>
          <div className="text-4xl font-black">{formatAmount(obraGastos.reduce((sum, g) => sum + g.monto, 0))}€</div>
        </div>
        <button onClick={() => setModalOpen(true)} className="bg-white/20 p-4 rounded-3xl backdrop-blur-md active:scale-95 transition-all">
          <PlusCircle size={32} />
        </button>
      </section>

      <div className="space-y-3">
        {obraGastos.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sin gastos registrados</p>
          </div>
        ) : (
          obraGastos.sort((a,b) => b.fecha.localeCompare(a.fecha)).map(g => (
              <div key={g.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-red-600"><Receipt size={24} /></div>
                   <div>
                     <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm leading-none">{g.concepto}</h4>
                     <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{formatDate(g.fecha)} {g.pagadoPor && `• ${g.pagadoPor}`}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <span className="text-xl font-black text-slate-800 dark:text-white">{formatAmount(g.monto)}€</span>
                   <button 
                     onClick={() => deleteGasto(g.id)} 
                     className={`p-2 rounded-xl transition-all ${confirmDeleteId === g.id ? "bg-red-600 text-white animate-pulse shadow-sm" : "text-red-500"}`}
                   >
                     <Trash2 size={18} />
                   </button>
                 </div>
              </div>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl">
             <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase text-center">Nuevo Gasto</h3>
             <div className="space-y-4">
                <input type="text" placeholder="Concepto" value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none" />
                <input type="number" placeholder="Monto (€)" value={monto} onChange={e => setMonto(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none" />
                <select value={pagadoPor} onChange={e => setPagadoPor(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none appearance-none">
                   <option value="">Caja Empresa</option>
                   {operariosList.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                </select>
             </div>
             <button onClick={handleSave} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-100 active:scale-95 transition-all uppercase tracking-widest">Guardar Gasto</button>
             <button onClick={() => setModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-xs">Cerrar</button>
           </div>
        </div>
      )}
    </div>
  );
};
