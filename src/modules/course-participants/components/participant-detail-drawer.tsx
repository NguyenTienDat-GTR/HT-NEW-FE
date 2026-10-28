"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { Pill } from "@/modules/badges/components/form-controls";
import { fetchParticipantDetail, participantKeys } from "../api";
import { formatDateTime, genderLabel, invitationLabel } from "../participant-detail";
import type { ParticipantDetail } from "../types";

// Chi tiết một hồ sơ trong danh sách tham dự: huynh trưởng, email thông tin tham dự, điểm danh và người tạo / duyệt / điểm danh.
export function ParticipantDetailDrawer({ courseCode, participationId, onClose }: { courseCode: string; participationId: string | null; onClose: () => void }) {
  const query = useQuery({
    queryKey: [...participantKeys.all(courseCode), "detail", participationId],
    enabled: participationId !== null,
    queryFn: () => fetchParticipantDetail(courseCode, participationId as string),
  });
  const detail = query.data;

  return (
    <Dialog.Root onOpenChange={(open) => (open ? undefined : onClose())} open={participationId !== null}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[4px]" />
        <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[460px] flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold text-foreground">{detail ? [detail.holyName, detail.fullName].filter(Boolean).join(" ") : "Chi tiết hồ sơ"}</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">{detail ? `Khóa ${detail.courseName ?? detail.courseCode}` : "Thông tin điểm danh và email thông tin tham dự"}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" type="button" variant="ghost">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50 p-5">
            {query.isLoading ? <p className="text-sm text-muted">Đang tải chi tiết…</p> : null}
            {query.isError ? <p className="text-sm text-danger" role="alert">{getApiErrorMessage(query.error)}</p> : null}
            {detail ? <DetailSections detail={detail} /> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailSections({ detail }: { detail: ParticipantDetail }) {
  const invitation = invitationLabel(detail);
  const actor = (name?: string | null, username?: string | null) => (name && username && name !== username ? `${name} (${username})` : (name ?? username ?? ""));
  return (
    <>
      <Section title="Điểm danh">
        {detail.attendanceEnabled ? (
          <>
            <Row label="Trạng thái">{detail.checkedInAt ? <Pill tone="success">Đã điểm danh</Pill> : <Pill>Chưa điểm danh</Pill>}</Row>
            <Row label="Thời điểm">{formatDateTime(detail.checkedInAt)}</Row>
            <Row label="Người điểm danh">{actor(detail.checkedInByName, detail.checkedInBy)}</Row>
          </>
        ) : (
          <p className="text-[13px] text-muted">Khóa chưa bật điểm danh.</p>
        )}
      </Section>

      <Section title="Email thông tin tham dự">
        <Row label="Email">{detail.email?.trim() ? <span className="break-all">{detail.email}</span> : ""}</Row>
        <Row label="Tình trạng">
          <Pill tone={invitation.tone}>{invitation.label}</Pill>
        </Row>
        <Row label="Gửi lần cuối">{formatDateTime(detail.invitationSentAt)}</Row>
        {detail.invitationError ? <Row label="Lỗi gần nhất"><span className="text-danger">{detail.invitationError}</span></Row> : null}
        {!detail.invitationError && detail.emailProblem ? <Row label="Lưu ý"><span className="text-warning">{detail.emailProblem}</span></Row> : null}
      </Section>

      <Section title="Huynh trưởng">
        <Row label="Tên thánh">{detail.holyName}</Row>
        <Row label="Họ và tên">{detail.fullName}</Row>
        <Row label="Giới tính">{genderLabel(detail.gender)}</Row>
        <Row label="Ngày sinh">{detail.birthDate ? new Date(detail.birthDate).toLocaleDateString("vi-VN") : ""}</Row>
        <Row label="Số điện thoại">{detail.phone}</Row>
        <Row label="Giáo xứ / giáo họ / giáo điểm">{detail.parishName}</Row>
        <Row label="Giáo hạt">{detail.deaneryName}</Row>
        <Row label="Giáo phận">{detail.dioceseName}</Row>
      </Section>

      <Section title="Hồ sơ tham dự">
        <Row label="Đội">{detail.teamName}</Row>
        <Row label="Trạng thái duyệt">{detail.approvalStatus === "APPROVED" ? "Đã duyệt" : detail.approvalStatus}</Row>
        <Row label="Ngày đăng ký">{detail.registrationDate ? new Date(detail.registrationDate).toLocaleDateString("vi-VN") : ""}</Row>
        <Row label="Giáo xứ gửi lúc">{formatDateTime(detail.parishSubmittedAt)}</Row>
        <Row label="Người tạo">{actor(detail.createdByName, detail.createdBy)}</Row>
        <Row label="Tạo lúc">{formatDateTime(detail.createdAt)}</Row>
        <Row label="Người duyệt">{actor(detail.approvedByName, detail.approvedBy)}</Row>
        <Row label="Cập nhật bởi">{actor(detail.updatedByName, detail.updatedBy)}</Row>
        <Row label="Cập nhật lúc">{formatDateTime(detail.updatedAt)}</Row>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white">
      <h3 className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
      <dl className="divide-y divide-border px-4">{children}</dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-foreground">{empty ? <span className="font-normal text-muted">Chưa có</span> : children}</dd>
    </div>
  );
}
