export interface Obra {
  id: string;
  nombre: string;
  numBloques: number;
}

export interface Produccion {
  itemId: string;
  m2: number;
  bloque: string;
}

export interface Resumen {
  ingresos: number;
  costeManoObra: number;
  beneficio: number;
  beneficioPorOperario: number;
}

export interface Avance {
  id: string;
  fecha: string; // ISO string
  obraId: string;
  bloque: string;
  operariosPresentes: string[];
  operariosVacaciones?: string[];
  produccion: Produccion[];
  resumen: Resumen;
  fotos?: string[];
  clima?: string;
  motivoSinProduccion?: string;
}

export interface Vacacion {
  id: string;
  operario: string;
  fecha: string; // YYYY-MM-DD
  tipo: "Disfrutados y Pagados";
}

export interface Anticipo {
  id: string;
  fecha: string; // ISO string (usually a Friday)
  obraId: string;
  operario: string;
  cantidad: number;
}

export interface Gasto {
  id: string;
  fecha: string;
  obraId: string;
  concepto: string;
  monto: number;
  pagadoPor?: string; // Nombre del operario si procede
}

export interface NotaCertificacion {
  id: string;
  obraId: string;
  fecha: string; // YYYY-MM-DD
  bloque?: string;
  concepto: string;
  completado?: boolean;
  certificacionId?: string;
}

export interface Certificacion {
  id: string;
  obraId: string;
  mes: string; // YYYY-MM
  numeroCertificacion?: string; // Ej: "PRIMERA CERTIFICACIÓN", "CUARTA CERTIFICACIÓN"
  identificador?: string; // Ej: "2026-01", "2026-06"
  fechaEmision?: string; // YYYY-MM-DD
  fechaInicio?: string;
  fechaFin?: string;
  ejecutado: number;
  anticipos: number;
  incentivoExtra?: number;
  certificado: number;
  estado: "pendiente" | "cobrado";
  fechaCobro?: string;
  avanceIds?: string[];
  partidas?: { itemId: string, nombre: string, precio: number, m2: number, bloque?: string }[];
  anticiposDetalle?: { operario: string, cantidad: number, fecha: string }[];
  pdfData?: string; // Base64 / Data URL del archivo PDF cargado
  pdfName?: string; // Nombre del archivo PDF
  pdfSize?: string; // Tamaño formateado del PDF
}
