// Extracción de datos de lote a partir de una descripción hablada (texto ya
// transcripto por voz). Pensado para productores de 40-60 años que hoy
// anotan esto en papel o Excel: hablan como les sale y el formulario se
// autocompleta con lo que se entendió, dejando todo editable después.
//
// Primero corre un parser local (determinista, sin IA, siempre disponible)
// por palabras clave y patrones numéricos. Si hay un proveedor de IA
// configurado (ver ai-provider.ts), se usa además para mejorar la cobertura
// — nunca inventa un valor que no esté en el texto: el prompt lo prohíbe
// explícitamente y cualquier campo no mencionado se omite.

import { completeWithAi, isAiConfigured } from "./ai-provider";
import { ProducerLote } from "./types";

export type ExtractedLoteFields = Partial<
  Pick<
    ProducerLote,
    | "name"
    | "hectares"
    | "crop"
    | "hybrid"
    | "phenology"
    | "targetYieldTonHa"
    | "previousCrop"
    | "municipality"
    | "locality"
    | "relief"
    | "soilNitrateKgHa"
    | "soilPhosphorusPpm"
    | "organicMatterPercent"
    | "ph"
    | "toscaDepthCm"
  >
>;

const CROPS: Record<string, string> = {
  "maiz": "Maíz",
  "maíz": "Maíz",
  "soja": "Soja",
  "trigo": "Trigo",
  "girasol": "Girasol",
  "cebada": "Cebada",
};

const LOCALITIES = [
  "Gardey",
  "Vela",
  "Rauch",
  "Ayacucho",
  "Azul",
  "Benito Juárez",
  "Juárez",
  "Tandil",
  "Fulton",
  "Chillar",
];

