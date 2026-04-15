import { Obra, Avance, Certificacion, Anticipo } from "../types";

const KEYS = {
  OBRAS: "sate_obras",
  AVANCES: "sate_avances",
  CERTIFICACIONES: "sate_certificaciones",
  ANTICIPOS: "sate_anticipos",
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
      items: storage.getItems(),
      operarios: storage.getOperarios(),
    };
    return JSON.stringify(data, null, 2);
  },
  importData: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.obras && Array.isArray(data.obras)) storage.saveObras(data.obras);
      if (data.avances && Array.isArray(data.avances)) storage.saveAvances(data.avances);
      if (data.certificaciones && Array.isArray(data.certificaciones)) storage.saveCertificaciones(data.certificaciones);
      if (data.anticipos && Array.isArray(data.anticipos)) storage.saveAnticipos(data.anticipos);
      if (data.items) storage.saveItems(data.items);
      if (data.operarios && Array.isArray(data.operarios)) storage.saveOperarios(data.operarios);
      return true;
    } catch (e) {
      console.error("Error importing data", e);
      return false;
    }
  }
};
