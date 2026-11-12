import type {FormFieldSpec} from "@/components/form/resource-form/types";
import type {LeaderDetail} from "./leader-detail-utils";
import type {AuthUser} from "@/lib/auth/auth-store";
import {hasAnyPermission} from "@/lib/auth/permissions";

export type LeaderEditValues = {
    holyName: string;
    email: string;
    phoneNumber: string;
    imageUrl: string;
    // Id ảnh vừa tải lên (rỗng nếu không đổi ảnh); backend chỉ nhận id, không nhận URL ảnh.
    imageAssetId: string;
    gender: string;
};

export const emptyLeaderEditValues: LeaderEditValues = {
    holyName: "",
    email: "",
    phoneNumber: "",
    imageUrl: "",
    imageAssetId: "",
    gender: "",
};

export const leaderEditableFields = {
    holyName: {name: "holyName", label: "Tên thánh", required: true},
    phoneNumber: {name: "phoneNumber", label: "Số điện thoại", placeholder: "Nhập số điện thoại"},
    email: {name: "email", label: "Email", type: "email", placeholder: "Nhập email chính thức (không bắt buộc)"},
    gender: {
        name: "gender",
        label: "Giới tính",
        type: "select",
        required: true,
        options: [
            {value: "NAM", label: "Nam"},
            {value: "NU", label: "Nữ"},
        ],
    },
} satisfies Record<string, FormFieldSpec>;

// Đổi giáo xứ của huynh trưởng là chức năng và quyền riêng (nút "Chuyển xứ"), tách khỏi sửa hồ sơ.
export function canTransferLeader(user: AuthUser | null | undefined) {
    return hasAnyPermission(user, ["organization.leader.transfer.diocese", "organization.leader.transfer.deanery"]);
}

// Ngày theo giờ máy người dùng, dạng yyyy-MM-dd như ô nhập ngày.
export function todayDateText(now: Date = new Date()) {
    return now.toLocaleDateString("sv-SE");
}

// Kiểm tra ngày sinh (yyyy-MM-dd) trước khi gửi; trả về thông báo lỗi hoặc null nếu hợp lệ.
export function validateBirthDate(value: string, today: string = todayDateText()) {
    if (!value.trim()) return "Vui lòng nhập ngày sinh";
    if (value > today) return "Ngày sinh không được sau ngày hiện tại";
    return null;
}

export function valuesFromLeader(leader: LeaderDetail): LeaderEditValues {
    return {
        holyName: leader.holyName ?? "",
        email: leader.email ?? "",
        phoneNumber: leader.phoneNumber ?? "",
        imageUrl: leader.imageUrl ?? "",
        imageAssetId: leader.imageAssetId ?? "",
        gender: leader.gender ?? "",
    };
}

export function validateLeaderEdit(values: LeaderEditValues) {
    const errors: Record<string, string> = {};
    if (!values.holyName.trim()) errors.holyName = "Trường này là bắt buộc";
    if (!values.gender.trim()) errors.gender = "Trường này là bắt buộc";
    return errors;
}

export function toLeaderUpdatePayload(values: LeaderEditValues) {
    const payload: Record<string, unknown> = {
        holyName: values.holyName.trim(),
        gender: values.gender,
    };
    const clearFields: string[] = [];

    // Email không bắt buộc: để trống thì xóa email khỏi hồ sơ.
    if (values.email.trim()) payload.email = values.email.trim();
    else clearFields.push("email");

    if (values.phoneNumber.trim()) payload.phoneNumber = values.phoneNumber.trim();
    else clearFields.push("phoneNumber");

    // Ảnh đại diện chỉ được thay bằng ảnh khác (không có thao tác xóa).
    if (values.imageAssetId) payload.imageAssetId = values.imageAssetId;

    if (clearFields.length) payload.clearFields = clearFields;
    return payload;
}
