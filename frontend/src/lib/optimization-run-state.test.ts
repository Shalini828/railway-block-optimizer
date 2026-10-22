import assert from "node:assert/strict";
import test from "node:test";

import { optimizationFailureState } from "./optimization-run-state.ts";

test("structured no-eligible API responses retain their explicit state and stage evidence", () => {
  const failure = optimizationFailureState(
    {
      code: "NO_ELIGIBLE_DEMANDS",
      message: "No persisted PENDING requests.",
      pipeline: { stages: [{ id: "BDMS_INGESTION", name: "BDMS Ingestion", status: "COMPLETED" }] },
    },
    409,
  );

  assert.equal(failure.state, "NO_ELIGIBLE_DEMANDS");
  assert.equal(failure.message, "No persisted PENDING requests.");
  assert.equal(failure.stages?.[0]?.status, "COMPLETED");
});

test("failed API responses never produce a success state or success metrics", () => {
  const failure = optimizationFailureState({ code: "OPTIMIZATION_INFEASIBLE", message: "No verified window." }, 422);
  assert.equal(failure.state, "FAILED");
  assert.equal(failure.message, "No verified window.");
});

test("malformed API error bodies get a useful HTTP error message", () => {
  const failure = optimizationFailureState(null, 503);
  assert.equal(failure.state, "FAILED");
  assert.equal(failure.message, "Optimization request failed (503).");
});
