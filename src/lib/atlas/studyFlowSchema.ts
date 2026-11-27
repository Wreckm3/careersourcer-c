import { z } from "zod";

const shortText = z.string().trim().min(1).max(240);
const detailText = z.string().trim().min(1).max(600);

export const atlasStudyProfileSchema = z.object({
  interests: z.array(shortText).max(12),
  ambitions: z.array(shortText).max(8),
  existingKnowledge: z.array(shortText).max(12),
  equipment: z.array(shortText).max(12),
  software: z.array(shortText).max(12),
  budgetConstraint: z.string().trim().max(240),
  timeConstraint: z.string().trim().max(240),
  preferredGoals: z.array(shortText).max(8),
  helpfulApproaches: z.array(shortText).max(8),
  currentDifficulties: z.array(shortText).max(8),
  longTermObjectives: z.array(shortText).max(8),
});

export type AtlasStudyProfile = z.infer<typeof atlasStudyProfileSchema>;

export const emptyAtlasStudyProfile: AtlasStudyProfile = {
  interests: [],
  ambitions: [],
  existingKnowledge: [],
  equipment: [],
  software: [],
  budgetConstraint: "",
  timeConstraint: "",
  preferredGoals: [],
  helpfulApproaches: [],
  currentDifficulties: [],
  longTermObjectives: [],
};

const studyFlowResourceSchema = z.object({
  title: shortText,
  kind: z.enum(["documentation", "tutorial", "book", "article", "game", "film", "exercise", "case_study", "other"]),
  url: z.null(),
  why: detailText,
  observe: detailText,
  doAfter: detailText,
  objectiveContribution: detailText,
});

const studyFlowLessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  title: shortText,
  objective: detailText,
  prerequisites: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/)).max(8),
  resource: studyFlowResourceSchema.nullable(),
  exercise: detailText,
  mission: detailText,
  completionCriteria: detailText,
});

const studyFlowStageSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  title: shortText,
  purpose: detailText,
  milestone: z.object({ title: shortText, criteria: detailText }),
  lessons: z.array(studyFlowLessonSchema).min(1).max(5),
});

const studyFlowObjectiveSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  title: shortText,
  description: detailText,
  stages: z.array(studyFlowStageSchema).min(1).max(4),
});

export const atlasStudyFlowRoadmapSchema = z.object({
  schemaVersion: z.literal(1),
  title: shortText,
  direction: detailText,
  objectives: z.array(studyFlowObjectiveSchema).min(1).max(4),
  currentObjectiveId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  nextAction: z.object({
    title: shortText,
    description: detailText,
    estimatedMinutes: z.number().int().min(1).max(240),
  }),
  recoveryHint: detailText,
});

export const atlasStudyFlowAssessmentSchema = z.object({
  decision: z.enum(["needs_practice", "developing", "criteria_met"]),
  feedback: z.string().trim().min(1).max(1600),
  criteriaMet: z.array(shortText).max(6),
  remainingGaps: z.array(shortText).max(6),
  nextStep: detailText,
});

export type AtlasStudyFlowRoadmap = z.infer<typeof atlasStudyFlowRoadmapSchema>;
export type AtlasStudyFlowAssessment = z.infer<typeof atlasStudyFlowAssessmentSchema>;

export function parseAtlasStudyFlowRoadmap(value: unknown): AtlasStudyFlowRoadmap | null {
  const parsed = atlasStudyFlowRoadmapSchema.safeParse(value);
  if (!parsed.success) return null;

  const objectives = parsed.data.objectives;
  if (!objectives.some((objective) => objective.id === parsed.data.currentObjectiveId)) return null;

  const ids = new Set<string>();
  const lessonIds = new Set<string>();
  const lessons = new Map<string, z.infer<typeof studyFlowLessonSchema>>();
  for (const objective of objectives) {
    if (ids.has(objective.id)) return null;
    ids.add(objective.id);
    for (const stage of objective.stages) {
      if (ids.has(stage.id)) return null;
      ids.add(stage.id);
      for (const lesson of stage.lessons) {
        if (ids.has(lesson.id)) return null;
        ids.add(lesson.id);
        lessonIds.add(lesson.id);
        lessons.set(lesson.id, lesson);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const prerequisite of lessons.get(id)?.prerequisites ?? []) {
      if (!lessonIds.has(prerequisite) || !visit(prerequisite)) return false;
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const lesson of lessons.values()) {
    if (!visit(lesson.id)) return null;
  }

  return parsed.data;
}

export function parseAtlasStudyProfile(value: unknown): AtlasStudyProfile {
  if (value == null) return emptyAtlasStudyProfile;
  const parsed = atlasStudyProfileSchema.safeParse(value);
  if (!parsed.success) throw new Error("Saved learner profile data is invalid.");
  return parsed.data;
}
