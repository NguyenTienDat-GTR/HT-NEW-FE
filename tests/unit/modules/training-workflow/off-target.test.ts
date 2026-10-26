import { describe, expect, it } from "vitest";
import type { RegistrationEntry } from "@/components/form/resource-form/registration-list-field";
import { applyOffTargetReasons, missingOffTargetReasons, offTargetEntries, registrationExtras } from "@/modules/training-workflow/off-target";

const inside: RegistrationEntry = { id: "a", fullName: "An", note: " ghi chú " };
const outside: RegistrationEntry = { id: "b", fullName: "Bình", offTarget: true };

describe("off-target registration entries", () => {
  it("chỉ lấy hồ sơ ngoài đợt từ nhiều danh sách", () => {
    expect(offTargetEntries([inside], [outside]).map((entry) => entry.id)).toEqual(["b"]);
  });

  it("hồ sơ ngoài đợt thiếu lí do cho đến khi nhập", () => {
    expect(missingOffTargetReasons([inside, outside]).map((entry) => entry.id)).toEqual(["b"]);
    const filled = applyOffTargetReasons([inside, outside], { b: "  Giáo hạt B thiếu chỗ " });
    expect(missingOffTargetReasons(filled)).toHaveLength(0);
    expect(filled[1].offTargetReason).toBe("Giáo hạt B thiếu chỗ");
    expect(filled[0]).toBe(inside);
  });

  it("payload chỉ có lí do ngoài đợt của hồ sơ ngoài đợt và ghi chú không trống", () => {
    const filled = applyOffTargetReasons([inside, outside], { b: "Lí do" });
    expect(registrationExtras(filled)).toEqual({ offTargetReasonsByLeaderId: { b: "Lí do" }, notesByLeaderId: { a: "ghi chú" } });
  });
});
