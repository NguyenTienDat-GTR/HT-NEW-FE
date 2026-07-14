import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedMetric } from "./animated-metric";

describe("AnimatedMetric", () => {
  it("announces the final value immediately for assistive technology", () => {
    render(<AnimatedMetric label="Huynh trưởng" value={1234} />);
    expect(screen.getByLabelText("Huynh trưởng: 1.234")).toBeInTheDocument();
  });
});
