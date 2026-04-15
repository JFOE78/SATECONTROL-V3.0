export const ITEMS_SATE: Record<string, { nombre: string, precio: number, descripcion: string }> = {
  fase1: {
    nombre: "Corcho + Tacos",
    descripcion: "Colocación del panel de corcho y fijación con tacos mecánicos. Es la base del sistema SATE.",
    precio: 8
  },
  fase2: {
    nombre: "Esquineros + Malla + Mortero",
    descripcion: "Refuerzo de aristas con esquineros, aplicación de malla y capa de mortero para consolidar el sistema.",
    precio: 8
  },
  fase3: {
    nombre: "Pintura + Acrílico",
    descripcion: "Acabado final del sistema SATE mediante pintura y revestimiento acrílico.",
    precio: 4
  },
  malla: {
    nombre: "Doble malla antibandálica",
    descripcion: "Refuerzo adicional mediante doble malla para aumentar la resistencia del sistema.",
    precio: 2.66
  },
  anti: {
    nombre: "Antifisuras",
    descripcion: "Aplicación de capa antifisuras para evitar grietas y mejorar la durabilidad del acabado.",
    precio: 8
  },
  cajeado40: {
    nombre: "Cajeado 40%",
    descripcion: "Ejecución parcial del cajeado equivalente al 40% de la superficie.",
    precio: 8
  },
  cajeado80: {
    nombre: "Cajeado 80%",
    descripcion: "Ejecución parcial del cajeado equivalente al 80% de la superficie.",
    precio: 16
  },
  cajeado100: {
    nombre: "Cajeado 100%",
    descripcion: "Ejecución completa del cajeado en toda la superficie.",
    precio: 20
  }
};

export const TARIFAS = {
  FASE_1: ITEMS_SATE.fase1.precio,
  FASE_2: ITEMS_SATE.fase2.precio,
  FASE_3: ITEMS_SATE.fase3.precio,
  DOBLE_MALLA: ITEMS_SATE.malla.precio,
  ANTIFISURAS: ITEMS_SATE.anti.precio,
  CAJEADO: {
    "0": 0,
    "40": ITEMS_SATE.cajeado40.precio,
    "80": ITEMS_SATE.cajeado80.precio,
    "100": ITEMS_SATE.cajeado100.precio,
  },
};

export const OPERARIOS = [
  { nombre: "Juan", coste: 120 },
  { nombre: "Mosquito", coste: 120 },
  { nombre: "Antonio", coste: 120 },
  { nombre: "Jesules", coste: 80 },
  { nombre: "David", coste: 70 },
];
