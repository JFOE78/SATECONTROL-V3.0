import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalIcon, DollarSign, Users, Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Avance } from "../types";
import { formatDate } from "../lib/utils";

export const Calendario: React.FC<{ onEdit: (a: Avance) => void, onBack: () => void, onNew: (date: string) => void }> = ({ onEdit, onBack, onNew }) => {
  const { avances, calculateAvanceEconomics, setAvances, notify, selectedObraId, anticipos, itemsSate } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);

  const filteredAvances = useMemo(() => 
    avances.filter(a => a.obraId === selectedObraId)
  , [avances, selectedObraId]);

  const filteredAnticipos = useMemo(() => 
    anticipos.filter(a => a.obraId === selectedObraId)
  , [anticipos, selectedObraId]);

  const monthLabel = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Adjusted for Monday start (Spanish conventional)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      // Use YYYY-MM-DD string directly to avoid timezone shifts
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [currentMonth]);

  const changeMonth = (delta: number) => {
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth() + delta);
    setCurrentMonth(next);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteAvance = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirmDeleteId === id) {
      const nextAvances = avances.filter(a => a.id !== id);
      setAvances(nextAvances);
      setConfirmDeleteId(null);
      notify("Avance eliminado", "success");
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      notify("Pulsa otra vez para confirmar el borrado", "info");
    }
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDay) return [];
    return filteredAvances.filter(a => a.fecha === selectedDay);
  }, [selectedDay, filteredAvances]);

  const selectedDayAnticipos = useMemo(() => {
    if (!selectedDay) return [];
    return filteredAnticipos.filter(a => a.fecha === selectedDay);
  }, [selectedDay, filteredAnticipos]);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Agenda</h2>
        <div className="w-12 h-12" />
      </header>

      {/* Selector de Mes */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
        <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400"><ChevronLeft size={24} /></button>
        <span className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="p-2 text-slate-400"><ChevronRight size={24} /></button>
      </section>

      {/* Cuadrícula del Calendario */}
      <section className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;
            
            const isSelected = selectedDay === day;
            const hasAvance = filteredAvances.some(a => a.fecha === day);
            const hasAnticipo = filteredAnticipos.some(a => a.fecha === day);
            const dateObj = new Date(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="text-xs font-black">{parseInt(day.split('-')[2])}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {hasAvance && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} />}
                  {hasAnticipo && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-red-500"}`} />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Detalle del Día Seleccionado */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedDay ? formatDate(selectedDay) : "Selecciona un día"}
          </label>
          {selectedDay && (
            <button 
              onClick={() => onNew(selectedDay)}
              className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
            >
              <Plus size={14} /> Registrar
            </button>
          )}
        </div>

        {selectedDayData.length === 0 && selectedDayAnticipos.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 border-dashed">
            <p className="text-slate-300 font-bold uppercase text-[9px] tracking-widest">Sin registros este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayData.map(a => {
              const econ = calculateAvanceEconomics(a);
              return (
                <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">{a.bloque}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{a.produccion.length} Partidas registradas</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(a)} className="p-2 bg-slate-50 dark:bg-slate-800 text-blue-600 rounded-xl active:scale-90 transition-transform"><Edit2 size={18} /></button>
                      <button 
                        onClick={(e) => deleteAvance(a.id, e)} 
                        className={`p-2 rounded-xl transition-all shadow-sm ${
                          confirmDeleteId === a.id 
                          ? "bg-red-600 text-white animate-pulse" 
                          : "bg-red-50 dark:bg-red-900/10 text-red-600"
                        }`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Partidas Ejecutadas</label>
                    <div className="space-y-1">
                      {a.produccion.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-400">
                            {itemsSate[p.itemId]?.nombre || p.itemId}
                          </span>
                          <span className="font-black text-slate-800 dark:text-white">{p.m2} m²</span>
                        </div>
                      ))}
                    </div>
                  </div>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Ingresos</p>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">{Math.round(econ.ingresos)}€</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Coste M.O.</p>
                        <p className="text-sm font-black text-red-500">{Math.round(econ.costeManoObra)}€</p>
                      </div>
                      <div className="flex flex-col text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Beneficio</p>
                        <p className={`text-sm font-black ${econ.beneficio >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {econ.beneficio > 0 ? "+" : ""}{Math.round(econ.beneficio)}€
                        </p>
                      </div>
                    </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                     <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600"><Users size={14} /></div>
                     <p className="text-xs font-bold text-slate-500">
                       <span className="text-slate-800 dark:text-white">{econ.cantOps}</span> Operarios presentes
                     </p>
                  </div>
                </div>
              );
            })}
            {selectedDayAnticipos.map(an => (
              <div key={an.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-50 dark:border-red-900/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-xl text-red-600"><DollarSign size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-red-400 uppercase leading-none">Anticipo</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{an.operario} ({formatDate(an.fecha)})</p>
                  </div>
                </div>
                <span className="text-lg font-black text-red-600">-{an.cantidad}€</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
