import { NextRequest, NextResponse } from "next/server";
import { respond } from "@/lib/respond";
import { isAiConfigured } from "@/lib/ai-provider";
import { ClarificationFormKind, FormSubmission } from "@/lib/types";

const FORM_KINDS: ClarificationFormKind[] = [
  "phyto",
  "soil_sampling",
  "crop_rotation",
  "product_family",
  "weed_management",
  "pest_disease_management",
  "cultivar_selection",
  "harvest_losses",
  "fertilization_strategy",
  "nutrient_balance",
  "rental_rates",
  "machinery_costs",
  "freight_costs",
  "frost_risk",
  "application_conditions",
  "municipality_regulations",
];

function parseFormSubmission(body: unknown): FormSubmission | undefined {
  const raw = (body as { form?: unknown })?.form;
  if (!raw || typeof raw !== "object") return undefined;
  const kind = (raw as { kind?: unknown }).kind;
  const data = (raw as { data?: unknown }).data;
  if (typeof kind !== "string" || !FORM_KINDS.includes(kind as ClarificationFormKind)) return undefined;
  if (!data || typeof data !== "object") return undefined;
  const cleanData: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === "string") cleanData[key] = value.slice(0, 500);
  }
  return { kind: kind as ClarificationFormKind, data: cleanData };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  const question = (body as { question?: unknown })?.question;
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json(
      { error: "Falta el campo 'question' (texto no vacío)." },
      { status: 400 }
    );
  }

  if (question.length > 4000) {
    return NextResponse.json(
      { error: "La consulta es demasiado larga (máximo 4000 caracteres)." },
      { status: 400 }
    );
  }

  const form = parseFormSubmission(body);

  try {
    const result = await respond(question, form);
    return NextResponse.json({ response: result, aiConfigured: isAiConfigured() });
  } catch (err) {
    console.error("Error procesando la consulta:", err);
    return NextResponse.json(
      { error: "Ocurrió un error procesando la consulta. Probá de nuevo." },
      { status: 500 }
    );
  }
}
