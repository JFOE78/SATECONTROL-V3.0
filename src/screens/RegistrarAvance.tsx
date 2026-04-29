import React, { useState, useEffect } from "react";
import { ChevronLeft, PlusCircle, Trash2, Check, X, Camera, Image as ImageIcon, Pencil, Save, Sun, Cloud, CloudRain, Thermometer } from "lucide-react";
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
  const [fotos, setFotos] = useState<string[]>(initialAvance?.fotos || []);
  const [clima, setClima] = useState<string>(initialAvance?.clima || "despejado");
  const [motivoSinProduccion, setMotivoSinProduccion] = useState<string>(initialAvance?.motivoSinProduccion || "");
  
  // Formulario producción
  const [selectedItemId, setSelectedItemId] = useState<string>(Object.keys(itemsSate)[0] || "fase1");
  const [m2, setM2] = useState<string>("");
  const [editingProdIndex, setEditingProdIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file as unknown as Blob);
    });
  };

  const removeFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
  };

  const handleAddProd = () => {
    if (!m2 || isNaN(Number(m2))) return;
    const newProd: Produccion = {
      itemId: selectedItemId,
      m2: Number(m2),
      bloque: bloque || "General"
    };
    
    if (editingProdIndex !== null) {
      const next = [...producciones];
      next[editingProdIndex] = newProd;
      setProducciones(next);
      setEditingProdIndex(null);
    } else {
      setProducciones([...producciones, newProd]);
    }
    
    setM2("");
  };

  const startEditProd = (index: number) => {
    const p = producciones[index];
    setSelectedItemId(p.itemId);
    setM2(p.m2.toString());
    setEditingProdIndex(index);
    // Scroll to the addition section
    window.scrollTo({ top: 300, behavior: 'smooth' });
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
    const isSinProduccion = producciones.length === 0 && motivoSinProduccion;

    if (!bloque && !isSinProduccion) {
      notify("El bloque es obligatorio", "error");
      return;
    }
    if (producciones.length === 0 && !motivoSinProduccion) {
      notify("Añade al menos una partida de producción o indica el motivo de falta de asistencia", "error");
      return;
    }

    const isNew = !initialAvance || !initialAvance.id;

    const newAvance: Avance = {
      id: isNew ? crypto.randomUUID() : initialAvance!.id,
      fecha,
      obraId: selectedObraId,
      bloque: isSinProduccion ? "Sin actividad" : bloque,
      operariosPresentes: operarios,
      produccion: producciones,
      fotos,
      clima,
      motivoSinProduccion: producciones.length === 0 ? motivoSinProduccion : undefined,
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
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-2">Estado del Tiempo (Clima)</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'despejado', icon: <Sun size={18} />, label: 'Sol' },
            { id: 'nublado', icon: <Cloud size={18} />, label: 'Nubes' },
            { id: 'lluvia', icon: <CloudRain size={18} />, label: 'Lluvia' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setClima(c.id)}
              className={`p-4 rounded-2xl flex flex-col items-center gap-1 transition-all border-2 ${
                clima === c.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' 
                  : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'
              }`}
            >
              {c.icon}
              <span className="text-[8px] font-black uppercase">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

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
        <div className="flex justify-between items-center px-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos / Archivo</label>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl cursor-pointer active:scale-95 transition-all text-[10px] font-black uppercase">
            <Camera size={14} /> Añadir Foto
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {fotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                <img src={f} alt="avance" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeFoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] gap-2">
            <ImageIcon className="text-slate-200 dark:text-slate-800" size={32} />
            <p className="text-[10px] font-black text-slate-300 uppercase">Sin fotos adjuntas</p>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Añadir Producción</label>
        
        {producciones.length === 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] space-y-3">
             <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase text-center px-4">
               No has añadido producción. Si no se ha trabajado, indica el motivo:
             </p>
             <select 
               value={motivoSinProduccion}
               onChange={(e) => setMotivoSinProduccion(e.target.value)}
               className="w-full p-4 bg-white dark:bg-slate-800 rounded-2xl text-xs font-black uppercase text-slate-800 dark:text-white border-none shadow-sm focus:ring-2 focus:ring-amber-500"
             >
               <option value="">-- Seleccionar Motivo --</option>
               <option value="lluvia">Día de Lluvia</option>
               <option value="material">Falta de Material</option>
               <option value="festivo">Festivo / Local</option>
               <option value="personal">Asunto Personal</option>
               <option value="otros">Otros Motivos</option>
             </select>
          </div>
        )}

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
              className={`${editingProdIndex !== null ? 'bg-emerald-500' : 'bg-blue-600'} text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center`}
            >
              {editingProdIndex !== null ? <Save size={24} /> : <PlusCircle size={24} />}
            </button>
          </div>
          {editingProdIndex !== null && (
            <button 
              onClick={() => {
                setEditingProdIndex(null);
                setM2("");
              }}
              className="text-[10px] font-black text-slate-400 uppercase text-center w-full mt-1"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="space-y-2 mt-4">
          {producciones.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent">
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none">{itemsSate[p.itemId]?.nombre || 'Desconocido'}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{p.m2} m² en {p.bloque}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => startEditProd(idx)} 
                  className={`p-2 transition-colors ${editingProdIndex === idx ? 'text-emerald-500' : 'text-blue-500'}`}
                >
                  <Pencil size={18} />
                </button>
                <button onClick={() => removeProd(idx)} className="text-red-500 p-2"><Trash2 size={18} /></button>
              </div>
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
