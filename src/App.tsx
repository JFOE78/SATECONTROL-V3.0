import React, { useState, useEffect } from "react";
import { 
  Home as HomeIcon, 
  PlusCircle, 
  Calendar, 
  FileText, 
  ChevronRight,
  Edit2,
  Check,
  X
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AppProvider, useApp } from "./context/AppContext";
import { Inicio } from "./screens/Inicio";
import { RegistrarAvance } from "./screens/RegistrarAvance";
import { Calendario } from "./screens/Calendario";
import { CertificacionScreen } from "./screens/CertificacionScreen";
import { ConfigScreen } from "./screens/ConfigScreen";
import { GestionObras } from "./screens/GestionObras";
import { GastosScreen } from "./screens/GastosScreen";
import { OperarioDetalleScreen } from "./screens/OperarioDetalleScreen";
import { ProduccionBloquesScreen } from "./screens/ProduccionBloquesScreen";
import { Avance } from "./types";

type Screen = "inicio" | "registrar" | "calendario" | "certificacion" | "obras" | "config" | "gastos" | "operario_detalle" | "produccion_bloques";

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("inicio");
  const [editingAvance, setEditingAvance] = useState<Avance | null>(null);
  const [selectedOperarioName, setSelectedOperarioName] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const { notification, theme, obras, selectedObraId } = useApp();
  const selectedObra = obras.find(o => o.id === selectedObraId);

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

  const navigateTo = (screen: Screen) => {
    if (screen !== "registrar") {
      setEditingAvance(null);
    }
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "inicio":
        return <Inicio onNavigate={navigateTo} onInstall={handleInstallClick} showInstall={!!deferredPrompt} />;
      case "registrar":
        return <RegistrarAvance initialAvance={editingAvance} onCancel={() => { setEditingAvance(null); navigateTo("inicio"); }} />;
      case "calendario":
        return (
          <Calendario 
            onEdit={(a) => { setEditingAvance(a); setCurrentScreen("registrar"); }} 
            onBack={() => navigateTo("inicio")} 
            onNew={(date) => { 
              setEditingAvance({ 
                id: '', 
                fecha: date, 
                obraId: selectedObraId!, 
                operariosPresentes: [], 
                produccion: [], 
                bloque: '', 
                resumen: { ingresos: 0, costeManoObra: 0, beneficio: 0 } 
              }); 
              setCurrentScreen("registrar"); 
            }} 
          />
        );
      case "certificacion":
        return <CertificacionScreen onBack={() => navigateTo("inicio")} onOperarioClick={(n) => { setSelectedOperarioName(n); setCurrentScreen("operario_detalle"); }} />;
      case "config":
        return <ConfigScreen onBack={() => navigateTo("inicio")} />;
      case "obras":
        return <GestionObras onBack={() => navigateTo("inicio")} />;
      case "gastos":
        return <GastosScreen onBack={() => navigateTo("inicio")} />;
      case "operario_detalle":
        return <OperarioDetalleScreen operarioName={selectedOperarioName!} onBack={() => setCurrentScreen("certificacion")} />;
      case "produccion_bloques":
        return <ProduccionBloquesScreen onBack={() => navigateTo("inicio")} onNavigate={navigateTo} />;
      default:
        return <Inicio onNavigate={navigateTo} onInstall={handleInstallClick} showInstall={!!deferredPrompt} />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-black' : 'bg-slate-50'} font-sans text-slate-900 pb-24`}>
      <header className="p-6 bg-white dark:bg-black border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 dark:shadow-none">
              <PlusCircle className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">SATE<span className="text-blue-600">PRO</span></h1>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-1">Obra</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{selectedObra?.nombre || "---"}</span>
            </div>
            <button 
              onClick={() => setCurrentScreen("obras")}
              className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-blue-600 active:scale-90 transition-transform"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {renderScreen()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-40 max-w-md mx-auto rounded-t-[2.5rem] shadow-2xl">
        <NavButton active={currentScreen === "inicio"} onClick={() => navigateTo("inicio")} icon={<HomeIcon size={26} />} label="Inicio" />
        <NavButton active={currentScreen === "calendario"} onClick={() => navigateTo("calendario")} icon={<Calendar size={26} />} label="Agenda" />
        <NavButton active={currentScreen === "certificacion"} onClick={() => navigateTo("certificacion")} icon={<FileText size={26} />} label="Cierre" />
      </nav>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-28 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className={`p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border-2 ${
              notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" :
              notification.type === "error" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" :
              "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
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
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[70px] transition-all duration-200 ${active ? "text-blue-600 scale-110" : "text-slate-400"}`}>
      <div className={`${active ? "bg-blue-50 dark:bg-blue-900/20 p-1 rounded-xl" : ""}`}>{icon}</div>
      <span className={`text-[10px] font-black mt-1 uppercase tracking-tighter ${active ? "opacity-100" : "opacity-60"}`}>{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
