import { compactPayload, enumOptions, unitTypeSelectOptions, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { leaderLevels } from "@/modules/organizations/form-specs";

const unitTypes = unitTypeSelectOptions(["DIOCESE", "DEANERY"]);

export const trainingFormSpecs: ResourceFormSpec[] = [
  {
    kind: "course-types",
    createTitle: "Thêm loại khóa",
    editTitle: "Chỉnh sửa loại khóa",
    description: "Loại khóa huấn luyện: cấp quản lý, điều kiện tham dự, khóa tiên quyết và cấp thăng.",
    fields: [
      { name: "typeName", label: "Tên loại khóa", required: true, section: "Thông tin loại khóa" },
      { name: "managementUnitType", label: "Cấp quản lý", type: "select", required: true, options: unitTypes, section: "Thông tin loại khóa" },
      { name: "certificateShortCode", label: "Mã viết tắt chứng chỉ", section: "Thông tin loại khóa" },
      { name: "requiredCurrentLevel", label: "Cấp hiện tại yêu cầu", type: "select", options: leaderLevels, section: "Điều kiện tham dự" },
      { name: "requiredMinAge", label: "Tuổi tối thiểu", type: "number", section: "Điều kiện tham dự" },
      { name: "requiredYearsActive", label: "Số năm sinh hoạt", type: "number", section: "Điều kiện tham dự" },
      {
        name: "prerequisiteTypeCode",
        label: "Khóa tiên quyết",
        type: "select",
        optionsEndpoint: "/training/course-types",
        optionValue: "typeCode",
        optionLabel: "typeName",
        section: "Nâng cấp",
      },
      { name: "resultingLevel", label: "Cấp độ khi hoàn thành", type: "select", options: leaderLevels, section: "Nâng cấp" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.typeCode;
      return payload;
    },
  },
  {
    kind: "courses",
    createTitle: "Tạo khóa huấn luyện",
    editTitle: "Chỉnh sửa khóa huấn luyện",
    description: "Khóa học, thời gian, cửa sổ đăng ký và điểm đạt.",
    fields: [
      { name: "courseName", label: "Tên khóa", required: true, section: "Thông tin khóa" },
      {
        name: "courseTypeCode",
        label: "Loại khóa",
        type: "select",
        required: true,
        optionsEndpoint: "/training/course-types",
        optionValue: "typeCode",
        optionLabel: "typeName",
        section: "Thông tin khóa",
      },
      { name: "hostYear", label: "Năm tổ chức", type: "number", section: "Thông tin khóa" },
      { name: "location", label: "Địa điểm", section: "Thông tin khóa" },
      { name: "startDate", label: "Ngày bắt đầu", type: "date", required: true, section: "Thời gian" },
      { name: "endDate", label: "Ngày kết thúc", type: "date", required: true, section: "Thời gian" },
      { name: "registrationStartAt", label: "Mở đăng ký", type: "datetime", required: true, section: "Thời gian đăng ký" },
      { name: "registrationEndAt", label: "Đóng đăng ký", type: "datetime", required: true, section: "Thời gian đăng ký" },
      { name: "passingScore", label: "Điểm đạt", type: "number", required: true, helper: "Điểm tổng kết (trung bình có hệ số) tối thiểu để đạt khóa.", section: "Cấu hình chấm điểm" },
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
    description: "Thành phần điểm thuộc một loại khóa, có hệ số để tính điểm tổng kết (trung bình có hệ số).",
    getInitialValues: () => ({ includeInFinal: true, coefficient: 1 }),
    fields: [
      { name: "name", label: "Tên thành phần", required: true, section: "Thông tin thành phần" },
      {
        name: "courseTypeCode",
        label: "Loại khóa",
        type: "select",
        required: true,
        optionsEndpoint: "/training/course-types",
        optionValue: "typeCode",
        optionLabel: "typeName",
        readOnlyOnEdit: true,
        section: "Thông tin thành phần",
      },
      { name: "maxScore", label: "Điểm tối đa", type: "number", required: true, section: "Chấm điểm" },
      { name: "coefficient", label: "Hệ số", type: "number", required: true, helper: "Điểm tổng kết = Σ(điểm × hệ số) / Σ hệ số của các thành phần được tính.", section: "Chấm điểm" },
      {
        name: "includeInFinal",
        label: "Tính vào điểm tổng kết",
        type: "switch",
        switchLabels: ["Có tính vào điểm tổng kết", "Không tính vào điểm tổng kết"],
        section: "Chấm điểm",
      },
      { name: "displayOrder", label: "Thứ tự", type: "number", section: "Hiển thị" },
      { name: "description", label: "Mô tả", type: "textarea", clearable: true, section: "Hiển thị" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") {
        delete payload.code;
        delete payload.unitType;
        delete payload.courseTypeCode;
      }
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
