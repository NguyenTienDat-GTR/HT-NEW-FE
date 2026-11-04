// Dữ liệu mẫu cho bản xem trước cấu hình chứng nhận: lấy từ chứng nhận GPPC-DT-2026-14 (khóa Dự trưởng 2026 - Đợt 3).
// Huynh trưởng mẫu thuộc giáo họ để xem được cả giáo xứ lẫn giáo họ; giá trị theo đúng định dạng backend khi in.
export const CERTIFICATE_SAMPLE_VALUES: Record<string, string> = {
  signerName: "Giuse Nguyễn Văn An",
  signerTitle: "Linh mục tuyên úy",
  leaderFullName: "Phanxicô Vũ Văn Hùng",
  leaderBirthDate: "26/12/1988",
  leaderGender: "Nam",
  // Giáo xứ luôn là giáo xứ mẹ; giáo họ / giáo điểm nằm ở hai trường riêng.
  leaderParishName: "Giáo xứ Chánh Tòa",
  leaderSubUnitName: "Giáo họ Hiệp An",
  leaderUnitFullName: "Giáo họ Hiệp An – Giáo xứ Chánh Tòa",
  leaderDeaneryName: "Giáo hạt Thủ Dầu Một",
  leaderDioceseName: "Phú Cường",
  leaderLevel: "Huynh trưởng xứ",
  courseName: "Khóa Dự trưởng 2026 - Đợt 3",
  courseCode: "f101cc88-8c91-40f6-9eb7-f6e044b113b3",
  hostYear: "2026",
  courseStartDate: "28/10/2026",
  courseEndDate: "02/11/2026",
  coursePeriod: "từ 28/10/2026 đến 02/11/2026",
  courseLocation: "Trung tâm mục vụ Phú Cường, Thủ Dầu Một",
  resultingLevel: "Dự trưởng",
  certificateCode: "GPPC-DT-2026-14",
  result: "Đạt",
  issueDate: "27/10/2026",
};