const RELIEFS: Record<string, ProducerLote["relief"]> = {
  "media loma": "Media loma",
  "bajo dulce": "Bajo dulce",
  "bajo alcalino": "Bajo alcalino",
  "loma": "Loma",
  "plano": "Plano",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

/**
 * Parser local por palabras clave: siempre disponible, no depende de
 * ninguna API key. Cubre los casos de habla más comunes ("tengo un lote de
 * 85 hectáreas de maíz en Gardey, estadio V6, rinde objetivo 10 toneladas,
 * el análisis de suelo dio 66 de nitrógeno y 14 de fósforo").
 */
export function parseLoteFromTextLocal(text: string): ExtractedLoteFields {
  const q = normalize(text);
  const result: ExtractedLoteFields = {};

  const hectaresMatch = q.match(/(\d+(?:[.,]\d+)?)\s*(?:ha\b|hectareas?)/);
  if (hectaresMatch) result.hectares = parseNumber(hectaresMatch[1]);

  // El cultivo antecesor ("antecesor maíz", "venía de maíz") se detecta primero
  // y se excluye del texto antes de buscar el cultivo principal, para no
  // confundir uno con el otro (ej. "soja... antecesor maíz").
  const previousCropMatch = q.match(/(?:antecesor|veni?a de|despues de)\s+([a-z]+)/);
  let qForCrop = q;
  if (previousCropMatch) {
    const crop = CROPS[previousCropMatch[1]];
    if (crop) {
      result.previousCrop = crop;
      qForCrop = q.replace(previousCropMatch[0], "");
    }
  }

  let earliestCropIndex = Infinity;
  for (const [key, label] of Object.entries(CROPS)) {
    const match = qForCrop.match(new RegExp(`\\b${key}\\b`));
    if (match && match.index !== undefined && match.index < earliestCropIndex) {
      earliestCropIndex = match.index;
      result.crop = label;
    }
  }

  const yieldMatch = q.match(
    /(\d+(?:[.,]\d+)?)\s*t(?:oneladas?)?\s*(?:\/\s*|por\s+)?(?:ha\b|hectareas?)/
  );
  if (yieldMatch) result.targetYieldTonHa = parseNumber(yieldMatch[1]);

  const phenologyMatch = q.match(/\b([vr]\s?\d{1,2})\b/i);
  if (phenologyMatch) result.phenology = phenologyMatch[1].toUpperCase().replace(/\s/g, "");

  for (const locality of LOCALITIES) {
    if (q.includes(normalize(locality)) && normalize(locality) !== "tandil") {
      result.locality = locality;
      result.municipality = "Tandil";
      break;
    }
  }
  if (!result.municipality && q.includes("tandil")) result.municipality = "Tandil";

  for (const [key, label] of Object.entries(RELIEFS)) {
    if (q.includes(key)) {
      result.relief = label;
      break;
    }
  }

  const nitrogenMatch = q.match(
    /(?:nitrogeno[^\d]{0,15}(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)[^\d]{0,10}(?:de\s+)?nitrogeno)/
  );
  if (nitrogenMatch) result.soilNitrateKgHa = parseNumber(nitrogenMatch[1] ?? nitrogenMatch[2]);

  const phosphorusMatch = q.match(
    /(?:fosforo[^\d]{0,15}(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)[^\d]{0,10}(?:de\s+)?fosforo)/
  );
  if (phosphorusMatch) result.soilPhosphorusPpm = parseNumber(phosphorusMatch[1] ?? phosphorusMatch[2]);

  const moMatch = q.match(/materia organica[^\d]{0,15}(\d+(?:[.,]\d+)?)/);
  if (moMatch) result.organicMatterPercent = parseNumber(moMatch[1]);

  const phMatch = q.match(/\bph[^\d]{0,10}(\d+(?:[.,]\d+)?)/);
  if (phMatch) result.ph = parseNumber(phMatch[1]);

  const toscaMatch = q.match(/tosca[^\d]{0,15}(\d+(?:[.,]\d+)?)/);
  if (toscaMatch) result.toscaDepthCm = parseNumber(toscaMatch[1]);

  // Solo tomamos el nombre si dice algo como "lote La Loma" o "lote 4"
  // (no cuando "lote" va seguido de una descripción, ej. "lote de 60 hectáreas").
  const nameMatch = text.match(/\blote\s+(?!de\b|del\b)([\wáéíóúñÁÉÍÓÚÑ0-9]{1,24}(?:\s+[\wáéíóúñÁÉÍÓÚÑ0-9]{1,24}){0,3})(?:[,.]|$| de | en )/i);
  if (nameMatch) {
    const base = nameMatch[1].trim();
    if (base) result.name = `Lote ${base}${result.locality ? ` (${result.locality}, Tandil)` : ""}`;
  } else if (result.locality) {
    result.name = `Lote — ${result.locality} (Tandil)`;
  }

  return result;
}

const AI_EXTRACTION_FIELDS = [
  "name", "hectares", "crop", "hybrid", "phenology", "targetYieldTonHa",
  "previousCrop", "municipality", "locality", "relief", "soilNitrateKgHa",
  "soilPhosphorusPpm", "organicMatterPercent", "ph", "toscaDepthCm",
];

function buildExtractionPrompt(text: string): string {
  return [
    "Extraé datos de lote agrícola a partir de esta descripción hablada por un productor.",
    `Devolvé SOLO un objeto JSON (sin texto adicional, sin markdown) con las claves de esta lista que puedas inferir con alta confianza: ${AI_EXTRACTION_FIELDS.join(", ")}.`,
    "Reglas estrictas:",
    "- NUNCA inventes un valor numérico o un nombre que no esté explícito o claramente implícito en el texto.",
    "- Si un dato no se menciona, no incluyas esa clave (no pongas null ni 0 ni string vacío).",
    "- 'crop' y 'previousCrop' deben ser uno de: Maíz, Soja, Trigo, Girasol, Cebada.",
    "- 'municipality' por defecto es 'Tandil' si se menciona alguna localidad de esa zona (Gardey, Vela, Rauch, etc.) o Tandil mismo.",
    "- 'phenology' en formato corto, ej. 'V6' o 'R1'.",
    "",
    `Texto: "${text}"`,
  ].join("\n");
}

function parseJsonLoose(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeExtracted(raw: Record<string, unknown>): ExtractedLoteFields {
  const out: ExtractedLoteFields = {};
  const numberFields = new Set([
    "hectares", "targetYieldTonHa", "soilNitrateKgHa", "soilPhosphorusPpm",
    "organicMatterPercent", "ph", "toscaDepthCm",
  ]);
  for (const field of AI_EXTRACTION_FIELDS) {
    const value = raw[field];
    if (value === undefined || value === null || value === "") continue;
    if (numberFields.has(field)) {
      const n = typeof value === "number" ? value : parseFloat(String(value));
      if (!Number.isNaN(n)) (out as Record<string, unknown>)[field] = n;
    } else if (typeof value === "string") {
      (out as Record<string, unknown>)[field] = value;
    }
  }
  return out;
}

/**
 * Combina el parser local (siempre disponible) con una mejora opcional por
 * IA si hay un proveedor configurado. Si la IA falla o no está configurada,
 * degrada silenciosamente al resultado del parser local.
 */
export async function extractLoteFromText(
  text: string
): Promise<{ extracted: ExtractedLoteFields; usedAi: boolean }> {
  const local = parseLoteFromTextLocal(text);

  if (!isAiConfigured() || text.trim().length < 6) {
    return { extracted: local, usedAi: false };
  }

  try {
    const ai = await completeWithAi({
      system: "Sos un extractor de datos estructurados. Respondés únicamente JSON válido.",
      question: buildExtractionPrompt(text),
    });
    const parsed = parseJsonLoose(ai.text);
    if (!parsed) return { extracted: local, usedAi: false };
    const sanitized = sanitizeExtracted(parsed);
    return { extracted: { ...local, ...sanitized }, usedAi: true };
  } catch {
    return { extracted: local, usedAi: false };
  }
}
