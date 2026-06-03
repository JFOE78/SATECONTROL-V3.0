import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Obra, Avance, Certificacion, Anticipo, Gasto, Vacacion } from "../types";
import { storage } from "../lib/storage";
import { OPERARIOS, ITEMS_SATE } from "../constants";

interface AppContextType {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  obras: Obra[];
  setObras: (obras: Obra[]) => void;
  selectedObraId: string;
  setSelectedObraId: (id: string) => void;
  avances: Avance[];
  setAvances: (avances: Avance[] | ((prev: Avance[]) => Avance[])) => void;
  certificaciones: Certificacion[];
  setCertificaciones: (certificaciones: Certificacion[]) => void;
  anticipos: Anticipo[];
  setAnticipos: (anticipos: Anticipo[]) => void;
  gastos: Gasto[];
  setGastos: (gastos: Gasto[]) => void;
  itemsSate: Record<string, any>;
  setItemsSate: (items: Record<string, any>) => void;
  operariosList: any[];
  setOperariosList: (operarios: any[]) => void;
  vacaciones: Vacacion[];
  setVacaciones: (vacaciones: Vacacion[] | ((prev: Vacacion[]) => Vacacion[])) => void;
  notify: (message: string, type?: "success" | "error" | "info") => void;
  notification: { message: string; type: "success" | "error" | "info" } | null;
  calculateAvanceEconomics: (a: Avance) => { 
    ingresos: number; 
    costeManoObra: number; 
    beneficio: number; 
    beneficioPorOperario: number; 
    cantOps: number; 
  };
  pendingProfit: number;
  manualAdjustments: Record<string, number>;
  setManualAdjustments: (adj: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, _setTheme] = useState<"light" | "dark">("light");
  const [obras, _setObras] = useState<Obra[]>([]);
  const [selectedObraId, _setSelectedObraId] = useState<string>("");
  const [avances, _setAvances] = useState<Avance[]>([]);
  const [certificaciones, _setCertificaciones] = useState<Certificacion[]>([]);
  const [anticipos, _setAnticipos] = useState<Anticipo[]>([]);
  const [gastos, _setGastos] = useState<Gasto[]>([]);
  const [itemsSate, _setItemsSate] = useState<Record<string, any>>(ITEMS_SATE);
  const [operariosList, _setOperariosList] = useState<any[]>(OPERARIOS);
  const [vacaciones, _setVacaciones] = useState<Vacacion[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [manualAdjustments, _setManualAdjustments] = useState<Record<string, number>>({});

  const notify = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    const loadedObras = storage.getObras();
    const loadedAvances = storage.getAvances();
    const loadedCertificaciones = storage.getCertificaciones();
    const loadedAnticipos = storage.getAnticipos();
    const loadedGastos = storage.getGastos();
    const loadedItems = storage.getItems();
    const loadedOperarios = storage.getOperarios();
    const loadedAdjustments = storage.getManualAdjustments();
    const loadedTheme = storage.getTheme();
    const activeObraId = storage.getActiveObraId();

    const cleanOperarios = (loadedOperarios && loadedOperarios.length > 0 ? loadedOperarios : OPERARIOS).map((op: any) => ({
      ...op,
      nombre: (op.nombre || "").toString().trim()
    }));
    
    const configOpsUnique = cleanOperarios.filter((op: any, index: number, self: any[]) =>
      index === self.findIndex((t: any) => t.nombre.toLowerCase() === op.nombre.toLowerCase())
    );

    const cleanAvances = loadedAvances.map((a: Avance) => ({
      ...a,
      operariosPresentes: Array.from(new Set((a.operariosPresentes || []).map(o => (o || "").toString().trim()))).filter(Boolean)
    }));

    const cleanAnticipos = loadedAnticipos.map((an: Anticipo) => ({
      ...an,
      operario: (an.operario || "").toString().trim()
    }));

    const syncedItems = { ...(loadedItems && Object.keys(loadedItems).length > 0 ? loadedItems : ITEMS_SATE) };
    Object.keys(ITEMS_SATE).forEach(key => {
      if (!syncedItems[key]) {
        syncedItems[key] = { ...(ITEMS_SATE as any)[key] };
      } else if (syncedItems[key].precio === 0 && (ITEMS_SATE as any)[key].precio > 0) {
        syncedItems[key].precio = (ITEMS_SATE as any)[key].precio;
      }
    });
    // Force exact pricing and name requested by user
    if (syncedItems.fase1) {
      syncedItems.fase1.precio = 20.20;
      syncedItems.fase1.nombre = "SATE Combinado (Corcho + Fino)";
    }

    const INITIAL_VACACIONES: Vacacion[] = [
      { id: "vac-1", operario: "Mosquito", fecha: "2026-05-19", tipo: "Disfrutados y Pagados" },
      { id: "vac-2", operario: "Mosquito", fecha: "2026-05-20", tipo: "Disfrutados y Pagados" },
      { id: "vac-3", operario: "Mosquito", fecha: "2026-05-21", tipo: "Disfrutados y Pagados" },
      { id: "vac-4", operario: "Mosquito", fecha: "2026-05-22", tipo: "Disfrutados y Pagados" },
      { id: "vac-5", operario: "Mosquito", fecha: "2026-05-25", tipo: "Disfrutados y Pagados" },
      { id: "vac-6", operario: "David", fecha: "2026-04-15", tipo: "Disfrutados y Pagados" },
      { id: "vac-7", operario: "Jesules", fecha: "2026-04-13", tipo: "Disfrutados y Pagados" },
      { id: "vac-8", operario: "Jesules", fecha: "2026-05-25", tipo: "Disfrutados y Pagados" },
    ];
    const storedVac = localStorage.getItem("sate_vacaciones");
    const loadedVac: Vacacion[] = storedVac ? JSON.parse(storedVac) : INITIAL_VACACIONES;
    if (!storedVac) {
      localStorage.setItem("sate_vacaciones", JSON.stringify(INITIAL_VACACIONES));
    }
    _setVacaciones(loadedVac);

    _setItemsSate(syncedItems);
    _setOperariosList(configOpsUnique);
    _setAvances(cleanAvances);
    _setAnticipos(cleanAnticipos);
    _setGastos(loadedGastos);

    const targetObraId = activeObraId || (loadedObras[0]?.id) || "e41a4d8c-623c-4f89-bfe9-f9565c2d318b";
    
    // Forzar datos si faltan o están incompletos
    const cert1: Certificacion = {
      id: "cert-historical-1",
      obraId: targetObraId,
      mes: "2026-03", // Certificación 08/04
      fechaInicio: "2026-03-01",
      fechaFin: "2026-04-08",
      ejecutado: 11724.54,
      anticipos: 8000,
      certificado: 3724.54,
      estado: "cobrado",
      partidas: [
        { itemId: "bl13_comp", nombre: "Mortero-Malla-Fino (7 líneas)", precio: 1, m2: 8800.30, bloque: "13" },
        { itemId: "bl5_comp", nombre: "Corcho y Tacos (5 líneas)", precio: 1, m2: 2924.24, bloque: "5" },
      ]
    };

    const cert2: Certificacion = {
      id: "cert-historical-2",
      obraId: targetObraId,
      mes: "2026-04", // Certificación 05/05
      fechaInicio: "2026-04-09",
      fechaFin: "2026-05-05",
      ejecutado: 16147.84,
      anticipos: 8000,
      certificado: 8147.84,
      estado: "cobrado",
      partidas: [
        { itemId: "bl13_comp2", nombre: "Antifisuras y Doble Malla", precio: 1, m2: 1277.76, bloque: "13" },
        { itemId: "bl5_comp2", nombre: "Malla, Fino, Corcho, Cajeados", precio: 1, m2: 9419.68, bloque: "5" },
        { itemId: "bl6_comp2", nombre: "Corcho + Malla", precio: 1, m2: 5450.40, bloque: "6" }
      ]
    };

    const cert3: Certificacion = {
      id: "cert-historical-3",
      obraId: targetObraId,
      mes: "2026-05", // Tercera Certificación de Obra (Parque Alcosa)
      fechaInicio: "2026-05-06",
      fechaFin: "2026-06-02",
      ejecutado: 17964.60,
      anticipos: 8000.00,
      certificado: 9964.60,
      estado: "pendiente",
      partidas: [
        { itemId: "fase1", nombre: "Corcho + Tacos", precio: 8, m2: 950.00, bloque: "1" },
        { itemId: "fase2", nombre: "Esquineros + Malla + Fino", precio: 8, m2: 1215.575, bloque: "1" },
        { itemId: "anti", nombre: "Anti-fisuras (ml)", precio: 8, m2: 50.00, bloque: "1" },
        { itemId: "cajeado", nombre: "Cajeados (m)", precio: 16, m2: 15.00, bloque: "1" }
      ]
    };

    const isMissingItems1 = !loadedCertificaciones.find(c => c.id === "cert-historical-1")?.partidas?.length;
    const isMissingItems2 = !loadedCertificaciones.find(c => c.id === "cert-historical-2")?.partidas?.length;
    const isMissingItems3 = !loadedCertificaciones.find(c => c.id === "cert-historical-3")?.partidas?.length;
    const hasHistorical = loadedCertificaciones.some(c => c.id === "cert-historical-3");
    const wasHistoricalExplicitlyDeleted = localStorage.getItem("sate_historical_deleted") === "true";
    
    if ((!hasHistorical || isMissingItems1 || isMissingItems2 || isMissingItems3) && !wasHistoricalExplicitlyDeleted) {
      // Reemplazar o añadir los certificados históricos con los datos completos
      const filteredCerts = loadedCertificaciones.filter(c => c.id !== "cert-historical-1" && c.id !== "cert-historical-2" && c.id !== "cert-historical-3" && c.id !== "historical-bloque-6");
      const nextCerts = [...filteredCerts, cert1, cert2, cert3];
      storage.saveCertificaciones(nextCerts);
      _setCertificaciones(nextCerts);
    } else {
      _setCertificaciones(loadedCertificaciones);
    }

    _setManualAdjustments(loadedAdjustments);
    _setTheme(loadedTheme);

    if (loadedObras.length === 0) {
      const defaultObras: Obra[] = [
        { id: "e41a4d8c-623c-4f89-bfe9-f9565c2d318b", nombre: "Parque Alcosa", numBloques: 20 },
      ];
      storage.saveObras(defaultObras);
      _setObras(defaultObras);
      _setSelectedObraId(defaultObras[0].id);
      storage.saveActiveObraId(defaultObras[0].id);
    } else {
      _setObras(loadedObras);
      if (activeObraId && loadedObras.some(o => o.id === activeObraId)) {
        _setSelectedObraId(activeObraId);
      } else {
        _setSelectedObraId(loadedObras[0].id);
        storage.saveActiveObraId(loadedObras[0].id);
      }
    }
  }, []);

  const setTheme = (t: "light" | "dark") => {
    _setTheme(t);
    storage.saveTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.body.classList.toggle('dark', t === 'dark');
  };

  const setSelectedObraId = (id: string) => {
    _setSelectedObraId(id);
    storage.saveActiveObraId(id);
  };

  const setObras = (o: Obra[] | ((prev: Obra[]) => Obra[])) => {
    if (typeof o === "function") {
      _setObras(prev => {
        const next = o(prev);
        storage.saveObras(next);
        return next;
      });
    } else {
      _setObras(o);
      storage.saveObras(o);
    }
  };

  const setAvances = (a: Avance[] | ((prev: Avance[]) => Avance[])) => {
    if (typeof a === "function") {
      _setAvances(prev => {
        const next = a(prev);
        storage.saveAvances(next);
        return next;
      });
    } else {
      _setAvances(a);
      storage.saveAvances(a);
    }
  };

  const setCertificaciones = (c: Certificacion[] | ((prev: Certificacion[]) => Certificacion[])) => {
    if (typeof c === "function") {
      _setCertificaciones(prev => {
        const next = c(prev);
        storage.saveCertificaciones(next);
        // Si borramos los históricos manuales, marcamos para no reinyectar
        if (prev.length > next.length && !next.some(x => x.id.startsWith("cert-historical"))) {
          localStorage.setItem("sate_historical_deleted", "true");
        }
        return next;
      });
    } else {
      _setCertificaciones(c);
      storage.saveCertificaciones(c);
      if (!c.some(x => x.id.startsWith("cert-historical"))) {
        localStorage.setItem("sate_historical_deleted", "true");
      }
    }
  };

  const setAnticipos = (an: Anticipo[] | ((prev: Anticipo[]) => Anticipo[])) => {
    if (typeof an === "function") {
      _setAnticipos(prev => {
        const next = an(prev);
        storage.saveAnticipos(next);
        return next;
      });
    } else {
      _setAnticipos(an);
      storage.saveAnticipos(an);
    }
  };

  const setGastos = (g: Gasto[] | ((prev: Gasto[]) => Gasto[])) => {
    if (typeof g === "function") {
      _setGastos(prev => {
        const next = g(prev);
        storage.saveGastos(next);
        return next;
      });
    } else {
      _setGastos(g);
      storage.saveGastos(g);
    }
  };

  const setItemsSate = (i: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
    if (typeof i === "function") {
      _setItemsSate(prev => {
        const next = i(prev);
        storage.saveItems(next);
        return next;
      });
    } else {
      _setItemsSate(i);
      storage.saveItems(i);
    }
  };

  const setOperariosList = (op: any[] | ((prev: any[]) => any[])) => {
    if (typeof op === "function") {
      _setOperariosList(prev => {
        const next = op(prev);
        storage.saveOperarios(next);
        return next;
      });
    } else {
      _setOperariosList(op);
      storage.saveOperarios(op);
    }
  };

  const setVacaciones = (v: Vacacion[] | ((prev: Vacacion[]) => Vacacion[])) => {
    if (typeof v === "function") {
      _setVacaciones(prev => {
        const next = v(prev);
        localStorage.setItem("sate_vacaciones", JSON.stringify(next));
        return next;
      });
    } else {
      _setVacaciones(v);
      localStorage.setItem("sate_vacaciones", JSON.stringify(v));
    }
  };

  const setManualAdjustments = (adj: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    if (typeof adj === "function") {
      _setManualAdjustments(prev => {
        const next = adj(prev);
        storage.saveManualAdjustments(next);
        return next;
      });
    } else {
      _setManualAdjustments(adj);
      storage.saveManualAdjustments(adj);
    }
  };

  const calculateAvanceEconomics = useCallback((a: Avance) => {
    const normalize = (s: any) => 
      (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const uniqueOpsRaw = Array.from(new Set(a.operariosPresentes || []));
    const uniqueOpsNormalized = Array.from(new Set(uniqueOpsRaw.map(n => normalize(n as string))));
    
    const uniqueVacOpsRaw = Array.from(new Set(a.operariosVacaciones || []));
    const uniqueVacOpsNormalized = Array.from(new Set(uniqueVacOpsRaw.map(n => normalize(n as string))));

    // 1. Ingresos generados por la producción del parte
    const ingresos = (a.produccion || []).reduce((acc, p) => {
      const item = itemsSate[p.itemId];
      return acc + (p.m2 * (item?.precio || 0));
    }, 0);

    // 2. Coste real de los operarios que SI asistieron + los de vacaciones pagadas
    // Solo sumamos el coste de los que están en a.operariosPresentes o a.operariosVacaciones
    const costeManoObra = (a.produccion.length === 0 && a.motivoSinProduccion) 
      ? 0 
      : operariosList.reduce((acc, op) => {
          const opName = normalize(op.nombre);
          if (uniqueOpsNormalized.includes(opName) || uniqueVacOpsNormalized.includes(opName)) {
            return acc + (op.coste || 0);
          }
          return acc;
        }, 0);

    const beneficio = ingresos - costeManoObra;
    
    // El reparto de beneficios diarios derivados de la producción se divide igualmente entre todos los operarios registrados (asistan o no)
    const beneficioPorOperario = operariosList.length > 0 ? beneficio / operariosList.length : 0;
    
    return { 
      ingresos, 
      costeManoObra, 
      beneficio, 
      beneficioPorOperario, 
      cantOps: uniqueOpsNormalized.length 
    };
  }, [itemsSate, operariosList]);

  const pendingProfit = useMemo(() => {
    const filtered = (avances || []).filter(a => {
      const isProcessed = certificaciones.some(c => 
        c.obraId === selectedObraId && 
        c.estado === 'cobrado' && 
        c.fechaInicio && c.fechaFin && 
        a.fecha >= c.fechaInicio && a.fecha <= c.fechaFin
      );
      return a.obraId === selectedObraId && !isProcessed;
    });
    return filtered.reduce((acc, curr) => acc + calculateAvanceEconomics(curr).beneficio, 0);
  }, [avances, selectedObraId, certificaciones, calculateAvanceEconomics]);

  return (
    <AppContext.Provider value={{
      theme, setTheme,
      obras, setObras,
      selectedObraId, setSelectedObraId,
      avances, setAvances,
      certificaciones, setCertificaciones,
      anticipos, setAnticipos,
      gastos, setGastos,
      itemsSate, setItemsSate,
      operariosList, setOperariosList,
      vacaciones, setVacaciones,
      notify, notification,
      calculateAvanceEconomics,
      pendingProfit,
      manualAdjustments, setManualAdjustments
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
