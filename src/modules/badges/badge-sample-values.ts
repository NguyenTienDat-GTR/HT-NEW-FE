// Dữ liệu mẫu cho bản xem trước thẻ tham dự: lấy từ lượt tham dự của khóa Dự trưởng 2026 - Đợt 1 (Đội 1).
export const BADGE_SAMPLE_VALUES: Record<string, string> = {
  holyName: "Augustinô",
  leaderName: "Vũ Văn Dũng",
  leaderFullName: "Augustinô Vũ Văn Dũng",
  leaderParishName: "Chánh Tòa",
  leaderSubUnitName: "Hiệp An",
  leaderUnitFullName: "Hiệp An – Chánh Tòa",
  leaderDeaneryName: "Thủ Dầu Một",
  leaderDioceseName: "Phú Cường",
  teamName: "Đội 1",
  courseName: "Khóa Dự trưởng 2026 - Đợt 1",
  courseCode: "6168d0aa-6d64-4553-ac92-bda456969d51",
  hostYear: "2026",
  courseStartDate: "26/10/2026",
  courseEndDate: "31/10/2026",
  coursePeriod: "từ 26/10/2026 đến 31/10/2026",
  courseLocation: "Trung tâm mục vụ Phú Cường, Thủ Dầu Một",
};

export type BadgeSampleSet = { id: string; label: string; values: Record<string, string> };

// Bộ dữ liệu mẫu để thử bố cục thẻ với giáo họ, giáo xứ và tên rất dài.
export const BADGE_SAMPLE_SETS: BadgeSampleSet[] = [
  { id: "giaoho", label: "Giáo họ", values: BADGE_SAMPLE_VALUES },
  { id: "giaoxu", label: "Giáo xứ", values: { ...BADGE_SAMPLE_VALUES, leaderSubUnitName: "", leaderUnitFullName: "Chánh Tòa" } },
  {
    id: "long",
    label: "Tên dài (thử tràn chữ)",
    values: {
      ...BADGE_SAMPLE_VALUES,
      holyName: "Phêrô Phaolô",
      leaderName: "Nguyễn Trần Lê Hoàng Thiên Ân",
      leaderFullName: "Phêrô Phaolô Nguyễn Trần Lê Hoàng Thiên Ân",
      leaderParishName: "hánh Giuse Thợ",
      leaderSubUnitName: "Thánh Tâm Chúa Giêsu An Phú Đông",
      teamName: "Đội Thánh Giuse Thợ",
      courseName: "Khóa huấn luyện Dự trưởng Thiếu nhi Thánh Thể giáo phận Phú Cường năm 2026 - Đợt 3",
    },
  },
];
