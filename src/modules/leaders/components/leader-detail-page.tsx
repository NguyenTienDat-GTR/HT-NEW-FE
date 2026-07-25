"use client";

import {
    BookOpen,
    Certificate as CertificateIcon,
    ClockCounterClockwise,
    EnvelopeSimple,
    FloppyDisk,
    HouseLine,
    IdentificationCard,
    ImageSquare,
    Key,
    PencilSimple,
    Phone,
    User,
    X,
} from "@phosphor-icons/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {Route} from "next";
import Link from "next/link";
import type {ReactNode} from "react";
import {useMemo, useState} from "react";
import {toast} from "sonner";
import {FormField} from "@/components/form/resource-form/form-controls";
import type {FormFieldSpec} from "@/components/form/resource-form/types";
import {Button} from "@/components/ui/button";
import {Panel} from "@/components/ui/panel";
import type {RouteConfig} from "@/config/routes/routes";
import {apiFetch, getApiErrorMessage, type PageResponse} from "@/lib/api/client";
import {serializeBaseSearch} from "@/lib/api/search";
import {useAuthStore} from "@/lib/auth/auth-store";
import {canUseAction} from "@/lib/auth/permissions";
import {cn} from "@/lib/utils";
import {formatLeaderLevel} from "@/components/common/resource/resource-format";
import {
    displayValue,
    formatDate,
    genderLabel,
    leaderRelatedQuery,
    workflowLabel,
    yearFromDate,
    type AccountRow,
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
type LeaderEditValues = {
    holyName: string;
    email: string;
    phoneNumber: string;
    imageUrl: string;
    gender: string;
    parishId: string;
};

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    {id: "profile", label: "Thông tin cá nhân", icon: User},
    {id: "courses", label: "Khóa huấn luyện", icon: BookOpen},
    {id: "certificates", label: "Chứng nhận", icon: CertificateIcon},
    {id: "account", label: "Tài khoản", icon: Key},
    // {id: "activity", label: "Lịch sử hoạt động", icon: ClockCounterClockwise},
];

