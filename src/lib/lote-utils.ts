/** Días transcurridos desde la siembra. Acepta formatos como "2026-10-15 (Temprano)". */
export function daysSincePlanting(plantingDate?: string): number | null {
  if (!plantingDate) return null;
  const match = plantingDate.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const date = new Date(`${match[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}

/** Fecha corta legible, ej. "15 oct 2026". */
export function formatShortDate(value?: string): string {
  if (!value) return "—";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return value;
  const date = new Date(`${match[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}
