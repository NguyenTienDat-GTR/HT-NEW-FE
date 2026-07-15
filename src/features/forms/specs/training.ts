import { compactPayload, enumOptions, type ResourceFormSpec } from "../types";
import { leaderLevels } from "./organization";

const courseTypes = enumOptions(["SMTL_DT", "SMKN_DT", "SMTL_I", "SMKN_I", "TSM_II", "SMTL_II", "SMKN_II", "TSM_III_1", "TSM_III_2", "SMTL_III", "SMKN_III", "HLV_I", "HLV_II", "HLV_III"]);
const unitTypes = enumOptions(["DIOCESE", "DEANERY"]);

export const trainingFormSpecs: ResourceFormSpec[] = [
  {
    kind: "requirements",
    createTitle: "Thêm điều kiện khóa",
    editTitle: "Chỉnh sửa điều kiện khóa",
    description: "Điều kiện tham dự theo loại khóa, cấp hiện tại, tuổi và thâm niên.",
    fields: [
      { name: "requirementCode", label: "Mã điều kiện", required: true, readOnlyOnEdit: true, section: "Thông tin điều kiện" },
      { name: "requirementName", label: "Tên điều kiện", required: true, section: "Thông tin điều kiện" },
      { name: "courseType", label: "Loại khóa", type: "select", required: true, options: courseTypes, section: "Thông tin điều kiện" },
      { name: "requiredCurrentLevel", label: "Cấp hiện tại", type: "select", required: true, options: leaderLevels, section: "Điều kiện" },
      { name: "requiredMinAge", label: "Tuổi tối thiểu", type: "number", section: "Điều kiện" },
      { name: "requiredYearsActive", label: "Số năm sinh hoạt", type: "number", section: "Điều kiện" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.requirementCode;
      return payload;
    },
  },
  {
    kind: "courses",
    createTitle: "Tạo khóa huấn luyện",
    editTitle: "Chỉnh sửa khóa huấn luyện",
    description: "Khóa học, thời gian, cửa sổ đăng ký và công thức điểm.",
    fields: [
      { name: "courseCode", label: "Mã khóa", required: true, readOnlyOnEdit: true, section: "Thông tin khóa" },
      { name: "courseName", label: "Tên khóa", required: true, section: "Thông tin khóa" },
      { name: "courseType", label: "Loại khóa", type: "select", required: true, options: courseTypes, section: "Thông tin khóa" },
      {
        name: "requirementCode",
        label: "Điều kiện khóa",
        type: "select",
        optionsEndpoint: "/training/requirements",
        optionValue: "requirementCode",
        optionLabel: "requirementName",
        clearable: true,
        section: "Thông tin khóa",
      },
      { name: "hostYear", label: "Năm tổ chức", type: "number", section: "Thông tin khóa" },
      { name: "location", label: "Địa điểm", section: "Thông tin khóa" },
      { name: "startDate", label: "Ngày bắt đầu", type: "date", required: true, section: "Thời gian" },
      { name: "endDate", label: "Ngày kết thúc", type: "date", required: true, section: "Thời gian" },
      { name: "registrationStartAt", label: "Mở đăng ký", type: "datetime", required: true, section: "Thời gian đăng ký" },
      { name: "registrationEndAt", label: "Đóng đăng ký", type: "datetime", required: true, section: "Thời gian đăng ký" },
      {
        name: "scoreFormulaId",
        label: "Công thức điểm",
        type: "select",
        required: true,
        optionsEndpoint: "/training/score-formulas",
        optionValue: "code",
        optionLabel: "name",
        section: "Cấu hình chấm điểm",
      },
      { name: "additionalNotes", label: "Ghi chú", type: "textarea", clearable: true, section: "Ghi chú" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.courseCode;
      return payload;
    },
  },
  {
    kind: "score-components",
    createTitle: "Thêm thành phần điểm",
    editTitle: "Chỉnh sửa thành phần điểm",
    description: "Thành phần điểm dùng trong công thức chấm.",
    fields: [
      { name: "code", label: "Mã thành phần", required: true, readOnlyOnEdit: true, section: "Thông tin thành phần" },
      { name: "name", label: "Tên thành phần", required: true, section: "Thông tin thành phần" },
      { name: "maxScore", label: "Điểm tối đa", type: "number", required: true, section: "Thông tin thành phần" },
      { name: "unitType", label: "Cấp quản lý", type: "select", required: true, options: unitTypes, readOnlyOnEdit: true, section: "Phạm vi" },
      { name: "displayOrder", label: "Thứ tự", type: "number", section: "Hiển thị" },
      { name: "description", label: "Mô tả", type: "textarea", clearable: true, section: "Hiển thị" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.code;
        delete payload.unitType;
      }
      return payload;
    },
  },
  {
    kind: "score-formulas",
    createTitle: "Tạo công thức điểm",
    editTitle: "Chỉnh sửa công thức điểm",
    description: "Công thức tính điểm dựa trên các thành phần đã chọn.",
    fields: [
      { name: "code", label: "Mã công thức", required: true, readOnlyOnEdit: true, section: "Thông tin công thức" },
      { name: "name", label: "Tên công thức", required: true, section: "Thông tin công thức" },
      { name: "expression", label: "Biểu thức", required: true, section: "Thông tin công thức" },
      { name: "passingScore", label: "Điểm đạt", type: "number", required: true, section: "Thông tin công thức" },
      { name: "unitType", label: "Cấp quản lý", type: "select", required: true, options: unitTypes, section: "Phạm vi" },
      {
        name: "componentIds",
        label: "Thành phần điểm",
        type: "multiselect",
        required: true,
        optionsEndpoint: "/training/score-components",
        optionValue: "code",
        optionLabel: "name",
        section: "Thành phần",
      },
      { name: "description", label: "Mô tả", type: "textarea", clearable: true, section: "Ghi chú" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.code;
      return payload;
    },
  },
];

export const certificateFormSpecs: ResourceFormSpec[] = [
  {
    kind: "certificates",
    createTitle: "Tạo chứng nhận",
    editTitle: "Chỉnh sửa chứng nhận",
    description: "Chứng nhận theo huynh trưởng, khóa học, kết quả và ảnh chứng nhận.",
    fields: [
      { name: "certificateCode", label: "Mã chứng nhận", required: true, readOnlyOnEdit: true, section: "Thông tin chứng nhận" },
      { name: "oldCertificateCode", label: "Mã cũ", clearable: true, section: "Thông tin chứng nhận" },
      { name: "certificateName", label: "Tên chứng nhận", required: true, section: "Thông tin chứng nhận" },
      {
        name: "leaderId",
        label: "Huynh trưởng",
        type: "select",
        required: true,
        optionsEndpoint: "/leaders",
        optionValue: "id",
        optionLabel: "fullName",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
      {
        name: "courseCode",
        label: "Khóa",
        type: "select",
        required: true,
        optionsEndpoint: "/training/courses",
        optionValue: "courseCode",
        optionLabel: "courseName",
        readOnlyOnEdit: true,
        section: "Liên kết",
      },
      { name: "result", label: "Kết quả", type: "select", required: true, options: enumOptions(["PASS", "FAIL", "DAT", "KHONG_DAT"]), section: "Kết quả" },
      { name: "signedBy", label: "Người ký", section: "Kết quả" },
      { name: "issueDate", label: "Ngày cấp", type: "date", required: true, section: "Kết quả" },
      { name: "imageUrl", label: "Ảnh chứng nhận URL", type: "url", required: true, clearable: true, section: "Preview" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.certificateCode;
        delete payload.leaderId;
        delete payload.courseCode;
        delete payload.result;
      }
      return payload;
    },
  },
];
