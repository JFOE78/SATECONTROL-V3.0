/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Home as HomeIcon, 
  PlusCircle, 
  Calendar, 
  FileText, 
  ChevronRight,
  TrendingUp,
  Users,
  Euro,
  Trash2,
  ChevronLeft,
  Check,
  X,
  Edit2,
  Settings,
  Download,
  Upload,
  Moon,
  Sun,
  Database
} from "lucide-react";
import { storage } from "./lib/storage";
import { Obra, Avance, Certificacion, Produccion, Resumen, Anticipo } from "./types";
import { TARIFAS, OPERARIOS, ITEMS_SATE } from "./constants";

// --- Components ---

function Stat({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="space-y-1">
      <label className={`text-[10px] font-black uppercase tracking-widest block ${highlight ? "text-blue-400" : "text-slate-300"}`}>{label}</label>
      <span className={`text-2xl font-black tracking-tight ${highlight ? "text-blue-600" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, color, large = false }: { label: string, value: number, color: string, large?: boolean }) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    orange: "bg-orange-50 border-orange-100 text-orange-600",
    slate: "bg-slate-50 border-slate-100 text-slate-600"
  }[color] || "bg-slate-50 border-slate-100 text-slate-600";

  return (
    <div className={`${colorClasses} p-6 rounded-[2rem] border shadow-sm ${large ? "col-span-2" : ""}`}>
      <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</label>
      <span className={`${large ? "text-3xl" : "text-xl"} font-black tracking-tight`}>
        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        {label.includes("Beneficio") || label.includes("Ingresos") || label.includes("Coste") ? "€" : "m²"}
      </span>
    </div>
  );
}

type Screen = "inicio" | "registrar" | "calendario" | "certificacion" | "obras" | "config";

interface Notification {
  message: string;
  type: "success" | "error" | "info";
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("inicio");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [obras, setObras] = useState<Obra[]>([]);
  const [avances, setAvances] = useState<Avance[]>([]);
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [itemsSate, setItemsSate] = useState<Record<string, any>>(ITEMS_SATE);
  const [operariosList, setOperariosList] = useState<any[]>(OPERARIOS);
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [editingAvance, setEditingAvance] = useState<Avance | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [modal, setModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [manualBloque, setManualBloque] = useState<string>("");

  const notify = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const loadedObras = storage.getObras();
    const loadedAvances = storage.getAvances();
    const loadedCertificaciones = storage.getCertificaciones();
    const loadedAnticipos = storage.getAnticipos();
    const loadedItems = storage.getItems();
    const loadedOperarios = storage.getOperarios();
    const loadedTheme = storage.getTheme();
    const activeObraId = storage.getActiveObraId();

    if (loadedItems) setItemsSate(loadedItems);
    if (loadedOperarios) setOperariosList(loadedOperarios);
    setTheme(loadedTheme);
    document.documentElement.classList.toggle('dark', loadedTheme === 'dark');
    document.body.classList.toggle('dark', loadedTheme === 'dark');

    if (loadedObras.length === 0) {
      const defaultObras: Obra[] = [
        { id: "1", nombre: "Obra Principal", numBloques: 20 },
      ];
      storage.saveObras(defaultObras);
      setObras(defaultObras);
      setSelectedObraId(defaultObras[0].id);
      storage.saveActiveObraId(defaultObras[0].id);
    } else {
      setObras(loadedObras);
      if (activeObraId && loadedObras.some(o => o.id === activeObraId)) {
        setSelectedObraId(activeObraId);
      } else {
        setSelectedObraId(loadedObras[0].id);
        storage.saveActiveObraId(loadedObras[0].id);
      }
    }

    setAvances(loadedAvances);
    setCertificaciones(loadedCertificaciones);
    setAnticipos(loadedAnticipos);
  }, []);

  const handleSetSelectedObraId = (id: string) => {
    setSelectedObraId(id);
    storage.saveActiveObraId(id);
    setManualBloque("");
  };

  const selectedObra = useMemo(() => 
    obras.find(o => o.id === selectedObraId), 
    [obras, selectedObraId]
  );

  const currentMonthAvances = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return avances.filter(a => {
      const d = new Date(a.fecha);
      return d.getMonth() === month && d.getFullYear() === year && a.obraId === selectedObraId;
    });
  }, [avances, selectedObraId]);

  const monthlyProfit = useMemo(() => 
    (currentMonthAvances || []).reduce((acc, curr) => acc + (curr.resumen?.beneficio || 0), 0),
    [currentMonthAvances]
  );

  const lastAvance = useMemo(() => 
    [...avances]
      .filter(a => a.obraId === selectedObraId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0],
    [avances, selectedObraId]
  );

  const lastBloque = manualBloque || lastAvance?.bloque || "";

  const renderScreen = () => {
    switch (currentScreen) {
      case "inicio":
        return (
          <Inicio 
            obras={obras} 
            selectedObraId={selectedObraId} 
            setSelectedObraId={handleSetSelectedObraId}
            monthlyProfit={monthlyProfit}
            onNavigate={setCurrentScreen}
            avances={avances}
            lastAvance={lastAvance}
            lastBloque={lastBloque}
            onSetLastBloque={setManualBloque}
            onInstall={handleInstallClick}
            showInstall={!!deferredPrompt}
          />
        );
      case "obras":
        return (
          <GestionObras 
            obras={obras}
            setModal={setModal}
            onSave={(newObras) => {
              setObras(newObras);
              storage.saveObras(newObras);
              if (newObras.length > 0 && !newObras.some(o => o.id === selectedObraId)) {
                handleSetSelectedObraId(newObras[0].id);
              }
              notify("Obras actualizadas.", "success");
            }}
            onBack={() => setCurrentScreen("inicio")}
          />
        );
      case "registrar":
        return (
          <RegistrarAvance 
            obra={selectedObra} 
            initialAvance={editingAvance}
            lastBloque={lastBloque}
            itemsSate={itemsSate}
            operariosList={operariosList}
            notify={notify}
            onSave={(avance) => {
              try {
                const exists = avances.find(a => a.id === avance.id);
                let newAvances;
                if (exists) {
                  newAvances = avances.map(a => a.id === avance.id ? avance : a);
                  notify("Cambios guardados.", "success");
                } else {
                  newAvances = [...avances, avance];
                  notify("Avance guardado correctamente.", "success");
                }
                setAvances(newAvances);
                storage.saveAvances(newAvances);
                setEditingAvance(null);
                setCurrentScreen("inicio");
              } catch (e) {
                notify("Ha ocurrido un error. Inténtalo de nuevo.", "error");
              }
            }}
            onCancel={() => {
              setEditingAvance(null);
              setCurrentScreen("inicio");
            }}
          />
        );
      case "calendario":
        return (
          <Calendario 
            avances={avances.filter(a => a.obraId === selectedObraId)}
            onEdit={(avance) => {
              setEditingAvance(avance);
              setCurrentScreen("registrar");
            }}
            onNew={(date) => {
              setEditingAvance({
                id: crypto.randomUUID(),
                fecha: date,
                obraId: selectedObraId,
                bloque: lastBloque,
                operariosPresentes: (operariosList || []).map(o => o.nombre),
                produccion: [],
                resumen: { ingresos: 0, costeManoObra: 0, beneficio: 0, beneficioPorOperario: 0 }
              });
              setCurrentScreen("registrar");
            }}
            onDelete={(id) => {
              setModal({
                title: "Borrar Avance",
                message: "¿Seguro que quieres borrar este avance? Esta acción no se puede deshacer.",
                onConfirm: () => {
                  const newAvances = avances.filter(a => a.id !== id);
                  setAvances(newAvances);
                  storage.saveAvances(newAvances);
                  setModal(null);
                  notify("Avance eliminado.", "success");
                }
              });
            }}
            onBack={() => setCurrentScreen("inicio")}
            anticipos={anticipos.filter(a => a.obraId === selectedObraId)}
            itemsSate={itemsSate}
          />
        );
      case "config":
        return (
          <ConfigScreen 
            theme={theme}
            setTheme={(t) => {
              setTheme(t);
              storage.saveTheme(t);
              document.documentElement.classList.toggle('dark', t === 'dark');
              document.body.classList.toggle('dark', t === 'dark');
            }}
            items={itemsSate}
            setItems={(newItems) => {
              setItemsSate(newItems);
              storage.saveItems(newItems);
            }}
            operarios={operariosList}
            setOperarios={(newOps) => {
              setOperariosList(newOps);
              storage.saveOperarios(newOps);
            }}
            onBack={() => setCurrentScreen("inicio")}
            notify={notify}
          />
        );
      case "certificacion":
        return (
          <CertificacionScreen 
            avances={avances.filter(a => a.obraId === selectedObraId)}
            obraId={selectedObraId}
            certificaciones={certificaciones}
            anticipos={anticipos.filter(an => an.obraId === selectedObraId)}
            operariosList={operariosList}
            notify={notify}
            onSaveCertificacion={(cert) => {
              try {
                const newCerts = [...certificaciones.filter(c => c.id !== cert.id), cert];
                setCertificaciones(newCerts);
                storage.saveCertificaciones(newCerts);
                notify("Certificación guardada.", "success");
              } catch (e) {
                notify("Ha ocurrido un error. Inténtalo de nuevo.", "error");
              }
            }}
            onSaveAnticipo={(ant) => {
              const newAnts = [...anticipos, ant];
              setAnticipos(newAnts);
              storage.saveAnticipos(newAnts);
            }}
            onDeleteAnticipo={(id) => {
              const newAnts = anticipos.filter(an => an.id !== id);
              setAnticipos(newAnts);
              storage.saveAnticipos(newAnts);
            }}
            onBack={() => setCurrentScreen("inicio")}
          />
        );
      default:
        return (
          <Inicio 
            obras={obras} 
            selectedObraId={selectedObraId} 
            setSelectedObraId={handleSetSelectedObraId} 
            monthlyProfit={monthlyProfit} 
            onNavigate={setCurrentScreen} 
            avances={avances}
            lastAvance={lastAvance}
            lastBloque={lastBloque}
            onSetLastBloque={setManualBloque}
            onInstall={handleInstallClick}
            showInstall={!!deferredPrompt}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      <header className="p-6 bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
              <PlusCircle className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800">SATE<span className="text-blue-600">PRO</span></h1>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Obra</span>
              <span className="text-xs font-black text-slate-700 uppercase">{selectedObra?.nombre || "---"}</span>
            </div>
            <button 
              onClick={() => setCurrentScreen("obras")}
              className="p-2 bg-white rounded-xl border border-slate-100 text-blue-600 active:scale-90 transition-transform"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {renderScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-between items-center z-40 max-w-md mx-auto rounded-t-[2.5rem] shadow-2xl shadow-slate-200">
        <NavButton 
          active={currentScreen === "inicio"} 
          onClick={() => { setEditingAvance(null); setCurrentScreen("inicio"); }}
          icon={<HomeIcon size={26} />}
          label="Inicio"
        />
        <NavButton 
          active={currentScreen === "registrar"} 
          onClick={() => { setEditingAvance(null); setCurrentScreen("registrar"); }}
          icon={<PlusCircle size={26} />}
          label="Nuevo"
        />
        <NavButton 
          active={currentScreen === "calendario"} 
          onClick={() => { setEditingAvance(null); setCurrentScreen("calendario"); }}
          icon={<Calendar size={26} />}
          label="Agenda"
        />
        <NavButton 
          active={currentScreen === "certificacion"} 
          onClick={() => { setEditingAvance(null); setCurrentScreen("certificacion"); }}
          icon={<FileText size={26} />}
          label="Cierre"
        />
      </nav>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-28 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className={`p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border-2 ${
              notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
              notification.type === "error" ? "bg-red-50 border-red-200 text-red-800" :
              "bg-blue-50 border-blue-200 text-blue-800"
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                notification.type === "success" ? "bg-emerald-500" :
                notification.type === "error" ? "bg-red-500" :
                "bg-blue-500"
              }`}>
                {notification.type === "success" ? <Check className="text-white" size={24} /> :
                 notification.type === "error" ? <X className="text-white" size={24} /> :
                 <FileText className="text-white" size={24} />}
              </div>
              <p className="font-black uppercase tracking-tight text-sm">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6"
            >
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{modal.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{modal.message}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={modal.onConfirm}
                  className="w-full bg-red-500 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-red-100 active:scale-95 transition-all uppercase tracking-widest"
                >
                  Confirmar Borrado
                </button>
                <button 
                  onClick={() => setModal(null)}
                  className="w-full bg-slate-100 text-slate-400 font-black py-5 rounded-[2rem] active:scale-95 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center min-w-[70px] transition-all duration-200 ${active ? "text-blue-600 scale-110" : "text-slate-400"}`}
    >
      <div className={`${active ? "bg-blue-50 p-1 rounded-xl" : ""}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black mt-1 uppercase tracking-tighter ${active ? "opacity-100" : "opacity-60"}`}>{label}</span>
    </button>
  );
}

