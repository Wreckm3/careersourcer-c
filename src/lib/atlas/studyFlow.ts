import { supabase } from "@/integrations/supabase/client";
import {
  atlasStudyProfileSchema,
  atlasStudyFlowAssessmentSchema,
  emptyAtlasStudyProfile,
  parseAtlasStudyFlowRoadmap,
  parseAtlasStudyProfile,
  type AtlasStudyFlowRoadmap,
  type AtlasStudyFlowAssessment,
  type AtlasStudyProfile,
} from "./studyFlowSchema";

export { emptyAtlasStudyProfile } from "./studyFlowSchema";
export type { AtlasStudyFlowAssessment, AtlasStudyFlowRoadmap, AtlasStudyProfile } from "./studyFlowSchema";

export interface AtlasStudyFlowRecord {
  branch_id: string;
  status: "discovery" | "awaiting_approval" | "active";
  revision: number;
  active_roadmap: AtlasStudyFlowRoadmap | null;
  proposal_id: string | null;
  proposed_roadmap: AtlasStudyFlowRoadmap | null;
  roadmap_history: { revision: number; approvedRoadmap: AtlasStudyFlowRoadmap; preservedAt: string }[];
}

export interface AtlasStudyFlowEvidence {
  id: string;
  branch_id: string;
  item_id: string;
  roadmap_revision: number;
  evidence_text: string;
  created_at: string;
}

export interface AtlasStudyFlowAssessmentRecord extends AtlasStudyFlowAssessment {
  id: string;
  evidence_id: string;
  roadmap_revision: number;
  created_at: string;
}

export function parseAtlasStudyFlowRecord(value: unknown): AtlasStudyFlowRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.branch_id !== "string" ||
    !["discovery", "awaiting_approval", "active"].includes(String(row.status)) ||
    typeof row.revision !== "number"
  ) return null;

  const activeRoadmap = row.active_roadmap == null ? null : parseAtlasStudyFlowRoadmap(row.active_roadmap);
  const proposedRoadmap = row.proposed_roadmap == null ? null : parseAtlasStudyFlowRoadmap(row.proposed_roadmap);
  if (
    (row.active_roadmap != null && !activeRoadmap) ||
    (row.proposed_roadmap != null && !proposedRoadmap) ||
    (row.status === "active" && !activeRoadmap) ||
    (row.status === "awaiting_approval" && !proposedRoadmap)
  ) return null;
  const historyValue = row.roadmap_history ?? [];
  if (!Array.isArray(historyValue)) return null;
  const roadmapHistory: AtlasStudyFlowRecord["roadmap_history"] = [];
  for (const entryValue of historyValue) {
    if (!entryValue || typeof entryValue !== "object" || Array.isArray(entryValue)) return null;
    const entry = entryValue as Record<string, unknown>;
    const roadmap = parseAtlasStudyFlowRoadmap(entry.approvedRoadmap);
    if (
      typeof entry.revision !== "number" ||
      typeof entry.preservedAt !== "string" ||
      !roadmap
    ) return null;
    roadmapHistory.push({ revision: entry.revision, approvedRoadmap: roadmap, preservedAt: entry.preservedAt });
  }

  return {
    branch_id: row.branch_id,
    status: row.status as AtlasStudyFlowRecord["status"],
    revision: row.revision,
    active_roadmap: activeRoadmap,
    proposal_id: typeof row.proposal_id === "string" ? row.proposal_id : null,
    proposed_roadmap: proposedRoadmap,
    roadmap_history: roadmapHistory,
  };
}

