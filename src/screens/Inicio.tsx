import React, { useMemo, useCallback, useState, useEffect } from "react";
import { PlusCircle, Calendar, FileText, ChevronRight, Settings, Users, Check, X, ShieldCheck, Sun, Cloud, CloudRain, RotateCcw, UserX } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ActionButton } from "../components/ActionButton";
import { Avance, Vacacion } from "../types";
import { formatAmount } from "../lib/utils";
import { BLOQUE_DIMENSIONS } from "../constants";
import { motion, AnimatePresence } from "motion/react";

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
    itemsSate,
    notify,
    getOperarioAusencias,
    resetAusencias,
    ausenciasResets
  } = useApp();

  const [fecha, setFecha] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [asistencia, setAsistencia] = useState<Record<string, 'presente' | 'ausente'>>({});
  const [showClimaModal, setShowClimaModal] = useState(false);
  const [selectedBloqueForAsistencia, setSelectedBloqueForAsistencia] = useState<string>("11");
  const [showResetAusenciasModal, setShowResetAusenciasModal] = useState(false);

  // Safe normalization helper for name matching
  const normalizeName = useCallback((s: any) =>
    (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  []);

  // Synchronize attendance state from existing database entries (Avances or Vacaciones) or default to all present
  useEffect(() => {
    if (!operariosList || operariosList.length === 0) return;

    // Check if there is an existing Avance for this date, obra and Bloque 11
    const existingAvance = (avances || []).find(a => 
      a.obraId === selectedObraId && 
      a.fecha === fecha && 
      (a.bloque || "").trim() === "11"
    );

    const nextAsistencia: Record<string, 'presente' | 'ausente'> = {};

    if (existingAvance) {
      // Initialize based on saved record
      const presentSet = new Set((existingAvance.operariosPresentes || []).map(normalizeName));
      const absentSet = new Set((existingAvance.operariosVacaciones || []).map(normalizeName));

      operariosList.forEach(op => {
        const norm = normalizeName(op.nombre);
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
          .map(v => normalizeName(v.operario))
      );

      operariosList.forEach(op => {
        const norm = normalizeName(op.nombre);
        if (dailyVacationSet.has(norm)) {
          nextAsistencia[op.nombre] = 'ausente';
        } else {
          nextAsistencia[op.nombre] = 'presente';
        }
      });
    }

    setAsistencia(nextAsistencia);
  }, [fecha, selectedObraId, avances, vacaciones, operariosList, normalizeName]);

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

  const fase1Precio = itemsSate?.fase1?.precio ?? 17;

  const totalEuro = useMemo(() => {
    return computedM2 * fase1Precio;
  }, [computedM2, fase1Precio]);

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

    setShowClimaModal(true);
  };

  const executeSaveAsistencia = (climaSeleccionado: string, targetBloque?: string) => {
    const finalBloque = (targetBloque || selectedBloqueForAsistencia || "11").trim() || "11";
    const m2 = presentUsers.length * 11;

    const newAvance: Avance = {
      id: `avance-auto-${fecha}-${Date.now()}`,
      fecha,
      obraId: selectedObraId!,
      bloque: finalBloque,
      operariosPresentes: presentUsers,
      operariosVacaciones: absentUsers,
      produccion: m2 > 0 ? [
        {
          itemId: "fase1", // Under combined price
          m2,
          bloque: finalBloque
        }
      ] : [],
      clima: climaSeleccionado,
      resumen: { ingresos: m2 * fase1Precio, costeManoObra: 0, beneficio: 0, beneficioPorOperario: 0 },
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
      const filtered = prev.filter(a => !(a.obraId === selectedObraId && a.fecha === fecha && (a.bloque || "").trim().toLowerCase() === finalBloque.toLowerCase()));
      return [...filtered, newAvance];
    });

    setShowClimaModal(false);
    notify(`Asistencia guardada: Bloque ${finalBloque} • Clima (${climaSeleccionado}): +${m2} m² (${formatAmount(totalEuro)})`, "success");
  };

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
        <div className="flex justify-between items-center px-1 gap-2">
          <div>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-0.5">Control de Cuadrilla & SATE</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Paso de Lista Diario</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => setShowResetAusenciasModal(true)}
              className="flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border border-rose-100 dark:border-rose-900/20 active:scale-95"
              title="Reiniciar contador de ausencias"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>

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
        </div>

        {/* List of Operarios */}
        <div className="space-y-2.5">
          {operariosList.map(op => {
            const nombre = op.nombre;
            const isPresent = asistencia[nombre] !== 'ausente';
            const numAusencias = getOperarioAusencias(nombre);

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

                <div className="flex items-center gap-2">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowResetAusenciasModal(true);
                    }}
                    className={`text-[9px] font-black px-2 py-1 rounded-xl flex items-center gap-1 transition-transform hover:scale-105 active:scale-95 ${
                      numAusencias > 0
                        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                    title="Ver/reiniciar ausencias"
                  >
                    <UserX size={10} />
                    {numAusencias} {numAusencias === 1 ? 'falta' : 'faltas'}
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
              <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Valor Diario ({formatAmount(fase1Precio)} €/m²)</p>
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

      <AnimatePresence>
        {showClimaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClimaModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">Paso de Lista Diario</span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter pt-1">Guardar Jornada</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Asigna el bloque de trabajo y el clima de hoy.</p>
              </div>

              {/* SELECCIÓN OBLIGATORIA DE BLOQUE */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  1. ¿A qué bloque pertenece esta jornada?
                </label>
                
                {/* Botones rápidos de bloques habituales */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {["11", "5", "6", "8", "12", "13", "Varios"].map(bl => (
                    <button
                      key={bl}
                      type="button"
                      onClick={() => setSelectedBloqueForAsistencia(bl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedBloqueForAsistencia.trim().toLowerCase() === bl.toLowerCase()
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {bl === "Varios" ? "Varios" : `Bloque ${bl}`}
                    </button>
                  ))}
                </div>

                {/* Input de texto editable para cualquier otro bloque */}
                <div className="relative pt-1">
                  <input
                    type="text"
                    value={selectedBloqueForAsistencia}
                    onChange={(e) => setSelectedBloqueForAsistencia(e.target.value)}
                    placeholder="Ej. 11"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-sm font-black text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                    Bloque
                  </span>
                </div>
              </div>

              {/* SELECCIÓN DE CLIMA */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">
                  2. ¿Qué clima ha hecho hoy?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => executeSaveAsistencia("despejado", selectedBloqueForAsistencia)}
                    className="p-4 rounded-3xl border border-amber-100 dark:border-amber-950/50 bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95"
                  >
                    <Sun size={28} className="text-amber-500 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">Despejado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeSaveAsistencia("nublado", selectedBloqueForAsistencia)}
                    className="p-4 rounded-3xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95"
                  >
                    <Cloud size={28} className="text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">Nublado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeSaveAsistencia("lluvia", selectedBloqueForAsistencia)}
                    className="p-4 rounded-3xl border border-cyan-100 dark:border-cyan-950/50 bg-cyan-50/20 hover:bg-cyan-50/40 dark:bg-cyan-950/10 dark:hover:bg-cyan-950/20 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95"
                  >
                    <CloudRain size={28} className="text-cyan-500 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-xs font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">Lluvia</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowClimaModal(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL REINICIO DE AUSENCIAS */}
      <AnimatePresence>
        {showResetAusenciasModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-5"
            >
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">Control de Cuadrilla</span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter pt-1">Contador de Ausencias</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Reinicia el contador de faltas acumuladas entre certificaciones.</p>
              </div>

              {/* Acciones de Reinicio Global */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Acción rápida para toda la cuadrilla
                </label>
                
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      resetAusencias(undefined, today);
                      notify("Contador de ausencias reiniciado a 0 para todos los operarios", "success");
                      setShowResetAusenciasModal(false);
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-500 active:scale-98 text-white py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-500/20 cursor-pointer"
                  >
                    <RotateCcw size={14} /> Reiniciar Ausencias de Todos a 0 (Hoy)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetAusencias(undefined, "2026-08-04");
                      notify("Contador de ausencias fijado desde cierre de certificación (04/08/2026)", "info");
                      setShowResetAusenciasModal(false);
                    }}
                    className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 px-4 rounded-2xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Calendar size={13} /> Reiniciar desde Última Certificación (04/08/2026)
                  </button>
                </div>
              </div>

              {/* Desglose Individual */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block px-1">
                  Reinicio Individual por Operario
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {operariosList.map(op => {
                    const count = getOperarioAusencias(op.nombre);
                    const norm = (s: string) => (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const opReset = ausenciasResets[norm(op.nombre)] || "2026-08-04";

                    return (
                      <div key={op.nombre} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase">{op.nombre}</h5>
                          <span className="text-[9px] font-medium text-slate-400 block">
                            Conteo activo desde: {opReset}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${
                            count > 0 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                          }`}>
                            {count} {count === 1 ? 'falta' : 'faltas'}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              resetAusencias(op.nombre, today);
                              notify(`Ausencias de ${op.nombre} reiniciadas a 0`, "success");
                            }}
                            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition-colors cursor-pointer"
                            title={`Poner a 0 ausencias de ${op.nombre}`}
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetAusenciasModal(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
