import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormField } from "@/components/form/resource-form/form-controls";
import { planFormSections } from "@/components/form/resource-form/form-sections";
import { getFormSpec } from "@/components/form/resource-form/registry";
import { matchRoute } from "@/config/routes/routes";
import { useAuthStore } from "@/lib/auth/auth-store";

function respond(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ success: true, data })));
}

function permission(code: string, name: string, moduleCode: string, resourceCode: string, actionCode: string, scopeCode: string) {
  return { permissionCode: code, permissionName: name, moduleCode, resourceCode, actionCode, scopeCode };
}

function renderField(kind: "/system/account-permissions/new" | "/system/role-permissions/new", fieldName: string, value: string | string[], values: Record<string, unknown>) {
  const route = matchRoute(kind)!.route;
  const spec = getFormSpec(route, "create", null)!;
  const base = spec.fields.find((item) => item.name === fieldName)!;
  // Trang form đã tính sẵn endpoint theo giá trị các trường khác trước khi render trường.
  const field = { ...base, optionsEndpoint: base.buildOptionsEndpoint?.(values) ?? base.optionsEndpoint };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Tooltip.Provider>
        <FormField field={field} mode="create" onChange={() => undefined} value={value} values={values} />
      </Tooltip.Provider>
    </QueryClientProvider>,
  );
}

describe("chọn tài khoản và quyền khi phân quyền", () => {
  beforeEach(() => {
    useAuthStore.getState().setAccessToken("token");
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("ô tài khoản rộng hết nhóm và hiện vai trò, huynh trưởng, giáo xứ, giáo hạt của từng tài khoản", async () => {
    const route = matchRoute("/system/account-permissions/new")!.route;
    const spec = getFormSpec(route, "create", null)!;
    const usernameField = spec.fields.find((item) => item.name === "username")!;
    expect(usernameField.wide).toBe(true);
    // Nhóm chứa ô tài khoản chiếm trọn hàng thay vì nửa hàng.
    expect(planFormSections(spec.fields).find((plan) => plan.title === usernameField.section)?.size).toBe("full");

    respond([
      {
        username: "admin.buoc", roleNames: ["Admin giáo xứ"], leaderHolyName: "Phêrô", leaderFullName: "Nguyễn Văn An",
        parishName: "Bà Lụa", deaneryName: "Thủ Dầu Một",
      },
      { username: "khac", roleNames: ["Thư ký"], parishName: "Búng" },
    ]);
    renderField("/system/account-permissions/new", "username", "", {});
    fireEvent.focus(screen.getByRole("textbox"));
    expect(await screen.findByText("Vai trò: Admin giáo xứ")).toBeInTheDocument();
    expect(screen.getByText("Huynh trưởng: Phêrô Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText("Giáo xứ / giáo họ / giáo điểm: Bà Lụa")).toBeInTheDocument();
    expect(screen.getByText("Giáo hạt: Thủ Dầu Một")).toBeInTheDocument();

    // Tìm theo tên huynh trưởng (không dấu) cũng ra đúng tài khoản.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nguyen van an" } });
    await waitFor(() => expect(screen.queryByText("Vai trò: Thư ký")).not.toBeInTheDocument());
    expect(screen.getByText("Huynh trưởng: Phêrô Nguyễn Văn An")).toBeInTheDocument();
  });

  it.each([
    ["/system/account-permissions/new", "permissionCodes", { username: "u1" }],
    ["/system/role-permissions/new", "permissionCodes", { roleCode: "R1" }],
  ] as const)("danh sách quyền (%s) lọc được theo phạm vi, đối tượng, thao tác", async (path, fieldName, values) => {
    respond([
      permission("leader.read.diocese", "Xem huynh trưởng giáo phận", "leader", "leader", "read", "diocese"),
      permission("leader.read.parish", "Xem huynh trưởng giáo xứ", "leader", "leader", "read", "parish"),
      permission("training.course.create.diocese", "Tạo khóa giáo phận", "training", "course", "create", "diocese"),
    ]);
    renderField(path, fieldName, [], values);
    expect(await screen.findByText("Xem huynh trưởng giáo xứ")).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 3/3 quyền")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Lọc theo phạm vi"), { target: { value: "diocese" } });
    expect(screen.queryByText("Xem huynh trưởng giáo xứ")).not.toBeInTheDocument();
    expect(screen.getByText("Hiển thị 2/3 quyền")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Lọc theo thao tác"), { target: { value: "create" } });
    expect(screen.getByText("Tạo khóa giáo phận")).toBeInTheDocument();
    expect(screen.queryByText("Xem huynh trưởng giáo phận")).not.toBeInTheDocument();
    expect(screen.getByText("Hiển thị 1/3 quyền")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(screen.getByText("Hiển thị 3/3 quyền")).toBeInTheDocument();
  });
});
