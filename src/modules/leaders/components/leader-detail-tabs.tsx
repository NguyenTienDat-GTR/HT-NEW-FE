"use client";

import { Eye, ClockCounterClockwise } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type {  } from "next";
import { isValidElement, type ReactNode } from "react";
import { useMemo, useState } from "react";
import type {  } from "@/components/form/resource-form/types";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { findRoute } from "@/config/routes/routes";
import { apiFetch, getApiErrorMessage, type PageResponse } from "@/lib/api/client";
import { serializeBaseSearch } from "@/lib/api/search";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermissionPrefix } from "@/lib/auth/permissions";
import { DetailDrawer } from "@/components/common/resource/detail-drawer";
import { CertificateDetailDrawer } from "@/modules/certificates/components/certificate-detail-drawer";
import { CertificateCard } from "@/modules/certificates/components/certificate-card";
import { ViewModeToggle, type ViewMode } from "@/components/common/resource/view-mode-toggle";
import { displayValue, formatDate, leaderRelatedQuery, workflowLabel, yearFromDate, rankHistorySentence, type AccountRow, type CertificateRow, type CourseParticipationRow, type LeaderDetail, type RankHistoryRow } from "./leader-detail-utils";
import { SectionCard } from "./leader-detail-ui";

export function CourseTab({leaderId}: { leaderId: string }) {
    const [viewingId, setViewingId] = useState<string | null>(null);
    const query = useQuery({
        queryKey: ["leader-detail-courses", leaderId],
        queryFn: () =>
            apiFetch<PageResponse<CourseParticipationRow>>(
                `/training/participations?${leaderRelatedQuery({"leader.id": leaderId}, "registrationDate")}`,
            ),
    });
    // Drawer chi tiết hồ sơ tham dự dùng chung với màn đăng ký; BE đã che điểm theo quyền xem điểm của khóa.
    const participationRoute = findRoute("/training/registrations");
    return (
        <>
            <RelatedPanel
                columns={["Khóa huấn luyện", "Ngày đăng ký", "Trạng thái", "Điểm", "Kết quả", "Nhận xét", "Xem"]}
                error={query.isError ? getApiErrorMessage(query.error) : undefined}
                loading={query.isLoading}
                rows={(query.data?.content ?? []).map((row) => [
                    row.courseName ?? row.courseCode,
                    formatDate(row.registrationDate),
                    workflowLabel(row.participationStatus),
                    row.scoreHidden === true ? "Không hiển thị" : scoreText(row.totalScore, row.passingScore),
                    row.passed === undefined || row.passed === null ? workflowLabel(row.result) : row.passed ? "Đạt" : "Không đạt",
                    row.scoreHidden === true ? "Không hiển thị" : row.scoreNote,
                    row.id ? (
                        <Button
                            aria-label="Xem chi tiết kết quả khóa huấn luyện"
                            className="h-8 min-w-8 rounded-lg"
                            onClick={() => setViewingId(row.id ?? null)}
                            size="icon"
                            type="button"
                            variant="icon"
                        >
                            <Eye size={16}/>
                        </Button>
                    ) : null,
                ])}
                title="Khóa đã tham dự"
            />
            {participationRoute ? (
                <DetailDrawer id={viewingId} onClose={() => setViewingId(null)}
                              route={{...participationRoute, title: "Kết quả khóa huấn luyện"}}/>
            ) : null}
        </>
    );
}

export function CertificateTab({leaderId}: { leaderId: string }) {
    const user = useAuthStore((state) => state.user);
    const [viewingCode, setViewingCode] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("card");
    // Admin giáo hạt / giáo xứ xem chứng nhận của huynh trưởng trong phạm vi quản lý (mọi cấp khóa, kể cả đã thu hồi)
    // ngay trong hồ sơ; các tài khoản khác dùng danh sách chứng nhận theo quyền ở menu Chứng nhận.
    const viaProfilePermission = hasPermissionPrefix(user, "organization.leader_certificate.read.");
    const query = useQuery({
        queryKey: ["leader-detail-certificates", leaderId, viaProfilePermission],
        queryFn: async () =>
            viaProfilePermission
                ? apiFetch<CertificateRow[]>(`/leaders/${encodeURIComponent(leaderId)}/certificates`)
                : (await apiFetch<PageResponse<CertificateRow>>(`/certificates?${leaderRelatedQuery({"leader.id": leaderId}, "issueDate")}`)).content,
    });
    return (
        <>
            <RelatedPanel
                headerAction={<ViewModeToggle mode={viewMode} onChange={setViewMode}/>}
                view={viewMode === "card" ? (
                    <ul className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {(query.data ?? []).map((row, index) => (
                            <li key={row.certificateCode ?? index}>
                                <CertificateCard
                                    data={row}
                                    onOpen={row.certificateCode ? () => setViewingCode(row.certificateCode ?? null) : undefined}
                                    showHolder={false}
                                />
                            </li>
                        ))}
                    </ul>
                ) : undefined}
                columns={["Chứng nhận", "Khóa huấn luyện", "Ngày cấp", "Trạng thái", "Người ký", "Xem"]}
                error={query.isError ? getApiErrorMessage(query.error) : undefined}
                loading={query.isLoading}
                rows={(query.data ?? []).map((row) => [
                    row.certificateName ?? row.certificateCode,
                    row.courseName ?? row.courseCode,
                    formatDate(row.issueDate),
                    workflowLabel(row.approvalStatus),
                    row.signedBy,
                    row.certificateCode ? (
                        <Button
                            aria-label="Xem chi tiết chứng nhận"
                            className="h-8 min-w-8 rounded-lg"
                            onClick={() => setViewingCode(row.certificateCode ?? null)}
                            size="icon"
                            type="button"
                            variant="icon"
                        >
                            <Eye size={16}/>
                        </Button>
                    ) : null,
                ])}
                title="Chứng nhận"
            />
            <CertificateDetailDrawer endpoint="/certificates" id={viewingCode} onClose={() => setViewingCode(null)}/>
        </>
    );
}

