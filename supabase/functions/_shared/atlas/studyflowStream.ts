export function extractAtlasStudyFlowText(source: string): string {
  const frames = source.split(/\r?\n\r?\n/);
  let accumulated = "";
  let finalText = "";
  for (const frame of frames) {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n").trim();
    if (!data || data === "[DONE]") continue;
    let payload: Record<string, unknown>;
    try {
      const value: unknown = JSON.parse(data);
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      payload = value as Record<string, unknown>;
    } catch {
      continue;
    }

    if (payload.type === "error" || payload.type === "response.failed") {
      throw new Error("Atlas provider failed to complete the StudyFlow.");
    }
    if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
      accumulated += payload.delta;
    }
    if (payload.type === "response.output_text.done") {
      const text = payload.text ?? payload.output_text;
      if (typeof text === "string") finalText = text;
    }
    if (payload.type === "response.completed") {
      const response = payload.response;
      if (response && typeof response === "object" && !Array.isArray(response)) {
        const record = response as Record<string, unknown>;
        if (typeof record.output_text === "string") finalText = record.output_text;
        if (!finalText && Array.isArray(record.output)) {
          finalText = record.output.flatMap((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return [];
            const content = (item as Record<string, unknown>).content;
            return Array.isArray(content) ? content.flatMap((part) => {
              if (!part || typeof part !== "object" || Array.isArray(part)) return [];
              const text = (part as Record<string, unknown>).text;
              return typeof text === "string" ? [text] : [];
            }) : [];
          }).join("");
        }
      }
    }
  }
  return (finalText || accumulated).trim();
}
