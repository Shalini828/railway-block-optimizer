export type ConflictSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Classifies a single train conflict's severity.
 * Mirrors the exact rule already used in frontend/src/routes/conflicts.tsx
 * so severity is consistent across the Planner and Conflicts pages.
 */
export function classifyTrainConflictSeverity(
  operationalPriority?: string | number | null,
  trainType?: string | null,
): ConflictSeverity {
  const prio = parseInt(String(operationalPriority ?? "0"), 10) || 0;
  const type = (trainType || "").toUpperCase();

  if (prio >= 4 || type === "EXPRESS") return "CRITICAL";
  if (prio === 3 || type === "PASSENGER") return "HIGH";
  return "MEDIUM";
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
