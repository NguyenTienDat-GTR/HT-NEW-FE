import { compactPayload, enumOptions, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { leaderLevels } from "@/modules/organizations/form-specs";

const unitTypeOptions = enumOptions(["DIOCESE", "DEANERY", "PARISH"]);
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
      { name: "imageUrl", label: "Ảnh đại diện URL", type: "url", clearable: true, section: "Thông tin liên hệ" },
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
      { name: "leaderLevel", label: "Cấp huynh trưởng", type: "select", required: true, options: leaderLevels, readOnlyOnEdit: true, section: "Phạm vi" },
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
  {
    kind: "positions",
    createTitle: "Thêm chức vụ",
    editTitle: "Chỉnh sửa chức vụ",
    description: "Chức vụ theo cấp áp dụng trong ban điều hành.",
    fields: [
      { name: "positionName", label: "Tên chức vụ", required: true, section: "Thông tin chức vụ" },
      { name: "positionType", label: "Loại chức vụ", type: "radio", required: true, options: unitTypeOptions, section: "Thông tin chức vụ" },
    ],
    mapSubmit: compactPayload,
  },
  {
    kind: "executive-board",
    createTitle: "Thêm phân công ban điều hành",
    editTitle: "Chỉnh sửa phân công ban điều hành",
    description: "Phân công huynh trưởng vào chức vụ theo đơn vị và khoảng thời gian hiệu lực.",
    fields: [
      { name: "unitType", label: "Loại đơn vị", type: "select", required: true, options: unitTypeOptions, section: "Thông tin phân công" },
      { name: "unitId", label: "Đơn vị", required: true, section: "Thông tin phân công", helper: "Nhập UUID đơn vị hoặc chọn bằng endpoint context khi backend trả options." },
      {
        name: "leaderId",
        label: "Huynh trưởng",
        type: "select",
        required: true,
        optionsEndpoint: "/leaders",
        optionValue: "id",
        optionLabel: "fullName",
        section: "Thông tin phân công",
      },
      {
        name: "positionCode",
        label: "Chức vụ",
        type: "select",
        required: true,
        optionsEndpoint: "/positions",
        optionValue: "positionCode",
        optionLabel: "positionName",
        section: "Thông tin phân công",
      },
      { name: "startDate", label: "Ngày bắt đầu", type: "date", section: "Thời gian" },
      { name: "endDate", label: "Ngày kết thúc", type: "date", clearable: true, section: "Thời gian" },
    ],
    mapSubmit: compactPayload,
  },
];
