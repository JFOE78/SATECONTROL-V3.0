import { Obra, Avance, Anticipo, Gasto, Certificacion } from '../types';

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

export const storage = {
  saveObras: (obras: Obra[]) => localStorage.setItem(KEYS.OBRAS, JSON.stringify(obras)),
  getObras: (): Obra[] => JSON.parse(localStorage.getItem(KEYS.OBRAS) || '[]'),
  
  saveAvances: (avances: Avance[]) => localStorage.setItem(KEYS.AVANCES, JSON.stringify(avances)),
  getAvances: (): Avance[] => JSON.parse(localStorage.getItem(KEYS.AVANCES) || '[]'),
  
  saveAnticipos: (anticipos: Anticipo[]) => localStorage.setItem(KEYS.ANTICIPOS, JSON.stringify(anticipos)),
  getAnticipos: (): Anticipo[] => JSON.parse(localStorage.getItem(KEYS.ANTICIPOS) || '[]'),
  
  saveGastos: (gastos: Gasto[]) => localStorage.setItem(KEYS.GASTOS, JSON.stringify(gastos)),
  getGastos: (): Gasto[] => JSON.parse(localStorage.getItem(KEYS.GASTOS) || '[]'),
  
  saveCertificaciones: (certs: Certificacion[]) => localStorage.setItem(KEYS.CERTIFICACIONES, JSON.stringify(certs)),
  getCertificaciones: (): Certificacion[] => JSON.parse(localStorage.getItem(KEYS.CERTIFICACIONES) || '[]'),
  
  saveSelectedObra: (id: string) => localStorage.setItem(KEYS.SELECTED_OBRA, id),
  getSelectedObra: (): string | null => localStorage.getItem(KEYS.SELECTED_OBRA),
  
  saveActiveObraId: (id: string) => localStorage.setItem(KEYS.SELECTED_OBRA, id),
  getActiveObraId: (): string | null => localStorage.getItem(KEYS.SELECTED_OBRA),

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

  saveManualAdjustments: (adj: Record<string, number>) => localStorage.setItem(KEYS.ADJUSTMENTS, JSON.stringify(adj)),
  getManualAdjustments: (): Record<string, number> => JSON.parse(localStorage.getItem(KEYS.ADJUSTMENTS) || '{}')
};
