import assert from "node:assert/strict";
import test from "node:test";

import type { Requisition } from "@/lib/abps-data";
import {
  filterRequestsByDepartment,
  getRequestNormalizationIssues,
  isCurrentRequestRefresh,
  normalizeBackendRequestFields,
  normalizeRequestListResponse,
  refreshAndFindPendingRequest,
  updateIfCurrentRequestRefresh,
} from "./block-request-ledger.ts";

function requisition(id: string, dept: Requisition["dept"]): Requisition {
  return {
    id,
    backendId: id,
    dept,
    assetId: "AST-1",
    work: "Track inspection",
    section: "C02",
    line: "Down",
    chainage: "1/1",
    blockType: "Traffic Block",
    duration: 1,
    crew: 1,
    criticality: "High",
    daysOverdue: 0,
    tsrRisk: false,
    status: "Pending AI Scheduling",
    backendStatus: "PENDING",
    requestedBy: "Officer",
  };
}

test("backend PENDING and department IDs map to the UI pending requisition", () => {
  const normalized = normalizeBackendRequestFields({
    request_id: "BR-1",
    request_status: "PENDING",
    review_status: "PENDING",
    department_id: "DEPT-TDMS",
  });

  assert.equal(normalized?.id, "BR-1");
  assert.equal(normalized?.dept, "TDMS");
  assert.equal(normalized?.backendStatus, "PENDING");
  assert.equal(normalized?.status, "Pending AI Scheduling");
  assert.equal(normalized?.optimizationEligible, false);
});

test("only approved pending requisitions are marked eligible for optimization", () => {
  const awaitingApproval = normalizeBackendRequestFields({
    request_id: "BR-WAITING",
    request_status: "PENDING",
    review_status: "PENDING_REVIEW",
    department_id: "DEPT-TMS",
  });
  const approved = normalizeBackendRequestFields({
    request_id: "BR-APPROVED",
    request_status: "PENDING",
    review_status: "APPROVED",
    department_id: "DEPT-TMS",
  });
  const scheduled = normalizeBackendRequestFields({
    request_id: "BR-SCHEDULED",
    request_status: "OPTIMIZED",
    review_status: "APPROVED",
    department_id: "DEPT-TMS",
  });

  assert.equal(awaitingApproval?.optimizationEligible, false);
  assert.equal(approved?.optimizationEligible, true);
  assert.equal(scheduled?.optimizationEligible, false);
});

test("live requisition department aliases and cancelled status normalize without becoming pending", () => {
  const response = [
    { request_id: "BR-ENG-1", request_status: "PENDING", department_id: "ENGINEERING" },
    { request_id: "BR-SMMS-1", request_status: "PENDING", department_id: "S&T" },
    { request_id: "BR-TRD-1", request_status: "CANCELLED", department_id: "TRD" },
  ];
  const rows = normalizeRequestListResponse(response);
  assert.ok(rows);
  const normalized = rows.map(normalizeBackendRequestFields);

  assert.deepEqual(normalized.map((item) => item?.dept), ["TMS", "SMMS", "TDMS"]);
  assert.deepEqual(normalized.map((item) => item?.backendStatus), ["PENDING", "PENDING", "CANCELLED"]);
  assert.equal(normalized[2]?.status, "Cancelled");
  assert.equal(normalized[2]?.optimizationEligible, false);
});

test("department scoped lists include the user's department and exclude others", () => {
  const requests = [requisition("TMS-1", "TMS"), requisition("SMMS-1", "SMMS")];

  assert.deepEqual(
    filterRequestsByDepartment(requests, "department", "TMS").map((item) => item.id),
    ["TMS-1"],
  );
});

test("post-submit confirmation calls refresh and finds the persisted pending row", async () => {
  let refreshed = false;
  const found = await refreshAndFindPendingRequest("BR-2", async () => {
    refreshed = true;
    return [requisition("BR-2", "TMS")];
  });

  assert.equal(refreshed, true);
  assert.equal(found?.id, "BR-2");
});

