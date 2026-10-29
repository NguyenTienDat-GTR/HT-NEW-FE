"use client";

import { Input } from "@/components/ui/input";
import {
  clamp,
  DEFAULT_PHOTO_SIZE,
  MAX_PHOTO_SIZE,
  MAX_PHOTO_WIDTH,
  MIN_PHOTO_SIZE,
  MIN_PHOTO_WIDTH,
  PHOTO_RATIO_OPTIONS,
  photoAspect,
  type LayoutItem,
  type PhotoRatio,
} from "./certificate-design";

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:opacity-70";

// Thuộc tính ảnh đại diện huynh trưởng: khổ 4x6 / 3x4 / tự do, chiều cao (và chiều rộng khi tự do).
// Cũng có thể kéo tay nắm ở góc ảnh trên khung thiết kế để đổi kích thước.
export function PhotoInspector({
  item,
  disabled,
  unit,
  onChange,
}: {
  item: LayoutItem;
  disabled: boolean;
  // "giấy" (chứng nhận) hoặc "thẻ": đơn vị tham chiếu của phần trăm.
  unit: string;
  onChange: (patch: Partial<LayoutItem>, key: string) => void;
}) {
  const ratio: PhotoRatio = item.photoRatio ?? "4x6";
  const height = item.size ?? DEFAULT_PHOTO_SIZE;
  const width = height * photoAspect(item);

  function changeRatio(next: PhotoRatio) {
    if (next === "free") onChange({ photoRatio: "free", photoWidth: Math.round(width * 1000) / 1000 }, "photoRatio");
    else onChange({ photoRatio: next, photoWidth: undefined }, "photoRatio");
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-text-secondary" htmlFor="photo-ratio">
          Khổ ảnh
        </label>
        <select className={SELECT_CLASS} disabled={disabled} id="photo-ratio" onChange={(event) => changeRatio(event.target.value as PhotoRatio)} value={ratio}>
          {PHOTO_RATIO_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={ratio === "free" ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          <label className="mb-1 block text-xs font-semibold text-text-secondary" htmlFor="photo-height">
            {`Chiều cao ảnh (% chiều cao ${unit})`}
          </label>
          <Input
            disabled={disabled}
            id="photo-height"
            max={Math.round(MAX_PHOTO_SIZE * 100)}
            min={Math.round(MIN_PHOTO_SIZE * 100)}
            onChange={(event) => onChange({ size: clamp(Number(event.target.value) / 100, MIN_PHOTO_SIZE, MAX_PHOTO_SIZE) }, "photoSize")}
            type="number"
            value={Math.round(height * 100)}
          />
        </div>
        {ratio === "free" ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary" htmlFor="photo-width">
              {`Chiều rộng ảnh (% chiều cao ${unit})`}
            </label>
            <Input
              disabled={disabled}
              id="photo-width"
              max={Math.round(MAX_PHOTO_WIDTH * 100)}
              min={Math.round(MIN_PHOTO_WIDTH * 100)}
              onChange={(event) => onChange({ photoWidth: clamp(Number(event.target.value) / 100, MIN_PHOTO_WIDTH, MAX_PHOTO_WIDTH) }, "photoWidth")}
              type="number"
              value={Math.round(width * 100)}
            />
          </div>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-muted">
        Ảnh lấy từ hồ sơ huynh trưởng, được cắt vừa khung (không méo hình). Kéo ảnh để đặt vị trí (điểm kéo là tâm ảnh); kéo ô vuông ở góc dưới-phải để
        {ratio === "free" ? " kéo giãn hoặc co lại." : " phóng to / thu nhỏ theo đúng khổ."}
      </p>
    </div>
  );
}
