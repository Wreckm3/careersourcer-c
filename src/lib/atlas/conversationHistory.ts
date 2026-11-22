import type { AtlasConversationMessage } from "./types";

export const MAX_ATLAS_REQUEST_MESSAGES = 12;

/**
 * Keeps the UI's complete local history while constraining only the messages
 * sent to the Edge Function. The function validates the same limit server-side.
 */
export function limitAtlasRequestMessages(
  messages: AtlasConversationMessage[],
): AtlasConversationMessage[] {
  return messages.slice(-MAX_ATLAS_REQUEST_MESSAGES);
}
