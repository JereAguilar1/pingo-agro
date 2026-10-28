import { doseToProduct, nitrogenContent } from "./calculations";
import { completeWithAi, isAiConfigured } from "./ai-provider";
import { retrieve } from "./retrieval";
import { AssistantResponse, FormSubmission, SourceCardData } from "./types";

const CROPS = ["Soja", "Maíz", "Girasol", "Trigo", "Cebada", "Otro"];

const SENASA_SOURCES: SourceCardData[] = [
  {
    sourceCode: "R01",
    institution: "SENASA",
    title: "Registro Nacional de Terapéutica Vegetal",
    accessedOn: "2026-10-23",
    url: "https://www.argentina.gob.ar/senasa/programas-sanitarios/productosveterinarios-fitosanitarios-y-fertilizantes/registro-nacional-de-terapeutica-vegetal",
    verification: "verified",
    supports: "Punto de partida para verificar si un producto identificado está inscripto.",
  },
  {
    sourceCode: "R02",
    institution: "SENASA",
    title: "Consulta pública del vademécum de productos fitosanitarios",
    accessedOn: "2026-10-23",
    url: "https://aps2.senasa.gov.ar/vademecum/app/publico",
    verification: "verified",
    supports: "Buscador para localizar el marbete del producto una vez identificado.",
  },
];

const REM_SOURCES: SourceCardData[] = [
  {
    sourceCode: "R08",
    institution: "Aapresid",
    title: "REM — Red de Manejo de Plagas (malezas, insectos y enfermedades resistentes)",
    accessedOn: "2026-10-23",
    url: "https://aapresid.org.ar/rem",
    verification: "verified",
    supports: "Entradas sobre malezas, plagas y enfermedades, y seguimiento de resistencias por problema.",
  },
  {
    sourceCode: "R09",
    institution: "Aapresid — REM",
    title: "Modos de acción herbicida (publicación 2013)",
    accessedOn: "2026-10-23",
    url: "https://www.aapresid.org.ar/es/novedades/68d1ba18379fe5caf64926fd",
    verification: "verified",
    supports: "Marco conceptual para distinguir familia química de modo de acción (de 2013: contrastar con registros vigentes).",
  },
];

const NORMATIVA_SOURCE: SourceCardData = {
  sourceCode: "R11",
  institution: "Argentina.gob.ar",
  title: "Buscador de normativa nacional (leyes, decretos y resoluciones)",
  accessedOn: "2026-10-23",
  url: "https://www.argentina.gob.ar/normativa",
  verification: "verified",
  supports: "Para verificar si hay restricciones provinciales o municipales adicionales según la ubicación del lote (en Tandil: Ordenanza 17.404/2021 y sus reglamentaciones).",
};

const PROBLEM_TYPES = ["Maleza", "Plaga (insecto)", "Enfermedad", "Otro"];

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

function isCropRotationAfterHerbicideQuery(q: string): boolean {
  const herbicideNames =
    "herbicida|atrazina|glifosato|2,4-d|2,4 d|dicamba|imazetapir|acetoclor|metsulfuron|flurocloridona|clopiralid";
  const mentionsHerbicideApplied = new RegExp(
    `(aplic\\w+)[^.]*(${herbicideNames})|(${herbicideNames})[^.]*(aplic\\w+)`
  ).test(q);
  const asksAboutChangingCrop =
    /rotaci|reorganizar la siembra|cambiar (el )?cultivo|resiembra|re ?sembrar|sembrar (otro|otra)|intervalo de siembra|restriccion(es)?.*(siembra|rotacion|cultivo)|que restricciones/.test(
      q
    );
  return mentionsHerbicideApplied && asksAboutChangingCrop;
}

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

function isProductFamilyGenericQuery(q: string): boolean {
  const asksProductInfo =
    /que productos (puedo|podria|se pueden)|principios activos|familias? quimicas?|modos? de accion/.test(
      q
    );
  const genericPlaceholder =
    /este cultivo|este problema|mi cultivo|mi problema|un cultivo|un problema/.test(q);
  return asksProductInfo && genericPlaceholder;
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
    clarificationForm: {
      kind: "phyto",
      submitLabel: "Verificar con estos datos",
      fields: [
        { id: "producto", label: "Nombre comercial o número de registro", type: "text", placeholder: "Ej. Roundup Full II, o Reg. N° 12345", required: true },
        { id: "formulacion", label: "Formulación y concentración", type: "text", placeholder: "Ej. SL 48%" },
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "objetivo", label: "Maleza, plaga o enfermedad objetivo", type: "text", placeholder: "Ej. Sorgo de Alepo" },
      ],
    },
    mode: "demo",
  };
}

function handleCropRotationInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para evaluar qué restricciones de rotación aplican después de un herbicida ya aplicado, primero hay que identificar el producto con precisión: " +
      "no existe un intervalo de siembra único ni validado en abstracto para 'atrazina' o 'un herbicida' en general — depende del producto comercial, su formulación y dosis exacta. " +
      "Con esos datos se busca el marbete correspondiente, que es el que establece el intervalo de siembra (el tiempo que debe pasar antes de sembrar un cultivo distinto, por el residuo del herbicida en el suelo) para cada cultivo siguiente. " +
      "Esa restricción es distinta del período de carencia, que es el tiempo que debe pasar entre la aplicación y la cosecha del cultivo tratado, no entre la aplicación y la siembra de otro cultivo.",
    sources: [
      {
        sourceCode: "R01",
        institution: "SENASA",
        title: "Registro Nacional de Terapéutica Vegetal",
        accessedOn: "2026-10-23",
        url: "https://www.argentina.gob.ar/senasa/programas-sanitarios/productosveterinarios-fitosanitarios-y-fertilizantes/registro-nacional-de-terapeutica-vegetal",
        verification: "verified",
        supports:
          "Punto de partida para identificar el producto exacto aplicado y acceder a su registro antes de buscar el marbete.",
      },
      {
        sourceCode: "R02",
        institution: "SENASA",
        title: "Consulta pública del vademécum de productos fitosanitarios",
        accessedOn: "2026-10-23",
        url: "https://aps2.senasa.gov.ar/vademecum/app/publico",
        verification: "verified",
        supports:
          "Buscador para localizar el marbete del producto identificado, donde consta el intervalo de siembra para el cultivo siguiente.",
      },
    ],
    warnings: [
      "No se propone ningún intervalo de siembra sin identificar el producto, la formulación y la dosis aplicada: hacerlo sería inventar un dato de seguridad.",
      "El intervalo de siembra (restricción de rotación) no debe confundirse con el período de carencia hasta la cosecha: son dos restricciones distintas del mismo producto.",
    ],
    followUpQuestions: [
      "¿Nombre comercial, formulación y número de registro del producto aplicado?",
      "¿Dosis y fecha exacta de la aplicación?",
      "¿Qué antecedentes de aplicaciones previas tiene el lote?",
      "¿Qué cultivo se quiere sembrar ahora (en este caso, girasol) y en qué fecha?",
    ],
    clarificationForm: {
      kind: "crop_rotation",
      submitLabel: "Buscar restricciones con estos datos",
      fields: [
        { id: "producto", label: "Nombre comercial del herbicida aplicado", type: "text", placeholder: "Ej. Gesaprim 500", required: true },
        { id: "formulacionDosis", label: "Formulación y dosis aplicada", type: "text", placeholder: "Ej. SC 50%, 3 l/ha" },
        { id: "fechaAplicacion", label: "Fecha de aplicación", type: "date" },
        { id: "cultivoNuevo", label: "Cultivo que se quiere sembrar ahora", type: "select", options: CROPS, required: true },
        { id: "fechaSiembra", label: "Fecha prevista de siembra", type: "date" },
      ],
    },
    mode: "demo",
  };
}

function handleProductFamilyInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Una lista de principios activos no resuelve esta consulta por sí sola: para relacionar cultivo, problema y uso registrado necesito identificar primero el cultivo y el problema puntual (maleza, plaga o enfermedad, con especie si la conocés). " +
      "Con eso puedo orientar la búsqueda distinguiendo familia química (grupo de principios activos con estructura similar) de modo de acción (cómo actúa sobre el organismo objetivo, relevante para manejar resistencias), pero el producto final, su formulación y sus restricciones de uso solo se confirman en el registro y el marbete — no alcanza con nombrar un principio activo.",
    sources: [...REM_SOURCES, ...SENASA_SOURCES],
    warnings: [
      "La cobertura de esta biblioteca es parcial: REM (Aapresid) aporta antecedentes de manejo y resistencias, pero no reemplaza una búsqueda exhaustiva en el registro oficial para el cultivo y problema exactos.",
      "Si el lote está en Tandil u otro municipio, puede haber restricciones adicionales de aplicación en la normativa local, además del registro nacional.",
    ],
    followUpQuestions: [
      "¿Qué cultivo es?",
      "¿Qué tipo de problema (maleza, plaga o enfermedad) y, si la conocés, qué especie?",
      "¿En qué ubicación está el lote, para revisar normativa local si corresponde?",
    ],
    clarificationForm: {
      kind: "product_family",
      submitLabel: "Orientar la búsqueda con estos datos",
      fields: [
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "tipoProblema", label: "Tipo de problema", type: "select", options: PROBLEM_TYPES, required: true },
        { id: "especie", label: "Especie (maleza, plaga o enfermedad), si la conocés", type: "text", placeholder: "Ej. Sorgo de Alepo, Chinche, Roya" },
        { id: "ubicacion", label: "Ubicación del lote", type: "text", placeholder: "Ej. Tandil" },
      ],
    },
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
    clarificationForm: {
      kind: "soil_sampling",
      submitLabel: "Orientar el muestreo con estos datos",
      fields: [
        {
          id: "objetivo",
          label: "Objetivo del análisis",
          type: "select",
          required: true,
          options: [
            "Fertilidad general",
            "Nutriente puntual (N, P, K u otro)",
            "Salinidad / sodicidad",
            "Compactación física",
            "Otro",
          ],
        },
        { id: "cultivo", label: "Cultivo y campaña", type: "text", placeholder: "Ej. Trigo, campaña 2026/27" },
        { id: "antecedentes", label: "Antecedentes o manejo diferencial del lote", type: "text", placeholder: "Ej. Zona con rinde históricamente más bajo" },
      ],
    },
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

// ---------- Respuesta a un formulario de aclaración completado ----------

function handlePhytoFormSubmission(data: Record<string, string>): AssistantResponse {
  const producto = data.producto?.trim() || "(sin especificar)";
  const cultivo = data.cultivo?.trim();
  const objetivo = data.objetivo?.trim();

  return {
    kind: "insufficient_info",
    answer:
      `Con "${producto}" identificado, el siguiente paso es buscarlo en el vademécum público de SENASA para confirmar su registro vigente${
        cultivo ? ` para ${cultivo}` : ""
      }${objetivo ? ` contra ${objetivo}` : ""}, y revisar el marbete correspondiente. ` +
      `Surco no consulta ese registro en tiempo real, así que no puede confirmar la autorización por vos: el marbete es la fuente que determina usos, dosis y restricciones permitidas.`,
    sources: SENASA_SOURCES,
    warnings: [
      "No se afirma ninguna autorización: hay que verificarla en la fuente oficial con el producto exacto.",
    ],
    mode: "demo",
  };
}

function handleSoilSamplingFormSubmission(data: Record<string, string>): AssistantResponse {
  const objetivo = data.objetivo?.trim() || "el objetivo indicado";
  const cultivo = data.cultivo?.trim();

  return {
    kind: "grounded_answer",
    answer:
      `Para "${objetivo}"${cultivo ? ` en ${cultivo}` : ""}, el protocolo adecuado se busca en la metodología de muestreo de INTA, que organiza los procedimientos por la propiedad del suelo a evaluar. ` +
      `Elegí ahí la sección que corresponda a tu objetivo (por ejemplo, disponibilidad de nutrientes, estructura, carbono o agua) antes de definir profundidad y cantidad de submuestras, y derivá las muestras al laboratorio de INTA Balcarce si corresponde a tu zona.`,
    sources: [
      {
        sourceCode: "R04",
        institution: "INTA",
        title: "Metodología de muestreo de suelo y ensayos a campo (2.ª edición)",
        accessedOn: "2026-10-23",
        url: "https://www.argentina.gob.ar/sites/default/files/2026/02/inta_metod_muestreo_suelo_y_ensayo_a_campo.pdf",
        verification: "verified",
        supports: "Contiene el protocolo específico según el objetivo del análisis.",
      },
      {
        sourceCode: "R05",
        institution: "INTA Balcarce",
        title: "Laboratorio de Suelo y Material Vegetal — Red de Laboratorios INTA",
        accessedOn: "2026-10-23",
        url: "https://www.argentina.gob.ar/inta/redes-de-laboratorios-inta/laboratorio-de-suelo-y-material-vegetal-grupo-relacion-suelo-cultivo-eea-balcarce",
        verification: "verified",
        supports: "Laboratorio de referencia en la región de Tandil/Balcarce para procesar las muestras.",
      },
    ],
    warnings: [
      "No se indica una profundidad ni una cantidad de submuestras concreta: eso depende de la sección del protocolo que elijas para este objetivo.",
    ],
    mode: "demo",
  };
}

