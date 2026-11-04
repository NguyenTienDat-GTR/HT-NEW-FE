"use client";

import {
  DEFAULT_PHOTO_SIZE,
  DEFAULT_QR_SIZE,
  MAX_PHOTO_SIZE,
  MAX_PHOTO_WIDTH,
  MAX_QR_SIZE,
  MIN_PHOTO_SIZE,
  MIN_PHOTO_WIDTH,
  MIN_QR_SIZE,
  PHOTO_RATIO_OPTIONS,
  clamp,
  photoAspect,
  type LayoutItem,
  type PhotoRatio,
} from "@/modules/certificates/components/certificate-design";

const FIELD_CLASS = "h-8 rounded-lg border border-input bg-white px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60";

// Kích thước của mã QR / ảnh huynh trưởng ngay trên thanh công cụ (kéo tay cầm trên khung cũng đổi được).
// Phần trăm tính theo chiều cao trang / thẻ.
export function ObjectSizeControls({
  item,
  disabled,
  onChange,
}: {
  item: LayoutItem;
  disabled?: boolean;
  onChange: (patch: Partial<LayoutItem>, key: string) => void;
}) {
  if (item.type === "QR") {
    return (
      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary" title="Cạnh mã QR, % chiều cao giấy / thẻ. Nên để đủ lớn và tương phản với nền để dễ quét.">
        Mã QR
        <input
          aria-label="Cỡ mã QR (%)"
          className={`${FIELD_CLASS} w-16`}
          disabled={disabled}
          max={Math.round(MAX_QR_SIZE * 100)}
          min={Math.round(MIN_QR_SIZE * 100)}
          onChange={(event) => onChange({ size: clamp(Number(event.target.value) / 100, MIN_QR_SIZE, MAX_QR_SIZE) }, "qrSize")}
          type="number"
          value={Math.round((item.size ?? DEFAULT_QR_SIZE) * 100)}
        />
        %
      </label>
    );
  }
  if (item.type !== "PHOTO") return null;

  const ratio: PhotoRatio = item.photoRatio ?? "4x6";
  const height = item.size ?? DEFAULT_PHOTO_SIZE;
  const width = height * photoAspect(item);

  function changeRatio(next: PhotoRatio) {
    if (next === "free") onChange({ photoRatio: "free", photoWidth: Math.round(width * 1000) / 1000 }, "photoRatio");
    else onChange({ photoRatio: next, photoWidth: undefined }, "photoRatio");
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-secondary" title="Ảnh lấy từ hồ sơ huynh trưởng, cắt vừa khung (không méo hình). Kéo góc ảnh để phóng to / thu nhỏ.">
      Ảnh
      <select aria-label="Khổ ảnh" className={FIELD_CLASS} disabled={disabled} onChange={(event) => changeRatio(event.target.value as PhotoRatio)} value={ratio}>
        {PHOTO_RATIO_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        aria-label="Chiều cao ảnh (%)"
        className={`${FIELD_CLASS} w-16`}
        disabled={disabled}
        max={Math.round(MAX_PHOTO_SIZE * 100)}
        min={Math.round(MIN_PHOTO_SIZE * 100)}
        onChange={(event) => onChange({ size: clamp(Number(event.target.value) / 100, MIN_PHOTO_SIZE, MAX_PHOTO_SIZE) }, "photoSize")}
        title="Chiều cao ảnh (% chiều cao giấy / thẻ)"
        type="number"
        value={Math.round(height * 100)}
      />
      {ratio === "free" ? (
        <>
          ×
          <input
            aria-label="Chiều rộng ảnh (%)"
            className={`${FIELD_CLASS} w-16`}
            disabled={disabled}
            max={Math.round(MAX_PHOTO_WIDTH * 100)}
            min={Math.round(MIN_PHOTO_WIDTH * 100)}
            onChange={(event) => onChange({ photoWidth: clamp(Number(event.target.value) / 100, MIN_PHOTO_WIDTH, MAX_PHOTO_WIDTH) }, "photoWidth")}
            title="Chiều rộng ảnh (% chiều cao giấy / thẻ)"
            type="number"
            value={Math.round(width * 100)}
          />
        </>
      ) : null}
      %
    </div>
  );
}
