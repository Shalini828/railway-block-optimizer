export type OptimizationRunState =
  | "READY"
  | "RUNNING"
  | "SUCCESS"
  | "NO_ELIGIBLE_DEMANDS"
  | "FAILED";

export interface OptimizationFailureState {
  state: "NO_ELIGIBLE_DEMANDS" | "FAILED";
  message: string;
  stages?: Array<{ id: string; name: string; status: string; details?: string }>;
}

export function optimizationFailureState(detail: unknown, httpStatus: number): OptimizationFailureState {
  if (typeof detail === "object" && detail !== null) {
    const payload = detail as {
      code?: unknown;
      message?: unknown;
      pipeline?: { stages?: unknown };
    };
    const stages = Array.isArray(payload.pipeline?.stages)
      ? payload.pipeline.stages.filter(
          (stage): stage is { id: string; name: string; status: string; details?: string } =>
            typeof stage === "object" &&
            stage !== null &&
            typeof (stage as { id?: unknown }).id === "string" &&
            typeof (stage as { name?: unknown }).name === "string" &&
            typeof (stage as { status?: unknown }).status === "string",
        )
      : undefined;
    return {
      state: payload.code === "NO_ELIGIBLE_DEMANDS" ? "NO_ELIGIBLE_DEMANDS" : "FAILED",
      message:
        typeof payload.message === "string"
          ? payload.message
          : `Optimization request failed (${httpStatus}).`,
      ...(stages ? { stages } : {}),
    };
  }
  return {
    state: "FAILED",
    message:
      typeof detail === "string" && detail.trim()
        ? detail
        : `Optimization request failed (${httpStatus}).`,
  };
}
