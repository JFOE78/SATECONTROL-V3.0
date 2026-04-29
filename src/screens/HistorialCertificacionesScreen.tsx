import React, { useState } from "react";
import { ChevronLeft, Calendar, ChevronDown, ChevronUp, FileText, Download, Share2, Plus, Image as ImageIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Certificacion, Avance } from "../types";
import { formatAmount, formatDate } from "../lib/utils";
import { shareService } from "../services/shareService";

export const HistorialCertificacionesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { certificaciones, selectedObraId, obras, avances, itemsSate } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const obra = obras.find(o => o.id === selectedObraId);

  const obraCerts = (certificaciones || [])
    .filter(c => c.obraId === selectedObraId)
    .sort((a, b) => (b.fechaFin || "").localeCompare(a.fechaFin || ""));

  const handleShare = (c: Certificacion) => {
    const text = shareService.formatCertificacionForWhatsApp(c, obra!, { items: [] }, itemsSate);
    shareService.shareViaWhatsApp(text);
  };

  const handlePDF = (c: Certificacion) => {
    if (!obra) return;
    const fakeAnticipos = (c.anticiposDetalle || []).map(an => ({
      id: "fake",
      obraId: selectedObraId,
      ...an
    })) as any;
    shareService.generateCertificacionPDF(c, obra, fakeAnticipos, { items: [] }, itemsSate);
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 active:scale-90 transition-transform shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase text-slate-800 dark:text-white">Historial</h2>
        <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600">
          <Calendar size={24} />
        </div>
      </header>

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

            return (
              <div key={c.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="w-full p-6 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl text-white">
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase">Cierre {c.mes}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {formatDate(c.fechaInicio!)} - {formatDate(c.fechaFin!)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-600">{formatAmount(c.certificado)}€</p>
                      <p className={`text-[8px] font-black uppercase ${c.estado === 'cobrado' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {c.estado}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleShare(c)} className="flex items-center justify-center gap-2 p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase">
                        <Share2 size={16} /> WhatsApp
                      </button>
                      <button onClick={() => handlePDF(c)} className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase">
                        <Download size={16} /> Descargar PDF
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Producción Certificada</label>
                        <div className="space-y-2">
                          {(c.items || []).map(it => (
                            <div key={it.itemId} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">{it.nombre}</span>
                              <span className="text-xs font-black text-slate-800 dark:text-white">{formatAmount(it.m2)} m²</span>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Resumen Económico</label>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Bruto</p>
                              <p className="text-sm font-black text-slate-800 dark:text-white">{formatAmount(c.ejecutado)}€</p>
                           </div>
                           <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Anticipos</p>
                              <p className="text-sm font-black text-red-500">-{formatAmount(c.anticipos)}€</p>
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
    </div>
  );
};
