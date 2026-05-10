export const TARIFAS = {};

export const ITEMS_SATE: Record<string, { nombre: string, precio: number }> = {
  fase1: { nombre: "Corcho + Tacos", precio: 8 },
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
  }
};

// Rendimientos: Días previstos por EQUIPO para completar cada partida de un bloque maestro
export const RENDIMIENTOS_EQUIPO: Record<string, number> = {
  fase1: 8,      // Corcho + Tacos (Equipo A) -> 12.5% diario
  fase2: 8,      // Esquineros + Malla + Fino (Equipo B) -> 12.5% diario
  anti: 3,       // Antifisuras (Equipo B) -> 33.3% diario
  malla: 1,      // Doble Malla (Equipo B) -> 100% diario
  cajeado: 2     // Cajeados (Equipo B) -> 50% diario
};

export const EQUIPOS = {
  A: ["Mosquito", "David"],
  B: ["Juan", "Antonio", "Jesules"]
};

export const OPERARIOS = [
  { nombre: "Juan", coste: 120 },
  { nombre: "Mosquito", coste: 120 },
  { nombre: "Antonio", coste: 120 },
  { nombre: "Jesules", coste: 80 },
  { nombre: "David", coste: 70 },
]; // Total: 510€/día
