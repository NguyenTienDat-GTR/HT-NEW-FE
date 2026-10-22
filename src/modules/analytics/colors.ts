// Màu theo thực thể: cùng một chỉ số luôn cùng màu ở mọi biểu đồ, không đổi theo thứ hạng hay bộ lọc.
export const SERIES_COLOR: Record<string, string> = {
  registrations: "var(--viz-1)",
  attended: "var(--viz-2)",
  passed: "var(--viz-3)",
  newLeaders: "var(--viz-1)",
  promotions: "var(--viz-2)",
  approved: "var(--viz-good)",
  pending: "var(--viz-warning)",
  rejected: "var(--viz-critical)",
  revoked: "var(--viz-serious)",
  cumulative: "var(--viz-7)",
};

export const STATUS_COLOR: Record<string, string> = {
  APPROVED: "var(--viz-good)",
  PENDING: "var(--viz-warning)",
  SUBMITTED: "var(--viz-warning)",
  REJECTED: "var(--viz-critical)",
  REVOKED: "var(--viz-serious)",
  NOT_REQUIRED: "var(--viz-neutral)",
  NAM: "var(--viz-1)",
  NU: "var(--viz-2)",
  UNKNOWN: "var(--viz-neutral)",
  ACTIVE: "var(--viz-3)",
  INACTIVE: "var(--viz-neutral)",
  REGISTERED: "var(--viz-1)",
  ATTENDED: "var(--viz-2)",
  COMPLETED: "var(--viz-3)",
  CANCELLED: "var(--viz-4)",
  LT_1H: "var(--viz-seq-250)",
  LT_1D: "var(--viz-seq-350)",
  LT_3D: "var(--viz-seq-450)",
  LT_7D: "var(--viz-seq-550)",
  GE_7D: "var(--viz-seq-650)",
};

export const AGE_RAMP = ["var(--viz-seq-250)", "var(--viz-seq-350)", "var(--viz-seq-450)", "var(--viz-seq-550)", "var(--viz-seq-650)", "var(--viz-seq-650)"];

