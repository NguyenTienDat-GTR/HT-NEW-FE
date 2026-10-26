"use client";

import { cn } from "@/lib/utils";
import { candidateName } from "../candidate-filter";
import { resultLabels, type CopyCandidate } from "../types";

// Danh sách hồ sơ có thể sao chép: mặc định chọn hết, người dùng bỏ tick hồ sơ không muốn sao chép.
// Hồ sơ không sao chép được (đã có trong khóa...) hiển thị mờ, không chọn được.
export function CandidateTable({
  rows,
  excluded,
  onToggle,
  onToggleAll,
  showSource,
}: {
  rows: CopyCandidate[];
  excluded: ReadonlySet<string>;
  onToggle: (leaderId: string) => void;
  onToggleAll: (checked: boolean) => void;
  showSource: boolean;
}) {
  const selectable = rows.filter((row) => !row.blockedReason);
  const allChecked = selectable.length > 0 && selectable.every((row) => !excluded.has(row.leaderId));
  const someChecked = selectable.some((row) => !excluded.has(row.leaderId));

  return (
    <div className="max-h-[46vh] overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 w-10 border-b border-border bg-slate-50 px-3 py-2.5">
              <input
                aria-label="Chọn tất cả hồ sơ đang hiển thị"
                checked={allChecked}
                className="h-4 w-4 accent-primary"
                disabled={selectable.length === 0}
                onChange={(event) => onToggleAll(event.target.checked)}
                ref={(element) => {
                  if (element) element.indeterminate = someChecked && !allChecked;
                }}
                type="checkbox"
              />
            </th>
            <Th>Huynh trưởng</Th>
            <Th>Giáo xứ / Giáo hạt</Th>
            {showSource ? <Th>Khóa tiên quyết</Th> : null}
            <Th>Kết quả</Th>
            <Th>Ghi chú</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-sm text-muted" colSpan={showSource ? 6 : 5}>
                Không có hồ sơ nào phù hợp.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const blocked = Boolean(row.blockedReason);
              const checked = !blocked && !excluded.has(row.leaderId);
              return (
                <tr className={cn("align-top", blocked ? "bg-surface-1/60 text-muted" : "hover:bg-surface-1/60")} key={row.leaderId}>
                  <td className="border-b border-border px-3 py-2.5">
                    <input
                      aria-label={`Chọn ${candidateName(row)}`}
                      checked={checked}
                      className="h-4 w-4 accent-primary"
                      disabled={blocked}
                      onChange={() => onToggle(row.leaderId)}
                      type="checkbox"
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <span className={cn("font-medium", blocked ? "text-muted" : "text-foreground")}>{candidateName(row)}</span>
                  </td>
                  <td className="border-b border-border px-3 py-2.5">
                    <span className="block">{row.parishName ?? "—"}</span>
                    <span className="block text-xs text-muted">{row.deaneryName ?? ""}</span>
                  </td>
                  {showSource ? <td className="border-b border-border px-3 py-2.5 text-[13px]">{row.sourceCourseName}</td> : null}
                  <td className="border-b border-border px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                        row.finalResult === "PASSED" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger",
                      )}
                    >
                      {resultLabels[row.finalResult]}
                    </span>
                  </td>
                  <td className="border-b border-border px-3 py-2.5 text-xs">
                    {blocked ? (
                      <span className="font-medium text-text-secondary">{row.blockedReason}</span>
                    ) : !row.eligible ? (
                      <span className="font-medium text-warning">Chưa đủ điều kiện của khóa</span>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="sticky top-0 z-10 border-b border-border bg-slate-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</th>;
}
