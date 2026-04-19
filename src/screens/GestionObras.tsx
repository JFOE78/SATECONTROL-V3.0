import React, { useState } from "react";
import { ChevronLeft, Edit2, Trash2, PlusCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Obra } from "../types";

export const GestionObras: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { obras, setObras, notify, selectedObraId, setSelectedObraId } = useApp();
  const [nombre, setNombre] = useState("");
  const [numBloques, setNumBloques] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    if (!nombre.trim()) return;
    if (editingId) {
      setObras(obras.map(o => o.id === editingId ? { ...o, nombre: nombre.trim(), numBloques } : o));
      setEditingId(null);
      notify("Obra actualizada", "success");
    } else {
      const newObra: Obra = { id: crypto.randomUUID(), nombre: nombre.trim(), numBloques };
      setObras([...obras, newObra]);
      notify("Obra añadida", "success");
    }
    setNombre("");
    setNumBloques(1);
  };

  const startEdit = (o: Obra) => {
    setEditingId(o.id);
    setNombre(o.nombre);
    setNumBloques(o.numBloques);
  };

  const deleteObra = (id: string) => {
    if (obras.length <= 1) return;
    if (confirm("¿Borrar obra?")) {
      setObras(obras.filter(o => o.id !== id));
      if (selectedObraId === id) setSelectedObraId(obras[0].id);
      notify("Obra eliminada", "success");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Obras</h2>
        <div className="w-12 h-12" />
      </header>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
        <input 
          type="text" 
          placeholder="Nombre de la obra" 
          value={nombre} 
          onChange={e => setNombre(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none"
        />
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Bloques</span>
          <div className="flex items-center gap-4">
            <button onClick={() => setNumBloques(Math.max(1, numBloques-1))} className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl font-black">-</button>
            <span className="font-black">{numBloques}</span>
            <button onClick={() => setNumBloques(numBloques+1)} className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl font-black">+</button>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={!nombre.trim()}
          className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest"
        >
          {editingId ? "Guardar Cambios" : "Añadir Obra"}
        </button>
      </section>

      <div className="space-y-2">
        {obras.map(o => (
          <div key={o.id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
             <div onClick={() => startEdit(o)}>
               <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm flex items-center gap-2">{o.nombre} <Edit2 size={12} className="text-blue-400" /></h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase">{o.numBloques} Bloques</p>
             </div>
             <button onClick={() => deleteObra(o.id)} className="p-3 text-red-500"><Trash2 size={20} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};
