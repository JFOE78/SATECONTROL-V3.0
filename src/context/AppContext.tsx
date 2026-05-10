import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Obra, Avance, Certificacion, Anticipo, Gasto } from "../types";
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
  setAvances: (avances: Avance[]) => void;
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
      items: [
        { itemId: "bl13_l1", nombre: "Línea 1 (BL-13)", precio: 16, m2: 88.89, bloque: "13" },
        { itemId: "bl13_l2", nombre: "Línea 2 (BL-13)", precio: 16, m2: 73.406, bloque: "13" },
        { itemId: "bl13_l3", nombre: "Línea 3 (BL-13)", precio: 16, m2: 28.557, bloque: "13" },
        { itemId: "bl13_l4", nombre: "Línea 4 (BL-13)", precio: 16, m2: 73.984, bloque: "13" },
        { itemId: "bl13_l5", nombre: "Línea 5 (BL-13)", precio: 16, m2: 89.936, bloque: "13" },
        { itemId: "bl13_l6", nombre: "Línea 6 (BL-13)", precio: 16, m2: 89.59, bloque: "13" },
        { itemId: "bl13_l7", nombre: "Línea 7 (BL-13)", precio: 16, m2: 72.25, bloque: "13" },
        { itemId: "bl13_caj", nombre: "Cajeado Metro (BL-13)", precio: 16, m2: 25, bloque: "13" },
        { itemId: "bl13_malla", nombre: "Doble Malla (BL-13)", precio: 2.66, m2: 50.57, bloque: "13" },
        { itemId: "bl5_l1", nombre: "Línea 1 (BL-5)", precio: 8, m2: 89.24, bloque: "5" },
        { itemId: "bl5_l2", nombre: "Línea 2 (BL-5)", precio: 8, m2: 72.82, bloque: "5" },
        { itemId: "bl5_l3", nombre: "Línea 3 (BL-5)", precio: 8, m2: 73.52, bloque: "5" },
        { itemId: "bl5_l4", nombre: "Línea 4 (BL-5)", precio: 8, m2: 89.24, bloque: "5" },
        { itemId: "bl5_l5", nombre: "Línea 5 (BL-5)", precio: 8, m2: 24.45, bloque: "5" },
        { itemId: "bl5_caj", nombre: "Cajeado Metro (BL-5)", precio: 8, m2: 16.26, bloque: "5" },
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
      items: [
        { itemId: "bl13_anti", nombre: "Antifisuras cornisas (BL-13)", precio: 8, m2: 109, bloque: "13" },
        { itemId: "bl13_malla", nombre: "Doble Malla (BL-13)", precio: 8, m2: 50.72, bloque: "13" },
        { itemId: "bl5_mf", nombre: "Malla + Fino (BL-5)", precio: 8, m2: 324.84, bloque: "5" },
        { itemId: "bl5_ca", nombre: "Cornisas antifisura (BL-5)", precio: 8, m2: 113.96, bloque: "5" },
        { itemId: "bl5_cm", nombre: "Corcho + Malla (BL-5)", precio: 16, m2: 285.48, bloque: "5" },
        { itemId: "bl5_caj_m", nombre: "Cajeado Malla (BL-5)", precio: 8, m2: 16.26, bloque: "5" },
        { itemId: "bl5_caj_cm", nombre: "Cajeado Corcho + Malla (BL-5)", precio: 16, m2: 16.26, bloque: "5" },
        { itemId: "bl5_dm", nombre: "Doble Malla (BL-5)", precio: 8, m2: 118.92, bloque: "5" },
        { itemId: "bl6_cm", nombre: "Corcho + Malla (BL-6)", precio: 16, m2: 161.84, bloque: "6" },
        { itemId: "bl6_c", nombre: "Corcho (BL-6)", precio: 8, m2: 357.62, bloque: "6" }
      ]
    };

    const isMissingItems1 = !loadedCertificaciones.find(c => c.id === "cert-historical-1")?.items?.length;
    const isMissingItems2 = !loadedCertificaciones.find(c => c.id === "cert-historical-2")?.items?.length;
    const hasHistorical = loadedCertificaciones.some(c => c.id === "cert-historical-1");
    
    if (!hasHistorical || isMissingItems1 || isMissingItems2) {
      // Reemplazar o añadir los certificados históricos con los datos completos
      const filteredCerts = loadedCertificaciones.filter(c => c.id !== "cert-historical-1" && c.id !== "cert-historical-2" && c.id !== "historical-bloque-6");
      const nextCerts = [...filteredCerts, cert1, cert2];
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
        return next;
      });
    } else {
      _setCertificaciones(c);
      storage.saveCertificaciones(c);
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
    
    const ingresos = (a.produccion || []).reduce((acc, p) => {
      const item = itemsSate[p.itemId];
      return acc + (p.m2 * (item?.precio || 0));
    }, 0);

    const totalDailyCost = operariosList.reduce((acc, op) => acc + (op.coste || 0), 0);

    const costeManoObra = (a.produccion.length === 0 && a.motivoSinProduccion) 
      ? 0 
      : totalDailyCost;

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
