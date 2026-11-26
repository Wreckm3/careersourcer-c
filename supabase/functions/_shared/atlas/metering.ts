/** Only final, model-matched usage from the supported text Responses API is priced. */
export interface MeteredUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  responseId: string;
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function tokenCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2000000;
}
export function finalMeteredUsage(payload: unknown, model: string): MeteredUsage | null {
  const event = record(payload);
  if (event?.type !== "response.completed" && event?.type !== "response.incomplete" && event?.type !== "response.failed") return null;
  const response = record(event.response);
  if (response?.model !== model || typeof response.id !== "string" || !response.id || response.id.length > 200) return null;
  // Only ordinary standard text pricing is configured. Unsupported paid cache writes,
  // service tiers and tool charges must stay unresolved, not silently be treated as free.
  if (response.service_tier !== undefined && response.service_tier !== null && response.service_tier !== "default") return null;
  const usage = record(response.usage);
  const details = record(usage?.input_tokens_details);
  const input = usage?.input_tokens, cached = details?.cached_tokens, output = usage?.output_tokens;
  if (!tokenCount(input) || !tokenCount(cached) || !tokenCount(output) || cached > input) return null;
  if (details?.cache_write_tokens !== undefined && details.cache_write_tokens !== 0) return null;
  const writes = record(details?.cache_write_tokens_details);
  if (writes && Object.values(writes).some((value) => value !== 0)) return null;
  if (usage?.total_tokens !== undefined && usage.total_tokens !== input + output) return null;
  const tools = record(usage?.tool_usage) ?? record(response.tool_usage);
  if (tools && Object.values(tools).some((value) => value !== 0)) return null;
  return { inputTokens: input, cachedTokens: cached, outputTokens: output, responseId: response.id };
}

/** Await settlement on successful close, read error, and explicit cancellation. */
export function withMeteredSettlement(body: ReadableStream<Uint8Array>, settle: () => Promise<void>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let finished: Promise<void> | undefined;
  let cancelled = false;
  const finish = () => finished ??= Promise.resolve().then(settle);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { await finish(); if (!cancelled) controller.close(); }
        else if (!cancelled) controller.enqueue(value);
      } catch (error) {
        try { await finish(); } finally { if (!cancelled) controller.error(error); }
      }
    },
    async cancel(reason) {
      cancelled = true;
      try { await reader.cancel(reason); } finally { await finish(); }
    },
  });
}
