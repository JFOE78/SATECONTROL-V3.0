export const ITEMS_SATE: Record<string, { nombre: string, precio: number, descripcion: string }> = {
  fase1: {
    nombre: "Corcho + Tacos",
    descripcion: "Colocación del panel de corcho y fijación con tacos mecánicos.",
    precio: 0
  },
  fase2: {
    nombre: "Esquineros + Malla + Mortero",
    descripcion: "Refuerzo de aristas, malla y capa de mortero.",
    precio: 0
  },
  fase3: {
    nombre: "Pintura + Acrílico",
    descripcion: "Acabado final mediante pintura y revestimiento acrílico.",
    precio: 0
  },
  malla: {
    nombre: "Doble malla",
    descripcion: "Refuerzo adicional mediante doble malla.",
    precio: 0
  },
  anti: {
    nombre: "Antifisuras",
    descripcion: "Capa antifisuras para mayor durabilidad.",
    precio: 0
  },
  cajeado40: {
    nombre: "Cajeado 40%",
    descripcion: "Ejecución parcial del cajeado (40%).",
    precio: 0
  },
  cajeado80: {
    nombre: "Cajeado 80%",
    descripcion: "Ejecución parcial del cajeado (80%).",
    precio: 0
  },
  cajeado100: {
    nombre: "Cajeado 100%",
    descripcion: "Ejecución completa del cajeado (100%).",
    precio: 0
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

export const OPERARIOS: { nombre: string, coste: number }[] = [];
