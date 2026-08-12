import React, { useState } from "react";
import { ChevronLeft, Calendar, ChevronDown, ChevronUp, FileText, Download, Share2, Plus, Image as ImageIcon, Check, Pencil, Trash2, Eye, Upload } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Certificacion, Avance } from "../types";
import { formatAmount, formatDate } from "../lib/utils";
import { shareService } from "../services/shareService";
import { DocumentoOficialModal } from "../components/DocumentoOficialModal";
import { NuevaCertificacionModal } from "../components/NuevaCertificacionModal";

export const HistorialCertificacionesScreen: React.FC<{ onBack: () => void, onEdit: (id: string) => void }> = ({ onBack, onEdit }) => {
  const { certificaciones, selectedObraId, obras, avances, itemsSate, setCertificaciones, notify } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Certificacion | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const obra = obras.find(o => o.id === selectedObraId);

  const obraCerts = (certificaciones || [])
    .filter(c => c.obraId === selectedObraId)
    .sort((a, b) => (b.fechaFin || "").localeCompare(a.fechaFin || ""));

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      const next = certificaciones.filter(c => c.id !== id);
      setCertificaciones(next);
      notify("Cierre eliminado con éxito", "success");
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      notify("Pulsa de nuevo para confirmar el borrado", "info");
    }
  };

  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(id);
  };

  const handleShare = (c: Certificacion) => {
    if (!obra) return;
    const text = shareService.formatCertificacionForWhatsApp(c, obra);
    shareService.shareViaWhatsApp(text);
  };

  const handlePDF = (c: Certificacion) => {
    if (!obra) return;
    shareService.generateCertificacionPDF(c, obra, [], itemsSate);
  };

  const handleSaveNewCert = (newCert: Certificacion) => {
    setCertificaciones([newCert, ...certificaciones]);
    setShowAddModal(false);
    notify("Certificación guardada con éxito", "success");
  };

  const handleAttachPdf = (certId: string, pdfData: string, pdfName: string, pdfSize: string) => {
    setCertificaciones(prev => prev.map(c => {
      if (c.id === certId) {
        return { ...c, pdfData, pdfName, pdfSize };
      }
      return c;
    }));
    if (viewingDoc && viewingDoc.id === certId) {
      setViewingDoc(prev => prev ? { ...prev, pdfData, pdfName, pdfSize } : null);
    }
    notify("Documento PDF adjuntado a la certificación", "success");
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm cursor-pointer">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Historial Cierres</h2>
        <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600">
          <Calendar size={20} />
        </div>
      </header>

      {/* BOTÓN PRINCIPAL AÑADIR CERTIFICACIÓN */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-3xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
      >
        <Plus size={18} />
        <span>Añadir Nueva Certificación (PDF)</span>
      </button>

      <section className="space-y-4">
        {obraCerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <FileText size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase text-xs">No hay cierres guardados todavía</p>
          </div>
        ) : (
          obraCerts.map(c => {
            const isExpanded = expandedId === c.id;
            const certAvances = (avances || []).filter(a => c.avanceIds?.includes(a.id));
            const totalFotos = certAvances.reduce((sum, a) => sum + (a.fotos?.length || 0), 0);
            const tituloCert = c.numeroCertificacion || `Cierre ${c.mes}`;

            return (
              <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="w-full p-6 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-500 p-3 rounded-2xl text-slate-950 font-black">
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase leading-none mb-0.5">
                          {tituloCert}
                        </p>
                        {c.pdfData && (
                          <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                            PDF Adjunto
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white uppercase mt-1">
                        {c.fechaEmision ? formatDate(c.fechaEmision) : (c.fechaFin ? formatDate(c.fechaFin) : "")}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        ID: {c.identificador || c.id.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Saldo Neto</p>
                      <p className="text-lg font-black text-amber-600">{formatAmount(c.certificado)}€</p>
                      <p className={`text-[8px] font-black uppercase ${c.estado === 'cobrado' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {c.estado === 'cobrado' ? 'COBRADA Y LIQUIDADA' : 'PENDIENTE'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={(e) => handleEdit(c.id, e)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(c.id, e)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          confirmDeleteId === c.id 
                          ? "bg-rose-600 text-white animate-pulse" 
                          : "bg-rose-50 dark:bg-rose-900/20 text-rose-400 hover:text-rose-600"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                    
                    {/* ACCIÓN PRINCIPAL VER DOCUMENTO PDF OFICIAL */}
                    <button
                      onClick={() => setViewingDoc(c)}
                      className="w-full p-4 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
                    >
                      <Eye size={18} />
                      <span>Ver Documento PDF Oficial</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleShare(c)} className="flex items-center justify-center gap-2 p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-md shadow-emerald-500/10 transition-all active:scale-95 cursor-pointer">
                        <Share2 size={16} /> WhatsApp
                      </button>
                      <button onClick={() => handlePDF(c)} className="flex items-center justify-center gap-2 p-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-md shadow-slate-500/10 transition-all active:scale-95 cursor-pointer">
                        <FileText size={16} /> Exportar PDF
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Producción Certificada</label>
                        <div className="space-y-4">
                          {Object.entries((c.partidas || []).reduce((acc, it) => {
                            const b = it.bloque || "Sin Bloque";
                            if (!acc[b]) acc[b] = [];
                            acc[b].push(it);
                            return acc;
                          }, {} as Record<string, any[]>)).map(([bloque, items]) => (
                            <div key={bloque} className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800/50">
                              <h5 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-3 px-1">{bloque}</h5>
                              <div className="space-y-2">
                                {(items as any[]).map((it: any, itIdx: number) => (
                                  <div key={itIdx} className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{it.nombre}</span>
                                      <span className="text-[8px] font-medium text-slate-400 uppercase">{formatAmount(it.precio || 0)}€/unidad</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-800 dark:text-white">{formatAmount(it.m2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {totalFotos > 0 && (
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Fotos del Periodo ({totalFotos})</label>
                          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {certAvances.map(a => (a.fotos || []).map((f, fIdx) => (
                              <div key={`${a.id}-${fIdx}`} className="min-w-[100px] h-[100px] rounded-2xl overflow-hidden shadow-sm">
                                <img src={f} alt="obra" className="w-full h-full object-cover" />
                              </div>
                            )))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Liquidación Económica</label>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                             <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Bruto</p>
                                <p className="text-sm font-black text-slate-800 dark:text-white">{formatAmount(c.ejecutado)}€</p>
                             </div>
                             <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                                <p className="text-[8px] font-black text-rose-600 uppercase mb-1">Pagos a Cuenta</p>
                                <p className="text-sm font-black text-rose-600">{c.anticipos > 0 ? "-" : ""}{formatAmount(c.anticipos)}€</p>
                             </div>
                          </div>
                          
                          <div className="p-5 bg-amber-500 text-slate-950 rounded-[2rem] shadow-lg shadow-amber-500/20">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[9px] font-black uppercase opacity-80 mb-0.5">Saldo Neto Pendiente</p>
                                <p className="text-xl font-black">{formatAmount(c.ejecutado - c.anticipos)}€</p>
                              </div>
                              <div className="bg-slate-950/10 p-2.5 rounded-2xl">
                                <Check size={20} className="text-slate-950" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* MODAL VER DOCUMENTO OFICIAL PDF */}
      {viewingDoc && (
        <DocumentoOficialModal
          certificacion={viewingDoc}
          obra={obra}
          onClose={() => setViewingDoc(null)}
          onAttachPdf={(pdfData, pdfName, pdfSize) => handleAttachPdf(viewingDoc.id, pdfData, pdfName, pdfSize)}
        />
      )}

      {/* MODAL AÑADIR NUEVA CERTIFICACIÓN PDF */}
      {showAddModal && (
        <NuevaCertificacionModal
          obra={obra}
          onSave={handleSaveNewCert}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

