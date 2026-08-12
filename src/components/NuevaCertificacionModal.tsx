import React, { useState } from "react";
import { X, Upload, FileText, Check, Plus, Trash2, Calendar, ShieldCheck } from "lucide-react";
import { Certificacion, Obra } from "../types";
import { formatAmount } from "../lib/utils";

interface Props {
  obra: Obra | undefined;
  onSave: (cert: Certificacion) => void;
  onClose: () => void;
}

export const NuevaCertificacionModal: React.FC<Props> = ({ obra, onSave, onClose }) => {
  const [numeroCert, setNumeroCert] = useState("SEXTA CERTIFICACIÓN");
  const [identificador, setIdentificador] = useState("2026-08");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);
  const [fechaInicio, setFechaInicio] = useState("2026-08-05");
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [ejecutado, setEjecutado] = useState<number | "">(20000);
  const [anticipos, setAnticipos] = useState<number | "">(8000);
  const [estado, setEstado] = useState<"pendiente" | "cobrado">("pendiente");

  // PDF File upload state
  const [pdfData, setPdfData] = useState<string | undefined>(undefined);
  const [pdfName, setPdfName] = useState<string | undefined>(undefined);
  const [pdfSize, setPdfSize] = useState<string | undefined>(undefined);

  // Dynamic partidas
  const [partidas, setPartidas] = useState<{ bloque: string; nombre: string; m2: number; precio: number }[]>([
    { bloque: "BL-8", nombre: "Corcho + Malla", m2: 500, precio: 17 }
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const sizeFormatted = (file.size / 1024 / 1024).toFixed(2) + " MB";
        setPdfData(base64);
        setPdfName(file.name);
        setPdfSize(sizeFormatted);
      };
      reader.readAsDataURL(file);
    }
  };

  const addPartida = () => {
    setPartidas(prev => [...prev, { bloque: "BL-12", nombre: "Corcho + Mortero", m2: 100, precio: 16 }]);
  };

  const removePartida = (index: number) => {
    setPartidas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePartidaChange = (index: number, field: string, val: any) => {
    setPartidas(prev => prev.map((p, idx) => idx === index ? { ...p, [field]: val } : p));
  };

  const grossTotal = typeof ejecutado === "number" ? ejecutado : 0;
  const advanceTotal = typeof anticipos === "number" ? anticipos : 0;
  const netPending = grossTotal - advanceTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obra) return;

    const newCert: Certificacion = {
      id: crypto.randomUUID(),
      obraId: obra.id,
      mes: fechaFin.substring(0, 7),
      numeroCertificacion: numeroCert.trim() || "CERTIFICACIÓN DE OBRA",
      identificador: identificador.trim() || `2026-${Math.floor(Math.random() * 90 + 10)}`,
      fechaEmision,
      fechaInicio,
      fechaFin,
      ejecutado: grossTotal,
      anticipos: advanceTotal,
      certificado: netPending,
      estado,
      pdfData,
      pdfName,
      pdfSize,
      partidas: partidas.map((p, idx) => ({
        itemId: `custom_${idx}_${Date.now()}`,
        nombre: p.nombre,
        m2: Number(p.m2) || 0,
        precio: Number(p.precio) || 0,
        bloque: p.bloque
      }))
    };

    onSave(newCert);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full">
              Documentación Oficial
            </span>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter pt-1">
              Añadir Certificación (PDF)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-2xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* UPLOAD PDF CARD */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
            {pdfData ? (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black truncate max-w-[200px]">{pdfName}</p>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{pdfSize}</p>
                  </div>
                </div>
                <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                  Cambiar
                  <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">
                    Cargar Documento PDF Certificación
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    Arrastra o selecciona el archivo PDF firmado enviado a obra
                  </p>
                </div>
                <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* CAMPOS CLAVE DE IDENTIFICACIÓN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">
                Número / Título Certificación
              </label>
              <input
                type="text"
                value={numeroCert}
                onChange={e => setNumeroCert(e.target.value)}
                placeholder="Ej: SEXTA CERTIFICACIÓN"
                className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-xs font-black outline-none border border-slate-200 dark:border-slate-700 focus:border-amber-500 uppercase"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">
                Identificador Oficial
              </label>
              <input
                type="text"
                value={identificador}
                onChange={e => setIdentificador(e.target.value)}
                placeholder="Ej: 2026-08"
                className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl text-xs font-black outline-none border border-slate-200 dark:border-slate-700 focus:border-amber-500 uppercase"
                required
              />
            </div>
          </div>

          {/* FECHAS */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">
                Emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={e => setFechaEmision(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-[11px] font-black outline-none border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">
                Periodo Desde
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-[11px] font-black outline-none border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-[11px] font-black outline-none border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* LIQUIDACIÓN ECONÓMICA */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              Liquidación Económica
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">
                  Producción Bruta (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ejecutado}
                  onChange={e => setEjecutado(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-sm font-black outline-none border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-rose-500 uppercase block mb-1">
                  Anticipos / Entregas (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={anticipos}
                  onChange={e => setAnticipos(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-sm font-black text-rose-600 outline-none border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30">
              <span className="text-xs font-black text-amber-600 uppercase">Saldo Neto Pendiente:</span>
              <span className="text-lg font-black text-amber-600">{formatAmount(netPending)} €</span>
            </div>
          </div>

          {/* PARTIDAS POR BLOQUE */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Desglose por Bloques (Opcional)
              </label>
              <button
                type="button"
                onClick={addPartida}
                className="text-[10px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1 uppercase hover:underline"
              >
                <Plus size={12} /> Añadir Línea
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {partidas.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                  <input
                    type="text"
                    placeholder="Bloque"
                    value={p.bloque}
                    onChange={e => handlePartidaChange(idx, "bloque", e.target.value)}
                    className="w-20 bg-white dark:bg-slate-900 p-2 rounded-xl font-bold uppercase border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Partida / Concepto"
                    value={p.nombre}
                    onChange={e => handlePartidaChange(idx, "nombre", e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="number"
                    placeholder="Medición"
                    value={p.m2}
                    onChange={e => handlePartidaChange(idx, "m2", Number(e.target.value))}
                    className="w-16 bg-white dark:bg-slate-900 p-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-right"
                  />
                  <input
                    type="number"
                    placeholder="€/U"
                    value={p.precio}
                    onChange={e => handlePartidaChange(idx, "precio", Number(e.target.value))}
                    className="w-14 bg-white dark:bg-slate-900 p-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removePartida(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={16} /> Guardar Certificación
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
