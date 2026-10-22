import assert from "node:assert/strict";
import test from "node:test";

import { summarizeRequisitions } from "./requisition-summary.ts";

test("a successfully persisted PENDING requisition increments the pending card after refresh", () => {
  const existing = [
    { backendStatus: "OPTIMIZED" },
    { backendStatus: "CANCELLED" },
    { backendStatus: "REJECTED" },
  ];
  const persistedAfterRefresh = [...existing, { backendStatus: "PENDING" }];

  assert.equal(summarizeRequisitions(existing).pending, 0);
  assert.equal(summarizeRequisitions(persistedAfterRefresh).total, 4);
  assert.equal(summarizeRequisitions(persistedAfterRefresh).pending, 1);
});

test("a failed submission leaves the pending card based on unchanged persisted data", () => {
  const persistedRows = [
    { backendStatus: "OPTIMIZED" },
    { backendStatus: "CANCELLED" },
    { backendStatus: "REJECTED" },
  ];

  assert.equal(summarizeRequisitions(persistedRows).pending, 0);
  assert.equal(summarizeRequisitions(persistedRows).total, 3);
});
