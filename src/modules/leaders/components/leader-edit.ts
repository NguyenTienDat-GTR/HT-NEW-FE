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
    email: {name: "email", label: "Email", type: "email", required: true, placeholder: "Nhập email chính thức"},
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
    if (!values.email.trim()) errors.email = "Trường này là bắt buộc";
    if (!values.gender.trim()) errors.gender = "Trường này là bắt buộc";
    return errors;
}

export function toLeaderUpdatePayload(values: LeaderEditValues) {
    const payload: Record<string, unknown> = {
        holyName: values.holyName.trim(),
        email: values.email.trim(),
        gender: values.gender,
    };
    const clearFields: string[] = [];

    if (values.phoneNumber.trim()) payload.phoneNumber = values.phoneNumber.trim();
    else clearFields.push("phoneNumber");

    // Ảnh đại diện chỉ được thay bằng ảnh khác (không có thao tác xóa).
    if (values.imageAssetId) payload.imageAssetId = values.imageAssetId;

    if (clearFields.length) payload.clearFields = clearFields;
    return payload;
}
