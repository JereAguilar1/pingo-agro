import { LIBRARY, SourceFragment } from "./library";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export interface RetrievalResult {
  fragment: SourceFragment;
  score: number;
}

/**
 * Recuperación por coincidencia de palabras clave (keyword search).
 * No es semántica: es una primera versión deliberadamente simple para el MVP,
 * pensada para poder migrarse luego a un índice vectorial sin cambiar la interfaz.
 */
export function retrieve(question: string, limit = 4): RetrievalResult[] {
  const queryTokens = new Set(tokenize(question));
  if (queryTokens.size === 0) return [];

  const scored: RetrievalResult[] = LIBRARY.map((fragment) => {
    const topicTokens = fragment.topics.flatMap((t) => tokenize(t));
    const textTokens = tokenize(fragment.text);
    let score = 0;
    for (const qt of queryTokens) {
      if (topicTokens.includes(qt)) score += 3;
      if (textTokens.includes(qt)) score += 1;
      if (normalize(fragment.title).includes(qt)) score += 2;
    }
    return { fragment, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
