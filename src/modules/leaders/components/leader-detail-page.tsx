"use client";

import {
    BookOpen,
    Certificate as CertificateIcon,
    ClockCounterClockwise,
    EnvelopeSimple,
    HouseLine,
    Key,
    PencilSimple,
    Phone,
    User,
} from "@phosphor-icons/react";
import {useQuery} from "@tanstack/react-query";
import type {Route} from "next";
import Link from "next/link";
import {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Panel} from "@/components/ui/panel";
import type {RouteConfig} from "@/config/routes/routes";
import {apiFetch, getApiErrorMessage, type PageResponse} from "@/lib/api/client";
import {serializeBaseSearch} from "@/lib/api/search";
import {useAuthStore} from "@/lib/auth/auth-store";
import {canUseAction} from "@/lib/auth/permissions";
import {cn} from "@/lib/utils";
import {fillRoute} from "@/components/common/resource/resource-actions";
import {formatLeaderLevel} from "@/components/common/resource/resource-format";
import {
    displayValue,
    formatDate,
    genderLabel,
    leaderRelatedQuery,
    workflowLabel,
    yearFromDate,
    type AccountRow,
    type ActivityLogRow,
    type CertificateRow,
    type CourseParticipationRow,
    type LeaderDetail,
    type RankHistoryRow,
} from "./leader-detail-utils";

type LeaderDetailPageProps = {
    id: string;
    route: RouteConfig;
};

type TabId = "profile" | "courses" | "certificates" | "account" | "activity";

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    {id: "profile", label: "Thông tin cá nhân", icon: User},
    {id: "courses", label: "Khóa huấn luyện", icon: BookOpen},
    {id: "certificates", label: "Chứng nhận", icon: CertificateIcon},
    {id: "account", label: "Tài khoản", icon: Key},
    {id: "activity", label: "Lịch sử hoạt động", icon: ClockCounterClockwise},
];

export function LeaderDetailPage({id, route}: LeaderDetailPageProps) {
    const [activeTab, setActiveTab] = useState<TabId>("profile");
    const user = useAuthStore((state) => state.user);
    const leaderQuery = useQuery({
        queryKey: ["leader-detail-page", id],
        queryFn: () => apiFetch<LeaderDetail>(`/leaders/${encodeURIComponent(id)}`),
    });

    const leader = leaderQuery.data;
    const canEdit = canUseAction(user, route.actions?.edit);
    const editHref = fillRoute(route.editPath, {id});

    if (leaderQuery.isLoading) return <LeaderDetailSkeleton/>;
    if (leaderQuery.isError) {
        return (
            <Panel className="p-5">
                <h1 className="text-xl font-semibold text-foreground">Không thể tải chi tiết huynh trưởng</h1>
                <p className="mt-2 text-sm text-danger">{getApiErrorMessage(leaderQuery.error)}</p>
            </Panel>
        );
    }
    if (!leader) return null;

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-semibold tracking-[0] text-foreground md:text-3xl">Chi tiết huynh
                    trưởng</h1>
                <nav aria-label="Breadcrumb" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Link className="font-medium text-primary hover:text-primary-hover" href="/dashboard">
                        Trang chủ
                    </Link>
                    <span aria-hidden>{">"}</span>
                    <Link className="font-medium text-primary hover:text-primary-hover" href={route.path as Route}>
                        Hồ sơ huynh trưởng
                    </Link>
                    <span aria-hidden>{">"}</span>
                    <span>Chi tiết</span>
                </nav>
            </div>

            <Panel className="overflow-hidden">
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                        <LeaderAvatar leader={leader}/>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="break-words text-2xl font-semibold tracking-[0] text-foreground">
                                    {leader.holyName ? `${leader.holyName} ` : ""}{leader.fullName}
                                </h2>
                                {leader.leaderLevel ? <LevelBadge level={leader.leaderLevel}/> : null}
                                <StatusBadge active={leader.status === true}/>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                                <HeaderFact icon={HouseLine} value={leader.parishName ?? leader.deaneryName}/>
                                <HeaderFact icon={Phone} value={leader.phoneNumber}/>
                                <HeaderFact icon={EnvelopeSimple} value={leader.email}/>
                            </div>
                        </div>
                    </div>

                    {canEdit && editHref ? (
                        <Button asChild className="self-start lg:self-center">
                            <Link href={editHref as Route}>
                                <PencilSimple size={18}/>
                                Sửa thông tin
                            </Link>
                        </Button>
                    ) : null}
                </div>

                <div className="flex max-w-full gap-2 overflow-x-auto border-t border-border px-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                className={cn(
                                    "inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
                                    active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground",
                                )}
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                type="button"
                            >
                                <Icon size={17}/>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </Panel>

            {activeTab === "profile" ? <ProfileTab id={id} leader={leader}/> : null}
            {activeTab === "courses" ? <CourseTab leaderId={id}/> : null}
            {activeTab === "certificates" ? <CertificateTab leaderId={id}/> : null}
            {activeTab === "account" ? <AccountTab leader={leader} leaderId={id}/> : null}
            {activeTab === "activity" ? <ActivityTab leaderId={id}/> : null}
        </div>
    );
}

