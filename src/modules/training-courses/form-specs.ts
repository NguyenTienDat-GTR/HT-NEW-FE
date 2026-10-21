import { compactPayload, unitTypeSelectOptions, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { leaderLevelSelect } from "@/modules/organizations/form-specs";

const unitTypes = unitTypeSelectOptions(["DIOCESE", "DEANERY"]);

// Khóa đã có hồ sơ tham gia (BE trả hasParticipations ở chi tiết khóa) thì khóa các trường này khi sửa.
const lockedByParticipations = (values: Record<string, unknown>, mode: string) => mode === "edit" && values.hasParticipations === true;

export const trainingFormSpecs: ResourceFormSpec[] = [
  {
    kind: "course-types",
    createTitle: "Thêm loại khóa",
    editTitle: "Chỉnh sửa loại khóa",
    description: "Loại khóa huấn luyện: cấp quản lý, điều kiện tham dự, khóa tiên quyết và cấp thăng.",
    fields: [
      { name: "typeName", label: "Tên loại khóa", required: true, section: "Thông tin loại khóa" },
      { name: "managementUnitType", label: "Cấp quản lý", type: "select", required: true, options: unitTypes, section: "Thông tin loại khóa" },
      {
        name: "certificateShortCode",
        label: "Mã viết tắt chứng chỉ",
        // Bắt buộc khi loại khóa có cấp độ đạt được (có yêu cầu chứng nhận).
        requiredWhen: (values) => typeof values.resultingLevel === "string" && values.resultingLevel !== "" && values.resultingLevel !== "NONE",
        helper: "Dùng để sinh mã chứng chỉ, ví dụ HTI. Bắt buộc với loại khóa có cấp độ đạt được.",
        section: "Thông tin loại khóa",
      },
      { name: "requiredCurrentLevel", label: "Cấp hiện tại yêu cầu", type: "select", ...leaderLevelSelect, section: "Điều kiện tham dự" },
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
      { name: "resultingLevel", label: "Cấp độ khi hoàn thành", type: "select", ...leaderLevelSelect, section: "Nâng cấp" },
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
    description: "Khóa học, thời gian, cửa sổ đăng ký và điểm đạt. Sau khi khóa có hồ sơ tham gia, không đổi được loại khóa, năm tổ chức, số năm hoạt động và điểm đạt.",
    getInitialValues: () => ({ yearsActive: 0 }),
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
        readOnlyWhen: lockedByParticipations,
        section: "Thông tin khóa",
      },
      { name: "hostYear", label: "Năm tổ chức", type: "number", readOnlyWhen: lockedByParticipations, section: "Thông tin khóa" },
      {
        name: "yearsActive",
        label: "Số năm hoạt động",
        type: "number",
        min: 0,
        readOnlyWhen: lockedByParticipations,
        helper: "Số năm tối thiểu giữa năm đạt khóa tiên quyết và năm tổ chức khóa này. Mặc định 0, không được âm.",
        section: "Thông tin khóa",
      },
      { name: "location", label: "Địa điểm", section: "Thông tin khóa" },
      { name: "startDate", label: "Ngày bắt đầu", type: "date", required: true, section: "Thời gian" },
      { name: "endDate", label: "Ngày kết thúc", type: "date", required: true, section: "Thời gian" },
      { name: "registrationStartAt", label: "Mở đăng ký", type: "datetime", required: true, section: "Thời gian đăng ký" },
      { name: "registrationEndAt", label: "Đóng đăng ký", type: "datetime", required: true, section: "Thời gian đăng ký" },
      {
        name: "passingScore",
        label: "Điểm đạt",
        type: "number",
        required: true,
        readOnlyWhen: lockedByParticipations,
        helper: "Điểm tổng kết (trung bình có hệ số) tối thiểu để đạt khóa.",
        dynamicHelper: {
          buildEndpoint: (values) => {
            const typeCode = String(values.courseTypeCode ?? "");
            return typeCode ? `/training/courses/passing-score-limit?courseTypeCode=${encodeURIComponent(typeCode)}` : undefined;
          },
          format: (data, values) => {
            const limit = (data as { maxPassingScore?: number | string | null; componentCount?: number } | null)?.maxPassingScore;
            if (limit === null || limit === undefined) {
              return { text: "Loại khóa này chưa có thành phần điểm nào được tính vào điểm tổng kết nên chưa giới hạn điểm đạt." };
            }
            const passing = Number(values.passingScore);
            const invalid = Number.isFinite(passing) && values.passingScore !== "" && passing > Number(limit);
            return {
              text: `Điểm đạt không được lớn hơn ${Number(limit)} (điểm tối đa trung bình có hệ số của các thành phần điểm thuộc loại khóa đã chọn).`,
              invalid,
            };
          },
        },
        section: "Cấu hình chấm điểm",
      },
      {
        name: "recipientUsernames",
        label: "Tài khoản nhận danh sách đăng ký",
        type: "multiselect",
        searchable: true,
        placeholder: "Chọn người nhận danh sách đăng ký",
        buildOptionsEndpoint: (values) => {
          const typeCode = String(values.courseTypeCode ?? "");
          return typeCode ? `/training/courses/recipient-candidates?courseTypeCode=${encodeURIComponent(typeCode)}` : undefined;
        },
        optionValue: "username",
        optionLabelFields: ["fullName", "username", "roleName"],
        helper: "Chỉ hiển thị tài khoản có quyền duyệt danh sách đăng ký trong phạm vi của bạn. Bỏ trống để gửi cho tất cả tài khoản đủ quyền.",
        section: "Người nhận danh sách đăng ký",
      },
      { name: "additionalNotes", label: "Ghi chú", type: "textarea", clearable: true, section: "Thông tin bổ sung" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.courseCode;
      // Gửi cả danh sách rỗng khi sửa để có thể bỏ chọn toàn bộ người nhận.
      payload.recipientUsernames = Array.isArray(values.recipientUsernames) ? values.recipientUsernames : [];
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
