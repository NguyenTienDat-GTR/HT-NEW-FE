import { Provider as TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { RowActions } from "@/components/common/resource/resource-table";
import { systemRouteGroup } from "@/config/routes/groups/system";
import { useAuthStore, type AuthUser } from "@/lib/auth/auth-store";

const accountsRoute = systemRouteGroup.children.find((route) => route.path === "/system/accounts")!;

function actor(permissions: string[], username = "admin.deanery"): AuthUser {
  return { username, roles: ["ADMIN_DEANERY"], permissions };
}

function row(overrides: Record<string, unknown> = {}) {
  return { username: "parish.admin", primaryRoleCode: "ADMIN_PARISH", status: true, ...overrides };
}

function renderFor(user: AuthUser, accountRow: Record<string, unknown>) {
  useAuthStore.setState({ user });
  return render(
    <TooltipProvider>
      <RowActions route={accountsRoute} row={accountRow} />
    </TooltipProvider>,
  );
}

describe("account reset password row action", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it("declares a dedicated reset_password permission instead of reusing account manage permission", () => {
    expect(accountsRoute.actions?.resetPassword).toMatchObject({
      label: "Đặt lại mật khẩu",
      permissionPrefixes: ["system.account.reset_password."],
    });
  });

  it("shows the reset button with a resetPassword query for a manageable account", () => {
    renderFor(actor(["system.account.manage.deanery", "system.account.reset_password.deanery"]), row());

    const button = screen.getByRole("link", { name: "Đặt lại mật khẩu" });
    expect(button).toHaveAttribute("href", "/system/accounts?resetPassword=parish.admin");
  });

  it("hides the reset button when the actor only has the manage permission", () => {
    renderFor(actor(["system.account.manage.deanery"]), row());

    expect(screen.queryByRole("link", { name: "Đặt lại mật khẩu" })).not.toBeInTheDocument();
  });

  it("hides the reset button for the actor's own account", () => {
    renderFor(actor(["system.account.reset_password.deanery"], "parish.admin"), row());

    expect(screen.queryByRole("link", { name: "Đặt lại mật khẩu" })).not.toBeInTheDocument();
  });

  it("hides the reset button for SUPER_ADMIN accounts", () => {
    renderFor(actor(["system.account.reset_password.all"]), row({ primaryRoleCode: "SUPER_ADMIN" }));

    expect(screen.queryByRole("link", { name: "Đặt lại mật khẩu" })).not.toBeInTheDocument();
  });

  it("hides the reset button for locked accounts", () => {
    renderFor(actor(["system.account.reset_password.deanery"]), row({ status: false }));

    expect(screen.queryByRole("link", { name: "Đặt lại mật khẩu" })).not.toBeInTheDocument();
  });
});
