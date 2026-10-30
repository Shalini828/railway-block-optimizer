import assert from "node:assert/strict";
import test from "node:test";

import { isTimetableUnavailableMessage } from "./optimization-run-state.ts";

test("missing timetable evidence is classified separately from train conflicts", () => {
  const diagnostic =
    "No train timetable rows are available for corridor C03 on 2026-08-28; a conflict-free maintenance window cannot be verified.";

  assert.equal(isTimetableUnavailableMessage(diagnostic), true);
  assert.equal(isTimetableUnavailableMessage("Candidate rejected due to a train conflict."), false);
  assert.equal(isTimetableUnavailableMessage(null), false);
});