// --- Screen: Inicio ---

function Inicio({ 
  obras, 
  selectedObraId, 
  setSelectedObraId, 
  monthlyProfit, 
  onNavigate,
  avances,
  lastAvance,
  lastBloque,
  onSetLastBloque,
  onInstall,
  showInstall
}: { 
  obras: Obra[], 
  selectedObraId: string, 
  setSelectedObraId: (id: string) => void,
  monthlyProfit: number,
  onNavigate: (s: Screen) => void,
  avances: Avance[],
  lastAvance: Avance | undefined,
  lastBloque: string,
  onSetLastBloque: (b: string) => void,
  onInstall: () => void,
  showInstall: boolean
}) {
  const selectedObra = useMemo(() => obras.find(o => o.id === selectedObraId), [obras, selectedObraId]);
  
  const bloques = useMemo(() => {
    if (!selectedObra) return [];
    return Array.from({ length: selectedObra.numBloques }, (_, i) => `Bloque ${i + 1}`);
  }, [selectedObra]);
  
  const produccionPorBloque = useMemo(() => {
    const stats: Record<string, { m2: number, beneficio: number }> = {};
    (avances || []).filter(a => a.obraId === selectedObraId).forEach(a => {
      (a.produccion || []).forEach(p => {
        if (!p.bloque) return;
        if (!stats[p.bloque]) stats[p.bloque] = { m2: 0, beneficio: 0 };
        stats[p.bloque].m2 += (p.m2 || 0);
        // Aproximación del beneficio por bloque (proporcional a m2 en el avance)
        const totalM2Avance = (a.produccion || []).reduce((sum, pr) => sum + (pr.m2 || 0), 0);
        const ratio = totalM2Avance > 0 ? (p.m2 || 0) / totalM2Avance : 0;
        stats[p.bloque].beneficio += (a.resumen?.beneficio || 0) * ratio;
      });
    });
    return stats as Record<string, { m2: number, beneficio: number }>;
  }, [avances, selectedObraId]);

  const totalAcumulado = useMemo(() => {
    return (Object.values(produccionPorBloque) as { m2: number, beneficio: number }[]).reduce((acc, curr) => ({
      m2: acc.m2 + curr.m2,
      beneficio: acc.beneficio + curr.beneficio
    }), { m2: 0, beneficio: 0 });
  }, [produccionPorBloque]);

  return (
    <div className="space-y-4">
      {showInstall && (
        <button 
          onClick={onInstall}
          className="w-full bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all shadow-lg shadow-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <PlusCircle size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Instalar App</p>
              <p className="text-[10px] font-bold opacity-60">Acceso rápido desde el escritorio</p>
            </div>
          </div>
          <ChevronRight size={20} className="opacity-40" />
        </button>
      )}
      {/* Selector de Obra */}
      <section className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-2 px-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Obra Seleccionada</label>
          <div className="flex gap-2">
            <button 
              onClick={() => onNavigate("config")}
              className="p-2 bg-slate-100 rounded-xl text-slate-400 active:scale-90 transition-transform"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => onNavigate("obras")}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg active:scale-95 transition-all"
            >
              Gestionar
            </button>
          </div>
        </div>
        <div className="relative">
          <select 
            value={selectedObraId} 
            onChange={(e) => setSelectedObraId(e.target.value)}
            className="w-full text-xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 appearance-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
          >
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronRight className="rotate-90 text-slate-400" size={20} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        {/* Bloque Actual */}
        <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between min-h-[120px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bloque Actual</label>
          <div className="mt-auto space-y-2">
            <select 
              value={lastBloque} 
              onChange={(e) => onSetLastBloque(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl p-2 font-black text-sm text-slate-800 outline-none appearance-none"
            >
              <option value="">---</option>
              {bloques.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Indicar Bloque</p>
          </div>
        </section>

        {/* Beneficio Mensual */}
        <section className="bg-blue-600 p-5 rounded-[2rem] shadow-lg shadow-blue-100 text-white flex flex-col justify-between min-h-[120px]">
          <label className="block text-[10px] font-black opacity-70 uppercase tracking-widest">Mes Actual</label>
          <div className="mt-auto">
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black">{Math.round(monthlyProfit).toLocaleString()}</span>
              <span className="text-sm font-bold opacity-80">€</span>
            </div>
            <p className="text-[10px] font-bold opacity-70 mt-1">Beneficio neto</p>
          </div>
        </section>
      </div>

      {/* Último Avance Registrado */}
      {lastAvance && (
        <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Avance</label>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Hoy</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-lg font-black text-slate-800 leading-tight">
                {new Date(lastAvance.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
              <p className="text-xs font-bold text-slate-400">{lastAvance.bloque}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-blue-600">+{(lastAvance.resumen?.beneficio || 0).toFixed(0)}€</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Beneficio Día</p>
            </div>
          </div>
        </section>
      )}

      {/* Resumen Acumulado Obra */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Resumen Acumulado</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-300 uppercase block">Total m²</span>
            <span className="text-2xl font-black text-slate-800">{Math.round(totalAcumulado.m2).toLocaleString()}</span>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-black text-slate-300 uppercase block">Beneficio Total</span>
            <span className="text-2xl font-black text-blue-600">{Math.round(totalAcumulado.beneficio).toLocaleString()}€</span>
          </div>
        </div>
      </section>

      {/* Producción por Bloque */}
      <section className="space-y-3">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Producción por Bloque</label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(produccionPorBloque) as [string, { m2: number, beneficio: number }][]).sort().map(([b, s]) => (
            <div key={b} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs">
                  {b.replace("Bloque ", "")}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase">{b}</h4>
                  <p className="text-[10px] font-bold text-slate-400">{Math.round(s.beneficio)}€ beneficio</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-blue-600">{Math.round(s.m2)}</span>
                <span className="text-[10px] font-black text-slate-300 ml-1 uppercase">m²</span>
              </div>
            </div>
          ))}
          {Object.keys(produccionPorBloque).length === 0 && (
            <div className="text-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sin datos acumulados</p>
            </div>
          )}
        </div>
      </section>

      {/* Botones de Acción Grandes */}
      <div className="grid grid-cols-1 gap-3">
        <ActionButton 
          onClick={() => onNavigate("registrar")}
          icon={<PlusCircle className="text-blue-600" size={28} />}
          title="REGISTRAR AVANCE"
          description="Añadir producción de hoy"
          color="blue"
        />
        <div className="grid grid-cols-2 gap-3">
          <ActionButton 
            onClick={() => onNavigate("calendario")}
            icon={<Calendar className="text-orange-500" size={24} />}
            title="AGENDA"
            description="Historial"
            compact
          />
          <ActionButton 
            onClick={() => onNavigate("certificacion")}
            icon={<FileText className="text-emerald-500" size={24} />}
            title="CERTIF."
            description="Resumen"
            compact
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ 
  onClick, 
  icon, 
  title, 
  description, 
  compact = false,
  color = "slate"
}: { 
  onClick: () => void, 
  icon: React.ReactNode, 
  title: string, 
  description: string,
  compact?: boolean,
  color?: string
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex ${compact ? "flex-col items-center text-center p-4" : "items-center p-6"} bg-white rounded-[2rem] shadow-sm border border-slate-100 active:scale-95 transition-all duration-200 group`}
    >
      <div className={`bg-slate-50 p-3 rounded-2xl ${compact ? "mb-3" : "mr-4"} group-active:bg-slate-100 transition-colors`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className={`font-black ${compact ? "text-xs" : "text-lg"} leading-none uppercase tracking-tight text-slate-800`}>{title}</h3>
        {!compact && <p className="text-slate-400 text-xs font-bold mt-1">{description}</p>}
      </div>
      {!compact && <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" size={20} />}
    </button>
  );
}

// --- Screen: Gestionar Obras ---

function GestionObras({ 
  obras, 
  setModal,
  onSave, 
  onBack 
}: { 
  obras: Obra[], 
  setModal: (m: any) => void,
  onSave: (o: Obra[]) => void, 
  onBack: () => void 
}) {
  const [nombre, setNombre] = useState("");
  const [numBloques, setNumBloques] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSaveObra = () => {
    if (!nombre.trim()) return;
    
    if (editingId) {
      onSave(obras.map(o => o.id === editingId ? { ...o, nombre: nombre.trim(), numBloques } : o));
      setEditingId(null);
    } else {
      const newObra: Obra = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        numBloques
      };
      onSave([...obras, newObra]);
    }
    setNombre("");
    setNumBloques(1);
  };

  const startEdit = (obra: Obra) => {
    setEditingId(obra.id);
    setNombre(obra.nombre);
    setNumBloques(obra.numBloques);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNombre("");
    setNumBloques(1);
  };

  const handleDelete = (id: string) => {
    if (obras.length <= 1) return;
    const obra = obras.find(o => o.id === id);
    if (!obra) return;

    setModal({
      title: "Borrar Obra",
      message: `¿Seguro que quieres borrar la obra "${obra.nombre}"? No podrás acceder a sus datos (avances, certificaciones) mientras no esté en la lista.`,
      onConfirm: () => {
        onSave(obras.filter(o => o.id !== id));
        setModal(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Gestionar Obras</h2>
        <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
      </div>

      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
          {editingId ? "Editar Obra" : "Nueva Obra"}
        </label>
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Nombre de la obra"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-800 outline-none placeholder:text-slate-300"
          />
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
            <label className="text-xs font-black text-slate-400 uppercase flex-1">Número de Bloques</label>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setNumBloques(Math.max(1, numBloques - 1))}
                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 font-black shadow-sm"
              >
                -
              </button>
              <span className="font-black text-slate-800 w-6 text-center">{numBloques}</span>
              <button 
                onClick={() => setNumBloques(numBloques + 1)}
                className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 font-black shadow-sm"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {editingId && (
              <button 
                onClick={cancelEdit}
                className="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={handleSaveObra}
              disabled={!nombre.trim()}
              className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
            >
              {editingId ? "Guardar Cambios" : "Añadir Obra"}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Obras Existentes</label>
        <div className="space-y-2">
          {obras.map(o => (
            <div key={o.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
              <div onClick={() => startEdit(o)} className="flex-1 cursor-pointer">
                <h3 className="font-black text-slate-800 uppercase text-sm flex items-center gap-2">
                  {o.nombre}
                  <Edit2 size={14} className="text-blue-400" />
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{o.numBloques} Bloques</p>
              </div>
              <button 
                onClick={() => handleDelete(o.id)}
                disabled={obras.length <= 1}
                className="p-3 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-transform disabled:opacity-30"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// --- Screen: Registrar Avance ---

function RegistrarAvance({ 
  obra, 
  initialAvance,
  lastBloque,
  itemsSate,
  operariosList,
  notify,
  onSave, 
  onCancel 
}: { 
  obra?: Obra, 
  initialAvance?: Avance | null,
  lastBloque: string,
  itemsSate: Record<string, any>,
  operariosList: any[],
  notify: (m: string, t?: "success" | "error" | "info") => void,
  onSave: (a: Avance) => void, 
  onCancel: () => void 
}) {
  // Draft recovery
  const getDraft = () => {
    if (initialAvance || !obra) return null;
    const draft = localStorage.getItem(`sate_avance_draft_${obra.id}`);
    return draft ? JSON.parse(draft) : null;
  };

  const draft = getDraft();

  const [fecha, setFecha] = useState(initialAvance?.fecha || draft?.fecha || new Date().toISOString().split('T')[0]);
  const [bloque, setBloque] = useState(initialAvance?.bloque || draft?.bloque || lastBloque || "");
  const [operarios, setOperarios] = useState<string[]>(initialAvance?.operariosPresentes || draft?.operariosPresentes || operariosList.map(o => o.nombre));
  const [producciones, setProducciones] = useState<Produccion[]>(initialAvance?.produccion || draft?.produccion || []);
  
  // Formulario producción actual
  const [selectedItemId, setSelectedItemId] = useState<string>("fase1");
  const [m2, setM2] = useState<number>(0);
  const [prodBloque, setProdBloque] = useState(initialAvance?.bloque || draft?.bloque || lastBloque || "");

  // Save draft
  useEffect(() => {
    if (!initialAvance && obra) {
      localStorage.setItem(`sate_avance_draft_${obra.id}`, JSON.stringify({ fecha, bloque, operariosPresentes: operarios, produccion: producciones }));
    }
  }, [fecha, bloque, operarios, producciones, initialAvance, obra]);

  const toggleOperario = (nombre: string) => {
    setOperarios(prev => 
      prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre]
    );
  };

  const addProduccion = () => {
    if (isNaN(m2) || m2 <= 0) {
      notify("Introduce un número válido de metros cuadrados.", "error");
      return;
    }
    if (!selectedItemId) {
      notify("Selecciona un ítem para esta producción.", "error");
      return;
    }

    const p: Produccion = {
      itemId: selectedItemId,
      m2,
      bloque: prodBloque || bloque
    };
    setProducciones([...producciones, p]);
    // Reset form
    setM2(0);
  };

  const removeProduccion = (index: number) => {
    setProducciones(producciones.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!obra) return;

    if ((operarios || []).length === 0) {
      notify("Debes seleccionar al menos un operario presente.", "error");
      return;
    }

    if ((producciones || []).length === 0) {
      notify("Debes añadir al menos una producción del día.", "error");
      return;
    }

    if (!bloque) {
      notify("Selecciona un bloque.", "error");
      return;
    }

    const bloqueNum = parseInt(bloque.replace("Bloque ", ""));
    if (bloqueNum > obra.numBloques) {
      notify("El bloque seleccionado no existe en esta obra.", "error");
      return;
    }

    // Calcular resumen
    let ingresos = 0;
    (producciones || []).forEach(p => {
      const item = itemsSate[p.itemId];
      if (item) {
        ingresos += (p.m2 || 0) * (item.precio || 0);
      }
    });

    const costeManoObra = (operarios || []).reduce((acc, nombre) => {
      const op = (operariosList || []).find(o => o.nombre === nombre);
      return acc + (op?.coste || 0);
    }, 0);

    const beneficio = ingresos - costeManoObra;
    const beneficioPorOperario = (operarios || []).length > 0 ? beneficio / operarios.length : 0;

    const avance: Avance = {
      id: initialAvance?.id || crypto.randomUUID(),
      fecha,
      obraId: obra.id,
      bloque,
      operariosPresentes: operarios,
      produccion: producciones,
      resumen: {
        ingresos,
        costeManoObra,
        beneficio,
        beneficioPorOperario
      }
    };

    localStorage.removeItem(`sate_avance_draft_${obra.id}`);
    onSave(avance);
  };

  const bloques = useMemo(() => {
    if (!obra) return [];
    return Array.from({ length: obra.numBloques }, (_, i) => `Bloque ${i + 1}`);
  }, [obra]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
          {initialAvance ? "Editar Avance" : "Nuevo Avance"}
        </h2>
        <button onClick={onCancel} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      {/* Datos Básicos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
          <input 
            type="date" 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl p-2 font-black text-sm text-slate-800 outline-none"
          />
        </div>
        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bloque</label>
          <select 
            value={bloque} 
            onChange={(e) => setBloque(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl p-2 font-black text-sm text-slate-800 outline-none"
          >
            <option value="">---</option>
            {bloques.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Operarios */}
      <section className="space-y-3">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Asistencia Operarios</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERARIOS.map(op => (
            <button
              key={op.nombre}
              onClick={() => toggleOperario(op.nombre)}
              className={`flex justify-between items-center px-4 py-4 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${
                operarios.includes(op.nombre) 
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                : "bg-white border-slate-100 text-slate-400"
              }`}
            >
              <span>{op.nombre}</span>
              {operarios.includes(op.nombre) ? <Check size={18} /> : <span className="text-[10px] opacity-60">{op.coste}€</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Formulario Producción */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded-xl">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <h3 className="font-black text-slate-800 uppercase tracking-tight">Añadir Producción</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ítem del SATE</label>
            <div className="space-y-2">
              {Object.entries(ITEMS_SATE).map(([id, item]) => (
                <button
                  key={id}
                  onClick={() => setSelectedItemId(id)}
                  className={`w-full text-left p-4 rounded-2xl font-black text-sm transition-all border-2 active:scale-[0.98] ${
                    selectedItemId === id 
                    ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                    : "bg-slate-50 border-transparent text-slate-400"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span>{item.nombre}</span>
                      <span className="text-[10px] opacity-60 font-bold">{item.precio}€/m²</span>
                    </div>
                    {selectedItemId === id && <Check size={20} />}
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                {itemsSate[selectedItemId]?.descripcion}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Bloque (Opcional)</label>
            <select 
              value={prodBloque} 
              onChange={(e) => setProdBloque(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl p-4 font-black text-sm text-slate-800 outline-none"
            >
              <option value="">Usar bloque del día ({bloque || "---"})</option>
              {bloques.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center block">Metros Cuadrados (m²)</label>
            <div className="relative">
              <input 
                type="number" 
                value={m2 || ""} 
                onChange={(e) => setM2(Number(e.target.value))}
                placeholder="0.0"
                className="w-full bg-slate-50 border-none rounded-3xl p-6 font-black text-center text-4xl text-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl pointer-events-none">m²</div>
            </div>
          </div>
        </div>

        <button 
          onClick={addProduccion}
          disabled={m2 <= 0}
          className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] active:scale-95 transition-all text-lg uppercase tracking-widest disabled:opacity-30"
        >
          Añadir a la lista
        </button>
      </section>

      {/* Lista de Producciones */}
      {producciones.length > 0 && (
        <section className="space-y-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Producción Registrada</label>
          <div className="space-y-2">
            {producciones.map((p, i) => (
              <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                <div className="flex-1 pr-4">
                  <div className="font-black text-slate-800 leading-tight mb-1 uppercase text-sm">
                    {ITEMS_SATE[p.itemId]?.nombre}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-black text-blue-600">{p.m2} m²</div>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 uppercase">{p.bloque}</span>
                  </div>
                </div>
                <button onClick={() => removeProduccion(i)} className="text-red-400 p-4 bg-red-50 rounded-2xl active:scale-90 transition-transform">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resumen Final */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Resumen del Día</label>
        <div className="grid grid-cols-2 gap-6">
          <StatCard label="Ingresos" value={producciones.reduce((acc, p) => {
            const item = itemsSate[p.itemId];
            return acc + (p.m2 * (item?.precio || 0));
          }, 0)} color="blue" />
          
          <StatCard label="Coste M.O." value={operarios.reduce((acc, n) => acc + (operariosList.find(o => o.nombre === n)?.coste || 0), 0)} color="slate" />
          
          <div className="col-span-2">
            <StatCard 
              label="Beneficio Neto" 
              value={producciones.reduce((acc, p) => {
                const item = itemsSate[p.itemId];
                return acc + (p.m2 * (item?.precio || 0));
              }, 0) - operarios.reduce((acc, n) => acc + (operariosList.find(o => o.nombre === n)?.coste || 0), 0)} 
              color="blue" 
              large 
            />
          </div>
        </div>
      </section>

      <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-50">
        <button 
          onClick={handleSave}
          disabled={producciones.length === 0 || operarios.length === 0}
          className="w-full bg-blue-600 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all text-xl uppercase tracking-widest"
        >
          {initialAvance ? "Actualizar Día" : "Guardar Día"}
        </button>
      </div>
    </div>
  );
}

function ExtraButton({ active, onClick, label, price, color }: { active: boolean, onClick: () => void, label: string, price: number, color: string }) {
  const colors: Record<string, string> = {
    orange: active ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-slate-50 border-transparent text-slate-400",
    purple: active ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-slate-50 border-transparent text-slate-400",
    emerald: active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-transparent text-slate-400",
  };

  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 leading-tight ${colors[color]}`}
    >
      <div className="flex flex-col items-center gap-1">
        <span>{label.split(' ')[0]}</span>
        <span className="opacity-60">{price}€/m²</span>
      </div>
    </button>
  );
}

function Badge({ label, color }: { label: string, color: string }) {
  const colors: Record<string, string> = {
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <span className={`text-[9px] ${colors[color]} px-2 py-0.5 rounded-lg font-black uppercase tracking-wider border`}>
      {label}
    </span>
  );
}

// --- Screen: Calendario ---

function Calendario({ 
  avances, 
  anticipos,
  itemsSate,
  onEdit, 
  onNew,
  onDelete,
  onBack 
}: { 
  avances: Avance[], 
  anticipos: Anticipo[],
  itemsSate: Record<string, any>,
  onEdit: (a: Avance) => void, 
  onNew: (date: string) => void,
  onDelete: (id: string) => void,
  onBack: () => void 
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const avancesMap = useMemo(() => {
    const map: Record<string, Avance> = {};
    (avances || []).forEach(a => {
      if (a.fecha) map[a.fecha] = a;
    });
    return map;
  }, [avances]);

  const anticiposMap = useMemo(() => {
    const map: Record<string, Anticipo[]> = {};
    (anticipos || []).forEach(a => {
      if (a.fecha) {
        if (!map[a.fecha]) map[a.fecha] = [];
        map[a.fecha].push(a);
      }
    });
    return map;
  }, [anticipos]);

  const selectedAvance = selectedDate ? avancesMap[selectedDate] : null;
  const selectedAnticipos = (selectedDate ? anticiposMap[selectedDate] : []) || [];

  const dailyTotals = useMemo(() => {
    if (!selectedAvance) return null;
    const items: Record<string, number> = {};
    
    (selectedAvance.produccion || []).forEach(p => {
      items[p.itemId] = (items[p.itemId] || 0) + (p.m2 || 0);
    });

    return { items };
  }, [selectedAvance]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Calendario</h2>
        <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6 px-2">
          <button onClick={prevMonth} className="p-3 bg-slate-50 rounded-xl text-slate-400 active:scale-90 transition-transform">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">
            {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={nextMonth} className="p-3 bg-slate-50 rounded-xl text-slate-400 active:scale-90 transition-transform">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center mb-4">
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
            <div key={d} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasAvance = !!avancesMap[dateStr];
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all active:scale-90 ${
                  isSelected 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                  : hasAvance 
                    ? "bg-blue-50 text-blue-600 border-2 border-blue-100" 
                    : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      <AnimatePresence mode="wait">
        {selectedAvance ? (
          <motion.div 
            key={selectedAvance.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Bloque Trabajado</h4>
                <p className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedAvance.bloque}</p>
                <p className="text-xs font-bold text-slate-400">{new Date(selectedAvance.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onDelete(selectedAvance.id)}
                  className="bg-red-50 text-red-500 p-3 rounded-2xl active:scale-95 transition-transform"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => onEdit(selectedAvance)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Editar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">Equipo Presente</h4>
              <div className="flex flex-wrap gap-2">
                {(selectedAvance.operariosPresentes || []).map(op => (
                  <span key={op} className="px-4 py-2 bg-slate-50 rounded-xl text-xs font-black text-slate-600 border border-slate-100 uppercase tracking-tight">{op}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">Resumen Producción</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(dailyTotals?.items || {}).map(([id, m]) => (
                  <div key={id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">{itemsSate[id]?.nombre}</span>
                    <span className="text-sm font-black text-slate-800">{Math.round(m as number)}m²</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">Detalle por Bloque</h4>
              <div className="space-y-3">
                {(selectedAvance.produccion || []).map((p, i) => (
                  <div key={i} className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                    <div className="flex justify-between items-start">
                      <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{itemsSate[p.itemId]?.nombre}</span>
                      <span className="font-black text-blue-600 text-lg">{p.m2 || 0} m²</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{p.bloque}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-6">
              <Stat label="Ingresos" value={`${(selectedAvance.resumen?.ingresos || 0).toFixed(0)}€`} />
              <Stat label="Coste M.O." value={`${selectedAvance.resumen?.costeManoObra || 0}€`} />
              <div className="col-span-2 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex justify-between items-center">
                <Stat label="Beneficio Neto" value={`${(selectedAvance.resumen?.beneficio || 0).toFixed(0)}€`} highlight />
                <div className="text-right">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Por Operario</label>
                  <span className="text-xl font-black text-blue-700">{(selectedAvance.resumen?.beneficioPorOperario || 0).toFixed(0)}€</span>
                </div>
              </div>
            </div>

            {selectedAnticipos.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-1">Anticipos Entregados</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedAnticipos.map(an => (
                    <div key={an.id} className="flex justify-between items-center bg-orange-50 p-4 rounded-2xl border border-orange-100">
                      <span className="font-black text-slate-700 uppercase text-xs">{an.operario}</span>
                      <span className="font-black text-orange-700">{an.cantidad}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : selectedDate && (
          <div className="text-center p-12 bg-white rounded-[2.5rem] border border-slate-100 border-dashed space-y-6">
            <Calendar className="mx-auto text-slate-200" size={48} />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sin registros para este día</p>
            
            <button 
              onClick={() => onNew(selectedDate)}
              className="w-full bg-blue-600 text-white py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest active:scale-95 transition-transform"
            >
              Nuevo Parte
            </button>

            {selectedAnticipos.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-50 w-full">
                <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Anticipos del día</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedAnticipos.map(an => (
                    <div key={an.id} className="flex justify-between items-center bg-orange-50 p-4 rounded-2xl border border-orange-100">
                      <span className="font-black text-slate-700 uppercase text-xs text-left">{an.operario}</span>
                      <span className="font-black text-orange-700">{an.cantidad}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Screen: Configuración ---

function ConfigScreen({
  theme,
  setTheme,
  items,
  setItems,
  operarios,
  setOperarios,
  onBack,
  notify
}: {
  theme: "light" | "dark",
  setTheme: (t: "light" | "dark") => void,
  items: Record<string, any>,
  setItems: (items: Record<string, any>) => void,
  operarios: any[],
  setOperarios: (ops: any[]) => void,
  onBack: () => void,
  notify: (m: string, t?: "success" | "error" | "info") => void
}) {
  const [activeTab, setActiveTab] = useState<"general" | "items" | "operarios">("general");

  const handleExport = () => {
    const data = storage.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sate_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Copia de seguridad exportada.", "success");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storage.importData(content)) {
        notify("Datos importados correctamente. Recargando...", "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        notify("Error al importar los datos.", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Configuración</h2>
        <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100">
        {(["general", "items", "operarios"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-slate-900 text-white shadow-lg" : "text-slate-400"}`}
          >
            {tab === "general" ? "General" : tab === "items" ? "Partidas" : "Operarios"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "general" && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800 uppercase">Modo Visual</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cambia entre tema claro y oscuro</p>
                </div>
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="p-4 bg-slate-50 rounded-2xl text-slate-600 active:scale-90 transition-transform border border-slate-100"
                >
                  {theme === "light" ? <Moon size={24} /> : <Sun size={24} />}
                </button>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <p className="text-sm font-black text-slate-800 uppercase">Copia de Seguridad</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExport}
                    className="flex flex-col items-center gap-2 p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-blue-600 active:scale-95 transition-all"
                  >
                    <Download size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Exportar</span>
                  </button>
                  <label className="flex flex-col items-center gap-2 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-emerald-600 active:scale-95 transition-all cursor-pointer">
                    <Upload size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Importar</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "items" && (
          <motion.div
            key="items"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm font-black text-slate-800 uppercase">Partidas del Sistema</p>
                <button
                  onClick={() => {
                    const id = prompt("ID de la partida (ej: nueva_partida):");
                    if (!id) return;
                    const nombre = prompt("Nombre:");
                    const precio = parseFloat(prompt("Precio por m²:") || "0");
                    const descripcion = prompt("Descripción:");
                    if (id && nombre) {
                      setItems({ ...items, [id]: { nombre, precio, descripcion } });
                      notify("Partida añadida.", "success");
                    }
                  }}
                  className="p-2 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                {Object.entries(items).map(([id, item]) => (
                  <div key={id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase">{item.nombre}</p>
                      <p className="text-[10px] font-bold text-blue-600">{item.precio}€/m²</p>
                    </div>
                    <button
                      onClick={() => {
                        const newItems = { ...items };
                        delete newItems[id];
                        setItems(newItems);
                        notify("Partida eliminada.", "info");
                      }}
                      className="text-red-400 p-2 active:scale-90 transition-transform"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "operarios" && (
          <motion.div
            key="operarios"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm font-black text-slate-800 uppercase">Lista de Operarios</p>
                <button
                  onClick={() => {
                    const nombre = prompt("Nombre del operario:");
                    const coste = parseFloat(prompt("Coste por jornal:") || "120");
                    if (nombre) {
                      setOperarios([...operarios, { nombre, coste }]);
                      notify("Operario añadido.", "success");
                    }
                  }}
                  className="p-2 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform"
                >
                  <PlusCircle size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {operarios.map((op, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase">{op.nombre}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Coste: {op.coste}€</p>
                    </div>
                    <button
                      onClick={() => {
                        const newOps = operarios.filter((_, idx) => idx !== i);
                        setOperarios(newOps);
                        notify("Operario eliminado.", "info");
                      }}
                      className="text-red-400 p-2 active:scale-90 transition-transform"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Screen: Certificación ---

function CertificacionScreen({ 
  avances, 
  obraId, 
  certificaciones, 
  anticipos,
  operariosList,
  notify,
  onSaveCertificacion, 
  onSaveAnticipo,
  onDeleteAnticipo,
  onBack 
}: { 
  avances: Avance[], 
  obraId: string, 
  certificaciones: Certificacion[], 
  anticipos: Anticipo[],
  operariosList: any[],
  notify: (m: string, t?: "success" | "error" | "info") => void,
  onSaveCertificacion: (c: Certificacion) => void,
  onSaveAnticipo: (a: Anticipo) => void,
  onDeleteAnticipo: (id: string) => void,
  onBack: () => void 
}) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [estado, setEstado] = useState<"pendiente" | "cobrado">("pendiente");
  const [fechaCobro, setFechaCobro] = useState<string>("");
  
  // Manual Advance State
  const [manualOp, setManualOp] = useState(operariosList[0]?.nombre || "");
  const [manualCant, setManualCant] = useState(400);
  const [manualFecha, setManualFecha] = useState(new Date().toISOString().split('T')[0]);

  const ejecutado = useMemo(() => {
    return (avances || [])
      .filter(a => a.fecha && a.fecha.startsWith(mes))
      .reduce((acc, curr) => acc + (curr.resumen?.ingresos || 0), 0);
  }, [avances, mes]);

  const totalAnticiposMes = useMemo(() => {
    return (anticipos || [])
      .filter(an => an.fecha && an.fecha.startsWith(mes))
      .reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  }, [anticipos, mes]);

  const certificado = ejecutado - totalAnticiposMes;

  const totalesMensuales = useMemo(() => {
    const fases: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const extras = {
      dobleMalla: 0,
      antifisuras: 0,
      cajeado: { "40": 0, "80": 0, "100": 0 }
    };
    let beneficioTotal = 0;

    (avances || []).filter(a => a.fecha && a.fecha.startsWith(mes)).forEach(a => {
      beneficioTotal += (a.resumen?.beneficio || 0);
      (a.produccion || []).forEach(p => {
        if (p.itemId === "fase1") fases[1] += (p.m2 || 0);
        if (p.itemId === "fase2") fases[2] += (p.m2 || 0);
        if (p.itemId === "fase3") fases[3] += (p.m2 || 0);
        if (p.itemId === "malla") extras.dobleMalla += (p.m2 || 0);
        if (p.itemId === "anti") extras.antifisuras += (p.m2 || 0);
        if (p.itemId === "cajeado40") extras.cajeado["40"] += (p.m2 || 0);
        if (p.itemId === "cajeado80") extras.cajeado["80"] += (p.m2 || 0);
        if (p.itemId === "cajeado100") extras.cajeado["100"] += (p.m2 || 0);
      });
    });

    return { fases, extras, beneficioTotal };
  }, [avances, mes]);

  const operariosStats = useMemo(() => {
    const stats: Record<string, { jornales: number, beneficios: number, anticipos: number }> = {};
    OPERARIOS.forEach(o => stats[o.nombre] = { jornales: 0, beneficios: 0, anticipos: 0 });

    (avances || []).filter(a => a.fecha && a.fecha.startsWith(mes)).forEach(a => {
      (a.operariosPresentes || []).forEach(op => {
        if (stats[op]) {
          stats[op].jornales += OPERARIOS.find(o => o.nombre === op)?.coste || 0;
          stats[op].beneficios += (a.resumen?.beneficioPorOperario || 0);
        }
      });
    });

    (anticipos || []).filter(an => an.fecha && an.fecha.startsWith(mes)).forEach(an => {
      if (stats[an.operario]) {
        stats[an.operario].anticipos += (an.cantidad || 0);
      }
    });

    return stats;
  }, [avances, anticipos, mes]);

  const existingCert = certificaciones.find(c => c.obraId === obraId && c.mes === mes);

  useEffect(() => {
    if (existingCert) {
      setEstado(existingCert.estado);
      setFechaCobro(existingCert.fechaCobro || "");
    } else {
      setEstado("pendiente");
      setFechaCobro("");
    }
  }, [existingCert, mes]);

  const handleSave = () => {
    const cert: Certificacion = {
      id: existingCert?.id || crypto.randomUUID(),
      obraId,
      mes,
      ejecutado,
      anticipos: totalAnticiposMes,
      certificado,
      estado,
      fechaCobro: estado === "cobrado" ? fechaCobro : undefined
    };
    onSaveCertificacion(cert);
  };

  const handleGenerarAnticiposSemanales = () => {
    if (!mes || !mes.includes('-')) {
      notify("Selecciona un mes válido.", "error");
      return;
    }
    const year = parseInt(mes.split('-')[0]);
    const month = parseInt(mes.split('-')[1]) - 1;
    
    const viernes: string[] = [];
    let d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === 5) {
        viernes.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }

    let count = 0;
    viernes.forEach(v => {
      const fridayDate = new Date(v);
      const mondayDate = new Date(fridayDate);
      mondayDate.setDate(fridayDate.getDate() - 4);
      
      const monStr = mondayDate.toISOString().split('T')[0];
      const friStr = fridayDate.toISOString().split('T')[0];

      const operariosSemana = new Set<string>();
      (avances || []).filter(a => a.fecha >= monStr && a.fecha <= friStr).forEach(a => {
        (a.operariosPresentes || []).forEach(op => operariosSemana.add(op));
      });

      operariosSemana.forEach(op => {
        const exists = anticipos.find(an => an.fecha === v && an.operario === op && an.obraId === obraId);
        if (!exists) {
          onSaveAnticipo({
            id: crypto.randomUUID(),
            fecha: v,
            obraId,
            operario: op,
            cantidad: 400
          });
          count++;
        }
      });
    });

    if (count > 0) {
      notify(`Se han generado ${count} anticipos automáticos.`, "success");
    } else {
      notify("No se han encontrado nuevos anticipos para generar.", "info");
    }
  };

  const handleAddManualAnticipo = () => {
    onSaveAnticipo({
      id: crypto.randomUUID(),
      fecha: manualFecha,
      obraId,
      operario: manualOp,
      cantidad: manualCant
    });
    notify("Anticipo manual añadido.", "success");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Certificación</h2>
        <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Mes de Certificación</label>
          <input 
            type="month" 
            value={mes} 
            onChange={(e) => setMes(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-xl text-slate-800 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Ejecutado</label>
            <span className="text-4xl font-black text-slate-800 tracking-tight">{ejecutado.toLocaleString()}€</span>
          </div>

          {/* Totales Mensuales Detallados */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Producción del Mes</label>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">Por Fase</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(f => (
                    <div key={f} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Fase {f}</span>
                      <span className="text-lg font-black text-slate-800">{Math.round(totalesMensuales.fases[f])}</span>
                      <span className="text-[10px] font-black text-slate-300 ml-0.5 uppercase">m²</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">Por Extras</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Doble Malla</span>
                    <span className="text-lg font-black text-orange-600">{Math.round(totalesMensuales.extras.dobleMalla)}</span>
                    <span className="text-[10px] font-black text-slate-300 ml-0.5 uppercase">m²</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Antifisuras</span>
                    <span className="text-lg font-black text-purple-600">{Math.round(totalesMensuales.extras.antifisuras)}</span>
                    <span className="text-[10px] font-black text-slate-300 ml-0.5 uppercase">m²</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["40", "80", "100"].map(c => (
                    <div key={c} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Caj {c}%</span>
                      <span className="text-lg font-black text-emerald-600">{Math.round(totalesMensuales.extras.cajeado[c as "40"|"80"|"100"])}</span>
                      <span className="text-[10px] font-black text-slate-300 ml-0.5 uppercase">m²</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-300 uppercase block">Ingresos Mes</span>
                <span className="text-2xl font-black text-slate-800">{Math.round(ejecutado).toLocaleString()}€</span>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black text-slate-300 uppercase block">Beneficio Mes</span>
                <span className="text-2xl font-black text-blue-600">{Math.round(totalesMensuales.beneficioTotal).toLocaleString()}€</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">Anticipos</label>
              <button 
                onClick={handleGenerarAnticiposSemanales}
                className="text-[10px] font-black bg-orange-600 text-white px-4 py-2 rounded-xl uppercase tracking-widest active:scale-95 transition-transform"
              >
                Auto-Generar
              </button>
            </div>
            <span className="text-4xl font-black text-orange-700 tracking-tight block">{totalAnticiposMes.toLocaleString()}€</span>
            
            <div className="space-y-4">
              {/* Manual Entry */}
              <div className="bg-white p-4 rounded-2xl border border-orange-100 space-y-4">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Añadir Manual</p>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={manualOp} 
                    onChange={(e) => setManualOp(e.target.value)}
                    className="bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-slate-800"
                  >
                    {operariosList.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                  </select>
                  <input 
                    type="number" 
                    value={manualCant} 
                    onChange={(e) => setManualCant(Number(e.target.value))}
                    className="bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={manualFecha} 
                    onChange={(e) => setManualFecha(e.target.value)}
                    className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-slate-800"
                  />
                  <button 
                    onClick={handleAddManualAnticipo}
                    className="bg-orange-600 text-white px-6 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {anticipos.filter(an => an.fecha.startsWith(mes)).map(an => (
                  <div key={an.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-orange-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 uppercase">{an.operario}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(an.fecha).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-orange-700">{an.cantidad}€</span>
                      <button onClick={() => onDeleteAnticipo(an.id)} className="text-red-400 p-2 active:scale-90 transition-transform">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-100">
            <label className="text-[10px] font-black opacity-70 uppercase tracking-widest block mb-1">A Certificar Neto</label>
            <span className="text-5xl font-black tracking-tight">{certificado.toLocaleString()}€</span>
          </div>
        </div>

        {/* Resumen por Operario */}
        <div className="space-y-4 pt-8 border-t border-slate-50">
          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Liquidación por Operario</h4>
          <div className="space-y-3">
            {(Object.entries(operariosStats) as [string, { jornales: number, beneficios: number, anticipos: number }][]).map(([name, stat]) => (
              <div key={name} className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-slate-800 uppercase tracking-tight">{name}</span>
                  <div className="text-right">
                    <label className="text-[9px] font-black text-slate-400 uppercase block">Total Devengado</label>
                    <span className="text-lg font-black text-blue-600">{(stat.jornales + stat.beneficios).toFixed(0)}€</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                  <div className="bg-white p-2 rounded-xl">Jornales<br/><span className="text-slate-800">{stat.jornales}€</span></div>
                  <div className="bg-white p-2 rounded-xl">Extra<br/><span className="text-slate-800">{stat.beneficios.toFixed(0)}€</span></div>
                  <div className="bg-orange-100 text-orange-700 p-2 rounded-xl">Anticipos<br/>{stat.anticipos}€</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo a Cobrar:</span>
                  <span className="text-xl font-black text-emerald-600">{(stat.jornales + stat.beneficios - stat.anticipos).toFixed(0)}€</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-8 border-t border-slate-50">
          <div className="flex gap-3">
            <button 
              onClick={() => setEstado("pendiente")}
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${estado === "pendiente" ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm" : "bg-white border-slate-100 text-slate-300"}`}
            >
              {estado === "pendiente" && <Check size={18} />} Pendiente
            </button>
            <button 
              onClick={() => setEstado("cobrado")}
              className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${estado === "cobrado" ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" : "bg-white border-slate-100 text-slate-300"}`}
            >
              {estado === "cobrado" && <Check size={18} />} Cobrado
            </button>
          </div>

          {estado === "cobrado" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 overflow-hidden"
            >
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Fecha de Cobro Real</label>
              <input 
                type="date" 
                value={fechaCobro} 
                onChange={(e) => setFechaCobro(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-slate-800 outline-none"
              />
            </motion.div>
          )}
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] active:scale-95 transition-all text-lg uppercase tracking-widest shadow-xl shadow-slate-100"
        >
          Guardar Certificación
        </button>
      </div>
    </div>
  );
}
