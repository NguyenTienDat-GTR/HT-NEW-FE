import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationDetailModal } from "@/modules/notifications/components/notification-detail-modal";

afterEach(() => cleanup());

const certificateItem = {
  id: "n1",
  eventType: "training.certificate.revoked",
  title: "Chứng nhận đã bị thu hồi",
  payload: JSON.stringify({
    kind: "DECISION_LIST",
    decision: "CERTIFICATE_REVOKED",
    heading: "Khóa Huấn luyện A",
    actorName: "Quản trị viên",
    items: [{ label: "Nguyễn Văn An", detail: "Giáo xứ Bà Lụa · Chứng nhận GPPC-HTI-2026-1", note: "Nhập nhầm" }],
  }),
};

describe("NotificationDetailModal", () => {
  it("thông báo kết quả một hồ sơ cũng có bảng chi tiết: khóa, huynh trưởng, giáo xứ / mã chứng nhận, lý do và người thực hiện", () => {
    render(<NotificationDetailModal item={certificateItem} onClose={() => undefined} />);
    expect(screen.getByText("Khóa Huấn luyện A")).toBeInTheDocument();
    expect(screen.getByText(/Thực hiện bởi Quản trị viên/)).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText(/Chứng nhận GPPC-HTI-2026-1/)).toBeInTheDocument();
    expect(screen.getByText(/Lý do: Nhập nhầm/)).toBeInTheDocument();
  });

  it("có nút mở màn hình liên quan (chứng nhận hoặc khóa) để không mất đường vào từ thông báo", () => {
    const onOpenTarget = vi.fn();
    render(<NotificationDetailModal item={certificateItem} onClose={() => undefined} onOpenTarget={onOpenTarget} />);
    fireEvent.click(screen.getByRole("button", { name: "Xem chứng nhận" }));
    expect(onOpenTarget).toHaveBeenCalledTimes(1);

    cleanup();
    render(<NotificationDetailModal item={{ ...certificateItem, eventType: "training.registration.approved" }} onClose={() => undefined} onOpenTarget={onOpenTarget} />);
    expect(screen.getByRole("button", { name: "Mở khóa huấn luyện" })).toBeInTheDocument();
  });

  it("thông báo thu hồi quyền hiện danh sách quyền bị thu hồi cùng nút xem quyền hiện có", () => {
    const onViewPermissions = vi.fn();
    render(
      <NotificationDetailModal
        item={{
          id: "n2",
          eventType: "ACCOUNT_PERMISSION_REVOKED",
          title: "Bạn bị thu hồi 1 quyền",
          payload: JSON.stringify({
            kind: "PERMISSION_REVOKE",
            targetType: "ACCOUNT",
            targetName: "an",
            heading: "Quyền vừa bị thu hồi",
            items: [{ label: "Xem hồ sơ huynh trưởng", detail: "Huynh trưởng · Xem · Giáo phận", code: "organization.leader.read.diocese" }],
          }),
        }}
        onClose={() => undefined}
        onViewPermissions={onViewPermissions}
      />,
    );
    expect(screen.getByText("Quyền vừa bị thu hồi")).toBeInTheDocument();
    expect(screen.getByText("Xem hồ sơ huynh trưởng")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Xem quyền hiện có/ }));
    expect(onViewPermissions).toHaveBeenCalledTimes(1);
  });
});
