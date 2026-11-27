import { z } from "npm:zod@4";

const shortText = z.string().trim().min(1).max(240);
const detailText = z.string().trim().min(1).max(600);
const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

const Resource = z.object({
  title: shortText,
  kind: z.enum(["documentation", "tutorial", "book", "article", "game", "film", "exercise", "case_study", "other"]),
  url: z.null(),
  why: detailText,
  observe: detailText,
  doAfter: detailText,
  objectiveContribution: detailText,
}).strict();

const Lesson = z.object({
  id: identifier,
  title: shortText,
  objective: detailText,
  prerequisites: z.array(identifier).max(8),
  resource: Resource.nullable(),
  exercise: detailText,
  mission: detailText,
  completionCriteria: detailText,
}).strict();

const Stage = z.object({
  id: identifier,
  title: shortText,
  purpose: detailText,
  milestone: z.object({ title: shortText, criteria: detailText }).strict(),
  lessons: z.array(Lesson).min(1).max(5),
}).strict();

const Objective = z.object({
  id: identifier,
  title: shortText,
  description: detailText,
  stages: z.array(Stage).min(1).max(4),
}).strict();

export const AtlasStudyFlowRoadmap = z.object({
  schemaVersion: z.literal(1),
  title: shortText,
  direction: detailText,
  objectives: z.array(Objective).min(1).max(4),
  currentObjectiveId: identifier,
  nextAction: z.object({
    title: shortText,
    description: detailText,
    estimatedMinutes: z.number().int().min(1).max(240),
  }).strict(),
  recoveryHint: detailText,
}).strict().superRefine((roadmap, context) => {
  const ids = new Set<string>();
  const lessonIds = new Set<string>();
  const lessons = new Map<string, z.infer<typeof Lesson>>();

  for (const objective of roadmap.objectives) {
    if (ids.has(objective.id)) context.addIssue({ code: "custom", message: "Duplicate roadmap ID" });
    ids.add(objective.id);
    for (const stage of objective.stages) {
      if (ids.has(stage.id)) context.addIssue({ code: "custom", message: "Duplicate roadmap ID" });
      ids.add(stage.id);
      for (const lesson of stage.lessons) {
        if (ids.has(lesson.id)) context.addIssue({ code: "custom", message: "Duplicate roadmap ID" });
        ids.add(lesson.id);
        lessonIds.add(lesson.id);
        lessons.set(lesson.id, lesson);
      }
    }
  }

  if (!roadmap.objectives.some((objective) => objective.id === roadmap.currentObjectiveId)) {
    context.addIssue({ code: "custom", path: ["currentObjectiveId"], message: "Unknown current objective" });
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (lessonId: string) => {
    if (visiting.has(lessonId)) return false;
    if (visited.has(lessonId)) return true;
    visiting.add(lessonId);
    for (const prerequisite of lessons.get(lessonId)?.prerequisites ?? []) {
      if (!lessonIds.has(prerequisite) || !visit(prerequisite)) return false;
    }
    visiting.delete(lessonId);
    visited.add(lessonId);
    return true;
  };

  for (const lesson of lessons.values()) {
    if (!visit(lesson.id)) {
      context.addIssue({ code: "custom", path: ["objectives"], message: "Invalid or circular lesson prerequisite" });
      break;
    }
  }
});

export const AtlasStudyFlowResponse = z.object({
  message: z.string().trim().min(1).max(500),
  roadmap: AtlasStudyFlowRoadmap,
}).strict();

export const AtlasStudyFlowAssessmentResponse = z.object({
  message: z.string().trim().min(1).max(500),
  assessment: z.object({
    decision: z.enum(["needs_practice", "developing", "criteria_met"]),
    feedback: z.string().trim().min(1).max(1600),
    criteriaMet: z.array(shortText).max(6),
    remainingGaps: z.array(shortText).max(6),
    nextStep: detailText,
  }).strict(),
}).strict();

export type AtlasStudyFlowRoadmapData = z.infer<typeof AtlasStudyFlowRoadmap>;
export type AtlasStudyFlowAssessmentData = z.infer<typeof AtlasStudyFlowAssessmentResponse>;
