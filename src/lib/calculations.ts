// Cálculos agronómicos deterministas. No dependen del modelo de lenguaje:
// cualquier respuesta que incluya estos resultados debe citar esta función,
// nunca pedirle el cálculo al modelo.

export interface CalculationStep {
  label: string;
  expression: string;
  result: string;
}

export interface CalculationOutput {
  title: string;
  steps: CalculationStep[];
  resultSummary: string;
  disclaimer: string;
}

/**
 * Caso 1: contenido de nitrógeno en un fertilizante nitrogenado (p. ej. urea).
 * kgProducto * fraccionN = kgN
 */
export function nitrogenContent(kgProduct: number, nPercent: number): CalculationOutput {
  const fraction = nPercent / 100;
  const kgN = kgProduct * fraction;
  return {
    title: `Contenido de nitrógeno en ${kgProduct} kg de producto al ${nPercent}% de N`,
    steps: [
      {
        label: "Fracción de nitrógeno",
        expression: `${nPercent}% = ${fraction}`,
        result: `${fraction}`,
      },
      {
        label: "Nitrógeno contenido",
        expression: `${kgProduct} kg × ${fraction} = ${round(kgN, 4)} kg de N`,
        result: `${round(kgN, 2)} kg de N`,
      },
    ],
    resultSummary: `${kgProduct} kg de producto al ${nPercent}% de N contienen ${round(kgN, 2)} kg de nitrógeno.`,
    disclaimer:
      "Este es el contenido de nitrógeno del fertilizante, no la cantidad que necesariamente absorberá o aprovechará el cultivo: hay pérdidas y transformaciones en el suelo.",
  };
}

/**
 * Caso 2: a partir de una dosis de N por hectárea, calcular la cantidad de producto
 * necesaria para una superficie dada.
 * kgProductoPorHa = dosisN_kgHa / fraccionN
 * kgProductoTotal = kgProductoPorHa * hectareas
 */
export function doseToProduct(
  doseNKgHa: number,
  nPercent: number,
  hectares: number
): CalculationOutput {
  const fraction = nPercent / 100;
  const kgPerHa = doseNKgHa / fraction;
  const totalKg = kgPerHa * hectares;
  return {
    title: `Producto necesario para ${doseNKgHa} kg N/ha en ${hectares} ha (producto al ${nPercent}% de N)`,
    steps: [
      {
        label: "Producto por hectárea",
        expression: `${doseNKgHa} / ${fraction} = ${round(kgPerHa, 4)} kg/ha`,
        result: `${round(kgPerHa, 4)} kg/ha`,
      },
      {
        label: "Producto total",
        expression: `${round(kgPerHa, 4)} kg/ha × ${hectares} ha = ${round(totalKg, 4)} kg`,
        result: `${round(totalKg, 2)} kg`,
      },
    ],
    resultSummary: `Se necesitan aproximadamente ${round(kgPerHa, 2)} kg de producto por hectárea, y ${round(
      totalKg,
      2
    )} kg en total para ${hectares} ha.`,
    disclaimer:
      "Este cálculo parte de una dosis de nitrógeno ya definida por el usuario. No evalúa si esa dosis es agronómicamente adecuada para el cultivo, el ambiente o el objetivo de rendimiento.",
  };
}

/**
 * Caso 3: Balance orientativo de Nitrógeno en Maíz (22 kg N/t de rinde objetivo - N inicial suelo 0-60 cm)
 * según Tabla M01 (INTA Balcarce) y conversión a Urea (46% N) según R03.
 */
export function maizeNitrogenBalance(
  targetYieldTonHa: number,
  soilNitrateKgHa: number,
  ureaPercentN = 46
): CalculationOutput {
  const reqPerTon = 22; // M01 INTA Balcarce
  const totalDemandN = targetYieldTonHa * reqPerTon;
  const deficitN = Math.max(0, totalDemandN - soilNitrateKgHa);
  const fractionN = ureaPercentN / 100;
  const ureaKgHa = deficitN / fractionN;

  return {
    title: `Balance de Nitrógeno en Maíz para ${targetYieldTonHa} t/ha (con ${soilNitrateKgHa} kg N/ha en suelo 0–60 cm)`,
    steps: [
      {
        label: "Demanda de N del maíz (22 kg N/t — M01)",
        expression: `${targetYieldTonHa} t/ha × 22 kg N/t = ${round(totalDemandN, 1)} kg N/ha`,
        result: `${round(totalDemandN, 1)} kg N/ha`,
      },
      {
        label: "Brecha de N a cubrir por fertilización",
        expression: `${round(totalDemandN, 1)} kg N/ha − ${soilNitrateKgHa} kg N/ha (suelo) = ${round(deficitN, 1)} kg N/ha`,
        result: `${round(deficitN, 1)} kg N/ha`,
      },
      {
        label: `Equivalente en Urea (${ureaPercentN}% N — R03)`,
        expression: `${round(deficitN, 1)} kg N/ha / ${fractionN} = ${round(ureaKgHa, 1)} kg Urea/ha`,
        result: `${round(ureaKgHa, 1)} kg Urea/ha`,
      },
    ],
    resultSummary: `Para un maíz de ${targetYieldTonHa} t/ha (demanda: ${round(totalDemandN, 1)} kg N/ha) con ${soilNitrateKgHa} kg N/ha iniciales en el suelo, faltan aportar ${round(deficitN, 1)} kg N/ha, equivalentes a ${round(ureaKgHa, 1)} kg/ha de urea (${ureaPercentN}% N).`,
    disclaimer:
      "Cálculo determinista basado en el umbral de 22 kg N/t (INTA Balcarce, M01, Pág. 18–22). No contempla mineralización neta durante el ciclo ni pérdidas por volatilización/lixiviación.",
  };
}

