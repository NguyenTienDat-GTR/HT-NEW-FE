// Gửi hồ sơ liên giáo hạt (khớp CrossDeaneryModels của BE).
export type OpenCourse = {
  courseCode: string;
  courseName: string;
  courseTypeName: string | null;
  deaneryId: string;
  deaneryName: string;
  startDate: string | null;
  endDate: string | null;
  registrationEndAt: string | null;
};

export type Candidate = {
  leaderId: string;
  holyName: string | null;
  fullName: string | null;
  leaderLevel: string | null;
  parishId: string;
  parishName: string;
  deaneryId: string;
  deaneryName: string;
  // Chưa đủ điều kiện của khóa đích: gửi dạng ngoại lệ kèm lí do ngoại lệ.
  eligible: boolean;
  blockedReason: string | null;
};

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export type ItemStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type RequestItem = {
  id: string;
  leaderId: string;
  holyName: string | null;
  fullName: string | null;
  parishId: string | null;
  parishName: string | null;
  reason: string;
  exceptionReason: string | null;
  note: string | null;
  itemStatus: ItemStatus;
  participationId: string | null;
};

export type CrossRequest = {
  id: string;
  courseCode: string;
  courseName: string;
  courseDeaneryId: string | null;
  courseDeaneryName: string | null;
  homeDeaneryId: string;
  homeDeaneryName: string | null;
  parishId: string | null;
  parishName: string | null;
  requesterType: "PARISH" | "DEANERY";
  requestStatus: RequestStatus;
  decisionNote: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdByName: string | null;
  createdAt: string | null;
  canDecide: boolean;
  canCancel: boolean;
  items: RequestItem[];
};

// Dữ liệu người dùng nhập cho từng huynh trưởng được chọn.
export type ItemDraft = { reason: string; exceptionReason: string; note: string };

export const statusLabels: Record<RequestStatus, string> = {
  PENDING: "Chờ giáo hạt nhà đồng ý",
  APPROVED: "Đã đồng ý",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã thu hồi",
  EXPIRED: "Hết hạn đăng ký",
};

export const itemStatusLabels: Record<ItemStatus, string> = {
  PENDING: "Chờ",
  APPROVED: "Đã đồng ý",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã thu hồi",
};

export const statusTones: Record<RequestStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};
