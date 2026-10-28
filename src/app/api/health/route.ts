import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai-provider";
import { LIBRARY } from "@/lib/library";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured: isAiConfigured(),
    librarySize: LIBRARY.length,
    timestamp: new Date().toISOString(),
  });
}
