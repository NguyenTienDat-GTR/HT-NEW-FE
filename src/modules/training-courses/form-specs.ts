import { DEFAULT_SCORE_COMPONENT, maxFinalScore, scoreComponentRows, scoreComponentsPayload } from "@/components/form/resource-form/score-components-field";
import { compactPayload, unitTypeSelectOptions, type ResourceFormSpec } from "@/components/form/resource-form/types";
import type { AuthUser } from "@/lib/auth/auth-store";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermission, hasPermissionPrefix } from "@/lib/auth/permissions";
import { leaderLevelSelect } from "@/modules/organizations/form-specs";
import { withFilters } from "@/lib/api/filters";
import { resolveOrganizingState } from "./registration-state";

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

// Dropdown loại khóa khi tạo/sửa khóa chỉ liệt kê loại đang hoạt động (BE từ chối loại đã tắt).
const ACTIVE_COURSE_TYPES = "/training/course-types?status=true";

// Endpoint danh sách loại khóa chỉ gồm các loại thuộc cấp quản lý của tài khoản (không lẫn loại khóa của cấp khác).
function courseTypesInScope(resource: ManagedResource) {
  return (user: AuthUser | null) => {
    const types = managedUnitTypes(user, resource);
    if (types.length !== 1) return undefined;
    return withFilters(ACTIVE_COURSE_TYPES, { managementUnitType: types[0] });
  };
}

// Khóa cấp giáo phận (đang sửa, BE trả managementUnitType = DIOCESE) chỉ dùng loại khóa cấp giáo phận; khóa cấp khác thì giữ theo phạm vi tài khoản.
export function courseTypesForDioceseCourse(values: Record<string, unknown>) {
  return values.managementUnitType === "DIOCESE" ? withFilters(ACTIVE_COURSE_TYPES, { managementUnitType: "DIOCESE" }) : undefined;
}

// Khóa đã có hồ sơ tham gia (BE trả hasParticipations ở chi tiết khóa) thì khóa các trường này khi sửa.
const lockedByParticipations = (values: Record<string, unknown>, mode: string) => mode === "edit" && values.hasParticipations === true;

// Khóa có mở đăng ký (mặc định mở): chỉ khi mở mới nhập thời gian đăng ký.
const registrationEnabled = (values: Record<string, unknown>) => values.registrationEnabled !== false;

// Thời gian đăng ký (khi mở đăng ký) không được sau ngày bắt đầu của khóa: khóa tới ngày bắt đầu thì đăng ký tự đóng.
export function registrationNotAfterStart(value: unknown, values: Record<string, unknown>) {
  if (values.registrationEnabled === false || typeof value !== "string" || !value || typeof values.startDate !== "string" || !values.startDate) return undefined;
  return value.slice(0, 10) > values.startDate ? "Thời gian đăng ký không được sau ngày bắt đầu khóa" : undefined;
}

const HOST_YEAR_MIN = 1900;
const HOST_YEAR_MAX = 2200;

// Năm của ngày bắt đầu (yyyy-mm-dd) làm năm tổ chức mặc định; chưa chọn ngày thì chưa có mặc định.
export function hostYearFromStartDate(startDate: unknown): number | undefined {
  if (typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(startDate)) return undefined;
  return Number(startDate.slice(0, 4));
}

// Năm tổ chức phải là số nguyên trong khoảng BE chấp nhận; để trống thì để quy tắc bắt buộc xử lý.
export function hostYearRangeError(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < HOST_YEAR_MIN || year > HOST_YEAR_MAX) {
    return `Năm tổ chức phải là số nguyên từ ${HOST_YEAR_MIN} đến ${HOST_YEAR_MAX}`;
  }
  return undefined;
}

