// Bỏ dấu + hạ chữ thường để tìm kiếm tiếng Việt không phân biệt dấu / hoa thường ("cap 1" vẫn ra "Cấp 1").
export function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
