/**
 * Credential-free extension contracts. Concrete providers must return an
 * unavailable state until their server-side credentials and source policy are
 * configured; Atlas never fabricates resources, opportunities, or live data.
 */
export interface AtlasResourceProvider {
  id: string;
  findForMission(input: { branchId: string; lessonId: string; objective: string }): Promise<{ available: boolean; resources: { title: string; url: string; type: "video" | "docs" | "article" | "repository" }[] }>;
}

export interface AtlasOpportunityProvider {
  id: string;
  list(input: { branchId?: string; interests?: string[] }): Promise<{ available: boolean; opportunities: { title: string; url: string; kind: "internship" | "hackathon" | "game_jam" | "scholarship" | "freelance" | "event" }[] }>;
}

export interface AtlasMarketDataProvider {
  id: string;
  quote(symbol: string): Promise<{ available: boolean; asOf?: string; summary?: string }>;
}

export const unavailableProvider = <T>(id: string, reason = "Provider credentials are not configured.") => ({
  id,
  available: false,
  reason,
});
