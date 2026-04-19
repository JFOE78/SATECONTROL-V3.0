import React, { useState, useEffect } from "react";
import { ChevronLeft, PlusCircle, Trash2, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Produccion, Avance } from "../types";

export const RegistrarAvance: React.FC<{ initialAvance?: Avance | null, onCancel: () => void }> = ({ initialAvance, onCancel }) => {
  const { 
    selectedObraId, 
    obras, 
    itemsSate, 
    operariosList, 
    avances, 
    setAvances, 
    notify, 
    calculateAvanceEconomics 
  } = useApp();
  
  const obra = obras.find(o => o.id === selectedObraId);
  const [fecha, setFecha] = useState(initialAvance?.fecha || new Date().toISOString().split('T')[0]);
  const [bloque, setBloque] = useState(initialAvance?.bloque || "");
  const [operarios, setOperarios] = useState<string[]>(initialAvance?.operariosPresentes || operariosList.map(o => o.nombre));
  const [producciones, setProducciones] = useState<Produccion[]>(initialAvance?.produccion || []);
  
  // Formulario producción
  const [selectedItemId, setSelectedItemId] = useState<string>(Object.keys(itemsSate)[0] || "fase1");
  const [m2, setM2] = useState<string>("");

  const handleAddProd = () => {
    if (!m2 || isNaN(Number(m2))) return;
    const newProd: Produccion = {
      itemId: selectedItemId,
      m2: Number(m2),
      bloque: bloque || "General"
    };
    setProducciones([...producciones, newProd]);
    setM2("");
  };

  const removeProd = (index: number) => {
    setProducciones(producciones.filter((_, i) => i !== index));
  };

  const toggleOperario = (name: string) => {
    if (operarios.includes(name)) {
      setOperarios(operarios.filter(o => o !== name));
    } else {
      setOperarios([...operarios, name]);
    }
  };

  const handleSave = () => {
    if (!bloque) {
      notify("El bloque es obligatorio", "error");
      return;
    }
    if (producciones.length === 0) {
      notify("Añade al menos una partida de producción", "error");
      return;
    }

    const isNew = !initialAvance || !initialAvance.id;

    const newAvance: Avance = {
      id: isNew ? crypto.randomUUID() : initialAvance!.id,
      fecha,
      obraId: selectedObraId,
      bloque,
      operariosPresentes: operarios,
      produccion: producciones,
      resumen: { ingresos: 0, costeManoObra: 0, beneficio: 0, beneficioPorOperario: 0 } // Placeholder
    };

    const econ = calculateAvanceEconomics(newAvance);
    newAvance.resumen = {
      ingresos: econ.ingresos,
      costeManoObra: econ.costeManoObra,
      beneficio: econ.beneficio,
      beneficioPorOperario: econ.beneficioPorOperario
    };

    setAvances(prev => {
      if (isNew) {
        // Prevención de duplicados accidentales: 
        // Si ya existe un registro exactamente igual (misma obra, misma fecha, mismo bloque), 
        // lo actualizamos en vez de añadir uno nuevo.
        const existingIdx = prev.findIndex(a => 
          a.obraId === selectedObraId && 
          a.fecha === fecha && 
          a.bloque.trim().toLowerCase() === bloque.trim().toLowerCase()
        );

        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = newAvance;
          return next;
        }
        return [...prev, newAvance];
      } else {
        return prev.map(a => a.id === initialAvance!.id ? newAvance : a);
      }
    });

    notify(isNew ? "Avance registrado" : "Cambios guardados", "success");
    onCancel();
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">{initialAvance ? 'Editar Avance' : 'Nuevo Avance'}</h2>
        <div className="w-12 h-12" />
      </div>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha</label>
            <input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-slate-800 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Bloque</label>
            <input 
              type="text" 
              placeholder="Ej: B-13" 
              value={bloque} 
              onChange={(e) => setBloque(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-slate-800 dark:text-white outline-none uppercase"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Operarios Presentes</label>
        <div className="flex flex-wrap gap-2 px-2">
          {operariosList.map(op => {
            const isPresent = operarios.includes(op.nombre);
            return (
              <button 
                key={op.nombre}
                onClick={() => toggleOperario(op.nombre)}
                className={`px-4 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 border-2 ${
                  isPresent 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                }`}
              >
                {isPresent ? <Check size={14} /> : <X size={14} />}
                {op.nombre}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Añadir Producción</label>
        <div className="flex flex-col gap-3">
          <select 
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-slate-800 dark:text-white outline-none appearance-none"
          >
            {Object.entries(itemsSate).map(([id, item]) => (
              <option key={id} value={id}>{(item as any).nombre} ({(item as any).precio}€)</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="M2 producidos" 
              value={m2}
              onChange={(e) => setM2(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-slate-800 dark:text-white outline-none"
            />
            <button 
              onClick={handleAddProd}
              className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              <PlusCircle size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {producciones.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none">{itemsSate[p.itemId]?.nombre || 'Desconocido'}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{p.m2} m² en {p.bloque}</p>
              </div>
              <button onClick={() => removeProd(idx)} className="text-red-500 p-2"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40">
        <button 
          onClick={handleSave}
          className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-blue-200 dark:shadow-none active:scale-95 transition-all uppercase tracking-widest text-lg"
        >
          {initialAvance ? 'Guardar Cambios' : 'Guardar Avance'}
        </button>
      </div>
    </div>
  );
};
