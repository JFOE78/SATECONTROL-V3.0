import React, { useState } from "react";
import { ChevronLeft, Moon, Sun, Download, Upload, Trash2, Plus, Edit2, Database, AlertTriangle, FileText } from "lucide-react";
import { useApp } from "../context/AppContext";
import { storage } from "../lib/storage";

type ConfigTab = "general" | "partidas" | "operarios";

export const ConfigScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { 
    theme, setTheme, 
    itemsSate, setItemsSate, 
    operariosList, setOperariosList, 
    notify, 
    obras, setObras,
    avances, setAvances,
    anticipos, setAnticipos,
    gastos, setGastos,
    certificaciones, setCertificaciones
  } = useApp();

  const [activeTab, setActiveTab] = useState<ConfigTab>("general");
  const [editingItem, setEditingItem] = useState<{id: string, nombre: string, precio: number} | null>(null);
  const [editingOp, setEditingOp] = useState<{index: number, nombre: string, coste: number} | null>(null);
  const [confirmActionId, setConfirmActionId] = useState<string | null>(null);

  const startConfirm = (id: string, callback: () => void) => {
    if (confirmActionId === id) {
      callback();
      setConfirmActionId(null);
    } else {
      setConfirmActionId(id);
      setTimeout(() => setConfirmActionId(null), 4000);
      notify("Pulsa otra vez para confirmar", "info");
    }
  };

  const handleExport = () => {
    const data = storage.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satecontrol_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    notify("Copia de seguridad generada", "success");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      if (storage.importData(json)) {
        notify("Datos importados. Reiniciando...", "success");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        notify("Error al importar el archivo", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleUnifyObras = () => {
    const nameMap: Record<string, string> = {}; // nombre -> originalId
    const unifiedObras = [...obras];
    const duplicates: string[] = []; // ids to remove

    obras.forEach(o => {
      const cleanName = o.nombre.trim().toLowerCase();
      if (!nameMap[cleanName]) {
        nameMap[cleanName] = o.id;
      } else {
        duplicates.push(o.id);
        const originalId = nameMap[cleanName];
        // Relink data
        setAvances(avances.map(a => a.obraId === o.id ? { ...a, obraId: originalId } : a));
        setGastos(gastos.map(g => g.obraId === o.id ? { ...g, obraId: originalId } : g));
        setAnticipos(anticipos.map(an => an.obraId === o.id ? { ...an, obraId: originalId } : an));
        setCertificaciones(certificaciones.map(c => c.obraId === o.id ? { ...c, obraId: originalId } : c));
      }
    });

    setObras(unifiedObras.filter(o => !duplicates.includes(o.id)));
    notify(`Limpieza completada. ${duplicates.length} obras unificadas.`, "success");
  };

  const handleDeduplicateAvances = () => {
    setAvances(prev => {
      const seen = new Set();
      const next = [];
      for (let i = prev.length - 1; i >= 0; i--) {
        const a = prev[i];
        const key = `${a.obraId}-${a.fecha}-${a.bloque.trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(a);
        }
      }
      return next.reverse();
    });
    notify("Limpieza de duplicados completada", "success");
  };

  const handleClearAll = () => {
    localStorage.clear();
    notify("Todo borrado. Reiniciando...", "success");
    setTimeout(() => window.location.reload(), 1500);
  };

  const saveItem = () => {
    if (!editingItem) return;
    const next = { ...itemsSate, [editingItem.id]: { nombre: editingItem.nombre, precio: editingItem.precio } };
    setItemsSate(next);
    setEditingItem(null);
    notify("Partida guardada", "success");
  };

  const deleteItem = (id: string) => {
    const next = { ...itemsSate };
    delete next[id];
    setItemsSate(next);
    notify("Partida eliminada", "success");
  };

  const saveOp = () => {
    if (!editingOp) return;
    const next = [...operariosList];
    if (editingOp.index === -1) {
      next.push({ nombre: editingOp.nombre, coste: editingOp.coste });
    } else {
      next[editingOp.index] = { nombre: editingOp.nombre, coste: editingOp.coste };
    }
    setOperariosList(next);
    setEditingOp(null);
    notify("Operario guardado", "success");
  };

  const deleteOp = (index: number) => {
    setOperariosList(operariosList.filter((_, i) => i !== index));
    notify("Operario eliminado", "success");
  };

  const handleExportCSV = () => {
    if (avances.length === 0) {
      notify("No hay avances para exportar", "error");
      return;
    }
    
    // Header
    let csv = "Fecha,Obra,Bloque,Item,M2,Operarios,Clima\n";
    
    // Rows
    avances.forEach(a => {
      const obraName = obras.find(o => o.id === a.obraId)?.nombre || a.obraId;
      const ops = a.operariosPresentes.join(" | ");
      a.produccion.forEach(p => {
        const itemName = itemsSate[p.itemId]?.nombre || p.itemId;
        csv += `${a.fecha},"${obraName}","${a.bloque}","${itemName}",${p.m2},"${ops}","${a.clima || ''}"\n`;
      });
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satecontrol_produccion_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify("CSV exportado correctamente", "success");
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Configuración</h2>
        <div className="w-12 h-12" />
      </header>

      {/* Selector de Pestañas */}
      <nav className="flex gap-2 px-2 overflow-x-auto no-scrollbar">
        {(["general", "partidas", "operarios"] as ConfigTab[]).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none" 
                : "bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "general" && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Modo Visual</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Cambia entre tema claro y oscuro</p>
              </div>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-blue-600 active:scale-90 transition-transform"
              >
                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
              </button>
            </div>

            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Copia de Seguridad</h3>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={handleExport} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all">
                  <Download className="text-blue-600" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Backup</span>
                </button>
                <label className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all cursor-pointer">
                  <Upload className="text-orange-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Import</span>
                  <input type="file" onChange={handleImport} className="hidden" accept=".json" />
                </label>
                <button onClick={handleExportCSV} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all">
                  <FileText className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Excel</span>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Mantenimiento</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => startConfirm('dedup', handleDeduplicateAvances)} 
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${confirmActionId === 'dedup' ? "bg-blue-600 text-white animate-pulse shadow-lg" : "bg-slate-50 dark:bg-slate-800"}`}
                >
                  <div className="flex items-center gap-3">
                    <Database className={confirmActionId === 'dedup' ? "text-white" : "text-blue-500"} size={18} />
                    <span className={`text-[10px] font-black uppercase ${confirmActionId === 'dedup' ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                      {confirmActionId === 'dedup' ? "¿CONFIRMAR LIMPIEZA?" : "Limpiar Duplicados Agenda"}
                    </span>
                  </div>
                </button>
                <button 
                  onClick={() => startConfirm('unify', handleUnifyObras)} 
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${confirmActionId === 'unify' ? "bg-emerald-600 text-white animate-pulse shadow-lg" : "bg-slate-50 dark:bg-slate-800"}`}
                >
                  <div className="flex items-center gap-3">
                    <Database className={confirmActionId === 'unify' ? "text-white" : "text-emerald-500"} size={18} />
                    <span className={`text-[10px] font-black uppercase ${confirmActionId === 'unify' ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                       {confirmActionId === 'unify' ? "¿CONFIRMAR UNIFICACIÓN?" : "Unificar Obras Duplicadas"}
                    </span>
                  </div>
                </button>
                <button 
                  onClick={() => startConfirm('clear', handleClearAll)} 
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${confirmActionId === 'clear' ? "bg-red-600 text-white animate-pulse shadow-lg" : "bg-red-50 dark:bg-red-900/10"}`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={confirmActionId === 'clear' ? "text-white" : "text-red-500"} size={18} />
                    <span className={`text-[10px] font-black uppercase ${confirmActionId === 'clear' ? "text-white" : "text-red-600"}`}>
                      {confirmActionId === 'clear' ? "¡PULSA OTRA VEZ PARA BORRAR TODO!" : "Borrar Todo el Contenido"}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "partidas" && (
        <div className="space-y-4 pb-20">
          <button 
            onClick={() => setEditingItem({ id: crypto.randomUUID(), nombre: "", precio: 0 })}
            className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Plus size={24} /> <span className="uppercase tracking-widest text-sm">Nueva Partida</span>
          </button>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Lista de Partidas</h3>
            {Object.entries(itemsSate).map(([id, item]: [string, any]) => (
              <div key={id} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">{item.nombre}</h4>
                  <p className="text-blue-600 font-bold text-xs">{item.precio?.toLocaleString()}€/m²</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem({ id, ...item })} className="p-3 bg-slate-100 dark:bg-slate-800 text-blue-600 rounded-xl"><Edit2 size={18} /></button>
                  <button 
                    onClick={() => startConfirm(`item-${id}`, () => deleteItem(id))} 
                    className={`p-3 rounded-xl transition-all ${confirmActionId === `item-${id}` ? "bg-red-600 text-white animate-pulse" : "bg-red-50 dark:bg-red-900/10 text-red-500"}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "operarios" && (
        <div className="space-y-4 pb-20">
          <button 
            onClick={() => setEditingOp({ index: -1, nombre: "", coste: 0 })}
            className="w-full bg-blue-600 text-white p-5 rounded-[2rem] font-black shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Plus size={24} /> <span className="uppercase tracking-widest text-sm">Nuevo Operario</span>
          </button>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Lista de Operarios</h3>
            {operariosList.map((op: any, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm">{op.nombre}</h4>
                  <p className="text-orange-500 font-bold text-xs">Coste: {op.coste}€/día</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingOp({ index: idx, ...op })} className="p-3 bg-slate-100 dark:bg-slate-800 text-blue-600 rounded-xl"><Edit2 size={18} /></button>
                  <button 
                    onClick={() => startConfirm(`op-${idx}`, () => deleteOp(idx))} 
                    className={`p-3 rounded-xl transition-all ${confirmActionId === `op-${idx}` ? "bg-red-600 text-white animate-pulse" : "bg-red-50 dark:bg-red-900/10 text-red-500"}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modales de Edición */}
      {editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase text-center">Partida</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre de la partida" 
                value={editingItem.nombre} 
                onChange={e => setEditingItem({ ...editingItem, nombre: e.target.value })} 
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none" 
              />
              <input 
                type="number" 
                placeholder="Precio (€/m²)" 
                value={editingItem.precio} 
                onChange={e => setEditingItem({ ...editingItem, precio: Number(e.target.value) })} 
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none" 
              />
            </div>
            <button onClick={saveItem} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-lg shadow-blue-100">Guardar</button>
            <button onClick={() => setEditingItem(null)} className="w-full text-slate-400 font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {editingOp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 space-y-6 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase text-center">Operario</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre" 
                value={editingOp.nombre} 
                onChange={e => setEditingOp({ ...editingOp, nombre: e.target.value })} 
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none" 
              />
              <input 
                type="number" 
                placeholder="Coste Diario (€)" 
                value={editingOp.coste} 
                onChange={e => setEditingOp({ ...editingOp, coste: Number(e.target.value) })} 
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black outline-none" 
              />
            </div>
            <button onClick={saveOp} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-lg shadow-blue-100">Guardar</button>
            <button onClick={() => setEditingOp(null)} className="w-full text-slate-400 font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="p-4 text-center">
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">SATEPRO v3.5.0</p>
      </div>
    </div>
  );
};
