export const TARIFAS = {};

export const ITEMS_SATE: Record<string, { nombre: string, precio: number }> = {
  fase1: { nombre: "SATE Combinado (Corcho + Fino)", precio: 20.20 },
  fase2: { nombre: "Esquineros + Malla + Fino", precio: 8 },
  anti: { nombre: "Anti-fisuras (ml)", precio: 8 },
  cajeado: { nombre: "Cajeados (m)", precio: 16 },
  malla: { nombre: "Doble Malla", precio: 3 },
};

// Medidas reales por bloque (Basado en Escandallo Maestro)
export const BLOQUE_DIMENSIONS: Record<string, Record<string, number>> = {
  "DEFAULT": {
    fase1: 634.77,
    fase2: 634.77,
    anti: 145,
    cajeado: 33.04,
    malla: 136
  },
  "11": {
    fase1: 634.77,
    fase2: 634.77,
    anti: 145,
    cajeado: 33.04,
    malla: 136
  },
  "6": {
    fase1: 519.46, // 357.62 + 161.84
    fase2: 161.84,
    anti: 145,
    cajeado: 33.04,
    malla: 136
  },
  "13": {
    fase1: 634.77,
    fase2: 634.77,
    anti: 109,
    cajeado: 25,
    malla: 101.29 // 50.57 + 50.72
  },
  "5": {
    fase1: 324.84,
    fase2: 324.84,
    anti: 145,
    cajeado: 33.04,
    malla: 118.92
  }
};

// Rendimientos: Días previstos para completar cada partida de un bloque maestro
export const RENDIMIENTOS_EQUIPO: Record<string, number> = {
  fase1: 8,      // Corcho + Tacos
  fase2: 8,      // Esquineros + Malla + Fino
  anti: 3,       // Antifisuras
  malla: 1,      // Doble Malla
  cajeado: 2     // Cajeados
};

export const OPERARIOS = [
  { nombre: "Juan", coste: 120 },
  { nombre: "Mosquito", coste: 120 },
  { nombre: "Antonio", coste: 120 },
  { nombre: "Jesules", coste: 80 },
  { nombre: "David", coste: 70 },
]; // Total: 510€/día
