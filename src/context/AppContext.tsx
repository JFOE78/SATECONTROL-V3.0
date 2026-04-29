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
      nombre: op.nombre.trim()
    }));
    
    const configOpsUnique = cleanOperarios.filter((op: any, index: number, self: any[]) =>
      index === self.findIndex((t: any) => t.nombre.toLowerCase() === op.nombre.toLowerCase())
    );

    const cleanAvances = loadedAvances.map((a: Avance) => ({
      ...a,
      operariosPresentes: Array.from(new Set((a.operariosPresentes || []).map(o => o.trim()))).filter(Boolean)
    }));

    const cleanAnticipos = loadedAnticipos.map((an: Anticipo) => ({
      ...an,
      operario: an.operario.trim()
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
    _setCertificaciones(loadedCertificaciones);
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