function ProfileTab({id, leader}: { id: string; leader: LeaderDetail }) {
    const rankHistoryQuery = useQuery({
        queryKey: ["leader-rank-history-page", id],
        queryFn: () => apiFetch<RankHistoryRow[]>(`/leaders/${encodeURIComponent(id)}/rank-history`),
    });

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]">
            <div className="space-y-5">
                <InfoCard
                    items={[
                        ["Tên thánh, Họ và tên", `${leader?.holyName ?? ""} ${leader?.fullName ?? ""}`.trim()],
                        ["Ngày sinh", formatDate(leader.birthDate)],
                        ["Giới tính", genderLabel(leader.gender)],
                        ["Điện thoại", leader.phoneNumber],
                        ["Email", leader.email],
                        ["Cấp huynh trưởng", leader.leaderLevel ? formatLeaderLevel(leader.leaderLevel) : undefined],
                    ]}
                    title="Thông tin cá nhân"
                />
                <RankHistoryPanel
                    error={rankHistoryQuery.isError ? getApiErrorMessage(rankHistoryQuery.error) : undefined}
                    histories={rankHistoryQuery.data} loading={rankHistoryQuery.isLoading}/>
            </div>

            <InfoCard
                items={[
                    ["Giáo hạt", leader.deaneryName],
                    ["Giáo xứ", leader.parishName],
                    ["Trạng thái", leader.status === true ? "Đang hoạt động" : "Tạm ngưng"],
                    ["Ngày tạo hồ sơ", formatDate(leader.createdAt)],
                    ["Người tạo", leader.createdBy],
                    ["Ngày cập nhật", formatDate(leader.updatedAt)],
                    ["Người cập nhật", leader.updatedBy],
                ]}
                title="Thông tin tổ chức"
            />
        </div>
    );
}

function CourseTab({leaderId}: { leaderId: string }) {
    const query = useQuery({
        queryKey: ["leader-detail-courses", leaderId],
        queryFn: () =>
            apiFetch<PageResponse<CourseParticipationRow>>(
                `/training/participations?${leaderRelatedQuery({"leader.id": leaderId}, "registrationDate")}`,
            ),
    });
    return (
        <RelatedPanel
            columns={["Khóa học", "Ngày đăng ký", "Trạng thái", "Điểm", "Kết quả"]}
            error={query.isError ? getApiErrorMessage(query.error) : undefined}
            loading={query.isLoading}
            rows={(query.data?.content ?? []).map((row) => [
                row.courseName ?? row.courseCode,
                formatDate(row.registrationDate),
                workflowLabel(row.participationStatus),
                scoreText(row.totalScore, row.passingScore),
                row.passed === undefined || row.passed === null ? workflowLabel(row.result) : row.passed ? "Đạt" : "Không đạt",
            ])}
            title="Khóa đã tham dự"
        />
    );
}

