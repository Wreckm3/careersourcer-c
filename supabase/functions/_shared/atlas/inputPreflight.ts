// Beta model: text only, no tools, no prior response IDs, no cache breakpoints.
export const ATLAS_BETA_MODEL = "gpt-6-luna";
export const ATLAS_MAX_INPUT_TOKENS = 16000;
const INPUT_SAFETY_MARGIN = 256;

export async function checkAtlasLunaInput(
  apiKey: string,
  body: { instructions: string; input: { role: string; content: string }[]; reasoning: unknown; text: unknown },
  ceiling: number,
  fetcher: typeof fetch = fetch,
): Promise<"allowed" | "too_large" | "unavailable"> {
  if (!apiKey || !Number.isSafeInteger(ceiling) || ceiling < 1024 || ceiling > ATLAS_MAX_INPUT_TOKENS) return "unavailable";
  try {
    const response = await fetcher("https://api.openai.com/v1/responses/input_tokens", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ATLAS_BETA_MODEL,
        instructions: body.instructions,
        input: body.input,
        reasoning: body.reasoning,
        text: body.text,
        truncation: "disabled",
      }),
    });
    if (!response.ok) return "unavailable";
    const result = await response.json();
    if (result?.object !== "response.input_tokens" || typeof result.input_tokens !== "number" ||
      !Number.isSafeInteger(result.input_tokens) || result.input_tokens < 0) return "unavailable";
    return result.input_tokens + INPUT_SAFETY_MARGIN <= ceiling ? "allowed" : "too_large";
  } catch {
    return "unavailable";
  }
}
