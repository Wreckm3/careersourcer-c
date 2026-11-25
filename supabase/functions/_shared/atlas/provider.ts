export type AtlasProvider = "openai" | "lovable";

export const DEFAULT_ATLAS_PROVIDER_TIMEOUT_MS = 60_000;
const MIN_ATLAS_PROVIDER_TIMEOUT_MS = 5_000;
const MAX_ATLAS_PROVIDER_TIMEOUT_MS = 120_000;

export interface AtlasProviderConfig {
  provider: AtlasProvider;
  model: string;
  apiKey: string;
  /** Maximum lifetime of the upstream request and streamed response. */
  timeoutMs: number;
}

export type AtlasProviderFailureCategory =
  | "authentication"
  | "billing"
  | "model"
  | "request"
  | "rate_limit"
  | "timeout"
  | "provider"
  | "unknown";

export interface AtlasProviderFailure {
  /** HTTP status from the upstream provider, including 200 for streamed failures. */
  status: number | null;
  /** A small, whitelisted event label; never a provider-supplied string. */
  eventType: "error" | "response.failed" | "error_field" | "unknown";
  /** A sanitized, stable failure classification suitable for server logs. */
  category: AtlasProviderFailureCategory;
}

export interface AtlasProviderUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export function parseAtlasProviderUsage(payload: unknown): AtlasProviderUsage | null {
  const record = asRecord(payload);
  const response = asRecord(record?.response);
  const usage = asRecord(response?.usage) ?? asRecord(record?.usage);
  if (!usage) return null;
  const inputTokens = typeof usage.input_tokens === "number" && Number.isSafeInteger(usage.input_tokens) ? usage.input_tokens : 0;
  const outputTokens = typeof usage.output_tokens === "number" && Number.isSafeInteger(usage.output_tokens) ? usage.output_tokens : 0;
  const details = asRecord(usage.input_tokens_details);
  const cachedTokens = typeof details?.cached_tokens === "number" && Number.isSafeInteger(details.cached_tokens)
    ? details.cached_tokens
    : 0;
  return { inputTokens, outputTokens, cachedTokens };
}

const MAX_PROVIDER_FAILURE_BODY_CHARS = 16_384;
const MAX_PROVIDER_SSE_FRAME_CHARS = 16_384;

export class AtlasProviderConfigurationError extends Error {
  constructor(message = "Atlas model provider is not configured.") {
    super(message);
    this.name = "AtlasProviderConfigurationError";
  }
}

export class AtlasProviderTimeoutError extends Error {
  constructor(message = "Atlas AI took too long to respond.") {
    super(message);
    this.name = "AtlasProviderTimeoutError";
  }
}

export type AtlasEnvironmentReader = (key: string) => string | null | undefined;