function CertificateTab({leaderId}: { leaderId: string }) {
    const query = useQuery({
        queryKey: ["leader-detail-certificates", leaderId],
        queryFn: () => apiFetch<PageResponse<CertificateRow>>(`/certificates?${leaderRelatedQuery({"leader.id": leaderId}, "issueDate")}`),
    });
    return (
        <RelatedPanel
            columns={["Chứng nhận", "Khóa học", "Ngày cấp", "Trạng thái", "Người ký"]}
            error={query.isError ? getApiErrorMessage(query.error) : undefined}
            loading={query.isLoading}
            rows={(query.data?.content ?? []).map((row) => [
                row.certificateName ?? row.certificateCode,
                row.courseName ?? row.courseCode,
                formatDate(row.issueDate),
                workflowLabel(row.approvalStatus),
                row.signedBy,
            ])}
            title="Chứng nhận"
        />
    );
}

function AccountTab({leader, leaderId}: { leader: LeaderDetail; leaderId: string }) {
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

function ActivityTab({leaderId}: { leaderId: string }) {
    const query = useQuery({
        queryKey: ["leader-detail-activity", leaderId],
        queryFn: () => apiFetch<PageResponse<ActivityLogRow>>(`/system/audit-logs?${leaderRelatedQuery({resourceId: leaderId}, "loggedAt")}`),
    });
    return (
        <RelatedPanel
            columns={["Thời gian", "Người thực hiện", "Hành động", "Thông điệp", "Kết quả"]}
            error={query.isError ? getApiErrorMessage(query.error) : undefined}
            loading={query.isLoading}
            rows={(query.data?.content ?? []).map((row) => [
                formatDate(row.loggedAt),
                row.username,
                row.action,
                row.message ?? row.errorMessage ?? row.requestPath,
                row.statusCode ? String(row.statusCode) : undefined,
            ])}
            title="Lịch sử hoạt động"
        />
    );
}

function InfoCard({title, items}: { title: string; items: [string, unknown][] }) {
    return (
        <Panel className="p-5">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <dl className="mt-5 grid gap-4">
                {items.map(([label, value]) => (
                    <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4" key={label}>
                        <dt className="text-sm font-medium text-muted">{label}:</dt>
                        <dd className="break-words text-sm font-medium leading-6 text-foreground">{displayValue(value)}</dd>
                    </div>
                ))}
            </dl>
        </Panel>
    );
}

function RankHistoryPanel({
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
        <Panel className="p-5">
            <h3 className="text-base font-semibold text-foreground">Lịch sử cấp bậc</h3>
            {loading ? <div className="mt-4 h-20 rounded-[8px] bg-surface-2 motion-safe:animate-pulse"/> : null}
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            {!loading && !error && items.length === 0 ?
                <p className="mt-3 text-sm text-muted">Chưa có lịch sử cấp bậc.</p> : null}
            {!loading && !error && items.length ? (
                <ol className="mt-4 space-y-2">
                    {items.map((history, index) => (
                        <li className="flex items-start gap-3 rounded-[8px] border border-border bg-surface-1 px-3 py-2"
                            key={history.id ?? `${history.newLevel}-${history.promotionDate}-${index}`}>
                            <span className="mt-1 h-2 w-2 rounded-full bg-primary"/>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{rankHistorySentence(history)}</p>
                                {history.note ? <p className="mt-1 text-xs text-muted">{history.note}</p> : null}
                            </div>
                        </li>
                    ))}
                </ol>
            ) : null}
        </Panel>
    );
}

function RelatedPanel({
                          title,
                          columns,
                          rows,
                          loading,
                          error,
                      }: {
    title: string;
    columns: string[];
    rows: unknown[][];
    loading: boolean;
    error?: string;
}) {
    return (
        <Panel className="overflow-hidden">
            <div className="border-b border-border p-5">
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
            </div>
            {loading ? (
                <div className="space-y-3 p-5">
                    {Array.from({length: 4}).map((_, index) => (
                        <div className="h-11 rounded-[8px] bg-surface-2 motion-safe:animate-pulse" key={index}/>
                    ))}
                </div>
            ) : null}
            {error ? <p className="p-5 text-sm text-danger">{error}</p> : null}
            {!loading && !error && rows.length === 0 ?
                <p className="p-5 text-sm text-muted">Chưa có dữ liệu liên quan.</p> : null}
            {!loading && !error && rows.length ? (
                <div className="max-w-full overflow-x-auto">
                    <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                        <thead>
                        <tr className="bg-surface-1">
                            {columns.map((column) => (
                                <th className="border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted"
                                    key={column}>
                                    {column}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr className="bg-white transition-colors hover:bg-primary/4" key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td className="border-b border-surface-2 px-4 py-3 text-foreground"
                                        key={`${rowIndex}-${cellIndex}`}>
                                        {displayValue(cell)}
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

function LeaderAvatar({leader}: { leader: LeaderDetail }) {
    const name = leader.fullName ?? leader.holyName ?? "HT";
    const initial = name.trim().charAt(0).toUpperCase() || "H";
    if (leader.imageUrl) {
        return (
            <span
                aria-label={name}
                className="block h-24 w-24 shrink-0 rounded-full border border-border bg-cover bg-center shadow-sm"
                role="img"
                style={{backgroundImage: `url(${leader.imageUrl})`}}
            />
        );
    }
    return (
        <span
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white shadow-[var(--shadow-accent)]">
      {initial}
    </span>
    );
}

function HeaderFact({icon: Icon, value}: { icon: typeof HouseLine; value: unknown }) {
    if (!value) return null;
    return (
        <span className="inline-flex min-w-0 items-center gap-2">
      <Icon className="shrink-0 text-muted" size={17}/>
      <span className="truncate">{displayValue(value)}</span>
    </span>
    );
}

function LevelBadge({level}: { level: string }) {
    return (
        <span
            className="inline-flex min-h-7 items-center rounded-[7px] border border-amber-300 bg-danger px-2.5 py-1 text-xs font-semibold text-white">
      {formatLeaderLevel(level)}
    </span>
    );
}

function StatusBadge({active}: { active: boolean }) {
    return (
        <span
            className={cn("inline-flex min-h-7 items-center rounded-[7px] border px-2.5 py-1 text-xs font-semibold", active ? "border-success/25 bg-success/10 text-success" : "border-border bg-surface-1 text-muted")}>
      {active ? "Đang hoạt động" : "Tạm ngưng"}
    </span>
    );
}

function LeaderDetailSkeleton() {
    return (
        <div className="space-y-5">
            <div className="h-20 rounded-[12px] bg-surface-2 motion-safe:animate-pulse"/>
            <Panel className="p-5">
                <div className="flex gap-4">
                    <div className="h-24 w-24 rounded-full bg-surface-2 motion-safe:animate-pulse"/>
                    <div className="flex-1 space-y-3">
                        <div className="h-7 w-72 max-w-full rounded bg-surface-2 motion-safe:animate-pulse"/>
                        <div className="h-4 w-full max-w-xl rounded bg-surface-2 motion-safe:animate-pulse"/>
                    </div>
                </div>
            </Panel>
            <div className="grid gap-5 xl:grid-cols-2">
                <div className="h-80 rounded-[12px] bg-surface-2 motion-safe:animate-pulse"/>
                <div className="h-80 rounded-[12px] bg-surface-2 motion-safe:animate-pulse"/>
            </div>
        </div>
    );
}

function scoreText(total: unknown, passing: unknown) {
    if (total === null || total === undefined || total === "") return "Chưa có";
    if (passing === null || passing === undefined || passing === "") return String(total);
    return `${total}/${passing}`;
}

function rankHistorySentence(history: RankHistoryRow) {
    const level = history.newLevel ? formatLeaderLevel(history.newLevel) : "Cấp bậc chưa rõ";
    const year = yearFromDate(history.promotionDate);
    return year ? `${level} năm ${year}` : `${level} chưa có năm ghi nhận`;
}
