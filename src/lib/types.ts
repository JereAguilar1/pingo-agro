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

export interface AssistantResponse {
  kind: ResponseKind;
  answer: string;
  calculation?: CalculationOutput;
  sources: SourceCardData[];
  warnings: string[];
  followUpQuestions?: string[];
  mode: ResponseMode;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: AssistantResponse;
  createdAt: number;
}
