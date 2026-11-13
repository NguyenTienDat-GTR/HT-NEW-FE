// Nhóm các cột của hộp thoại "Xuất Excel" theo nội dung để dễ chọn. Tên cột phải đúng tiêu đề cột ở backend
// (BE: TrainingExcelExports). Cột chưa xếp vào nhóm nào (backend thêm cột mới) rơi vào nhóm "Khác"; endpoint chưa khai báo thì không chia nhóm.

export type ColumnGroup = { title: string; columns: string[] };

const SYSTEM_COLUMNS = ["Ngày tạo", "Người tạo"];

const PARTICIPATION_GROUPS: ColumnGroup[] = [
  { title: "Huynh trưởng", columns: ["Tên thánh", "Họ và tên", "Email", "Số điện thoại", "Cấp độ hiện tại"] },
  { title: "Đơn vị", columns: ["Giáo xứ / giáo họ / giáo điểm", "Giáo hạt"] },
  {
    title: "Đăng ký tham dự",
    columns: ["Khóa huấn luyện", "Ngày đăng ký", "Trạng thái tham dự", "Trạng thái duyệt đăng ký", "Đội", "Ghi chú", "Lý do ngoại lệ", "Lý do gửi ngoài đợt", "Lý do gửi liên giáo hạt"],
  },
  { title: "Điểm và kết quả", columns: ["Điểm đạt", "Tổng điểm", "Điểm thành phần", "Kết quả", "Đạt / Không đạt", "Nhận xét", "Ghi chú điểm"] },
  { title: "Chứng nhận", columns: ["Trạng thái chứng nhận"] },
  { title: "Thông tin hệ thống", columns: SYSTEM_COLUMNS },
];

export const EXCEL_EXPORT_GROUPS: Record<string, ColumnGroup[]> = {
  "/training/participations": PARTICIPATION_GROUPS,
  "/training/participants": PARTICIPATION_GROUPS,
  "/training/participants/teams": PARTICIPATION_GROUPS,
  "/certificates": [
    { title: "Huynh trưởng", columns: ["Tên thánh", "Họ và tên", "Số điện thoại", "Giáo xứ / giáo họ / giáo điểm"] },
    { title: "Chứng nhận", columns: ["Mã chứng nhận", "Mã chứng nhận cũ", "Tên chứng nhận", "Khóa huấn luyện", "Ngày cấp"] },
    { title: "Điểm và kết quả", columns: ["Tổng điểm", "Điểm đạt", "Kết quả"] },
    {
      title: "Duyệt và ký",
      columns: ["Trạng thái duyệt", "Ngày duyệt", "Người duyệt", "Duyệt ngoại lệ", "Lý do duyệt ngoại lệ", "Lý do từ chối", "Loại người ký", "Người ký", "Chức vụ người ký"],
    },
    { title: "Thu hồi", columns: ["Ngày thu hồi", "Lý do thu hồi"] },
    { title: "Thông tin hệ thống", columns: ["Ngày tạo"] },
  ],
  "/training/courses": [
    { title: "Thông tin khóa", columns: ["Mã khóa", "Tên khóa", "Loại khóa", "Cấp độ đạt được (khóa quá khứ)", "Năm tổ chức", "Điểm đạt", "Ghi chú"] },
    { title: "Đơn vị và địa điểm", columns: ["Đơn vị tổ chức", "Giáo phận", "Địa điểm"] },
    { title: "Thời gian", columns: ["Ngày bắt đầu", "Ngày kết thúc", "Bắt đầu đăng ký", "Kết thúc đăng ký"] },
    { title: "Tình trạng", columns: ["Số tham dự viên", "Trạng thái đăng ký", "Trạng thái tổ chức", "Trạng thái"] },
    { title: "Thông tin hệ thống", columns: SYSTEM_COLUMNS },
  ],
  "/leaders": [
    { title: "Thông tin cá nhân", columns: ["Tên thánh", "Họ và tên", "Ngày sinh", "Giới tính"] },
    { title: "Liên hệ", columns: ["Email", "Số điện thoại"] },
    { title: "Đơn vị và cấp độ", columns: ["Cấp độ", "Giáo hạt", "Giáo xứ / giáo họ / giáo điểm"] },
    { title: "Thông tin hệ thống", columns: ["Trạng thái", ...SYSTEM_COLUMNS] },
  ],
};

const OTHER_TITLE = "Khác";

// Chia các cột backend trả về (giữ đúng thứ tự file) vào nhóm; nhóm không còn cột nào thì bỏ. Trả null khi endpoint không chia nhóm.
export function groupExportColumns(endpoint: string, allColumns: string[]): ColumnGroup[] | null {
  const groups = EXCEL_EXPORT_GROUPS[endpoint];
  if (!groups) return null;
  const placed = new Set(groups.flatMap((group) => group.columns));
  const result = groups
    .map((group) => ({ title: group.title, columns: allColumns.filter((column) => group.columns.includes(column)) }))
    .filter((group) => group.columns.length > 0);
  const others = allColumns.filter((column) => !placed.has(column));
  if (others.length) result.push({ title: OTHER_TITLE, columns: others });
  return result;
}