function handleCropRotationFormSubmission(data: Record<string, string>): AssistantResponse {
  const producto = data.producto?.trim() || "(sin especificar)";
  const cultivoNuevo = data.cultivoNuevo?.trim() || "el cultivo elegido";

  return {
    kind: "insufficient_info",
    answer:
      `Con "${producto}" identificado, buscalo en el vademécum público de SENASA y revisá su marbete en la sección de restricciones de uso: ahí figura el intervalo de siembra (el tiempo mínimo antes de poder sembrar ${cultivoNuevo} en ese lote) según la formulación y dosis aplicada. ` +
      `Recordá que esa restricción es distinta del período de carencia hasta cosecha del cultivo tratado. Surco no tiene acceso al marbete en tiempo real, así que el intervalo exacto hay que confirmarlo ahí.`,
    sources: SENASA_SOURCES,
    warnings: [
      "No se propone ningún número de días u meses de intervalo de siembra: ese dato solo lo da el marbete del producto identificado.",
    ],
    mode: "demo",
  };
}

function handleProductFamilyFormSubmission(data: Record<string, string>): AssistantResponse {
  const cultivo = data.cultivo?.trim() || "el cultivo indicado";
  const tipoProblema = data.tipoProblema?.trim() || "el problema indicado";
  const especie = data.especie?.trim();
  const ubicacion = data.ubicacion?.trim();

  const sources = [...REM_SOURCES, ...SENASA_SOURCES];
  if (ubicacion && /tandil/i.test(ubicacion)) sources.push(NORMATIVA_SOURCE);

  return {
    kind: "grounded_answer",
    answer:
      `Para ${tipoProblema.toLowerCase()}${especie ? ` (${especie})` : ""} en ${cultivo}, conviene buscar en dos lugares distintos y no confundirlos: ` +
      `la REM de Aapresid [R08] para antecedentes de manejo y resistencias conocidas en esa combinación cultivo-problema, y el vademécum de SENASA [R02] para la lista de productos efectivamente registrados para ese uso, con su formulación y restricciones. ` +
      `Al revisar resultados, distinguí familia química (grupo de principios activos con estructura similar) de modo de acción (cómo actúa el producto, clave para rotar y evitar resistencias) — la publicación de modos de acción de la REM [R09] ayuda a esa distinción, aunque es de 2013 y conviene contrastarla con el registro vigente.` +
      (ubicacion ? ` Si el lote está en ${ubicacion}, revisá también si hay restricciones municipales de aplicación además del registro nacional.` : ""),
    sources,
    warnings: [
      "Esta respuesta orienta dónde y cómo buscar; no es una lista cerrada de productos autorizados para tu caso, que depende del registro vigente al momento de la consulta.",
      "La publicación de modos de acción de la REM es de 2013: usala como marco conceptual, no como fuente de vigencia de registros.",
    ],
    mode: "demo",
  };
}

function handleFormSubmission(submission: FormSubmission): AssistantResponse {
  switch (submission.kind) {
    case "phyto":
      return handlePhytoFormSubmission(submission.data);
    case "soil_sampling":
      return handleSoilSamplingFormSubmission(submission.data);
    case "crop_rotation":
      return handleCropRotationFormSubmission(submission.data);
    case "product_family":
      return handleProductFamilyFormSubmission(submission.data);
  }
}

// ---------- Punto de entrada ----------

export async function respond(
  question: string,
  form?: FormSubmission
): Promise<AssistantResponse> {
  if (form) return handleFormSubmission(form);

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

  if (isCropRotationAfterHerbicideQuery(q)) return handleCropRotationInsufficientInfo();
  if (isProductFamilyGenericQuery(q)) return handleProductFamilyInsufficientInfo();
  if (isPhytoAuthorizationQuery(q)) return handlePhytoInsufficientInfo();
  if (isSoilSamplingPlanningQuery(q)) return handleSoilSamplingInsufficientInfo();
  if (isLivePriceQuery(q)) return handleLivePriceInsufficientInfo();

  return handleGroundedOrNoEvidence(trimmed);
}
