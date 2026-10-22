export interface RequisitionStatusRecord {
  backendStatus?: string;
}

export function summarizeRequisitions<T extends RequisitionStatusRecord>(records: T[]) {
  return {
    total: records.length,
    pending: records.filter((record) => record.backendStatus === "PENDING").length,
    active: records.filter((record) => record.backendStatus === "ACTIVE").length,
    completed: records.filter((record) => record.backendStatus === "COMPLETED").length,
  };
}
