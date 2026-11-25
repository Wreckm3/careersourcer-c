import { z } from "zod";

const teamIdSchema = z.string().uuid();

export function normalizeTeamResourceUrl(value: string) {
  const parsed = z.string().url().safeParse(value.trim());
  if (!parsed.success) throw new Error("Enter a complete HTTP or HTTPS link.");
  const url = new URL(parsed.data);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS links can be shared.");
  }
  if (url.username || url.password) {
    throw new Error("Remove credentials from shared links.");
  }
  return url.toString();
}

export function createTeamAttachmentPath(
  teamId: string,
  projectId: string,
  userId: string,
  attachmentId: string,
  fileName: string,
) {
  for (const id of [teamId, projectId, userId, attachmentId]) teamIdSchema.parse(id);
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100) || "attachment";
  return `${teamId}/${projectId}/${userId}/${attachmentId}_${safeName}`;
}
