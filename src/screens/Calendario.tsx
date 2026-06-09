import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalIcon, DollarSign, Users, Plus, Sun, Cloud, CloudRain, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Avance } from "../types";
import { formatDate, formatAmount } from "../lib/utils";

export const Calendario: React.FC<{ onEdit: (a: Avance) => void, onBack: () => void, onNew: (date: string) => void }> = ({ onEdit, onBack, onNew }) => {
  const { avances, calculateAvanceEconomics, setAvances, notify, selectedObraId, anticipos, setAnticipos, itemsSate, certificaciones, operariosList } = useApp();
  
  // Find the latest registered avance's date for this obra, or default to the baseline "2026-06-03" to ensure any saved records are in view.
  const initialDateStr = useMemo(() => {
    if (avances && avances.length > 0) {
      const sorted = [...avances]
        .filter(a => a.obraId === selectedObraId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      if (sorted.length > 0) return sorted[0].fecha;
    }
    return "2026-06-03";
  }, [avances, selectedObraId]);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const parts = initialDateStr.split('-');
    const year = Number(parts[0]) || 2026;
    const month = Number(parts[1]) || 6;
    return new Date(year, month - 1, 1);
  });
  
  const [selectedDay, setSelectedDay] = useState<string | null>(initialDateStr);

  // Synchronize calendar focus whenever the latest target date updates
  React.useEffect(() => {
    if (initialDateStr) {
      setSelectedDay(initialDateStr);
      const parts = initialDateStr.split('-');
      const year = Number(parts[0]) || 2026;
      const month = Number(parts[1]) || 6;
      setCurrentMonth(new Date(year, month - 1, 1));
    }
  }, [initialDateStr]);

  const [editingAnticipoId, setEditingAnticipoId] = useState<string | null>(null);
  const [editAnticipoOp, setEditAnticipoOp] = useState("");
  const [editAnticipoAmount, setEditAnticipoAmount] = useState<number>(0);
  const [editAnticipoFecha, setEditAnticipoFecha] = useState("");

  const filteredAvances = useMemo(() => 
    avances.filter(a => a.obraId === selectedObraId)
  , [avances, selectedObraId]);

  const filteredAnticipos = useMemo(() => 
    anticipos.filter(a => a.obraId === selectedObraId)
  , [anticipos, selectedObraId]);

  const filteredCerts = useMemo(() => 
    certificaciones.filter(c => c.obraId === selectedObraId && c.estado === 'cobrado')
  , [certificaciones, selectedObraId]);

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

  const deleteAnticipo = (id: string) => {
    const nextAn = anticipos.filter(an => an.id !== id);
    setAnticipos(nextAn);
    notify("Anticipo eliminado", "info");
  };

  const startEditAnticipo = (an: any) => {
    setEditingAnticipoId(an.id);
    setEditAnticipoOp(an.operario);
    setEditAnticipoAmount(an.cantidad);
    setEditAnticipoFecha(an.fecha);
  };

  const saveEditAnticipo = () => {
    if (!editAnticipoOp || editAnticipoAmount <= 0) return;
    
    if (editingAnticipoId === "NEW") {
      const newAn = {
        id: crypto.randomUUID(),
        fecha: editAnticipoFecha,
        obraId: selectedObraId,
        operario: editAnticipoOp,
        cantidad: editAnticipoAmount
      };
      setAnticipos(prev => [...prev, newAn]);
      notify("Anticipo registrado", "success");
    } else {
      setAnticipos(prev => prev.map(an => an.id === editingAnticipoId ? {
        ...an,
        operario: editAnticipoOp,
        cantidad: editAnticipoAmount,
        fecha: editAnticipoFecha
      } : an));
      notify("Anticipo actualizado", "success");
    }
    setEditingAnticipoId(null);
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
            const dayAvance = filteredAvances.find(a => a.fecha === day);
            const hasAvance = !!dayAvance;
            const hasWork = hasAvance && dayAvance.produccion && dayAvance.produccion.length > 0 && dayAvance.produccion.some(p => p.m2 > 0);
            const isUnworked = hasAvance && !hasWork;
            const hasAnticipo = filteredAnticipos.some(a => a.fecha === day);
            const isPaidCert = filteredCerts.some(c => c.fechaFin === day);
            const dateObj = new Date(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {dayAvance?.clima && !isSelected && (
                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-white/10 dark:bg-black/20">
                    {dayAvance.clima === 'despejado' && <Sun size={14} className="text-amber-400 drop-shadow-sm" />}
                    {dayAvance.clima === 'nublado' && <Cloud size={14} className="text-slate-300 drop-shadow-sm" />}
                    {dayAvance.clima === 'lluvia' && <CloudRain size={14} className="text-cyan-400 drop-shadow-lg" />}
                  </div>
                )}
                <span className="text-xs font-black">{parseInt(day.split('-')[2])}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {isPaidCert && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]"}`} />}
                  {hasAvance && hasWork && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-blue-500"}`} />}
                  {isUnworked && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-amber-500 shadow-[0_0_3px_rgba(245,158,11,0.8)]"}`} />}
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
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingAnticipoId("NEW");
                  setEditAnticipoOp("");
                  setEditAnticipoAmount(0);
                  setEditAnticipoFecha(selectedDay);
                }}
                className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all border border-red-100 dark:border-red-900/20"
              >
                <Plus size={14} /> Anticipo
              </button>
              <button 
                onClick={() => onNew(selectedDay)}
                className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all border border-blue-100 dark:border-blue-900/20"
              >
                <Plus size={14} /> Registrar
              </button>
            </div>
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
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">
                          {Array.from(new Set(a.produccion.map(p => p.bloque || a.bloque))).length > 1 
                            ? "Día con Varios Bloques" 
                            : (a.bloque || "Bloque General")}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                          {a.produccion.length > 0 
                            ? `${a.produccion.length} Partidas registradas` 
                            : `SIN PRODUCCIÓN - ${a.motivoSinProduccion?.toUpperCase() || 'NO ESPECIFICADO'}`}
                        </p>
                      </div>
                      {a.clima && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-xl">
                          {a.clima === 'despejado' && <Sun size={16} />}
                          {a.clima === 'nublado' && <Cloud size={16} />}
                          {a.clima === 'lluvia' && <CloudRain size={16} />}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(a)} className="p-2 bg-slate-50 dark:bg-slate-800 text-purple-600 rounded-xl active:scale-90 transition-transform"><Edit2 size={18} /></button>
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

                    <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                      {Array.from(new Set(a.produccion.map(p => p.bloque || a.bloque || "General"))).map(blockName => (
                        <div key={blockName} className="space-y-2">
                          <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">Bloque {blockName}</label>
                          <div className="space-y-1">
                            {a.produccion.filter(p => (p.bloque || a.bloque || "General") === blockName).map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs ml-1">
                                <span className="font-bold text-slate-600 dark:text-slate-400">
                                  {itemsSate[p.itemId]?.nombre || p.itemId}
                                </span>
                                <span className="font-black text-slate-800 dark:text-white">{p.m2} m²</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                  {a.fotos && a.fotos.length > 0 && (
                    <div className="pt-2">
                       <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                         {a.fotos.map((f, fIdx) => (
                           <div key={fIdx} className="min-w-[80px] h-[80px] rounded-xl overflow-hidden shadow-sm">
                             <img src={f} alt="avance" className="w-full h-full object-cover" />
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Ingresos</p>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">{formatAmount(econ.ingresos)}€</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Coste M.O.</p>
                        <p className="text-sm font-black text-red-500">{formatAmount(econ.costeManoObra)}€</p>
                      </div>
                      <div className="flex flex-col text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Beneficio</p>
                        <p className={`text-sm font-black ${econ.beneficio >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {econ.beneficio > 0 ? "+" : ""}{formatAmount(econ.beneficio)}€
                        </p>
                      </div>
                    </div>

          <div className="flex items-center gap-2 pt-3 border-t border-slate-50 dark:border-slate-800">
             <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-purple-600"><Users size={14} /></div>
             <p className="text-xs font-bold text-slate-500">
               <span className="text-slate-800 dark:text-white">{econ.cantOps}</span> Operarios presentes
             </p>
          </div>
        </div>
      );
    })}

            {selectedDayAnticipos.map(an => (
              <div key={an.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-50 dark:border-red-900/10 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-xl text-red-600"><DollarSign size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-red-400 uppercase leading-none">Anticipo</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{an.operario} ({formatDate(an.fecha)})</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-red-600">-{formatAmount(an.cantidad)}€</span>
                  <div className="flex gap-2">
                    <button onClick={() => startEditAnticipo(an)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => deleteAnticipo(an.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leyenda del Calendario */}
        <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Leyenda de la Agenda</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Cierre Cobrado y Liquidado (Punto en fecha fin)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Jornadas de Trabajo (Con Producción)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Días sin Actividad Laboral (No Trabajados / Sin Producción)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Anticipos Entregados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Editar Anticipo */}
      {editingAnticipoId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                {editingAnticipoId === "NEW" ? "Nuevo Anticipo" : "Editar Anticipo"}
              </h3>
              <button onClick={() => setEditingAnticipoId(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Operario</label>
                <select 
                  value={editAnticipoOp} 
                  onChange={e => setEditAnticipoOp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-black outline-none"
                >
                  <option value="">Seleccionar Operario</option>
                  {operariosList.map(op => (
                    <option key={op.nombre} value={op.nombre}>{op.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha</label>
                 <input 
                   type="date" 
                   value={editAnticipoFecha} 
                   onChange={e => setEditAnticipoFecha(e.target.value)} 
                   className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-black outline-none" 
                 />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cantidad (€)</label>
                <input 
                  type="number" 
                  value={editAnticipoAmount} 
                  onChange={e => setEditAnticipoAmount(Number(e.target.value))} 
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xl font-black outline-none" 
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={saveEditAnticipo}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
