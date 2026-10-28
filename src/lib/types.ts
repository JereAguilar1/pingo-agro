import { CalculationOutput } from "./calculations";
import { VerificationStatus } from "./library";

export interface SourceCardData {
  sourceCode: string;
  institution: string;
  title: string;
  date?: string;
  accessedOn?: string;
  section?: string;
  url?: string;
  verification: VerificationStatus;
  supports: string; // qué afirmación respalda este fragmento en esta respuesta puntual
}

export type ResponseKind =
  | "calculation"
  | "insufficient_info"
  | "grounded_answer"
  | "no_evidence"
  | "general";

export type ResponseMode = "demo" | "ai";

export type ClarificationFormKind = "phyto" | "soil_sampling" | "crop_rotation";

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
}

export interface FormSubmission {
  kind: ClarificationFormKind;
  data: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  createdAt: number;
  formAnswered?: boolean;
}