export function LeaderDetailPage({id, route}: LeaderDetailPageProps) {
    const [activeTab, setActiveTab] = useState<TabId>("profile");
    const [editingProfile, setEditingProfile] = useState(false);
    const [editValues, setEditValues] = useState<LeaderEditValues>(emptyLeaderEditValues);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const leaderQuery = useQuery({
        queryKey: ["leader-detail-page", id],
        queryFn: () => apiFetch<LeaderDetail>(`/leaders/${encodeURIComponent(id)}`),
    });

    const leader = leaderQuery.data;
    const canEdit = canUseAction(user, route.actions?.edit);
    const mutation = useMutation({
        mutationFn: async () => {
            const nextErrors = validateLeaderEdit(editValues);
            setFieldErrors(nextErrors);
            if (Object.keys(nextErrors).length) throw new Error("Vui lòng kiểm tra các trường bắt buộc");
            return apiFetch<LeaderDetail>(`/leaders/${encodeURIComponent(id)}`, {
                method: "PUT",
                body: JSON.stringify(toLeaderUpdatePayload(editValues)),
            });
        },
        onSuccess: async (updatedLeader) => {
            toast.success("Lưu cập nhật thành công");
            setEditingProfile(false);
            setFieldErrors({});
            queryClient.setQueryData(["leader-detail-page", id], updatedLeader);
            await queryClient.invalidateQueries({queryKey: ["resource", route.endpoint]});
            await queryClient.invalidateQueries({queryKey: ["leader-detail-page", id]});
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error));
        },
    });

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
    const headerLeader = editingProfile ? {
        ...leader,
        imageUrl: editValues.imageUrl === "__CLEAR__" ? null : editValues.imageUrl
    } : leader;

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
                        <EditableLeaderAvatar
                            editing={editingProfile && activeTab === "profile"}
                            leader={headerLeader}
                            onChange={(value) => setEditValues((current) => ({...current, imageUrl: value}))}
                        />
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

                    {canEdit && activeTab === "profile" && !editingProfile ? (
                        <Button
                            className="self-start lg:self-center"
                            onClick={() => {
                                setActiveTab("profile");
                                setEditingProfile(true);
                                setEditValues(valuesFromLeader(leader));
                                setFieldErrors({});
                            }}
                            type="button"
                        >
                            <PencilSimple size={18}/>
                            Sửa thông tin hồ sơ
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
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    if (tab.id !== "profile") {
                                        setEditingProfile(false);
                                        setFieldErrors({});
                                    }
                                }}
                                type="button"
                            >
                                <Icon size={17}/>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </Panel>

            {activeTab === "profile" ? (
                <ProfileTab
                    editing={editingProfile}
                    errors={fieldErrors}
                    id={id}
                    leader={leader}
                    onChange={(fieldName, value) => setEditValues((current) => ({
                        ...current,
                        [fieldName]: String(value ?? "")
                    }))}
                    values={editValues}
                />
            ) : null}
            {activeTab === "courses" ? <CourseTab leaderId={id}/> : null}
            {activeTab === "certificates" ? <CertificateTab leaderId={id}/> : null}
            {activeTab === "account" ? <AccountTab leader={leader} leaderId={id}/> : null}
            {/*{activeTab === "activity" ? <ActivityTab leaderId={id}/> : null}*/}

            {editingProfile && activeTab === "profile" ? (
                <div
                    className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-2.5 shadow-[var(--shadow-bottom-bar)] backdrop-blur">
                    <div className="mx-auto flex max-w-[1180px] justify-end gap-3">
                        <Button
                            onClick={() => {
                                setEditingProfile(false);
                                setEditValues(emptyLeaderEditValues);
                                setFieldErrors({});
                            }}
                            type="button"
                            variant="outline"
                        >
                            <X size={16}/>
                            Hủy
                        </Button>
                        <Button loading={mutation.isPending} onClick={() => mutation.mutate()} type="button">
                            <FloppyDisk size={16}/>
                            Lưu cập nhật
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ProfileTab({
                        id,
                        leader,
                        editing,
                        values,
                        errors,
                        onChange,
                    }: {
    id: string;
    leader: LeaderDetail;
    editing: boolean;
    values: LeaderEditValues;
    errors: Record<string, string>;
    onChange: (fieldName: keyof LeaderEditValues, value: unknown) => void;
}) {
    const rankHistoryQuery = useQuery({
        queryKey: ["leader-rank-history-page", id],
        queryFn: () => apiFetch<RankHistoryRow[]>(`/leaders/${encodeURIComponent(id)}/rank-history`),
    });

    return (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.72fr)]">
            <SectionCard icon={IdentificationCard} title="Thông tin cơ bản">
                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                    <ProfileField
                        editing={editing}
                        error={errors.holyName}
                        editValue={values.holyName}
                        field={leaderEditableFields.holyName}
                        label="Tên thánh"
                        onChange={(value) => onChange("holyName", value)}
                        value={leader.holyName}
                    />
                    <ProfileField label="Họ và tên" value={leader.fullName}/>
                    <ProfileField
                        editing={editing}
                        error={errors.gender}
                        editValue={values.gender}
                        field={leaderEditableFields.gender}
                        label="Giới tính"
                        onChange={(value) => onChange("gender", value)}
                        value={genderLabel(leader.gender)}
                    />
                    <ProfileField label="Ngày sinh" value={formatDate(leader.birthDate)}/>
                    <ProfileField
                        editing={editing}
                        error={errors.phoneNumber}
                        editValue={values.phoneNumber}
                        field={leaderEditableFields.phoneNumber}
                        label="Số điện thoại"
                        onChange={(value) => onChange("phoneNumber", value)}
                        value={leader.phoneNumber}
                    />
                    <ProfileField
                        editing={editing}
                        error={errors.email}
                        editValue={values.email}
                        field={leaderEditableFields.email}
                        label="Email"
                        onChange={(value) => onChange("email", value)}
                        value={leader.email}
                    />
                    <ProfileField
                        editing={editing}
                        error={errors.parishId}
                        editValue={values.parishId}
                        field={leaderEditableFields.parishId}
                        label="Giáo xứ"
                        onChange={(value) => onChange("parishId", value)}
                        value={leader.parishName}
                    />
                    <ProfileField label="Giáo hạt" value={leader.deaneryName}/>
                    <ProfileField label="Cấp huynh trưởng"
                                  value={leader.leaderLevel ? formatLeaderLevel(leader.leaderLevel) : undefined}/>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-xs text-muted">
                    <StatusBadge active={leader.status === true}/>
                    <MetaText label="Tạo" value={`${displayValue(leader.createdBy)} · ${formatDate(leader.createdAt)}`}/>
                    <MetaText label="Cập nhật" value={`${displayValue(leader.updatedBy)} · ${formatDate(leader.updatedAt)}`}/>
                </div>
            </SectionCard>

            <RankHistoryPanel
                error={rankHistoryQuery.isError ? getApiErrorMessage(rankHistoryQuery.error) : undefined}
                histories={rankHistoryQuery.data}
                loading={rankHistoryQuery.isLoading}
            />
        </div>
    );
}

const emptyLeaderEditValues: LeaderEditValues = {
    holyName: "",
    email: "",
    phoneNumber: "",
    imageUrl: "",
    gender: "",
    parishId: "",
};

const leaderEditableFields = {
    holyName: {name: "holyName", label: "Tên thánh", required: true},
    phoneNumber: {name: "phoneNumber", label: "Số điện thoại", placeholder: "Nhập số điện thoại"},
    email: {name: "email", label: "Email", type: "email", required: true, placeholder: "Nhập email chính thức"},
    gender: {
        name: "gender",
        label: "Giới tính",
        type: "select",
        required: true,
        options: [
            {value: "NAM", label: "Nam"},
            {value: "NU", label: "Nữ"},
        ],
    },
    parishId: {
        name: "parishId",
        label: "Giáo xứ",
        type: "select",
        required: true,
        optionsEndpoint: "/parishes",
        optionValue: "id",
        optionLabel: "name",
    },
} satisfies Record<string, FormFieldSpec>;

