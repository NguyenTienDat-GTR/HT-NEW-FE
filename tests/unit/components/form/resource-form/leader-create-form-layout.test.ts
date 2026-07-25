import { describe, expect, it } from "vitest";
import { getLeaderCreateStepFields, leaderCreateStepCount } from "@/components/form/resource-form/leader-create-form-layout";
import type { FormFieldSpec } from "@/components/form/resource-form/types";

const fields: FormFieldSpec[] = [
  { name: "holyName", label: "Tên thánh" },
  { name: "fullName", label: "Họ và tên" },
  { name: "birthDate", label: "Ngày sinh" },
  { name: "gender", label: "Giới tính" },
  { name: "email", label: "Email" },
  { name: "phoneNumber", label: "Số điện thoại" },
  { name: "parishId", label: "Giáo xứ" },
  { name: "leaderLevel", label: "Cấp huynh trưởng" },
];

describe("leader create form layout", () => {
  it("groups leader create fields into the three wizard steps", () => {
    expect(leaderCreateStepCount).toBe(3);
    expect(getLeaderCreateStepFields(fields, 0).map((field) => field.name)).toEqual(["holyName", "fullName", "birthDate", "gender", "leaderLevel"]);
    expect(getLeaderCreateStepFields(fields, 1).map((field) => field.name)).toEqual(["phoneNumber", "email"]);
    expect(getLeaderCreateStepFields(fields, 2).map((field) => field.name)).toEqual(["parishId"]);
  });
});
