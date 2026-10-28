import { Certificate, ChartBar, ClipboardText } from "@phosphor-icons/react";
import { deaneryUnitFilter, parishUnitFilter, route, type RouteFilterConfig, type RouteGroup } from "../route-config";

// Chỉ giữ các trạng thái còn phát sinh ở hai màn đăng ký và duyệt đăng ký.
// Tìm kiếm chung: họ tên huynh trưởng (họ + tên), tên thánh, giáo xứ, giáo hạt.
const participationSearchFields = ["leader.lastName+leader.firstName", "leader.holyName", "leader.parish.name", "leader.parish.deanery.name"];

// Giáo hạt/giáo xứ của huynh trưởng (danh sách tùy chọn đã giới hạn theo phạm vi tài khoản).
const unitFilters: RouteFilterConfig[] = [
  deaneryUnitFilter("leader.parish.deanery.id"),
  parishUnitFilter("leader.parish.id", "leader.parish.deanery.id"),
];

// Chọn khóa theo tên (giá trị là mã khóa) trong phạm vi tài khoản; ở tab trong chi tiết khóa bộ lọc này được ẩn vì đã cố định theo khóa.
const courseFilter: RouteFilterConfig = {
  key: "course.courseCode",
  label: "Khóa huấn luyện",
  type: "select",
  optionsEndpoint: "/training/courses",
  optionValue: "courseCode",
  optionLabel: "courseName",
};

const registrationFilters: RouteFilterConfig[] = [
  courseFilter,
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
  courseFilter,
  {
    key: "approvalStatus",
    label: "Trạng thái duyệt",
    type: "select",
    options: [
      { value: "PENDING", label: "Chờ xử lý" },
      { value: "REJECTED", label: "Từ chối" },
    ],
  },
  {
    key: "eligible",
    label: "Điều kiện",
    type: "boolean",
    options: [
      { value: "true", label: "Đủ điều kiện" },
      { value: "false", label: "Ngoại lệ" },
    ],
  },
  ...unitFilters,
];

