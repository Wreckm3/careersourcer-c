import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMicroKes, parseFounderSnapshot } from "../src/lib/atlas/founderControls";

const valid = {
  daily_accounted_micro_kes: "1000000", monthly_accounted_micro_kes: "1000000",
  monthly_settled_estimate_micro_kes: "600000", outstanding_micro_kes: "400000",
  monthly_priced_micro_kes: "0", monthly_legacy_estimate_micro_kes: "600000", monthly_overrun_count: 0,
  monthly_settled_credits: "3", global_daily_budget_micro_kes: "9000000", individual_daily_budget_micro_kes: "1000000",
  reserved_count: 1, uncertain_count: 0, monthly_requests: 2, monthly_failed_count: 0,
  emergency_shutdown: false, timezone: "UTC", captured_at: "2026-11-26T00:00:00Z", last_pause_at: null,
};
describe("Founder control snapshot", () => {
  it("accepts server-shaped estimates", () => assert.deepEqual(parseFounderSnapshot(valid), valid));
  it("fails closed on malformed data", () => {
    for (const row of [null, {}, { ...valid, emergency_shutdown: "false" }, { ...valid, daily_accounted_micro_kes: 1 }, { ...valid, reserved_count: -1 }, { ...valid, captured_at: "unknown" }]) {
      assert.throws(() => parseFounderSnapshot(row));
    }
  });
  it("keeps micro-KES precise", () => {
    assert.equal(formatMicroKes("0"), "KSh 0.00");
    assert.equal(formatMicroKes("250000"), "KSh 0.25");
    assert.equal(formatMicroKes("1"), "KSh 0.000001");
    assert.equal(formatMicroKes("9007199254740993"), "KSh 9,007,199,254.740993");
  });
  it("rejects negative or noninteger financial values", () => {
    for (const value of ["-1", "1.2", "NaN", ""]) assert.throws(() => formatMicroKes(value));
  });
});
