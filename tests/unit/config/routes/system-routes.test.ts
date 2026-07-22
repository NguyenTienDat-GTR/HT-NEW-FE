import { describe, expect, it } from "vitest";
import { systemRouteGroup } from "@/config/routes/groups/system";

describe("system route filters", () => {
  it("includes effect filter on permission catalog list", () => {
    const permissionRoute = systemRouteGroup.children.find((route) => route.path === "/system/permissions");

    expect(permissionRoute?.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "effect",
          label: "Hiệu lực",
          type: "select",
          options: [
            { value: "ALLOW", label: "Cho phép" },
            { value: "DENY", label: "Từ chối" },
          ],
        }),
      ]),
    );
  });
});
