import { compactPayload, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { leaderLevelSelect } from "@/modules/organizations/form-specs";

const genderOptions = [
  { value: "NAM", label: "Nam" },
  { value: "NU", label: "Nữ" },
];

export const personnelFormSpecs: ResourceFormSpec[] = [
  {
    kind: "leaders",
    createTitle: "Thêm huynh trưởng",
    editTitle: "Chỉnh sửa huynh trưởng",
    description: "Hồ sơ huynh trưởng theo giáo xứ, cấp hiện tại và thông tin liên hệ.",
    fields: [
      { name: "holyName", label: "Tên thánh", required: true, section: "Thông tin cá nhân" },
      { name: "fullName", label: "Họ và tên", required: true, readOnlyOnEdit: true, section: "Thông tin cá nhân" },
      { name: "birthDate", label: "Ngày sinh", type: "date", required: true, readOnlyOnEdit: true, section: "Thông tin cá nhân" },
      { name: "gender", label: "Giới tính", type: "select", required: true, options: genderOptions, section: "Thông tin cá nhân" },
      { name: "email", label: "Email", type: "email", required: true, clearable: true, section: "Thông tin liên hệ" },
      { name: "phoneNumber", label: "Số điện thoại", clearable: true, section: "Thông tin liên hệ" },
      { name: "imageUrl", label: "Ảnh đại diện", type: "image", clearable: true, section: "Thông tin liên hệ" },
      {
        name: "parishId",
        label: "Giáo xứ",
        type: "select",
        required: true,
        optionsEndpoint: "/parishes",
        optionValue: "id",
        optionLabel: "name",
        section: "Phạm vi",
      },
      { name: "leaderLevel", label: "Cấp huynh trưởng", type: "select", required: true, ...leaderLevelSelect, readOnlyOnEdit: true, section: "Phạm vi" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.fullName;
        delete payload.birthDate;
        delete payload.leaderLevel;
      }
      return payload;
    },
  },
];