// Danh sách tham dự chỉ có hồ sơ đã duyệt: trạng thái tham dự là Đã tham dự/Hoàn thành.
const participantFilters: RouteFilterConfig[] = [
  courseFilter,
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

// Chia đội: như danh sách tham dự, thêm bộ lọc theo đội (danh sách đội của khóa lấy từ API, :courseCode được thay bằng khóa đang xem).
const teamFilters: RouteFilterConfig[] = [
  ...participantFilters,
  {
    key: "teamName",
    label: "Đội",
    type: "select",
    optionsEndpoint: "/training/courses/:courseCode/teams/options",
    optionValue: "teamName",
    optionLabel: "teamName",
  },
];

// Kết quả theo điểm: Đạt khi điểm tổng kết từ điểm đạt của khóa trở lên, còn lại (kể cả chưa chấm) là Không đạt.
const scoreFilters: RouteFilterConfig[] = [
  courseFilter,
  {
    key: "result",
    label: "Kết quả",
    type: "select",
    options: [
      { value: "COMPLETED", label: "Đạt" },
      { value: "UNCOMPLETED", label: "Không đạt" },
    ],
  },
  ...unitFilters,
];

const certificateApprovalFilters: RouteFilterConfig[] = [
  courseFilter,
  {
    key: "approvalStatus",
    label: "Trạng thái",
    type: "select",
    options: [
      { value: "PENDING", label: "Chờ duyệt" },
      { value: "APPROVED", label: "Đã duyệt" },
      { value: "REJECTED", label: "Từ chối" },
    ],
  },
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
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "eligible", "exceptionReason", "registrationNote", "participationStatus", "status"],
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", parishName: "leader.parish.name", deaneryName: "leader.parish.deanery.name", courseName: "course.courseName", passed: "totalScore" },
        searchFields: participationSearchFields,
        permissionPrefixes: ["training.participation.read.parish", "training.participation.submit."],
        actionPermissionPrefixes: ["training.participation.submit."],
        // Thu hồi đăng ký: người gửi (tài khoản có quyền gửi) được thu hồi hồ sơ của mình khi hồ sơ chưa được duyệt hoặc từ chối.
        actions: { withdraw: { label: "Thu hồi", permissionPrefixes: ["training.participation.submit."] } },
        primaryActionLabel: "Gửi đăng ký",
        filters: registrationFilters,
        filterLabels: ["Khóa huấn luyện", "Trạng thái đăng ký"],
        workflowHint: "Giáo xứ gửi cho khóa giáo phận/giáo hạt trong phạm vi; giáo phận chỉ gửi khóa giáo phận, giáo hạt chỉ gửi khóa giáo hạt. Hồ sơ không đủ điều kiện phải nhập lí do ngoại lệ.",
      }),
      route({
        path: "/training/cross-deanery",
        moduleName: "training.cross-deanery",
        title: "Gửi liên giáo hạt",
        subtitle: "Gửi huynh trưởng sang khóa giáo hạt của giáo hạt khác (cùng giáo phận); giáo hạt nhà đồng ý trước khi giáo hạt tổ chức khóa duyệt.",
        endpoint: "/training/cross-deanery/requests",
        idField: "id",
        kind: "cross-deanery",
        icon: ClipboardText,
        columns: [],
        permissionPrefixes: ["training.participation.submit.parish", "training.participation.submit.deanery", "training.participation.cross_approve."],
        actionPermissionPrefixes: ["training.participation.submit.", "training.participation.cross_approve."],
      }),
      route({
        path: "/training/approvals",
        moduleName: "training.approval",
        title: "Duyệt đăng ký",
        subtitle: "Duyệt, từ chối hoặc duyệt lại hồ sơ bị từ chối theo đúng cấp workflow.",
        endpoint: "/training/participations",
        idField: "id",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "approvalStatus", "registrationNote", "review", "status"],
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", parishName: "leader.parish.name", deaneryName: "leader.parish.deanery.name", courseName: "course.courseName", passed: "totalScore" },
        searchFields: participationSearchFields,
        permissionPrefixes: ["training.participation.approve.deanery", "training.participation.approve.diocese"],
        actionPermissionPrefixes: ["training.participation.approve."],
        primaryActionLabel: "Duyệt hồ sơ",
        filters: approvalFilters,
        // Hồ sơ đã duyệt đăng ký chuyển sang danh sách tham dự: danh sách này chỉ giữ hồ sơ chờ duyệt và bị từ chối.
        baseFilters: { approvalStatus: ["PENDING", "SUBMITTED", "REJECTED"] },
        filterLabels: ["Khóa huấn luyện", "Trạng thái duyệt", "Điều kiện"],
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
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "participationStatus", "totalScore", "passed", "finalResult", "registrationNote"],
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", parishName: "leader.parish.name", deaneryName: "leader.parish.deanery.name", courseName: "course.courseName", passed: "totalScore" },
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
        // Người có quyền duyệt đưa hồ sơ khỏi danh sách tham dự về trạng thái từ chối duyệt (trừ hồ sơ đã có chứng nhận); hồ sơ không bị xóa và duyệt lại được ở màn Duyệt đăng ký.
        actions: { remove: { label: "Chuyển về từ chối duyệt", permissionPrefixes: ["training.participation.approve."] } },
        filterLabels: ["Khóa huấn luyện", "Trạng thái tham dự"],
        workflowHint: "Score form khóa khi certificateApprovalStatus là APPROVED.",
      }),
      route({
        path: "/training/teams",
        moduleName: "training.team",
        title: "Chia đội",
        subtitle: "Chia hồ sơ trong danh sách tham dự vào các đội, cân bằng nam nữ.",
        endpoint: "/training/participants",
        idField: "id",
        kind: "participations",
        icon: ClipboardText,
        columns: ["leaderFullName", "leaderGender", "parishName", "deaneryName", "teamName", "participationStatus"],
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", leaderGender: "leader.gender", parishName: "leader.parish.name", deaneryName: "leader.parish.deanery.name", teamName: "teamName" },
        searchFields: participationSearchFields,
        permissionPrefixes: [
          "training.participation.read.deanery",
          "training.participation.read.diocese",
          "training.participation.approve.deanery",
          "training.participation.approve.diocese",
        ],
        actionPermissionPrefixes: ["training.participation.approve."],
        filters: teamFilters,
        filterLabels: ["Trạng thái tham dự", "Giáo hạt", "Giáo xứ / giáo họ / giáo điểm", "Đội"],
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
        columns: ["leaderFullName", "parishName", "deaneryName", "courseName", "totalScore", "passed", "finalResult"],
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", parishName: "leader.parish.name", deaneryName: "leader.parish.deanery.name", courseName: "course.courseName", passed: "totalScore" },
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
        filterLabels: ["Khóa huấn luyện", "Kết quả", "Chứng nhận"],
        workflowHint: "Request score phải gửi đúng và đủ component của formula, không vượt maxScore.",
      }),
      route({
        path: "/certificates/approvals",
        moduleName: "certificate.approval",
        title: "Duyệt chứng nhận",
        subtitle: "Hoàn tất chứng nhận và promotion sau khi hồ sơ đã chấm điểm.",
        endpoint: "/certificates",
        idField: "certificateCode",
        kind: "certificates",
        icon: Certificate,
        searchFields: participationSearchFields,
        filters: certificateApprovalFilters,
        columns: ["leaderFullName", "courseName", "totalScore", "passingScore", "approvalReasonRequired", "approvalStatus"],
        sortFields: { leaderFullName: "leader.firstName+leader.lastName", courseName: "course.courseName", totalScore: null, passingScore: "course.passingScore", approvalReasonRequired: null },
        permissionPrefixes: ["training.certificate.approve.", "training.certificate.read."],
        actionPermissionPrefixes: ["training.certificate.approve."],
        actions: {
          approve: { label: "Duyệt", permissionPrefixes: ["training.certificate.approve."] },
          reject: { label: "Từ chối", permissionPrefixes: ["training.certificate.approve."] },
        },
        primaryActionLabel: "Duyệt chứng nhận",
        filterLabels: ["Khóa huấn luyện", "Trạng thái"],
        workflowHint: "Duyệt certificate có thể promote leader nhưng không được hạ cấp hiện tại.",
      }),
    ],
  };
