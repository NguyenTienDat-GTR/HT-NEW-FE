const STORAGE_KEY = "ht.deviceId";

function randomId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/**
 * Định danh ổn định của trình duyệt/thiết bị này, gửi kèm khi đăng nhập để BE phân biệt các thiết bị
 * (không dựa vào IP: hai thiết bị cùng mạng/proxy có cùng IP nhưng phải là hai phiên song song).
 */
export function getDeviceId(): string | undefined {
    try {
        let id = window.localStorage.getItem(STORAGE_KEY);
        if (!id) {
            id = randomId();
            window.localStorage.setItem(STORAGE_KEY, id);
        }
        return id;
    } catch {
        return undefined;
    }
}
