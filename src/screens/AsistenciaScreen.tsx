import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Calendar, Check, X, Users, Calculator, AlertTriangle, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Avance, Vacacion } from "../types";
import { BLOQUE_DIMENSIONS, RENDIMIENTOS_EQUIPO } from "../constants";

export const AsistenciaScreen: React.FC<{ onBack: () => void, onNavigate: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const {
    selectedObraId,
    obras,
    operariosList,
    avances,
    setAvances,
    vacaciones,
    setVacaciones,
    calculateAvanceEconomics,
    notify
  } = useApp();

  const CUTOFF_DATE = "2026-05-06";
  const [fecha, setFecha] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today < CUTOFF_DATE ? CUTOFF_DATE : today;
  });

  const [activeBlock, setActiveBlock] = useState(() => {
    return localStorage.getItem("sate_active_block") || "11";
  });

  // Safe normalization helper
  const normalize = (s: any) =>
    (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // State mapping operario name to attendance state: 'presente' or 'ausente'
  const [asistencia, setAsistencia] = useState<Record<string, 'presente' | 'ausente'>>({});

  // Synchronize attendance state from existing database entries (Avances or Vacaciones) or default to all present
  useEffect(() => {
    if (!operariosList || operariosList.length === 0) return;

    // Check if there is an existing Avance for this date, obra and block
    const existingAvance = (avances || []).find(a => 
      a.obraId === selectedObraId && 
      a.fecha === fecha && 
      (a.bloque || "").trim() === activeBlock
    );

    const nextAsistencia: Record<string, 'presente' | 'ausente'> = {};

    if (existingAvance) {
      // Initialize based on saved record
      const presentSet = new Set((existingAvance.operariosPresentes || []).map(normalize));
      const absentSet = new Set((existingAvance.operariosVacaciones || []).map(normalize));

      operariosList.forEach(op => {
        const norm = normalize(op.nombre);
        if (presentSet.has(norm)) {
          nextAsistencia[op.nombre] = 'presente';
        } else if (absentSet.has(norm)) {
          nextAsistencia[op.nombre] = 'ausente';
        } else {
          nextAsistencia[op.nombre] = 'presente';
        }
      });
    } else {
      // Default behavior: check if registered in vacaciones on this exact day
      const dailyVacationSet = new Set(
        (vacaciones || [])
          .filter(v => v.fecha === fecha)
          .map(v => normalize(v.operario))
      );

      operariosList.forEach(op => {
        const norm = normalize(op.nombre);
        if (dailyVacationSet.has(norm)) {
          nextAsistencia[op.nombre] = 'ausente';
        } else {
          nextAsistencia[op.nombre] = 'presente';
        }
      });
    }

    setAsistencia(nextAsistencia);
  }, [fecha, selectedObraId, activeBlock, avances, vacaciones, operariosList]);

  // Handle saving the block selection to local storage
  useEffect(() => {
    localStorage.setItem("sate_active_block", activeBlock);
  }, [activeBlock]);

  // Detect vacation count from existing vacation logs (initial 10 days)
  const getOperarioBolsa = (nombre: string) => {
    const opClean = normalize(nombre);
    const totalEnjoyed = (vacaciones || []).filter(v => normalize(v.operario) === opClean).length;
    return {
      enjoyed: totalEnjoyed,
      remaining: Math.max(0, 10 - totalEnjoyed)
    };
  };

  const presentUsers = useMemo(() => {
    return Object.keys(asistencia).filter(nombre => asistencia[nombre] === 'presente');
  }, [asistencia]);

  const absentUsers = useMemo(() => {
    return Object.keys(asistencia).filter(nombre => asistencia[nombre] === 'ausente');
  }, [asistencia]);

  const computedM2 = useMemo(() => {
    return presentUsers.length * 11;
  }, [presentUsers]);

  const dailyCost = useMemo(() => {
    return presentUsers.reduce((sum, name) => {
      const op = operariosList.find(o => o.nombre === name);
      return sum + (op?.coste || 0);
    }, 0);
  }, [presentUsers, operariosList]);

  const handleToggle = (nombre: string) => {
    setAsistencia(prev => ({
      ...prev,
      [nombre]: prev[nombre] === 'presente' ? 'ausente' : 'presente'
    }));
  };

  const handleSave = () => {
    if (!selectedObraId) {
      notify("No hay ninguna obra seleccionada", "error");
      return;
    }

    if (presentUsers.length === 0 && absentUsers.length === 0) {
      notify("Debe haber operarios registrados", "error");
      return;
    }

    // 1. Create automatic Avance entity
    const newAvance: Avance = {
      id: `avance-auto-${fecha}-${Date.now()}`,
      fecha,
      obraId: selectedObraId,
      bloque: activeBlock,
      operariosPresentes: presentUsers,
      operariosVacaciones: absentUsers,
      produccion: computedM2 > 0 ? [
        {
          itemId: "fase1", // Represents Corcho + Tacos (the primary phase requested)
          m2: computedM2,
          bloque: activeBlock
        }
      ] : [],
      resumen: { ingresos: 0, costeManoObra: 0, beneficio: 0, beneficioPorOperario: 0 },
      motivoSinProduccion: computedM2 === 0 ? "Sin asistencia de operarios" : undefined
    };

    // Calculate daily profit & hand over the values
    const econ = calculateAvanceEconomics(newAvance);
    newAvance.resumen = {
      ingresos: econ.ingresos,
      costeManoObra: econ.costeManoObra,
      beneficio: econ.beneficio,
      beneficioPorOperario: econ.beneficioPorOperario
    };

    // 2. Synchronize vacation pool subtraction
    // We filter out any automated vacations on this specific date to overwrite them seamlessly
    const otherVacaciones = (vacaciones || []).filter(v => v.fecha !== fecha);
    const addedVacaciones: Vacacion[] = absentUsers.map(nombre => ({
      id: `vac-${nombre}-${fecha}-${Date.now()}`,
      operario: nombre,
      fecha: fecha,
      tipo: "Disfrutados y Pagados"
    }));

    setVacaciones([...otherVacaciones, ...addedVacaciones]);

    // 3. Save Avance to global state with duplicate elimination (per date / block)
    setAvances(prev => {
      const filtered = prev.filter(a => !(a.obraId === selectedObraId && a.fecha === fecha && (a.bloque || "").trim() === activeBlock));
      return [...filtered, newAvance];
    });

    notify(`Asistencia y ${computedM2}m² registrados para el Bloque ${activeBlock}`, "success");
    onBack(); // Navigate back to central screen
  };

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-95 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Asistencia Diaria</h2>
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl flex items-center justify-center">
          <Users size={22} />
        </div>
      </header>

      {/* INSTRUCTIONS */}
      <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/40 rounded-[2rem] p-5 flex gap-4 items-start">
        <div className="bg-blue-500 rounded-2xl p-2.5 text-white">
          <Calculator size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">Producción Automatizada</h4>
          <p className="text-[10px] text-blue-700 dark:text-blue-400/80 leading-relaxed uppercase font-semibold">
            Cada operario presente suma exactamente <strong className="text-blue-900 dark:text-white">11 m² de Corcho+Mortero</strong> al bloque activo seleccionado. Las ausencias restan días de su bolsa de vacaciones.
          </p>
        </div>
      </div>

      {/* DATE & BLOCK SELECTION */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Fecha del Parte</label>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 rounded-2xl p-3.5 border border-transparent focus-within:border-blue-500">
              <Calendar size={16} className="text-slate-400 mr-2" />
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 dark:text-white outline-none w-full"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Bloque Activo</label>
            <select
              value={activeBlock}
              onChange={e => setActiveBlock(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 font-black text-xs text-slate-700 dark:text-white border border-transparent outline-none uppercase"
            >
              {Array.from({ length: 20 }, (_, i) => (i + 1).toString()).map(b => (
                <option key={b} value={b}>Bloque {b}</option>
              ))}
              <option value="General">General / Otros</option>
            </select>
          </div>
        </div>
      </section>

      {/* OPERARIOS LIST */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paso de Lista de la Cuadrilla</label>
          <span className="text-[9px] font-black uppercase text-slate-400">Total: {operariosList.length}</span>
        </div>

        <div className="space-y-3">
          {operariosList.map(op => {
            const isPresent = asistencia[op.nombre] !== 'ausente';
            const bolsa = getOperarioBolsa(op.nombre);

            return (
              <div
                key={op.nombre}
                onClick={() => handleToggle(op.nombre)}
                className={`p-5 rounded-[2.2rem] border transition-all duration-300 flex items-center justify-between cursor-pointer active:scale-99 ${
                  isPresent
                    ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/30 shadow-sm shadow-emerald-500/5'
                    : 'bg-red-50/20 dark:bg-red-950/10 border-red-100 dark:border-red-950/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base transition-colors duration-300 ${
                    isPresent
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                      : 'bg-red-50 dark:bg-red-950/50 text-red-500'
                  }`}>
                    {op.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase leading-none mb-1.5">{op.nombre}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">Coste: {op.coste}€/día</span>
                      <span className="text-slate-300">•</span>
                      <span className={`text-[10px] font-black uppercase ${bolsa.remaining <= 3 ? 'text-amber-500' : 'text-purple-500'}`}>
                        Bolsa: {bolsa.remaining} días lib.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 border ${
                    isPresent
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 border-red-200/50'
                  }`}>
                    {isPresent ? (
                      <>
                        <Check size={12} strokeWidth={3} /> PRESENTE (+11m²)
                      </>
                    ) : (
                      <>
                        <X size={12} strokeWidth={3} /> VACACIONES (-1 bolsa)
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPUTATION PREVIEW GENERAL */}
      <section className="bg-slate-900 text-white rounded-[2.5rem] p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <ShieldCheck size={16} className="text-emerald-400" />
          <h3 className="text-[10px] font-black uppercase tracking-widest">Resumen Automático del Día</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-white/50 uppercase tracking-wider block mb-1">M² Totales a Sumar</label>
            <p className="text-2xl font-black text-emerald-400">{computedM2} m²</p>
            <p className="text-[8px] font-semibold text-white/40 uppercase mt-1">En Bloque {activeBlock} • Corcho+Mortero</p>
          </div>
          <div>
            <label className="text-[9px] font-black text-white/50 uppercase tracking-wider block mb-1">Coste Mano de Obra</label>
            <p className="text-2xl font-black text-red-400">{dailyCost}€</p>
            <p className="text-[8px] font-semibold text-white/40 uppercase mt-1">Basado en {presentUsers.length} presentes</p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20"
          >
            <Check size={18} strokeWidth={3} /> Guardar Asistencia y Avance
          </button>
        </div>
      </section>
    </div>
  );
};
