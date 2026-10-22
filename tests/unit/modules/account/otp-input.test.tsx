import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "@/modules/account/components/otp-input";

function Harness({ onComplete }: { onComplete: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <OtpInput onChange={setValue} onComplete={onComplete} value={value} />;
}

describe("OtpInput", () => {
  it("fills all boxes from a pasted code and completes", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    fireEvent.paste(screen.getByLabelText("Chữ số 1"), { clipboardData: { getData: () => "12 34 56" } });

    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(screen.getByLabelText("Chữ số 6")).toHaveValue("6");
  });

  it("ignores non-digit input", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText("Chữ số 1"), { target: { value: "a" } });

    expect(screen.getByLabelText("Chữ số 1")).toHaveValue("");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
