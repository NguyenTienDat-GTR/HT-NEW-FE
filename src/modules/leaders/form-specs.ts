import { compactPayload, type ResourceFormSpec } from "@/components/form/resource-form/types";
import { leaderLevelSelect } from "@/modules/organizations/form-specs";

const genderOptions = [
  { value: "NAM", label: "Nam" },
  { value: "NU", label: "Nữ" },
];

export const personnelFormSpecs: ResourceFormSpec[] = [
  {
    kind: "leaders",
    createTitle: "Thêm huynh trưởng",
    editTitle: "Chỉnh sửa huynh trưởng",
    description: "Hồ sơ huynh trưởng theo giáo xứ / giáo họ / giáo điểm, cấp hiện tại và thông tin liên hệ.",
    fields: [
      { name: "holyName", label: "Tên thánh", required: true, section: "Thông tin cá nhân" },
      { name: "fullName", label: "Họ và tên", required: true, readOnlyOnEdit: true, section: "Thông tin cá nhân" },
      { name: "birthDate", label: "Ngày sinh", type: "date", required: true, readOnlyOnEdit: true, section: "Thông tin cá nhân" },
      { name: "gender", label: "Giới tính", type: "select", required: true, options: genderOptions, section: "Thông tin cá nhân" },
      { name: "email", label: "Email", type: "email", required: true, clearable: true, section: "Thông tin liên hệ" },
      { name: "phoneNumber", label: "Số điện thoại", required: true, section: "Thông tin liên hệ" },
      { name: "imageUrl", label: "Ảnh đại diện", type: "image", helper: "Chỉ có thể thay bằng ảnh khác, không xóa được ảnh đại diện.", section: "Thông tin liên hệ" },
      {
        name: "deaneryId",
        label: "Giáo hạt",
        helper: "Chọn giáo hạt trước để danh sách giáo xứ / giáo họ / giáo điểm chỉ hiện các đơn vị thuộc giáo hạt đó.",
        type: "select",
        required: true,
        optionsEndpoint: "/deaneries",
        optionValue: "id",
        optionLabel: "name",
        section: "Phạm vi",
      },
      {
        name: "parishId",
        label: "Giáo xứ / giáo họ / giáo điểm",
        helper: "Chọn đúng nơi huynh trưởng sinh hoạt. Huynh trưởng ở giáo họ / giáo điểm thì chọn giáo họ / giáo điểm đó (không chọn giáo xứ cha).",
        type: "select",
        required: true,
        optionsEndpoint: "/parishes",
        buildOptionsEndpoint: (values) =>
          values.deaneryId ? `/parishes?filters=${encodeURIComponent(JSON.stringify({ "deanery.id": values.deaneryId }))}` : undefined,
        optionValue: "id",
        optionLabel: "name",
        optionLabelFields: ["name", "parentParishName"],
        section: "Phạm vi",
      },
      { name: "leaderLevel", label: "Cấp huynh trưởng", type: "select", required: true, ...leaderLevelSelect, readOnlyOnEdit: true, section: "Phạm vi" },
    ],
    getInitialValues: (user) => (user?.deaneryId ? { deaneryId: user.deaneryId } : {}),
    // Id ảnh vừa tải lên không phải trường nhìn thấy nhưng phải gửi cùng hồ sơ.
    extraValueNames: ["imageAssetId"],
    mapSubmit: (values, mode) => {
      const payload = compactPayload(values);
      // Giáo hạt chỉ để lọc danh sách giáo xứ, không gửi lên.
      delete payload.deaneryId;
      // Ảnh đại diện chỉ gửi bằng id asset đã tải lên; URL xem trước (đã ký, hết hạn) không gửi lên backend.
      delete payload.imageUrl;
      delete payload.imageThumbUrl;
      if (mode === "edit") {
        delete payload.fullName;
        delete payload.birthDate;
        delete payload.leaderLevel;
      }
      return payload;
    },
  },
];
