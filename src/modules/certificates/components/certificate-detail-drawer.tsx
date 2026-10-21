"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { ArrowsInSimple, ArrowsOutSimple, X } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { ResourceCell } from "@/components/common/resource/resource-format";
import { apiFetch, getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { CertificateCanvas, paperAspect, useCertificateFonts, type LayoutItem } from "./certificate-design";

type Detail = Record<string, unknown>;

type PreviewItem = {
  type?: "TEXT" | "QR";
  size?: number;
  image?: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: LayoutItem["align"];
  fontFamily: LayoutItem["fontFamily"];
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

type Preview = {
  configured: boolean;
  paperSize?: string;
  orientation?: string;
  backgroundImage?: string;
  items: PreviewItem[];
};

type FieldSpec = {
  key: string;
  label: string;
  // Luôn hiển thị kể cả khi chưa có giá trị.
  always?: boolean;
  // Điều kiện hiển thị thêm (ngoài việc có giá trị).
  show?: (row: Detail) => boolean;
  fullWidth?: boolean;
  render?: (value: unknown, row: Detail) => ReactNode;
};

type SectionSpec = {
  title: string;
  tone?: "danger";
  visible?: (row: Detail) => boolean;
  fields: FieldSpec[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Các nhóm thông tin, gom theo ý nghĩa. Mã định danh (UUID) không hiển thị.
const SECTIONS: SectionSpec[] = [
  {
    title: "Thông tin chứng nhận",
    fields: [
      { key: "certificateCode", label: "Mã chứng nhận", always: true },
      { key: "oldCertificateCode", label: "Mã cũ" },
      { key: "certificateName", label: "Tên chứng nhận", always: true },
      { key: "issueDate", label: "Ngày cấp" },
      { key: "approvalStatus", label: "Trạng thái", always: true },
      { key: "finalResult", label: "Kết quả khóa", always: true },
    ],
  },
  {
    title: "Huynh trưởng",
    fields: [
      { key: "leaderFullName", label: "Họ và tên", always: true },
      { key: "leaderHolyName", label: "Tên thánh" },
      { key: "leaderBirthDate", label: "Ngày sinh" },
      { key: "leaderParishName", label: "Giáo xứ" },
      { key: "leaderDeaneryName", label: "Giáo hạt" },
      { key: "leaderDioceseName", label: "Giáo phận" },
    ],
  },
  {
    title: "Khóa huấn luyện",
    fields: [
      { key: "courseName", label: "Tên khóa", always: true, fullWidth: true },
      { key: "courseTypeName", label: "Loại khóa" },
      { key: "resultingLevel", label: "Cấp độ khi đạt" },
      { key: "courseHostYear", label: "Năm tổ chức", render: (value) => String(value) },
      { key: "courseFinished", label: "Tình trạng khóa", render: (value) => (value === true ? "Đã kết thúc" : "Đang diễn ra") },
      { key: "courseStartDate", label: "Ngày bắt đầu" },
      { key: "courseEndDate", label: "Ngày kết thúc" },
    ],
  },
  {
    title: "Kết quả học tập",
    fields: [
      { key: "totalScore", label: "Tổng điểm" },
      { key: "passingScore", label: "Điểm đạt" },
      { key: "passed", label: "Đánh giá điểm" },
    ],
  },
  {
    title: "Phê duyệt và người ký",
    fields: [
      { key: "signerName", label: "Người ký" },
      { key: "signerTitle", label: "Chức danh người ký" },
      { key: "approvedAt", label: "Ngày duyệt" },
      { key: "approvedByException", label: "Duyệt ngoại lệ", show: (row) => row.approvedByException === true, render: (value) => (value === true ? "Có (chưa đạt điểm qua)" : "Không") },
      { key: "exceptionApprovalReason", label: "Lý do duyệt ngoại lệ", fullWidth: true },
      { key: "rejectionReason", label: "Lý do từ chối", fullWidth: true },
    ],
  },
  {
    title: "Thu hồi chứng nhận",
    tone: "danger",
    visible: (row) => row.approvalStatus === "REVOKED",
    fields: [
      { key: "revokedAt", label: "Ngày thu hồi", always: true },
      {
        key: "revocationSource",
        label: "Nguồn thu hồi",
        render: (value) => (value === "COURSE_DISABLED" ? "Khóa huấn luyện bị vô hiệu hóa (tự mở lại khi bật lại khóa)" : "Thu hồi thủ công"),
      },
      { key: "revocationReason", label: "Lý do thu hồi", always: true, fullWidth: true },
    ],
  },
  {
    title: "Cấp lại chứng nhận",
    visible: (row) => row.approvalStatus !== "REVOKED" && hasValue(row.reissuedAt),
    fields: [
      { key: "reissuedAt", label: "Ngày cấp lại", always: true },
      { key: "reissueReason", label: "Lý do cấp lại", always: true, fullWidth: true },
    ],
  },
];

function hasValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  // Mã định danh (UUID) không có ý nghĩa với người xem.
  return !(typeof value === "string" && UUID_PATTERN.test(value));
}

// Tải chi tiết + bản xem trước chứng nhận (dùng chung cho drawer và trang chi tiết).
export function useCertificateDetail(id: string | null | undefined, endpoint: string) {
  const detailQuery = useQuery({
    queryKey: ["resource-detail", endpoint, id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<Detail>(`${endpoint}/${encodeURIComponent(String(id))}`),
  });
  // Chứng nhận đã thu hồi không có bản xem trước (BE cũng từ chối), nên chỉ tải khi đã biết chứng nhận chưa bị thu hồi.
  const revoked = detailQuery.data?.approvalStatus === "REVOKED";
  const previewQuery = useQuery({
    queryKey: ["certificate-preview", id, detailQuery.data?.approvalStatus],
    enabled: Boolean(id) && detailQuery.data !== undefined && !revoked,
    queryFn: () => apiFetch<Preview>(`${endpoint}/${encodeURIComponent(String(id))}/preview`),
  });
  return { detailQuery, previewQuery, revoked };
}

// Nội dung chi tiết chứng nhận: thông tin gom nhóm + bản xem trước. split = bố cục 2 cột (thông tin | chứng nhận lớn).
export function CertificateDetailBody({ detail, split }: { detail: ReturnType<typeof useCertificateDetail>; split: boolean }) {
  const { detailQuery, previewQuery, revoked } = detail;
  const row = detailQuery.data;
  return (
    <>
      {detailQuery.isLoading ? <div className="h-40 rounded-[12px] border border-border bg-white motion-safe:animate-pulse" /> : null}
      {detailQuery.isError ? (
        <div className="rounded-[10px] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{getApiErrorMessage(detailQuery.error)}</div>
      ) : null}
      {row ? (
        <div className={cn("gap-4", split ? "grid items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]" : "space-y-4")}>
          <div className={cn("space-y-4", split && "lg:order-2 lg:sticky lg:top-4")}>
            {revoked ? (
              <section className="rounded-[12px] border border-danger/30 bg-danger/5 p-4 text-sm text-foreground shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-danger">Xem trước chứng nhận</h2>
                <p className="mt-2">Chứng nhận đã bị thu hồi nên không hiển thị bản xem trước và không xuất PDF được.</p>
              </section>
            ) : (
              <PreviewPanel preview={previewQuery.data} loading={previewQuery.isLoading} error={previewQuery.isError ? getApiErrorMessage(previewQuery.error) : undefined} approved={row.approvalStatus === "APPROVED"} />
            )}
          </div>
          <div className={cn("space-y-4", split && "lg:order-1")}>
            {SECTIONS.filter((section) => section.visible?.(row) ?? true).map((section) => (
              <Section key={section.title} row={row} section={section} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

// Drawer chi tiết chứng nhận: thông tin tiếng Việt gom theo nhóm, kèm ảnh xem trước chứng nhận; mở rộng để xem ảnh lớn.
export function CertificateDetailDrawer({ id, onClose, endpoint }: { id?: string | null; onClose: () => void; endpoint: string }) {
  const [expanded, setExpanded] = useState(false);
  useCertificateFonts();

  const detail = useCertificateDetail(id, endpoint);
  const row = detail.detailQuery.data;

  return (
    <Dialog.Root open={Boolean(id)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-border bg-white shadow-[var(--shadow-elevated)] transition-[max-width] duration-200 focus:outline-none",
            expanded ? "max-w-[1280px]" : "max-w-[760px]",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold text-foreground">Chi tiết chứng nhận</Dialog.Title>
              <Dialog.Description className="mt-1 truncate text-sm text-muted">
                {row ? `${String(row.certificateCode ?? "")} · ${String(row.leaderFullName ?? "")}` : "Đang tải thông tin chứng nhận"}
              </Dialog.Description>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Tip label={expanded ? "Thu nhỏ drawer" : "Mở rộng drawer để xem chứng nhận lớn hơn"}>
                <Button
                  aria-label={expanded ? "Thu nhỏ" : "Mở rộng"}
                  className="hidden sm:inline-flex"
                  onClick={() => setExpanded((value) => !value)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {expanded ? <ArrowsInSimple size={20} /> : <ArrowsOutSimple size={20} />}
                </Button>
              </Tip>
              <Dialog.Close asChild>
                <Button aria-label="Đóng" size="icon" variant="ghost">
                  <X size={20} />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-app-canvas/50 p-5">
            <CertificateDetailBody detail={detail} split={expanded} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ section, row }: { section: SectionSpec; row: Detail }) {
  const fields = section.fields.filter((field) => (field.always || hasValue(row[field.key])) && (field.show?.(row) ?? true));
  if (fields.length === 0) return null;
  return (
    <section className={cn("rounded-[12px] border bg-white p-4 shadow-sm", section.tone === "danger" ? "border-danger/30" : "border-border")}>
      <h2 className={cn("text-xs font-semibold uppercase tracking-[0.04em]", section.tone === "danger" ? "text-danger" : "text-muted")}>{section.title}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div className={field.fullWidth ? "sm:col-span-2" : undefined} key={field.key}>
            <dt className="text-xs font-medium text-muted">{field.label}</dt>
            <dd className="mt-0.5 break-words text-sm leading-6 text-foreground">
              {!hasValue(row[field.key]) ? (
                <span className="text-muted">Chưa có</span>
              ) : field.render ? (
                field.render(row[field.key], row)
              ) : (
                <ResourceCell column={field.key} displayMode="detail" row={row} value={row[field.key]} />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PreviewPanel({ preview, loading, error, approved }: { preview?: Preview; loading: boolean; error?: string; approved: boolean }) {
  return (
    <section className="rounded-[12px] border border-border bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">Xem trước chứng nhận</h2>
      <div className="mt-3">
        {loading ? <div className="aspect-[1.414/1] w-full rounded-[10px] bg-surface-2 motion-safe:animate-pulse" /> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {preview && !preview.configured ? (
          <p className="rounded-[10px] border border-dashed border-border p-4 text-sm text-muted">
            Chưa có cấu hình chứng nhận (riêng hoặc chung) cho khóa này nên chưa thể xem trước. Hãy tạo cấu hình trong Cấu hình chứng nhận.
          </p>
        ) : null}
        {preview?.configured ? (
          <>
            <CertificateCanvas
              aspect={paperAspect(preview.paperSize ?? "A4", preview.orientation ?? "LANDSCAPE")}
              backgroundImage={preview.backgroundImage ?? ""}
              editable={false}
              fieldLabel={(key) => key ?? ""}
              layout={preview.items.map<LayoutItem>((item) => ({ ...item, type: item.type === "QR" ? "QR" : "TEXT" }))}
              onMove={() => undefined}
              onSelect={() => undefined}
              preview
              sampleValue={() => ""}
              selectedIndex={null}
            />
            <p className="mt-2 text-xs text-muted">
              Dựng từ cấu hình đang áp dụng và dữ liệu thật của chứng nhận, giống bản PDF khi xuất.
              {approved ? "" : " Người ký sẽ hiển thị sau khi chứng nhận được duyệt."}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
