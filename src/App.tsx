/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Database,
  Share2,
  FileDown,
  MessageCircle,
  Receipt,
  Wallet,
  Activity
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { storage } from "./lib/storage";
import { shareService } from "./services/shareService";
import { Obra, Avance, Certificacion, Produccion, Resumen, Anticipo, Gasto } from "./types";
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

type Screen = "inicio" | "registrar" | "calendario" | "certificacion" | "obras" | "config" | "gastos" | "operario_detalle";

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
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [itemsSate, setItemsSate] = useState<Record<string, any>>(ITEMS_SATE);
  const [operariosList, setOperariosList] = useState<any[]>(OPERARIOS);
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const [editingAvance, setEditingAvance] = useState<Avance | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [modal, setModal] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [manualBloque, setManualBloque] = useState<string>("");
  const [selectedOperarioName, setSelectedOperarioName] = useState<string | null>(null);

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
    const loadedGastos = storage.getGastos();
    const loadedItems = storage.getItems();
    const loadedOperarios = storage.getOperarios();
    const loadedTheme = storage.getTheme();
    const activeObraId = storage.getActiveObraId();

    // --- Limpieza de datos (Migración) ---
    const cleanOperarios = (loadedOperarios || OPERARIOS).map((op: any) => ({
      ...op,
      nombre: op.nombre.trim()
    }));
    
    // Eliminar duplicados exactos en la lista de configuración
    const configOpsUnique = cleanOperarios.filter((op: any, index: number, self: any[]) =>
      index === self.findIndex((t: any) => t.nombre.toLowerCase() === op.nombre.toLowerCase())
    );

    const cleanAvances = loadedAvances.map((a: Avance) => ({
      ...a,
      // Trim y eliminar duplicados en cada parte diario
      operariosPresentes: Array.from(new Set((a.operariosPresentes || []).map(o => o.trim()))).filter(Boolean)
    }));

    const cleanAnticipos = loadedAnticipos.map((an: Anticipo) => ({
      ...an,
      operario: an.operario.trim()
    }));

    // --- Inyección de datos de Abril compartidos por el usuario ---
    const normalizeName = (s: string) => 
      s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const sharedAvancesAbril: Avance[] = [
      { id: "c48963d9-3a2e-44a5-a3e7-7e09c7e2b0ec", fecha: "2026-04-08", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "fase1", m2: 95, bloque: "Bloque 5" }], resumen: { ingresos: 760, costeManoObra: 510, beneficio: 250, beneficioPorOperario: 50 } },
      { id: "0943a8ca-03d2-44a1-af59-b9e1d9efd93a", fecha: "2026-04-09", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "fase2", m2: 85, bloque: "Bloque 5" }], resumen: { ingresos: 680, costeManoObra: 510, beneficio: 170, beneficioPorOperario: 34 } },
      { id: "f1bd76af-82d7-481a-968e-5d283182c313", fecha: "2026-04-10", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "fase2", m2: 85, bloque: "Bloque 5" }], resumen: { ingresos: 680, costeManoObra: 510, beneficio: 170, beneficioPorOperario: 34 } },
      { id: "a1cea5b7-c820-438a-9744-ef8f06e8fbe1", fecha: "2026-04-13", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "anti", m2: 48, bloque: "Bloque 5" }, { itemId: "malla", m2: 100.5, bloque: "Bloque 5" }, { itemId: "malla", m2: 50.57, bloque: "Bloque 13" }], resumen: { ingresos: 785.84, costeManoObra: 510, beneficio: 275.84, beneficioPorOperario: 55.16 } },
      { id: "46b5f97c-5fce-40e0-aa2b-6b5ec0f77964", fecha: "2026-04-14", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "fase2", m2: 85, bloque: "Bloque 5" }], resumen: { ingresos: 680, costeManoObra: 510, beneficio: 170, beneficioPorOperario: 34 } },
      { id: "fa8e8559-a9ff-4597-a519-102f846f0c97", fecha: "2026-04-15", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "fase2", m2: 85, bloque: "Bloque 5" }], resumen: { ingresos: 680, costeManoObra: 510, beneficio: 170, beneficioPorOperario: 34 } },
      { id: "85ab28b9-b654-4558-a9cb-e49a45b552d6", fecha: "2026-04-16", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 13", operariosPresentes: ["Juan", "Mosquito", "Antonio", "Jesules", "David"], produccion: [{ itemId: "cajeado40", m2: 16.26, bloque: "Bloque 5" }, { itemId: "fase1", m2: 90, bloque: "Bloque 5" }, { itemId: "anti", m2: 8, bloque: "Bloque 13" }], resumen: { ingresos: 914.08, costeManoObra: 510, beneficio: 404.08, beneficioPorOperario: 80.81 } },
      { id: "12c70e94-ed6a-43c6-b41b-37c938e27514", fecha: "2026-04-17", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", bloque: "Bloque 5", operariosPresentes: ["Juan", "Mosquito", "Antonio", "David", "Jesules"], produccion: [{ itemId: "fase1", m2: 60, bloque: "Bloque 5" }, { itemId: "anti", m2: 22, bloque: "Bloque 5" }], resumen: { ingresos: 656, costeManoObra: 510, beneficio: 146, beneficioPorOperario: 29.2 } }
    ];

    const sharedAnticiposAbril: Anticipo[] = [
      { id: "ant-a1", fecha: "2026-04-10", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Mosquito", cantidad: 400 },
      { id: "ant-a2", fecha: "2026-04-10", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Juan", cantidad: 400 },
      { id: "ant-a3", fecha: "2026-04-10", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Antonio", cantidad: 400 },
      { id: "ant-a4", fecha: "2026-04-10", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Jesules", cantidad: 400 },
      { id: "ant-a5", fecha: "2026-04-10", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "David", cantidad: 400 },
      { id: "ant-a6", fecha: "2026-04-17", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Juan", cantidad: 400 },
      { id: "ant-a7", fecha: "2026-04-17", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Mosquito", cantidad: 400 },
      { id: "ant-a8", fecha: "2026-04-17", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Antonio", cantidad: 400 },
      { id: "ant-a9", fecha: "2026-04-17", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "Jesules", cantidad: 400 },
      { id: "ant-a10", fecha: "2026-04-17", obraId: activeObraId || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", operario: "David", cantidad: 400 }
    ];

    // Combinar evitando duplicados por fecha y bloque (avances) o operario y fecha (anticipos)
    const finalAvances = [...cleanAvances];
    sharedAvancesAbril.forEach(shared => {
      const isDuplicate = finalAvances.some(a => 
        a.fecha === shared.fecha && 
        a.bloque === shared.bloque && 
        a.obraId === shared.obraId
      );
      if (!isDuplicate) {
        finalAvances.push(shared);
      }
    });

    const finalAnticipos = [...cleanAnticipos];
    sharedAnticiposAbril.forEach(shared => {
      const isDuplicate = finalAnticipos.some(an => 
        an.fecha === shared.fecha && 
        normalizeName(an.operario) === normalizeName(shared.operario) &&
        an.obraId === shared.obraId
      );
      if (!isDuplicate) {
        finalAnticipos.push(shared);
      }
    });

    // --- Sincronización de Precios (Crucial) ---
    // Si los items cargados tienen precio 0, usamos el de constants.ts
    const syncedItems = { ...(loadedItems || ITEMS_SATE) };
    Object.keys(ITEMS_SATE).forEach(key => {
      if (!syncedItems[key]) {
        syncedItems[key] = { ...ITEMS_SATE[key] };
      } else if (syncedItems[key].precio === 0 && ITEMS_SATE[key].precio > 0) {
        syncedItems[key].precio = ITEMS_SATE[key].precio;
      }
    });

    setItemsSate(syncedItems);
    setOperariosList(configOpsUnique);
    setAvances(finalAvances);
    setAnticipos(finalAnticipos);
    setGastos(loadedGastos);
    setCertificaciones(loadedCertificaciones);
    
    // Guardar para que persistan
    storage.saveAvances(finalAvances);
    storage.saveAnticipos(finalAnticipos);
    storage.saveItems(syncedItems);
    setTheme(loadedTheme);
    document.documentElement.classList.toggle('dark', loadedTheme === 'dark');
    document.body.classList.toggle('dark', loadedTheme === 'dark');

    if (loadedObras.length === 0) {
      const defaultObras: Obra[] = [
        { id: "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", nombre: "Parque Alcosa", numBloques: 20 },
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
    return (avances || []).filter(a => {
      const d = new Date(a.fecha);
      const isProcessed = certificaciones.some(c => 
        c.obraId === selectedObraId && 
        c.estado === 'cobrado' && 
        c.fechaInicio && c.fechaFin && 
        a.fecha >= c.fechaInicio && a.fecha <= c.fechaFin
      );
      return d.getMonth() === month && d.getFullYear() === year && a.obraId === selectedObraId && !isProcessed;
    });
  }, [avances, selectedObraId, certificaciones]);

  const calculateAvanceEconomics = useCallback((a: Avance) => {
    // Normalización robusta para evitar fallos por tildes, espacios o mayúsculas
    const normalize = (s: string) => 
      s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const uniqueOpsRaw = Array.from(new Set(a.operariosPresentes || []));
    const uniqueOpsNormalized = Array.from(new Set(uniqueOpsRaw.map(n => normalize(n as string))));
    
    const ingresos = (a.produccion || []).reduce((acc, p) => {
      const item = itemsSate[p.itemId];
      return acc + (p.m2 * (item?.precio || 0));
    }, 0);

    const costeManoObra = uniqueOpsNormalized.reduce((acc, nameToFind) => {
      const op = operariosList.find(o => normalize(o.nombre) === nameToFind);
      return acc + (op?.coste || 0);
    }, 0);

    const beneficio = ingresos - costeManoObra;
    const beneficioPorOperario = uniqueOpsNormalized.length > 0 ? beneficio / uniqueOpsNormalized.length : 0;
    
    return { 
      ingresos, 
      costeManoObra, 
      beneficio, 
      beneficioPorOperario, 
      cantOps: uniqueOpsNormalized.length 
    };
  }, [itemsSate, operariosList]);

  const monthlyProfit = useMemo(() => 
    (currentMonthAvances || []).reduce((acc, curr) => acc + calculateAvanceEconomics(curr).beneficio, 0),
    [currentMonthAvances, itemsSate, operariosList]
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
            avances={avances.filter(a => a.obraId === selectedObraId)}
            lastAvance={lastAvance}
            lastBloque={lastBloque}
            onSetLastBloque={setManualBloque}
            onInstall={handleInstallClick}
            showInstall={!!deferredPrompt}
            itemsSate={itemsSate}
            operariosList={operariosList}
            calculateEconomics={calculateAvanceEconomics}
            gastos={gastos.filter(g => g.obraId === selectedObraId)}
            certificaciones={certificaciones}
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
            obra={selectedObra!}
            calculateEconomics={calculateAvanceEconomics}
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
            setModal={setModal}
          />
        );
      case "certificacion":
        return (
          <CertificacionScreen 
            avances={avances.filter(a => a.obraId === selectedObraId)}
            obraId={selectedObraId}
            obra={selectedObra!}
            certificaciones={certificaciones}
            anticipos={anticipos.filter(an => an.obraId === selectedObraId)}
            gastos={gastos.filter(g => g.obraId === selectedObraId)}
            operariosList={operariosList}
            itemsSate={itemsSate}
            notify={notify}
            calculateEconomics={calculateAvanceEconomics}
            onOperarioClick={(name) => {
              setSelectedOperarioName(name);
              setCurrentScreen("operario_detalle");
            }}
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
              const ants = Array.isArray(ant) ? ant : [ant];
              setAnticipos(prev => {
                const next = [...prev, ...ants];
                storage.saveAnticipos(next);
                return next;
              });
            }}
            onDeleteAnticipo={(id) => {
              const newAnts = anticipos.filter(an => an.id !== id);
              setAnticipos(newAnts);
              storage.saveAnticipos(newAnts);
            }}
            onBack={() => setCurrentScreen("inicio")}
          />
        );
      case "gastos":
        return (
          <GastosScreen 
            gastos={gastos.filter(g => g.obraId === selectedObraId)}
            obraId={selectedObraId}
            operarios={operariosList}
            onSave={(g) => {
              const newGastos = [...gastos, g];
              setGastos(newGastos);
              storage.saveGastos(newGastos);
            }}
            onDelete={(id) => {
              const newGastos = gastos.filter(g => g.id !== id);
              setGastos(newGastos);
              storage.saveGastos(newGastos);
            }}
            onBack={() => setCurrentScreen("inicio")}
          />
        );
      case "operario_detalle":
        return (
          <OperarioDetalleScreen 
            operarioName={selectedOperarioName!}
            avances={avances.filter(a => a.obraId === selectedObraId)}
            anticipos={anticipos.filter(a => a.obraId === selectedObraId)}
            gastos={gastos.filter(a => a.obraId === selectedObraId)}
            onBack={() => setCurrentScreen("certificacion")}
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
            avances={avances.filter(a => a.obraId === selectedObraId)}
            gastos={gastos.filter(g => g.obraId === selectedObraId)}
            lastAvance={lastAvance}
            lastBloque={lastBloque}
            onSetLastBloque={setManualBloque}
            onInstall={handleInstallClick}
            showInstall={!!deferredPrompt}
            itemsSate={itemsSate}
            operariosList={operariosList}
            calculateEconomics={calculateAvanceEconomics}
            certificaciones={certificaciones}
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-40 max-w-md mx-auto rounded-t-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-black">
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
  showInstall,
  itemsSate,
  operariosList,
  calculateEconomics,
  gastos,
  certificaciones
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
  showInstall: boolean,
  itemsSate: Record<string, any>,
  operariosList: any[],
  calculateEconomics: (a: Avance) => { ingresos: number, costeManoObra: number, beneficio: number },
  gastos: Gasto[],
  certificaciones: Certificacion[]
}) {
  const selectedObra = useMemo(() => obras.find(o => o.id === selectedObraId), [obras, selectedObraId]);
  
  const isDataProcessed = useCallback((date: string) => {
    return (certificaciones || []).some(c => 
      c.obraId === selectedObraId && 
      c.estado === 'cobrado' && 
      c.fechaInicio && c.fechaFin && 
      date >= c.fechaInicio && date <= c.fechaFin
    );
  }, [certificaciones, selectedObraId]);

  const bloques = useMemo(() => {
    if (!selectedObra) return [];
    return Array.from({ length: selectedObra.numBloques }, (_, i) => `Bloque ${i + 1}`);
  }, [selectedObra]);
  
  const produccionPorBloque = useMemo(() => {
    const stats: Record<string, { m2: number, beneficio: number, costeMO: number }> = {};
    (avances || []).filter(a => a.obraId === selectedObraId && !isDataProcessed(a.fecha)).forEach(a => {
      const economics = calculateEconomics(a);
      (a.produccion || []).forEach(p => {
        if (!p.bloque) return;
        if (!stats[p.bloque]) stats[p.bloque] = { m2: 0, beneficio: 0, costeMO: 0 };
        stats[p.bloque].m2 += (p.m2 || 0);
        // Proporcional al m2 del avance para repartir coste y beneficio
        const totalM2Avance = (a.produccion || []).reduce((sum, pr) => sum + (pr.m2 || 0), 0);
        const ratio = totalM2Avance > 0 ? (p.m2 || 0) / totalM2Avance : 0;
        stats[p.bloque].beneficio += economics.beneficio * ratio;
        stats[p.bloque].costeMO += economics.costeManoObra * ratio;
      });
    });
    return stats;
  }, [avances, selectedObraId, itemsSate, operariosList, calculateEconomics, isDataProcessed]);

  const totalAcumulado = useMemo(() => {
    const advancesEcon = (avances || [])
      .filter(a => a.obraId === selectedObraId && !isDataProcessed(a.fecha))
      .reduce((acc, curr) => {
        const econ = calculateEconomics(curr);
        return {
          costeMO: acc.costeMO + econ.costeManoObra,
          beneficio: acc.beneficio + econ.beneficio
        };
      }, { costeMO: 0, beneficio: 0 });
      
    const totalG = (gastos || [])
      .filter(g => g.obraId === selectedObraId && !isDataProcessed(g.fecha))
      .reduce((sum, g) => sum + g.monto, 0);

    return {
      costeMO: advancesEcon.costeMO,
      beneficio: advancesEcon.beneficio - totalG,
      totalGastos: totalG
    };
  }, [avances, gastos, calculateEconomics, isDataProcessed, selectedObraId]);

  const weeklyTrend = useMemo(() => {
    const data: any[] = [];
    const now = new Date();
    
    const currentMonday = new Date(now);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0,0,0,0);

    for (let i = 3; i >= 0; i--) {
      const startOfWeek = new Date(currentMonday);
      startOfWeek.setDate(currentMonday.getDate() - (i * 7));
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);

      const weekAvances = (avances || []).filter(a => {
        const d = new Date(a.fecha);
        return d >= startOfWeek && d <= endOfWeek && a.obraId === selectedObraId && !isDataProcessed(a.fecha);
      });

      const beneficio = weekAvances.reduce((sum, a) => sum + calculateEconomics(a).beneficio, 0);
      
      data.push({
        name: i === 0 ? 'ACTUAL' : `S- ${i}`,
        beneficio: Math.round(beneficio),
        rango: `${startOfWeek.getDate()}/${startOfWeek.getMonth()+1}`
      });
    }
    return data;
  }, [avances, calculateEconomics, isDataProcessed, selectedObraId]);

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
              <p className="text-xl font-black text-blue-600">+{calculateEconomics(lastAvance).beneficio.toFixed(0)}€</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Beneficio Día</p>
            </div>
          </div>
        </section>
      )}

      {/* Resumen Acumulado Obra */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Resumen Acumulado</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-300 uppercase block">Coste M.O. Total</span>
            <span className="text-2xl font-black text-slate-800">{Math.round(totalAcumulado.costeMO).toLocaleString()}€</span>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-black text-orange-300 uppercase block">Gastos Otros</span>
            <span className="text-2xl font-black text-orange-600">{Math.round(totalAcumulado.totalGastos).toLocaleString()}€</span>
          </div>
          <div className="col-span-2 pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-[10px] font-black text-blue-400 uppercase block uppercase tracking-widest">Beneficio Neto Total</span>
            <span className="text-3xl font-black text-blue-600">{Math.round(totalAcumulado.beneficio).toLocaleString()}€</span>
          </div>
        </div>

        <button 
          onClick={() => onNavigate("gastos")}
          className="w-full bg-slate-50 p-4 rounded-2xl flex items-center justify-between active:scale-95 transition-all group mt-2"
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white">
              <Receipt size={18} />
            </div>
            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Gestionar Gastos</span>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Gráfica de Tendencia */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tendencia Semanal</label>
            <p className="text-[10px] font-bold text-slate-300 uppercase">Beneficio Neto Últimas 4 Semanas</p>
          </div>
          <Activity size={20} className="text-blue-500 opacity-20" />
        </div>
        
        <div className="h-40 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}}
                hide
              />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
              />
              <Area 
                type="monotone" 
                dataKey="beneficio" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBen)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Producción por Bloque */}
      <section className="space-y-3">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Producción por Bloque</label>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(produccionPorBloque).sort().map(([b, s]) => {
            const stats = s as { m2: number, beneficio: number, costeMO: number };
            return (
              <div key={b} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs">
                    {b.replace("Bloque ", "")}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase">{b}</h4>
                    <p className="text-[10px] font-bold text-slate-400">{Math.round(stats.beneficio).toLocaleString()}€ beneficio</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-800">{Math.round(stats.costeMO).toLocaleString()}</span>
                  <span className="text-[10px] font-black text-slate-300 ml-1 uppercase">€ M.O.</span>
                </div>
              </div>
            );
          })}
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

// --- Screen: Gastos ---

function GastosScreen({ 
  gastos, 
  obraId, 
  operarios, 
  onSave, 
  onDelete, 
  onBack 
}: { 
  gastos: Gasto[], 
  obraId: string, 
  operarios: any[], 
  onSave: (g: Gasto) => void, 
  onDelete: (id: string) => void, 
  onBack: () => void 
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [pagadoPor, setPagadoPor] = useState("");

  const handleSave = () => {
    if (!concepto || !monto) return;
    onSave({
      id: crypto.randomUUID(),
      fecha: new Date().toISOString().split('T')[0],
      obraId,
      concepto,
      monto: Number(monto),
      pagadoPor: pagadoPor || undefined
    });
    setModalOpen(false);
    setConcepto("");
    setMonto("");
    setPagadoPor("");
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 bg-white rounded-xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Otros Gastos</h2>
      </header>

      <div className="bg-orange-500 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-100 flex justify-between items-center">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Gastos</label>
          <div className="text-4xl font-black">{gastos.reduce((sum, g) => sum + g.monto, 0).toLocaleString()}€</div>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-white/20 hover:bg-white/30 p-4 rounded-3xl backdrop-blur-md transition-all active:scale-95"
        >
          <PlusCircle size={32} />
        </button>
      </div>

      <div className="space-y-3">
        {gastos.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay gastos registrados</p>
          </div>
        ) : (
          gastos.sort((a,b) => b.fecha.localeCompare(a.fecha)).map(g => (
            <div key={g.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-orange-500">
                  <Receipt size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">{g.concepto}</h4>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{g.fecha}</span>
                    {g.pagadoPor && (
                      <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md uppercase">Pagado por {g.pagadoPor}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-black text-slate-800">{g.monto}€</span>
                <button 
                  onClick={() => onDelete(g.id)}
                  className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl overflow-hidden"
            >
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Gasto</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Registra un pago extra</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Concepto / Factura</label>
                  <input 
                    type="text" 
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Ej: Alquiler Andamio"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Monto (€)</label>
                  <input 
                    type="number" 
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">¿Pagado por alguien?</label>
                  <select 
                    value={pagadoPor}
                    onChange={(e) => setPagadoPor(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none appearance-none"
                  >
                    <option value="">Empresa (Caja)</option>
                    {operarios.map(o => (
                      <option key={o.nombre} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSave}
                  className="w-full bg-orange-500 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-orange-100 active:scale-95 transition-all uppercase tracking-widest"
                >
                  Guardar Gasto
                </button>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="w-full font-black text-slate-400 py-2 uppercase tracking-widest text-xs"
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
}

// --- Screen: Detalle Operario ---

function OperarioDetalleScreen({ 
  operarioName, 
  avances, 
  anticipos, 
  gastos,
  onBack 
}: { 
  operarioName: string, 
  avances: Avance[], 
  anticipos: Anticipo[], 
  gastos: Gasto[],
  onBack: () => void 
}) {
  const stats = useMemo(() => {
    const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const opClean = normalize(operarioName);

    const jornadas = avances.filter(a => 
      (a.operariosPresentes || []).some(o => normalize(o) === opClean)
    ).length;

    const totalAnticipos = anticipos.filter(a => normalize(a.operario) === opClean)
      .reduce((sum, a) => sum + a.cantidad, 0);

    const reembolsosPendientes = gastos.filter(g => g.pagadoPor && normalize(g.pagadoPor) === opClean)
      .reduce((sum, g) => sum + g.monto, 0);

    return { jornadas, totalAnticipos, reembolsosPendientes };
  }, [operarioName, avances, anticipos, gastos]);

  return (
    <div className="space-y-6 pb-12">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white rounded-xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{operarioName}</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Resumen Personal</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-2 flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
            <Users size={32} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Días Trabajados</label>
            <span className="text-4xl font-black text-slate-800">{stats.jornadas}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Anticipos</label>
          <span className="text-2xl font-black text-red-500">{stats.totalAnticipos}€</span>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Reembolsos</label>
          <span className="text-2xl font-black text-emerald-500">{stats.reembolsosPendientes}€</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Actividad Reciente</h3>
        <div className="bg-white rounded-[2.5rem] p-2 border border-slate-100 shadow-sm space-y-1">
          {[
            ...anticipos.filter(a => a.operario.trim().toLowerCase() === operarioName.trim().toLowerCase()).map(a => ({ type: "anticipo", ...a })),
            ...gastos.filter(g => g.pagadoPor?.trim().toLowerCase() === operarioName.trim().toLowerCase()).map(g => ({ type: "gasto", ...g }))
          ].sort((a,b) => b.fecha.localeCompare(a.fecha)).map((item: any, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'anticipo' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {item.type === 'anticipo' ? <Wallet size={20} /> : <Receipt size={20} />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 uppercase leading-tight">{item.type === 'anticipo' ? 'Anticipo' : item.concepto}</p>
                  <p className="text-[10px] font-bold text-slate-400">{item.fecha}</p>
                </div>
              </div>
              <span className={`font-black ${item.type === 'anticipo' ? 'text-red-500' : 'text-emerald-500'}`}>
                {item.type === 'anticipo' ? '-' : '+'}{item.cantidad || item.monto}€
              </span>
            </div>
          ))}
          {stats.jornadas === 0 && stats.totalAnticipos === 0 && stats.reembolsosPendientes === 0 && (
            <div className="p-8 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Sin registros este mes</div>
          )}
        </div>
      </div>
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
    const draftStr = localStorage.getItem(`sate_avance_draft_${obra.id}`);
    if (!draftStr) return null;
    try {
      return JSON.parse(draftStr);
    } catch (e) {
      return null;
    }
  };

  const draft = getDraft();

  const [fecha, setFecha] = useState(() => {
    if (initialAvance?.fecha) return initialAvance.fecha;
    if (draft?.fecha) return draft.fecha;
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [bloque, setBloque] = useState(initialAvance?.bloque || draft?.bloque || lastBloque || "");
  const [operarios, setOperarios] = useState<string[]>(initialAvance?.operariosPresentes || draft?.operariosPresentes || operariosList.map(o => o.nombre));
  const [producciones, setProducciones] = useState<Produccion[]>(initialAvance?.produccion || draft?.produccion || []);
  
  // Formulario producción actual
  const [selectedItemId, setSelectedItemId] = useState<string>(() => {
    if (initialAvance?.produccion?.[0]?.itemId) return initialAvance.produccion[0].itemId;
    if (draft?.produccion?.[0]?.itemId) return draft.produccion[0].itemId;
    const firstItem = Object.keys(itemsSate)[0];
    return firstItem || "fase1";
  });
  const [m2String, setM2String] = useState<string>(initialAvance ? "" : (draft?.m2String || ""));
  const [m2, setM2] = useState<number>(0);
  const [prodBloque, setProdBloque] = useState(initialAvance?.bloque || draft?.bloque || lastBloque || "");

  // Auto-select all operators if attendance is empty but list is not
  useEffect(() => {
    // If it's a new advance and we don't have operators selected yet, auto-select them all
    if (!initialAvance && operarios.length === 0 && operariosList.length > 0) {
      setOperarios(operariosList.map(o => o.nombre));
    }
  }, [operariosList, initialAvance, draft]);

  // Save draft
  useEffect(() => {
    if (!initialAvance && obra) {
      localStorage.setItem(`sate_avance_draft_${obra.id}`, JSON.stringify({ 
        fecha, 
        bloque, 
        operariosPresentes: operarios, 
        produccion: producciones,
        m2String // Save m2 typing state
      }));
    }
  }, [fecha, bloque, operarios, producciones, m2String, initialAvance, obra]);

  const toggleOperario = (nombre: string) => {
    setOperarios(prev => {
      const isPresent = prev.some(n => n.trim().toLowerCase() === nombre.trim().toLowerCase());
      if (isPresent) {
        return prev.filter(n => n.trim().toLowerCase() !== nombre.trim().toLowerCase());
      }
      return [...prev, nombre.trim()];
    });
  };

  const addProduccion = () => {
    const numericM2 = parseFloat(m2String.replace(',', '.'));
    if (isNaN(numericM2) || numericM2 <= 0) {
      notify("Introduce un número válido de metros cuadrados.", "error");
      return;
    }
    if (!selectedItemId || !itemsSate[selectedItemId]) {
      notify("Selecciona un ítem válido para esta producción.", "error");
      return;
    }

    const p: Produccion = {
      itemId: selectedItemId,
      m2: numericM2,
      bloque: prodBloque || bloque
    };
    setProducciones([...producciones, p]);
    // Reset form
    setM2String("");
  };

  const removeProduccion = (index: number) => {
    setProducciones(producciones.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!obra) return;

    const normalizeList = (list: string[]) => 
      Array.from(new Set(list.map(n => n.trim()))).filter(Boolean);

    const uniqueOps = normalizeList(operarios || []);

    if (uniqueOps.length === 0) {
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

    // Calcular resumen dinámicamente
    let ingresos = 0;
    (producciones || []).forEach(p => {
      const item = itemsSate[p.itemId];
      if (item) {
        ingresos += (p.m2 || 0) * (item.precio || 0);
      }
    });

    const costeManoObra = uniqueOps.reduce((acc, nombre) => {
      const op = (operariosList || []).find(o => o.nombre === nombre);
      return acc + (op?.coste || 0);
    }, 0);

    const beneficio = ingresos - costeManoObra;
    const beneficioPorOperario = uniqueOps.length > 0 ? beneficio / uniqueOps.length : 0;

    const avance: Avance = {
      id: initialAvance?.id || crypto.randomUUID(),
      fecha,
      obraId: obra.id,
      bloque,
      operariosPresentes: uniqueOps,
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
        <div className="flex justify-between items-center px-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asistencia Operarios</label>
          {operariosList.length === 0 && (
            <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 uppercase">Configura operarios primero</span>
          )}
        </div>
        
        {operariosList.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {operariosList.map(op => (
              <button
                key={op.nombre}
                onClick={() => toggleOperario(op.nombre)}
                className={`flex justify-between items-center px-4 py-4 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${
                  operarios.some(n => n.trim().toLowerCase() === op.nombre.trim().toLowerCase()) 
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                  : "bg-white border-slate-100 text-slate-400"
                }`}
              >
                <span>{op.nombre}</span>
                {operarios.some(n => n.trim().toLowerCase() === op.nombre.trim().toLowerCase()) ? <Check size={18} /> : <span className="text-[10px] opacity-60">{op.coste}€</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed"> No hay operarios en el sistema.<br/>Añádelos en Configuración. </p>
          </div>
        )}
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
            {Object.keys(itemsSate).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(itemsSate).map(([id, item]) => (
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
            ) : (
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-dashed border-slate-200 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed"> No hay partidas configuradas.<br/>Añádelas en Configuración. </p>
              </div>
            )}
            {Object.keys(itemsSate).length > 0 && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {itemsSate[selectedItemId]?.descripcion || "Selecciona una partida"}
                </p>
              </div>
            )}
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
                type="text" 
                inputMode="decimal"
                value={m2String} 
                onChange={(e) => {
                  // Allow only numbers, dots and commas
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                    setM2String(val);
                  }
                }}
                placeholder="0.0"
                className="w-full bg-slate-50 border-none rounded-3xl p-6 font-black text-center text-4xl text-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl pointer-events-none">m²</div>
            </div>
          </div>
        </div>

        <button 
          onClick={addProduccion}
          disabled={!m2String}
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
                    {itemsSate[p.itemId]?.nombre}
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
          disabled={producciones.length === 0 || operarios.length === 0 || !bloque}
          className="w-full bg-blue-600 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-200 disabled:opacity-50 disabled:grayscale disabled:shadow-none active:scale-95 transition-all text-xl uppercase tracking-widest"
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
  obra,
  calculateEconomics,
  onEdit, 
  onNew,
  onDelete,
  onBack 
}: { 
  avances: Avance[], 
  anticipos: Anticipo[],
  itemsSate: Record<string, any>,
  obra: Obra,
  calculateEconomics: (a: Avance) => { ingresos: number, costeManoObra: number, beneficio: number, beneficioPorOperario: number, cantOps: number },
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
            const hasAnticipo = anticiposMap[dateStr]?.length > 0;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-12 rounded-2xl flex flex-col items-center justify-center font-black text-sm transition-all active:scale-90 relative ${
                  isSelected 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                  : hasAvance 
                    ? "bg-blue-50 text-blue-600 border-2 border-blue-100" 
                    : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                {day}
                {hasAnticipo && (
                  <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full shadow-[0_0_8px_#39FF14] bg-[#39FF14] group-active:bg-white`} />
                )}
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

            {/* Botones de Compartir */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const text = shareService.formatAvanceForWhatsApp(selectedAvance, obra, itemsSate);
                  shareService.shareViaWhatsApp(text);
                }}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100"
              >
                <MessageCircle size={18} />
                WhatsApp
              </button>
              <button 
                onClick={() => shareService.generateAvancePDF(selectedAvance, obra, itemsSate)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-100"
              >
                <FileDown size={18} />
                PDF
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">Equipo Presente</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set((selectedAvance.operariosPresentes || []).map(o => o.trim()))).map(op => (
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
              <Stat label="Ingresos" value={`${calculateEconomics(selectedAvance).ingresos.toFixed(0)}€`} />
              <Stat label="Coste M.O." value={`${calculateEconomics(selectedAvance).costeManoObra.toFixed(0)}€`} />
              <div className="col-span-2 bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex justify-between items-center">
                <Stat label="Beneficio Neto" value={`${calculateEconomics(selectedAvance).beneficio.toFixed(0)}€`} highlight />
                <div className="text-right">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Por Operario</label>
                  <span className="text-xl font-black text-blue-700">{calculateEconomics(selectedAvance).beneficioPorOperario.toFixed(0)}€</span>
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
  notify,
  setModal
}: {
  theme: "light" | "dark",
  setTheme: (t: "light" | "dark") => void,
  items: Record<string, any>,
  setItems: (items: Record<string, any>) => void,
  operarios: any[],
  setOperarios: (ops: any[]) => void,
  onBack: () => void,
  notify: (m: string, t?: "success" | "error" | "info") => void,
  setModal: (m: any) => void
}) {
  const [activeTab, setActiveTab] = useState<"general" | "items" | "operarios">("general");
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  
  // Custom states for inline forms
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ id: '', nombre: '', precio: 0 });
  const [addingOp, setAddingOp] = useState(false);
  const [newOp, setNewOp] = useState({ nombre: '', coste: 120 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const currentObras = storage.getObras();
  const targetObra = currentObras.find(o => o.nombre.toLowerCase().includes("parque alcosa") || o.nombre.toLowerCase() === "alcosa");
  const sourceObras = currentObras.filter(o => o.nombre.toLowerCase().includes("bloque") && o.id !== targetObra?.id);

  const handleConsolidate = () => {
    if (!targetObra) return;
    const sourceIds = sourceObras.map(s => s.id);
    
    // Perform migration
    const currentAvances = storage.getAvances();
    storage.saveAvances(currentAvances.map(a => sourceIds.includes(a.obraId) ? { ...a, obraId: targetObra.id } : a));

    const currentAnticipos = storage.getAnticipos();
    storage.saveAnticipos(currentAnticipos.map(an => sourceIds.includes(an.obraId) ? { ...an, obraId: targetObra.id } : an));

    const currentGastos = storage.getGastos();
    storage.saveGastos(currentGastos.map(g => sourceIds.includes(g.obraId) ? { ...g, obraId: targetObra.id } : g));

    const currentCerts = storage.getCertificaciones();
    storage.saveCertificaciones(currentCerts.map(c => sourceIds.includes(c.obraId) ? { ...c, obraId: targetObra.id } : c));

    storage.saveObras(currentObras.filter(o => !sourceIds.includes(o.id)));
    storage.saveActiveObraId(targetObra.id);

    notify("Obras unificadas. Reiniciando panel...", "success");
    setTimeout(() => window.location.reload(), 1500);
  };

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

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Mantenimiento de Datos</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unifica obras duplicadas tras una importación</p>
                </div>

                {!showMergeConfirm ? (
                  <button
                    onClick={() => {
                      if (!targetObra) {
                        notify("No encuentro 'Parque Alcosa'. Asegúrate de que el nombre sea correcto.", "error");
                        return;
                      }
                      if (sourceObras.length === 0) {
                        notify("No hay obras duplicadas con la palabra 'Bloque' para unir.", "info");
                        return;
                      }
                      setShowMergeConfirm(true);
                    }}
                    className="w-full flex items-center justify-center gap-3 p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-blue-600 active:scale-95 transition-all text-left"
                  >
                    <Activity size={24} />
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest block">Consolidar Obras</span>
                      <span className="text-[9px] font-bold opacity-60 uppercase">Mover datos de Alcosa a Obra Principal</span>
                    </div>
                  </button>
                ) : (
                  <div className="p-6 bg-blue-600 rounded-[2rem] text-white space-y-4 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Confirmar Operación</p>
                    <p className="text-sm font-bold leading-tight">
                      Se moverán todos los datos de {sourceObras.length} obras secundarias a <span className="underline">{targetObra?.nombre}</span>.
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleConsolidate}
                        className="flex-1 py-3 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                      >
                        Sí, unificar ahora
                      </button>
                      <button 
                        onClick={() => setShowMergeConfirm(false)}
                        className="px-4 py-3 bg-blue-700 text-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-50">
                <button
                  onClick={() => {
                    setModal({
                      title: "Borrar TODO",
                      message: "¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.",
                      onConfirm: () => {
                        localStorage.clear();
                        window.location.reload();
                      }
                    });
                  }}
                  className="w-full flex items-center justify-center gap-3 p-6 bg-red-50 rounded-[2rem] border border-red-100 text-red-600 active:scale-95 transition-all"
                >
                  <Trash2 size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Borrar todo el contenido</span>
                </button>
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
              <div className="flex justify-between items-center px-2">
                <p className="text-sm font-black text-slate-800 uppercase">Partidas del Sistema</p>
                <button
                  onClick={() => setAddingItem(true)}
                  className="p-2 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform"
                >
                  <PlusCircle size={20} />
                </button>
              </div>

              {addingItem && (
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="ID (ej: sate_8)"
                      value={newItem.id}
                      onChange={(e) => setNewItem({...newItem, id: e.target.value})}
                      className="bg-white p-3 rounded-xl border-none font-bold text-xs"
                    />
                    <input 
                      placeholder="Nombre"
                      value={newItem.nombre}
                      onChange={(e) => setNewItem({...newItem, nombre: e.target.value})}
                      className="bg-white p-3 rounded-xl border-none font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="Precio €/m²"
                    value={newItem.precio}
                    onChange={(e) => setNewItem({...newItem, precio: Number(e.target.value)})}
                    className="w-full bg-white p-3 rounded-xl border-none font-bold text-xs"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (newItem.id && newItem.nombre) {
                          setItems({ ...items, [newItem.id]: { nombre: newItem.nombre, precio: newItem.precio } });
                          setAddingItem(false);
                          setNewItem({ id: '', nombre: '', precio: 0 });
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white font-black uppercase text-[10px] py-3 rounded-xl"
                    >
                      Guardar
                    </button>
                    <button onClick={() => setAddingItem(false)} className="px-4 bg-slate-200 text-slate-600 font-black uppercase text-[10px] rounded-xl">X</button>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {Object.entries(items).map(([id, item]) => (
                  <div key={id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase">{item.nombre}</p>
                      {editingId === id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            step="0.01"
                            autoFocus
                            value={editValue} 
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-16 bg-white p-1 rounded font-black text-xs"
                          />
                          <button onClick={() => {
                            setItems({ ...items, [id]: { ...item, precio: editValue } });
                            setEditingId(null);
                          }} className="text-emerald-500 font-black text-[9px]">OK</button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-blue-600">{item.precio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€/m²</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(id);
                          setEditValue(item.precio);
                        }}
                        className="p-2 bg-slate-100 text-slate-600 rounded-xl active:scale-90 transition-transform"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setModal({
                            title: "Eliminar Partida",
                            message: `¿Seguro que quieres borrar ${item.nombre}?`,
                            onConfirm: () => {
                              const newItems = { ...items };
                              delete newItems[id];
                              setItems(newItems);
                              notify("Partida eliminada.", "info");
                            }
                          });
                        }}
                        className="text-red-400 p-2 active:scale-90 transition-transform"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
              <div className="flex justify-between items-center px-2">
                <p className="text-sm font-black text-slate-800 uppercase">Lista de Operarios</p>
                <button
                  onClick={() => setAddingOp(true)}
                  className="p-2 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform"
                >
                  <PlusCircle size={20} />
                </button>
              </div>

              {addingOp && (
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="Nombre"
                      value={newOp.nombre}
                      onChange={(e) => setNewOp({...newOp, nombre: e.target.value})}
                      className="bg-white p-3 rounded-xl border-none font-bold text-xs"
                    />
                    <input 
                      type="number"
                      placeholder="Jornal €"
                      value={newOp.coste}
                      onChange={(e) => setNewOp({...newOp, coste: Number(e.target.value)})}
                      className="bg-white p-3 rounded-xl border-none font-bold text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (newOp.nombre) {
                          setOperarios([...operarios, { ...newOp }]);
                          setAddingOp(false);
                          setNewOp({ nombre: '', coste: 120 });
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white font-black uppercase text-[10px] py-3 rounded-xl"
                    >
                      Añadir
                    </button>
                    <button onClick={() => setAddingOp(false)} className="px-4 bg-slate-200 text-slate-600 font-black uppercase text-[10px] rounded-xl">X</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {operarios.map((op, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase">{op.nombre}</p>
                      {editingId === `op-${i}` ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            autoFocus
                            value={editValue} 
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-16 bg-white p-1 rounded font-black text-xs"
                          />
                          <button onClick={() => {
                            const newOps = [...operarios];
                            newOps[i] = { ...op, coste: editValue };
                            setOperarios(newOps);
                            setEditingId(null);
                          }} className="text-emerald-500 font-black text-[9px]">OK</button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Coste: {op.coste}€</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(`op-${i}`);
                          setEditValue(op.coste);
                        }}
                        className="p-2 bg-slate-100 text-slate-600 rounded-xl active:scale-90 transition-transform"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setModal({
                            title: "Eliminar Operario",
                            message: `¿Seguro que quieres borrar a ${op.nombre}?`,
                            onConfirm: () => {
                              const newOps = operarios.filter((_, idx) => idx !== i);
                              setOperarios(newOps);
                              notify("Operario eliminado.", "info");
                            }
                          });
                        }}
                        className="text-red-400 p-2 active:scale-90 transition-transform"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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
  gastos,
  operariosList,
  itemsSate,
  obra,
  notify,
  calculateEconomics,
  onSaveCertificacion, 
  onSaveAnticipo,
  onDeleteAnticipo,
  onOperarioClick,
  onBack 
}: { 
  avances: Avance[], 
  obraId: string, 
  certificaciones: Certificacion[], 
  anticipos: Anticipo[],
  gastos: Gasto[],
  operariosList: any[],
  itemsSate: Record<string, any>,
  obra: Obra,
  notify: (m: string, t?: "success" | "error" | "info") => void,
  calculateEconomics: (a: Avance) => { ingresos: number, costeManoObra: number, beneficio: number },
  onSaveCertificacion: (c: Certificacion) => void,
  onSaveAnticipo: (a: Anticipo | Anticipo[]) => void,
  onDeleteAnticipo: (id: string) => void,
  onOperarioClick: (name: string) => void,
  onBack: () => void 
}) {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Default to start of previous month to cover transitions
    d.setDate(1); 
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7)); // Keep for ID grouping
  const [estado, setEstado] = useState<"pendiente" | "cobrado">("pendiente");
  const [fechaCobro, setFechaCobro] = useState<string>("");
  const [incentivoExtra, setIncentivoExtra] = useState(0);
  
  // Manual Advance State
  const [manualOp, setManualOp] = useState(operariosList[0]?.nombre || "");
  const [manualCant, setManualCant] = useState(400);
  const [manualFecha, setManualFecha] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Sync manualOp when operariosList loads
  useEffect(() => {
    if (!manualOp && operariosList.length > 0) {
      setManualOp(operariosList[0].nombre);
    }
  }, [operariosList, manualOp]);

  // Settlement Logic: Filter out data already covered by PAID certifications
  const cobradas = useMemo(() => 
    certificaciones.filter(c => c.obraId === obraId && c.estado === 'cobrado'),
  [certificaciones, obraId]);

  const isDataProcessed = useCallback((date: string) => {
    return cobradas.some(c => {
      if (!c.fechaInicio || !c.fechaFin) return false;
      return date >= c.fechaInicio && date <= c.fechaFin;
    });
  }, [cobradas]);

  const filtradosRange = useMemo(() => {
    return (avances || []).filter(a => 
      a.fecha >= fechaInicio && 
      a.fecha <= fechaFin && 
      !isDataProcessed(a.fecha)
    );
  }, [avances, fechaInicio, fechaFin, isDataProcessed]);

  const ejecutado = useMemo(() => {
    return filtradosRange.reduce((acc, curr) => acc + calculateEconomics(curr).ingresos, 0);
  }, [filtradosRange, calculateEconomics]);

  const totalAnticiposRango = useMemo(() => {
    return (anticipos || [])
      .filter(an => 
        an.fecha >= fechaInicio && 
        an.fecha <= fechaFin && 
        !isDataProcessed(an.fecha)
      )
      .reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  }, [anticipos, fechaInicio, fechaFin, isDataProcessed]);

  const certificado = ejecutado - totalAnticiposRango;

  const totalesMensuales = useMemo(() => {
    const items: Record<string, number> = {};
    let ingresosTotal = 0;
    let costeMOTotal = 0;

    filtradosRange.forEach(a => {
      const econ = calculateEconomics(a);
      ingresosTotal += econ.ingresos;
      costeMOTotal += econ.costeManoObra;
      (a.produccion || []).forEach(p => {
        items[p.itemId] = (items[p.itemId] || 0) + (p.m2 || 0);
      });
    });

    return { items, ingresosTotal, costeMOTotal, beneficioTotal: ingresosTotal - costeMOTotal };
  }, [filtradosRange, calculateEconomics]);

  const operariosStats = useMemo(() => {
    const stats: Record<string, { jornales: number, beneficios: number, anticipos: number, reembolsos: number, diasTrabajados: number }> = {};
    operariosList.forEach(o => stats[o.nombre] = { jornales: 0, beneficios: 0, anticipos: 0, reembolsos: 0, diasTrabajados: 0 });

    // 1. Calculate base salaries and count workdays in range
    filtradosRange.forEach(a => {
      (a.operariosPresentes || []).forEach(opName => {
        const targetOp = Object.keys(stats).find(name => 
          name.trim().toLowerCase() === opName.trim().toLowerCase()
        );
        if (targetOp) {
          const baseCost = operariosList.find(o => o.nombre === targetOp)?.coste || 120;
          stats[targetOp].jornales += baseCost;
          stats[targetOp].diasTrabajados += 1;
        }
      });
    });

    // 2. Distribute PROFIT (Revenue - Total Team Wages)
    const activeOperators = Object.keys(stats).filter(name => stats[name].diasTrabajados > 0);
    const n = activeOperators.length;
    
    const totalWages = Object.values(stats).reduce((sum, s) => sum + s.jornales, 0);
    const totalSharedProfit = totalesMensuales.ingresosTotal - totalWages;
    
    const profitPerOp = n > 0 ? totalSharedProfit / n : 0;
    const bonusPerOp = n > 0 ? (incentivoExtra || 0) / n : 0;

    activeOperators.forEach(name => {
      stats[name].beneficios = profitPerOp + bonusPerOp;
    });

    // 3. Anticipos and Reembolsos in range
    (anticipos || []).filter(an => an.fecha >= fechaInicio && an.fecha <= fechaFin && !isDataProcessed(an.fecha)).forEach(an => {
      const targetOp = Object.keys(stats).find(name => 
        name.trim().toLowerCase() === an.operario.trim().toLowerCase()
      );
      if (targetOp) {
        stats[targetOp].anticipos += (an.cantidad || 0);
      }
    });

    (gastos || []).filter(g => g.fecha >= fechaInicio && g.fecha <= fechaFin && g.pagadoPor).forEach(g => {
      const targetOp = Object.keys(stats).find(name => 
        name.trim().toLowerCase() === g.pagadoPor?.trim().toLowerCase()
      );
      if (targetOp) {
        stats[targetOp].reembolsos += (g.monto || 0);
      }
    });

    return stats;
  }, [filtradosRange, anticipos, gastos, fechaInicio, fechaFin, operariosList, calculateEconomics, incentivoExtra, totalesMensuales.ingresosTotal]);

  const existingCert = certificaciones.find(c => c.obraId === obraId && c.mes === mes);

  useEffect(() => {
    if (existingCert) {
      setEstado(existingCert.estado);
      setFechaCobro(existingCert.fechaCobro || "");
      setIncentivoExtra(existingCert.incentivoExtra || 0);
    } else {
      setEstado("pendiente");
      setFechaCobro("");
      setIncentivoExtra(0);
    }
  }, [existingCert, mes]);

  const handleSave = () => {
    const cert: Certificacion = {
      id: existingCert?.id || crypto.randomUUID(),
      obraId,
      mes: fechaInicio.slice(0, 7), 
      fechaInicio,
      fechaFin,
      ejecutado,
      anticipos: totalAnticiposRango,
      incentivoExtra,
      certificado,
      estado,
      fechaCobro: estado === "cobrado" ? fechaCobro : undefined
    };
    onSaveCertificacion(cert);
  };

  const handleGenerarAnticiposSemanales = () => {
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      notify("Selecciona un rango de fechas válido.", "error");
      return;
    }
    
    const getLocalISODate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const normalize = (s: string) => 
      s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const viernes: string[] = [];
    let d = new Date(start);
    while (d <= end) {
      if (d.getDay() === 5) {
        viernes.push(getLocalISODate(d));
      }
      d.setDate(d.getDate() + 1);
    }

    const nuevosAnticipos: Anticipo[] = [];
    viernes.forEach(v => {
      // Usar Date.parse o similar para evitar desfases al crear fechas desde string
      const [y, mm, dd] = v.split('-').map(Number);
      const fridayDate = new Date(y, mm - 1, dd);
      
      const mondayDate = new Date(fridayDate);
      mondayDate.setDate(fridayDate.getDate() - 4);
      
      const monStr = getLocalISODate(mondayDate);
      const friStr = v;

      // Usar Set con nombres normalizados para evitar duplicados por espacios o tildes
      const operariosSemanaMap = new Map<string, string>(); // normalized -> original
      
      (avances || []).filter(a => a.fecha >= monStr && a.fecha <= friStr).forEach(a => {
        (a.operariosPresentes || []).forEach(op => {
          const norm = normalize(op);
          if (norm && !operariosSemanaMap.has(norm)) {
            operariosSemanaMap.set(norm, op.trim());
          }
        });
      });

      operariosSemanaMap.forEach((originalName, normName) => {
        const exists = anticipos.find(an => 
          an.fecha === v && 
          normalize(an.operario) === normName && 
          an.obraId === obraId
        );
        const alreadyInBatch = nuevosAnticipos.find(an => 
          an.fecha === v && 
          normalize(an.operario) === normName
        );
        
        if (!exists && !alreadyInBatch) {
          nuevosAnticipos.push({
            id: crypto.randomUUID(),
            fecha: v,
            obraId,
            operario: originalName,
            cantidad: 400
          });
        }
      });
    });

    if (nuevosAnticipos.length > 0) {
      onSaveAnticipo(nuevosAnticipos);
      notify(`Se han generado ${nuevosAnticipos.length} anticipos automáticos.`, "success");
    } else {
      notify("No hay anticipos nuevos para generar.", "info");
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

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Inicio Periodo</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-sm text-slate-800 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Fin Periodo</label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 font-black text-sm text-slate-800 dark:text-white outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Ejecutado</label>
            <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{ejecutado.toLocaleString()}€</span>
          </div>

          {/* Totales Mensuales Detallados */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Producción del Mes</label>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(totalesMensuales.items).map(([id, m2]) => (
                <div key={id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 truncate">{itemsSate[id]?.nombre || "Partida"}</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">{Math.round(m2 as number)}</span>
                  <span className="text-[10px] font-black text-slate-300 ml-1 uppercase">m²</span>
                </div>
              ))}
              {Object.keys(totalesMensuales.items).length === 0 && (
                <div className="col-span-2 text-center py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Sin producción este mes</div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-300 uppercase block">Ingresos Mes</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{Math.round(totalesMensuales.ingresosTotal).toLocaleString()}€</span>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black text-slate-300 uppercase block">Beneficio Real (Sobrante)</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{Math.round(totalesMensuales.beneficioTotal).toLocaleString()}€</span>
              </div>
            </div>
            <div className="pt-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase italic leading-tight">
                * Beneficio = Ingresos - Coste de todos los jornales del equipo ({totalesMensuales.costeMOTotal}€).
              </span>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-[2rem] border border-orange-100 dark:border-orange-900/30 space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">Anticipos (Pendientes)</label>
              <button 
                onClick={handleGenerarAnticiposSemanales}
                className="text-[10px] font-black bg-orange-600 text-white px-4 py-2 rounded-xl uppercase tracking-widest active:scale-95 transition-transform"
              >
                Auto-Generar
              </button>
            </div>
            <span className="text-4xl font-black text-orange-700 dark:text-orange-400 tracking-tight block">{totalAnticiposRango.toLocaleString()}€</span>
            
            <div className="space-y-4">
              {/* Manual Entry */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 space-y-4">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Añadir Manual</p>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={manualOp} 
                    onChange={(e) => setManualOp(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-black text-slate-800 dark:text-white outline-none"
                  >
                    {operariosList.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                  </select>
                  <input 
                    type="number" 
                    value={manualCant} 
                    onChange={(e) => setManualCant(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-[10px] font-black text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={manualFecha} 
                    onChange={(e) => setManualFecha(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-[10px] font-black text-slate-800 dark:text-white outline-none"
                  />
                  <button 
                    onClick={handleAddManualAnticipo}
                    className="bg-orange-600 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {(anticipos || []).filter(an => an.fecha >= fechaInicio && an.fecha <= fechaFin && !isDataProcessed(an.fecha)).map(an => (
                  <div key={an.id} className="flex justify-between items-center bg-white dark:bg-black p-3 rounded-xl border border-orange-100 dark:border-slate-800">
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

          <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-100 flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-black opacity-70 uppercase tracking-widest block mb-1">A Certificar Neto</label>
              <span className="text-5xl font-black tracking-tight">{certificado.toLocaleString()}€</span>
            </div>
            
            <div className="pt-4 border-t border-blue-500 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest block">Bonus/Incentivo Extra</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={incentivoExtra}
                  onChange={(e) => setIncentivoExtra(Number(e.target.value))}
                  className="w-full bg-blue-700 border-none rounded-xl p-3 text-white font-black text-lg outline-none"
                  placeholder="0"
                />
                <span className="font-black text-xl">€</span>
              </div>
              <p className="text-[9px] font-bold opacity-60 uppercase italic">* Se reparte equitativamente entre los operarios activos</p>
            </div>
          </div>

          {/* Botones de Compartir Certificación */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                const cert: Certificacion = {
                  id: existingCert?.id || crypto.randomUUID(),
                  obraId,
                  mes: fechaInicio.slice(0, 7),
                  fechaInicio,
                  fechaFin,
                  ejecutado,
                  anticipos: totalAnticiposRango,
                  incentivoExtra,
                  certificado,
                  estado,
                  fechaCobro: estado === "cobrado" ? fechaCobro : undefined
                };
                const text = shareService.formatCertificacionForWhatsApp(cert, obra, totalesMensuales, itemsSate);
                shareService.shareViaWhatsApp(text);
              }}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-100"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button 
              onClick={() => {
                const cert: Certificacion = {
                  id: existingCert?.id || crypto.randomUUID(),
                  obraId,
                  mes: fechaInicio.slice(0, 7),
                  fechaInicio,
                  fechaFin,
                  ejecutado,
                  anticipos: totalAnticiposRango,
                  incentivoExtra,
                  certificado,
                  estado,
                  fechaCobro: estado === "cobrado" ? fechaCobro : undefined
                };
                const anticiposPeriodo = (anticipos || []).filter(an => an.fecha >= fechaInicio && an.fecha <= fechaFin && !isDataProcessed(an.fecha));
                shareService.generateCertificacionPDF(cert, obra, anticiposPeriodo, totalesMensuales, itemsSate);
              }}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-100"
            >
              <FileDown size={18} />
              PDF
            </button>
          </div>
        </div>

        {/* Resumen por Operario */}
        <div className="space-y-4 pt-8 border-t border-slate-50">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Liquidación por Operario</h4>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pulsa para ver detalle</span>
          </div>
          <div className="space-y-3">
            {(Object.entries(operariosStats) as [string, { jornales: number, beneficios: number, anticipos: number, reembolsos: number, diasTrabajados: number }][]).map(([name, stat]) => (
              <button 
                key={name} 
                onClick={() => onOperarioClick(name)}
                className="w-full bg-slate-50 p-5 rounded-[2rem] border border-slate-100 active:scale-[0.98] transition-all text-left flex flex-col group"
              >
                <div className="flex justify-between items-center mb-4 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                      <ChevronRight size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 uppercase tracking-tight">{name}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{stat.diasTrabajados} Jornales</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[9px] font-black text-slate-400 uppercase block text-xs">Saldo Neto</label>
                    <span className="text-xl font-black text-blue-600">{(stat.jornales + stat.beneficios - stat.anticipos + stat.reembolsos).toFixed(2).replace('.', ',')}€</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center w-full">
                  <div className="bg-white p-2 rounded-xl">Jornales<br/><span className="text-slate-800">{stat.jornales.toFixed(2).replace('.', ',')}€</span></div>
                  <div className="bg-white p-2 rounded-xl">Reparto<br/><span className="text-blue-600">{stat.beneficios.toFixed(2).replace('.', ',')}€</span></div>
                  <div className="bg-orange-50 text-orange-700 p-2 rounded-xl">Anti.<br/>-{stat.anticipos.toFixed(2).replace('.', ',')}€</div>
                  <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl">Devol.<br/>+{stat.reembolsos.toFixed(2).replace('.', ',')}€</div>
                </div>
              </button>
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

        {/* Histórico Section */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Certificaciones Liquidadas (Histórico)</label>
          <div className="space-y-4">
            {certificaciones
              .filter(c => c.obraId === obraId && c.estado === 'cobrado')
              .filter((c, index, self) => index === self.findIndex(t => t.id === c.id)) // Deduplicate by ID
              .sort((a,b) => (b.fechaFin || "").localeCompare(a.fechaFin || ""))
              .map(c => (
              <div key={c.id} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-1">CERRADA Y LIQUIDADA</p>
                <p className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">
                  {c.fechaInicio && c.fechaFin 
                    ? `${new Date(c.fechaInicio).toLocaleDateString()} al ${new Date(c.fechaFin).toLocaleDateString()}` 
                    : `Periodo: ${c.mes}`}
                </p>
                {c.fechaCobro && (
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic">Cobrada el {new Date(c.fechaCobro).toLocaleDateString()}</p>
                )}
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Total Neto</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{Math.round(c.certificado).toLocaleString()}€</p>
                </div>
              </div>
            ))}
            {certificaciones.filter(c => c.obraId === obraId && c.estado === 'cobrado').length === 0 && (
              <div className="text-center py-8 opacity-40">
                <Database className="mx-auto mb-2 text-slate-300" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No hay certificaciones liquidadas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
