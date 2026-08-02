/**
 * Portfolio records — local-first, backend-ready.
 *
 * A completed mission produces a portfolio record. Today it lives in
 * localStorage; the shape is deliberately the same shape a `portfolio_items`
 * table would use, so moving it to the backend later is a swap of the
 * read/write functions, not a redesign.
 */

const KEY = "cs_portfolio_records_v1";

export interface PortfolioRecord {
  /** Mission that produced the artifact. */
  lessonId: string;
  branchId: string;
  /** Human name of the thing built. */
  projectName: string;
  /** Named skills used to build it. */
  skills: string[];
  /** ISO date the mission was completed. */
  completedAt: string;
  /** Learner's reflection — "what did you accomplish?". */
  notes?: string;
  /** Reserved: uploaded screenshot of the finished artifact. */
  screenshotUrl?: string | null;
}

function readAll(): Record<string, PortfolioRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, PortfolioRecord>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    /* quota / private mode — portfolio notes are non-critical */
  }
}

export function getPortfolioRecord(lessonId: string): PortfolioRecord | undefined {
  return readAll()[lessonId];
}

export function savePortfolioRecord(record: PortfolioRecord) {
  const all = readAll();
  all[record.lessonId] = { ...all[record.lessonId], ...record };
  writeAll(all);
}

export function listPortfolioRecords(): PortfolioRecord[] {
  return Object.values(readAll()).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
