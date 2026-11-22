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
