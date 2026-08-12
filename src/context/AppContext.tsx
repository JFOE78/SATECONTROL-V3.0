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
  ausenciasResets: Record<string, string>;
  resetAusencias: (operarioName?: string, targetDate?: string) => void;
  getOperarioAusencias: (operarioName: string) => number;
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
  const [ausenciasResets, _setAusenciasResets] = useState<Record<string, string>>({});

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
    const loadedResets = storage.getAusenciasResets();
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
      syncedItems.fase1.precio = 17;
      syncedItems.fase1.nombre = "SATE Combinado (Corcho + Fino)";
    }
    storage.saveItems(syncedItems);

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
    
    // Certificaciones Oficiales enviadas al jefe de obra
    const cert1: Certificacion = {
      id: "cert-historical-1",
      obraId: targetObraId,
      numeroCertificacion: "PRIMERA CERTIFICACIÓN",
      identificador: "2026-01",
      fechaEmision: "2026-04-07",
      mes: "2026-04",
      fechaInicio: "2026-03-01",
      fechaFin: "2026-04-07",
      ejecutado: 12175.20,
      anticipos: 8000.00,
      certificado: 4175.20,
      estado: "cobrado",
      partidas: [
        { itemId: "c1_1", nombre: "Fase Grupo 1 (Eps + Espigas)", precio: 20.00, m2: 216.65, bloque: "BLOQUE 13" },
        { itemId: "c1_2", nombre: "Fase Grupo 2 (Esquineros + Malla/Planimetría)", precio: 20.00, m2: 216.65, bloque: "BLOQUE 13" },
        { itemId: "c1_3", nombre: "Fase Grupo 1 (Eps + Espigas)", precio: 20.00, m2: 146.22, bloque: "BLOQUE 5" },
        { itemId: "c1_4", nombre: "Fase Grupo 2 (Esquineros)", precio: 20.00, m2: 29.24, bloque: "BLOQUE 5" }
      ]
    };

    const cert2: Certificacion = {
      id: "cert-historical-2",
      obraId: targetObraId,
      numeroCertificacion: "SEGUNDA CERTIFICACIÓN",
      identificador: "2026-02",
      fechaEmision: "2026-05-05",
      mes: "2026-05",
      fechaInicio: "2026-04-08",
      fechaFin: "2026-05-05",
      ejecutado: 16147.84,
      anticipos: 8000.00,
      certificado: 8147.84,
      estado: "cobrado",
      partidas: [
        { itemId: "c2_1", nombre: "Antifisuras cornisas", precio: 8.00, m2: 109.00, bloque: "BL-13" },
        { itemId: "c2_2", nombre: "Doble Malla", precio: 8.00, m2: 50.72, bloque: "BL-13" },
        { itemId: "c2_3", nombre: "Malla + Fino", precio: 8.00, m2: 324.84, bloque: "BL-5" },
        { itemId: "c2_4", nombre: "Cornisas antifisura", precio: 8.00, m2: 113.96, bloque: "BL-5" },
        { itemId: "c2_5", nombre: "Corcho + Malla", precio: 16.00, m2: 285.48, bloque: "BL-5" },
        { itemId: "c2_6", nombre: "Cajeado Malla", precio: 8.00, m2: 16.26, bloque: "BL-5" },
        { itemId: "c2_7", nombre: "Cajeado Corcho + Malla", precio: 16.00, m2: 16.26, bloque: "BL-5" },
        { itemId: "c2_8", nombre: "Doble Malla", precio: 8.00, m2: 118.92, bloque: "BL-5" },
        { itemId: "c2_9", nombre: "Corcho + Malla", precio: 16.00, m2: 161.84, bloque: "BL-6" },
        { itemId: "c2_10", nombre: "Corcho", precio: 8.00, m2: 357.62, bloque: "BL-6" }
      ]
    };

    const cert3: Certificacion = {
      id: "cert-historical-3",
      obraId: targetObraId,
      numeroCertificacion: "TERCERA CERTIFICACIÓN",
      identificador: "2026-05",
      fechaEmision: "2026-06-02",
      mes: "2026-06",
      fechaInicio: "2026-05-06",
      fechaFin: "2026-06-02",
      ejecutado: 17964.60,
      anticipos: 8000.00,
      certificado: 9964.60,
      estado: "cobrado",
      partidas: [
        { itemId: "c3_1", nombre: "Antifisuras Balcones", precio: 8.00, m2: 6.00, bloque: "BL-13" },
        { itemId: "c3_2", nombre: "Antifisuras Balcones", precio: 8.00, m2: 12.00, bloque: "BL-5" },
        { itemId: "c3_3", nombre: "Corcho + Mortero (8,15x3,20 + 6,32x11,56)", precio: 16.00, m2: 99.14, bloque: "BL-6" },
        { itemId: "c3_4", nombre: "Antifisuras Balcones (60 + 12 + 54)", precio: 8.00, m2: 126.00, bloque: "BL-6" },
        { itemId: "c3_5", nombre: "Mortero solo (14,66x11,56 + 8,13x3,02 + 14,20x11,56)", precio: 8.00, m2: 358.18, bloque: "BL-6" },
        { itemId: "c3_6", nombre: "Cajeado 2 cm", precio: 16.00, m2: 32.54, bloque: "BL-6" },
        { itemId: "c3_7", nombre: "Corcho + Mortero (12,45x12,60 + 7,88x3,04 + 14,16x11,60 + 13,88x11,60)", precio: 16.00, m2: 506.09, bloque: "BL-12" },
        { itemId: "c3_8", nombre: "Antifisuras Techos", precio: 8.00, m2: 48.00, bloque: "BL-12" },
        { itemId: "c3_9", nombre: "Corcho + Mortero (19,07 x 11,70)", precio: 16.00, m2: 223.12, bloque: "BL-11" },
        { itemId: "c3_10", nombre: "Doble Malla (Bloques BL-6, 11 y 12)", precio: 3.00, m2: 263.00, bloque: "Comunes" }
      ]
    };

    const cert4: Certificacion = {
      id: "cert-historical-4",
      obraId: targetObraId,
      numeroCertificacion: "CUARTA CERTIFICACIÓN",
      identificador: "2026-06",
      fechaEmision: "2026-07-06",
      mes: "2026-07",
      fechaInicio: "2026-06-03",
      fechaFin: "2026-07-06",
      ejecutado: 21521.06,
      anticipos: 10000.00,
      certificado: 11521.06,
      estado: "cobrado",
      partidas: [
        { itemId: "c4_1", nombre: "Corcho + Malla", precio: 16.00, m2: 633.12, bloque: "BL-8 (TORRE)" },
        { itemId: "c4_2", nombre: "Antifisura Techo", precio: 8.00, m2: 23.00, bloque: "BL-8 (TORRE)" },
        { itemId: "c4_3", nombre: "Doble Malla", precio: 3.00, m2: 27.20, bloque: "BL-8 (TORRE)" },
        { itemId: "c4_4", nombre: "Antifisura balcones", precio: 8.00, m2: 72.00, bloque: "BL-12" },
        { itemId: "c4_5", nombre: "Cajeados 2 cm", precio: 16.00, m2: 33.80, bloque: "BL-12" },
        { itemId: "c4_6", nombre: "Antifisuras techos", precio: 8.00, m2: 6.50, bloque: "BL-12" },
        { itemId: "c4_7", nombre: "Doble Malla", precio: 3.00, m2: 29.00, bloque: "BL-12" },
        { itemId: "c4_8", nombre: "Corcho + Malla", precio: 16.00, m2: 99.40, bloque: "BL-12" },
        { itemId: "c4_9", nombre: "Corcho + Malla", precio: 16.00, m2: 408.21, bloque: "BL-11" },
        { itemId: "c4_10", nombre: "Antifisuras techos", precio: 8.00, m2: 50.31, bloque: "BL-11" },
        { itemId: "c4_11", nombre: "Cajeados 2 cm", precio: 16.00, m2: 36.50, bloque: "BL-11" },
        { itemId: "c4_12", nombre: "Doble Malla", precio: 3.00, m2: 104.50, bloque: "BL-11" },
        { itemId: "c4_13", nombre: "Techos planta baja bloques 5-6-12-13", precio: 8.00, m2: 56.00, bloque: "Comunes" }
      ]
    };

    const cert5: Certificacion = {
      id: "cert-historical-5",
      obraId: targetObraId,
      numeroCertificacion: "QUINTA CERTIFICACIÓN",
      identificador: "2026-07",
      fechaEmision: "2026-08-04",
      mes: "2026-08",
      fechaInicio: "2026-07-07",
      fechaFin: "2026-08-04",
      ejecutado: 20167.09,
      anticipos: 7200.00,
      certificado: 12967.09,
      estado: "cobrado",
      partidas: [
        { itemId: "c5_1", nombre: "Corcho + Malla", precio: 17.00, m2: 236.64, bloque: "BL-7 (TORRE)" },
        { itemId: "c5_2", nombre: "Cajeados", precio: 17.00, m2: 63.60, bloque: "BL-7 (TORRE)" },
        { itemId: "c5_3", nombre: "Corcho + Malla Bajo", precio: 17.00, m2: 34.80, bloque: "BL-7 (TORRE)" },
        { itemId: "c5_4", nombre: "Antifisuras", precio: 8.50, m2: 444.04, bloque: "BL-7 (TORRE)" },
        { itemId: "c5_5", nombre: "Corcho + Malla", precio: 17.00, m2: 72.00, bloque: "BL-8 (PAÑO CIEGO)" },
        { itemId: "c5_6", nombre: "Techo Antifisuras", precio: 8.50, m2: 10.00, bloque: "BL-8 (PAÑO CIEGO)" },
        { itemId: "c5_7", nombre: "Antifisuras Trasero", precio: 8.50, m2: 198.75, bloque: "BL-11" },
        { itemId: "c5_8", nombre: "Corcho + Malla", precio: 17.00, m2: 293.10, bloque: "Patios Interiores" },
        { itemId: "c5_9", nombre: "14 Horas Administración (Arreglo Esquina)", precio: 20.00, m2: 14.00, bloque: "Varios / Pactos" },
        { itemId: "c5_10", nombre: "Pacto complemento +1,00 € / m² (Corcho y Malla acumulado - 50% abono)", precio: 1.00, m2: 2003.00, bloque: "Varios / Pactos" },
        { itemId: "c5_11", nombre: "Pacto complemento +0,50 € / m² (Antifisuras acumulado)", precio: 0.50, m2: 622.00, bloque: "Varios / Pactos" },
        { itemId: "c5_12", nombre: "Pacto complemento +1,00 € / ml (Cajeados acumulado)", precio: 1.00, m2: 122.00, bloque: "Varios / Pactos" }
      ]
    };

    const isMissingItems1 = !loadedCertificaciones.find(c => c.id === "cert-historical-1")?.partidas?.length;
    const isMissingItems2 = !loadedCertificaciones.find(c => c.id === "cert-historical-2")?.partidas?.length;
    const isMissingItems3 = !loadedCertificaciones.find(c => c.id === "cert-historical-3")?.partidas?.length;
    const hasCert4 = loadedCertificaciones.some(c => c.id === "cert-historical-4");
    const hasCert5 = loadedCertificaciones.some(c => c.id === "cert-historical-5");
    const wasHistoricalExplicitlyDeleted = localStorage.getItem("sate_historical_deleted") === "true";
    
    if ((!hasCert5 || !hasCert4 || isMissingItems1 || isMissingItems2 || isMissingItems3) && !wasHistoricalExplicitlyDeleted) {
      // Reemplazar o añadir los certificados históricos con los datos completos
      const customCerts = loadedCertificaciones.filter(c => 
        !["cert-historical-1", "cert-historical-2", "cert-historical-3", "cert-historical-4", "cert-historical-5", "historical-bloque-6", "f29501fe-26fe-4706-b384-c0252aa53446"].includes(c.id)
      );
      const nextCerts = [cert1, cert2, cert3, cert4, cert5, ...customCerts];
      storage.saveCertificaciones(nextCerts);
      _setCertificaciones(nextCerts);
    } else {
      const updatedCerts = loadedCertificaciones.map(c => {
        if (c.id === "cert-historical-1" || c.numeroCertificacion === "PRIMERA CERTIFICACIÓN") {
          return cert1;
        }
        if (c.id === "cert-historical-5" || c.numeroCertificacion === "QUINTA CERTIFICACIÓN") {
          return cert5;
        }
        if (c.id === "f29501fe-26fe-4706-b384-c0252aa53446" || (c.mes === "2026-08" && (c.fechaFin === "2026-08-03" || c.fechaFin === "2026-08-04"))) {
          const hasAvanceAug4 = (c.avanceIds || []).includes("avance-auto-2026-08-04-1785850348524");
          const nextAvanceIds = hasAvanceAug4 
            ? (c.avanceIds || []) 
            : [...(c.avanceIds || []), "avance-auto-2026-08-04-1785850348524"];
          
          const nextPartidas = (c.partidas || []).map(p => {
            if (p.itemId === "fase1") {
              return { ...p, m2: 708.35 };
            }
            return p;
          });

          return {
            ...c,
            fechaFin: "2026-08-04",
            avanceIds: nextAvanceIds,
            partidas: nextPartidas,
            ejecutado: 14308.67,
            certificado: 7108.67
          };
        }
        return c;
      });

      if (JSON.stringify(updatedCerts) !== JSON.stringify(loadedCertificaciones)) {
        storage.saveCertificaciones(updatedCerts);
        _setCertificaciones(updatedCerts);
      } else {
        _setCertificaciones(loadedCertificaciones);
      }
    }

    _setManualAdjustments(loadedAdjustments);
    _setAusenciasResets(loadedResets || {});
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

  const resetAusencias = useCallback((operarioName?: string, targetDate?: string) => {
    const defaultDate = targetDate || new Date().toISOString().split('T')[0];
    _setAusenciasResets(prev => {
      const next = { ...prev };
      const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (operarioName) {
        next[norm(operarioName)] = defaultDate;
      } else {
        (operariosList || []).forEach(op => {
          next[norm(op.nombre)] = defaultDate;
        });
      }
      storage.saveAusenciasResets(next);
      return next;
    });
  }, [operariosList]);

  const getOperarioAusencias = useCallback((operarioName: string) => {
    const norm = (s: string) => (s || "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const opClean = norm(operarioName);
    
    // Default reset date: "2026-08-04" (last certification close) if no reset set
    const resetDate = ausenciasResets[opClean] ?? "2026-08-04";

    const absentDates = new Set<string>();

    (avances || []).forEach(a => {
      if (resetDate && a.fecha <= resetDate) return;
      const isSinActividad = a.produccion.length === 0 && a.motivoSinProduccion;
      if (isSinActividad) return;

      if ((a.operariosVacaciones || []).some(o => norm(o) === opClean)) {
        absentDates.add(a.fecha);
      } else if (a.operariosPresentes && a.operariosPresentes.length > 0) {
        const isPresent = a.operariosPresentes.some(o => norm(o) === opClean);
        if (!isPresent) {
          absentDates.add(a.fecha);
        }
      }
    });

    (vacaciones || []).forEach(v => {
      if (resetDate && v.fecha <= resetDate) return;
      if (norm(v.operario) === opClean) {
        absentDates.add(v.fecha);
      }
    });

    return absentDates.size;
  }, [avances, vacaciones, ausenciasResets]);

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
      manualAdjustments, setManualAdjustments,
      ausenciasResets, resetAusencias, getOperarioAusencias
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
