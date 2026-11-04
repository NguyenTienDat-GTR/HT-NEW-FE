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

export type SampleSet = { id: string; label: string; values: Record<string, string> };

// Bộ dữ liệu mẫu để thử bố cục với các trường hợp thật: giáo họ, giáo xứ và tên rất dài.
export const CERTIFICATE_SAMPLE_SETS: SampleSet[] = [
  { id: "giaoho", label: "Giáo họ", values: CERTIFICATE_SAMPLE_VALUES },
  {
    id: "giaoxu",
    label: "Giáo xứ",
    values: { ...CERTIFICATE_SAMPLE_VALUES, leaderSubUnitName: "", leaderUnitFullName: "Giáo xứ Chánh Tòa" },
  },
  {
    id: "long",
    label: "Tên dài (thử tràn chữ)",
    values: {
      ...CERTIFICATE_SAMPLE_VALUES,
      signerName: "Giuse Maria Nguyễn Hoàng Thiên Phúc",
      signerTitle: "Linh mục Tổng đại diện kiêm Giám đốc Trung tâm mục vụ",
      leaderFullName: "Phêrô Phaolô Nguyễn Trần Lê Hoàng Thiên Ân",
      leaderParishName: "Giáo xứ Thánh Giuse Thợ Thuyền Phú Cường",
      leaderSubUnitName: "Giáo điểm Thánh Tâm Chúa Giêsu An Phú Đông",
      leaderUnitFullName: "Giáo điểm Thánh Tâm Chúa Giêsu An Phú Đông – Giáo xứ Thánh Giuse Thợ Thuyền Phú Cường",
      courseName: "Khóa huấn luyện Dự trưởng Thiếu nhi Thánh Thể giáo phận Phú Cường năm 2026 - Đợt 3",
      courseLocation: "Trung tâm mục vụ Phú Cường, đường Nguyễn Văn Tiết, phường Lái Thiêu, Thủ Dầu Một",
    },
  },
];
