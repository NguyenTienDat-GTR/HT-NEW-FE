import { compactPayload, unitTypeSelectOptions, type ResourceFormSpec } from "@/components/form/resource-form/types";
import type { AuthUser } from "@/lib/auth/auth-store";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermission } from "@/lib/auth/permissions";
import { leaderLevelSelect } from "@/modules/organizations/form-specs";

const unitTypes = unitTypeSelectOptions(["DIOCESE", "DEANERY"]);

type ManagedResource = "course" | "course_type" | "score_component";

// Cấp quản lý (loại khóa) mà tài khoản được tạo/sửa: giáo phận hoặc giáo hạt theo quyền của mình; null nếu không có quyền ở cấp nào.
function managedUnitTypes(user: AuthUser | null, resource: ManagedResource): ("DIOCESE" | "DEANERY")[] {
  const result: ("DIOCESE" | "DEANERY")[] = [];
  (["DIOCESE", "DEANERY"] as const).forEach((type) => {
    const suffix = type.toLowerCase();
    if (hasPermission(user, `training.${resource}.create.${suffix}`) || hasPermission(user, `training.${resource}.update.${suffix}`)) result.push(type);
  });
  return result;
}

// Endpoint danh sách loại khóa chỉ gồm các loại thuộc cấp quản lý của tài khoản (không lẫn loại khóa của cấp khác).
function courseTypesInScope(resource: ManagedResource) {
  return (user: AuthUser | null) => {
    const types = managedUnitTypes(user, resource);
    if (types.length !== 1) return undefined;
    return `/training/course-types?filters=${encodeURIComponent(JSON.stringify({ managementUnitType: types[0] }))}`;
  };
}

// Khóa đã có hồ sơ tham gia (BE trả hasParticipations ở chi tiết khóa) thì khóa các trường này khi sửa.
const lockedByParticipations = (values: Record<string, unknown>, mode: string) => mode === "edit" && values.hasParticipations === true;

const pastCourseFields: ResourceFormSpec["fields"] = [
  { name: "courseName", label: "Tên khóa", required: true, section: "Thông tin khóa" },
  {
    name: "hostYear",
    label: "Năm tổ chức",
    type: "number",
    required: true,
    min: 1900,
    readOnlyWhen: lockedByParticipations,
    helper: "Không được sau năm hiện tại. Khóa đã có danh sách tham dự thì không đổi được năm tổ chức.",
    section: "Thông tin khóa",
  },
  {
    name: "resultingLevel",
    label: "Cấp độ đạt được",
    type: "select",
    optionsEndpoint: "/leader-levels/options",
    optionValue: "levelCode",
    optionLabel: "levelName",
    readOnlyWhen: lockedByParticipations,
    helper:
      "Không bắt buộc. Có cấp độ thì học viên Đạt được chuyển sang duyệt chứng nhận; khi chứng nhận được duyệt, cấp độ được ghi vào lịch sử cấp độ (cấp hiện tại chỉ tăng nếu cấp mới cao hơn).",
    section: "Thông tin khóa",
  },
  { name: "location", label: "Địa điểm", section: "Thông tin khóa" },
  { name: "startDate", label: "Ngày bắt đầu", type: "date", helper: "Không bắt buộc, có thể bỏ qua thời gian diễn ra.", section: "Thời gian" },
  { name: "endDate", label: "Ngày kết thúc", type: "date", section: "Thời gian" },
  {
    name: "passingScore",
    label: "Điểm đạt",
    type: "number",
    min: 0,
    readOnlyWhen: lockedByParticipations,
    helper: "Không bắt buộc (mặc định 0). Kết quả Đạt / Không đạt của từng học viên lấy theo file Excel.",
    section: "Cấu hình chấm điểm",
  },
  { name: "additionalNotes", label: "Ghi chú", type: "textarea", section: "Thông tin bổ sung" },
];

