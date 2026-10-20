import { ChartBar, ClipboardText } from "@phosphor-icons/react";
import { deaneryUnitFilter, parishUnitFilter, route, type RouteFilterConfig, type RouteGroup } from "../route-config";

// Chỉ giữ các trạng thái còn phát sinh ở hai màn đăng ký và duyệt đăng ký.
// Tìm kiếm chung: họ tên huynh trưởng (họ + tên), tên thánh, giáo xứ, giáo hạt.
const participationSearchFields = ["leader.lastName+leader.firstName", "leader.holyName", "leader.parish.name", "leader.parish.deanery.name"];

// Giáo hạt/giáo xứ của huynh trưởng (danh sách tùy chọn đã giới hạn theo phạm vi tài khoản).
const unitFilters: RouteFilterConfig[] = [
  deaneryUnitFilter("leader.parish.deanery.id"),
  parishUnitFilter("leader.parish.id", "leader.parish.deanery.id"),
];

const registrationFilters: RouteFilterConfig[] = [
  { key: "course.courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" },
  {
    key: "participationStatus",
    label: "Trạng thái đăng ký",
    type: "select",
    options: [
      { value: "REGISTERED", label: "Đã đăng ký" },
      { value: "ATTENDED", label: "Đã tham dự" },
      { value: "REJECTED", label: "Từ chối" },
    ],
  },
  ...unitFilters,
];

const approvalFilters: RouteFilterConfig[] = [
  { key: "course.courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" },
  {
    key: "approvalStatus",
    label: "Trạng thái duyệt",
    type: "select",
    options: [
      { value: "PENDING", label: "Chờ xử lý" },
      { value: "APPROVED", label: "Đã duyệt" },
      { value: "REJECTED", label: "Từ chối" },
    ],
  },
  ...unitFilters,
];

// Danh sách tham dự chỉ có hồ sơ đã duyệt: trạng thái tham dự là Đã tham dự/Hoàn thành.
const participantFilters: RouteFilterConfig[] = [
  { key: "course.courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" },
  {
    key: "participationStatus",
    label: "Trạng thái tham dự",
    type: "select",
    options: [
      { value: "ATTENDED", label: "Đã tham dự" },
      { value: "COMPLETED", label: "Hoàn thành" },
    ],
  },
  ...unitFilters,
];

const scoreFilters: RouteFilterConfig[] = [
  { key: "course.courseCode", label: "Khóa", type: "text", placeholder: "Lọc theo mã khóa" },
  ...unitFilters,
];

export const trainingWorkflowRouteGroup: RouteGroup = {
    moduleName: "training-workflow",
    label: "Quy trình huấn luyện",
    icon: ClipboardText,
    children: [
      route({
        path: "/training/registrations",
        createPath: "/training/registrations/new",
        moduleName: "training.registration",
        title: "Đăng ký tham dự",
        subtitle: "Chọn huynh trưởng, kiểm điều kiện và gửi batch đăng ký.",
        endpoint: "/training/participations",
        idField: "id",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "eligible", "exceptionReason", "participationStatus", "status"],
        searchFields: participationSearchFields,
        permissionPrefixes: ["training.participation.read.parish", "training.participation.submit."],
        actionPermissionPrefixes: ["training.participation.submit."],
        // Thu hồi đăng ký: người gửi (tài khoản có quyền gửi) được thu hồi hồ sơ của mình khi hồ sơ chưa được duyệt hoặc từ chối.
        actions: { withdraw: { label: "Thu hồi", permissionPrefixes: ["training.participation.submit."] } },
        primaryActionLabel: "Gửi đăng ký",
        filters: registrationFilters,
        filterLabels: ["Khóa", "Trạng thái đăng ký"],
        workflowHint: "Giáo xứ gửi cho khóa giáo phận/giáo hạt trong phạm vi; giáo phận chỉ gửi khóa giáo phận, giáo hạt chỉ gửi khóa giáo hạt. Hồ sơ không đủ điều kiện phải nhập lí do ngoại lệ.",
      }),
      route({
        path: "/training/approvals",
        moduleName: "training.approval",
        title: "Duyệt đăng ký",
        subtitle: "Duyệt hoặc từ chối hồ sơ theo đúng cấp workflow.",
        endpoint: "/training/participations",
        idField: "id",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "approvalStatus", "review", "status"],
        searchFields: participationSearchFields,
        permissionPrefixes: ["training.participation.approve.deanery", "training.participation.approve.diocese"],
        actionPermissionPrefixes: ["training.participation.approve."],
        primaryActionLabel: "Duyệt hồ sơ",
        filters: approvalFilters,
        filterLabels: ["Khóa", "Trạng thái duyệt"],
      }),
      route({
        path: "/training/participations",
        moduleName: "training.participation",
        title: "Danh sách tham dự",
        subtitle: "Theo dõi đăng ký, duyệt, chấm điểm và chứng nhận.",
        endpoint: "/training/participants",
        idField: "id",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "participationStatus", "totalScore", "passed"],
        searchFields: participationSearchFields,
        permissionPrefixes: [
          "training.participation.read.deanery",
          "training.participation.read.diocese",
          "training.participation.approve.deanery",
          "training.participation.approve.diocese",
        ],
        actionPermissionPrefixes: ["training.participation.approve.", "training.participation.score."],
        primaryActionLabel: "Xử lý hồ sơ",
        filters: participantFilters,
        // Người có quyền duyệt được xóa hồ sơ khỏi danh sách tham dự (trừ hồ sơ đã có chứng nhận).
        actions: { remove: { label: "Xóa khỏi danh sách", permissionPrefixes: ["training.participation.approve."] } },
        filterLabels: ["Khóa", "Trạng thái tham dự"],
        workflowHint: "Score form khóa khi certificateApprovalStatus là APPROVED.",
      }),
      route({
        path: "/training/scores",
        moduleName: "training.score",
        title: "Chấm điểm",
        subtitle: "Nhập điểm theo thành phần điểm của loại khóa.",
        endpoint: "/training/participants",
        idField: "id",
        kind: "participations",
        icon: ChartBar,
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "totalScore", "passed"],
        searchFields: participationSearchFields,
        permissionPrefixes: ["training.participation.score.deanery", "training.participation.score.diocese"],
        actionPermissionPrefixes: ["training.participation.score."],
        filters: scoreFilters,
        actions: {
          score: {
            label: "Chấm điểm",
            permissionPrefixes: ["training.participation.score."],
            route: "/training/participations/:id/score",
          },
        },
        primaryActionLabel: "Chấm điểm",
        filterLabels: ["Khóa", "Kết quả", "Chứng nhận"],
        workflowHint: "Request score phải gửi đúng và đủ component của formula, không vượt maxScore.",
      }),
    ],
  };
