import { doseToProduct, nitrogenContent } from "./calculations";
import { completeWithAi, isAiConfigured } from "./ai-provider";
import { retrieve } from "./retrieval";
import { getSourceByCode } from "./library";
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

function makeSourceCard(code: string, supports: string): SourceCardData {
  const f = getSourceByCode(code);
  if (!f) throw new Error(`Fuente no encontrada en library: ${code}`);
  return {
    sourceCode: f.sourceCode,
    institution: f.institution,
    title: f.title,
    date: f.date,
    accessedOn: f.accessedOn,
    section: f.section,
    url: f.url,
    verification: f.verification,
    supports,
  };
}

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

function isWeedManagementQuery(q: string): boolean {
  const asksWeed = /maleza|malezas/.test(q);
  const asksStrategy = /estrategia|manejo|complicando|campana y la siguiente|controlar/.test(q);
  return asksWeed && asksStrategy;
}

function isPestAndDiseaseQuery(q: string): boolean {
  const asksPestOrDisease = /plaga|plagas|enfermedad|enfermedades/.test(q);
  const asksMonitoring = /monitorear|etapa|interpretar lo que observo|sintoma|diagnostico/.test(q);
  return asksPestOrDisease && asksMonitoring;
}

function isCultivarSelectionQuery(q: string): boolean {
  const asksCultivar = /hibrido|hibridos|cultivar|cultivares|candidatos/.test(q);
  const asksContext = /sembrar|seleccionar|ensayos|zona|condiciones/.test(q);
  return asksCultivar && asksContext;
}

function isHarvestLossesQuery(q: string): boolean {
  const asksLosses = /perdida|perdidas/.test(q);
  const asksHarvest = /cosecha|plataforma|cola|cabezal/.test(q);
  return asksLosses && asksHarvest;
}

function isNutrientBalanceQuery(q: string): boolean {
  const asksBalance = /balance/.test(q);
  const asksNutrient = /nutriente|nutrientes|nitrogeno|fosforo|fertilizante|secuencia|cultivo/.test(q);
  return asksBalance && asksNutrient;
}

function isFertilizationStrategyQuery(q: string): boolean {
  const asksFertilization = /fertiliz|fuentes y dosis|estrategias, fuentes y dosis|estrategia de fertilizacion/.test(q);
  const asksStrategyContext = /estrategia|analisis de suelo|antecedentes|dosis|conviene evaluar|fuente/.test(q);
  return asksFertilization && asksStrategyContext;
}

function isFrostRiskQuery(q: string): boolean {
  const asksFrost = /helada|heladas/.test(q);
  const asksRiskOrForecast = /riesgo|pronostico|temperatura|informacion necesito|cultivo/.test(q);
  return asksFrost && asksRiskOrForecast;
}

function isApplicationConditionsQuery(q: string): boolean {
  const asksConditions = /tiempo previsto|ventana|condiciones|comprobar antes de empezar|momento de aplicar|puedo pulverizar/.test(q);
  const asksApplication = /aplicacion|pulverizacion|pulverizar|aplicar/.test(q);
  return asksConditions && asksApplication;
}

function isCustomLibraryQuery(q: string): boolean {
  return /papers|planillas|mis lotes|consultar mi propia biblioteca|documentos propios|cargar pdf|subir pdf|cargar archivos/.test(q);
}

function isInputNoveltiesQuery(q: string): boolean {
  const asksNovelties = /novedad|novedades|actualizado|nuevos productos|nuevas semillas/.test(q);
  const asksInputs = /insumos|semillas|fertilizantes|fitosanitarios/.test(q);
  return asksNovelties && asksInputs;
}

function isRegulationsQuery(q: string): boolean {
  const asksRegulations = /leyes|decretos|ordenanzas|normativa/.test(q);
  const asksContext = /fitosanitarios|agroquimicos|lote|aplicacion|revisar/.test(q);
  const mentionsTandilExplicitly = /tandil/.test(q);
  return asksRegulations && asksContext && !mentionsTandilExplicitly;
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
  const aboutMarket = /cereal|soja|maiz|trigo|girasol|cebada|grano|dolar|tonelada/.test(q);
  const asksCurrent = /actual|hoy|ahora|esta semana|este mes/.test(q) || !/historico|pasado/.test(q);
  return asksPrice && aboutMarket && asksCurrent;
}

function isRentalRatesQuery(q: string): boolean {
  const asksRental = /alquiler|arrendar|arrendamiento|alquilar/.test(q);
  const asksContext = /referencia|promedio|zonal|comparable|campo|lote|cuanto (esta|se paga|vale)|hectarea|soja/.test(q);
  return asksRental && asksContext;
}

function isLaborCostQuery(q: string): boolean {
  const asksLabor = /labor|labores|siembra|cosecha|pulverizacion|fertilizacion al voleo|contratista|facma/.test(q);
  const asksCost = /cuanto cuesta|costo|presupuesto|presupuestaron|tarifa|precio/.test(q);
  return asksLabor && asksCost;
}

function isFreightCostQuery(q: string): boolean {
  const asksFreight = /flete|transportar|transporte de cargas|transporte de la produccion|fatrac|camion/.test(q);
  const asksCost = /costo|tarifa|precio|estimar|comparar|cuanto (sale|cuesta|cobran)|viaje|destino/.test(q);
  return asksFreight && asksCost;
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

function handleWeedManagementInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "El manejo de una maleza problema en el lote no debe reducirse a la elección aislada de un producto o a incrementar la dosis comercial. " +
      "Para comparar estrategias sustentables para esta campaña y la siguiente, es indispensable conocer: la especie en cuestión, su estado fenológico (tamaño de la maleza), el cultivo planificado, y los antecedentes de control y fallas previas en el lote. " +
      "Con esa información se pueden contrastar alternativas de manejo integrado que combinen rotación de modos de acción de herbicidas (R09) con alertas de resistencia registradas por la REM de Aapresid (R08) y prácticas de manejo cultural.",
    sources: [
      makeSourceCard("R08", "Red de Manejo de Plagas (Aapresid): alertas de resistencia y biotipos registrados."),
      makeSourceCard("R09", "Publicación conceptual de modos de acción y familias químicas para rotación anti-resistencia."),
    ],
    warnings: [
      "No se recomienda ningún principio activo ni dosis específica sin conocer la especie y su estado de desarrollo.",
      "La publicación de modos de acción de la REM es de 2013 y debe ser complementada con los registros y marbetes vigentes de SENASA.",
    ],
    followUpQuestions: [
      "¿Cuál es la especie de maleza que está complicando el lote (ej. Amaranthus, Conyza, Sorgo de Alepo)?",
      "¿En qué estado fenológico o tamaño se encuentra la maleza?",
      "¿Para qué cultivo y campaña se planifica el manejo?",
      "¿Qué tratamientos o modos de acción se aplicaron anteriormente y qué respuesta se observó?",
    ],
    clarificationForm: {
      kind: "weed_management",
      submitLabel: "Evaluar estrategias con estos datos",
      fields: [
        { id: "especie", label: "Especie de maleza", type: "text", placeholder: "Ej. Yuyo colorado (Amaranthus), Rama negra (Conyza)", required: true },
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "estadoFenologico", label: "Estado fenológico / tamaño", type: "select", options: ["Plántula / roseta temprana (<10 cm)", "Maleza desarrollada (>15 cm)", "Floración / semillazón", "Previo a la siembra (barbecho)"], required: true },
        { id: "antecedentes", label: "Antecedentes de control", type: "text", placeholder: "Ej. Falla de control con glifosato o inhibidores de ALS" },
      ],
    },
    mode: "demo",
  };
}

function handlePestDiseaseInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para determinar qué plagas o enfermedades monitorear y cómo interpretar las observaciones a campo es imprescindible precisar el cultivo, su etapa fenológica y las condiciones o síntomas detectados. " +
      "En agronomía es fundamental diferenciar entre información general de la zona, una hipótesis preliminar de campo y un diagnóstico fitopatológico o entomológico confirmado. No se debe dar por confirmada una plaga ni decidir un tratamiento químico sin un monitoreo representativo con método y umbral económico documentado.",
    sources: [
      makeSourceCard("R08", "Red de Manejo de Plagas (REM de Aapresid): seguimiento y umbrales de plagas y enfermedades."),
    ],
    warnings: [
      "No se confirma el diagnóstico de ninguna plaga o patógeno a partir de observaciones aisladas o datos parciales.",
    ],
    followUpQuestions: [
      "¿Qué cultivo y etapa fenológica se está monitoreando?",
      "¿Qué síntomas o signos específicos se observaron en las plantas?",
      "¿En qué localidad o ambiente se encuentra el lote?",
    ],
    clarificationForm: {
      kind: "pest_disease_management",
      submitLabel: "Interpretar monitoreo con estos datos",
      fields: [
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "etapaFenologica", label: "Etapa fenológica", type: "text", placeholder: "Ej. V4-V6, floración (R1-R2), llenado de granos (R5)", required: true },
        { id: "sintomasObservados", label: "Síntomas o signos observados", type: "text", placeholder: "Ej. Manchas foliares necróticas, defoliación, presencia de chinches" },
        { id: "ubicacion", label: "Ubicación del lote", type: "text", placeholder: "Ej. Tandil" },
      ],
    },
    mode: "demo",
  };
}

function handleCultivarSelectionInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para seleccionar híbridos o cultivares adaptados a tu zona a partir de redes de ensayos, se necesita identificar el cultivo (maíz, soja, girasol, trigo), la localidad o subregión, la campaña de referencia y el objetivo del lote (potencial de rendimiento, estabilidad ambiental, ciclo de madurez o perfil sanitario). " +
      "Los resultados de una red experimental deben interpretarse conservando el contexto del ensayo: un híbrido o variedad que lideró un sitio puntual o una campaña con clima excepcional no es automáticamente la mejor opción para las condiciones edáficas y de manejo de tu lote.",
    sources: [
      makeSourceCard("R06", "Red de ensayos de maíz del sur de Buenos Aires: comparador regional por sitio y campaña."),
      makeSourceCard("R07", "RECSO (INTA–ASA): Red Nacional de Evaluación de Cultivares de Soja."),
      makeSourceCard("R27", "INTA Balcarce: Red Nacional de Cultivares de Girasol."),
    ],
    warnings: [
      "Un ranking aislado en un único ensayo o año no predice el comportamiento en tu lote: se debe evaluar estabilidad multiamiental.",
    ],
    followUpQuestions: [
      "¿Para qué cultivo buscás seleccionar candidatos (maíz, soja, girasol)?",
      "¿En qué localidad o subregión se ubica el lote?",
      "¿Qué campaña se toma como referencia?",
      "¿Cuál es el objetivo principal (máximo potencial, estabilidad en tosca, perfil sanitario)?",
    ],
    clarificationForm: {
      kind: "cultivar_selection",
      submitLabel: "Consultar ensayos con estos datos",
      fields: [
        { id: "cultivo", label: "Cultivo", type: "select", options: ["Maíz", "Soja", "Girasol", "Trigo / Cebada", "Otro"], required: true },
        { id: "localidad", label: "Localidad / Subregión", type: "text", placeholder: "Ej. Tandil, Balcarce, Necochea", required: true },
        { id: "campana", label: "Campaña de referencia", type: "text", placeholder: "Ej. 2024/2025 o 2025/2026" },
        { id: "objetivo", label: "Objetivo y manejo del lote", type: "text", placeholder: "Ej. Fecha temprana vs tardía, suelo somero de tosca, estabilidad" },
      ],
    },
    mode: "demo",
  };
}

function handleHarvestLossesInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para evaluar si las pérdidas de cosecha son elevadas y compararlas con referencias técnicas se debe identificar el cultivo, el método de medición (aros ciegos o bandeja) y las unidades calculadas en kg/ha. " +
      "Es indispensable diferenciar las pérdidas previas a la cosecha (grano caído naturalmente o desgranado por viento/helada) de las pérdidas atribuibles a la máquina, las cuales a su vez se dividen en pérdidas por plataforma (cabezal) y pérdidas por cola (trilla, separación y limpieza). " +
      "La nota técnica de INTA (R10) introduce los criterios de planificación de cosecha, pero se requiere un protocolo estandarizado de medición para cada cultivo.",
    sources: [
      makeSourceCard("R10", "Nota técnica de INTA sobre planificación de cosecha y análisis de pérdidas por plataforma y por cola."),
    ],
    warnings: [
      "No se puede diagnosticar si una pérdida es admisible sin separar la pérdida previa de precosecha de las pérdidas del cabezal y de la cola.",
    ],
    followUpQuestions: [
      "¿Qué cultivo se está cosechando?",
      "¿Qué valores de pérdida por plataforma arrojó la medición?",
      "¿Qué valores de pérdida por cola se registraron?",
      "¿Se evaluó previamente la pérdida de precosecha en el cultivo en pie?",
    ],
    clarificationForm: {
      kind: "harvest_losses",
      submitLabel: "Evaluar pérdidas con estos datos",
      fields: [
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "perdidaPlataforma", label: "Pérdida por plataforma", type: "text", placeholder: "Ej. 40 kg/ha o granos/m²" },
        { id: "perdidaCola", label: "Pérdida por cola", type: "text", placeholder: "Ej. 50 kg/ha" },
        { id: "precosechaMedida", label: "¿Se midió la pérdida de precosecha?", type: "select", options: ["Sí, medida antes de entrar con la cosechadora", "No fue medida previamente"] },
      ],
    },
    mode: "demo",
  };
}

function handleFertilizationStrategyInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para comparar estrategias, fuentes y dosis de fertilizante en un lote no se puede recetar una dosis cerrada genérica ni inventar valores faltantes. " +
      "Se requiere integrar: el cultivo planificado, el rendimiento objetivo esperado según ambiente, los resultados del análisis de suelo (nitratos en 0-20 y 20-40 cm, fósforo Bray 1, materia orgánica) y los antecedentes del lote (cultivo antecesor, rastrojo y aportes previos). " +
      "A partir de allí se contrastan los requerimientos con las curvas regionales de calibración de INTA Balcarce (R05) y la dinámica de transformación de las fuentes como la urea (R03), siguiendo métodos de muestreo representativos (R04).",
    sources: [
      makeSourceCard("R03", "Dinámica del nitrógeno en la urea y procesos de transformación en el suelo hacia formas absorbibles."),
      makeSourceCard("R04", "Metodología de muestreo de suelo y ensayos a campo de INTA para estratificación de nutrientes."),
      makeSourceCard("R05", "Laboratorio de Suelo de INTA Balcarce y redes de calibración de fertilización regional."),
    ],
    warnings: [
      "No se afirma ninguna dosis comercial de fertilizante sin contar con el análisis de suelo y las curvas de respuesta del cultivo para la zona.",
    ],
    followUpQuestions: [
      "¿Para qué cultivo y qué rendimiento objetivo se proyecta la fertilización?",
      "¿Qué valores de análisis de suelo se obtuvieron (N-NO3, P Bray, MO)?",
      "¿Cuáles son los antecedentes del lote y el cultivo antecesor?",
    ],
    clarificationForm: {
      kind: "fertilization_strategy",
      submitLabel: "Evaluar fertilización con estos datos",
      fields: [
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "rindeObjetivo", label: "Rendimiento objetivo", type: "text", placeholder: "Ej. 9 tn/ha de maíz o 4.5 tn/ha de trigo", required: true },
        { id: "analisisSuelo", label: "Resultados de análisis de suelo", type: "text", placeholder: "Ej. N-NO3: 15 ppm (0-20 cm), P Bray: 8 ppm, MO: 3.5%" },
        { id: "antecedentes", label: "Antecedentes y manejo previo", type: "text", placeholder: "Ej. Soja de primera, antecesor trigo, sin abonos" },
      ],
    },
    mode: "demo",
  };
}

function handleNutrientBalanceInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "El cálculo de un balance completo de nutrientes (entradas por fertilización, fijación biológica simbiótica, deposición atmosférica y salidas por grano cosechado, rastrojo y pérdidas) no está implementado como herramienta de cálculo determinista en este prototipo. " +
      "Surco dispone de cálculos deterministas específicos para la concentración de N y dosis de producto (como urea a partir de R03), pero no simula balances integrales con modelos no verificados. " +
      "Para orientar la estimación conceptual y ver cómo se estructuran las entradas y salidas de la secuencia, indicá el cultivo o rotación, los rendimientos y los fertilizantes aportados.",
    sources: [
      makeSourceCard("R03", "Concentración de nitrógeno en fertilizantes y transformaciones edáficas (INTA)."),
    ],
    warnings: [
      "Un balance de nutrientes completo no está implementado en este MVP: no se simulan cifras de balance neto para evitar alucinaciones numéricas.",
    ],
    followUpQuestions: [
      "¿Qué cultivo o secuencia agrícola se quiere analizar?",
      "¿Qué rendimiento se obtuvo o proyecta cosechar?",
      "¿Qué fertilizantes y dosis se aplicaron?",
      "¿Qué límites del balance se desean considerar?",
    ],
    clarificationForm: {
      kind: "nutrient_balance",
      submitLabel: "Analizar balance con estos datos",
      fields: [
        { id: "secuenciaCultivos", label: "Cultivo o secuencia", type: "text", placeholder: "Ej. Trigo / Soja 2da o Maíz continuo", required: true },
        { id: "rendimientoObtenido", label: "Rendimiento estimado / obtenido", type: "text", placeholder: "Ej. Trigo 4 tn/ha, Soja 2.5 tn/ha" },
        { id: "fertilizantesAplicados", label: "Fertilizantes aplicados y dosis", type: "text", placeholder: "Ej. 100 kg/ha urea, 80 kg/ha MAP" },
        { id: "entradasSalidas", label: "Límites del balance", type: "select", options: ["Solo extracción por grano cosechado vs fertilizante", "Balance completo con rastrojo, fijación biológica y pérdidas"] },
      ],
    },
    mode: "demo",
  };
}

function handleFrostRiskInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para evaluar el riesgo de heladas y su impacto agronómico en el cultivo se debe definir la ubicación del lote (topografía baja o alta), el cultivo, su estado fenológico y el horizonte temporal del análisis. " +
      "Es fundamental distinguir metodológicamente entre: " +
      "1) El pronóstico meteorológico oficial a corto y mediano plazo (SMN [R26] e informe Agromet semanal de INTA [R17]); " +
      "2) La medición in situ de temperatura en el lote con abrigo meteorológico o sensor a la altura del canopeo; y " +
      "3) El monitoreo satelital de temperaturas de superficie de INTA (R18), que registra eventos ya ocurridos pero no constituye un pronóstico preventivo.",
    sources: [
      makeSourceCard("R17", "INTA Agromet Semanal: evolución agrometeorológica y pronósticos de heladas zonales."),
      makeSourceCard("R18", "Información agroclimática de INTA sobre heladas a partir de temperatura superficial satelital."),
      makeSourceCard("R26", "Servicio Meteorológico Nacional: pronósticos oficiales y alertas meteorológicas."),
    ],
    warnings: [
      "Una observación satelital de heladas pasadas (R18) no anticipa un evento futuro; la susceptibilidad al daño depende críticamente de la etapa fenológica del cultivo.",
    ],
    followUpQuestions: [
      "¿En qué localidad y posición topográfica está el lote?",
      "¿Qué cultivo y estado fenológico presenta?",
      "¿Para qué ventana de días o fecha de pronóstico se evalúa el riesgo?",
    ],
    clarificationForm: {
      kind: "frost_risk",
      submitLabel: "Evaluar riesgo con estos datos",
      fields: [
        { id: "ubicacion", label: "Ubicación y relieve", type: "text", placeholder: "Ej. Tandil (zona baja / cuenca)", required: true },
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "etapaFenologica", label: "Etapa fenológica", type: "text", placeholder: "Ej. Espigazón en trigo, o emergencia de maíz" },
        { id: "fechaInteres", label: "Fecha u horizonte de interés", type: "text", placeholder: "Ej. Próximas 48-72 horas" },
      ],
    },
    mode: "demo",
  };
}

function handleApplicationConditionsInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "La determinación de una ventana para pulverizar fitosanitarios no puede reducirse a una autorización automática basada únicamente en tres variables meteorológicas (viento, temperatura y humedad). " +
      "Antes de iniciar cualquier aplicación y durante toda la labor se debe verificar: " +
      "1) El marbete oficial del producto inscripto en SENASA (R01, R02), que fija las restricciones de deriva, tamaño de gota y coadyuvantes admitidos; " +
      "2) La normativa municipal de Tandil (Ordenanza 17.404/2021 [R14] y suspensiones judiciales [R16]) y provincial (Ley 10.699 y Decreto 499/1991), que definen zonas de exclusión y distancias de amortiguamiento; " +
      "3) El pronóstico regional de INTA Agromet (R17) para anticipar frentes de tormenta o inversiones térmicas; y " +
      "4) La medición efectiva in situ en el lote con termoanemómetro al inicio y durante el trabajo, apoyándose en metodologías de monitoreo de deriva como las desarrolladas por INTA (R19).",
    sources: [
      makeSourceCard("R01", "SENASA: Registro Nacional para confirmar inscripción y clase toxicológica."),
      makeSourceCard("R02", "SENASA vademécum: consulta de marbete con restricciones específicas de aplicación."),
      makeSourceCard("R14", "Ordenanza 17.404/2021 de Tandil: distancias mínimas y zonas de amortiguamiento."),
      makeSourceCard("R17", "INTA Agromet: variables climáticas y pronóstico regional."),
      makeSourceCard("R19", "INTA: tecnologías y monitoreo continuo de pulverizaciones y deriva."),
    ],
    warnings: [
      "Surco nunca autoriza de forma automática una aplicación: la decisión técnica y legal corresponde al profesional actuante bajo receta agronómica.",
      "Las condiciones deben medirse en el lote a la altura de las pastillas: el pronóstico general nunca sustituye la medición in situ.",
    ],
    followUpQuestions: [
      "¿Qué producto fitosanitario se aplicará (nombre comercial o registro SENASA)?",
      "¿Qué cultivo y adversidad se tratará?",
      "¿Cuáles son las condiciones meteorológicas previstas (viento, humedad, temperatura)?",
      "¿Qué entorno tiene el lote (distancia a viviendas, escuelas o cursos de agua)?",
    ],
    clarificationForm: {
      kind: "application_conditions",
      submitLabel: "Evaluar aplicación con estos datos",
      fields: [
        { id: "producto", label: "Producto fitosanitario", type: "text", placeholder: "Ej. Roundup Full II", required: true },
        { id: "cultivo", label: "Cultivo", type: "select", options: CROPS, required: true },
        { id: "condicionesPrevistas", label: "Condiciones meteorológicas previstas", type: "text", placeholder: "Ej. Viento 12 km/h, Humedad 60%, Temp 20°C" },
        { id: "entornoLote", label: "Entorno del lote", type: "select", options: ["Lote agrícola extensivo estándar", "Cercano a zona urbana / periurbana", "Cercano a escuela rural o curso de agua"], required: true },
      ],
    },
    mode: "demo",
  };
}

function handleMunicipalityRegulationsInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "La biblioteca de normativa municipal de Surco en este prototipo está concentrada específicamente en el Partido de Tandil (Ordenanza 17.404/2021 [R14], Decreto 1800/2022 [R15] y suspensiones judiciales vigentes [R16]), articulada con la Ley Provincial 10.699 [R12] y Decreto 499/1991 [R13]. " +
      "Si tu lote se ubica en otro municipio de la Provincia de Buenos Aires (como Azul, Balcarce, Necochea, Olavarría), rige la normativa marco provincial pero Surco no dispone de la ordenanza municipal local correspondiente. " +
      "Para orientar la consulta, indicá el municipio donde se encuentra el lote y el tipo de aplicación que se pretende realizar.",
    sources: [
      makeSourceCard("R11", "Buscador de normativa nacional sobre fitosanitarios."),
      makeSourceCard("R12", "Ley Provincial 10.699 de protección y sanidad vegetal bonaerense."),
      makeSourceCard("R13", "Decreto Reglamentario 499/1991 de la Ley 10.699 de agroquímicos."),
      makeSourceCard("R14", "Ordenanza 17.404/2021 de la Municipalidad de Tandil."),
    ],
    warnings: [
      "Surco solo cuenta con cobertura documental municipal completa para Tandil; para otros distritos no se simulan normativas locales inexistentes.",
    ],
    followUpQuestions: [
      "¿En qué municipio o partido se encuentra el lote?",
      "¿Qué tipo de aplicación se proyecta (terrestre o aérea)?",
      "¿A qué distancia se encuentra de áreas urbanas, escuelas rurales o cursos de agua?",
    ],
    clarificationForm: {
      kind: "municipality_regulations",
      submitLabel: "Consultar normativa con estos datos",
      fields: [
        { id: "municipio", label: "Municipio / Partido", type: "text", placeholder: "Ej. Tandil, Azul, Balcarce, Necochea", required: true },
        { id: "tipoAplicacion", label: "Tipo de aplicación", type: "select", options: ["Terrestre", "Aérea", "Periurbana"] },
        { id: "distanciaZonaSensible", label: "Distancia a zonas sensibles", type: "text", placeholder: "Ej. A 200 m de casco urbano o escuela" },
      ],
    },
    mode: "demo",
  };
}

function handleInputNoveltiesInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Surco no cuenta con una conexión en tiempo real a lanzamientos comerciales ni a bases de novedades de insumos agropecuarios. " +
      "Para evaluar novedades sobre semillas, fertilizantes o fitosanitarios en tu zona, la recomendación técnica es contrastar siempre la información en dos niveles: " +
      "1) Lo comunicado por las empresas o cámaras del sector (como las fichas técnicas y guías de CASAFE [R24]), que presentan características comerciales del producto; frente a " +
      "2) La evidencia independiente generada en redes de ensayos de la región pampeana (Red de maíz [R06], RECSO soja [R07], REM de Aapresid [R08]) y la inscripción oficial vigente en el Registro Nacional de SENASA (R01). " +
      "Nunca adoptes una novedad basándote únicamente en folletos comerciales sin comprobar su registro oficial y ensayos independientes en ambientes comparables.",
    sources: [
      makeSourceCard("R01", "Registro Nacional de SENASA: para verificar que el producto o cultivar cuente con registro formal."),
      makeSourceCard("R06", "Red de ensayos de maíz del sur de Buenos Aires para comparar nuevos híbridos en la zona."),
      makeSourceCard("R07", "RECSO Soja: evaluación independiente de cultivares."),
      makeSourceCard("R08", "REM (Aapresid): seguimiento independiente de biotipos y resistencia en fitosanitarios."),
      makeSourceCard("R24", "CASAFE: guía técnica institucional de productos de la industria fitosanitaria."),
    ],
    warnings: [
      "No se dispone de feed en tiempo real de novedades: la información comercial debe contrastarse con registros oficiales y ensayos independientes.",
    ],
    followUpQuestions: [
      "¿Sobre qué tipo de insumo (semilla, fertilizante o fitosanitario) buscás referencias?",
      "¿Para qué cultivo y zona geográfica?",
    ],
    mode: "demo",
  };
}

