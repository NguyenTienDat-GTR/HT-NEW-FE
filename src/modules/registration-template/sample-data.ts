import { titleCase } from "./sheet-model";

/** Dữ liệu minh họa cho chế độ xem trước mẫu (không gọi BE): giá trị giả cho từng trường. */

const CELL_SAMPLES: Record<string, string> = {
  capDonVi: "Liên đoàn",
  tenDonVi: "Phêrô Đoàn Công Quí",
  capVaTenDonVi: "Liên đoàn Phêrô Đoàn Công Quí",
  tenGiaoPhan: "Phú Cường",
  capGiaoHoi: "Giáo phận",
  tenGiaoHoi: "Phú Cường",
  capVaTenGiaoHoi: "Giáo phận Phú Cường",
  giaoPhanVaTen: "Giáo phận Phú Cường",
  giaoHatVaTen: "Giáo hạt Thủ Dầu Một",
  giaoXuVaTen: "Giáo xứ Phú Hòa",
  giaoHoDiemVaTen: "Giáo họ Bình An",
  loaiGiaoHoDiem: "Giáo họ",
  tenGiaoHoDiem: "Bình An",
  tenLienDoan: "Phêrô Đoàn Công Quí",
  tenGiaoHat: "Thủ Dầu Một",
  tenHiepDoan: "Hiệp đoàn Thủ Dầu Một",
  tenGiaoXu: "Phú Hòa",
  tenXuDoan: "Giuse Lao Công",
  chaTuyenUy: "Cha Phêrô Nguyễn Văn B",
  tenNhom: "Giáo xứ Phú Hòa",
  soNguoi: "5",
  tenKhoa: "Khóa huấn luyện Sa Mạc cấp II/2027",
  maKhoa: "SM2-2027",
  loaiKhoa: "Sa Mạc cấp II",
  namToChuc: "2027",
  diaDiem: "Trung tâm mục vụ",
  ngayBatDau: "10/07/2027",
  ngayKetThuc: "17/07/2027",
  donViToChuc: "Giáo phận Phú Cường",
  ngayXuat: "13/11/2026",
  ngay: "13",
  thang: "11",
  nam: "2026",
};

const NAMES = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung", "Võ Minh Đạt"];

/** Giá trị minh họa của trường cột cho dòng thứ k (từ 0). */
function columnSample(key: string, k: number): string {
  switch (key) {
    case "stt":
      return String(k + 1);
    case "tenThanh":
      return ["Phêrô", "Maria", "Giuse", "Anna", "Phaolô"][k % 5];
    case "hoVaTen":
      return NAMES[k % 5];
    case "tenThanhHoVaTen":
      return `${["Phêrô", "Maria", "Giuse", "Anna", "Phaolô"][k % 5]} ${NAMES[k % 5]}`;
    case "ngaySinh":
      return `0${(k % 9) + 1}/0${(k % 9) + 1}/199${k % 10}`;
    case "namSinh":
      return `199${k % 10}`;
    case "gioiTinh":
      return k % 2 === 0 ? "Nam" : "Nữ";
    case "soDienThoai":
      return `09012345${String(10 + k)}`;
    case "email":
      return `huynhtruong${k + 1}@example.com`;
    case "giaoXu":
      return "Phú Hòa";
    case "giaoHoDiem":
      return k % 2 === 0 ? "Giáo họ Bình An" : "";
    case "loaiHoDiem":
      return k % 2 === 0 ? "Giáo họ" : "";
    case "tenHoDiem":
      return k % 2 === 0 ? "Bình An" : "";
    case "giaoHat":
      return "Thủ Dầu Một";
    case "capHienTai":
      return "Cấp I";
    case "namDatCap":
      return String(2022 + (k % 3));
    case "ngayDangKy":
      return "01/06/2027";
    case "trangThaiDuyet":
      return "Đã duyệt";
    case "doi":
      return `Đội ${(k % 3) + 1}`;
    case "ghiChu":
      return k === 1 ? "Xin phép đến muộn" : "";
    default:
      return "";
  }
}

