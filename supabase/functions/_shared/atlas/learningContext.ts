type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function textList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLength));
}

/** Lesson navigation hints are accepted only for the server-selected path. */
export function normalizeAtlasLessonContext(
  value: unknown,
  selectedPath: string | null,
  completedSessions: readonly string[],
) {
  const lesson = record(value);
  if (!lesson || !selectedPath || lesson.branchId !== selectedPath) return null;

  const lessonId = text(lesson.lessonId, 120);
  const mission = text(lesson.mission, 1000);
  if (!lessonId || !mission) return null;

  const next = record(lesson.nextMission);
  const nextMission = next
    ? {
        id: text(next.id, 120),
        title: text(next.title, 200),
        mission: text(next.mission, 1000),
      }
    : null;

  return {
    categoryId: text(lesson.categoryId, 120),
    branchId: selectedPath,
    lessonId,
    mission,
    missionCompleted: completedSessions.includes(lessonId),
    toolsLearned: textList(lesson.toolsLearned, 12, 80),
    nextMission: nextMission?.id && nextMission.title && nextMission.mission ? nextMission : null,
  };
}
