"use client";

import { AvatarLightbox } from "@/components/common/avatar-lightbox";
import { AvatarUploadDialog } from "@/components/common/avatar-upload-dialog";
import { MediaImage } from "@/components/common/media-image";
import { BookOpen, Certificate as CertificateIcon, EnvelopeSimple, FloppyDisk, HouseLine, IdentificationCard, ImageSquare, Key, PencilSimple, Phone, User, X } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type {  } from "@/components/form/resource-form/types";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { type RouteConfig } from "@/config/routes/routes";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { canUseAction } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { formatLeaderLevel } from "@/components/common/resource/resource-format";
import { resourceKey } from "@/lib/api/query-keys";
import { actorLabel, formatDate, genderLabel, type LeaderDetail, type RankHistoryRow } from "./leader-detail-utils";
import { emptyLeaderEditValues, leaderEditableFields, toLeaderUpdatePayload, validateLeaderEdit, valuesFromLeader, type LeaderEditValues } from "./leader-edit";
import { SectionCard, ProfileField, MetaText, HeaderFact, LevelBadge, StatusBadge, LeaderDetailSkeleton } from "./leader-detail-ui";
import { CourseTab, CertificateTab, AccountTab, RankHistoryPanel } from "./leader-detail-tabs";

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
            await queryClient.invalidateQueries({queryKey: resourceKey(route.endpoint)});
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
        imageUrl: editValues.imageUrl,
        imageThumbUrl: editValues.imageUrl
    } : leader;

    return (
        <div className="space-y-4 pb-16">
            <div>
                <h1 className="text-xl font-bold leading-7 tracking-[0] text-foreground">Chi tiết huynh
                    trưởng</h1>
                <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
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
                <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                        <EditableLeaderAvatar
                            editing={editingProfile && activeTab === "profile"}
                            leader={headerLeader}
                            onChange={(url, assetId) => setEditValues((current) => ({...current, imageUrl: url, imageAssetId: assetId}))}
                        />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="break-words text-xl font-bold leading-7 tracking-[0] text-foreground">
                                    {leader.holyName ? `${leader.holyName} ` : ""}{leader.fullName}
                                </h2>
                                {leader.leaderLevel ? <LevelBadge level={leader.leaderLevel}/> : null}
                                <StatusBadge active={leader.status === true}/>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text-secondary">
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

                <div className="flex max-w-full gap-1 overflow-x-auto border-t border-border px-3 lg:px-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                className={cn(
                                    "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3.5 text-sm font-semibold transition-colors",
                                    active ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-foreground",
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
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
            <SectionCard icon={IdentificationCard} title="Thông tin cơ bản">
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
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
                        label="Giáo xứ / giáo họ / giáo điểm"
                        onChange={(value) => onChange("parishId", value)}
                        value={leader.parishName}
                    />
                    <ProfileField label="Giáo hạt" value={leader.deaneryName}/>
                    <ProfileField label="Cấp huynh trưởng"
                                  value={leader.leaderLevel ? formatLeaderLevel(leader.leaderLevel) : undefined}/>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted">
                    <StatusBadge active={leader.status === true}/>
                    <MetaText label="Tạo" value={`${actorLabel(leader.createdByName, leader.createdBy)} · ${formatDate(leader.createdAt)}`}/>
                    <MetaText label="Cập nhật" value={`${actorLabel(leader.updatedByName, leader.updatedBy)} · ${formatDate(leader.updatedAt)}`}/>
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

function EditableLeaderAvatar({
                                  leader,
                                  editing,
                                  onChange,
                              }: {
    leader: LeaderDetail;
    editing: boolean;
    onChange: (url: string, assetId: string) => void;
}) {
    const name = leader.fullName ?? leader.holyName ?? "HT";
    const initial = name.trim().charAt(0).toUpperCase() || "H";
    const [dialogOpen, setDialogOpen] = useState(false);
    return (
        <div className="flex shrink-0 flex-col items-start gap-2">
            <AvatarLightbox name={name} src={leader.imageUrl}>
                <MediaImage
                    alt={name}
                    className="block h-20 w-20 rounded-full border-2 border-white shadow-sm ring-1 ring-border"
                    fallback={
                        <span
                            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white ring-1 ring-border">
                            {editing ? <ImageSquare size={28} weight="duotone"/> : initial}
                        </span>
                    }
                    src={leader.imageUrl}
                />
            </AvatarLightbox>
            {editing ? (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
                        onClick={() => setDialogOpen(true)}
                        type="button"
                    >
                        <ImageSquare size={15}/>
                        Thay đổi ảnh
                    </button>
                    <AvatarUploadDialog
                        currentUrl={leader.imageUrl}
                        onOpenChange={setDialogOpen}
                        onUploaded={(result) => onChange(result.url, result.assetId)}
                        open={dialogOpen}
                    />
                </div>
            ) : null}
        </div>
    );
}

