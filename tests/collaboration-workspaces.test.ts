import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createTeamAttachmentPath,
  normalizeTeamResourceUrl,
} from "../src/lib/collaboration/workspaceValidation";

describe("collaboration workspace input safety", () => {
  it("accepts only absolute HTTP(S) resource links", () => {
    assert.equal(
      normalizeTeamResourceUrl(" https://example.test/guide "),
      "https://example.test/guide",
    );
    assert.throws(() => normalizeTeamResourceUrl("javascript:alert(1)"), /HTTP (or|and) HTTPS/);
    assert.throws(() => normalizeTeamResourceUrl("not a URL"), /HTTP (or|and) HTTPS/);
    assert.throws(() => normalizeTeamResourceUrl("https://user:pass@example.test/private"), /credentials/);
  });

  it("builds attachment paths under validated team, project, and uploader IDs", () => {
    const path = createTeamAttachmentPath(
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
      "10000000-0000-4000-8000-000000000004",
      "../../team notes.pdf",
    );
    assert.match(
      path,
      /^10000000-0000-4000-8000-000000000001\/10000000-0000-4000-8000-000000000002\/10000000-0000-4000-8000-000000000003\/10000000-0000-4000-8000-000000000004_[a-zA-Z0-9._-]+$/,
    );
    assert.throws(
      () => createTeamAttachmentPath("not-a-uuid", "x", "y", "z", "file.pdf"),
    );
  });
});
