export const ITEMS_SATE: Record<string, { nombre: string, precio: number, descripcion: string }> = {
  fase1: {
    nombre: "Corcho + Tacos",
    descripcion: "Colocación del panel de corcho y fijación con tacos mecánicos.",
    precio: 8
  },
  fase2: {
    nombre: "Esquineros + Malla + Mortero",
    descripcion: "Refuerzo de aristas, malla y capa de mortero.",
    precio: 8
  },
  fase3: {
    nombre: "Pintura + Acrílico",
    descripcion: "Acabado final mediante pintura y revestimiento acrílico.",
    precio: 4
  },
  malla: {
    nombre: "Doble malla",
    descripcion: "Refuerzo adicional mediante doble malla.",
    precio: 2
  },
  anti: {
    nombre: "Antifisuras",
    descripcion: "Capa antifisuras para mayor durabilidad.",
    precio: 8
  },
  cajeado40: {
    nombre: "Cajeado 40%",
    descripcion: "Ejecución parcial del cajeado (40%).",
    precio: 8
  },
  cajeado80: {
    nombre: "Cajeado 80%",
    descripcion: "Ejecución parcial del cajeado (80%).",
    precio: 16
  },
  cajeado100: {
    nombre: "Cajeado 100%",
    descripcion: "Ejecución completa del cajeado (100%).",
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

export const OPERARIOS: { nombre: string, coste: number }[] = [
  { nombre: "Juan", coste: 120 },
  { nombre: "Mosquito", coste: 120 },
  { nombre: "Antonio", coste: 120 },
  { nombre: "David", coste: 70 },
  { nombre: "Jesules", coste: 80 }
];
