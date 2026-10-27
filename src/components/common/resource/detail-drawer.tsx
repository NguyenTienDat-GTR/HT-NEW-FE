"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import type { RouteConfig } from "@/config/routes/routes";
import { useEmbeddedResource } from "./embedded-resource-context";
import { UnitDetail } from "@/modules/organizations/components/unit-detail";
import { CertificateDetailDrawer } from "@/modules/certificates/components/certificate-detail-drawer";
import { ResourceCell, columnLabels, formatLeaderLevel } from "./resource-format";
import { AUDIT_SECTION, hasNumber, hasText, type DetailSection } from "./detail-section-types";
import { SYSTEM_DETAIL_SECTIONS } from "./system-detail-sections";

const AUDIT_KEYS = ["createdAt", "createdBy", "updatedAt", "updatedBy"] as const;
const FULL_WIDTH_KEYS = new Set(["description", "reason", "conditions", "approvalReason", "exceptionApprovalReason"]);
const ORG_PRIMARY_KEYS = ["name", "patronSaintDay", "establishmentDate"];
const LEADER_PRIMARY_KEYS = [
  "imageUrl",
  "holyName",
  "fullName",
  "firstName",
  "lastName",
  "birthDate",
  "gender",
  "leaderLevel",
  "deaneryName",
  "parishName",
  "email",
  "phoneNumber",
];

