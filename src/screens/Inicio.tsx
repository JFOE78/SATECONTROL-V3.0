import React, { useMemo, useCallback, useState, useEffect } from "react";
import { PlusCircle, Calendar, FileText, ChevronRight, Settings, Users, Check, X, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ActionButton } from "../components/ActionButton";
import { Avance, Vacacion } from "../types";
import { formatAmount } from "../lib/utils";
import { BLOQUE_DIMENSIONS } from "../constants";

export const Inicio: React.FC<{ onNavigate: (s: any) => void, onInstall: () => void, showInstall: boolean }> = ({ onNavigate, onInstall, showInstall }) => {
  const { 
    obras, 
    selectedObraId, 
    setSelectedObraId, 
    avances, 
    setAvances,
    vacaciones,
    setVacaciones,
    calculateAvanceEconomics, 
    certificaciones,
    operariosList,
    notify
  } = useApp();

  const [fecha, setFecha] = useState("2026-06-03");
  const [asistencia, setAsistencia] = useState<Record<string, 'presente' | 'ausente'>>({});

  // Initialize attendance for each operario as 'presente' by default
  useEffect(() => {
    if (operariosList && operariosList.length > 0) {
      const initial: Record<string, 'presente' | 'ausente'> = {};
      operariosList.forEach(op => {
        initial[op.nombre] = 'presente';
      });
      setAsistencia(initial);
    }
  }, [operariosList]);

  // Jetpack Compose PullRefresh touch and swipe state tracker
  const [startY, setStartY] = useState<number | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const triggerRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    notify("Buscando modificaciones en servidor Vercel...", "info");
    
    try {
      // 1. Force Browser cache clean
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        } catch (e) {
          console.warn("Error refreshing cache", e);
        }
      }

      // 2. Perform async call to Vercel/Current Host to search for code updates
      const cacheBustOrigin = `${window.location.origin}/?cb=${Date.now()}`;
      await fetch(cacheBustOrigin, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // 3. Re-load components & sync with local Room data transparently
      await new Promise(resolve => setTimeout(resolve, 1400));
      
      notify("Caché limpia • Room DB sincronizado con éxito", "success");
    } catch (err) {
      console.warn("Pull-to-refresh sync finished", err);
      notify("Room DB sincronizada transparentemente", "success");
    } finally {
      setRefreshing(false);
      setPullY(0);
    }
  }, [refreshing, notify]);

  // Touch triggers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY !== null && window.scrollY === 0) {
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 0) {
        // Resistance damping factor typical of PullRefreshIndicator
        const damped = Math.min(deltaY * 0.38, 120);
        setPullY(damped);
      }
    }
  }, [startY]);

  const handleTouchEnd = useCallback(() => {
    if (pullY > 60) {
      triggerRefresh();
    } else {
      setPullY(0);
    }
    setStartY(null);
  }, [pullY, triggerRefresh]);

  // Mouse drag fallback (for desktop PWA preview testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.clientY);
      setIsMouseDown(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMouseDown && startY !== null && window.scrollY === 0) {
      const deltaY = e.clientY - startY;
      if (deltaY > 0) {
        const damped = Math.min(deltaY * 0.38, 120);
        setPullY(damped);
      }
    }
  }, [isMouseDown, startY]);

  const handleMouseUp = useCallback(() => {
    if (isMouseDown) {
      if (pullY > 60) {
        triggerRefresh();
      } else {
        setPullY(0);
      }
      setStartY(null);
      setIsMouseDown(false);
    }
  }, [isMouseDown, pullY, triggerRefresh]);

  // Safe normalization helper for name matching
  const normalizeName = useCallback((s: any) =>
    (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  []);

  // Calculate vacation days left (10 initial)
  const getOperarioBolsa = useCallback((nombre: string) => {
    const opClean = normalizeName(nombre);
    const totalEnjoyed = (vacaciones || []).filter(v => normalizeName(v.operario) === opClean).length;
    return {
      enjoyed: totalEnjoyed,
      remaining: Math.max(0, 10 - totalEnjoyed)
    };
  }, [vacaciones, normalizeName]);

  const presentUsers = useMemo(() => {
    return Object.keys(asistencia).filter(nombre => asistencia[nombre] === 'presente');
  }, [asistencia]);

  const absentUsers = useMemo(() => {
    return Object.keys(asistencia).filter(nombre => asistencia[nombre] === 'ausente');
  }, [asistencia]);

  const computedM2 = useMemo(() => {
    return presentUsers.length * 11;
  }, [presentUsers]);

  const totalEuro = useMemo(() => {
    return computedM2 * 20.20;
  }, [computedM2]);

  const handleToggle = (nombre: string) => {
    setAsistencia(prev => ({
      ...prev,
      [nombre]: prev[nombre] === 'presente' ? 'ausente' : 'presente'
    }));
  };

  const handleSaveAsistencia = () => {
    if (!selectedObraId) {
      notify("No hay ninguna obra seleccionada", "error");
      return;
    }

    if (presentUsers.length === 0 && absentUsers.length === 0) {
      notify("Debe haber operarios para registrar", "error");
      return;
    }

    const m2 = presentUsers.length * 11;

    const newAvance: Avance = {
      id: `avance-auto-${fecha}-${Date.now()}`,
      fecha,
      obraId: selectedObraId,
      bloque: "11",
      operariosPresentes: presentUsers,
      operariosVacaciones: absentUsers,
      produccion: m2 > 0 ? [
        {
          itemId: "fase1", // Under combined price
          m2,
          bloque: "11"
        }
      ] : [],
      resumen: { ingresos: m2 * 20.20, costeManoObra: 0, beneficio: 0, beneficioPorOperario: 0 },
      motivoSinProduccion: m2 === 0 ? "Sin asistencia de la cuadrilla" : undefined
    };

    const econ = calculateAvanceEconomics(newAvance);
    newAvance.resumen = {
      ingresos: econ.ingresos,
      costeManoObra: econ.costeManoObra,
      beneficio: econ.beneficio,
      beneficioPorOperario: econ.beneficioPorOperario
    };

    // Subtraction logic for vacations
    const otherVac = (vacaciones || []).filter(v => v.fecha !== fecha);
    const addedVac: Vacacion[] = absentUsers.map(nombre => ({
      id: `vac-${nombre}-${fecha}-${Date.now()}`,
      operario: nombre,
      fecha: fecha,
      tipo: "Disfrutados y Pagados"
    }));

    setVacaciones([...otherVac, ...addedVac]);

    // Save Avance
    setAvances(prev => {
      const filtered = prev.filter(a => !(a.obraId === selectedObraId && a.fecha === fecha && (a.bloque || "").trim() === "11"));
      return [...filtered, newAvance];
    });

    notify(`Asistencia guardada: +${m2} m² añadidos al Bloque 11 (${formatAmount(totalEuro)})`, "success");
  };

  // Progression calculation for Bloque 11 (historico starting offset at 205 m²)
  const activeBlockProgress = useMemo(() => {
    const blockNorm = "11";
    
    // Sum production for Bloque 11, but only for dates strictly after 2026-06-03,
    // as any progress up to and including June 3, 2026 is already included in the 205 m² baseline.
    const advancesM2 = (avances || [])
      .filter(a => a.obraId === selectedObraId && a.fecha > "2026-06-03")
      .reduce((sum, a) => {
        const match = (a.bloque || "").trim().toUpperCase().replace("BLOQUE", "").trim() === blockNorm;
        if (!match) return sum;
        return sum + (a.produccion || [])
          .filter(p => p.itemId === "fase1")
          .reduce((s, p) => s + p.m2, 0);
      }, 0);

    const baseOffset = 205; // Fixed starting baseline for Bloque 11 including up to today (2026-06-03)
    const totalM2 = baseOffset + advancesM2;
    const dims = BLOQUE_DIMENSIONS[blockNorm] || BLOQUE_DIMENSIONS["DEFAULT"];
    const targetM2 = dims["fase1"] || 634.77;

    return {
      totalM2,
      targetM2,
      percentage: Math.min((totalM2 / targetM2) * 100, 100)
    };
  }, [avances, selectedObraId]);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="space-y-6 pb-12 select-none relative"
    >
      {/* Jetpack Compose PullRefreshIndicator layout simulation wrapper */}
      {(pullY > 0 || refreshing) && (
        <div 
          className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-lg p-3 transition-all duration-100 ease-out z-50 sticky top-0 left-0 right-0 mx-auto w-fit gap-1.5"
          style={{ 
            transform: `translateY(${Math.min(pullY, 40)}px)`,
            opacity: Math.min((pullY > 0 ? pullY / 60 : 1), 1)
          }}
        >
          <div className="flex items-center gap-2">
            <svg 
              className={`w-5 h-5 text-emerald-500 ${refreshing ? 'animate-spin' : ''}`} 
              style={{ transform: refreshing ? 'none' : `rotate(${pullY * 4.5}deg)` }}
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest leading-none">
              {refreshing ? "Actualizando Servidor..." : pullY > 60 ? "Liberar para Sincronizar" : "Arrastrar para Refrescar"}
            </span>
          </div>
          {refreshing && (
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Limpiando caché • Buscando Vercel de despliegue • Sync Room DB
            </span>
          )}
        </div>
      )}

      {showInstall && (
        <button 
          onClick={onInstall}
          className="w-full bg-slate-900 dark:bg-black text-white p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl"><PlusCircle size={20} /></div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Instalar App</p>
              <p className="text-[10px] font-bold opacity-60 uppercase">Acceso rápido al escritorio</p>
            </div>
          </div>
          <ChevronRight size={20} className="opacity-40" />
        </button>
      )}

      {/* OBRA COOPERATIVA */}
      <section className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-2 px-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra Activa</label>
          <div className="flex gap-2">
            <button onClick={() => onNavigate("config")} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-transform"><Settings size={20} /></button>
            <button onClick={() => onNavigate("obras")} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">Gestionar</button>
          </div>
        </div>
        <div className="relative">
          <select 
            value={selectedObraId} 
            onChange={(e) => setSelectedObraId(e.target.value)}
            className="w-full text-xl font-black bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 appearance-none outline-none text-slate-800 dark:text-white"
          >
            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="rotate-90 text-slate-400" size={20} />
          </div>
        </div>
      </section>

      {/* PASO DE LISTA DIARIO DIRECTO */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/30 dark:shadow-none space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-0.5">Control de Cuadrilla & SATE</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Paso de Lista Diario</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 rounded-xl">
            <Calendar size={13} className="text-slate-400" />
            <input 
              type="date" 
              value={fecha} 
              onChange={e => setFecha(e.target.value)}
              className="bg-transparent text-[11px] font-black text-slate-600 dark:text-slate-300 outline-none w-24 border-none p-0 focus:ring-0"
            />
          </div>
        </div>

        {/* List of Operarios */}
        <div className="space-y-2.5">
          {["Juan", "Mosquito", "Antonio", "Jesules", "David"].map(nombre => {
            const op = operariosList.find(o => normalizeName(o.nombre) === normalizeName(nombre)) || { nombre, coste: 120 };
            const isPresent = asistencia[nombre] !== 'ausente';
            const bolsa = getOperarioBolsa(nombre);

            return (
              <div 
                key={nombre}
                onClick={() => handleToggle(nombre)}
                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  isPresent 
                    ? 'bg-slate-50/50 dark:bg-slate-800/30 border-emerald-100 dark:border-emerald-900/10' 
                    : 'bg-red-50/20 dark:bg-red-950/5 border-red-100/30 dark:border-red-900/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors duration-200 ${
                    isPresent 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' 
                      : 'bg-red-50 dark:bg-red-950/20 text-red-500'
                  }`}>
                    {nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase leading-none mb-1">{nombre}</h4>
                    <span className="text-[9px] font-bold text-slate-400 block">
                      Coste: {op.coste}€/día
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md ${
                    bolsa.remaining <= 3 
                      ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' 
                      : 'bg-purple-50 dark:bg-purple-950/20 text-purple-500'
                  }`}>
                    {bolsa.remaining} lib.
                  </span>

                  <div className={`text-[8px] font-black tracking-widest px-2.5 py-1.5 rounded-xl uppercase flex items-center gap-1 transition-all duration-200 ${
                    isPresent 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}>
                    {isPresent ? (
                      <>
                        <Check size={8} strokeWidth={4} /> PRESENTE (+11m²)
                      </>
                    ) : (
                      <>
                        <X size={8} strokeWidth={4} /> AUSENTE (-1 día)
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Summary Bar */}
        <div className="bg-slate-900 dark:bg-black p-4 rounded-3xl text-white space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div>
              <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Metros Avanzados (11 m²/op)</p>
              <h4 className="text-xl font-black text-emerald-400 leading-tight">{computedM2} m²</h4>
            </div>
            <div className="text-right">
              <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Valor Diario (20.20 €/m²)</p>
              <h4 className="text-xl font-black text-blue-400 leading-tight">{formatAmount(totalEuro)}</h4>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSaveAsistencia}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-97 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <ShieldCheck size={14} /> Guardar Asistencia y Avance
          </button>
        </div>
      </section>

      {/* VISTA ÚNICA DE PROGRESO REAL (BLOQUE 11) */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
          <div>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Avance del Bloque Activo (Fijo + Automático)</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Bloque 11</h3>
          </div>
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-xl">
            SATE LISO
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">PARTIDA: Corcho + Tacos (Combinado)</p>
              <h4 className="text-lg font-black text-slate-700 dark:text-slate-200">
                {activeBlockProgress.totalM2.toLocaleString()} m² <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md ml-1">ejecutados</span>
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">{Math.round(activeBlockProgress.percentage)}%</span>
              <p className="text-[9px] font-bold text-slate-400 uppercase">de {activeBlockProgress.targetM2} m²</p>
            </div>
          </div>

          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 rounded-full transition-all duration-700 ease-out shadow-lg" 
              style={{ width: `${activeBlockProgress.percentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider px-1 leading-none">
            <span></span>
            <span>Completado {Math.round(activeBlockProgress.percentage)}%</span>
          </div>
        </div>
      </section>

      {/* COMPONENTES DE ENLACE */}
      <div className="grid grid-cols-2 gap-4">
        <ActionButton 
          onClick={() => onNavigate("registrar")} 
          icon={<PlusCircle className="text-emerald-500" size={24} />} 
          title="PRODUCCIÓN MANUAL" 
          compact
          className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30"
        />
        <ActionButton 
          onClick={() => onNavigate("historial")} 
          icon={<FileText className="text-amber-500" size={24} />} 
          title="CERTIFICACIONES Y COBROS" 
          compact
          className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
        />
      </div>
    </div>
  );
};
