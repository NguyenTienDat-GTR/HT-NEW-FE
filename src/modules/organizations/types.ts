// Tác động khi tắt một đơn vị (GET /{units}/{id}/toggle-impact).
export type UnitToggleImpact = {
  unitType: "DIOCESE" | "DEANERY" | "PARISH";
  currentlyActive: boolean;
  childDeaneries: number;
  childParishes: number;
  affectedAccounts: number;
  leaders: number;
  openCourses: number;
  pendingRegistrations: number;
  pendingCertificates: number;
};

// Một dòng lịch sử bật/tắt đơn vị (GET /{units}/{id}/status-history).
export type UnitStatusHistoryItem = {
  id: string;
  unitType: "DIOCESE" | "DEANERY" | "PARISH";
  unitId: string;
  status: boolean;
  eventType: "TOGGLE" | "BASELINE";
  reason?: string | null;
  changedBy?: string | null;
  changedAt?: string | null;
  affectedAccountCount: number;
  affectedChildUnitCount: number;
};

// Đơn vị bị khóa suy diễn: chính nó vẫn bật nhưng giáo hạt/giáo phận cha đã tắt.
export function isLockedByParent(row: Record<string, unknown>) {
  return row.status === true && row.effectiveStatus === false;
}
