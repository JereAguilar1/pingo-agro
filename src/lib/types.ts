import { CalculationOutput } from "./calculations";
import { VerificationStatus } from "./library";

export interface SourceCardData {
  sourceCode: string;
  institution: string;
  title: string;
  date?: string;
  accessedOn?: string;
  section?: string;
  page?: string;
  exactPassage?: string;
  url?: string;
  verification: VerificationStatus;
  supports: string; // qué afirmación respalda este fragmento en esta respuesta puntual
}

export interface ProducerLote {
  id: string;
  name: string;
  hectares: number;
  crop: string;
  hybrid: string;
  plantingDate: string;
  phenology: string;
  targetYieldTonHa: number;
  soilNitrateKgHa: number;
  soilPhosphorusPpm: number;
  toscaDepthCm: number;
  rowSpacingCm: number;
  previousCrop: string;
  municipality: string;
  sensitiveZoneDistanceM?: number;
}

export interface PipelineTrace {
  step1Understand: {
    queryType: "calculation" | "rule_table" | "rag_search" | "hybrid" | "insufficient_data";
    detectedCrop: string;
    usedLoteName?: string;
    missingData: string[];
    planSummary: string;
  };
  step2Resolve: {
    codeExecuted: boolean;
    codeSummary?: string;
    ragFragmentsCount: number;
    ragSources: string[];
  };
  step3Draft: {
    engine: "local_slm" | "cloud_llm" | "deterministic_template";
    drafted: boolean;
    summary: string;
  };
  step4Verify: {
    passed: boolean;
    citationHoldsData: boolean;
    isVigent: boolean;
    abstained: boolean;
    abstentionReason?: string;
    verificationSummary: string;
  };
}

export interface StructuredShortAnswer {
  fuenteSummary: string; // 📄 Fuente
  calculoSummary?: string; // 🧮 Cálculo
  interpretacionSummary: string; // 💡 Interpretación
  abstentionBlock?: {
    neededData: string; // ⛔ "sin respaldo: necesito X"
    reason: string;
  };
}

export type ResponseKind =
  | "calculation"
  | "insufficient_info"
  | "grounded_answer"
  | "no_evidence"
  | "general";

export type ResponseMode = "demo" | "ai";

export interface UploadedDocument {
  id: string;
  title: string;
  content: string;
  uploadedAt: string;
}

export type ClarificationFormKind =
  | "phyto"
  | "soil_sampling"
  | "crop_rotation"
  | "product_family"
  | "weed_management"
  | "pest_disease_management"
  | "cultivar_selection"
  | "harvest_losses"
  | "fertilization_strategy"
  | "nutrient_balance"
  | "rental_rates"
  | "machinery_costs"
  | "freight_costs"
  | "frost_risk"
  | "application_conditions"
  | "municipality_regulations"
  | "dynamic_context";

export interface ClarificationField {
  id: string;
  label: string;
  type: "text" | "select" | "date";
  placeholder?: string;
  options?: string[]; // solo para type "select"
  required?: boolean;
}

export interface ClarificationForm {
  kind: ClarificationFormKind;
  fields: ClarificationField[];
  submitLabel?: string;
  round?: number;
  originalQuestion?: string;
  accumulatedData?: Record<string, string>;
}

export interface AssistantResponse {
  kind: ResponseKind;
  answer: string;
  calculation?: CalculationOutput;
  sources: SourceCardData[];
  warnings: string[];
  followUpQuestions?: string[];
  clarificationForm?: ClarificationForm;
  mode: ResponseMode;
  pipelineTrace?: PipelineTrace;
  structuredShort?: StructuredShortAnswer;
  agentsUsed?: ("docs" | "web" | "calc" | "verifier")[];
}

export interface FormSubmission {
  kind: ClarificationFormKind;
  data: Record<string, string>;
  round?: number;
  originalQuestion?: string;
  accumulatedData?: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  createdAt: number;
  formAnswered?: boolean;
  inputModality?: "chat" | "voice" | "photo";
  photoAttachment?: {
    name: string;
    dataUrl?: string;
    note?: string;
  };
  loteName?: string;
}
