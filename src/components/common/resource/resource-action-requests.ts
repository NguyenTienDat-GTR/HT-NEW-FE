import { apiMutation, apiMutationOnce } from "@/lib/api/client";
import type { RouteConfig } from "@/config/routes/routes";
import type { CertificateSigner } from "./approval-dialog";
import type { ResourceListModuleConfig } from "./resource-list-types";

export type ResourceRowAction = "toggle" | "approve" | "reject" | "revoke" | "reissue" | "withdraw" | "remove" | "revokePermission" | "resetPassword";

export type ResourceRowActionInput = {
  action: ResourceRowAction;
  id: string;
  note?: string;
  signer?: CertificateSigner;
  achievedLevel?: string;
};

export type ResourceActionContext = {
  route: RouteConfig;
  config: ResourceListModuleConfig;
  rows: Record<string, unknown>[];
  rowById: (id: string) => Record<string, unknown> | undefined;
  /** Đang xem tab của khóa đã diễn ra (khóa quá khứ) và mã khóa tương ứng. */
  coursePast?: boolean;
  courseCode?: string;
};

/** Mô tả một lời gọi API: `once` dùng Idempotency-Key để bấm đúp / gửi lại sau lỗi mạng chỉ thực hiện một lần. */
export type ActionRequest = {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  idempotent: boolean;
};

type ActionRequestBuilder = (input: ResourceRowActionInput, ctx: ResourceActionContext) => ActionRequest;

const itemPath = (ctx: ResourceActionContext, id: string, suffix = "") => `${ctx.route.endpoint}/${encodeURIComponent(id)}${suffix}`;

// Mỗi thao tác trên dòng là một mục trong bảng này: thêm thao tác mới không cần sửa các mục khác (OCP).
const REQUEST_BUILDERS: Record<ResourceRowAction, ActionRequestBuilder> = {
  // Đặt lại mật khẩu: mật khẩu tạm chỉ gửi qua email, API chỉ trả về email đã che và hạn dùng.
  resetPassword: ({ id }, ctx) => ({ path: itemPath(ctx, id, "/reset-password"), method: "POST", idempotent: true }),
  revokePermission: ({ id }, ctx) => {
    const row = ctx.rowById(id);
    const target = ctx.route.kind === "role-permissions" ? { roleCode: row?.roleCode } : { username: row?.username };
    return { path: `${ctx.route.endpoint}/revoke`, method: "POST", body: { ...target, permissionCodes: [row?.permissionCode] }, idempotent: false };
  },
  // Thu hồi / cấp lại / duyệt / từ chối dùng Idempotency-Key.
  revoke: ({ id, note }, ctx) => ({ path: itemPath(ctx, id, "/revoke"), method: "POST", body: { reason: note }, idempotent: true }),
  reissue: ({ id, note }, ctx) => ({ path: itemPath(ctx, id, "/reissue"), method: "POST", body: { reason: note }, idempotent: true }),
  remove: ({ id }, ctx) => {
    // Khóa quá khứ có endpoint xóa học viên riêng (hồ sơ được xóa hẳn, không chuyển về trạng thái từ chối).
    if (ctx.coursePast === true && ctx.courseCode) {
      return { path: `/training/courses/${encodeURIComponent(ctx.courseCode)}/participants/${encodeURIComponent(id)}`, method: "DELETE", idempotent: false };
    }
    return { path: ctx.config.buildRemovePath?.(id) ?? itemPath(ctx, id), method: "DELETE", idempotent: false };
  },
  withdraw: ({ id }, ctx) => ({ path: ctx.config.buildWithdrawPath?.(id) ?? itemPath(ctx, id), method: "DELETE", idempotent: false }),
  toggle: ({ id }, ctx) => ({ path: itemPath(ctx, id, "/toggle-status"), method: "PATCH", body: { confirmationText: "Xác nhận" }, idempotent: false }),
  approve: (input, ctx) => buildDecisionRequest(true, input, ctx),
  reject: (input, ctx) => buildDecisionRequest(false, input, ctx),
};

function buildDecisionRequest(approved: boolean, { id, note, signer, achievedLevel }: ResourceRowActionInput, ctx: ResourceActionContext): ActionRequest {
  return {
    path: ctx.config.buildApprovePath?.(ctx.route, ctx.rows, id, approved) ?? itemPath(ctx, id, "/approve"),
    method: "POST",
    body: ctx.config.buildApproveBody?.(ctx.route, note, approved, signer, achievedLevel) ?? { approved, review: note || undefined },
    idempotent: true,
  };
}

export function buildActionRequest(input: ResourceRowActionInput, ctx: ResourceActionContext): ActionRequest {
  const builder = REQUEST_BUILDERS[input.action];
  if (!builder) throw new Error("Unsupported resource action");
  return builder(input, ctx);
}

export function sendActionRequest<T>(request: ActionRequest): Promise<T> {
  return request.idempotent
    ? apiMutationOnce<T>(request.path, request.method, request.body)
    : apiMutation<T>(request.path, request.method, request.body);
}

const SUCCESS_MESSAGES: Record<Exclude<ResourceRowAction, "resetPassword">, string> = {
  toggle: "Đổi trạng thái thành công",
  revokePermission: "Đã thu hồi quyền",
  reject: "Đã từ chối duyệt",
  revoke: "Đã thu hồi chứng nhận",
  reissue: "Đã cấp lại chứng nhận",
  withdraw: "Đã thu hồi đăng ký",
  remove: "Đã chuyển hồ sơ về trạng thái từ chối duyệt",
  approve: "Duyệt thành công",
};

export function actionSuccessMessage(action: ResourceRowAction, data: unknown): string {
  if (action === "resetPassword") {
    return `Đã gửi mật khẩu tạm tới ${(data as { maskedEmail?: string } | undefined)?.maskedEmail ?? "email đã đăng ký"}, hiệu lực 10 phút`;
  }
  return SUCCESS_MESSAGES[action];
}
