import { Obra, Avance, Anticipo, Gasto, Certificacion } from '../types';

import defaultBackup from '../data/defaultBackup.json';

const KEYS = {
  OBRAS: 'sate_obras',
  AVANCES: 'sate_avances',
  ANTICIPOS: 'sate_anticipos',
  GASTOS: 'sate_gastos',
  CERTIFICACIONES: 'sate_certificaciones',
  SELECTED_OBRA: 'sate_selected_obra',
  THEME: 'sate_theme',
  ITEMS: 'sate_items_sate',
  ADJUSTMENTS: 'sate_manual_adjustments'
};

const normalizeCertificaciones = (certs: Certificacion[]): Certificacion[] => {
  return certs.map(c => {
    if (
      c.id === "a335f0c3-c25f-41d1-9093-1b5460981467" ||
      c.numeroCertificacion === "SÉPTIMA CERTIFICACIÓN" ||
      (c.mes === "2026-10" && (c.fechaFin === "2026-10-01" || c.fechaFin === "2026-10-05"))
    ) {
      return {
        ...c,
        numeroCertificacion: "SÉPTIMA CERTIFICACIÓN",
        identificador: c.identificador || "2026-10",
        fechaEmision: "2026-10-05",
        fechaInicio: "2026-09-05",
        fechaFin: "2026-10-05",
        estado: "cobrado" as const
      };
    }
    if (c.id === "18cb91a5-8dd6-4f6f-af1b-a04aee49ee8e") {
      return {
        ...c,
        numeroCertificacion: "SEXTA CERTIFICACIÓN",
        identificador: c.identificador || "2026-08"
      };
    }
    return c;
  });
};

export const storage = {
  saveObras: (obras: Obra[]) => localStorage.setItem(KEYS.OBRAS, JSON.stringify(obras)),
  getObras: (): Obra[] => {
    const raw = localStorage.getItem(KEYS.OBRAS);
    return raw ? JSON.parse(raw) : (defaultBackup.obras as Obra[]);
  },
  
  saveAvances: (avances: Avance[]) => localStorage.setItem(KEYS.AVANCES, JSON.stringify(avances)),
  getAvances: (): Avance[] => {
    const raw = localStorage.getItem(KEYS.AVANCES);
    return raw ? JSON.parse(raw) : (defaultBackup.avances as Avance[]);
  },
  
  saveAnticipos: (anticipos: Anticipo[]) => localStorage.setItem(KEYS.ANTICIPOS, JSON.stringify(anticipos)),
  getAnticipos: (): Anticipo[] => {
    const raw = localStorage.getItem(KEYS.ANTICIPOS);
    return raw ? JSON.parse(raw) : (defaultBackup.anticipos as Anticipo[]);
  },
  
  saveGastos: (gastos: Gasto[]) => localStorage.setItem(KEYS.GASTOS, JSON.stringify(gastos)),
  getGastos: (): Gasto[] => {
    const raw = localStorage.getItem(KEYS.GASTOS);
    return raw ? JSON.parse(raw) : (defaultBackup.gastos as Gasto[]);
  },
  
  saveCertificaciones: (certs: Certificacion[]) => {
    const normalized = normalizeCertificaciones(certs);
    localStorage.setItem(KEYS.CERTIFICACIONES, JSON.stringify(normalized));
  },
  getCertificaciones: (): Certificacion[] => {
    const raw = localStorage.getItem(KEYS.CERTIFICACIONES);
    const list: Certificacion[] = raw ? JSON.parse(raw) : (defaultBackup.certificaciones as Certificacion[]);
    return normalizeCertificaciones(list);
  },
  
  saveSelectedObra: (id: string) => localStorage.setItem(KEYS.SELECTED_OBRA, id),
  getSelectedObra: (): string | null => localStorage.getItem(KEYS.SELECTED_OBRA) || defaultBackup.selectedObra,
  
  saveActiveObraId: (id: string) => localStorage.setItem(KEYS.SELECTED_OBRA, id),
  getActiveObraId: (): string | null => localStorage.getItem(KEYS.SELECTED_OBRA) || defaultBackup.selectedObra,

  exportData: () => {
    const data = {
      obras: storage.getObras(),
      avances: storage.getAvances(),
      anticipos: storage.getAnticipos(),
      gastos: storage.getGastos(),
      certificaciones: storage.getCertificaciones(),
      items: storage.getItems(),
      operarios: storage.getOperarios(),
      selectedObra: storage.getSelectedObra()
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.certificaciones) {
        data.certificaciones = normalizeCertificaciones(data.certificaciones);
      }
      if (data.obras) storage.saveObras(data.obras);
      if (data.avances) storage.saveAvances(data.avances);
      if (data.anticipos) storage.saveAnticipos(data.anticipos);
      if (data.gastos) storage.saveGastos(data.gastos);
      if (data.certificaciones) storage.saveCertificaciones(data.certificaciones);
      if (data.items) storage.saveItems(data.items);
      if (data.operarios) storage.saveOperarios(data.operarios);
      if (data.selectedObra) storage.saveSelectedObra(data.selectedObra);
      return true;
    } catch (e) {
      console.error("Error al importar datos:", e);
      return false;
    }
  },
  
  saveTheme: (theme: 'light' | 'dark') => localStorage.setItem(KEYS.THEME, theme),
  getTheme: (): 'light' | 'dark' => (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'light',
  
  saveItems: (items: Record<string, any>) => localStorage.setItem(KEYS.ITEMS, JSON.stringify(items)),
  getItems: (): Record<string, any> => JSON.parse(localStorage.getItem(KEYS.ITEMS) || '{}'),

  saveOperarios: (ops: any[]) => localStorage.setItem('sate_operarios_list', JSON.stringify(ops)),
  getOperarios: (): any[] => JSON.parse(localStorage.getItem('sate_operarios_list') || '[]'),

  saveAusenciasResets: (resets: Record<string, string>) => localStorage.setItem('sate_ausencias_resets', JSON.stringify(resets)),
  getAusenciasResets: (): Record<string, string> => JSON.parse(localStorage.getItem('sate_ausencias_resets') || '{}'),

  saveManualAdjustments: (adj: Record<string, number>) => localStorage.setItem(KEYS.ADJUSTMENTS, JSON.stringify(adj)),
  getManualAdjustments: (): Record<string, number> => JSON.parse(localStorage.getItem(KEYS.ADJUSTMENTS) || '{}'),

  saveNotasCertificacion: (notas: any[]) => localStorage.setItem('sate_notas_certificacion', JSON.stringify(notas)),
  getNotasCertificacion: (): any[] => JSON.parse(localStorage.getItem('sate_notas_certificacion') || '[]')
};
