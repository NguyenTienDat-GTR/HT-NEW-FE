"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/common/resource/resource-format";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { apiFetch, apiMutation } from "@/lib/api/client";
import { formatVietnamDateValue } from "@/lib/date-format";
import { candidateName } from "../send-form";
import { itemStatusLabels, statusLabels, statusTones, type CrossRequest, type RequestStatus } from "../types";
import { CourseInfoBlock } from "./course-info";
import { DecisionDialog } from "./decision-dialog";
import { resourceKey } from "@/lib/api/query-keys";

const filters: { value: "" | RequestStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: statusLabels.PENDING },
  { value: "APPROVED", label: statusLabels.APPROVED },
  { value: "REJECTED", label: statusLabels.REJECTED },
  { value: "CANCELLED", label: statusLabels.CANCELLED },
  { value: "EXPIRED", label: statusLabels.EXPIRED },
];

// Yêu cầu liên giáo hạt: giáo hạt nhà đồng ý / từ chối, giáo xứ theo dõi và thu hồi khi còn chờ.
export function RequestList() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"" | RequestStatus>("");
  const [decision, setDecision] = useState<{ request: CrossRequest; approve: boolean } | null>(null);

  const query = useQuery({
    queryKey: ["cross-deanery", "requests", status],
    queryFn: () => apiFetch<CrossRequest[]>(`/training/cross-deanery/requests${status ? `?status=${status}` : ""}`),
  });
  const requests = query.data ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["cross-deanery"] });
    await queryClient.invalidateQueries({ queryKey: resourceKey() });
  }

  const decide = useMutation({
    mutationFn: (body: { approved: boolean; note: string; itemIds: string[] }) =>
      apiMutation<CrossRequest>(`/training/cross-deanery/requests/${encodeURIComponent(decision?.request.id ?? "")}/decision`, "POST", {
        approved: body.approved,
        note: body.note || undefined,
        itemIds: body.itemIds,
      }),
    onSuccess: async (_data, body) => {
      toast.success(body.approved ? "Đã đồng ý, hồ sơ chờ giáo hạt tổ chức khóa duyệt" : "Đã từ chối yêu cầu");
      setDecision(null);
      await refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiMutation<CrossRequest>(`/training/cross-deanery/requests/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: async () => {
      toast.success("Đã thu hồi yêu cầu");
      await refresh();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${status === item.value ? "border-primary bg-primary-soft text-primary" : "border-border text-text-secondary hover:text-foreground"}`}
            key={item.value || "all"}
            onClick={() => setStatus(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {query.isLoading ? <Panel className="p-6 text-sm text-muted">Đang tải…</Panel> : null}
      {!query.isLoading && requests.length === 0 ? <Panel className="p-6 text-sm text-muted">Chưa có yêu cầu liên giáo hạt nào.</Panel> : null}

      {requests.map((request) => (
        <Panel className="space-y-3 p-4" key={request.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {request.parishName ?? request.homeDeaneryName ?? "—"} → khóa {request.courseName}
                {request.courseDeaneryName ? <span className="font-normal text-muted"> ({request.courseDeaneryName})</span> : null}
              </p>
              <p className="text-xs text-muted">
                {[`Giáo hạt nhà: ${request.homeDeaneryName ?? "—"}`, request.createdByName ? `Người gửi: ${request.createdByName}` : null, request.createdAt ? formatVietnamDateValue(request.createdAt) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Badge tone={statusTones[request.requestStatus]}>{statusLabels[request.requestStatus]}</Badge>
          </div>

          <CourseInfoBlock hostDeaneryName={request.courseDeaneryName} info={request.course} />

          <ul className="divide-y divide-border rounded-lg border border-border">
            {request.items.map((item) => (
              <li className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm" key={item.id}>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {candidateName(item)}
                    {item.parishName ? <span className="ml-2 text-xs font-normal text-muted">{item.parishName}</span> : null}
                  </p>
                  <p className="text-xs text-muted">Lí do gửi: {item.reason}</p>
                  {item.exceptionReason ? <p className="text-xs text-muted">Lí do ngoại lệ: {item.exceptionReason}</p> : null}
                  {item.note ? <p className="text-xs text-muted">Ghi chú: {item.note}</p> : null}
                </div>
                <span className="text-xs font-medium text-text-secondary">{itemStatusLabels[item.itemStatus]}</span>
              </li>
            ))}
          </ul>

          {request.decisionNote ? (
            <p className="text-xs text-muted">
              Ghi chú xử lý{request.decidedByName ? ` (${request.decidedByName})` : ""}: {request.decisionNote}
            </p>
          ) : null}

          {request.canDecide || request.canCancel ? (
            <div className="flex flex-wrap justify-end gap-2">
              {request.canCancel ? (
                <Button loading={cancel.isPending && cancel.variables === request.id} onClick={() => cancel.mutate(request.id)} type="button" variant="outline">
                  Thu hồi
                </Button>
              ) : null}
              {request.canDecide ? (
                <>
                  <Button onClick={() => setDecision({ request, approve: false })} type="button" variant="destructive">
                    Từ chối
                  </Button>
                  <Button onClick={() => setDecision({ request, approve: true })} type="button">
                    Đồng ý
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ))}

      {decision ? (
        <DecisionDialog approve={decision.approve} loading={decide.isPending} onClose={() => setDecision(null)} onSubmit={(body) => decide.mutate(body)} request={decision.request} />
      ) : null}
    </div>
  );
}
