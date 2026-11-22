export interface AtlasSseUpdate {
  text?: string;
  replace?: boolean;
  error?: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function responseOutputText(response: unknown): string | null {
  const record = asRecord(response);
  if (!record) return null;

  const direct = asText(record.output_text);
  if (direct) return direct;

  const output = Array.isArray(record.output) ? record.output : [];
  const text = output.flatMap((item) => {
    const content = asRecord(item)?.content;
    return Array.isArray(content)
      ? content.map((part) => asText(asRecord(part)?.text)).filter((value): value is string => Boolean(value))
      : [];
  }).join("");

  return text || null;
}

function providerError(payload: UnknownRecord): string | null {
  if (payload.type === "error" || payload.type === "response.failed") {
    return "Atlas provider returned an error. Please try again.";
  }

  return payload.error ? "Atlas provider returned an error. Please try again." : null;
}

/** Parses one complete SSE frame without exposing provider payloads to the UI. */
export function parseAtlasSseFrame(frame: string): AtlasSseUpdate | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") return null;

  try {
    const payload = asRecord(JSON.parse(data));
    if (!payload) return null;

    const error = providerError(payload);
    if (error) return { error };

    if (payload.type === "response.output_text.delta") {
      const delta = asText(payload.delta);
      return delta ? { text: delta } : null;
    }

    if (payload.type === "response.output_text.done") {
      const text = asText(payload.text) ?? asText(payload.output_text) ?? asText(payload.delta);
      return text ? { text, replace: true } : null;
    }

    if (payload.type === "response.completed") {
      const text = responseOutputText(payload.response);
      return text ? { text, replace: true } : null;
    }

    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const choice = asRecord(choices[0]);
    const delta = asText(asRecord(choice?.delta)?.content);
    if (delta) return { text: delta };

    const completed = asText(asRecord(choice?.message)?.content) ?? asText(payload.output_text);
    return completed ? { text: completed, replace: true } : null;
  } catch {
    return null;
  }
}

export function mergeAtlasText(current: string, update: AtlasSseUpdate): string {
  if (!update.text) return current;
  if (!update.replace) return current + update.text;
  if (!current || update.text.startsWith(current)) return update.text;
  if (current.includes(update.text)) return current;
  return current + update.text;
}

export function requireAtlasAnswer(answer: string): string {
  if (!answer.trim()) {
    throw new Error("Atlas returned no readable response. Please try again.");
  }
  return answer;
}
