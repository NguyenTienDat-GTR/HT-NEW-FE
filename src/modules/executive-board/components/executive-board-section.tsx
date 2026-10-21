"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar, Badge } from "@/components/common/resource/resource-format";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { formatDate } from "@/modules/leaders/components/leader-detail-utils";

type UnitKind = "dioceses" | "deaneries" | "parishes";

type Seat = {
  positionCode: string;
  positionName: string;
  assigned: boolean;
  assignmentId?: string;
  leaderHolyName?: string | null;
  leaderFullName?: string | null;
  leaderEmail?: string | null;
  leaderPhoneNumber?: string | null;
  leaderImageUrl?: string | null;
  leaderParishName?: string | null;
  leaderDeaneryName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

const UNIT_TYPE: Record<UnitKind, string> = { dioceses: "DIOCESE", deaneries: "DEANERY", parishes: "PARISH" };

// Ban điều hành của đơn vị: mỗi chức vụ đang hoạt động là một thẻ, danh sách thẻ cuộn riêng.
export function ExecutiveBoardSection({ kind, unitId }: { kind: UnitKind; unitId: string }) {
  const query = useQuery({
    queryKey: ["executive-board-seats", UNIT_TYPE[kind], unitId],
    queryFn: () => apiFetch<Seat[]>(`/executive-board/boards/${UNIT_TYPE[kind]}/${encodeURIComponent(unitId)}`),
  });
  const seats = query.data ?? [];
  const assignedCount = seats.filter((seat) => seat.assigned).length;
  // Hiển thị đơn vị của huynh trưởng theo phạm vi đang xem: giáo phận thấy giáo xứ + giáo hạt, giáo hạt thấy giáo xứ, giáo xứ không cần.
  const showParish = kind !== "parishes";
  const showDeanery = kind === "dioceses";

  return (
    <section className="rounded-[12px] border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase text-muted">Ban điều hành</h2>
        {query.data ? <span className="text-xs text-muted">{assignedCount}/{seats.length} chức vụ đã phân công</span> : null}
      </div>
      {query.isLoading ? <div className="mt-3 h-32 rounded-[10px] bg-surface-2 motion-safe:animate-pulse" /> : null}
      {query.isError ? <p className="mt-3 text-sm text-danger">{getApiErrorMessage(query.error)}</p> : null}
      {query.data && seats.length === 0 ? <p className="mt-3 text-sm text-muted">Chưa có chức vụ nào đang hoạt động ở cấp này.</p> : null}
      {seats.length ? (
        <div className="mt-3 grid max-h-[420px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
          {seats.map((seat) => (
            <SeatCard key={seat.positionCode} seat={seat} showDeanery={showDeanery} showParish={showParish} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SeatCard({ seat, showParish, showDeanery }: { seat: Seat; showParish: boolean; showDeanery: boolean }) {
  const leaderName = [seat.leaderHolyName, seat.leaderFullName].filter(Boolean).join(" ");
  const unitLine = [showParish ? seat.leaderParishName : null, showDeanery ? seat.leaderDeaneryName : null].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface-1/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{seat.positionName}</h3>
        <Badge tone={seat.assigned ? "success" : "neutral"}>{seat.assigned ? "Đã phân công" : "Chưa phân công"}</Badge>
      </div>
      {seat.assigned ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={seat.leaderFullName ?? ""} src={seat.leaderImageUrl} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{leaderName || "—"}</p>
              {unitLine ? <p className="truncate text-xs text-muted">{unitLine}</p> : null}
            </div>
          </div>
          <dl className="grid gap-1 text-xs">
            <ContactRow label="Email" value={seat.leaderEmail} />
            <ContactRow label="Số điện thoại" value={seat.leaderPhoneNumber} />
            <ContactRow label="Bắt đầu" value={seat.startDate ? formatDate(seat.startDate) : null} />
            <ContactRow label="Kết thúc" value={seat.endDate ? formatDate(seat.endDate) : "Chưa xác định"} />
          </dl>
        </>
      ) : (
        <p className="text-sm text-muted">Chưa có huynh trưởng được phân công.</p>
      )}
    </article>
  );
}

function ContactRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{value || "—"}</dd>
    </div>
  );
}
