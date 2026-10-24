export type AttendanceCourse = { courseCode: string; courseName: string };

type CourseRow = Record<string, unknown>;

// Khóa dùng để điểm danh nhanh: khóa thường đang mở (chưa kết thúc, còn hoạt động), đã bật điểm danh.
// BE đã giới hạn danh sách theo phạm vi quản lý của người dùng; hàm này chỉ loại các khóa không điểm danh được.
export function attendanceCourses(rows: CourseRow[]): AttendanceCourse[] {
  return rows
    .filter(
      (row) =>
        typeof row.courseCode === "string" &&
        row.attendanceEnabled === true &&
        row.status !== false &&
        row.pastCourse !== true &&
        !row.finishedAt &&
        row.organizingStatus !== "ENDED",
    )
    .map((row) => ({ courseCode: row.courseCode as string, courseName: typeof row.courseName === "string" && row.courseName ? row.courseName : (row.courseCode as string) }));
}

// Bộ lọc gửi BE: chỉ lấy khóa bật điểm danh, còn hoạt động, chưa diễn ra hoặc đang diễn ra.
export const ATTENDANCE_COURSE_FILTERS = { attendanceEnabled: true, status: true, organizingStatus: ["UPCOMING", "ONGOING"] };
