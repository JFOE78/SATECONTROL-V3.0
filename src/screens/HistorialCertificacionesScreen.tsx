import React, { useState } from "react";
import { ChevronLeft, Calendar, ChevronDown, ChevronUp, FileText, Download, Share2, Plus, Image as ImageIcon, Check } from "lucide-react";
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
    if (!obra) return;
    const text = shareService.formatCertificacionForWhatsApp(c, obra);
    shareService.shareViaWhatsApp(text);
  };

  const handlePDF = (c: Certificacion) => {
    if (!obra) return;
    shareService.generateCertificacionPDF(c, obra, [], itemsSate);
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
                      <button onClick={() => handleShare(c)} className="flex items-center justify-center gap-2 p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-md shadow-emerald-500/10 transition-all active:scale-95">
                        <Share2 size={16} /> WhatsApp
                      </button>
                      <button onClick={() => handlePDF(c)} className="flex items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-md shadow-slate-500/10 transition-all active:scale-95">
                        <FileText size={16} /> Generar PDF
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
                              <h5 className="text-[10px] font-black text-blue-600 uppercase mb-3 px-1">Bloque {bloque}</h5>
                              <div className="space-y-2">
                                {(items as any[]).map((it: any, itIdx: number) => (
                                  <div key={itIdx} className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{it.nombre}</span>
                                      <span className="text-[8px] font-medium text-slate-400 uppercase">{formatAmount(it.precio || 0)}€/m²</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-800 dark:text-white">{formatAmount(it.m2)} m²</span>
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
                                <p className="text-sm font-black text-rose-600">-{formatAmount(c.anticipos)}€</p>
                             </div>
                          </div>
                          
                          <div className="p-5 bg-emerald-500 rounded-[2rem] shadow-lg shadow-emerald-500/20">
                            <div className="flex justify-between items-center text-white">
                              <div>
                                <p className="text-[9px] font-black uppercase opacity-80 mb-0.5">Saldo Pendiente de Cobro</p>
                                <p className="text-xl font-black">{formatAmount(c.ejecutado - c.anticipos)}€</p>
                              </div>
                              <div className="bg-white/20 p-2.5 rounded-2xl">
                                <Check size={20} className="text-white" />
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
    </div>
  );
};
