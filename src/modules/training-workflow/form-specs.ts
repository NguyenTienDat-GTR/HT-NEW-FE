import { registrationEntries } from "@/components/form/resource-form/registration-list-field";
import { compactPayload, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { applyOffTargetReasons, entryDisplayName, missingOffTargetReasons, offTargetEntries, registrationExtras } from "./off-target";

export const workflowFormSpecs: ResourceFormSpec[] = [
  {
    kind: "participations",
    moduleName: "training.registration",
    actionType: "create",
    createTitle: "Đăng ký tham dự khóa",
    description: "Gửi danh sách huynh trưởng đăng ký vào một khóa huấn luyện.",
    buildEndpoint: (values) => `/training/courses/${encodeURIComponent(String(values.courseCode ?? ""))}/registrations`,
    method: "POST",
    fields: [
      {
        name: "courseCode",
        label: "Khóa huấn luyện",
        type: "select",
        required: true,
        // Chỉ các khóa đang mở đăng ký trong phạm vi tài khoản.
        optionsEndpoint: "/training/courses/registrable",
        optionValue: "courseCode",
        optionLabel: "courseName",
        // Mở từ tab "Đăng ký tham dự" của khóa thì luôn là khóa đang chọn và không đổi được; mở trực tiếp (chưa có khóa) vẫn chọn được.
        readOnlyOnCreate: true,
        section: "Khóa",
      },
      {
        name: "leaderIds",
        label: "Danh sách đăng ký",
        type: "registration-list",
        registrationList: { mode: "standard", courseField: "courseCode", otherField: "exceptionLeaders" },
        helper: "Huynh trưởng đủ điều kiện theo loại khóa và số năm hoạt động của khóa.",
        section: "Danh sách đăng ký",
      },
      {
        name: "exceptionLeaders",
        label: "Danh sách ngoại lệ",
        type: "registration-list",
        registrationList: { mode: "exception", courseField: "courseCode", otherField: "leaderIds" },
        helper: "Huynh trưởng chưa đủ điều kiện, mỗi người kèm lí do. Không được trùng với danh sách đăng ký.",
        section: "Ngoại lệ",
      },
    ],
    // Hồ sơ gửi ngoài đợt của khóa giáo phận: hỏi xác nhận và bắt nhập lí do riêng từng hồ sơ trước khi gửi.
    offTarget: {
      collect: (values) => offTargetEntries(registrationEntries(values.leaderIds), registrationEntries(values.exceptionLeaders)),
      apply: (current, reasons) => ({
        leaderIds: applyOffTargetReasons(registrationEntries(current.leaderIds), reasons),
        exceptionLeaders: applyOffTargetReasons(registrationEntries(current.exceptionLeaders), reasons),
      }),
    },
    mapSubmit: (values) => {
      const standard = registrationEntries(values.leaderIds);
      const exceptions = registrationEntries(values.exceptionLeaders);
      const missing = missingOffTargetReasons([...standard, ...exceptions]);
      if (missing.length) {
        throw new Error(`Hồ sơ ngoài đợt cần lí do riêng: ${missing.map(entryDisplayName).join(", ")}`);
      }
      if (!standard.length && !exceptions.length) {
        throw new Error("Cần lập danh sách đăng ký hoặc thêm ít nhất một huynh trưởng ngoại lệ");
      }
      const standardIds = new Set(standard.map((entry) => entry.id));
      if (exceptions.some((entry) => standardIds.has(entry.id))) {
        throw new Error("Danh sách đăng ký và danh sách ngoại lệ không được trùng huynh trưởng");
      }
      const payload: Record<string, unknown> = {};
      if (standard.length) payload.leaderIds = standard.map((entry) => entry.id);
      if (exceptions.length) {
        payload.exceptionReasonsByLeaderId = Object.fromEntries(exceptions.map((entry) => [entry.id, entry.reason ?? ""]));
      }
      const extras = registrationExtras([...standard, ...exceptions]);
      if (Object.keys(extras.offTargetReasonsByLeaderId).length) payload.offTargetReasonsByLeaderId = extras.offTargetReasonsByLeaderId;
      if (Object.keys(extras.notesByLeaderId).length) payload.notesByLeaderId = extras.notesByLeaderId;
      return payload;
    },
  },
  {
    kind: "participations",
    actionType: "score",
    editTitle: "Chấm điểm tham dự",
    description: "Nhập điểm theo thành phần điểm của loại khóa (điểm tổng kết là trung bình có hệ số). Khi backend có score-context, form sẽ dùng dữ liệu thật trong detail panel.",
    buildEndpoint: (_values, id) => `/training/participations/${encodeURIComponent(String(id ?? ""))}/score`,
    method: "PATCH",
    fields: [
      {
        name: "componentScoresText",
        label: "Điểm thành phần",
        type: "textarea",
        required: true,
        helper: "Mỗi dòng: componentCode | score",
        section: "Chấm điểm",
      },
      { name: "review", label: "Ghi chú", type: "textarea", clearable: true, section: "Chấm điểm" },
    ],
    mapSubmit: (values) => {
      const componentScores = String(values.componentScoresText ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [componentCode, score] = line.split("|").map((part) => part.trim());
          return { componentCode, score: Number(score) };
        })
        .filter((item) => item.componentCode && Number.isFinite(item.score));
      return compactPayload({ componentScores, review: values.review });
    },
  },
];
