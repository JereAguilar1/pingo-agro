// 🧮 Sub-Agente de Cálculo (CalcSubAgent):
// Ejecuta fórmulas matemáticas y agronómicas exactas (sin alucinación del LLM)
// combinando los números de la consulta y del formulario dinámico acumulado.

import {
  CalculationOutput,
  doseToProduct,
  maizeHarvestLossesCalc,
  maizeNitrogenBalance,
  maizeSeedingRate,
  nitrogenContent,
} from "../calculations";

export interface CalcSubAgentOutput {
  calculation?: CalculationOutput;
  summaryText?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

export function runCalcSubAgent(params: {
  query: string;
  context?: Record<string, string>;
}): CalcSubAgentOutput {
  const { query, context = {} } = params;
  const qQuery = normalize(query);

  // 1. Dosis de N/ha -> Producto necesario para X hectáreas
  const doseMatch = qQuery.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:de\s*)?n\s*(?:\/|\s*por\s*)\s*ha/);
  const percentMatch = qQuery.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const haMatch = qQuery.match(/(\d+(?:[.,]\d+)?)\s*(?:ha|hectareas?)\b/);

  if (doseMatch && percentMatch && haMatch) {
    const calc = doseToProduct(
      parseNumber(doseMatch[1]),
      parseNumber(percentMatch[1]),
      parseNumber(haMatch[1])
    );
    return { calculation: calc, summaryText: calc.resultSummary };
  }

  // 2. Contenido de N en X kg de fertilizante/urea
  const kgMatch = qQuery.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  const asksContent = /cuanto\s+nitrogeno|contenido\s+de\s+nitrogeno|kg\s+de\s+n\b|aporte\s+de\s+n/.test(qQuery);
  if (kgMatch && percentMatch && (asksContent || /urea|fertilizante/.test(qQuery))) {
    const calc = nitrogenContent(parseNumber(kgMatch[1]), parseNumber(percentMatch[1]));
    return { calculation: calc, summaryText: calc.resultSummary };
  }

  // 3. Balance de Nitrógeno en Maíz a partir de contexto dinámico (rindeObjetivo + nSuelo)
  // Solo se activa si la consulta pide fertilización, nitrógeno, urea, balance o dosis
  const asksFertCalc = /\b(fertiliz|nitrogeno|urea|balance|dosis|nutricion|fosforo|arrancador|rinde)\b/.test(qQuery);
  const rindeRaw = context.rindeObjetivo || context.targetYield;
  const nSueloRaw = context.nSuelo || context.analisisSuelo;
  if (asksFertCalc && rindeRaw && nSueloRaw) {
    const rindeNum = parseNumber(rindeRaw.replace(/[^\d.,]/g, ""));
    const nSueloNum = parseNumber(nSueloRaw.replace(/[^\d.,]/g, ""));
    if (!isNaN(rindeNum) && rindeNum > 0 && !isNaN(nSueloNum) && nSueloNum >= 0) {
      const calc = maizeNitrogenBalance(rindeNum, nSueloNum, 46);
      return { calculation: calc, summaryText: calc.resultSummary };
    }
  }

  // 4. Calibración de densidad de siembra (plantas/ha a semillas/metro)
  const plantsMatch = qQuery.match(/(\d{2}(?:\.?\d{3}))\s*(?:plantas|pl|semillas)/);
  if (plantsMatch && /\b(metro|surco|sembradora|calibr|semillas)\b/.test(qQuery)) {
    const rawPlants = parseInt(plantsMatch[1].replace(/\./g, ""), 10);
    const spacingMatch = qQuery.match(/(\d{2,3})\s*cm/);
    const spacingCm = spacingMatch ? parseInt(spacingMatch[1], 10) : 52;
    if (rawPlants >= 20000 && rawPlants <= 120000) {
      const calc = maizeSeedingRate(rawPlants, spacingCm, 92);
      return { calculation: calc, summaryText: calc.resultSummary };
    }
  }

  // 5. Pérdidas de cosecha en maíz
  const grainsM2Match = qQuery.match(/(\d+(?:[.,]\d+)?)\s*granos?\s*(?:por|\/)\s*m2/);
  if (grainsM2Match && /\b(maiz|cosecha|perdida|cabezal|cola)\b/.test(qQuery)) {
    const grains = parseNumber(grainsM2Match[1]);
    const earsMatch = qQuery.match(/(\d+(?:[.,]\d+)?)\s*espigas?/);
    const ears = earsMatch ? parseNumber(earsMatch[1]) : 0;
    const calc = maizeHarvestLossesCalc(grains, ears);
    return { calculation: calc, summaryText: calc.resultSummary };
  }

  return {};
}
