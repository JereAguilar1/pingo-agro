import { doseToProduct, nitrogenContent } from "./calculations";
import { completeWithAi, isAiConfigured } from "./ai-provider";
import { retrieve } from "./retrieval";
import { AssistantResponse, SourceCardData } from "./types";

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// ---------- Cálculos verificables ----------

interface DoseCalc {
  type: "dose";
  dose: number;
  percent: number;
  hectares: number;
}
interface ContentCalc {
  type: "content";
  kg: number;
  percent: number;
}

function detectCalculation(question: string): DoseCalc | ContentCalc | null {
  const q = normalize(question);

  const doseMatch = q.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:de\s*)?n\s*\/?\s*ha/);
  const percentMatch = q.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const haMatches = [...q.matchAll(/(\d+(?:[.,]\d+)?)\s*ha\b/g)];

  if (doseMatch && percentMatch && haMatches.length > 0) {
    // La última mención de "ha" que no forma parte de "kg N/ha" es la superficie.
    const surfaceMatch = haMatches[haMatches.length - 1];
    return {
      type: "dose",
      dose: parseNumber(doseMatch[1]),
      percent: parseNumber(percentMatch[1]),
      hectares: parseNumber(surfaceMatch[1]),
    };
  }

  const kgMatch = q.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kgMatch && percentMatch && /urea|nitrogeno|fertilizante/.test(q)) {
    return {
      type: "content",
      kg: parseNumber(kgMatch[1]),
      percent: parseNumber(percentMatch[1]),
    };
  }

  return null;
}

function handleCalculation(calc: DoseCalc | ContentCalc): AssistantResponse {
  const output =
    calc.type === "content"
      ? nitrogenContent(calc.kg, calc.percent)
      : doseToProduct(calc.dose, calc.percent, calc.hectares);

  const sourceFrag = {
    sourceCode: "R03",
    institution: "INTA (EEA Anguil / UNLPam)",
    title: "Del nitrógeno en la urea al nitrógeno del suelo",
    accessedOn: "2026-10-23",
    section: "Página 1 — concentración de nitrógeno",
    url: "https://repositorio.inta.gob.ar/xmlui/bitstream/handle/20.500.12123/12038/INTA_CRLaPampa-SanLuis_EEAAnguil_Kloster_N._Del%20nitr%C3%B3geno%20en%20la%20urea%20al%20nitr%C3%B3geno%20del%20suelo.pdf?isAllowed=y&sequence=1",
    verification: "verified" as const,
    supports:
      "Respalda que la concentración declarada del fertilizante (p. ej. 46% de N) es la base del cálculo, y que esa concentración no equivale a la cantidad de N que absorbe el cultivo.",
  };

  return {
    kind: "calculation",
    answer:
      `Cálculo verificado (función determinista, no generado por el modelo de lenguaje):\n\n` +
      `${output.resultSummary}\n\n` +
      `${output.disclaimer}`,
    calculation: output,
    sources: [sourceFrag],
    warnings: [
      "Esto es un cálculo matemático, no una recomendación agronómica: no valida si la dosis o el producto son adecuados para el cultivo, el ambiente o el objetivo de rendimiento.",
    ],
    mode: "demo",
  };
}

// ---------- Reconocimiento de información insuficiente ----------

function isPhytoAuthorizationQuery(q: string): boolean {
  const hasProductTopic = /herbicida|fitosanitario|agroquimico|plaguicida/.test(q);
  const asksAuthorization = /autorizad|registrad|permitid|puedo usar|puedo aplicar/.test(q);
  const hasRegistrationNumber = /registro\s*n?r?o?\.?\s*\d{3,}/.test(q);
  const hasCommercialNameHint = /nombre comercial/.test(q);
  return hasProductTopic && asksAuthorization && !hasRegistrationNumber && !hasCommercialNameHint;
}

function isSoilSamplingPlanningQuery(q: string): boolean {
  const mentionsSampling = /muestreo/.test(q) && /suelo/.test(q);
  const givesObjective = /objetivo/.test(q);
  const givesProtocolDetail = /profundidad|submuestras|protocolo elegido/.test(q);
  return mentionsSampling && !givesObjective && !givesProtocolDetail;
}

function isLivePriceQuery(q: string): boolean {
  const asksPrice = /precio|cotizacion|cuanto (vale|cuesta|pagan)|oferta/.test(q);
  const aboutMarket = /cereal|soja|maiz|trigo|grano|flete|alquiler|arrendamiento|dolar|tonelada/.test(
    q
  );
  const asksCurrent = /actual|hoy|ahora|esta semana|este mes/.test(q) || !/historico|pasado/.test(q);
  return asksPrice && aboutMarket && asksCurrent;
}

function handlePhytoInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "No puedo confirmar si un producto fitosanitario está autorizado sin identificarlo con precisión. " +
      "Para evaluarlo necesito: nombre comercial o número de registro, formulación, cultivo y uso previsto (maleza, plaga o enfermedad objetivo). " +
      "Con esos datos se puede verificar el registro oficial y revisar el marbete aplicable antes de dar cualquier respuesta.",
    sources: [
      {
        sourceCode: "R01",
        institution: "SENASA",
        title: "Registro Nacional de Terapéutica Vegetal",
        accessedOn: "2026-10-23",
        url: "https://www.argentina.gob.ar/senasa/programas-sanitarios/productosveterinarios-fitosanitarios-y-fertilizantes/registro-nacional-de-terapeutica-vegetal",
        verification: "verified",
        supports: "Es el punto de partida oficial para verificar si un producto identificado está inscripto.",
      },
      {
        sourceCode: "R02",
        institution: "SENASA",
        title: "Consulta pública del vademécum de productos fitosanitarios",
        accessedOn: "2026-10-23",
        url: "https://aps2.senasa.gov.ar/vademecum/app/publico",
        verification: "verified",
        supports: "Buscador para confirmar el registro una vez identificado el producto exacto.",
      },
    ],
    warnings: [
      "No se afirma ni se descarta ninguna autorización: falta identificar el producto exacto.",
    ],
    followUpQuestions: [
      "¿Nombre comercial o número de registro del producto?",
      "¿Formulación y concentración?",
      "¿Cultivo y maleza, plaga o enfermedad objetivo?",
    ],
    mode: "demo",
  };
}

function handleSoilSamplingInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para planificar un muestreo de suelo que sirva a tu decisión necesito más contexto: " +
      "el objetivo del análisis (fertilidad general, un nutriente puntual, salinidad, compactación, etc.), el cultivo y campaña, " +
      "el ambiente o la historia del lote, y si ya hay un protocolo de referencia elegido. " +
      "No existe una profundidad o cantidad de submuestras única válida para todos los objetivos.",
    sources: [
      {
        sourceCode: "R04",
        institution: "INTA",
        title: "Metodología de muestreo de suelo y ensayos a campo (2.ª edición)",
        accessedOn: "2026-10-23",
        url: "https://www.argentina.gob.ar/sites/default/files/2026/02/inta_metod_muestreo_suelo_y_ensayo_a_campo.pdf",
        verification: "verified",
        supports: "Contiene protocolos organizados por propiedad del suelo a evaluar; el protocolo depende del objetivo.",
      },
      {
        sourceCode: "R05",
        institution: "INTA Balcarce",
        title: "Laboratorio de Suelo y Material Vegetal — Red de Laboratorios INTA",
        accessedOn: "2026-10-23",
        url: "https://www.argentina.gob.ar/inta/redes-de-laboratorios-inta/laboratorio-de-suelo-y-material-vegetal-grupo-relacion-suelo-cultivo-eea-balcarce",
        verification: "verified",
        supports: "Referencia regional de laboratorio para derivar las muestras una vez definido el protocolo.",
      },
    ],
    warnings: ["No se propone una profundidad ni una cantidad de submuestras sin conocer el objetivo del análisis."],
    followUpQuestions: [
      "¿Cuál es el objetivo del análisis?",
      "¿Qué cultivo y campaña corresponde?",
      "¿Hay antecedentes o manejo diferencial del lote?",
    ],
    mode: "demo",
  };
}

function handleLivePriceInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Surco no tiene una conexión en tiempo real y verificada con fuentes de precios, por lo que no puede mostrar una cotización actual. " +
      "Te comparto dónde consultarla directamente; al comparar una referencia de pizarra con una oferta concreta, prestá atención a fecha, calidad, destino, entrega, forma de pago y gastos.",
    sources: [
      {
        sourceCode: "R20",
        institution: "Bolsa de Comercio de Rosario (Cámara Arbitral)",
        title: "Consulta de precios de pizarra",
        accessedOn: "2026-10-23",
        url: "https://cac.bcr.com.ar/es/precios-de-pizarra/consultas",
        verification: "verified",
        supports: "Fuente para consultar precios de pizarra reales por producto y fecha de mercado.",
      },
      {
        sourceCode: "R21",
        institution: "Bolsa de Cereales y Productos de Bahía Blanca",
        title: "Cotizaciones y reportes",
        accessedOn: "2026-10-23",
        url: "https://bcp.org.ar/index.asp",
        verification: "verified",
        supports: "Fuente regional adicional de cotizaciones y reportes.",
      },
    ],
    warnings: ["No se muestra ningún valor numérico de precio: hacerlo sin conexión real sería inventar un dato."],
    mode: "demo",
  };
}

