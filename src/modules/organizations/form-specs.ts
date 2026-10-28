import { compactPayload, type ResourceFormSpec } from "@/components/form/resource-form/types";

export const organizationFormSpecs: ResourceFormSpec[] = [
  {
    kind: "dioceses",
    createTitle: "Thêm giáo phận",
    editTitle: "Chỉnh sửa giáo phận",
    description: "Thông tin giáo phận, liên đoàn và liên hệ chính thức.",
    fields: [
      { name: "name", label: "Tên giáo phận", required: true, section: "Thông tin cơ bản" },
      { name: "unionName", label: "Tên liên đoàn", required: true, section: "Thông tin cơ bản" },
      { name: "chaplain", label: "Cha tuyên úy", section: "Thông tin cơ bản" },
      { name: "phoneNumber", label: "Số điện thoại", section: "Thông tin liên hệ" },
      { name: "email", label: "Email", type: "email", section: "Thông tin liên hệ" },
      { name: "patronSaintDay", label: "Ngày bổn mạng", type: "date", section: "Mốc thời gian" },
      { name: "establishmentDate", label: "Ngày thành lập", type: "date", section: "Mốc thời gian" },
    ],
    mapSubmit: compactPayload,
  },
  {
    kind: "deaneries",
    createTitle: "Thêm giáo hạt",
    editTitle: "Chỉnh sửa giáo hạt",
    description: "Giáo hạt thuộc giáo phận và thông tin liên hệ.",
    fields: [
      { name: "name", label: "Tên giáo hạt", required: true, section: "Thông tin cơ bản" },
      { name: "associationName", label: "Tên hiệp đoàn", helper: "Không bắt buộc - bỏ trống nếu giáo hạt chưa thành lập hiệp đoàn.", section: "Thông tin cơ bản" },
      {
        name: "dioceseId",
        label: "Giáo phận",
        type: "select",
        required: true,
        optionsEndpoint: "/dioceses",
        optionValue: "id",
        optionLabel: "name",
        readOnlyOnCreate: true,
        readOnlyOnEdit: true,
        section: "Phạm vi",
      },
      { name: "chaplain", label: "Cha tuyên úy", section: "Thông tin cơ bản" },
      { name: "phoneNumber", label: "Số điện thoại", section: "Thông tin liên hệ" },
      { name: "email", label: "Email", type: "email", section: "Thông tin liên hệ" },
      { name: "patronSaintDay", label: "Ngày bổn mạng", type: "date", section: "Mốc thời gian" },
      { name: "establishmentDate", label: "Ngày thành lập", type: "date", section: "Mốc thời gian" },
    ],
    getInitialValues: (user) => (user?.dioceseId ? { dioceseId: user.dioceseId } : {}),
    mapSubmit: compactPayload,
  },
  {
    kind: "parishes",
    createTitle: "Thêm giáo xứ / giáo họ / giáo điểm",
    editTitle: "Chỉnh sửa giáo xứ / giáo họ / giáo điểm",
    description: "Đơn vị cơ sở (giáo xứ, giáo họ hoặc giáo điểm), xứ đoàn và giáo hạt trực thuộc.",
    getInitialValues: () => ({ unitType: "PARISH" }),
    fields: [
      {
        name: "unitType",
        label: "Loại đơn vị",
        type: "select",
        required: true,
        options: [
          { value: "PARISH", label: "Giáo xứ" },
          { value: "GIAO_HO", label: "Giáo họ" },
          { value: "GIAO_DIEM", label: "Giáo điểm" },
        ],
        readOnlyOnEdit: true,
        helper: "Giáo họ / giáo điểm thuộc một giáo xứ và có admin riêng; admin giáo xứ cha không quản lý giáo họ / giáo điểm của mình.",
        section: "Thông tin cơ bản",
      },
      { name: "name", label: "Tên đơn vị", required: true, section: "Thông tin cơ bản" },
      { name: "chapterName", label: "Tên xứ đoàn", helper: "Không bắt buộc - bỏ trống nếu đơn vị chưa thành lập xứ đoàn.", section: "Thông tin cơ bản" },
      {
        name: "deaneryId",
        label: "Giáo hạt",
        type: "select",
        required: true,
        optionsEndpoint: "/deaneries",
        optionValue: "id",
        optionLabel: "name",
        section: "Phạm vi",
      },
      {
        name: "parentParishId",
        label: "Thuộc giáo xứ",
        type: "select",
        optionValue: "id",
        optionLabel: "name",
        createOnly: true,
        visibleWhen: (values) => values.unitType === "GIAO_HO" || values.unitType === "GIAO_DIEM",
        requiredWhen: (values) => values.unitType === "GIAO_HO" || values.unitType === "GIAO_DIEM",
        buildOptionsEndpoint: (values) =>
          values.deaneryId ? `/parishes?filters=${encodeURIComponent(JSON.stringify({ "deanery.id": values.deaneryId, unitType: "PARISH" }))}` : undefined,
        helper: "Chọn giáo hạt trước, rồi chọn giáo xứ cha trong giáo hạt đó.",
        section: "Phạm vi",
      },
      { name: "chaplain", label: "Cha tuyên úy", section: "Thông tin cơ bản" },
      { name: "phoneNumber", label: "Số điện thoại", section: "Thông tin liên hệ" },
      { name: "email", label: "Email", type: "email", section: "Thông tin liên hệ" },
      { name: "patronSaintDay", label: "Ngày bổn mạng", type: "date", section: "Mốc thời gian" },
      { name: "establishmentDate", label: "Ngày thành lập", type: "date", section: "Mốc thời gian" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.deaneryId;
        delete payload.unitType;
        delete payload.parentParishId;
      } else if (payload.unitType === "PARISH") {
        delete payload.parentParishId;
      }
      return payload;
    },
  },
];

// Ô chọn cấp độ lấy từ danh mục cấp độ (quản lý ở Hệ thống > Cấp độ).
export const leaderLevelSelect = {
  optionsEndpoint: "/leader-levels/options",
  optionValue: "levelCode",
  optionLabel: "levelName",
} as const;
