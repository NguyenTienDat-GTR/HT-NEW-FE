import { compactPayload, enumOptions, type ResourceFormSpec } from "../types";

export const organizationFormSpecs: ResourceFormSpec[] = [
  {
    kind: "dioceses",
    createTitle: "Thêm giáo phận",
    editTitle: "Chỉnh sửa giáo phận",
    description: "Thông tin giáo phận, liên đoàn và liên hệ chính thức.",
    fields: [
      { name: "name", label: "Tên giáo phận", required: true, section: "Thông tin cơ bản" },
      { name: "unionName", label: "Tên liên đoàn", required: true, section: "Thông tin cơ bản" },
      { name: "chaplain", label: "Tuyên úy", section: "Thông tin cơ bản" },
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
      { name: "associationName", label: "Tên hiệp đoàn", required: true, section: "Thông tin cơ bản" },
      {
        name: "dioceseId",
        label: "Giáo phận",
        type: "select",
        required: true,
        optionsEndpoint: "/dioceses",
        optionValue: "id",
        optionLabel: "name",
        readOnlyOnEdit: true,
        section: "Phạm vi",
      },
      { name: "chaplain", label: "Tuyên úy", section: "Thông tin cơ bản" },
      { name: "phoneNumber", label: "Số điện thoại", section: "Thông tin liên hệ" },
      { name: "email", label: "Email", type: "email", section: "Thông tin liên hệ" },
      { name: "patronSaintDay", label: "Ngày bổn mạng", type: "date", section: "Mốc thời gian" },
      { name: "establishmentDate", label: "Ngày thành lập", type: "date", section: "Mốc thời gian" },
    ],
    mapSubmit: compactPayload,
  },
  {
    kind: "parishes",
    createTitle: "Thêm giáo xứ",
    editTitle: "Chỉnh sửa giáo xứ",
    description: "Giáo xứ, xứ đoàn và giáo hạt trực thuộc.",
    fields: [
      { name: "name", label: "Tên giáo xứ", required: true, section: "Thông tin cơ bản" },
      { name: "chapterName", label: "Tên xứ đoàn", required: true, section: "Thông tin cơ bản" },
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
      { name: "chaplain", label: "Cha tuyên úy", section: "Thông tin cơ bản" },
      { name: "phoneNumber", label: "Số điện thoại", section: "Thông tin liên hệ" },
      { name: "email", label: "Email", type: "email", section: "Thông tin liên hệ" },
      { name: "patronSaintDay", label: "Ngày bổn mạng", type: "date", section: "Mốc thời gian" },
      { name: "establishmentDate", label: "Ngày thành lập", type: "date", section: "Mốc thời gian" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.deaneryId;
      return payload;
    },
  },
];

export const leaderLevels = enumOptions(["NONE", "HT_XU", "DU_TRUONG", "HT_I", "HT_II", "HT_III", "HLV_I", "HLV_II", "HLV_III"]);