// Sao chép danh sách tham dự từ khóa nguồn cần quyền duyệt đăng ký; khóa đã kết thúc hoặc ngừng hoạt động thì không sao chép được.
const canCopyParticipants = (values: Record<string, unknown>, mode: string, user?: AuthUser | null) =>
  hasPermissionPrefix(user ?? useAuthStore.getState().user, "training.participation.approve.") &&
  (mode === "edit" ? resolveOrganizingState(values) === "UPCOMING" && values.status !== false : Boolean(values.courseTypeCode));

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
  {
    name: "scoreVisible",
    label: "Hiển thị điểm của khóa",
    type: "switch",
    switchLabels: ["Bật: hiển thị điểm trong chứng nhận và kết quả", "Tắt: chỉ cấp sở hữu khóa hoặc cấp cao hơn xem điểm"],
    helper: "Cấp sở hữu khóa và cấp cao hơn luôn xem được điểm. Bật để các cấp còn lại (giáo xứ, huynh trưởng) cũng thấy điểm trong chứng nhận và tab kết quả của hồ sơ huynh trưởng.",
    section: "Cấu hình chấm điểm",
  },
  { name: "additionalNotes", label: "Ghi chú", type: "textarea", section: "Thông tin bổ sung" },
];

export const trainingFormSpecs: ResourceFormSpec[] = [
  {
    kind: "course-types",
    createTitle: "Thêm loại khóa",
    editTitle: "Chỉnh sửa loại khóa",
    description: "Loại khóa huấn luyện: cấp quản lý, điều kiện tham dự, khóa tiên quyết, chứng nhận và thăng cấp khi hoàn thành.",
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
        name: "prerequisiteTypeCode",
        label: "Khóa tiên quyết",
        type: "prerequisite-type",
        wide: true,
        helper:
          "Huynh trưởng phải hoàn thành một khóa thuộc loại được chọn: loại khóa có cấp chứng nhận thì tính theo chứng nhận được duyệt (chờ duyệt, bị từ chối hoặc đã thu hồi đều chưa tính), loại khóa không cấp chứng nhận thì tính theo kết quả khóa (đạt). Loại khóa cấp giáo phận chọn được khóa tiên quyết cấp giáo phận hoặc loại cấp giáo hạt do giáo phận tạo (dùng chung, học ở giáo hạt nào cũng được tính); loại giáo hạt tự tạo không chọn được. Loại khóa cấp giáo hạt chỉ chọn loại cấp giáo hạt do giáo phận tạo hoặc do chính giáo hạt đó tạo. Năm đạt tính theo năm duyệt chứng nhận, khóa không cấp chứng nhận thì theo năm tổ chức.",
        twoColumnSection: true,
        section: "Điều kiện tham dự",
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
        section: "Điều kiện tham dự",
      },
      {
        name: "requiredCurrentLevel",
        label: "Cấp độ yêu cầu",
        type: "select",
        ...leaderLevelSelect,
        helper:
          "Huynh trưởng phải đang ở đúng cấp độ này mới đủ điều kiện tham dự. Khóa dành cho huynh trưởng chưa có cấp độ thì chọn \"Chưa có cấp\".",
        section: "Điều kiện tham dự",
      },
      {
        name: "requiredMinAge",
        label: "Tuổi tối thiểu",
        type: "number",
        min: 0,
        helper:
          "Không bắt buộc. Không yêu cầu tuổi thì để trống hoặc nhập 0; khi sửa, nhập 0 để bỏ tuổi tối thiểu đã lưu. Có yêu cầu tuổi thì huynh trưởng chưa có ngày sinh không đủ điều kiện.",
        section: "Điều kiện tham dự",
      },
      {
        name: "hasCertificate",
        label: "Khóa có cấp chứng nhận",
        type: "switch",
        switchLabels: ["Có cấp chứng nhận", "Không cấp chứng nhận"],
        // Loại khóa đã bật cấp chứng nhận (đã có thể có chứng nhận) thì không tắt lại được.
        readOnlyWhen: (values, mode) => mode === "edit" && values.certificateLocked === true,
        helper: "Chỉ quyết định khóa có cấp chứng nhận hay không. Bật để nhập mã viết tắt chứng chỉ và chọn cấu hình chứng nhận. Việc thăng cấp được cài riêng ở mục \"Thăng cấp khi hoàn thành\".",
        section: "Chứng nhận",
      },
      {
        name: "certificateShortCode",
        label: "Mã viết tắt chứng chỉ",
        visibleWhen: (values) => values.hasCertificate === true,
        requiredWhen: (values) => values.hasCertificate === true,
        helper: "Dùng để sinh mã chứng chỉ, ví dụ HTI.",
        section: "Chứng nhận",
      },
      {
        name: "resultingLevel",
        label: "Cấp độ khi hoàn thành",
        type: "select",
        ...leaderLevelSelect,
        // Bỏ trống là một lựa chọn có nghĩa: khi sửa, chọn lại mục này để xóa cấp độ đã lưu (mapSubmit gửi clearResultingLevel).
        emptyOptionLabel: "Bỏ trống (không thăng cấp)",
        helper:
          "Không bắt buộc. Chọn \"Bỏ trống (không thăng cấp)\" nếu hoàn thành khóa không thăng cấp; khi sửa, ô này hiện cấp độ đã lưu, chọn lại \"Bỏ trống (không thăng cấp)\" rồi lưu để xóa cấp độ đó. Thăng cấp dựa vào: nếu khóa bật cấp chứng nhận thì theo chứng nhận (chứng nhận được duyệt mới thăng cấp, kể cả khi kết quả khóa không đạt; kết quả khóa đạt mà chứng nhận bị từ chối hoặc còn chờ xử lý khi kết thúc khóa thì không thăng cấp); nếu không cấp chứng nhận thì theo kết quả khóa (đạt thì thăng cấp khi kết thúc khóa). Cấp hiện tại chỉ tăng nếu cấp mới cao hơn.",
        dynamicHelper: {
          compute: (values) => ({
            text:
              values.hasCertificate === true
                ? "Khóa có cấp chứng nhận: thăng cấp dựa vào chứng nhận được duyệt."
                : "Khóa không cấp chứng nhận: thăng cấp dựa vào kết quả khóa (đạt).",
          }),
        },
        section: "Thăng cấp khi hoàn thành",
      },
    ],
    // Cờ bỏ khóa tiên quyết do ô chọn khóa tiên quyết đặt (không có trường hiển thị riêng).
    extraValueNames: ["clearPrerequisite"],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.typeCode;
      // Bỏ trống cấp độ khi hoàn thành lúc sửa: giá trị rỗng bị compactPayload bỏ đi nên phải gửi cờ xóa, nếu không BE giữ cấp độ cũ.
      const resultingLevel = values.resultingLevel;
      if (mode === "edit" && (resultingLevel === undefined || resultingLevel === null || resultingLevel === "")) {
        payload.clearResultingLevel = true;
      }
      // Bỏ khóa tiên quyết khi sửa: gửi cờ xóa, đồng thời đặt thời hạn sau khóa tiên quyết về không giới hạn.
      const clearPrerequisite = payload.clearPrerequisite === true && !payload.prerequisiteTypeCode;
      delete payload.clearPrerequisite;
      if (mode === "edit" && clearPrerequisite) {
        payload.clearPrerequisite = true;
        payload.clearMaxYearsAfterPrerequisite = true;
        delete payload.maxYearsAfterPrerequisite;
      }
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
    description: "Khóa huấn luyện, thời gian, cửa sổ đăng ký và điểm đạt. Sau khi khóa có hồ sơ tham gia, không đổi được loại khóa, năm tổ chức, số năm hoạt động và điểm đạt.",
    getInitialValues: () => ({ scoreComponents: [{ ...DEFAULT_SCORE_COMPONENT }], yearsActive: 0, registrationEnabled: true, copyMode: "ALL", autoApproveEligible: false, scoreVisible: false, attendanceEnabled: false, autoSendInvitation: false, openToOtherDeaneries: false }),
    fields: [
      { name: "courseName", label: "Tên khóa", required: true, section: "Thông tin khóa" },
      {
        name: "courseTypeCode",
        label: "Loại khóa",
        type: "select",
        required: true,
        optionsEndpoint: ACTIVE_COURSE_TYPES,
        optionsEndpointForUser: courseTypesInScope("course"),
        // Sửa khóa cấp giáo phận: chỉ chọn loại khóa cấp giáo phận, không chọn loại do giáo phận tạo nhưng thuộc cấp quản lý giáo hạt.
        buildOptionsEndpoint: courseTypesForDioceseCourse,
        optionValue: "typeCode",
        optionLabel: "typeName",
        readOnlyWhen: lockedByParticipations,
        section: "Thông tin khóa",
      },
      {
        name: "yearsActive",
        label: "Số năm hoạt động",
        type: "number",
        min: 0,
        readOnlyWhen: lockedByParticipations,
        helper: "Số năm tính từ lúc huynh trưởng đạt cấp độ yêu cầu (hoặc đạt khóa tiên quyết) đến năm tổ chức khóa, làm tròn theo năm. Ví dụ khóa 2026 yêu cầu 2 năm: đạt từ 2024 trở về trước. Mặc định 0 (không yêu cầu).",
        section: "Thông tin khóa",
      },
      { name: "location", label: "Địa điểm", section: "Thông tin khóa" },
      { name: "startDate", label: "Ngày bắt đầu", type: "date", required: true, section: "Thời gian tổ chức" },
      { name: "endDate", label: "Ngày kết thúc", type: "date", required: true, section: "Thời gian tổ chức" },
      {
        name: "hostYear",
        label: "Năm tổ chức",
        type: "number",
        // Bắt buộc khi tạo khóa (mã chứng nhận sinh từ năm tổ chức); khóa cũ chưa có năm vẫn sửa được mà không bị ép nhập.
        requiredWhen: (_values, mode) => mode === "create",
        min: HOST_YEAR_MIN,
        // Mặc định là năm của ngày bắt đầu; người dùng sửa tay thì giữ giá trị đã nhập.
        defaultFromValues: (values) => hostYearFromStartDate(values.startDate),
        validate: hostYearRangeError,
        readOnlyWhen: lockedByParticipations,
        helper: "Dùng để sinh mã chứng nhận. Mặc định là năm của ngày bắt đầu, có thể đổi nếu khác năm. Khóa đã có hồ sơ tham gia thì không đổi được.",
        section: "Thời gian tổ chức",
      },
      {
        name: "registrationEnabled",
        label: "Mở đăng ký",
        type: "switch",
        switchLabels: ["Bật: khóa nhận đăng ký", "Tắt: khóa không nhận đăng ký"],
        helper: "Bật: khóa nhận đăng ký, bạn nhập thời gian mở và đóng đăng ký; chỉ trong khoảng đó các tài khoản có quyền đăng ký (giáo xứ...) mới gửi được hồ sơ. Tắt: khóa không nhận đăng ký, không cần nhập thời gian và không tài khoản nào đăng ký được (hợp với khóa chỉ nhập danh sách tham dự trực tiếp bằng Excel hoặc sao chép từ khóa khác). Muốn nhận đăng ký sau này, sửa khóa và bật lại công tắc.",
        section: "Thời gian đăng ký",
      },
      {
        name: "registrationStartAt",
        label: "Mở đăng ký",
        type: "datetime",
        visibleWhen: registrationEnabled,
        requiredWhen: registrationEnabled,
        validate: registrationNotAfterStart,
        section: "Thời gian đăng ký",
      },
      {
        name: "registrationEndAt",
        label: "Đóng đăng ký",
        type: "datetime",
        visibleWhen: registrationEnabled,
        requiredWhen: registrationEnabled,
        validate: registrationNotAfterStart,
        section: "Thời gian đăng ký",
      },
      {
        name: "passingScore",
        label: "Điểm đạt",
        type: "number",
        required: true,
        readOnlyWhen: lockedByParticipations,
        helper: "Điểm tổng kết (trung bình có hệ số) tối thiểu để đạt khóa.",
        dynamicHelper: {
          compute: (values) => {
            const limit = maxFinalScore(scoreComponentRows(values.scoreComponents));
            if (limit === null) return { text: "Chưa có thành phần điểm nào được tính vào điểm tổng kết nên chưa giới hạn điểm đạt." };
            const passing = Number(values.passingScore);
            const invalid = Number.isFinite(passing) && values.passingScore !== "" && passing > limit;
            return {
              text: `Điểm đạt không được lớn hơn ${limit} (điểm tối đa trung bình có hệ số của các thành phần điểm của khóa).`,
              invalid,
            };
          },
        },
        section: "Cấu hình chấm điểm",
      },
      {
        name: "scoreComponents",
        label: "Thành phần điểm của khóa",
        type: "score-components",
        helper: "Khai báo các thành phần điểm riêng của khóa này: tên, điểm tối đa, hệ số và có tính vào điểm tổng kết hay không. Điểm tổng kết = Σ(điểm × hệ số) / Σ hệ số của các thành phần được tính. Khóa đã có điểm nhập thì chỉ đổi được tên và thứ tự.",
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
        name: "openToOtherDeaneries",
        label: "Mở đăng ký cho các giáo hạt khác",
        type: "switch",
        switchLabels: ["Bật: gửi thông báo cho các giáo hạt khác trong giáo phận để họ quyết định", "Tắt: chỉ giáo hạt tổ chức đăng ký"],
        // Chỉ khóa giáo hạt: admin giáo hạt khác nhận thông báo và quyết định có cho giáo xứ của mình gửi hồ sơ sang khóa này hay không.
        visibleWhen: (values) => values.managementUnitType !== "DIOCESE" && managedUnitTypes(useAuthStore.getState().user, "course").includes("DEANERY"),
        helper: "Khi bật, admin các giáo hạt khác nhận thông báo kèm thông tin khóa. Chỉ giáo xứ của giáo hạt được cho phép mới gửi được hồ sơ liên giáo hạt (giáo hạt nhà vẫn đồng ý từng yêu cầu, rồi giáo hạt bạn duyệt).",
        section: "Đợt của khóa",
      },
      {
        name: "copySourceCourseCodes",
        label: "Khóa tiên quyết",
        type: "course-copy",
        wide: true,
        visibleWhen: canCopyParticipants,
        helper: "Không bắt buộc. Đưa sẵn huynh trưởng từ các khóa tiên quyết đã kết thúc (khóa thuộc loại tiên quyết của loại khóa đang chọn) vào danh sách tham dự của khóa này khi bấm lưu, không cần đăng ký lại. Mặc định chỉ hiện các khóa tổ chức trong vòng 2 năm tính từ năm tổ chức của khóa này; gõ tên khóa vào ô tìm kiếm để xem khóa khác. Chọn cách sao chép (tất cả hồ sơ hoặc chỉ hồ sơ đạt) hoặc bấm Chọn hồ sơ cụ thể để tích từng huynh trưởng. Hồ sơ vào thẳng danh sách tham dự (đã duyệt); khóa bật “Tự gửi email thông tin tham dự” thì người vừa được sao chép sẽ được gửi email ngay. Huynh trưởng đã có trong khóa hoặc không sao chép được sẽ tự bỏ qua.",
        section: "Sao chép danh sách tham dự",
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
    extraValueNames: ["copyMode", "copyLeaderIds"],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      if (mode === "edit") delete payload.courseCode;
      // Không mở đăng ký: BE bỏ thời gian đăng ký; luôn gửi cờ để tắt / bật lại được khi sửa.
      payload.registrationEnabled = values.registrationEnabled !== false;
      if (payload.registrationEnabled === false) {
        delete payload.registrationStartAt;
        delete payload.registrationEndAt;
      }
      // Sao chép danh sách tham dự chỉ gửi khi có chọn khóa nguồn.
      const copyCodes = Array.isArray(values.copySourceCourseCodes) ? values.copySourceCourseCodes.map(String) : [];
      if (copyCodes.length > 0) {
        payload.copySourceCourseCodes = copyCodes;
        payload.copyMode = values.copyMode === "PASSED_ONLY" ? "PASSED_ONLY" : "ALL";
        // Chọn riêng từng huynh trưởng ở hộp thoại: chỉ các hồ sơ này được sao chép.
        const leaderIds = Array.isArray(values.copyLeaderIds) ? values.copyLeaderIds.map(String) : [];
        if (leaderIds.length > 0) payload.copyLeaderIds = leaderIds;
        else delete payload.copyLeaderIds;
      } else {
        delete payload.copySourceCourseCodes;
        delete payload.copyMode;
        delete payload.copyLeaderIds;
      }
      // Gửi cả danh sách rỗng khi sửa để có thể bỏ chọn toàn bộ người nhận.
      payload.recipientUsernames = Array.isArray(values.recipientUsernames) ? values.recipientUsernames : [];
      // Khóa giáo phận: gửi cả danh sách rỗng khi sửa để bỏ chọn toàn bộ giáo hạt; khóa giáo hạt / chưa chọn thì không gửi.
      if (Array.isArray(values.targetDeaneryIds)) payload.targetDeaneryIds = values.targetDeaneryIds;
      if (Array.isArray(values.scoreComponents)) payload.scoreComponents = scoreComponentsPayload(values.scoreComponents);
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
      getInitialValues: () => ({ passingScore: 0, scoreVisible: false }),
      buildEndpoint: (_values, id) => (id ? `/training/courses/past/${encodeURIComponent(id)}` : "/training/courses/past"),
      fields: pastCourseFields,
      mapSubmit: (values) => compactPayload(values),
    }),
  ),
];
