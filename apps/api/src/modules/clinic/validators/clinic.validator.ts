export function generateSlug(name: string, fallbackSeed = ""): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");

  if (normalized) return normalized;
  const seed = fallbackSeed.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "clinic";
  return `clinic-${seed}`;
}
