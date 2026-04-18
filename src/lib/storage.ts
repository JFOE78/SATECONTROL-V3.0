import { Obra, Avance, Certificacion, Anticipo, Gasto } from "../types";

const KEYS = {
  OBRAS: "sate_obras",
  AVANCES: "sate_avances",
  CERTIFICACIONES: "sate_certificaciones",
  ANTICIPOS: "sate_anticipos",
  GASTOS: "sate_gastos",
  ACTIVE_OBRA: "sate_active_obra",
  ITEMS: "sate_items",
  OPERARIOS: "sate_operarios",
  THEME: "sate_theme",
};

export const storage = {
  getObras: (): Obra[] => {
    try {
      const data = localStorage.getItem(KEYS.OBRAS);
      return data ? JSON.parse(data) || [] : [];
    } catch (e) {
      return [];
    }
  },
  saveObras: (obras: Obra[]) => {
    localStorage.setItem(KEYS.OBRAS, JSON.stringify(obras || []));
  },
  getActiveObraId: (): string | null => {
    return localStorage.getItem(KEYS.ACTIVE_OBRA);
  },
  saveActiveObraId: (id: string) => {
    localStorage.setItem(KEYS.ACTIVE_OBRA, id);
  },
  getAvances: (): Avance[] => {
    try {
      const data = localStorage.getItem(KEYS.AVANCES);
      return data ? JSON.parse(data) || [] : [];
    } catch (e) {
      return [];
    }
  },
  saveAvances: (avances: Avance[]) => {
    localStorage.setItem(KEYS.AVANCES, JSON.stringify(avances || []));
  },
  getCertificaciones: (): Certificacion[] => {
    try {
      const data = localStorage.getItem(KEYS.CERTIFICACIONES);
      return data ? JSON.parse(data) || [] : [];
    } catch (e) {
      return [];
    }
  },
  saveCertificaciones: (certificaciones: Certificacion[]) => {
    localStorage.setItem(KEYS.CERTIFICACIONES, JSON.stringify(certificaciones || []));
  },
  getAnticipos: (): Anticipo[] => {
    try {
      const data = localStorage.getItem(KEYS.ANTICIPOS);
      return data ? JSON.parse(data) || [] : [];
    } catch (e) {
      return [];
    }
  },
  saveAnticipos: (anticipos: Anticipo[]) => {
    localStorage.setItem(KEYS.ANTICIPOS, JSON.stringify(anticipos || []));
  },
  getGastos: (): Gasto[] => {
    try {
      const data = localStorage.getItem(KEYS.GASTOS);
      return data ? JSON.parse(data) || [] : [];
    } catch (e) {
      return [];
    }
  },
  saveGastos: (gastos: Gasto[]) => {
    localStorage.setItem(KEYS.GASTOS, JSON.stringify(gastos || []));
  },
  getItems: (): Record<string, any> | null => {
    try {
      const data = localStorage.getItem(KEYS.ITEMS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  saveItems: (items: Record<string, any>) => {
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  },
  getOperarios: (): any[] | null => {
    try {
      const data = localStorage.getItem(KEYS.OPERARIOS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  saveOperarios: (operarios: any[]) => {
    localStorage.setItem(KEYS.OPERARIOS, JSON.stringify(operarios || []));
  },
  getTheme: (): "light" | "dark" => {
    return (localStorage.getItem(KEYS.THEME) as "light" | "dark") || "light";
  },
  saveTheme: (theme: "light" | "dark") => {
    localStorage.setItem(KEYS.THEME, theme);
  },
  exportData: () => {
    const data = {
      obras: storage.getObras(),
      avances: storage.getAvances(),
      certificaciones: storage.getCertificaciones(),
      anticipos: storage.getAnticipos(),
      gastos: storage.getGastos(),
      items: storage.getItems(),
      operarios: storage.getOperarios(),
    };
    return JSON.stringify(data, null, 2);
  },
  importData: (json: string) => {
    try {
      const data = JSON.parse(json);

      // Detect Legacy Format (SATEPRO v3.2.0 or similar)
      if (data.metadata && data.metadata.app === "SATEPRO") {
        const currentObras = storage.getObras();
        const currentAvances = storage.getAvances();
        const currentAnticipos = storage.getAnticipos();
        const currentGastos = storage.getGastos();
        const currentCerts = storage.getCertificaciones();

        // 1. Map Obras
        const newObras = (data.obras || []).map((o: any) => ({
          id: o.id,
          nombre: o.nombre,
          numBloques: 20
        }));

        // 2. Map Operarios Name Map
        const opMap: Record<string, string> = {};
        (data.operarios || []).forEach((op: any) => {
          opMap[op.id] = op.nombre.trim();
        });

        // 3. Map Avances
        const newAvances = (data.partes_diarios || []).map((p: any) => {
          const opsIdsForParte = (data.partes_operarios || [])
            .filter((po: any) => po.parte_id === p.id)
            .map((po: any) => opMap[po.operario_id])
            .filter(Boolean);
          
          const operariosPresentes = opsIdsForParte.length > 0 ? opsIdsForParte : ["Juan", "Mosquito", "Antonio", "Jesules", "David"];
          
          const ingresos = (p.m2_ejecutados || 0) * 20;
          const costeMO = operariosPresentes.reduce((sum, name) => {
            const opData = (data.operarios || []).find((o: any) => o.nombre.trim() === name);
            return sum + (opData?.jornal_dia || 120);
          }, 0);
          const beneficio = ingresos - costeMO;

          return {
            id: p.id,
            fecha: p.fecha,
            obraId: p.obra_id,
            bloque: "Migración",
            operariosPresentes,
            produccion: Object.entries(p.produccion || {}).map(([key, val]) => ({
              itemId: key.toLowerCase().includes("eps") ? "fase1" : 
                      key.toLowerCase().includes("espigas") ? "fase2" :
                      key.toLowerCase().includes("esquineros") ? "fase3" : "fase4",
              m2: Number(val),
              bloque: "Migración"
            })),
            resumen: {
              ingresos,
              costeManoObra: costeMO,
              beneficio,
              beneficioPorOperario: operariosPresentes.length > 0 ? beneficio / operariosPresentes.length : 0
            }
          };
        });

        // 4. Map Anticipos
        const newAnticipos = (data.anticipos || []).map((an: any) => ({
          id: an.id,
          fecha: an.fecha,
          obraId: an.obra_id,
          operario: opMap[an.operario_id] || an.operario_id,
          cantidad: an.importe
        }));

        // 5. Map Gastos
        const newGastos = (data.expenses || []).map((e: any) => ({
          id: e.id,
          fecha: e.fecha,
          obraId: e.obra_id,
          concepto: e.concepto,
          monto: e.importe,
          pagadoPor: opMap[e.operario_id]
        }));

        // 6. Map Certificaciones
        const newCertificaciones = (data.certificaciones || []).map((c: any) => ({
          id: c.id,
          obraId: c.obra_id,
          mes: c.fecha.substring(0, 7),
          ejecutado: c.total_certificacion || 0,
          anticipos: (data.anticipos || [])
            .filter((an: any) => an.obra_id === c.obra_id && an.fecha.startsWith(c.fecha.substring(0, 7)))
            .reduce((sum: number, an: any) => sum + an.importe, 0),
          certificado: c.total_certificacion,
          estado: "cobrado",
          fechaCobro: c.fecha
        }));

        // MERGE without duplication
        storage.saveObras([...currentObras, ...newObras.filter((no: any) => !currentObras.some(co => co.id === no.id))]);
        storage.saveAvances([...currentAvances, ...newAvances.filter((na: any) => !currentAvances.some(ca => ca.id === na.id))]);
        storage.saveAnticipos([...currentAnticipos, ...newAnticipos.filter((nan: any) => !currentAnticipos.some(can => can.id === nan.id))]);
        storage.saveGastos([...currentGastos, ...newGastos.filter((ng: any) => !currentGastos.some(cg => cg.id === ng.id))]);
        storage.saveCertificaciones([...currentCerts, ...newCertificaciones.filter((nc: any) => !currentCerts.some(cc => cc.id === nc.id))]);
        
        return true;
      }

      if (data.obras && Array.isArray(data.obras)) storage.saveObras(data.obras);
      if (data.avances && Array.isArray(data.avances)) storage.saveAvances(data.avances);
      if (data.certificaciones && Array.isArray(data.certificaciones)) storage.saveCertificaciones(data.certificaciones);
      if (data.anticipos && Array.isArray(data.anticipos)) storage.saveAnticipos(data.anticipos);
      if (data.gastos && Array.isArray(data.gastos)) storage.saveGastos(data.gastos);
      if (data.items) storage.saveItems(data.items);
      if (data.operarios && Array.isArray(data.operarios)) storage.saveOperarios(data.operarios);
      return true;
    } catch (e) {
      console.error("Error importing data", e);
      return false;
    }
  }
};