// Hồ sơ tham dự: ẩn mã định danh (UUID), các trường trùng nghĩa và thông tin đã có ở phần thông tin khóa.
const PARTICIPATION_HIDDEN_KEYS = new Set([
  "id",
  "leaderId",
  "courseCode",
  "courseTypeCode",
  "parishId",
  "deaneryId",
  "managementUnitType",
  // result trùng "Kết quả" (passed); status là cờ hoạt động của bản ghi, trùng ý nghĩa với trạng thái tham dự/duyệt.
  "result",
  "status",
]);
const PARTICIPATION_EMBEDDED_HIDDEN_KEYS = new Set(["courseName", "passingScore"]);
const PARTICIPATION_PRIMARY_KEYS = [
  "leaderFullName",
  "parishName",
  "deaneryName",
  "registrationDate",
  "participationStatus",
  "approvalStatus",
  "eligible",
  "exceptionReason",
  "offTargetReason",
  "crossDeaneryReason",
  "registrationNote",
  "review",
  "componentScores",
  "totalScore",
  "passed",
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RankHistoryRow = {
  id?: number;
  oldLevel?: string | null;
  newLevel?: string | null;
  promotionDate?: string | null;
  note?: string | null;
};

export function DetailDrawer({ id, onClose, route }: { id?: string | null; onClose: () => void; route: RouteConfig }) {
  // Chứng nhận có drawer riêng: nhóm thông tin tiếng Việt, ảnh xem trước và chế độ mở rộng.
  if (route.kind === "certificates") return <CertificateDetailDrawer endpoint={route.endpoint ?? "/certificates"} id={id} onClose={onClose} />;
  return <GenericDetailDrawer id={id} onClose={onClose} route={route} />;
}

function GenericDetailDrawer({ id, onClose, route }: { id?: string | null; onClose: () => void; route: RouteConfig }) {
  const query = useQuery({
    queryKey: ["resource-detail", route.endpoint, id],
    enabled: Boolean(id && route.endpoint),
    queryFn: () => apiFetch<Record<string, unknown>>(`${route.endpoint}/${encodeURIComponent(String(id))}`),
  });
  const embedded = useEmbeddedResource();
  const row = query.data;
  // Giáo phận / giáo hạt / giáo xứ: drawer rộng hơn để chứa ban điều hành của đơn vị.
  const isUnitKind = route.kind === "dioceses" || route.kind === "deaneries" || route.kind === "parishes";
  const keys = row ? detailKeys(route, row, Boolean(embedded)) : route.columns;
  const rankHistoryQuery = useQuery({
    queryKey: ["leader-rank-history", id],
    enabled: Boolean(id && route.kind === "leaders"),
    queryFn: () => apiFetch<RankHistoryRow[]>(`${route.endpoint}/${encodeURIComponent(String(id))}/rank-history`),
  });

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className={`fixed bottom-0 right-0 top-0 z-50 flex w-full ${isUnitKind ? "max-w-[820px]" : "max-w-[600px]"} flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none`}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
            <div>
              <Dialog.Title className="text-base font-semibold leading-6 text-foreground">{route.title}</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] leading-5 text-muted">
                {route.kind === "participations"
                  ? "Chi tiết hồ sơ tham dự"
                  : route.kind === "course-types"
                    ? typeof row?.typeName === "string" ? row.typeName : "Chi tiết loại khóa"
                  : route.kind === "positions"
                    ? typeof row?.positionName === "string" ? row.positionName : "Chi tiết chức vụ"
                    : route.kind === "executive-board"
                    ? "Chi tiết phân công ban điều hành"
                    : `Chi tiết ${route.title.toLowerCase()}`}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
            {query.isLoading ? <div className="h-40 rounded-xl border border-border bg-white motion-safe:animate-pulse" /> : null}
            {query.isError ? <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{getApiErrorMessage(query.error)}</div> : null}
            {row && route.kind === "positions" ? <SectionedDetail row={row} sections={POSITION_SECTIONS} /> : null}
            {row && route.kind === "participations" ? <SectionedDetail row={row} sections={PARTICIPATION_SECTIONS} /> : null}
            {row && route.kind === "course-types" ? <SectionedDetail row={row} sections={COURSE_TYPE_SECTIONS} /> : null}
            {row && route.kind === "executive-board" ? <SectionedDetail row={row} sections={ASSIGNMENT_SECTIONS} /> : null}
            {row && SYSTEM_DETAIL_SECTIONS[route.kind] ? <SectionedDetail row={row} sections={SYSTEM_DETAIL_SECTIONS[route.kind]} /> : null}
            {row && (route.kind === "dioceses" || route.kind === "deaneries" || route.kind === "parishes") ? <UnitDetail id={String(id)} kind={route.kind} row={row} /> : null}
            {row && route.kind !== "positions" && route.kind !== "executive-board" && route.kind !== "participations" && route.kind !== "course-types" && !isUnitKind && !SYSTEM_DETAIL_SECTIONS[route.kind] ? (
              <div className="space-y-3">
                <dl className="grid auto-rows-min grid-cols-1 gap-x-6 gap-y-3.5 rounded-xl border border-border bg-white p-4 shadow-sm sm:grid-cols-2">
                  {keys.map((key) => (
                    <div className={detailItemClass(key)} key={key}>
                      <dt className="text-xs font-medium text-muted">{detailLabel(route, key)}</dt>
                      <dd className="mt-0.5 break-words text-sm leading-5 text-foreground">
                        {route.kind === "participations" && key === "componentScores" ? (
                          <ComponentScoreList scores={row[key]} />
                        ) : route.kind === "participations" && typeof row[key] === "string" && row[key] === "SYSTEM_AUTO_APPROVAL" ? (
                          "Hệ thống tự duyệt"
                        ) : (
                          <ResourceCell column={key} displayMode="detail" row={row} value={row[key]} />
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {route.kind === "leaders" ? (
                  <LeaderRankHistory
                    error={rankHistoryQuery.isError ? getApiErrorMessage(rankHistoryQuery.error) : undefined}
                    histories={rankHistoryQuery.data}
                    loading={rankHistoryQuery.isLoading}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const POSITION_SECTIONS: DetailSection[] = [
  {
    title: "Thông tin chức vụ",
    fields: [
      { key: "positionName", label: "Tên chức vụ", wide: true },
      { key: "positionType", label: "Cấp áp dụng" },
      { key: "displayOrder", label: "Thứ tự hiển thị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  AUDIT_SECTION,
];

const ASSIGNMENT_SECTIONS: DetailSection[] = [
  {
    title: "Thông tin phân công",
    fields: [
      {
        key: "leaderName",
        label: "Huynh trưởng",
        wide: true,
        value: (row) => [row.leaderHolyName, row.leaderFullName].filter((part) => typeof part === "string" && part.trim()).join(" "),
      },
      { key: "leaderParishName", label: "Giáo xứ" },
      { key: "leaderDeaneryName", label: "Giáo hạt" },
      { key: "positionName", label: "Chức vụ" },
      { key: "unitType", label: "Cấp áp dụng" },
      { key: "unitName", label: "Đơn vị" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Thời gian hiệu lực",
    fields: [
      { key: "startDate", label: "Ngày bắt đầu" },
      { key: "endDate", label: "Ngày kết thúc" },
    ],
  },
  AUDIT_SECTION,
];

// Loại khóa huấn luyện: gom theo ý nghĩa, ẩn mã định danh (UUID), khóa tiên quyết hiển thị bằng tên.
const COURSE_TYPE_SECTIONS: DetailSection[] = [
  {
    title: "Thông tin loại khóa",
    fields: [
      { key: "typeName", label: "Tên loại khóa", wide: true },
      { key: "managementUnitType", label: "Cấp quản lý" },
      { key: "certificateShortCode", label: "Mã viết tắt chứng chỉ", visible: (row) => hasText(row.certificateShortCode) },
      { key: "status", label: "Trạng thái" },
    ],
  },
  {
    title: "Điều kiện tham dự",
    fields: [
      { key: "requiredCurrentLevel", label: "Cấp hiện tại yêu cầu", render: (row) => (hasText(row.requiredCurrentLevel) ? <ResourceCell column="requiredCurrentLevel" displayMode="detail" row={row} value={row.requiredCurrentLevel} /> : "Không yêu cầu") },
      { key: "requiredMinAge", label: "Tuổi tối thiểu", render: (row) => (hasNumber(row.requiredMinAge) ? `${row.requiredMinAge} tuổi` : "Không yêu cầu") },
      { key: "requiredYearsActive", label: "Số năm sinh hoạt", render: (row) => (hasNumber(row.requiredYearsActive) ? `${row.requiredYearsActive} năm` : "Không yêu cầu") },
    ],
  },
  {
    title: "Khóa tiên quyết và nâng cấp",
    fields: [
      { key: "prerequisiteTypeName", label: "Khóa tiên quyết", render: (row) => (hasText(row.prerequisiteTypeName) ? String(row.prerequisiteTypeName) : "Không có") },
      {
        key: "maxYearsAfterPrerequisite",
        label: "Thời hạn tối đa sau khóa tiên quyết",
        visible: (row) => hasText(row.prerequisiteTypeName),
        render: (row) => (hasNumber(row.maxYearsAfterPrerequisite) ? `${row.maxYearsAfterPrerequisite} năm` : "Không giới hạn"),
      },
      {
        key: "resultingLevel",
        label: "Cấp độ khi hoàn thành",
        render: (row) =>
          hasText(row.resultingLevel) && row.resultingLevel !== "NONE" ? (
            <ResourceCell column="resultingLevel" displayMode="detail" row={row} value={row.resultingLevel} />
          ) : (
            "Không có (không yêu cầu chứng nhận)"
          ),
      },
    ],
  },
  AUDIT_SECTION,
];

// Hồ sơ tham dự (4 tab của khóa: đăng ký, duyệt đăng ký, danh sách tham dự, chấm điểm): gom theo ý nghĩa, ẩn mã định danh.
const PARTICIPATION_SECTIONS: DetailSection[] = [
  {
    title: "Huynh trưởng",
    fields: [
      { key: "leaderFullName", label: "Họ và tên", wide: true },
      { key: "leaderLevel", label: "Cấp huynh trưởng" },
      { key: "parishName", label: "Giáo xứ" },
      { key: "deaneryName", label: "Giáo hạt" },
    ],
  },
  {
    title: "Đăng ký tham dự",
    fields: [
      { key: "courseName", label: "Khóa huấn luyện", wide: true, visible: (_row, embedded) => !embedded },
      { key: "registrationDate", label: "Ngày đăng ký" },
      { key: "participationStatus", label: "Trạng thái tham dự" },
      { key: "eligible", label: "Đủ điều kiện", render: (row) => (row.eligible === false ? "Chưa đủ điều kiện (hồ sơ ngoại lệ)" : "Đủ điều kiện") },
      { key: "parishSubmittedAt", label: "Giáo xứ gửi lúc", visible: (row) => hasText(row.parishSubmittedAt) },
      { key: "exceptionReason", label: "Lý do ngoại lệ", wide: true, visible: (row) => hasText(row.exceptionReason) },
      { key: "offTargetReason", label: "Lý do gửi ngoài đợt", wide: true, visible: (row) => hasText(row.offTargetReason) },
      { key: "crossDeaneryReason", label: "Lý do gửi liên giáo hạt", wide: true, visible: (row) => hasText(row.crossDeaneryReason) },
      { key: "homeDeaneryName", label: "Giáo hạt gửi sang", visible: (row) => hasText(row.crossDeaneryReason) },
      { key: "homeDeaneryApprovedBy", label: "Giáo hạt nhà đồng ý bởi", visible: (row) => hasText(row.homeDeaneryApprovedBy) },
      { key: "registrationNote", label: "Ghi chú đăng ký", wide: true, visible: (row) => hasText(row.registrationNote) },
    ],
  },
  {
    title: "Phê duyệt đăng ký",
    fields: [
      { key: "approvalStatus", label: "Trạng thái duyệt" },
      {
        key: "approvedBy",
        label: "Người duyệt",
        // Mã định danh (UUID) không hiển thị; chỉ hiện khi hệ thống tự duyệt.
        render: (row) => (row.approvedBy === "SYSTEM_AUTO_APPROVAL" ? "Hệ thống tự duyệt" : <span className="text-muted">—</span>),
        visible: (row) => row.approvedBy === "SYSTEM_AUTO_APPROVAL",
      },
      { key: "approvedByName", label: "Người duyệt", visible: (row) => hasText(row.approvedByName) && row.approvedBy !== "SYSTEM_AUTO_APPROVAL" },
      { key: "review", label: "Ghi chú duyệt", wide: true, visible: (row) => hasText(row.review) },
    ],
  },
  {
    title: "Kết quả khóa huấn luyện",
    visible: (row) => row.totalScore !== null && row.totalScore !== undefined || Array.isArray(row.componentScores) && row.componentScores.length > 0 || hasText(row.scoreNote),
    fields: [
      { key: "componentScores", label: "Điểm thành phần", wide: true, render: (row) => <ComponentScoreList scores={row.componentScores} />, visible: (row) => Array.isArray(row.componentScores) && row.componentScores.length > 0 },
      { key: "totalScore", label: "Tổng điểm" },
      { key: "passingScore", label: "Điểm đạt" },
      { key: "passed", label: "Đánh giá điểm" },
      { key: "finalResult", label: "Kết quả chung", visible: (row) => hasText(row.finalResult) },
      { key: "courseResultingLevel", label: "Cấp độ khi đạt", visible: (row) => hasText(row.courseResultingLevel) && row.courseResultingLevel !== "NONE" },
      { key: "targetLevel", label: "Cấp độ đạt được (ngoại lệ)", visible: (row) => hasText(row.targetLevel) },
      { key: "scoreNote", label: "Nhận xét", wide: true },
    ],
  },
  {
    title: "Chứng nhận",
    visible: (row) => hasText(row.certificateApprovalStatus) && row.certificateApprovalStatus !== "NOT_REQUIRED",
    fields: [
      { key: "certificateApprovalStatus", label: "Trạng thái chứng nhận" },
      { key: "certificateRequestedAt", label: "Ngày yêu cầu", visible: (row) => hasText(row.certificateRequestedAt) },
      { key: "certificateApprovedAt", label: "Ngày duyệt", visible: (row) => hasText(row.certificateApprovedAt) },
    ],
  },
  AUDIT_SECTION,
];

function SectionedDetail({ row, sections }: { row: Record<string, unknown>; sections: DetailSection[] }) {
  const embedded = Boolean(useEmbeddedResource());
  return (
    <div className="space-y-3">
      {sections.filter((section) => section.visible?.(row) ?? true).map((section) => (
        <section className="rounded-xl border border-border bg-white p-4 shadow-sm" key={section.title}>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span aria-hidden className="h-3.5 w-1 rounded-full bg-primary" />
            {section.title}
          </h2>
          <dl className="mt-2.5 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            {section.fields.filter((field) => field.visible?.(row, embedded) ?? true).map(({ key, label, wide, value: getValue, render }) => {
              const value = getValue ? getValue(row) : row[key];
              const empty = !render && (value === null || value === undefined || value === "");
              return (
                <div className={wide ? "sm:col-span-2" : undefined} key={key}>
                  <dt className="text-xs font-medium text-muted">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm leading-5 text-foreground">
                    {render ? render(row) : empty ? <span className="text-muted">—</span> : <ResourceCell column={key} displayMode="detail" row={row} value={value} />}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}

function detailKeys(route: RouteConfig, row: Record<string, unknown>, embedded: boolean) {
  if (route.kind === "participations") {
    const hidden = (key: string) =>
      PARTICIPATION_HIDDEN_KEYS.has(key) ||
      (embedded && PARTICIPATION_EMBEDDED_HIDDEN_KEYS.has(key)) ||
      (typeof row[key] === "string" && UUID_PATTERN.test(row[key] as string)) ||
      row[key] === undefined;
    const ordered = prioritizeAndSendTail(Object.keys(row), PARTICIPATION_PRIMARY_KEYS, ["createdAt", "createdBy", "updatedAt", "updatedBy"]);
    return ordered.filter((key) => !hidden(key));
  }
  const baseKeys =
    route.kind === "accounts"
      ? ["username", "email", "primaryRoleName", "secondaryRoleNames", "dioceseName", "authProvider", "providerId", "status"]
      : Object.keys(row);
  return orderDetailKeys(route, withAuditKeys(baseKeys)).filter((key) => shouldRenderKey(route, row, key));
}

function ComponentScoreList({ scores }: { scores: unknown }) {
  const items = Array.isArray(scores) ? (scores as { componentName?: string; score?: number | string | null; maxScore?: number | string | null }[]) : [];
  if (items.length === 0) return <span className="text-muted">Chưa chấm điểm</span>;
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={`${item.componentName}-${index}`}>
          {item.componentName ?? "Thành phần"}: <span className="font-semibold">{item.score ?? "—"}</span>
          {item.maxScore !== null && item.maxScore !== undefined ? ` / ${item.maxScore}` : ""}
        </li>
      ))}
    </ul>
  );
}

function LeaderRankHistory({
  histories,
  loading,
  error,
}: {
  histories?: RankHistoryRow[];
  loading: boolean;
  error?: string;
}) {
  const items = [...(histories ?? [])].sort((left, right) => yearFromDate(right.promotionDate) - yearFromDate(left.promotionDate));

  return (
    <section className="rounded-lg border border-border bg-white px-4 py-3">
      <h2 className="text-xs font-semibold uppercase text-muted">Lịch sử cấp bậc</h2>
      {loading ? <div className="mt-3 h-16 rounded-[8px] bg-surface-2 motion-safe:animate-pulse" /> : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="mt-2 text-sm text-muted">Chưa có lịch sử cấp bậc.</p> : null}
      {!loading && !error && items.length ? (
        <ol className="mt-3 space-y-2">
          {items.map((history, index) => (
            <li className="rounded-[8px] border border-surface-2 bg-surface-1/60 px-3 py-2 text-sm text-foreground" key={history.id ?? `${history.newLevel}-${history.promotionDate}-${index}`}>
              {rankHistorySentence(history)}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function rankHistorySentence(history: RankHistoryRow) {
  const level = history.newLevel ? formatLeaderLevel(history.newLevel) : "Cấp bậc chưa rõ";
  const year = yearFromDate(history.promotionDate);
  return year ? `${level} năm ${year}` : `${level} chưa có năm ghi nhận`;
}

function yearFromDate(value: string | null | undefined) {
  if (!value) return 0;
  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) ? year : 0;
}

function withAuditKeys(keys: string[]) {
  const next = [...keys];
  AUDIT_KEYS.forEach((key) => {
    if (!next.includes(key)) next.push(key);
  });
  return next;
}

function orderDetailKeys(route: RouteConfig, keys: string[]) {
  if (route.kind === "dioceses" || route.kind === "deaneries" || route.kind === "parishes") {
    return prioritizeAndSendTail(keys, ORG_PRIMARY_KEYS, [...AUDIT_KEYS, "status"]);
  }

  if (route.kind === "leaders") {
    return prioritizeAndSendTail(keys, LEADER_PRIMARY_KEYS, [...AUDIT_KEYS, "status"]);
  }

  return prioritizeAndSendTail(keys, [], [...AUDIT_KEYS, "status"]);
}

function prioritizeAndSendTail(keys: string[], headKeys: readonly string[], tailKeys: readonly string[]) {
  const seen = new Set<string>();
  const pushExisting = (source: readonly string[]) =>
    source.filter((key) => {
      if (!keys.includes(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const head = pushExisting(headKeys);
  const tail = pushExisting(tailKeys);
  const middle = keys.filter((key) => !seen.has(key) && !tailKeys.includes(key));
  return [...head, ...middle, ...tail];
}

function detailLabel(route: RouteConfig, key: string) {
  if (route.kind === "accounts" && key === "primaryRoleName") return "Vai trò chính";
  if (route.kind === "accounts" && key === "secondaryRoleNames") return "Vai trò phụ";
  if (route.kind === "courses" && key === "courseTypeName") return "Loại khóa";
  return columnLabels[key] ?? key;
}

function detailItemClass(key: string) {
  return FULL_WIDTH_KEYS.has(key) ? "sm:col-span-2" : undefined;
}

function shouldRenderKey(route: RouteConfig, row: Record<string, unknown>, key: string) {
  if (row[key] === undefined && !isAuditKey(key)) return false;
  if (route.kind === "accounts" && ["leaderId", "leaderFullName", "primaryRoleCode", "roleCodes", "roleNames", "deaneryId", "deaneryName", "parishId", "parishName"].includes(key)) return false;
  if (route.kind === "accounts" && key === "email" && !row.email) return false;
  if (route.kind === "accounts" && key === "secondaryRoleNames" && Array.isArray(row[key]) && row[key].length === 0) return false;
  if (route.kind === "courses" && ["courseCode", "courseTypeCode", "dioceseId", "deaneryId", "registrationOpen"].includes(key)) return false;
  if (key === "conditions") return false;
  if ((route.kind === "role-permissions" || route.kind === "account-permissions") && (key === "id" || (key === "roleCode" && row.roleName) || (key === "permissionCode" && row.permissionName))) return false;
  if (key === "dioceseId" && typeof row.dioceseName === "string") return false;
  if (key === "deaneryId" && typeof row.deaneryName === "string") return false;
  if (key === "parishId" && typeof row.parishName === "string") return false;
  if (key === "unitId" && typeof row.unitName === "string") return false;
  return true;
}

function isAuditKey(key: string) {
  return AUDIT_KEYS.some((auditKey) => auditKey === key);
}
