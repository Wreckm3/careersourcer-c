import { planCuratedChain, resolveCuratedResource } from "./researchCatalog.ts";
import type { ResearchContext } from "./researchEngine.ts";

const maxBytes = 4096;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every(key => allowed.includes(key)) && allowed.every(key => Object.prototype.hasOwnProperty.call(value, key));
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
const identifiers = (value: unknown, max: number, min = 0): value is string[] =>
  Array.isArray(value) && value.length >= min && value.length <= max && value.every(identifier) && new Set(value).size === value.length;

export function parseResearchRequest(value: unknown): { stages: string[][]; context: ResearchContext } | null {
  if (!isObject(value) || !keys(value, ["stages", "difficulty", "maxMinutes", "internet", "device", "software", "availableArtifacts"])) return null;
  const { stages, difficulty, maxMinutes, internet, device, software, availableArtifacts } = value;
  if (!Array.isArray(stages) || stages.length < 1 || stages.length > 8 || !stages.every(stage => identifiers(stage, 8, 1))) return null;
  if (difficulty !== "beginner" && difficulty !== "intermediate" && difficulty !== "advanced") return null;
  if (typeof maxMinutes !== "number" || !Number.isInteger(maxMinutes) || maxMinutes < 1 || maxMinutes > 240) return null;
  if (typeof internet !== "boolean" || (device !== "phone" && device !== "computer")) return null;
  if (!isObject(software) || Object.keys(software).length > 8 || !Object.entries(software).every(([name, version]) => identifier(name) && typeof version === "string" && /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,23}$/.test(version))) return null;
  if (!identifiers(availableArtifacts, 24)) return null;
  return { stages, context: { topics: stages[0], difficulty, maxMinutes, freeOnly: true, internet, device, software: software as Record<string, string>, availableArtifacts } };
}

type Access = "allowed" | "unauthenticated" | "forbidden";
export type ResearchServiceDependencies = {
  enabled: boolean;
  allowedOrigins: readonly string[];
  authorize: (token: string) => Promise<Access>;
  now: () => number;
};

async function readBoundedJson(request: Request): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new RangeError("body too large");
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("missing body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new RangeError("body too large"); }
      text += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

/** Read-only curated planning. No provider, database writes, URL fetches, or mastery claims. */
export async function handleResearchRequest(request: Request, deps: ResearchServiceDependencies): Promise<Response> {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json", Vary: "Origin" });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !deps.allowedOrigins.includes(origin)) return reply(403, { error: "Origin not allowed." });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "POST required." });
  if (!deps.enabled) return reply(503, { error: "Curated research is not enabled." });
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || token.length > 8192) return reply(401, { error: "Sign in first." });
  let access: Access;
  try { access = await deps.authorize(token); } catch { return reply(503, { error: "Authorization unavailable." }); }
  if (access === "unauthenticated") return reply(401, { error: "Sign in again." });
  if (access !== "allowed") return reply(403, { error: "Founder pilot access required." });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply(415, { error: "JSON required." });
  let body: unknown;
  try { body = await readBoundedJson(request); } catch (error) { return reply(error instanceof RangeError ? 413 : 400, { error: "Invalid research request body." }); }
  const input = parseResearchRequest(body);
  if (!input) return reply(400, { error: "Invalid research constraints." });
  const now = deps.now();
  if (!Number.isFinite(now)) return reply(503, { error: "Research clock unavailable." });
  const chain = planCuratedChain(input.stages, input.context, now);
  const resources = chain.resourceIds.map(id => resolveCuratedResource(id, now));
  if (resources.some(resource => resource === null)) return reply(503, { error: "Catalogue changed; try again." });
  return reply(200, { resources, blockedStage: chain.blockedStage, source: "curated-catalogue", liveSearch: false, masteryVerified: false });
}
