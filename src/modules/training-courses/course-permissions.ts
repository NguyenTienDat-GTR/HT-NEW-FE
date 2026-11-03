import type { AuthUser } from "@/lib/auth/auth-store";
import { hasPermission } from "@/lib/auth/permissions";

/** Thao tác trên một khóa huấn luyện và tiền tố quyền tương ứng (không kèm cấp .diocese / .deanery). */
export type CourseAction = "update" | "toggle" | "finish" | "lockScore" | "approve" | "score" | "read" | "scanAttendance" | "certificateRead" | "certificateApprove";

const ACTION_PERMISSION: Record<CourseAction, string> = {
  update: "training.course.update",
  toggle: "training.course.toggle",
  finish: "training.course.finish",
  lockScore: "training.participation.lock",
  approve: "training.participation.approve",
  score: "training.participation.score",
  read: "training.participation.read",
  certificateRead: "training.certificate.read",
  certificateApprove: "training.certificate.approve",
  scanAttendance: "training.attendance.scan",
};

type CourseOwnerFields = {
  managementUnitType?: unknown;
  dioceseId?: unknown;
  deaneryId?: unknown;
};

/** Khóa do giáo hạt quản lý (theo loại khóa; khóa quá khứ không có loại thì theo đơn vị sở hữu), còn lại là khóa giáo phận. */
export function isDeaneryManagedCourse(course: CourseOwnerFields) {
  if (course.managementUnitType) return course.managementUnitType === "DEANERY";
  return Boolean(course.deaneryId);
}

/**
 * Được thao tác khóa này không: khóa giáo phận cần quyền cấp giáo phận, khóa giáo hạt cần quyền cấp giáo hạt,
 * và khóa phải thuộc đúng đơn vị của tài khoản. Tài khoản nhiều vai trò (ví dụ giáo hạt + giáo xứ) thấy cả khóa giáo phận
 * đang mở đăng ký trong danh sách, nhưng không vì thế mà sửa, kết thúc hay khóa điểm được khóa đó.
 * BE vẫn là nơi quyết định cuối cùng; đây chỉ để không hiện nút mà người dùng không dùng được.
 */
export function canActOnCourse(user: AuthUser | null | undefined, course: CourseOwnerFields | null | undefined, action: CourseAction) {
  if (!user || !course) return false;
  const base = ACTION_PERMISSION[action];
  // Chưa biết khóa thuộc cấp nào (dữ liệu chưa tải đủ): chỉ xét có quyền ở cấp nào đó, BE quyết định cuối cùng.
  if (!course.managementUnitType && !course.deaneryId && !course.dioceseId) {
    return hasPermission(user, `${base}.diocese`) || hasPermission(user, `${base}.deanery`);
  }
  if (isDeaneryManagedCourse(course)) {
    if (!hasPermission(user, `${base}.deanery`)) return false;
    return !course.deaneryId || !user.deaneryId || course.deaneryId === user.deaneryId;
  }
  if (!hasPermission(user, `${base}.diocese`)) return false;
  return !course.dioceseId || !user.dioceseId || course.dioceseId === user.dioceseId;
}

/** Quyền của một cấp được tính trên khóa: một trong các thao tác đọc, duyệt hoặc chấm điểm đều cho xem hồ sơ tham dự của khóa. */
function canReadCourseParticipants(user: AuthUser, course: CourseOwnerFields) {
  return canActOnCourse(user, course, "read") || canActOnCourse(user, course, "approve") || canActOnCourse(user, course, "score");
}

/** Tài khoản gửi đăng ký được cho khóa này không (tư cách giáo phận, giáo hạt hoặc giáo xứ phù hợp với khóa). */
export function canRegisterCourse(user: AuthUser | null | undefined, course: CourseOwnerFields | null | undefined) {
  if (!user || !course) return false;
  return canRegisterForCourse(user, course);
}

// Gửi đăng ký: giáo phận chỉ cho khóa giáo phận của mình; giáo hạt và giáo xứ cho khóa giáo hạt của mình hoặc khóa của giáo phận chủ quản.
function canRegisterForCourse(user: AuthUser, course: CourseOwnerFields) {
  const deaneryManaged = isDeaneryManagedCourse(course);
  const sameDiocese = !course.dioceseId || !user.dioceseId || course.dioceseId === user.dioceseId;
  const sameDeanery = !course.deaneryId || !user.deaneryId || course.deaneryId === user.deaneryId;
  if (deaneryManaged) {
    return sameDeanery && (hasPermission(user, "training.participation.submit.deanery") || hasPermission(user, "training.participation.submit.parish"));
  }
  return (
    sameDiocese &&
    (hasPermission(user, "training.participation.submit.diocese") ||
      hasPermission(user, "training.participation.submit.deanery") ||
      hasPermission(user, "training.participation.submit.parish"))
  );
}

export type CourseTabKey = "registrations" | "approvals" | "participations" | "teams" | "attendance" | "scores" | "certificate-approvals";

/**
 * Tab của khóa có dùng được không. Mỗi tab theo đúng quyền BE kiểm tra: tab thao tác trên khóa (duyệt, chia đội, điểm danh, chấm điểm,
 * duyệt chứng nhận) cần quyền đúng cấp quản lý của khóa; danh sách tham dự và đăng ký còn mở cho giáo xứ xem hồ sơ của chính mình.
 * Chưa có dữ liệu khóa thì chưa ẩn tab nào (BE vẫn quyết định cuối cùng).
 */
export function canUseCourseTab(user: AuthUser | null | undefined, course: CourseOwnerFields | null | undefined, tab: CourseTabKey) {
  if (!user) return false;
  if (!course) return true;
  switch (tab) {
    case "registrations":
      return canRegisterForCourse(user, course) || hasPermission(user, "training.participation.read.parish");
    case "approvals":
      return canActOnCourse(user, course, "approve");
    case "participations":
      return canReadCourseParticipants(user, course) || hasPermission(user, "training.participation.read.parish");
    case "teams":
    case "attendance":
      return canReadCourseParticipants(user, course);
    case "scores":
      return canActOnCourse(user, course, "score");
    case "certificate-approvals":
      return canActOnCourse(user, course, "certificateApprove") || canActOnCourse(user, course, "certificateRead");
  }
}
