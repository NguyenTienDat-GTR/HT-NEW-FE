import { compactPayload, type ResourceFormSpec } from "../types";

export const workflowFormSpecs: ResourceFormSpec[] = [
  {
    kind: "participations",
    moduleName: "training.registration",
    actionType: "create",
    createTitle: "Đăng ký tham dự khóa",
    description: "Gửi batch đăng ký huynh trưởng vào một khóa huấn luyện.",
    buildEndpoint: (values) => `/training/courses/${encodeURIComponent(String(values.courseCode ?? ""))}/registrations`,
    method: "POST",
    fields: [
      {
        name: "courseCode",
        label: "Khóa huấn luyện",
        type: "select",
        required: true,
        optionsEndpoint: "/training/courses",
        optionValue: "courseCode",
        optionLabel: "courseName",
        section: "Khóa",
      },
      {
        name: "leaderIds",
        label: "Huynh trưởng đăng ký",
        type: "multiselect",
        required: true,
        optionsEndpoint: "/leaders",
        optionValue: "id",
        optionLabel: "fullName",
        section: "Danh sách đăng ký",
      },
      {
        name: "recipientUsernames",
        label: "Tài khoản nhận thông báo",
        type: "multiselect",
        optionsEndpoint: "/system/accounts",
        optionValue: "username",
        optionLabel: "username",
        section: "Thông báo",
      },
      { name: "exceptionReasonsText", label: "Lý do ngoại lệ", type: "textarea", helper: "Mỗi dòng: leaderId | lý do", section: "Ngoại lệ" },
    ],
    mapSubmit: (values) => {
      const payload = compactPayload(values);
      delete payload.courseCode;
      const reasons: Record<string, string> = {};
      String(values.exceptionReasonsText ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const [leaderId, ...reasonParts] = line.split("|");
          const reason = reasonParts.join("|").trim();
          if (leaderId?.trim() && reason) reasons[leaderId.trim()] = reason;
        });
      delete payload.exceptionReasonsText;
      if (Object.keys(reasons).length) payload.exceptionReasonsByLeaderId = reasons;
      return payload;
    },
  },
  {
    kind: "participations",
    actionType: "score",
    editTitle: "Chấm điểm tham dự",
    description: "Nhập điểm theo component của công thức khóa. Khi backend có score-context, form sẽ dùng dữ liệu thật trong detail panel.",
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
      { name: "review", label: "Nhận xét", type: "textarea", clearable: true, section: "Chấm điểm" },
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
