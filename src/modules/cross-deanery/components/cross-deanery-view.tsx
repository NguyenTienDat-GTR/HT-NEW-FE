"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { InvitationList } from "./invitation-list";
import { RequestList } from "./request-list";
import { SendPanel } from "./send-panel";

// Gửi hồ sơ sang khóa giáo hạt của giáo hạt khác: tab yêu cầu (theo dõi / đồng ý) và tab gửi hồ sơ mới.
export function CrossDeaneryView() {
  const user = useAuthStore((state) => state.user);
  const canSend = hasPermissionPrefix(user, "training.participation.submit.parish") || hasPermissionPrefix(user, "training.participation.submit.deanery");
  const canDecide = hasPermissionPrefix(user, "training.participation.cross_approve.");
  // Thông báo "khóa mở liên giáo hạt" mở thẳng tab khóa mời (?tab=invitations).
  const initialTab = useSearchParams().get("tab") === "invitations" && canDecide ? "invitations" : "requests";
  const [tab, setTab] = useState<"invitations" | "requests" | "send">(initialTab);
  const tabs = [
    ...(canDecide ? [{ key: "invitations" as const, label: "Khóa mở liên giáo hạt" }] : []),
    { key: "requests" as const, label: "Yêu cầu liên giáo hạt" },
    ...(canSend ? [{ key: "send" as const, label: "Gửi hồ sơ sang giáo hạt khác" }] : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold leading-7 text-foreground">Gửi hồ sơ liên giáo hạt</h1>
        <p className="mt-1 text-sm text-muted">
          Giáo hạt tổ chức khóa mở khóa cho giáo hạt khác (cùng giáo phận); giáo hạt nhà cho phép khóa, giáo xứ gửi huynh trưởng, giáo hạt nhà đồng ý từng yêu cầu, rồi giáo hạt tổ chức khóa duyệt. Mỗi hồ sơ phải kèm lí do riêng.
        </p>
      </div>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((item) => (
          <button
            aria-selected={tab === item.key}
            className={cn("-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors", tab === item.key ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-foreground")}
            key={item.key}
            onClick={() => setTab(item.key)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "send" && canSend ? <SendPanel onSent={() => setTab("requests")} /> : tab === "invitations" && canDecide ? <InvitationList /> : <RequestList />}
    </div>
  );
}
