import { describe, expect, it } from "vitest";
import { actorLabel } from "@/modules/leaders/components/leader-detail-utils";

describe("actorLabel", () => {
  it("prefers the resolved name", () => {
    expect(actorLabel("Nguyễn Văn An", "3f2b8c1e-1111-4222-8333-444455556666")).toBe("Nguyễn Văn An");
  });

  it("never shows a raw uuid when the name could not be resolved", () => {
    expect(actorLabel(null, "3f2b8c1e-1111-4222-8333-444455556666")).toBe("Không xác định");
  });

  it("keeps readable actors and handles empty values", () => {
    expect(actorLabel(null, "adminsaigon")).toBe("adminsaigon");
    expect(actorLabel(undefined, "")).toBe("—");
  });
});