/**
 * Caso 4: Regulación de sembradora de maíz (plantas/ha a semillas por metro lineal según espaciamiento entre surcos).
 */
export function maizeSeedingRate(
  targetPlantsHa: number,
  rowSpacingCm = 52,
  achievementEfficiencyPercent = 92
): CalculationOutput {
  const rowSpacingM = rowSpacingCm / 100;
  const linearMetersPerHa = 10000 / rowSpacingM;
  const plantsPerMeter = targetPlantsHa / linearMetersPerHa;
  const efficiencyFraction = achievementEfficiencyPercent / 100;
  const seedsPerMeter = plantsPerMeter / efficiencyFraction;
  const seedsPerHa = targetPlantsHa / efficiencyFraction;

  return {
    title: `Calibración de siembra de Maíz: ${targetPlantsHa.toLocaleString("es-AR")} pl/ha a ${rowSpacingCm} cm entre hileras`,
    steps: [
      {
        label: "Metros lineales de surco por hectárea",
        expression: `10.000 m² / ${rowSpacingM} m = ${round(linearMetersPerHa, 1)} m/ha`,
        result: `${round(linearMetersPerHa, 1)} m/ha`,
      },
      {
        label: "Plantas logradas objetivo por metro lineal",
        expression: `${targetPlantsHa} pl/ha / ${round(linearMetersPerHa, 1)} m/ha = ${round(plantsPerMeter, 2)} pl/m`,
        result: `${round(plantsPerMeter, 2)} pl/m`,
      },
      {
        label: `Semillas a tirar por metro (eficiencia de logro ${achievementEfficiencyPercent}%)`,
        expression: `${round(plantsPerMeter, 2)} pl/m / ${efficiencyFraction} = ${round(seedsPerMeter, 2)} semillas/m`,
        result: `${round(seedsPerMeter, 2)} semillas/m (${round(seedsPerHa, 0)} sem/ha)`,
      },
    ],
    resultSummary: `Para lograr ${targetPlantsHa.toLocaleString("es-AR")} plantas/ha a ${rowSpacingCm} cm entre surcos (eficiencia ${achievementEfficiencyPercent}%), debés calibrar el dosificador en ${round(seedsPerMeter, 2)} semillas por metro lineal (${round(seedsPerHa, 0)} semillas/ha).`,
    disclaimer:
      "Verificá el poder germinativo (PG), vigor en frío del lote de semilla y velocidad de avance (ideal ≤ 6–7 km/h en dosificadores mecánicos).",
  };
}

/**
 * Caso 5: Estimación determinista de pérdidas de cosecha en Maíz (M05 — INTA PRECOP).
 */
export function maizeHarvestLossesCalc(
  grainsPerM2: number,
  earsPer10M2 = 0
): CalculationOutput {
  const grainLossKgHa = grainsPerM2 * 3.3;
  const earLossKgHa = earsPer10M2 * 150;
  const totalLossKgHa = grainLossKgHa + earLossKgHa;

  return {
    title: `Cálculo de Pérdidas en Cosecha de Maíz (${grainsPerM2} granos/m² y ${earsPer10M2} espigas/10m²)`,
    steps: [
      {
        label: "Pérdida por grano suelto (1 grano/m² ≈ 3,3 kg/ha — M05)",
        expression: `${grainsPerM2} granos/m² × 3,3 kg/ha = ${round(grainLossKgHa, 1)} kg/ha`,
        result: `${round(grainLossKgHa, 1)} kg/ha`,
      },
      {
        label: "Pérdida por espigas caídas (1 espiga/10m² ≈ 150 kg/ha — M05)",
        expression: `${earsPer10M2} espigas/10m² × 150 kg/ha = ${round(earLossKgHa, 1)} kg/ha`,
        result: `${round(earLossKgHa, 1)} kg/ha`,
      },
      {
        label: "Pérdida total estimada vs. tolerancia INTA (120–150 kg/ha)",
        expression: `${round(grainLossKgHa, 1)} + ${round(earLossKgHa, 1)} = ${round(totalLossKgHa, 1)} kg/ha`,
        result: `${round(totalLossKgHa, 1)} kg/ha (${totalLossKgHa > 150 ? "EXCEDE tolerancia" : "Dentro de tolerancia"})`,
      },
    ],
    resultSummary: `La pérdida total estimada es de ${round(totalLossKgHa, 1)} kg/ha (${round(grainLossKgHa, 1)} kg/ha en grano suelto + ${round(earLossKgHa, 1)} kg/ha en espigas). Tolerancia orientativa INTA PRECOP [M05]: 120–150 kg/ha.`,
    disclaimer:
      "Basado en peso medio de grano estándar (M05, Pág. 4–9). Descontar siempre pérdidas de precosecha antes de regular chapas espigadoras o cóncavo.",
  };
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
