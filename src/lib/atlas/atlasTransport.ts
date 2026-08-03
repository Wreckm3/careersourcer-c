import { supabase } from "@/integrations/supabase/client";
import type { AtlasTurnPlan } from "./types";

const ATLAS_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas`;

export interface AtlasStreamResult {
  answer: string;
}

export async function streamAtlasResponse(
  request: AtlasTurnPlan["request"],
  onDelta: (answer: string) => void,
): Promise<AtlasStreamResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const res = await fetch(ATLAS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok || !res.body) {
    const payload = await res.json().catch(() => ({}));
    const message = typeof payload.error === "string" ? payload.error : "Atlas could not answer that.";
    const error = new Error(message);
    Object.assign(error, { upgrade: !!payload.upgrade });
    throw error;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const evt = JSON.parse(raw) as { type?: string; delta?: string };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          answer += evt.delta;
          onDelta(answer);
        }
      } catch {
        /* Partial SSE frames are safe to ignore until the next chunk. */
      }
    }
  }

  return { answer };
}
