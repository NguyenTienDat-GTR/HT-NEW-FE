// Nén ảnh ngay trên trình duyệt trước khi tải lên: giảm dung lượng đường truyền và lưu trữ.
// Backend vẫn kiểm tra lại và tạo các kích thước cần dùng, nên bước này chỉ để tải nhanh hơn.

export type ImagePreset = "avatar" | "background";

// Khổ ảnh đại diện 4x6 (dọc): rộng/cao = 2/3.
export const AVATAR_ASPECT = 2 / 3;
export const AVATAR_MAX_HEIGHT = 720;

const PRESETS = {
  // Ảnh đại diện: khổ dọc 4x6 (rộng:cao = 2:3, ảnh dùng để in lên chứng nhận / thẻ), cắt giữa ảnh, cao tối đa 720px.
  avatar: { maxEdge: AVATAR_MAX_HEIGHT, portrait: true, quality: 0.9, maxInputBytes: 25 * 1024 * 1024 },
  // Ảnh nền chứng nhận / thẻ: giữ tỉ lệ, cạnh dài tối đa 3508px (A4 ở 300dpi).
  background: { maxEdge: 3508, portrait: false, quality: 0.9, maxInputBytes: 40 * 1024 * 1024 },
} as const;

export class ImageValidationError extends Error {}

type Drawable = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<{ source: Drawable; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image": tự xoay theo EXIF để ảnh chụp từ điện thoại không bị nghiêng.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Rơi xuống cách dùng thẻ img.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageValidationError("Không đọc được ảnh, tệp có thể bị hỏng hoặc không đúng định dạng");
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageValidationError("Không nén được ảnh"))), "image/jpeg", quality);
  });
}

// Kiểm tra loại tệp và dung lượng trước khi xử lý; ném ImageValidationError nếu không hợp lệ.
export function validateImageFile(file: File, preset: ImagePreset) {
  const config = PRESETS[preset];
  if (!file.type.startsWith("image/")) throw new ImageValidationError("Chỉ nhận tệp ảnh (PNG, JPG, WebP)");
  if (file.size > config.maxInputBytes) {
    throw new ImageValidationError(`Ảnh quá lớn (tối đa ${Math.round(config.maxInputBytes / 1024 / 1024)} MB)`);
  }
}

export type CropRect = { x: number; y: number; width: number; height: number };

// Cắt đúng vùng người dùng đã căn trong khung 4x6 và xuất JPEG khổ dọc (rộng tối đa 480px, cao tối đa 720px).
export async function cropPortraitToFile(image: CanvasImageSource, rect: CropRect, name: string): Promise<File> {
  const outWidth = Math.max(1, Math.min(Math.round(AVATAR_MAX_HEIGHT * AVATAR_ASPECT), Math.round(rect.width)));
  const outHeight = Math.max(1, Math.round(outWidth / AVATAR_ASPECT));
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new ImageValidationError("Trình duyệt không hỗ trợ xử lý ảnh");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outWidth, outHeight);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, outWidth, outHeight);
  const blob = await toBlob(canvas, PRESETS.avatar.quality);
  const baseName = name.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function compressImage(file: File, preset: ImagePreset): Promise<File> {
  const config = PRESETS[preset];
  validateImageFile(file, preset);

  const { source, width, height, release } = await decode(file);
  try {
    let sx = 0;
    let sy = 0;
    let sw = width;
    let sh = height;
    if (config.portrait) {
      // Cắt giữa ảnh theo khổ dọc 4x6.
      if (width / height > AVATAR_ASPECT) {
        sw = Math.round(height * AVATAR_ASPECT);
        sx = Math.floor((width - sw) / 2);
      } else {
        sh = Math.round(width / AVATAR_ASPECT);
        sy = Math.floor((height - sh) / 2);
      }
    }
    const scale = Math.min(1, config.maxEdge / Math.max(sw, sh));
    const targetW = Math.max(1, Math.round(sw * scale));
    const targetH = Math.max(1, Math.round(sh * scale));

    // Ảnh JPEG đã nhỏ, đúng kích thước và không cần cắt: giữ nguyên để khỏi nén hai lần làm giảm chất lượng.
    const untouched = file.type === "image/jpeg" && scale === 1 && sw === width && sh === height && file.size <= 2 * 1024 * 1024;
    if (untouched) return file;

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const context = canvas.getContext("2d");
    if (!context) throw new ImageValidationError("Trình duyệt không hỗ trợ xử lý ảnh");
    // JPEG không có nền trong suốt: tô trắng trước khi vẽ.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetW, targetH);
    context.imageSmoothingQuality = "high";
    context.drawImage(source, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const blob = await toBlob(canvas, config.quality);
    // Nếu nén xong còn nặng hơn ảnh gốc (ảnh JPEG đã tối ưu) thì dùng ảnh gốc khi kích thước không phải đổi.
    if (file.type === "image/jpeg" && scale === 1 && sw === width && sh === height && blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    release();
  }
}
