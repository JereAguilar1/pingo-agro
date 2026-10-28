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

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
