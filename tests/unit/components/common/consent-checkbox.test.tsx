import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ConsentCheckbox, type ConsentVariant } from "@/components/common/consent-checkbox";
import { PRIVACY_POLICY_PATH } from "@/modules/privacy/constants";

afterEach(cleanup);

function Harness({ variant, error }: { variant: ConsentVariant; error?: string | null }) {
  const [checked, setChecked] = useState(false);
  return <ConsentCheckbox checked={checked} error={error} onChange={setChecked} variant={variant} />;
}

describe("ConsentCheckbox", () => {
  it("never starts ticked and toggles on click", () => {
    render(<Harness variant="self" />);
    const box = screen.getByRole("checkbox");
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
  });

  it("links to the policy in a new tab and states the purpose (self)", () => {
    render(<Harness variant="self" />);
    const link = screen.getByRole("link", { name: /Chính sách bảo vệ dữ liệu cá nhân/ });
    expect(link).toHaveAttribute("href", PRIVACY_POLICY_PATH);
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/quản lý hồ sơ\s+huynh trưởng/)).toBeInTheDocument();
    expect(screen.getByText(/Tôi đồng ý/)).toBeInTheDocument();
  });

  it("asks the admin to confirm the data subject agreed (attestation)", () => {
    render(<Harness variant="attestation" />);
    expect(screen.getByText(/Tôi xác nhận người có thông tin/)).toBeInTheDocument();
  });

  it("shows the error message and marks the box invalid", () => {
    render(<Harness error="Vui lòng tích đồng ý" variant="self" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng tích đồng ý");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  });
});
