import React, { useState } from "react";
import { X, Download, FileText, Printer, Eye, Share2, Upload } from "lucide-react";
import { Certificacion, Obra } from "../types";
import { formatAmount, formatDate } from "../lib/utils";

interface Props {
  certificacion: Certificacion;
  obra: Obra | undefined;
  onClose: () => void;
  onAttachPdf?: (pdfData: string, pdfName: string, pdfSize: string) => void;
}

export const DocumentoOficialModal: React.FC<Props> = ({ certificacion, obra, onClose, onAttachPdf }) => {
  const [activeTab, setActiveTab] = useState<"documento" | "pdf">("documento");

  const c = certificacion;
  const numCert = c.numeroCertificacion || `CERTIFICACIÓN DE OBRA`;
  const subTitle = c.numeroCertificacion ? `${c.numeroCertificacion} (LIQUIDACIÓN MENSUAL)` : `LIQUIDACIÓN MENSUAL (${c.mes})`;
  const fechaEmision = c.fechaEmision ? formatDate(c.fechaEmision) : (c.fechaFin ? formatDate(c.fechaFin) : "");
  const identificador = c.identificador || `2026-${c.id.slice(-2)}`;

  // Group items by bloque
  const itemsByBloque: Record<string, NonNullable<Certificacion["partidas"]>[number][]> = {};
  (c.partidas || []).forEach(item => {
    const b = item.bloque || "GENERAL";
    if (!itemsByBloque[b]) itemsByBloque[b] = [];
    itemsByBloque[b].push(item);
  });

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachPdf) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const sizeFormatted = (file.size / 1024 / 1024).toFixed(2) + " MB";
        onAttachPdf(base64, file.name, sizeFormatted);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] my-auto">
        
        {/* BARRA SUPERIOR DE ACCIONES */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-white">{numCert}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{obra?.nombre || 'Parque Alcosa'} • ID: {identificador}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {c.pdfData && (
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab("documento")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    activeTab === "documento" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye size={12} /> Hoja Oficial
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pdf")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    activeTab === "pdf" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText size={12} /> PDF Cargar
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
            >
              <Printer size={14} /> Imprimir
            </button>

            {c.pdfData && (
              <a
                href={c.pdfData}
                download={c.pdfName || `Certificacion_${identificador}.pdf`}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
              >
                <Download size={14} /> PDF
              </a>
            )}

            {onAttachPdf && (
              <label className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer">
                <Upload size={14} />
                <span className="hidden sm:inline">{c.pdfData ? "Cambiar PDF" : "Adjuntar PDF"}</span>
                <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL DOCUMENTO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950">
          
          {activeTab === "pdf" && c.pdfData ? (
            <div className="w-full h-[75vh] bg-white rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
              <iframe
                src={c.pdfData}
                title={`PDF ${numCert}`}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            /* HOJA TIPO DOCUMENTO PDF OFICIAL */
            <div className="max-w-3xl mx-auto bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 space-y-8 font-sans text-xs">
              
              {/* CABECERA DOCUMENTO */}
              <div className="border-b-2 border-amber-500/80 pb-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                      CERTIFICACIÓN DE OBRA
                    </h1>
                    <p className="text-amber-600 font-extrabold uppercase text-xs sm:text-sm tracking-wide mt-1">
                      {subTitle}
                    </p>
                  </div>

                  <div className="text-right text-[11px] space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[170px]">
                    <p className="font-medium text-slate-600">
                      <strong className="text-slate-800">Fecha de Emisión:</strong> {fechaEmision || "04/08/2026"}
                    </p>
                    <p className="font-medium text-slate-600">
                      <strong className="text-slate-800">Obra:</strong> {obra?.nombre || "Parque Alcosa"}
                    </p>
                    <p className="font-medium text-slate-600">
                      <strong className="text-slate-800">Identificador:</strong> {identificador}
                    </p>
                  </div>
                </div>
              </div>

              {/* DETALLE DE EJECUCIÓN POR BLOQUES */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                  DETALLE DE EJECUCIÓN POR BLOQUES
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 w-28">BLOQUE</th>
                        <th className="py-2.5 px-3">PARTIDA / CONCEPTO</th>
                        <th className="py-2.5 px-3 text-right">RENDIMIENTO / MEDICIÓN</th>
                        <th className="py-2.5 px-3 text-right">PRECIO UN.</th>
                        <th className="py-2.5 px-3 text-right">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(itemsByBloque).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 uppercase font-bold">
                            Sin desglose de partidas registrado
                          </td>
                        </tr>
                      ) : (
                        Object.entries(itemsByBloque).map(([bloque, items]) => {
                          const subtotalBloque = items?.reduce((sum, it) => sum + ((it.m2 || 0) * (it.precio || 0)), 0) || 0;

                          return (
                            <React.Fragment key={bloque}>
                              {items?.map((it, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  {idx === 0 ? (
                                    <td rowSpan={items.length} className="py-3 px-3 font-black text-slate-800 uppercase align-top border-r border-slate-100 bg-slate-50/50">
                                      {bloque}
                                    </td>
                                  ) : null}
                                  <td className="py-2.5 px-3 font-medium text-slate-700">
                                    {it.nombre}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                    {formatAmount(it.m2)} {it.nombre.toLowerCase().includes(' anti') || it.nombre.toLowerCase().includes('cajead') || it.nombre.toLowerCase().includes('techos') || it.nombre.toLowerCase().includes('cornisa') || it.nombre.toLowerCase().includes('horas') ? 'ml' : 'm²'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                                    {formatAmount(it.precio)} €
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                    {formatAmount(it.m2 * it.precio)} €
                                  </td>
                                </tr>
                              ))}
                              {items && items.length > 1 && (
                                <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                                  <td colSpan={4} className="py-1.5 px-3 text-right text-[10px] text-slate-500 uppercase">
                                    Subtotal {bloque}:
                                  </td>
                                  <td className="py-1.5 px-3 text-right text-slate-800">
                                    {formatAmount(subtotalBloque)} €
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LIQUIDACIÓN ECONÓMICA FINAL */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  LIQUIDACIÓN ECONÓMICA FINAL
                </h4>

                <div className="space-y-2 pt-1 border-t border-slate-200 text-[11px]">
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-slate-700">Total Producción Bruta:</span>
                    <span className="font-black text-slate-900 text-sm">{formatAmount(c.ejecutado)} €</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-rose-700">Total Anticipos / Entregas a Cuenta:</span>
                    <span className="font-black text-rose-600 text-sm">
                      {c.anticipos > 0 ? "-" : ""}{formatAmount(c.anticipos)} €
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t-2 border-amber-500/80 text-amber-700">
                    <span className="font-black uppercase text-xs tracking-wider">SALDO NETO PENDIENTE:</span>
                    <span className="font-black text-lg sm:text-xl text-amber-600">
                      {formatAmount(c.certificado)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* FIRMAS Y PIE */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500 uppercase font-bold">
                <div className="pt-8 border-t border-slate-300">
                  RECIBIDO / CONFORME
                </div>
                <div className="pt-8 border-t border-slate-300">
                  DIRECCIÓN FACULTATIVA
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
