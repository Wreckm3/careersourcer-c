export type AtlasProvider = "openai" | "lovable";

export interface AtlasProviderConfig {
  provider: AtlasProvider;
  model: string;
  apiKey: string;
}

function readServerEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = Deno.env.get(key);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function getAtlasProviderConfig(): AtlasProviderConfig {
  const configuredProvider = readServerEnv("ATLAS_PROVIDER", "ATLAS_MODEL_PROVIDER");
  const provider: AtlasProvider = configuredProvider === "lovable" ? "lovable" : "openai";
  const model = readServerEnv("ATLAS_MODEL", provider === "openai" ? "OPENAI_MODEL" : "LOVABLE_MODEL");
  const apiKey = readServerEnv(
    "ATLAS_API_KEY",
    provider === "openai" ? "OPENAI_API_KEY" : "LOVABLE_API_KEY",
    provider === "openai" ? "ATLAS_OPENAI_API_KEY" : "ATLAS_LOVABLE_API_KEY",
  );

  if (!model || !apiKey) {
    throw new Error("Atlas model provider is not configured.");
  }

  return { provider, model, apiKey };
}

export async function streamAtlasCompletion(config: AtlasProviderConfig, body: Record<string, unknown>) {
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

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, model: config.model, stream: true, store: false }),
  });
}
