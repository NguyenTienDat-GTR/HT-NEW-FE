"use client";

import { Panel } from "@/components/ui/panel";
import { unitLabel, type TeamOverview } from "../types";

// Tóm tắt chia đội của khóa và bảng sĩ số / nam nữ / số đơn vị của từng đội.
export function TeamOverviewPanel({ overview }: { overview: TeamOverview }) {
  const unit = unitLabel(overview.unitType);
  const undivided = overview.totalParticipants - overview.dividedParticipants;
  return (
    <Panel className="px-4 py-3.5">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
        <Item label="Tổng hồ sơ tham dự" value={overview.totalParticipants} />
        <Item label="Nam" value={overview.male} />
        <Item label="Nữ" value={overview.female} />
        <Item label="Số đội" value={overview.teams.length} />
        <Item label="Chưa vào đội" value={undivided} />
      </dl>
      {overview.teams.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-primary">Chi tiết từng đội</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13px]">
              <thead className="text-xs uppercase text-text-secondary">
                <tr>
                  <th className="py-1.5 pr-4 font-semibold">Đội</th>
                  <th className="py-1.5 pr-4 font-semibold">Hồ sơ</th>
                  <th className="py-1.5 pr-4 font-semibold">Nam</th>
                  <th className="py-1.5 pr-4 font-semibold">Nữ</th>
                  <th className="py-1.5 font-semibold">Số {unit}</th>
                </tr>
              </thead>
              <tbody>
                {overview.teams.map((team) => (
                  <tr className="border-t border-border" key={team.teamName}>
                    <td className="py-1.5 pr-4 font-medium text-foreground">{team.teamName}</td>
                    <td className="py-1.5 pr-4">{team.total}</td>
                    <td className="py-1.5 pr-4">{team.male}</td>
                    <td className="py-1.5 pr-4">{team.female}</td>
                    <td className="py-1.5">{team.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : (
        <p className="mt-3 text-[13px] text-muted">Khóa chưa chia đội. Bấm &ldquo;Chia đội&rdquo; để cấu hình hoặc nhập excel danh sách đã chia đội.</p>
      )}
    </Panel>
  );
}

function Item({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}