function readServerEnv(readEnv: AtlasEnvironmentReader, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = readEnv(key);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function resolveAtlasProviderTimeout(readEnv: AtlasEnvironmentReader): number {
  const value = readServerEnv(readEnv, "ATLAS_PROVIDER_TIMEOUT_MS");
  if (!value) return DEFAULT_ATLAS_PROVIDER_TIMEOUT_MS;

  const timeoutMs = Number(value);
  return Number.isSafeInteger(timeoutMs) &&
      timeoutMs >= MIN_ATLAS_PROVIDER_TIMEOUT_MS &&
      timeoutMs <= MAX_ATLAS_PROVIDER_TIMEOUT_MS
    ? timeoutMs
    : DEFAULT_ATLAS_PROVIDER_TIMEOUT_MS;
}

export function resolveAtlasProviderConfig(readEnv: AtlasEnvironmentReader): AtlasProviderConfig {
  const configuredProvider = readServerEnv(readEnv, "ATLAS_PROVIDER", "ATLAS_MODEL_PROVIDER")?.toLowerCase();
  const provider: AtlasProvider = configuredProvider === undefined || configuredProvider === "openai"
    ? "openai"
    : configuredProvider === "lovable"
      ? "lovable"
      : (() => { throw new AtlasProviderConfigurationError("Atlas provider selection is invalid."); })();
  const model = readServerEnv(readEnv, "ATLAS_MODEL", provider === "openai" ? "OPENAI_MODEL" : "LOVABLE_MODEL");
  const apiKey = readServerEnv(readEnv,
    "ATLAS_API_KEY",
    provider === "openai" ? "OPENAI_API_KEY" : "LOVABLE_API_KEY",
    provider === "openai" ? "ATLAS_OPENAI_API_KEY" : "ATLAS_LOVABLE_API_KEY",
  );

  if (!model || !apiKey) {
    throw new AtlasProviderConfigurationError();
  }

  return { provider, model, apiKey, timeoutMs: resolveAtlasProviderTimeout(readEnv) };
}

export function getAtlasProviderConfig(): AtlasProviderConfig {
  return resolveAtlasProviderConfig((key) => Deno.env.get(key));
}

/**
 * A configuration summary that is safe to place in a server log. API keys are
 * deliberately omitted and malformed model identifiers are not echoed.
 */
export function atlasProviderDiagnostics(config: AtlasProviderConfig) {
  return {
    provider: config.provider,
    model: /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(config.model)
      ? config.model
      : "unrecognized",
    timeoutMs: config.timeoutMs,
  };
}

export function buildAtlasProviderRequest(config: AtlasProviderConfig, body: Record<string, unknown>) {
  const url = config.provider === "openai"
    ? "https://api.openai.com/v1/responses"
    : "https://ai.gateway.lovable.dev/v1/responses";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };

  if (config.provider === "openai") {
    headers.Authorization = `Bearer ${config.apiKey}`;
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers["Lovable-API-Key"] = config.apiKey;
    headers["X-Lovable-AIG-SDK"] = "fetch";
  }

  return {
    url,
    init: {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, model: config.model, stream: true, store: false }),
    } satisfies RequestInit,
  };
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function providerEventType(payload: unknown): AtlasProviderFailure["eventType"] {
  const record = asRecord(payload);
  if (!record) return "unknown";
  if (record.type === "error") return "error";
  if (record.type === "response.failed") return "response.failed";
  return record.error ? "error_field" : "unknown";
}

function providerFailureSignals(payload: unknown): string {
  const record = asRecord(payload);
  const response = asRecord(record?.response);
  const error = asRecord(record?.error) ?? asRecord(response?.error);
  const signals = [
    record?.type,
    error?.code,
    error?.type,
  ];

  // Provider messages can contain request data. Only machine-oriented fields
  // participate in classification and none are emitted to logs.
  return signals
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function classifyAtlasProviderFailure(
  status: number | null,
  payload: unknown,
): AtlasProviderFailureCategory {
  const signals = providerFailureSignals(payload);

  if (status === 401 || status === 403) return "authentication";
  if (status === 402) return "billing";
  if (status === 429) return "rate_limit";
  if (status === 408 || status === 504) return "timeout";
  if (status !== null && status >= 500) return "provider";

  if (/(?:api[_-]?key|authentication|unauthori[sz]ed|forbidden|access[_-]?denied)/.test(signals)) {
    return "authentication";
  }
  if (/(?:quota|credit|billing|payment|insufficient[_-]?(?:funds|quota))/.test(signals)) {
    return "billing";
  }
  if (/(?:model[_-]?(?:not[_-]?found|unsupported|unavailable)|unsupported[_-]?model)/.test(signals)) {
    return "model";
  }
  if (/(?:rate[_-]?limit|too[_-]?many[_-]?requests)/.test(signals)) {
    return "rate_limit";
  }
  if (/(?:timeout|timed[_-]?out|deadline)/.test(signals)) return "timeout";
  if (/(?:invalid[_-]?(?:request|parameter)|validation|unprocessable|bad[_-]?request)/.test(signals)) {
    return "request";
  }
  if (status === 400 || status === 404 || status === 422) return "request";

  return "unknown";
}

export function describeAtlasProviderFailure(
  status: number | null,
  payload: unknown,
): AtlasProviderFailure {
  return {
    status,
    eventType: providerEventType(payload),
    category: classifyAtlasProviderFailure(status, payload),
  };
}

function parseSsePayload(frame: string): unknown {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function parseProviderFailurePayload(body: string): unknown {
  const value = body.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return parseSsePayload(value);
  }
}

async function readProviderFailurePayload(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let body = "";
  try {
    while (body.length <= MAX_PROVIDER_FAILURE_BODY_CHARS) {
      const { done, value } = await reader.read();
      if (done) break;
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  return body.length <= MAX_PROVIDER_FAILURE_BODY_CHARS
    ? parseProviderFailurePayload(body)
    : null;
}

/** Reads a failed non-streaming provider response without retaining raw text. */
export async function getAtlasProviderFailure(response: Response): Promise<AtlasProviderFailure> {
  return describeAtlasProviderFailure(response.status, await readProviderFailurePayload(response));
}

/**
 * Inspects SSE failure events while passing every byte through unchanged. The
 * observer receives only a whitelisted event label and categorized failure;
 * neither provider messages nor learner prompts are retained or logged.
 */
export function observeAtlasProviderSseStream(
  body: ReadableStream<Uint8Array>,
  status: number,
  onFailure: (failure: AtlasProviderFailure) => void,
  onUsage?: (usage: AtlasProviderUsage) => void,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let pending = "";
  let reported = false;

  const inspect = (frame: string) => {
    if (frame.length > MAX_PROVIDER_SSE_FRAME_CHARS) return;
    const payload = parseSsePayload(frame);
    const usage = parseAtlasProviderUsage(payload);
    if (usage && onUsage) {
      try {
        onUsage(usage);
      } catch {
        // Usage telemetry must never disrupt an answer stream.
      }
    }
    if (reported) return;
    const eventType = providerEventType(payload);
    if (eventType === "unknown") return;

    reported = true;
    try {
      onFailure(describeAtlasProviderFailure(status, payload));
    } catch {
      // Telemetry must never disrupt an answer stream.
    }
  };

  const inspectCompleteFrames = () => {
    while (true) {
      const separator = pending.match(/\r?\n\r?\n/);
      if (!separator || separator.index === undefined) break;
      const frame = pending.slice(0, separator.index);
      pending = pending.slice(separator.index + separator[0].length);
      inspect(frame);
    }

    // Do not retain an unbounded malformed upstream stream in memory.
    if (pending.length > MAX_PROVIDER_SSE_FRAME_CHARS) pending = "";
  };

  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      pending += decoder.decode(chunk, { stream: true });
      inspectCompleteFrames();
      controller.enqueue(chunk);
    },
    flush() {
      pending += decoder.decode();
      inspect(pending);
    },
  }));
}

