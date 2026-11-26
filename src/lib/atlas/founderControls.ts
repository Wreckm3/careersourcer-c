const amountFields = [
  "daily_accounted_micro_kes", "monthly_accounted_micro_kes", "monthly_settled_estimate_micro_kes",
  "monthly_priced_micro_kes", "monthly_legacy_estimate_micro_kes",
  "outstanding_micro_kes", "monthly_settled_credits", "global_daily_budget_micro_kes", "individual_daily_budget_micro_kes",
] as const;
const countFields = ["reserved_count", "uncertain_count", "monthly_requests", "monthly_failed_count", "monthly_overrun_count"] as const;
export type FounderSnapshot = Record<typeof amountFields[number], string> & Record<typeof countFields[number], number> & {
  emergency_shutdown: boolean;
  timezone: string;
  captured_at: string;
  last_pause_at: string | null;
};

export function parseFounderSnapshot(value: unknown): FounderSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid control snapshot");
  const row = value as Record<string, unknown>;
  const validAmount = (v: unknown) => typeof v === "string" && /^\d{1,40}$/.test(v);
  const validTime = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
  if (!amountFields.every((field) => validAmount(row[field])) ||
      !countFields.every((field) => typeof row[field] === "number" && Number.isSafeInteger(row[field]) && (row[field] as number) >= 0) ||
      typeof row.emergency_shutdown !== "boolean" || typeof row.timezone !== "string" || !row.timezone ||
      !validTime(row.captured_at) || !(row.last_pause_at === null || validTime(row.last_pause_at))) {
    throw new Error("Invalid control snapshot");
  }
  return row as FounderSnapshot;
}

/** Preserve integer micro-KES precision; never use floating point for these figures. */
export function formatMicroKes(value: string): string {
  if (!/^\d{1,40}$/.test(value)) throw new Error("Invalid micro-KES value");
  const amount = BigInt(value);
  const whole = amount / 1000000n;
  const fraction = (amount % 1000000n).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  return `KSh ${whole.toLocaleString("en-KE")}.${fraction}`;
}