export function AccountTab({leader, leaderId}: { leader: LeaderDetail; leaderId: string }) {
    const queryString = useMemo(
        () =>
            serializeBaseSearch({
                page: 0,
                size: 20,
                search: leader.fullName ?? undefined,
            }).toString(),
        [leader.fullName],
    );
    const query = useQuery({
        queryKey: ["leader-detail-accounts", leaderId, leader.fullName],
        enabled: Boolean(leader.fullName),
        queryFn: async () => {
            const page = await apiFetch<PageResponse<AccountRow>>(`/system/accounts?${queryString}`);
            return page.content.filter((account) => account.leaderId === leaderId);
        },
    });
    return (
        <RelatedPanel
            columns={["Tài khoản", "Vai trò chính", "Vai trò phụ", "Trạng thái"]}
            error={query.isError ? getApiErrorMessage(query.error) : undefined}
            loading={query.isLoading}
            rows={(query.data ?? []).map((row) => [
                row.username,
                row.primaryRoleName,
                row.secondaryRoleNames?.join(", "),
                row.status === true ? "Đang hoạt động" : "Tạm ngưng",
            ])}
            title="Tài khoản liên kết"
        />
    );
}

export function RankHistoryPanel({
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
        <SectionCard icon={ClockCounterClockwise} title="Lịch sử cấp bậc">
            {loading ? <div className="h-20 rounded-[8px] bg-surface-2 motion-safe:animate-pulse"/> : null}
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            {!loading && !error && items.length === 0 ?
                <p className="mt-3 text-sm text-muted">Chưa có lịch sử cấp bậc.</p> : null}
            {!loading && !error && items.length ? (
                <ol className="space-y-3">
                    {items.map((history, index) => (
                        <li className="flex min-h-16 items-start gap-3 rounded-[8px] border border-border bg-white px-4 py-3 shadow-sm"
                            key={history.id ?? `${history.newLevel}-${history.promotionDate}-${index}`}>
                            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"/>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{rankHistorySentence(history)}</p>
                                {history.note ? <p className="mt-1 text-xs text-muted">{history.note}</p> : null}
                            </div>
                        </li>
                    ))}
                </ol>
            ) : null}
        </SectionCard>
    );
}

export function RelatedPanel({
                          title,
                          columns,
                          rows,
                          loading,
                          error,
                          headerAction,
                          view,
                      }: {
    headerAction?: ReactNode;
    // Thay bảng bằng chế độ xem khác (vd thẻ) khi có dữ liệu.
    view?: ReactNode;
    title: string;
    columns: string[];
    rows: unknown[][];
    loading: boolean;
    error?: string;
}) {
    return (
        <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                {headerAction}
            </div>
            {loading ? (
                <div className="space-y-3 p-4">
                    {Array.from({length: 4}).map((_, index) => (
                        <div className="h-11 rounded-[8px] bg-surface-2 motion-safe:animate-pulse" key={index}/>
                    ))}
                </div>
            ) : null}
            {error ? <p className="p-4 text-sm text-danger">{error}</p> : null}
            {!loading && !error && rows.length === 0 ?
                <p className="p-4 text-sm text-muted">Chưa có dữ liệu liên quan.</p> : null}
            {!loading && !error && rows.length && view ? view : null}
            {!loading && !error && rows.length && !view ? (
                <div className="max-w-full overflow-x-auto">
                    <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                        <thead>
                        <tr className="bg-slate-50">
                            {columns.map((column) => (
                                <th className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                                    key={column}>
                                    {column}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr className="bg-white transition-colors hover:bg-slate-50" key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td className="border-b border-slate-100 px-4 py-3 text-foreground"
                                        key={`${rowIndex}-${cellIndex}`}>
                                        {isValidElement(cell) ? cell : displayValue(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </Panel>
    );
}

export function scoreText(total: unknown, passing: unknown) {
    if (total === null || total === undefined || total === "") return "Chưa có";
    if (passing === null || passing === undefined || passing === "") return String(total);
    return `${total}/${passing}`;
}