export async function loadAtlasStudyFlow(userId: string, branchId: string) {
  const [profileResult, flowResult, evidenceResult, assessmentResult] = await Promise.all([
    supabase.from("atlas_study_profiles").select("profile").eq("user_id", userId).maybeSingle(),
    supabase.from("atlas_studyflows").select("*").eq("user_id", userId).eq("branch_id", branchId).maybeSingle(),
    supabase.from("atlas_studyflow_evidence").select("*").eq("user_id", userId).eq("branch_id", branchId).order("created_at", { ascending: false }).limit(12),
    supabase.from("atlas_studyflow_assessments").select("*").eq("user_id", userId).eq("branch_id", branchId).order("created_at", { ascending: false }).limit(12),
  ]);
  if (profileResult.error || flowResult.error || evidenceResult.error || assessmentResult.error) {
    throw profileResult.error ?? flowResult.error ?? evidenceResult.error ?? assessmentResult.error;
  }
  const flow = parseAtlasStudyFlowRecord(flowResult.data);
  if (flowResult.data && !flow) throw new Error("Saved StudyFlow data is invalid.");
  return {
    profile: parseAtlasStudyProfile(profileResult.data?.profile),
    flow,
    evidence: evidenceResult.data as AtlasStudyFlowEvidence[],
    assessments: assessmentResult.data.map((assessment) => {
      const parsed = atlasStudyFlowAssessmentSchema.safeParse({
        decision: assessment.decision,
        feedback: assessment.feedback,
        criteriaMet: assessment.criteria_met,
        remainingGaps: assessment.remaining_gaps,
        nextStep: assessment.next_step,
      });
      if (!parsed.success) throw new Error("Saved StudyFlow assessment data is invalid.");
      return {
        ...parsed.data,
        id: assessment.id,
        evidence_id: assessment.evidence_id,
        roadmap_revision: assessment.roadmap_revision,
        created_at: assessment.created_at,
      };
    }),
  };
}

export async function saveAtlasStudyProfile(userId: string, profile: AtlasStudyProfile) {
  const valid = atlasStudyProfileSchema.safeParse(profile);
  if (!valid.success) throw new Error("Please shorten or remove profile details that exceed the field limits.");

  const { error } = await supabase.from("atlas_study_profiles").upsert(
    { user_id: userId, profile: valid.data },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function postAtlasStudyFlow(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in again before asking Atlas to plan your StudyFlow.");

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Atlas could not prepare this StudyFlow yet.";
    throw new Error(message);
  }
  if (!payload || typeof payload !== "object") throw new Error("Atlas returned an invalid StudyFlow response.");
  return payload as Record<string, unknown>;
}

export async function generateAtlasStudyFlow(
  operation: "generate" | "revise",
  instruction: string,
): Promise<{ message: string; proposal: AtlasStudyFlowRoadmap; proposalId: string }> {
  const result = await postAtlasStudyFlow({
    messages: [{ role: "user", content: instruction.slice(0, 1200) }],
    lessonContext: null,
    feature: "mentorship",
    studyFlowOperation: operation,
    studyFlowInstruction: instruction.slice(0, 1200),
  });
  const proposal = parseAtlasStudyFlowRoadmap(result.proposal);
  if (!proposal || typeof result.message !== "string" || typeof result.proposalId !== "string") {
    throw new Error("Atlas returned a StudyFlow that did not pass validation.");
  }
  return { message: result.message, proposal, proposalId: result.proposalId };
}

export async function assessAtlasStudyFlowEvidence(evidenceId: string) {
  const result = await postAtlasStudyFlow({
    messages: [{ role: "user", content: "Assess my submitted evidence against the saved lesson criteria." }],
    lessonContext: null,
    feature: "mentorship",
    studyFlowOperation: "assess",
    studyFlowEvidenceId: evidenceId,
  });
  const assessment = atlasStudyFlowAssessmentSchema.safeParse(result.assessment);
  if (!assessment.success || typeof result.message !== "string" || typeof result.assessmentId !== "string") {
    throw new Error("Atlas returned assessment feedback that did not pass validation.");
  }
  return { message: result.message, assessment: assessment.data, assessmentId: result.assessmentId };
}

export async function approveAtlasStudyFlow(branchId: string) {
  const { data, error } = await supabase.rpc("atlas_approve_studyflow_proposal", { _branch_id: branchId });
  if (error) throw error;
  return parseAtlasStudyFlowRecord(data);
}

export async function submitAtlasStudyFlowEvidence(branchId: string, itemId: string, evidenceText: string) {
  const { data, error } = await supabase.rpc("atlas_submit_studyflow_evidence", {
    _branch_id: branchId,
    _item_id: itemId,
    _evidence_text: evidenceText,
  });
  if (error) throw error;
  return data;
}

export function toStudyFlowLines(value: string) {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

export function fromStudyFlowLines(value: string[]) {
  return value.join("\n");
}
