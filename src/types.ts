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
  produccion: Produccion[];
  resumen: Resumen;
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

export interface Certificacion {
  id: string;
  obraId: string;
  mes: string; // YYYY-MM
  fechaInicio?: string;
  fechaFin?: string;
  ejecutado: number;
  anticipos: number;
  incentivoExtra?: number;
  certificado: number;
  estado: "pendiente" | "cobrado";
  fechaCobro?: string;
  avanceIds?: string[];
  items?: { itemId: string, nombre: string, precio: number, m2: number, bloque?: string }[];
  anticiposDetalle?: { operario: string, cantidad: number, fecha: string }[];
}