function withProviderStreamTimeout(
  body: ReadableStream<Uint8Array>,
  abortController: AbortController,
  timeoutId: ReturnType<typeof setTimeout>,
): ReadableStream<Uint8Array> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let output: ReadableStreamDefaultController<Uint8Array> | null = null;
  let settled = false;
  const timeoutError = new AtlasProviderTimeoutError();

  const cleanup = () => {
    clearTimeout(timeoutId);
    abortController.signal.removeEventListener("abort", onAbort);
  };

  const failForTimeout = () => {
    if (settled) return;
    settled = true;
    void reader?.cancel(timeoutError).catch(() => undefined);
    output?.error(timeoutError);
    cleanup();
  };

  const onAbort = () => failForTimeout();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      output = controller;
      reader = body.getReader();
      abortController.signal.addEventListener("abort", onAbort, { once: true });

      if (abortController.signal.aborted) {
        failForTimeout();
        return;
      }

      void (async () => {
        try {
          while (!settled) {
            const { done, value } = await reader!.read();
            if (done) {
              settled = true;
              cleanup();
              controller.close();
              return;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          if (!settled) {
            settled = true;
            cleanup();
            controller.error(abortController.signal.aborted ? timeoutError : error);
          }
        } finally {
          reader?.releaseLock();
        }
      })();
    },
    cancel(reason) {
      if (!settled) {
        settled = true;
        cleanup();
      }
      return reader?.cancel(reason) ?? Promise.resolve();
    },
  });
}

/**
 * Keeps the provider timeout alive until its streamed body closes, errors, or
 * the caller cancels it. This prevents an upstream that sends headers and
 * then stalls from leaving an Atlas request open indefinitely.
 */
export async function streamAtlasCompletion(
  config: AtlasProviderConfig,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = config.timeoutMs,
) {
  const request = buildAtlasProviderRequest(config, body);
  const abortController = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(request.url, {
      ...request.init,
      signal: abortController.signal,
    });

    if (timedOut) {
      await response.body?.cancel().catch(() => undefined);
      throw new AtlasProviderTimeoutError();
    }

    if (!response.body) {
      clearTimeout(timeoutId);
      return response;
    }

    return new Response(
      withProviderStreamTimeout(response.body, abortController, timeoutId),
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
    );
  } catch (error) {
    clearTimeout(timeoutId);
    if (timedOut) throw new AtlasProviderTimeoutError();
    throw error;
  }
}
