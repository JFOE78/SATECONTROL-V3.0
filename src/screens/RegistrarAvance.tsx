import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, PlusCircle, Trash2, Check, X, Camera, Image as ImageIcon, Pencil, Save, Sun, Cloud, CloudRain, Thermometer, AlertTriangle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Produccion, Avance } from "../types";
import { BLOQUE_DIMENSIONS, RENDIMIENTOS_EQUIPO, OPERARIOS } from "../constants";

export const RegistrarAvance: React.FC<{ initialAvance?: Avance | null, onCancel: () => void }> = ({ initialAvance, onCancel }) => {
  const { 
    selectedObraId, 
    obras, 
    itemsSate, 
    operariosList, 
    avances, 
    setAvances, 
    notify, 
    calculateAvanceEconomics,
    vacaciones,
    setVacaciones
  } = useApp();
  
  const CUTOFF_DATE = "2026-05-06";
  const [fecha, setFecha] = useState(initialAvance?.fecha || (() => {
    const today = new Date().toISOString().split('T')[0];
    return today < CUTOFF_DATE ? CUTOFF_DATE : today;
  })());
  const [bloque, setBloque] = useState(initialAvance?.bloque || "");
  const [operarios, setOperarios] = useState<string[]>(initialAvance?.operariosPresentes || operariosList.map(o => o.nombre));
  const [operariosVacaciones, setOperariosVacaciones] = useState<string[]>(initialAvance?.operariosVacaciones || []);
  const [producciones, setProducciones] = useState<Produccion[]>(initialAvance?.produccion || []);
  const [fotos, setFotos] = useState<string[]>(initialAvance?.fotos || []);
  const [clima, setClima] = useState<string>(initialAvance?.clima || "despejado");
  const [motivoSinProduccion, setMotivoSinProduccion] = useState<string>(initialAvance?.motivoSinProduccion || "");
  
  // Formulario producción
  const [selectedItemId, setSelectedItemId] = useState<string>(Object.keys(itemsSate)[0] || "fase1");
  const [m2, setM2] = useState<string>("");
  const [porcentaje, setPorcentaje] = useState<string>("");
  const [editingProdIndex, setEditingProdIndex] = useState<number | null>(null);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState<{itemId: string, bloque: string} | null>(null);
  const [showBlockPrompt, setShowBlockPrompt] = useState<boolean>(false);
  const [tempBlock, setTempBlock] = useState("");

  // Auto-cargar las vacaciones planificadas del calendario para esta fecha
  useEffect(() => {
    if (!fecha) return;
    const normalize = (s: any) => (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Buscar si en sate_vacaciones para esta fecha hay operarios de vacaciones
    const matchingVacaciones = (vacaciones || [])
      .filter(v => v.fecha === fecha)
      .map(v => v.operario);
    
    if (matchingVacaciones.length > 0) {
      // Filtrar de los presentes y añadir a operariosVacaciones
      setOperariosVacaciones(prev => {
        const next = Array.from(new Set([...prev, ...matchingVacaciones]));
        return next;
      });
      setOperarios(prev => prev.filter(op => !matchingVacaciones.includes(op)));
    }
  }, [fecha, vacaciones]);

  // Calcular jornadas consumidas para el bloque/partida actual
  const statsLocal = useMemo(() => {
    if (!selectedObraId || !bloque || !selectedItemId) return { days: 0 };
    const itemsInAvances = (avances || [])
      .filter(a => a.obraId === selectedObraId)
      .reduce((map, a) => {
        const itemSet = new Set<string>();
        (a.produccion || []).forEach(p => {
          const b = (p.bloque || a.bloque || "").toString().trim();
          if (b === (bloque || "").toString().trim() && p.itemId === selectedItemId) {
            itemSet.add(p.itemId);
          }
        });
        if (itemSet.has(selectedItemId)) return map + 1;
        return map;
      }, 0);
    return { days: itemsInAvances };
  }, [avances, selectedObraId, bloque, selectedItemId]);

  const isOverBudget = useMemo(() => {
    const planned = RENDIMIENTOS_EQUIPO[selectedItemId];
    return planned && statsLocal.days >= planned;
  }, [selectedItemId, statsLocal.days]);

  // Auto-propuesta reactiva de porcentaje y metros debido a vacaciones o tipo de partida
  useEffect(() => {
    if (!selectedItemId) return;

    const baseDays = RENDIMIENTOS_EQUIPO[selectedItemId] || 8;
    const normalPercentage = 100 / baseDays;

    const normalize = (s: any) => (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const vacSet = new Set(operariosVacaciones.map(v => normalize(v)));

    let proposed = normalPercentage;

    const isMosquitoVac = vacSet.has(normalize("Mosquito"));
    const isDavidVac = vacSet.has(normalize("David"));
    const isJuanVac = vacSet.has(normalize("Juan"));
    const isAntonioVac = vacSet.has(normalize("Antonio"));
    const isJesulesVac = vacSet.has(normalize("Jesules"));

    if (selectedItemId === "fase1") {
      // Corcho Team: Mosquito, David
      if (isMosquitoVac || isDavidVac) {
        proposed = normalPercentage * 0.5; // 6.25%
      }
    } else {
      // Rest Team: Juan, Antonio, Jesules
      if (isJuanVac || isAntonioVac || isJesulesVac) {
        proposed = normalPercentage * (2/3); // Ej: 8.33% en vez de 12.5%
      }
    }

    const proposedString = proposed.toFixed(2);
    setPorcentaje(proposedString);

    const normalizedNum = (bloque || "").toString().toUpperCase().replace("BLOQUE", "").trim();
    const dimensions = BLOQUE_DIMENSIONS[normalizedNum] || BLOQUE_DIMENSIONS["DEFAULT"];
    const target = dimensions[selectedItemId];
    if (target) {
      const calculated = (proposed / 100) * target;
      setM2(calculated.toFixed(2));
    }
  }, [selectedItemId, operariosVacaciones, bloque]);

  const handlePorcentajeChange = (val: string) => {
    setPorcentaje(val);
    if (!val || isNaN(Number(val))) {
      setM2("");
      return;
    }
    const normalizedNum = (bloque || "").toString().toUpperCase().replace("BLOQUE", "").trim();
    const dimensions = BLOQUE_DIMENSIONS[normalizedNum] || BLOQUE_DIMENSIONS["DEFAULT"];
    const target = dimensions[selectedItemId];
    if (target) {
      const calculated = (Number(val) / 100) * target;
      setM2(calculated.toFixed(2));
    }
  };

  const handleM2Change = (val: string) => {
    setM2(val);
    // Calcular porcentaje inverso para mostrar feedback
    if (val && !isNaN(Number(val))) {
      const normalizedNum = (tempBlock || bloque || "").toString().toUpperCase().replace("BLOQUE", "").trim();
      const dimensions = BLOQUE_DIMENSIONS[normalizedNum] || BLOQUE_DIMENSIONS["DEFAULT"];
      const target = dimensions[selectedItemId];
      if (target) {
        const perc = (Number(val) / target) * 100;
        setPorcentaje(perc.toFixed(2));
      }
    } else {
      setPorcentaje("");
    }
  };

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
    
    // Antes de añadir, preguntamos el bloque
    setTempBlock(bloque || ""); 
    setShowBlockPrompt(true);
  };

  const confirmAddProd = () => {
    const finalBlock = tempBlock.trim() || "General";
    
    // Calcular si con esto llegamos al 100% para el aviso de cierre
    const normalizedNum = finalBlock.toUpperCase().replace("BLOQUE", "").trim();
    const targetM2 = BLOQUE_DIMENSIONS[normalizedNum]?. [selectedItemId] || BLOQUE_DIMENSIONS["DEFAULT"][selectedItemId] || 0;
    const currentM2InBlock = (avances || [])
      .filter(a => a.obraId === selectedObraId)
      .reduce((sum, a) => {
        return sum + (a.produccion || [])
          .filter(p => (p.bloque || a.bloque || "").toString().trim() === finalBlock.toString().trim() && p.itemId === selectedItemId)
          .reduce((s, p) => s + p.m2, 0);
      }, 0);

    const totalAfterAdd = currentM2InBlock + Number(m2);
    
    const newProd: Produccion = {
      itemId: selectedItemId,
      m2: Number(m2),
      bloque: finalBlock
    };
    
    if (editingProdIndex !== null) {
      const next = [...producciones];
      next[editingProdIndex] = newProd;
      setProducciones(next);
      setEditingProdIndex(null);
    } else {
      setProducciones([...producciones, newProd]);
      
      // Si llegamos al 99%+, mostrar aviso de cierre
      if (totalAfterAdd >= (targetM2 * 0.99) && targetM2 > 0) {
        setShowCompletionPrompt({ itemId: selectedItemId, bloque: finalBlock });
      }
    }
    
    // Actualizamos el bloque global si estaba vacío para agilizar futuros registros
    if (!bloque) setBloque(finalBlock);
    
    setM2("");
    setPorcentaje("");
    setShowBlockPrompt(false);
  };

  const handleCloseAndNext = () => {
    if (!showCompletionPrompt) return;
    const currentNum = parseInt(showCompletionPrompt.bloque.replace(/\D/g, ""));
    if (!isNaN(currentNum)) {
      setBloque((currentNum + 1).toString());
    }
    setShowCompletionPrompt(null);
    notify(`Partida cerrada.`, "success");
  };

  const autofillM2 = () => {
    const normalizedNum = (bloque || "").toString().toUpperCase().replace("BLOQUE", "").trim();
    const dimensions = BLOQUE_DIMENSIONS[normalizedNum] || BLOQUE_DIMENSIONS["DEFAULT"];
    const target = dimensions[selectedItemId];
    if (target) {
      setM2(target.toString());
      notify(`Cargados metros reales: ${target}m²`, "info");
    } else {
      notify("No hay medidas predefinidas", "error");
    }
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
    if (fecha < "2026-05-06") {
      notify("No se permiten registros anteriores al cierre de ciclo (05/05/2026)", "error");
      return;
    }

    const finalGlobalBlock = isSinProduccion 
      ? "Sin actividad" 
      : (Array.from(new Set(producciones.map(p => p.bloque))).length > 1 ? "Varios" : bloque);

    const newAvance: Avance = {
      id: isNew ? crypto.randomUUID() : initialAvance!.id,
      fecha,
      obraId: selectedObraId,
      bloque: finalGlobalBlock,
      operariosPresentes: operarios,
      operariosVacaciones: operariosVacaciones,
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

    // Sincronizar el listado general de vacaciones planificadas con lo registrado hoy
    const otherVacaciones = (vacaciones || []).filter(v => v.fecha !== fecha);
    const addedVacaciones = operariosVacaciones.map(opName => ({
      id: `vac-${opName}-${fecha}-${Date.now()}`,
      operario: opName,
      fecha: fecha,
      tipo: "Disfrutados y Pagados" as const
    }));
    setVacaciones([...otherVacaciones, ...addedVacaciones]);

    setAvances(prev => {
      if (isNew) {
        // Prevención de duplicados accidentales: 
        // Si ya existe un registro exactamente igual (misma obra, misma fecha, mismo bloque), 
        // lo actualizamos en vez de añadir uno nuevo.
        const existingIdx = prev.findIndex(a => 
          a.obraId === selectedObraId && 
          a.fecha === fecha && 
          (a.bloque || "").trim().toLowerCase() === (bloque || "").trim().toLowerCase()
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
      {/* MODAL PREGUNTAR BLOQUE */}
      {showBlockPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} className="text-blue-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">¿A qué bloque pertenece?</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Es obligatorio asignar un bloque para cada partida</p>
              </div>
              
              <div className="space-y-4">
                <input 
                  type="text"
                  autoFocus
                  placeholder="Ej: B-13 o General"
                  value={tempBlock}
                  onChange={(e) => setTempBlock(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center font-black text-slate-800 dark:text-white outline-none border-2 border-transparent focus:border-blue-500 uppercase"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setTempBlock("General"); }}
                    className="py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500"
                  >
                    Usar General
                  </button>
                  <button 
                    onClick={() => { setTempBlock(bloque); }}
                    className="py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500"
                  >
                    Usar "{bloque || '...'}"
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowBlockPrompt(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black py-4 rounded-2xl uppercase text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmAddProd}
                    className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CIERRE PARTIDA */}
      {showCompletionPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Check size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                  {itemsSate[showCompletionPrompt.itemId]?.nombre} Finalizado
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Has completado el 100% en el Bloque {showCompletionPrompt.bloque}.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <button 
                  onClick={handleCloseAndNext}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  Cerrar y cambiar de bloque
                </button>
                <button 
                  onClick={() => setShowCompletionPrompt(null)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-black py-3 rounded-2xl text-[10px] uppercase"
                >
                  Mantener en Bloque {showCompletionPrompt.bloque}
                </button>
              </div>
           </div>
        </div>
      )}
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

      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Control de Asistencia y Cuadrante</label>
          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">Bolsa Vacaciones: 10d</span>
        </div>
        
        <div className="divide-y divide-slate-50 dark:divide-slate-800/10">
          {operariosList.map(op => {
            const isPresent = operarios.includes(op.nombre);
            const isVacation = operariosVacaciones.includes(op.nombre);
            const isAbsent = !isPresent && !isVacation;

            // Calcular días disfrutados:
            // Días guardados en sate_vacaciones excluyendo el actual para evitar duplicar si ya se editó
            const otherDaysCount = (vacaciones || [])
              .filter(v => v.operario === op.nombre && v.fecha !== fecha)
              .length;
            const enjoyedDays = otherDaysCount + (isVacation ? 1 : 0);
            const remainingDays = Math.max(0, 10 - enjoyedDays);

            return (
              <div key={op.nombre} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase">{op.nombre}</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">({op.coste}€/día)</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 animate-in fade-in duration-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isPresent ? 'bg-blue-500' : isVacation ? 'bg-purple-500' : 'bg-rose-500'
                    }`} />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Bolsa: <strong className="text-slate-600 dark:text-slate-200">{enjoyedDays}</strong>/10d disfrutados
                      <span className="mx-1 text-slate-300">|</span>
                      <strong className="text-slate-500 dark:text-slate-300">{remainingDays}d</strong> restantes
                    </span>
                  </div>
                </div>

                {/* Segment Selector */}
                <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto max-w-xs self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOperarios(prev => Array.from(new Set([...prev, op.nombre])));
                      setOperariosVacaciones(prev => prev.filter(v => v !== op.nombre));
                    }}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                      isPresent 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                    }`}
                  >
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (remainingDays <= 0 && !isVacation) {
                        notify(`Límite de 10 días superado para ${op.nombre}`, "error");
                        return;
                      }
                      setOperariosVacaciones(prev => Array.from(new Set([...prev, op.nombre])));
                      setOperarios(prev => prev.filter(v => v !== op.nombre));
                    }}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                      isVacation 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-100 dark:shadow-none' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                    }`}
                  >
                    Vacaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOperarios(prev => prev.filter(v => v !== op.nombre));
                      setOperariosVacaciones(prev => prev.filter(v => v !== op.nombre));
                    }}
                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                      isAbsent 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-100 dark:shadow-none' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                    }`}
                  >
                    Ausente
                  </button>
                </div>
              </div>
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Porcentaje %</label>
                <input 
                  type="number" 
                  placeholder="%" 
                  value={porcentaje}
                  onChange={(e) => handlePorcentajeChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-blue-600 dark:text-blue-400 outline-none"
                />
              </div>
              <div className="relative">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Metros Reales</label>
                <input 
                  type="number" 
                  placeholder="M2 / ML" 
                  value={m2}
                  onChange={(e) => handleM2Change(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-slate-800 dark:text-white outline-none"
                />
                <button 
                  onClick={autofillM2}
                  className="absolute right-2 top-[34px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg text-[7px] font-black uppercase border border-blue-100 dark:border-blue-800/50 active:scale-90 transition-transform"
                >
                  100%
                </button>
              </div>
            </div>

            {m2 && !isNaN(Number(m2)) && (
              <div className="space-y-2">
                {isOverBudget && (
                  <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2 animate-pulse">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <span className="text-[10px] font-black text-rose-600 uppercase">
                      ¡Atención! Bloque {bloque} - {itemsSate[selectedItemId]?.nombre} excedido
                    </span>
                  </div>
                )}
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex justify-between items-center border border-blue-100 dark:border-blue-800/30">
                  <span className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                    <Sun size={12} /> Cálculo por Rendimiento ({operarios.length} Op.):
                  </span>
                  <span className="text-[10px] font-black text-blue-600">
                    {porcentaje}% ({ (Number(porcentaje)/100 * (RENDIMIENTOS_EQUIPO[selectedItemId] || 0)).toFixed(2) } jorn.)
                  </span>
                </div>
                <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex justify-between items-center border border-emerald-100 dark:border-emerald-800/30">
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Valor Económico Estimado:</span>
                  <span className="text-sm font-black text-emerald-600">
                    {((Number(m2) || 0) * (itemsSate[selectedItemId]?.precio || 0)).toFixed(2)}€
                  </span>
                </div>
              </div>
            )}

            <button 
              onClick={handleAddProd}
              className={`w-full ${editingProdIndex !== null ? 'bg-emerald-500' : 'bg-blue-600'} text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest`}
            >
              {editingProdIndex !== null ? <><Save size={20} /> Actualizar Partida</> : <><PlusCircle size={20} /> Añadir a este parte</>}
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
          {producciones.map((p, idx) => {
            const normalizedNum = (p.bloque || "").toString().toUpperCase().replace("BLOQUE", "").trim();
            const dimensions = BLOQUE_DIMENSIONS[normalizedNum] || BLOQUE_DIMENSIONS["DEFAULT"];
            const target = dimensions[p.itemId] || 1;
            const percentage = (p.m2 / target) * 100;
            const progressJornadas = (percentage / 100) * (RENDIMIENTOS_EQUIPO[p.itemId] || 0);

            return (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none">{itemsSate[p.itemId]?.nombre || 'Desconocido'}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                    {p.m2} m² <span className="mx-1 text-slate-300">|</span> {progressJornadas.toFixed(2)} jorn. <span className="mx-1 text-slate-300">|</span> Bloque {p.bloque}
                  </p>
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
            );
          })}
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
