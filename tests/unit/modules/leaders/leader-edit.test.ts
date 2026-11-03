import { describe, expect, it } from "vitest";
import { emptyLeaderEditValues, toLeaderUpdatePayload, validateLeaderEdit, valuesFromLeader } from "@/modules/leaders/components/leader-edit";
import type { LeaderDetail } from "@/modules/leaders/components/leader-detail-utils";

describe("leader edit mappers", () => {
  it("maps a leader to editable values with empty-string defaults", () => {
    const values = valuesFromLeader({ holyName: "Giuse", email: "a@b.c", gender: "NAM" } as LeaderDetail);
    expect(values).toEqual({ ...emptyLeaderEditValues, holyName: "Giuse", email: "a@b.c", gender: "NAM" });
  });

  it("requires holy name, email and gender (parish is changed via the separate transfer action)", () => {
    expect(Object.keys(validateLeaderEdit(emptyLeaderEditValues)).sort()).toEqual(["email", "gender", "holyName"]);
    expect(validateLeaderEdit({ ...emptyLeaderEditValues, holyName: "G", email: "e", gender: "NU" })).toEqual({});
  });

  it("clears the phone number when blank and only sends a new avatar asset id", () => {
    const base = { ...emptyLeaderEditValues, holyName: " Giuse ", email: " a@b.c ", gender: "NAM" };
    expect(toLeaderUpdatePayload(base)).toEqual({ holyName: "Giuse", email: "a@b.c", gender: "NAM", clearFields: ["phoneNumber"] });
    expect(toLeaderUpdatePayload({ ...base, phoneNumber: " 090 ", imageAssetId: "img-1", imageUrl: "http://x" })).toEqual({
      holyName: "Giuse",
      email: "a@b.c",
      gender: "NAM",
      phoneNumber: "090",
      imageAssetId: "img-1",
    });
  });
});
