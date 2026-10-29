"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/client";
import { ImageValidationError } from "./compress-image";
import { uploadMedia, type MediaCategory, type MediaUploadResult } from "./upload-media";

// Hook tải ảnh: nén + tải lên, báo lỗi bằng toast và trả null khi thất bại.
export function useMediaUpload(category: MediaCategory) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File): Promise<MediaUploadResult | null> => {
      setUploading(true);
      try {
        return await uploadMedia(file, category);
      } catch (error) {
        toast.error(error instanceof ImageValidationError ? error.message : getApiErrorMessage(error));
        return null;
      } finally {
        setUploading(false);
      }
    },
    [category],
  );

  return { upload, uploading };
}