test("a non-pending row is not confirmed as a pending submission", async () => {
  const approved = { ...requisition("BR-3", "TMS"), backendStatus: "OPTIMIZED" };

  assert.equal(
    await refreshAndFindPendingRequest("BR-3", async () => [approved]),
    null,
  );
});

test("missing or malformed identity fields and response envelopes fail safely", () => {
  assert.equal(normalizeRequestListResponse({ data: [] }), null);
  assert.equal(normalizeRequestListResponse([null]), null);
  assert.equal(
    normalizeBackendRequestFields({ request_status: "PENDING", department_id: "DEPT-TMS" }),
    null,
  );
  assert.equal(
    normalizeBackendRequestFields({ request_id: "BR-4", department_id: "DEPT-TMS" }),
    null,
  );
  assert.equal(
    normalizeBackendRequestFields({ request_id: "BR-5", request_status: "PENDING", department_id: "DEPT-UNKNOWN" }),
    null,
  );
});

test("an unrecognized department rejects the record and reports only its ID and field", () => {
  const badRecord = {
    request_id: "BR-ORPHAN-7",
    request_status: "PENDING",
    department_id: "UNMAPPED-DEPT",
  };

  assert.equal(normalizeBackendRequestFields(badRecord), null);
  assert.deepEqual(getRequestNormalizationIssues(badRecord, 2), [{
    requestId: "BR-ORPHAN-7",
    rowIndex: 2,
    field: "department_id",
    problem: "unrecognized",
  }]);
});

test("a mixed response is rejected as a whole when any record has invalid required fields", () => {
  const rows = normalizeRequestListResponse([
    { request_id: "BR-VALID", request_status: "PENDING", department_id: "ENGINEERING" },
    { request_id: "BR-INVALID", request_status: "PENDING", department_id: "UNKNOWN" },
  ]);
  assert.ok(rows);
  const normalized = rows.map(normalizeBackendRequestFields);
  assert.equal(normalized.some((item) => item === null), true);
});

test("an older overlapping refresh cannot overwrite requisitions or loading/error state", async () => {
  type State = { reqs: Requisition[]; loaded: boolean; error: string | null };
  let latestRefreshId = 0;
  let state: State = { reqs: [], loaded: true, error: "previous error" };
  const start = () => {
    const id = ++latestRefreshId;
    state = updateIfCurrentRequestRefresh(id, latestRefreshId, () => ({ ...state, loaded: false, error: null }), state);
    return id;
  };
  const finish = (id: number, update: (current: State) => State) => {
    state = updateIfCurrentRequestRefresh(id, latestRefreshId, update, state);
  };
  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => { resolve = done; });
    return { promise, resolve };
  };

  const olderResponse = deferred<Requisition[]>();
  const newerResponse = deferred<Requisition[]>();
  const olderId = start();
  const olderRefresh = olderResponse.promise.then((reqs) => {
    finish(olderId, (current) => ({ ...current, reqs, loaded: true, error: null }));
  });
  const newerId = start();
  const newerRefresh = newerResponse.promise.then((reqs) => {
    finish(newerId, (current) => ({ ...current, reqs, loaded: true, error: null }));
  });

  const newerReqs = [requisition("newer", "TMS")];
  const olderReqs = [requisition("older", "SMMS")];
  newerResponse.resolve(newerReqs);
  await newerRefresh;
  assert.deepEqual(state, { reqs: newerReqs, loaded: true, error: null });

  // Represent a newer refresh's current status after its response has been applied.
  state = { ...state, loaded: false, error: "newer refresh still reporting an error" };
  olderResponse.resolve(olderReqs);
  await olderRefresh;

  assert.deepEqual(state, {
    reqs: newerReqs,
    loaded: false,
    error: "newer refresh still reporting an error",
  });
});