/** Thay các {{trường}} trong chữ của ô bằng dữ liệu minh họa (trường lạ giữ nguyên); |upper / |lower / |title đổi hoa / thường. */
export function sampleText(text: string, k: number): string {
  return text.replace(/\{\{\s*([A-Za-z]+)\s*(?:\|\s*(upper|lower|title)\s*)?\}\}/g, (match, key: string, mod?: string) => {
    const value = key in CELL_SAMPLES ? CELL_SAMPLES[key] : columnSample(key, k);
    // Các trường có thể trống (không có giáo họ / giáo điểm, không ghi chú) thì in trống thay vì giữ nguyên {{...}}.
    if (value === "" && !["ghiChu", "giaoHoDiem", "loaiHoDiem", "tenHoDiem"].includes(key)) return match;
    return mod === "upper" ? value.toLocaleUpperCase("vi-VN") : mod === "lower" ? value.toLocaleLowerCase("vi-VN") : mod === "title" ? titleCase(value) : value;
  });
}

const SUB_UNIT_HINT = "Để trống (không in) nếu không thuộc giáo họ / giáo điểm.";

/** Giải thích ngắn của từng trường, chỉ hiện ở tooltip (tên trường giữ ngắn gọn). */
const FIELD_HINTS: Record<string, string> = {
  capDonVi: "Liên đoàn hoặc Hiệp đoàn, tự đổi theo cấp quản lý của khóa.",
  tenDonVi: "Tên liên đoàn hoặc hiệp đoàn ứng với cấp quản lý của khóa.",
  capVaTenDonVi: "Cấp và tên đơn vị đoàn ghép sẵn.",
  capGiaoHoi: "Giáo phận hoặc Giáo hạt, tự đổi theo cấp quản lý của khóa.",
  tenGiaoHoi: "Tên giáo phận hoặc giáo hạt ứng với cấp quản lý của khóa.",
  capVaTenGiaoHoi: "Cấp và tên giáo hội ghép sẵn.",
  giaoPhanVaTen: "Chữ \"Giáo phận\" kèm tên giáo phận của khóa.",
  giaoHatVaTen: "Chữ \"Giáo hạt\" kèm tên giáo hạt của nhóm đang xuất.",
  giaoXuVaTen: "Luôn là giáo xứ thật (giáo xứ mẹ nếu đơn vị là giáo họ / giáo điểm).",
  tenGiaoXu: "Luôn là giáo xứ thật (giáo xứ mẹ nếu đơn vị là giáo họ / giáo điểm).",
  giaoHoDiemVaTen: SUB_UNIT_HINT,
  loaiGiaoHoDiem: SUB_UNIT_HINT,
  tenGiaoHoDiem: SUB_UNIT_HINT,
  giaoHoDiem: SUB_UNIT_HINT,
  loaiHoDiem: SUB_UNIT_HINT,
  tenHoDiem: SUB_UNIT_HINT,
  tenNhom: "Tên giáo hạt hoặc giáo xứ của nhóm đang xuất.",
  ngayXuat: "Ngày xuất file, dạng dd/MM/yyyy.",
  ngay: "Ngày xuất file, dạng số.",
  thang: "Tháng xuất file, dạng số.",
  nam: "Năm xuất file, dạng số.",
};

export function hintFor(key: string): string {
  return FIELD_HINTS[key] ?? "";
}

/** Ví dụ hiển thị cho một trường (kèm kiểu chữ nếu có), dùng cho tooltip; rỗng nếu không có ví dụ. */
export function sampleFor(key: string, mod?: string): string {
  const text = sampleText(mod ? `{{${key}|${mod}}}` : `{{${key}}}`, 0);
  return text.startsWith("{{") ? "" : text;
}

export const PREVIEW_ROWS = 5;