function handleCustomLibraryGeneral(): AssistantResponse {
  return {
    kind: "general",
    answer:
      "La función de cargar y procesar documentos propios (archivos PDF, planillas de campo, análisis de suelo o ensayos privados) está fuera de alcance en este prototipo MVP de Surco. " +
      "Para este prototipo, toda la evidencia proviene de la biblioteca documental curada y verificada versionada en el repositorio. " +
      "Mientras tanto, podés copiar y pegar el fragmento o los datos textuales de tu ensayo o análisis directamente en el chat para que podamos analizarlos en conjunto con las fuentes oficiales disponibles.",
    sources: [],
    warnings: [
      "No es posible subir archivos locales en este MVP: pegá los datos relevantes como texto en el mensaje.",
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

function handleRentalRatesInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Surco no dispone de una serie representativa de alquileres rurales ni publica promedios zonales para Tandil y la región. " +
      "Los valores de arrendamiento varían ampliamente según la aptitud del lote (agrícola pura, mixta o ganadera), la campaña, el tipo de contrato (quintales fijos, porcentaje o monto en dinero) y los antecedentes de manejo. " +
      "Para evaluar referencias comparables, completá los datos del lote para orientar la consulta hacia publicaciones de grupos CREA de la zona o fuentes profesionales locales.",
    sources: [
      makeSourceCard(
        "R25",
        "Referencia institucional de CREA para consultar relevamientos y metodologías de márgenes agrícolas zonales."
      ),
    ],
    warnings: [
      "No se proporciona ningún valor en $/ha ni quintales fijos por hectárea: Surco no cuenta con una muestra representativa de alquileres para validar un promedio zonal.",
    ],
    followUpQuestions: [
      "¿Para qué campaña agrícola buscás la referencia?",
      "¿Qué aptitud tiene el campo (agrícola, mixto o ganadero)?",
      "¿En qué localidad o subzona se encuentra el lote?",
      "¿Qué modalidad de pago se está evaluando (quintales de soja, porcentaje o dinero)?",
    ],
    clarificationForm: {
      kind: "rental_rates",
      submitLabel: "Consultar referencias con estos datos",
      fields: [
        { id: "campana", label: "Campaña agrícola", type: "text", placeholder: "Ej. 2026/2027", required: true },
        { id: "aptitud", label: "Aptitud del campo", type: "select", options: ["Agrícola pura", "Mixta", "Ganadera"], required: true },
        { id: "ubicacion", label: "Localidad / Zona", type: "text", placeholder: "Ej. Tandil (Gardey / La Pastora)" },
        { id: "modalidad", label: "Modalidad de pago", type: "select", options: ["Quintales fijos (soja)", "Porcentaje a cosecha", "Pesos / Dólares fijos"] },
      ],
    },
    mode: "demo",
  };
}

function handleLaborCostInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para evaluar el costo de una labor agrícola y determinar qué incluye el valor presupuestado, se requiere especificar el tipo de labor, la escala (superficie), la ubicación y las condiciones del combustible. " +
      "La Federación Argentina de Contratistas de Maquinaria Agrícola (FACMA) publica tarifas orientativas de referencia, pero un presupuesto efectivo depende de los acuerdos entre las partes y de la logística de la labor.",
    sources: [
      makeSourceCard(
        "R22",
        "Precios orientativos de labores agrícolas publicados por FACMA (referencia de contratistas)."
      ),
    ],
    warnings: [
      "Una tabla orientativa no constituye una cotización cerrada: el costo final varía según tamaño del lote, provisión de gasoil y estado del suelo.",
    ],
    followUpQuestions: [
      "¿Qué labor específica necesitás evaluar (siembra, pulverización, cosecha, fertilización)?",
      "¿Cuál es la superficie aproximada a trabajar?",
      "¿El combustible está a cargo del contratista o del productor?",
      "¿En qué localidad o zona se realizará el trabajo?",
    ],
    clarificationForm: {
      kind: "machinery_costs",
      submitLabel: "Evaluar labor con estos datos",
      fields: [
        { id: "labor", label: "Tipo de labor", type: "select", options: ["Siembra directa", "Pulverización terrestre", "Cosecha de granos", "Fertilización al voleo", "Otra labor"], required: true },
        { id: "superficie", label: "Superficie a trabajar (ha)", type: "text", placeholder: "Ej. 120 ha", required: true },
        { id: "combustible", label: "Gasoil / Combustible", type: "select", options: ["Incluido por contratista", "A cargo del productor", "A convenir"], required: true },
        { id: "ubicacion", label: "Ubicación del lote", type: "text", placeholder: "Ej. Tandil" },
      ],
    },
    mode: "demo",
  };
}