// ---------- Respuesta basada en evidencia recuperada ----------

async function handleGroundedOrNoEvidence(question: string): Promise<AssistantResponse> {
  const results = retrieve(question, 4);

  if (results.length === 0) {
    return {
      kind: "no_evidence",
      answer:
        "La biblioteca documental disponible en este prototipo no incluye evidencia suficiente para responder con respaldo. " +
        "Para avanzar, contame con más detalle el contexto (cultivo, zona, campaña, objetivo) o compartime el documento técnico que querés consultar.",
      sources: [],
      warnings: ["No se muestran fuentes porque ninguna de la biblioteca actual respalda esta consulta específica."],
      mode: "demo",
    };
  }

  const sources: SourceCardData[] = results.map((r) => ({
    sourceCode: r.fragment.sourceCode,
    institution: r.fragment.institution,
    title: r.fragment.title,
    date: r.fragment.date,
    accessedOn: r.fragment.accessedOn,
    section: r.fragment.section,
    url: r.fragment.url,
    verification: r.fragment.verification,
    supports: r.fragment.text,
  }));

  const warnings = results
    .map((r) => r.fragment.limitation)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  if (isAiConfigured()) {
    try {
      const system = buildRagSystemPrompt(results.map((r) => r.fragment));
      const ai = await completeWithAi({ system, question });
      return {
        kind: "grounded_answer",
        answer: ai.text,
        sources,
        warnings,
        mode: "ai",
      };
    } catch {
      // Si el proveedor de IA falla, degradamos a la respuesta determinista
      // en vez de romper la conversación.
    }
  }

  const summary = results
    .map((r) => `• ${r.fragment.institution} (${r.fragment.sourceCode}): ${r.fragment.text}`)
    .join("\n");

  return {
    kind: "grounded_answer",
    answer:
      `Según la biblioteca documental disponible:\n\n${summary}\n\n` +
      `Estas fuentes orientan la consulta, pero revisá las limitaciones señaladas antes de usarlas como respaldo definitivo para una decisión en tu lote.`,
    sources,
    warnings,
    mode: "demo",
  };
}

function buildRagSystemPrompt(fragments: { sourceCode: string; institution: string; title: string; text: string; limitation: string }[]): string {
  const evidence = fragments
    .map(
      (f) =>
        `[${f.sourceCode}] ${f.institution} — ${f.title}\nResumen: ${f.text}\nLímite: ${f.limitation}`
    )
    .join("\n\n");

  return [
    "Sos Surco, un asistente técnico para ingenieros agrónomos especializado en agricultura extensiva de Tandil y zona.",
    "Reglas obligatorias:",
    "1. Usá únicamente la evidencia provista abajo. No inventes fuentes, enlaces, fechas, cifras ni resultados de ensayos.",
    "2. Si la evidencia no alcanza para responder con certeza, decilo explícitamente y pedí el dato o documento que falta.",
    "3. Distinguí claramente los hechos respaldados por la evidencia de tus interpretaciones.",
    "4. No recomiendes dosis, productos ni aplicaciones de fitosanitarios sin evidencia suficiente y contexto adecuado.",
    "5. Mencioná las limitaciones relevantes de la evidencia citada cuando correspondan.",
    "6. Respondé en español, de forma concisa y profesional, citando los códigos de fuente entre corchetes (p. ej. [R03]) donde corresponda.",
    "",
    "Evidencia disponible:",
    evidence,
  ].join("\n");
}

// ---------- Punto de entrada ----------

export async function respond(question: string): Promise<AssistantResponse> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      kind: "no_evidence",
      answer: "Escribí una consulta para que pueda ayudarte.",
      sources: [],
      warnings: [],
      mode: "demo",
    };
  }

  const q = normalize(trimmed);

  const calc = detectCalculation(trimmed);
  if (calc) return handleCalculation(calc);

  if (isPhytoAuthorizationQuery(q)) return handlePhytoInsufficientInfo();
  if (isSoilSamplingPlanningQuery(q)) return handleSoilSamplingInsufficientInfo();
  if (isLivePriceQuery(q)) return handleLivePriceInsufficientInfo();

  return handleGroundedOrNoEvidence(trimmed);
}