export const trainingFormSpecs: ResourceFormSpec[] = [
  {
    kind: "course-types",
    createTitle: "Thêm loại khóa",
    editTitle: "Chỉnh sửa loại khóa",
    description: "Loại khóa huấn luyện: cấp quản lý, điều kiện tham dự, khóa tiên quyết và cấp độ khi hoàn thành.",
    // Mặc định chọn cấp quản lý theo phạm vi tài khoản đang quản lý.
    getInitialValues: (user) => {
      const types = managedUnitTypes(user, "course_type");
      return types.length === 1 ? { managementUnitType: types[0] } : {};
    },
    fields: [
      { name: "typeName", label: "Tên loại khóa", required: true, section: "Thông tin loại khóa" },
      {
        name: "managementUnitType",
        label: "Cấp quản lý",
        type: "select",
        required: true,
        options: unitTypes,
        // Chỉ hiện cấp thuộc phạm vi quản lý của mình.
        excludeOptionValuesWhen: (user) => {
          const allowed = managedUnitTypes(user, "course_type");
          return allowed.length === 0 ? [] : unitTypes.map((option) => option.value).filter((value) => !allowed.includes(value as "DIOCESE" | "DEANERY"));
        },
        section: "Thông tin loại khóa",
      },
      {
        name: "certificateShortCode",
        label: "Mã viết tắt chứng chỉ",
        // Bắt buộc khi loại khóa có cấp độ đạt được (có yêu cầu chứng nhận).
        requiredWhen: (values) => typeof values.resultingLevel === "string" && values.resultingLevel !== "" && values.resultingLevel !== "NONE",
        helper: "Dùng để sinh mã chứng chỉ, ví dụ HTI. Bắt buộc với loại khóa có cấp độ đạt được.",
        section: "Thông tin loại khóa",
      },
      { name: "requiredCurrentLevel", label: "Cấp đội yêu cầu", type: "select", ...leaderLevelSelect, section: "Điều kiện tham dự" },
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
      {
        name: "maxYearsAfterPrerequisite",
        label: "Thời hạn tối đa sau khóa tiên quyết (năm)",
        type: "number",
        min: 1,
        clearable: true,
        clearLabel: "Đặt về không giới hạn",
        visibleWhen: (values) => typeof values.prerequisiteTypeCode === "string" && values.prerequisiteTypeCode !== "",
        helper: "Phải đi khóa này trong vòng bao nhiêu năm kể từ lần đạt khóa tiên quyết gần nhất. Để trống nếu không giới hạn.",
        section: "Nâng cấp",
      },
      { name: "resultingLevel", label: "Cấp độ khi hoàn thành", type: "select", ...leaderLevelSelect, section: "Nâng cấp" },
    ],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.typeCode;
      // Ô "Đặt về không giới hạn": gửi cờ xóa riêng cho thời hạn sau khóa tiên quyết.
      if (Array.isArray(payload.clearFields) && payload.clearFields.includes("maxYearsAfterPrerequisite")) {
        payload.clearMaxYearsAfterPrerequisite = true;
        const rest = payload.clearFields.filter((field) => field !== "maxYearsAfterPrerequisite");
        if (rest.length) payload.clearFields = rest;
        else delete payload.clearFields;
      }
      return payload;
    },
  },
  {
    kind: "courses",
    createTitle: "Tạo khóa huấn luyện",
    editTitle: "Chỉnh sửa khóa huấn luyện",
    description: "Khóa học, thời gian, cửa sổ đăng ký và điểm đạt. Sau khi khóa có hồ sơ tham gia, không đổi được loại khóa, năm tổ chức, số năm hoạt động và điểm đạt.",
    getInitialValues: () => ({ yearsActive: 0, autoApproveEligible: false, scoreVisible: false, attendanceEnabled: false, autoSendInvitation: false }),
    fields: [
      { name: "courseName", label: "Tên khóa", required: true, section: "Thông tin khóa" },
      {
        name: "courseTypeCode",
        label: "Loại khóa",
        type: "select",
        required: true,
        optionsEndpoint: "/training/course-types",
        optionsEndpointForUser: courseTypesInScope("course"),
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
        helper: "Số năm tối thiểu giữa năm đạt cấp độ tiên quyết và năm tổ chức khóa này. Mặc định 0, không được âm.",
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
        name: "autoApproveEligible",
        label: "Tự động duyệt hồ sơ hợp lệ",
        type: "switch",
        switchLabels: ["Bật: hệ thống tự duyệt hồ sơ hợp lệ", "Tắt: hồ sơ chờ duyệt thủ công"],
        helper: "Chỉ khi bật, hệ thống mới tự duyệt các hồ sơ đủ điều kiện sau khi gửi danh sách. Hồ sơ ngoại lệ luôn phải duyệt thủ công.",
        section: "Duyệt và hiển thị",
      },
      {
        name: "scoreVisible",
        label: "Hiển thị điểm của khóa",
        type: "switch",
        switchLabels: ["Bật: hiển thị điểm trong chứng nhận và kết quả", "Tắt: chỉ cấp sở hữu khóa hoặc cấp cao hơn xem điểm"],
        helper: "Cấp sở hữu khóa và cấp cao hơn luôn xem được điểm. Bật để các cấp còn lại (giáo xứ, huynh trưởng) cũng thấy điểm trong chứng nhận và tab kết quả của hồ sơ huynh trưởng.",
        section: "Duyệt và hiển thị",
      },
      {
        name: "attendanceEnabled",
        label: "Bật điểm danh bằng mã QR",
        type: "switch",
        switchLabels: ["Bật: hồ sơ trong danh sách tham dự có mã QR để quét điểm danh", "Tắt: không điểm danh bằng mã QR"],
        helper: "Khi bật, mỗi hồ sơ trong danh sách tham dự có mã QR riêng (in trên thẻ hoặc gửi trong email) để quét điểm danh ở tab Thẻ & điểm danh. Phải bật mới gửi được mã QR trong email.",
        section: "Điểm danh và thẻ tham dự",
      },
      {
        name: "autoSendInvitation",
        label: "Tự gửi email thông tin tham dự khi duyệt",
        type: "switch",
        switchLabels: ["Bật: hồ sơ được duyệt sẽ nhận email thông tin tham dự", "Tắt: chỉ gửi email thủ công"],
        helper: "Email gồm tên thánh, họ tên, giáo xứ, giáo hạt, giáo phận, tên khóa, thời gian tổ chức; kèm mã QR điểm danh nếu khóa bật điểm danh. Hồ sơ không có email hoặc email lỗi được ghi chú ở tab Thẻ & điểm danh, các hồ sơ còn lại vẫn được gửi. Hồ sơ đã gửi không bị gửi lại.",
        section: "Điểm danh và thẻ tham dự",
      },
      {
        name: "targetDeaneryIds",
        label: "Khóa dành cho giáo hạt",
        type: "multiselect",
        searchable: true,
        placeholder: "Chọn các giáo hạt mà khóa này (một đợt) dành cho",
        optionsEndpoint: "/deaneries",
        optionValue: "id",
        optionLabel: "name",
        // Chỉ khóa giáo phận: giáo hạt không chọn được (giáo hạt khác gửi hồ sơ sang khóa giáo hạt qua màn Gửi liên giáo hạt).
        visibleWhen: (values) => values.managementUnitType !== "DEANERY" && managedUnitTypes(useAuthStore.getState().user, "course").includes("DIOCESE"),
        helper: "Bỏ trống nếu khóa mở cho tất cả giáo hạt. Giáo xứ thuộc giáo hạt khác vẫn đăng ký được nhưng phải kèm lí do riêng cho từng hồ sơ và hồ sơ được duyệt thủ công.",
        section: "Đợt của khóa",
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
      // Khóa giáo phận: gửi cả danh sách rỗng khi sửa để bỏ chọn toàn bộ giáo hạt; khóa giáo hạt / chưa chọn thì không gửi.
      if (Array.isArray(values.targetDeaneryIds)) payload.targetDeaneryIds = values.targetDeaneryIds;
      return payload;
    },
  },
  ...(["create", "edit"] as const).map(
    (actionType): ResourceFormSpec => ({
      kind: "courses",
      moduleName: "training.course.past",
      actionType,
      createTitle: "Tạo khóa huấn luyện quá khứ",
      editTitle: "Chỉnh sửa khóa huấn luyện quá khứ",
      description:
        "Lưu lại khóa đã tổ chức trong quá khứ: chỉ cần tên khóa và năm tổ chức, không cần loại khóa hay thời gian đăng ký. Sau khi tạo, import danh sách tham dự (kèm điểm và kết quả) từ Excel ở chi tiết khóa.",
      getInitialValues: () => ({ passingScore: 0 }),
      buildEndpoint: (_values, id) => (id ? `/training/courses/past/${encodeURIComponent(id)}` : "/training/courses/past"),
      fields: pastCourseFields,
      mapSubmit: (values) => compactPayload(values),
    }),
  ),
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
        optionsEndpointForUser: courseTypesInScope("score_component"),
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
