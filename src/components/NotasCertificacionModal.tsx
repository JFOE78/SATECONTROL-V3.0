import React, { useState } from "react";
import { X, CheckCircle2, Circle, Plus, Trash2, ClipboardList, AlertCircle, Calendar, Tag, Edit2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultBloque?: string;
  initialEditId?: string | null;
}

export const NotasCertificacionModal: React.FC<Props> = ({ isOpen, onClose, defaultBloque, initialEditId }) => {
  const { 
    notasCertificacion, 
    addNotaCertificacion, 
    toggleNotaCertificacion, 
    deleteNotaCertificacion,
    updateNotaCertificacion,
    selectedObraId 
  } = useApp();

  const [concepto, setConcepto] = useState("");
  const [bloque, setBloque] = useState(defaultBloque || "Varios");
  const [filtro, setFiltro] = useState<"pendientes" | "completadas" | "todas">("pendientes");

  // Estado para edición inline
  const [editingId, setEditingId] = useState<string | null>(initialEditId || null);
  const [editConcepto, setEditConcepto] = useState("");
  const [editBloque, setEditBloque] = useState("Varios");

  if (!isOpen) return null;

  // Filter notes for the current active obra
  const obraNotas = notasCertificacion.filter(n => n.obraId === selectedObraId || !n.obraId);

  const pendientesCount = obraNotas.filter(n => !n.completado).length;
  const completadasCount = obraNotas.filter(n => n.completado).length;

  const notasFiltradas = obraNotas.filter(n => {
    if (filtro === "pendientes") return !n.completado;
    if (filtro === "completadas") return n.completado;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim()) return;
    addNotaCertificacion(concepto, bloque);
    setConcepto("");
  };

  const handleStartEdit = (nota: typeof obraNotas[0]) => {
    setEditingId(nota.id);
    setEditConcepto(nota.concepto);
    setEditBloque(nota.bloque || "Varios");
  };

  const handleSaveEdit = (id: string) => {
    if (!editConcepto.trim()) return;
    updateNotaCertificacion(id, editConcepto.trim(), editBloque);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const BLOQUES_RAPIDOS = ["BL-11", "BL-7", "BL-8", "BL-5", "BL-13", "Patios Interiores", "Varios"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shadow-inner">
              <ClipboardList size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Notas de Certificación
                </h3>
                {pendientesCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {pendientesCount} {pendientesCount === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Anota remates y trabajos para que no se olvide nada al certificar.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario Añadir Nota */}
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Añadir Remate / Nota para Certificar
            </label>
            <input 
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Remate cajeados esquina oeste, 14h admin, etc..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Chips de Selección de Bloque */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[240px] sm:max-w-[300px]">
              {BLOQUES_RAPIDOS.map(bl => (
                <button
                  type="button"
                  key={bl}
                  onClick={() => setBloque(bl)}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase whitespace-nowrap transition-all ${
                    bloque === bl 
                      ? "bg-amber-500 text-white shadow-sm" 
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {bl}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!concepto.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-black text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} /> Guardar
            </button>
          </div>
        </form>

        {/* Filtros */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setFiltro("pendientes")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                filtro === "pendientes" 
                  ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Pendientes ({pendientesCount})
            </button>
            <button
              onClick={() => setFiltro("completadas")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                filtro === "completadas" 
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Incluidas ({completadasCount})
            </button>
            <button
              onClick={() => setFiltro("todas")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                filtro === "todas" 
                  ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Todas ({obraNotas.length})
            </button>
          </div>
        </div>

        {/* Lista de Notas */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[160px]">
          {notasFiltradas.length === 0 ? (
            <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <ClipboardList className="text-slate-300 dark:text-slate-600 mb-2" size={32} />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {filtro === "pendientes" ? "¡No tienes notas pendientes para certificar!" : "No hay notas en esta sección"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Utiliza el formulario de arriba para anotar remates, m² extras o acuerdos.
              </p>
            </div>
          ) : (
            notasFiltradas.map((nota) => (
              <motion.div
                key={nota.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`p-3 rounded-2xl border transition-all ${
                  editingId === nota.id 
                    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-md"
                    : nota.completado 
                    ? "bg-slate-50/70 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/50 text-slate-400" 
                    : "bg-white dark:bg-slate-800 border-amber-200/80 dark:border-amber-900/40 text-slate-800 dark:text-slate-100 shadow-sm"
                }`}
              >
                {editingId === nota.id ? (
                  /* Formulario de edición inline */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                        <Edit2 size={12} /> Editando Anotación
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={editConcepto}
                      onChange={(e) => setEditConcepto(e.target.value)}
                      placeholder="Concepto o trabajo pendiente..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Seleccionar bloque rápida */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[200px] sm:max-w-[250px]">
                        {BLOQUES_RAPIDOS.map(bl => (
                          <button
                            type="button"
                            key={bl}
                            onClick={() => setEditBloque(bl)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase whitespace-nowrap transition-all ${
                              editBloque === bl 
                                ? "bg-amber-500 text-white" 
                                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {bl}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(nota.id)}
                          className="bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black uppercase px-3 py-1 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check size={12} /> Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Vista normal con botón editar */
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleNotaCertificacion(nota.id)}
                      className="mt-0.5 transition-transform active:scale-90 cursor-pointer"
                      title={nota.completado ? "Marcar como pendiente" : "Marcar como incluido en certificación"}
                    >
                      {nota.completado ? (
                        <CheckCircle2 className="text-emerald-500 dark:text-emerald-400" size={20} />
                      ) : (
                        <Circle className="text-slate-300 dark:text-slate-600 hover:text-amber-500" size={20} />
                      )}
                    </button>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug break-words ${
                        nota.completado ? "line-through text-slate-400 dark:text-slate-500" : ""
                      }`}>
                        {nota.concepto}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold">
                        <span className="bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase">
                          <Tag size={9} /> {nota.bloque || "Varios"}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar size={9} /> {nota.fecha}
                        </span>
                        {nota.completado && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                            Incluido en certificación
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botones Acción: Editar y Borrar */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(nota)}
                        className="text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Editar esta nota"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteNotaCertificacion(nota.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar nota"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            Cerrar Ventana
          </button>
        </div>
      </motion.div>
    </div>
  );
};
