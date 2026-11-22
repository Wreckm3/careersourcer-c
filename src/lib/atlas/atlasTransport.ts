import { supabase } from "@/integrations/supabase/client";
import type { AtlasTurnPlan } from "./types";
import { mergeAtlasText, parseAtlasSseFrame, requireAtlasAnswer } from "./sse";

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
  let completed = false;

  const processFrames = (complete = false) => {
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = complete ? "" : frames.pop() ?? "";

    for (const frame of frames) {
      const update = parseAtlasSseFrame(frame);
      if (!update) continue;
      if (update.error) throw new Error(update.error);
      completed ||= Boolean(update.completed);
      const next = mergeAtlasText(answer, update);
      if (next !== answer) {
        answer = next;
        onDelta(answer);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    processFrames();
  }

  buffer += decoder.decode();
  processFrames(true);
  return { answer: requireAtlasAnswer(answer, completed) };
}
