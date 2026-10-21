import { beforeAll, describe, expect, it } from "vitest";
import { achievableLevels } from "@/components/common/resource/approval-dialog";
import { setLeaderLevels } from "@/modules/leader-levels/leader-level-store";

describe("achievableLevels", () => {
  beforeAll(() => {
    setLeaderLevels([
      { levelCode: "NONE", levelName: "Chưa có cấp", displayOrder: 0, isSystem: true },
      { levelCode: "DU_TRUONG", levelName: "Dự trưởng", displayOrder: 1, isSystem: false },
      { levelCode: "HT_I", levelName: "Huynh trưởng cấp I", displayOrder: 2, isSystem: false },
      { levelCode: "HT_II", levelName: "Huynh trưởng cấp II", displayOrder: 3, isSystem: false },
      { levelCode: "HT_III", levelName: "Huynh trưởng cấp III", displayOrder: 4, isSystem: false },
    ]);
  });

  it("dự trưởng vào khóa HT cấp II được chọn HT cấp I hoặc cấp II", () => {
    const codes = achievableLevels({ leaderLevel: "DU_TRUONG", courseLevel: "HT_II" }).map((level) => level.levelCode);
    expect(codes).toEqual(["HT_I", "HT_II"]);
  });

  it("không được chọn cấp không cao hơn cấp hiện tại hoặc vượt cấp của khóa", () => {
    const codes = achievableLevels({ leaderLevel: "HT_I", courseLevel: "HT_II" }).map((level) => level.levelCode);
    expect(codes).toEqual(["HT_II"]);
    expect(achievableLevels({ leaderLevel: "HT_II", courseLevel: "HT_II" })).toEqual([]);
  });
});
