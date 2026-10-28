// 📚 Sub-Agente Documental (DocsSubAgent):
// Busca en la documentación cargada por el usuario (archivos propios) y en la biblioteca
// oficial verificada (INTA, SENASA, Aapresid, Normativa Tandil, Fichas Maíz).

import { SourceCardData, UploadedDocument } from "../types";
import { retrieve } from "../retrieval";

export interface DocsSubAgentOutput {
  snippetsText: string[];
  sources: SourceCardData[];
  limitations: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export async function runDocsSubAgent(params: {
  query: string;
  context?: Record<string, string>;
  uploadedDocs?: UploadedDocument[];
}): Promise<DocsSubAgentOutput> {
  const { query, context = {}, uploadedDocs = [] } = params;
  const fullSearchText = [query, ...Object.values(context)].join(" ");
  const queryTokens = new Set(tokenize(fullSearchText));

  const snippetsText: string[] = [];
  const sources: SourceCardData[] = [];
  const limitations: string[] = [];

  // 1. Buscar primero en la documentación cargada por el usuario
  uploadedDocs.forEach((doc, idx) => {
    const docTokens = tokenize(`${doc.title} ${doc.content}`);
    let score = 0;
    for (const qt of queryTokens) {
      if (docTokens.includes(qt)) score += 2;
    }
    // Si el usuario subió un documento en la sesión y pregunta sobre él o hay coincidencia
    const mentionsUploadedDoc = /documento|archivo|subi|cargad|pdf|adjunt/i.test(query);
    if (score > 0 || mentionsUploadedDoc) {
      const code = `U0${idx + 1}`;
      const excerpt = doc.content.slice(0, 650).trim();
      snippetsText.push(`[${code}] Documento cargado "${doc.title}": ${excerpt}`);
      sources.push({
        sourceCode: code,
        institution: "Documento cargado",
        title: doc.title,
        date: doc.uploadedAt,
        page: "Texto completo cargado en sesión",
        exactPassage: excerpt,
        verification: "verified",
        supports: excerpt,
      });
    }
  });

  // 2. Buscar en la biblioteca documental curada (R01..R27, M01..M05)
  const retrieved = retrieve(fullSearchText, 4);
  for (const r of retrieved) {
    const f = r.fragment;
    snippetsText.push(
      `[${f.sourceCode}] ${f.institution} — "${f.title}" (${f.page || f.section || "Sección técnica"}): ${
        f.exactPassage || f.text
      }`
    );
    sources.push({
      sourceCode: f.sourceCode,
      institution: f.institution,
      title: f.title,
      date: f.date || f.accessedOn,
      accessedOn: f.accessedOn,
      section: f.section,
      page: f.page || f.section,
      exactPassage: f.exactPassage || f.text,
      url: f.url,
      verification: f.verification,
      supports: f.text,
    });
    if (f.limitation && !limitations.includes(f.limitation)) {
      limitations.push(f.limitation);
    }
  }

  return {
    snippetsText,
    sources,
    limitations,
  };
}
