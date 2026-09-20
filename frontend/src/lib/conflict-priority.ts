export type ConflictSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Classifies a single train conflict's severity.
 * Prefers server-provided severity when present; falls back to canonical rules.
 */
export function classifyTrainConflictSeverity(
  operationalPriority?: string | number | null,
  trainType?: string | null,
  serverSeverity?: string | null,
): ConflictSeverity {
  if (serverSeverity) {
    const s = serverSeverity.toUpperCase();
    if (s === "CRITICAL" || s === "HIGH" || s === "MEDIUM" || s === "LOW") {
      return s as ConflictSeverity;
    }
  }

  const prio = parseInt(String(operationalPriority ?? "0"), 10) || 0;
  const type = (trainType || "").toUpperCase().trim();

  if (type === "EXPRESS" || prio >= 5) return "CRITICAL";
  if (type === "SPECIAL") return prio >= 4 ? "CRITICAL" : "HIGH";
  if (type === "SUPERFAST" || type === "MAIL" || type === "PASSENGER" || prio >= 3) return "HIGH";
  if (type === "GOODS" || type === "FREIGHT") return "MEDIUM";

  return prio >= 4 ? "CRITICAL" : prio === 3 ? "HIGH" : "MEDIUM";
}


/** Same color-token mapping already used in conflicts.tsx's getSeverityColor. */
export function getSeverityColorClasses(severity: ConflictSeverity | string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-destructive bg-destructive/10 border-destructive/30";
    case "HIGH":
      return "text-warn bg-warn/10 border-warn/30";
    case "MEDIUM":
      return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    default:
      return "text-safe bg-safe/10 border-safe/30";
  }
}

/** Reduces a list of severities to the single highest (worst) one. */
export function overallSeverity(severities: ConflictSeverity[]): ConflictSeverity {
  const order: ConflictSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  for (const level of order) {
    if (severities.includes(level)) return level;
  }
  return "LOW";
}
