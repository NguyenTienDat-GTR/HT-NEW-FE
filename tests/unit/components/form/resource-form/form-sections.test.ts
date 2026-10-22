import { describe, expect, it } from "vitest";
import { planFormSections, sectionSpans } from "@/components/form/resource-form/form-sections";
import type { FormFieldSpec } from "@/components/form/resource-form/types";

const text = (name: string, section: string, extra: Partial<FormFieldSpec> = {}): FormFieldSpec => ({ name, label: name, section, ...extra });

describe("form section planning", () => {
  it("keeps short sections compact and bulky controls full width", () => {
    const plans = planFormSections([
      text("a", "Cơ bản"),
      text("b", "Cơ bản"),
      text("c", "Quyền", { type: "checkbox-list" }),
      ...Array.from({ length: 7 }, (_, index) => text(`d${index}`, "Dài")),
    ]);
    expect(plans.map((plan) => plan.size)).toEqual(["compact", "full", "full"]);
  });

  it("stretches an unpaired compact section across the row", () => {
    const plans = planFormSections([text("a", "A"), text("b", "B"), text("c", "C")]);
    expect(sectionSpans(plans)).toEqual(["half", "half", "full"]);
  });

  it("pairs an even number of compact sections side by side", () => {
    const plans = planFormSections([text("a", "A"), text("b", "B")]);
    expect(sectionSpans(plans)).toEqual(["half", "half"]);
  });
});