function handleFreightCostInsufficientInfo(): AssistantResponse {
  return {
    kind: "insufficient_info",
    answer:
      "Para estimar y comparar el costo de transporte de la producción se necesita identificar el origen, destino, distancia en kilómetros y tipo de carga. " +
      "La Federación Argentina de Transportadores de Cargas (FATRAC) publica tablas orientativas de tarifas de flete agrícola por kilómetro, pero la cotización efectiva depende de adicionales como estadías, caminos de tierra y disponibilidad en época de cosecha.",
    sources: [
      makeSourceCard(
        "R23",
        "Tarifas orientativas de transporte automotor de cargas de FATRAC."
      ),
    ],
    warnings: [
      "Una tabla orientativa no garantiza que un transportista acepte el viaje por ese valor: hay que confirmar disponibilidad y adicionales con el fletero.",
    ],
    followUpQuestions: [
      "¿Cuál es el lugar de origen (campo o localidad)?",
      "¿Cuál es el destino (puerto de Quequén, Bahía Blanca, acopio local)?",
      "¿Distancia estimada en kilómetros?",
      "¿Qué tipo de grano o producto se transporta?",
    ],
    clarificationForm: {
      kind: "freight_costs",
      submitLabel: "Consultar tarifa con estos datos",
      fields: [
        { id: "origen", label: "Origen (campo o localidad)", type: "text", placeholder: "Ej. Tandil", required: true },
        { id: "destino", label: "Destino", type: "select", options: ["Puerto Necochea (Quequén)", "Puerto Bahía Blanca", "Acopio local / Planta Tandil", "Otro destino"], required: true },
        { id: "distanciaKm", label: "Distancia estimada (km)", type: "text", placeholder: "Ej. 180 km" },
        { id: "tipoCarga", label: "Tipo de carga", type: "select", options: ["Cereal / Oleaginosa a granel", "Semilla / Fertilizante embolsado", "Otro"] },
      ],
    },
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

function handleRentalRatesFormSubmission(data: Record<string, string>): AssistantResponse {
  const campana = data.campana || "la campaña solicitada";
  const aptitud = data.aptitud || "el campo";
  const ubicacion = data.ubicacion?.trim() || "Tandil y zona";
  const modalidad = data.modalidad || "la modalidad indicada";

  return {
    kind: "grounded_answer",
    answer:
      `Para ${aptitud.toLowerCase()} en ${ubicacion} durante ${campana} bajo ${modalidad.toLowerCase()}, no es posible afirmar un promedio zonal de alquiler sin incurrir en estimaciones no representativas. ` +
      `Las referencias disponibles corresponden a relevamientos zonales de grupos CREA [R25], que reflejan condiciones y márgenes de empresas asociadas pero no constituyen una cotización vinculante para todos los lotes. ` +
      `El paso técnico recomendado es contrastar el margen bruto proyectado del cultivo con presupuestos de inmobiliarias rurales locales y contratos de referencia registrados por ingenieros agrónomos de la zona.`,
    sources: [
      makeSourceCard(
        "R25",
        "Relevamientos económicos y márgenes agrícolas orientativos de CREA para la región pampeana sur."
      ),
    ],
    warnings: [
      "Surco no publica valores numéricos de alquiler: cualquier cifra aislada de oferta debe contrastarse en el mercado local.",
    ],
    mode: "demo",
  };
}

function handleMachineryCostsFormSubmission(data: Record<string, string>): AssistantResponse {
  const labor = data.labor || "la labor";
  const superficie = data.superficie || "la superficie indicada";
  const combustible = data.combustible || "condiciones a convenir";
  const ubicacion = data.ubicacion?.trim() || "la zona";

  return {
    kind: "grounded_answer",
    answer:
      `Para ${labor} en ${ubicacion} sobre ${superficie} con combustible ${combustible.toLowerCase()}, la referencia institucional de base es la tabla de precios orientativos de FACMA [R22]. ` +
      `Al comparar un presupuesto con la guía de FACMA es fundamental verificar: si el precio cotizado contempla el gasoil (o precio base de combustible pactado), el ancho de labor y tipo de dosificador o botalón, el traslado de maquinaria hasta el campo y las penalizaciones por demora o condiciones de piso. ` +
      `La tarifa de FACMA sirve como guía orientativa de costos directos, pero la tarifa real debe ser acordada contractualmente con el contratista interviniente.`,
    sources: [
      makeSourceCard(
        "R22",
        "FACMA — Guía orientativa de tarifas de labores agrícolas y estructura de costos de maquinaria."
      ),
    ],
    warnings: [
      "Los valores orientativos de FACMA no obligan al prestador ni reemplazan el presupuesto formal por escrito.",
    ],
    mode: "demo",
  };
}

function handleFreightCostsFormSubmission(data: Record<string, string>): AssistantResponse {
  const origen = data.origen || "origen";
  const destino = data.destino || "destino";
  const distancia = data.distanciaKm ? `${data.distanciaKm} km` : "la distancia estimada";
  const carga = data.tipoCarga || "carga general";

  return {
    kind: "grounded_answer",
    answer:
      `Para el transporte de ${carga.toLowerCase()} desde ${origen} hasta ${destino} (aprox. ${distancia}), la referencia tarifaria oficial u orientativa de partida es el cuadro de tarifas de FATRAC [R23]. ` +
      `Para estimar y comparar el costo efectivo del viaje tené en cuenta: la tarifa por tonelada/kilómetro de la escala de distancia correspondiente, los kilómetros adicionales por tramos de tierra, el tiempo libre de espera en balanza y las tarifas de estadía en puerto o planta de acopio. ` +
      `La tabla de FATRAC permite calcular un costo orientativo de referencia, pero la confirmación del flete requiere la cotización directa del transportista o centro de transporte local.`,
    sources: [
      makeSourceCard(
        "R23",
        "FATRAC — Tarifas orientativas de referencia por distancia para el transporte automotor de cargas."
      ),
    ],
    warnings: [
      "La tarifa orientativa no incluye posibles cargos por estadía prolongada, desvíos ni condiciones especiales de descarga en terminales portuarias.",
    ],
    mode: "demo",
  };
}

function handleWeedManagementFormSubmission(data: Record<string, string>): AssistantResponse {
  const especie = data.especie?.trim() || "la maleza identificada";
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const estado = data.estadoFenologico?.trim() || "el estado fenológico indicado";
  const antecedentes = data.antecedentes?.trim() || "sin antecedentes especificados";

  return {
    kind: "grounded_answer",
    answer:
      `Para el manejo de ${especie} en ${cultivo} (estado: ${estado.toLowerCase()}, antecedentes: ${antecedentes.toLowerCase()}), el enfoque agronómico no consiste únicamente en cambiar de producto sino en un programa integrado de doble golpe, rotación estricta de modos de acción y control cultural. ` +
      `La REM de Aapresid [R08] registra los biotipos con resistencia simple o múltiple confirmada en la región pampeana, permitiendo descartar familias químicas con pérdida de eficacia reportada en la zona. ` +
      `Para evitar seleccionar resistencias adicionales, es necesario consultar la guía de modos de acción de la REM [R09] para combinar herbicidas con sitios de acción diferentes (como preemergentes residuales con modo de acción alternativo) y verificar en el vademécum de SENASA [R02] que la mezcla y uso estén expresamente aprobados en marbete.`,
    sources: [
      makeSourceCard("R08", "REM (Aapresid): alertas de resistencia y biotipos registrados por maleza y zona."),
      makeSourceCard("R09", "Clasificación de familias químicas y modos de acción de la REM."),
      makeSourceCard("R02", "Vademécum de SENASA para verificar marbete y usos autorizados."),
    ],
    warnings: [
      "Esta orientación describe criterios técnicos y fuentes de consulta; la prescripción concreta de aplicación debe ser formulada mediante receta agronómica por un profesional habilitado.",
      "La publicación de modos de acción de la REM es de 2013 y debe contrastarse con registros y marbetes vigentes.",
    ],
    mode: "demo",
  };
}

function handlePestDiseaseFormSubmission(data: Record<string, string>): AssistantResponse {
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const etapa = data.etapaFenologica?.trim() || "la etapa del cultivo";
  const sintomas = data.sintomasObservados?.trim() || "observaciones a campo";
  const ubicacion = data.ubicacion?.trim();

  return {
    kind: "grounded_answer",
    answer:
      `En ${cultivo} durante la etapa ${etapa}${ubicacion ? ` en ${ubicacion}` : ""}, las observaciones registradas (${sintomas}) deben procesarse diferenciando estrictamente una hipótesis de campo de un diagnóstico confirmado. ` +
      `La Red de Manejo de Plagas (REM de Aapresid) [R08] y las guías de monitoreo del INTA ofrecen pautas sobre la dinámica de insectos y patógenos prevalentes en el sur bonaerense, junto con umbrales de daño económico (UDE) validados. ` +
      `Para insectos, se recomienda muestreo sistemático (paño vertical o conteo directo por metro lineal) en varios puntos del lote; para enfermedades de fin de ciclo o manchas foliares, cuantificar incidencia y severidad foliar antes de considerar una aplicación de fungicida o insecticida registrada en SENASA [R02].`,
    sources: [
      makeSourceCard("R08", "REM (Aapresid): relevamiento de plagas e insectos resistentes y guías de monitoreo."),
      makeSourceCard("R02", "SENASA: buscador público para corroborar productos registrados y marbete del cultivo."),
    ],
    warnings: [
      "No se confirma diagnóstico fitopatológico ni se prescribe tratamiento químico sin una muestra representativa con protocolo de monitoreo.",
    ],
    mode: "demo",
  };
}

function handleCultivarSelectionFormSubmission(data: Record<string, string>): AssistantResponse {
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const localidad = data.localidad?.trim() || "la zona";
  const campana = data.campana?.trim();
  const objetivo = data.objetivo?.trim() || "rendimiento y adaptación";

  const isMaiz = /ma[ií]z/i.test(cultivo);
  const isSoja = /soja/i.test(cultivo);
  const isGirasol = /girasol/i.test(cultivo);

  const sources: SourceCardData[] = [];
  if (isMaiz) {
    sources.push(makeSourceCard("R06", "Red de Ensayos de Maíz del Sur de Buenos Aires: comparación por sitio y manejo."));
  } else if (isSoja) {
    sources.push(makeSourceCard("R07", "RECSO (INTA–ASA): Red Nacional de Evaluación de Cultivares de Soja."));
  } else if (isGirasol) {
    sources.push(makeSourceCard("R27", "INTA Balcarce: Red Nacional de Cultivares de Girasol."));
  } else {
    sources.push(
      makeSourceCard("R06", "Red de ensayos de maíz del sur bonaerense."),
      makeSourceCard("R07", "RECSO Soja (INTA–ASA)."),
      makeSourceCard("R27", "Red Nacional de Girasol (INTA Balcarce).")
    );
  }

  return {
    kind: "grounded_answer",
    answer:
      `Para seleccionar candidatos de ${cultivo} en ${localidad}${campana ? ` (campaña ${campana})` : ""} con foco en ${objetivo}, la consulta debe dirigirse a las redes de evaluación comparativa independientes. ` +
      `En maíz, la Red de Ensayos del Sur de Buenos Aires [R06] compara híbridos por sitio, fecha de siembra y manejo hídrico; en soja, la RECSO (INTA–ASA) [R07] evalúa cultivares por subregión y grupo de madurez; y en girasol, la Red Nacional de Cultivares de INTA Balcarce [R27] aporta datos de rendimiento y contenido de aceite. ` +
      `Al analizar los informes, priorizá la estabilidad de rendimiento a través de múltiples campañas y sitios con ambientes similares al tuyo (por ejemplo, suelos con tosca o limitaciones de profundidad típicos de Tandil), en lugar de guiarte únicamente por el cultivar ganador del ranking en un ensayo individual.`,
    sources,
    warnings: [
      "Distinguí siempre el ranking de un sitio experimental aislado de la selección final para tu lote y ambiente edáfico.",
    ],
    mode: "demo",
  };
}

function handleHarvestLossesFormSubmission(data: Record<string, string>): AssistantResponse {
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const plataforma = data.perdidaPlataforma?.trim() || "no informada";
  const cola = data.perdidaCola?.trim() || "no informada";
  const precosecha = data.precosechaMedida || "no evaluada previamente";

  return {
    kind: "grounded_answer",
    answer:
      `Para evaluar las pérdidas en ${cultivo} (plataforma: ${plataforma}, cola: ${cola}, precosecha: ${precosecha.toLowerCase()}), la referencia técnica de partida es el protocolo de medición y tolerancia de cosecha del INTA [R10]. ` +
      `Es crucial recordar que las pérdidas totales de máquina surgen de descontar la pérdida de precosecha previa. Si la pérdida de plataforma es la dominante, las causas más frecuentes residen en la velocidad de avance, la altura de corte, las revoluciones y posición del molinete, o el estado de las cuchillas. ` +
      `Si la pérdida elevada se produce por cola, corresponde revisar la regulación del régimen del cilindro/rotor, la apertura del cóncavo, la regulación de zarandas y el caudal de viento del ventilador según la humedad del grano al momento de trilla.`,
    sources: [
      makeSourceCard("R10", "Nota técnica de INTA sobre planificación de cosecha y calibración de pérdidas."),
    ],
    warnings: [
      "Los umbrales admisibles de pérdida varían según cultivo y rinde esperado; se requiere utilizar aros ciegos estandarizados para validar las mediciones.",
    ],
    mode: "demo",
  };
}

function handleFertilizationStrategyFormSubmission(data: Record<string, string>): AssistantResponse {
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const rinde = data.rindeObjetivo?.trim() || "el rinde objetivo previsto";
  const analisis = data.analisisSuelo?.trim() || "los análisis disponibles";
  const antecedentes = data.antecedentes?.trim() || "sin antecedentes adicionales";

  return {
    kind: "grounded_answer",
    answer:
      `Para ${cultivo} con un rinde objetivo de ${rinde} en base a los análisis aportados (${analisis}, antecesor: ${antecedentes}), la determinación de la fertilización debe apoyarse en las curvas de respuesta y modelos de diagnóstico regional del INTA Balcarce [R05]. ` +
      `En nitrógeno, el criterio validado para el sur bonaerense utiliza umbrales de N disponible a la siembra (N suelo medido a 0-60 cm más N fertilizante) por tonelada de grano objetivo, considerando la concentración y eficiencia de fuentes como urea [R03]. ` +
      `En fósforo, se compara el valor de P Bray con el nivel crítico del cultivo (generalmente entre 12 y 16 ppm según cultivo y tipo de suelo) para definir si la estrategia es de suficiencia o de enriquecimiento/mantenimiento. ` +
      `Para afinar la dosis definitiva se recomienda contrastar con ensayos locales de fertilización y ajustar según humedad inicial del perfil.`,
    sources: [
      makeSourceCard("R03", "Dinámica del nitrógeno en la urea y procesos edáficos de disponibilidad."),
      makeSourceCard("R05", "INTA Balcarce: calibración agronómica regional de fertilidad y requerimientos."),
    ],
    warnings: [
      "Esta respuesta proporciona el marco conceptual de diagnóstico de INTA; la dosis final de aplicación debe ser avalada por el ingeniero agrónomo responsable del lote.",
    ],
    mode: "demo",
  };
}

function handleNutrientBalanceFormSubmission(data: Record<string, string>): AssistantResponse {
  const secuencia = data.secuenciaCultivos?.trim() || "la secuencia";
  const rinde = data.rendimientoObtenido?.trim() || "rendimientos no especificados";
  const fertilizantes = data.fertilizantesAplicados?.trim() || "aportes informados";
  const limites = data.entradasSalidas?.trim() || "los límites analizados";

  return {
    kind: "grounded_answer",
    answer:
      `Para la secuencia ${secuencia} con rendimientos de ${rinde} y fertilización de ${fertilizantes} (${limites.toLowerCase()}), recordamos que Surco no calcula automáticamente un balance integral de nutrientes en este prototipo para evitar estimaciones no contrastadas. ` +
      `Desde el punto de vista conceptual y metodológico respaldado por INTA [R03], se debe distinguir claramente entre: ` +
      `1) La demanda total de nutrientes para construir biomasa; 2) La extracción o exportación neta que sale del lote en los granos cosechados; y 3) La reposición efectiva mediante fertilizantes. ` +
      `Para calcular el balance de nitrógeno podés usar las conversiones exactas de urea disponibles en Surco (46% N) y contrastar las toneladas cosechadas con los índices de cosecha de nutrientes publicados por INTA para cada especie.`,
    sources: [
      makeSourceCard("R03", "Transformación del nitrógeno de la urea y concentración elemental de nutrientes (INTA)."),
    ],
    warnings: [
      "Este cálculo no simula balances de masa complejos ni coeficientes de fijación de nitrógeno: remitite a las tablas de extracción oficiales de INTA para los índices por tonelada.",
    ],
    mode: "demo",
  };
}

function handleFrostRiskFormSubmission(data: Record<string, string>): AssistantResponse {
  const ubicacion = data.ubicacion?.trim() || "la zona";
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const etapa = data.etapaFenologica?.trim() || "etapa vegetativa/reproductiva";
  const fecha = data.fechaInteres?.trim() || "las próximas horas";

  return {
    kind: "grounded_answer",
    answer:
      `Para evaluar el riesgo de heladas en ${ubicacion} para ${cultivo} en ${etapa} (${fecha}), la determinación técnica requiere cruzar el pronóstico agrometeorológico con la susceptibilidad fenológica. ` +
      `Consultá el pronóstico del SMN [R26] para chequear alertas de temperatura bajo cero y viento en calma, y el informe Agromet Semanal de INTA [R17] para tendencias agrometeorológicas regionales. ` +
      `Si el cultivo se encuentra en etapas reproductivas críticas (como floración o llenado inicial), umbrales térmicos cercanos a 0°C a nivel de abrigo meteorológico pueden generar temperaturas bajo cero a ras del suelo y provocar daño irreversible en espigas o vainas. ` +
      `Recordá que los mapas satelitales de heladas del INTA [R18] son útiles para verificar la intensidad espacial de eventos térmicos ya ocurridos, pero la prevención exige monitoreo termométrico directo en el lote.`,
    sources: [
      makeSourceCard("R17", "INTA Agromet: informes agrometeorológicos y balance de agua y temperatura."),
      makeSourceCard("R18", "INTA Heladas: mapas de temperatura superficial para seguimiento post-evento."),
      makeSourceCard("R26", "SMN: fuente oficial de pronóstico numérico y alertas tempranas en Argentina."),
    ],
    warnings: [
      "No se confirma ni descarta una helada puntual sin el pronóstico local oficial del día y la medición in situ de temperatura.",
    ],
    mode: "demo",
  };
}

function handleApplicationConditionsFormSubmission(data: Record<string, string>): AssistantResponse {
  const producto = data.producto?.trim() || "el producto";
  const cultivo = data.cultivo?.trim() || "el cultivo";
  const condiciones = data.condicionesPrevistas?.trim() || "las condiciones indicadas";
  const entorno = data.entornoLote || "el lote";

  return {
    kind: "grounded_answer",
    answer:
      `Para la aplicación de ${producto} en ${cultivo} bajo ${condiciones} en ${entorno.toLowerCase()}, no se debe dar una autorización automática. ` +
      `Primero es imperativo revisar el marbete de ${producto} en el vademécum de SENASA [R02] para verificar el tamaño de gota sugerido, velocidad de viento máxima admitida y adyuvantes recomendados. ` +
      `Segundo, comprobar la normativa local de Tandil [R14, R16] y provincial [R12, R13]: si el lote se encuentra próximo a escuelas rurales, cursos de agua o zonas periurbanas, rigen distancias mínimas de amortiguamiento y receta agronómica obligatoria. ` +
      `Tercero, durante la labor es obligatorio realizar mediciones continuas in situ con termoanemómetro para constatar viento (generalmente entre 5 y 15 km/h, evitando tanto ráfagas excesivas como calma total por riesgo de inversión térmica) y Delta T (entre 2 y 8), incorporando pautas de monitoreo y telemetría de deriva como las del INTA [R19].`,
    sources: [
      makeSourceCard("R02", "SENASA: marbete oficial y restricciones de pulverización."),
      makeSourceCard("R14", "Ordenanza Tandil 17.404/2021: zonas de amortiguamiento y protección ambiental."),
      makeSourceCard("R19", "INTA: monitoreo remoto y control de deriva en pulverizaciones agrícolas."),
    ],
    warnings: [
      "No existe ventana de aplicación válida si no se verifica el marbete y la normativa de distancias vigente en Tandil.",
      "La medición con termoanemómetro debe realizarse en el lote a la altura del botalón antes y durante la labor.",
    ],
    mode: "demo",
  };
}

function handleMunicipalityRegulationsFormSubmission(data: Record<string, string>): AssistantResponse {
  const municipio = data.municipio?.trim() || "";
  const tipo = data.tipoAplicacion || "terrestre";
  const distancia = data.distanciaZonaSensible?.trim() || "no especificada";

  const isTandil = /tandil/i.test(municipio);

  if (isTandil) {
    return {
      kind: "grounded_answer",
      answer:
        `Para aplicaciones en el Partido de Tandil (${tipo.toLowerCase()}, distancia a zonas sensibles: ${distancia}), la normativa aplicable exige una lectura conjunta de varias normas escalonadas en el tiempo: ` +
        `1) A nivel provincial, la Ley 10.699 [R12] y el Decreto Reglamentario 499/1991 [R13] exigen receta agronómica obligatoria suscripta por un ingeniero agrónomo matriculado y habilitación del equipo de aplicación; ` +
        `2) A nivel municipal, la Ordenanza 17.404/2021 [R14] y el Decreto Reglamentario 1800/2022 [R15] establecen las zonas de amortiguamiento y condiciones de pulverización; ` +
        `3) Es indispensable considerar el Decreto 423/2026 [R16], que notificó la suspensión judicial precautoria temporal del artículo 8 de la ordenanza. ` +
        `Por lo tanto, no alcanza con leer una sola norma histórica: hay que contrastar los artículos con las medidas cautelares y reglamentaciones vigentes.`,
      sources: [
        makeSourceCard("R12", "Ley Provincial 10.699: marco regulatorio bonaerense de agroquímicos."),
        makeSourceCard("R13", "Decreto Reglamentario 499/1991: receta agronómica y equipos."),
        makeSourceCard("R14", "Ordenanza Tandil 17.404/2021: regulación municipal de fitosanitarios."),
        makeSourceCard("R15", "Decreto Tandil 1800/2022: reglamentación de la Ordenanza 17.404."),
        makeSourceCard("R16", "Decreto Tandil 423/2026: suspensión cautelar judicial del art. 8."),
      ],
      warnings: [
        "Las disposiciones judiciales y decretos modificatorios pueden alterar artículos puntuales: verificar el estado vigente con la Dirección de Medio Ambiente de Tandil.",
      ],
      mode: "demo",
    };
  }

  return {
    kind: "grounded_answer",
    answer:
      `La biblioteca documental de Surco en este prototipo solo cubre la normativa municipal del Partido de Tandil; no dispone de las ordenanzas locales vigentes para ${municipio}. ` +
      `En todo el territorio de la Provincia de Buenos Aires rige la Ley Provincial 10.699 [R12] y su Decreto Reglamentario 499/1991 [R13], que obligan a contar con receta agronómica y operarios habilitados. ` +
      `Para conocer las restricciones puntuales, distancias de amortiguamiento y zonas de exclusión en ${municipio}, debés consultar directamente el digesto municipal o el área de producción/medio ambiente de ese municipio.`,
    sources: [
      makeSourceCard("R12", "Ley Provincial 10.699 de la Provincia de Buenos Aires."),
      makeSourceCard("R13", "Decreto Reglamentario 499/1991 bonaerense."),
    ],
    warnings: [
      `No se detalla la ordenanza municipal de ${municipio}: Surco declara explícitamente la falta de cobertura local para evitar inventar restricciones no verificadas.`,
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
    case "weed_management":
      return handleWeedManagementFormSubmission(submission.data);
    case "pest_disease_management":
      return handlePestDiseaseFormSubmission(submission.data);
    case "cultivar_selection":
      return handleCultivarSelectionFormSubmission(submission.data);
    case "harvest_losses":
      return handleHarvestLossesFormSubmission(submission.data);
    case "fertilization_strategy":
      return handleFertilizationStrategyFormSubmission(submission.data);
    case "nutrient_balance":
      return handleNutrientBalanceFormSubmission(submission.data);
    case "rental_rates":
      return handleRentalRatesFormSubmission(submission.data);
    case "machinery_costs":
      return handleMachineryCostsFormSubmission(submission.data);
    case "freight_costs":
      return handleFreightCostsFormSubmission(submission.data);
    case "frost_risk":
      return handleFrostRiskFormSubmission(submission.data);
    case "application_conditions":
      return handleApplicationConditionsFormSubmission(submission.data);
    case "municipality_regulations":
      return handleMunicipalityRegulationsFormSubmission(submission.data);
    default:
      throw new Error(`Tipo de formulario no soportado: ${(submission as { kind: string }).kind}`);
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

  if (isCustomLibraryQuery(q)) return handleCustomLibraryGeneral();
  if (isCropRotationAfterHerbicideQuery(q)) return handleCropRotationInsufficientInfo();
  if (isProductFamilyGenericQuery(q)) return handleProductFamilyInsufficientInfo();
  if (isPhytoAuthorizationQuery(q)) return handlePhytoInsufficientInfo();
  if (isApplicationConditionsQuery(q)) return handleApplicationConditionsInsufficientInfo();
  if (isFrostRiskQuery(q)) return handleFrostRiskInsufficientInfo();
  if (isWeedManagementQuery(q)) return handleWeedManagementInsufficientInfo();
  if (isPestAndDiseaseQuery(q)) return handlePestDiseaseInsufficientInfo();
  if (isCultivarSelectionQuery(q)) return handleCultivarSelectionInsufficientInfo();
  if (isHarvestLossesQuery(q)) return handleHarvestLossesInsufficientInfo();
  if (isNutrientBalanceQuery(q)) return handleNutrientBalanceInsufficientInfo();
  if (isFertilizationStrategyQuery(q)) return handleFertilizationStrategyInsufficientInfo();
  if (isSoilSamplingPlanningQuery(q)) return handleSoilSamplingInsufficientInfo();
  if (isRegulationsQuery(q)) return handleMunicipalityRegulationsInsufficientInfo();
  if (isInputNoveltiesQuery(q)) return handleInputNoveltiesInsufficientInfo();
  if (isRentalRatesQuery(q)) return handleRentalRatesInsufficientInfo();
  if (isLaborCostQuery(q)) return handleLaborCostInsufficientInfo();
  if (isFreightCostQuery(q)) return handleFreightCostInsufficientInfo();
  if (isLivePriceQuery(q)) return handleLivePriceInsufficientInfo();

  return handleGroundedOrNoEvidence(trimmed);
}
