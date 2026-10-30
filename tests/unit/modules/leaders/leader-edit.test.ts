import { describe, expect, it } from "vitest";
import { emptyLeaderEditValues, toLeaderUpdatePayload, validateLeaderEdit, valuesFromLeader } from "@/modules/leaders/components/leader-edit";
import type { LeaderDetail } from "@/modules/leaders/components/leader-detail-utils";

describe("leader edit mappers", () => {
  it("maps a leader to editable values with empty-string defaults", () => {
    const values = valuesFromLeader({ holyName: "Giuse", email: "a@b.c", gender: "NAM" } as LeaderDetail);
    expect(values).toEqual({ ...emptyLeaderEditValues, holyName: "Giuse", email: "a@b.c", gender: "NAM" });
  });

  it("requires holy name, email, gender and parish", () => {
    expect(Object.keys(validateLeaderEdit(emptyLeaderEditValues)).sort()).toEqual(["email", "gender", "holyName", "parishId"]);
    expect(validateLeaderEdit({ ...emptyLeaderEditValues, holyName: "G", email: "e", gender: "NU", parishId: "p" })).toEqual({});
  });

  it("clears the phone number when blank and only sends a new avatar asset id", () => {
    const base = { ...emptyLeaderEditValues, holyName: " Giuse ", email: " a@b.c ", gender: "NAM", parishId: "p1" };
    expect(toLeaderUpdatePayload(base)).toEqual({ holyName: "Giuse", email: "a@b.c", gender: "NAM", parishId: "p1", clearFields: ["phoneNumber"] });
    expect(toLeaderUpdatePayload({ ...base, phoneNumber: " 090 ", imageAssetId: "img-1", imageUrl: "http://x" })).toEqual({
      holyName: "Giuse",
      email: "a@b.c",
      gender: "NAM",
      parishId: "p1",
      phoneNumber: "090",
      imageAssetId: "img-1",
    });
  });
});
