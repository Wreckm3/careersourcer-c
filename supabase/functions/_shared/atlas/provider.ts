export type AtlasProvider = "openai" | "lovable";

export interface AtlasProviderConfig {
  provider: AtlasProvider;
  model: string;
  apiKey: string;
}

export class AtlasProviderConfigurationError extends Error {
  constructor(message = "Atlas model provider is not configured.") {
    super(message);
    this.name = "AtlasProviderConfigurationError";
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

  return { provider, model, apiKey };
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

export async function streamAtlasCompletion(
  config: AtlasProviderConfig,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
) {
  const request = buildAtlasProviderRequest(config, body);
  return fetchImpl(request.url, request.init);
}