function valuesFromLeader(leader: LeaderDetail): LeaderEditValues {
    return {
        holyName: leader.holyName ?? "",
        email: leader.email ?? "",
        phoneNumber: leader.phoneNumber ?? "",
        imageUrl: leader.imageUrl ?? "",
        gender: leader.gender ?? "",
        parishId: leader.parishId ?? "",
    };
}

function validateLeaderEdit(values: LeaderEditValues) {
    const errors: Record<string, string> = {};
    if (!values.holyName.trim()) errors.holyName = "Trường này là bắt buộc";
    if (!values.email.trim()) errors.email = "Trường này là bắt buộc";
    if (!values.gender.trim()) errors.gender = "Trường này là bắt buộc";
    if (!values.parishId.trim()) errors.parishId = "Trường này là bắt buộc";
    return errors;
}

function toLeaderUpdatePayload(values: LeaderEditValues) {
    const payload: Record<string, unknown> = {
        holyName: values.holyName.trim(),
        email: values.email.trim(),
        gender: values.gender,
        parishId: values.parishId,
    };
    const clearFields: string[] = [];

    if (values.phoneNumber.trim()) payload.phoneNumber = values.phoneNumber.trim();
    else clearFields.push("phoneNumber");

    if (values.imageUrl === "__CLEAR__") clearFields.push("imageUrl");
    else if (values.imageUrl.trim()) payload.imageUrl = values.imageUrl;

    if (clearFields.length) payload.clearFields = clearFields;
    return payload;
}

function SectionCard({title, icon: Icon, children}: { title: string; icon: typeof User; children: ReactNode }) {
    return (
        <Panel className="h-full rounded-[12px] p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
                <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(108,71,255,0.08)]">
                    <Icon size={21} weight="duotone"/>
                </span>
                <h3 className="text-lg font-semibold tracking-[0] text-foreground md:text-xl">{title}</h3>
            </div>
            {children}
        </Panel>
    );
}

function ProfileField({
                          label,
                          value,
                          editing,
                          field,
                          editValue,
                          onChange,
                          error,
                      }: {
    label: string;
    value: unknown;
    editing?: boolean;
    field?: FormFieldSpec;
    editValue?: string;
    onChange?: (value: unknown) => void;
    error?: string;
}) {
    if (editing && field && onChange) {
        return (
            <div className="w-full max-w-64 space-y-1">
                <FormField
                    error={error}
                    field={field}
                    mode="edit"
                    onChange={onChange}
                    value={editValue}
                />
            </div>
        );
    }

    return (
        <div className="w-full max-w-64 space-y-1">
            <p className="text-sm font-semibold tracking-[0] text-muted">{label}</p>
            <p className="flex min-h-11 items-center rounded-[8px] border border-border bg-white px-4 py-2 text-sm font-medium leading-5 text-foreground shadow-sm">
                {displayValue(value)}
            </p>
        </div>
    );
}

function MetaText({label, value}: { label: string; value: string }) {
    return (
        <span className="inline-flex min-h-7 items-center gap-1.5">
            <span className="font-semibold text-foreground">{label}:</span>
            <span>{value}</span>
        </span>
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

function EditableLeaderAvatar({
                                  leader,
                                  editing,
                                  onChange,
                              }: {
    leader: LeaderDetail;
    editing: boolean;
    onChange: (value: string) => void;
}) {
    const name = leader.fullName ?? leader.holyName ?? "HT";
    const initial = name.trim().charAt(0).toUpperCase() || "H";
    const inputId = `leader-avatar-${leader.id ?? "current"}`;
    return (
        <div className="flex shrink-0 flex-col items-start gap-2">
            {leader.imageUrl ? (
                <span
                    aria-label={name}
                    className="block h-24 w-24 rounded-full border border-border bg-cover bg-center shadow-sm"
                    role="img"
                    style={{backgroundImage: `url(${leader.imageUrl})`}}
                />
            ) : (
                <span
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white shadow-[var(--shadow-accent)]">
                    {editing ? <ImageSquare size={28} weight="duotone"/> : initial}
                </span>
            )}
            {editing ? (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        accept="image/*"
                        className="sr-only"
                        id={inputId}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                                if (typeof reader.result === "string") onChange(reader.result);
                            };
                            reader.readAsDataURL(file);
                            event.target.value = "";
                        }}
                        type="file"
                    />
                    <label
                        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                        htmlFor={inputId}
                    >
                        <ImageSquare size={15}/>
                        Thay đổi ảnh
                    </label>
                    {leader.imageUrl ? (
                        <button
                            className="inline-flex min-h-9 cursor-pointer items-center rounded-[8px] px-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-1 hover:text-danger"
                            onClick={() => onChange("__CLEAR__")}
                            type="button"
                        >
                            Xóa ảnh
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
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
