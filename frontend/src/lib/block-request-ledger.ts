import type { Requisition, Status } from "@/lib/abps-data";

type BackendRequest = Record<string, unknown>;

export type NormalizedRequestFields = Pick<
  Requisition,
  "id" | "backendId" | "dept" | "status" | "backendStatus" | "optimizationEligible" | "reviewStatus"
>;

const DEPARTMENTS = new Set(["TMS", "SMMS", "TDMS"] as const);
const DEPARTMENT_ALIASES: Record<string, Requisition["dept"]> = {
  ENGINEERING: "TMS",
  "S&T": "SMMS",
  TRD: "TDMS",
};

const STATUS_BY_BACKEND: Record<string, Status> = {
  OPTIMIZED: "Clustered / Shadowed",
  OPTIMISED: "Clustered / Shadowed",
  CLUSTERED: "Clustered / Shadowed",
  SHADOWED: "Clustered / Shadowed",
  SCHEDULED: "Clustered / Shadowed",
  APPROVED: "Approved",
  APPROVE: "Approved",
  ACCEPTED: "Approved",
  ACTIVE: "Active",
  IN_PROGRESS: "Active",
  INPROGRESS: "Active",
  STARTED: "Active",
  COMPLETED: "Completed",
  CLOSED: "Completed",
  DONE: "Completed",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
  REJECTED: "Rejected",
  PENDING: "Pending AI Scheduling",
};

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeDepartment(value: unknown): Requisition["dept"] | null {
  const raw = nonEmptyString(value)?.toUpperCase();
  if (!raw) return null;
  const department = raw.startsWith("DEPT-") ? raw.slice(5) : raw;
  if (DEPARTMENT_ALIASES[department]) return DEPARTMENT_ALIASES[department];
  if (department.startsWith("TEAM-")) {
    if (department.includes("SMMS") || department === "TEAM-002") return "SMMS";
    if (department.includes("TDMS") || department === "TEAM-003") return "TDMS";
    if (department.includes("TMS") || department === "TEAM-001") return "TMS";
  }
  return DEPARTMENTS.has(department as "TMS" | "SMMS" | "TDMS")
    ? (department as Requisition["dept"])
    : null;
}

export function normalizeRequestListResponse(payload: unknown): BackendRequest[] | null {
  let rows: unknown;
  if (Array.isArray(payload)) {
    rows = payload;
  } else if (payload && typeof payload === "object") {
    rows = (payload as { requests?: unknown }).requests;
  }
  if (!Array.isArray(rows)) return null;
  return rows.every((row) => row !== null && typeof row === "object" && !Array.isArray(row))
    ? (rows as BackendRequest[])
    : null;
}

export type RequestNormalizationIssue = {
  requestId: string | null;
  rowIndex: number;
  field: "request_id" | "id" | "request_status" | "status" | "department" | "department_code" | "department_id" | "dept";
  problem: "missing" | "unrecognized";
};

export function getRequestNormalizationIssues(
  item: BackendRequest,
  rowIndex: number,
): RequestNormalizationIssue[] {
  const idField = item["request_id"] !== undefined && item["request_id"] !== null ? "request_id" : "id";
  const statusField = item["request_status"] !== undefined && item["request_status"] !== null
    ? "request_status"
    : "status";
  const requestId = nonEmptyString(item["request_id"] ?? item["id"]);
  const rawStatus = nonEmptyString(item["request_status"] ?? item["status"])
    ?.toUpperCase()
    .replace(/[\s-]+/g, "_");
  const departmentField: RequestNormalizationIssue["field"] = item["department"] !== undefined && item["department"] !== null
    ? "department"
    : item["department_code"] !== undefined && item["department_code"] !== null
      ? "department_code"
      : item["department_id"] !== undefined && item["department_id"] !== null
        ? "department_id"
        : "dept";
  const department = normalizeDepartment(item[departmentField]);
  const issues: RequestNormalizationIssue[] = [];

  if (!requestId) issues.push({ requestId: null, rowIndex, field: idField, problem: "missing" });
  if (!rawStatus) {
    issues.push({ requestId, rowIndex, field: statusField, problem: "missing" });
  } else if (!STATUS_BY_BACKEND[rawStatus]) {
    issues.push({ requestId, rowIndex, field: statusField, problem: "unrecognized" });
  }
  if (!department) {
    issues.push({
      requestId,
      rowIndex,
      field: departmentField,
      problem: nonEmptyString(item[departmentField]) === null
        ? "missing"
        : "unrecognized",
    });
  }
  return issues;
}

export function normalizeBackendRequestFields(
  item: BackendRequest,
): NormalizedRequestFields | null {
  if (getRequestNormalizationIssues(item, 0).length > 0) return null;
  const id = nonEmptyString(item["request_id"] ?? item["id"]);
  const rawStatus = nonEmptyString(item["request_status"] ?? item["status"])
    ?.toUpperCase()
    .replace(/[\s-]+/g, "_");
  const department = normalizeDepartment(
    item["department"] ?? item["department_code"] ?? item["department_id"] ?? item["dept"],
  );
  if (!id || !rawStatus || !department || !STATUS_BY_BACKEND[rawStatus]) return null;

  const reviewStatus = nonEmptyString(item["review_status"])?.toUpperCase() ?? "";
  const status = rawStatus === "PENDING" && reviewStatus === "APPROVED"
    ? "Approved"
    : STATUS_BY_BACKEND[rawStatus];

  return {
    id,
    backendId: id,
    dept: department,
    status,
    backendStatus: rawStatus,
    optimizationEligible: rawStatus === "PENDING" && reviewStatus === "APPROVED",
    reviewStatus,
  };
}

export function filterRequestsByDepartment(
  requests: Requisition[],
  scope: "network" | "department",
  department: string | null,
): Requisition[] {
  if (scope !== "department" || !department) return requests;
  return requests.filter((request) => request.dept === department);
}

export async function refreshAndFindPendingRequest(
  requestId: string,
  refresh: () => Promise<Requisition[] | null>,
): Promise<Requisition | null> {
  const requests = await refresh();
  return requests?.find(
    (request) => request.backendId === requestId && request.backendStatus === "PENDING",
  ) ?? null;
}

export function isCurrentRequestRefresh(refreshId: number, latestRefreshId: number): boolean {
  return refreshId === latestRefreshId;
}

export function updateIfCurrentRequestRefresh<T>(
  refreshId: number,
  latestRefreshId: number,
  update: (current: T) => T,
  current: T,
): T {
  return isCurrentRequestRefresh(refreshId, latestRefreshId) ? update(current) : current;
}
