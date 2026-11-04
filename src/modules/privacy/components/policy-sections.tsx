import type { ReactNode } from "react";
import { CONTROLLER_ADDRESS, CONTROLLER_EMAIL, CONTROLLER_NAME } from "../constants";

// Nội dung chỉ ghi những gì có bằng chứng trong mã nguồn C-LEAD (form, API, dịch vụ gọi ra ngoài).
// Thông tin pháp nhân do chủ hệ thống cung cấp (xem constants.ts); nên nhờ người làm luật xem lại trước khi áp dụng chính thức.
// Ghi chú căn cứ pháp lý nằm trong comment JSX; xóa trước khi đăng chính thức nếu muốn.

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3" id={id}>
      <h2 className="text-xl font-semibold text-foreground" id={`${id}-title`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead className="bg-surface-1 text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            {head.map((cell) => (
              <th className="px-3 py-2 font-semibold" key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="border-t border-border align-top" key={index}>
              {row.map((cell, cellIndex) => (
                <td className="px-3 py-2 leading-5" key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const P = ({ children }: { children: ReactNode }) => <p className="text-sm leading-6 text-foreground">{children}</p>;

export function PolicySections() {
  return (
    <div className="space-y-8">
      <Section id="ben-kiem-soat" title="1. Chúng tôi là ai">
        {/* Căn cứ: điểm b khoản 2 Điều 9 Luật 91/2025/QH15: người dùng phải biết rõ bên kiểm soát dữ liệu khi đồng ý. */}
        <P>
          {CONTROLLER_NAME}, hệ thống quản lý huynh trưởng Thiếu Nhi Thánh Thể (gọi là &quot;chúng tôi&quot;), là bên kiểm soát dữ liệu cá nhân
          của hệ thống này. Hệ thống do một cá nhân vận hành, không phải doanh nghiệp.
        </P>
        <List
          items={[
            <>Nơi vận hành: {CONTROLLER_ADDRESS}</>,
            <>Email tiếp nhận yêu cầu về dữ liệu cá nhân: {CONTROLLER_EMAIL}</>,
          ]}
        />
      </Section>

      <Section id="du-lieu-thu-thap" title="2. Dữ liệu chúng tôi thu thập và mục đích">
        {/* Căn cứ: khoản 2 điểm a và khoản 4 điểm a Điều 9 Luật 91/2025: biết rõ loại dữ liệu, mục đích; đồng ý theo từng mục đích. */}
        <Table
          head={["Dữ liệu", "Khi nào thu / ai nhập", "Dùng để làm gì"]}
          rows={[
            [
              "Tên đăng nhập, mật khẩu (lưu dạng mã hóa), địa chỉ IP và thiết bị khi đăng nhập",
              "Khi tài khoản được tạo và mỗi lần đăng nhập",
              "Xác thực, bảo mật tài khoản, ghi nhật ký truy cập",
            ],
            [
              "Tên thánh, họ và tên, ngày sinh, giới tính, email, số điện thoại",
              "Quản trị viên nhập hộ (từng người hoặc nhập từ file Excel), hoặc chính bạn sửa trong trang hồ sơ cá nhân",
              "Quản lý hồ sơ huynh trưởng, liên hệ, gửi mã OTP và thông tin tài khoản qua email",
            ],
            [
              "Giáo phận, giáo hạt, giáo xứ / giáo họ / giáo điểm, cấp độ, lịch sử cấp bậc, ban điều hành, khóa đào tạo, điểm và chứng nhận",
              "Quản trị viên nhập hoặc hệ thống phát sinh trong quá trình quản lý",
              "Quản lý tổ chức, đào tạo, đánh giá và cấp chứng nhận, thẻ huynh trưởng",
            ],
            [
              "Ảnh chân dung",
              "Quản trị viên hoặc chính bạn tải lên",
              "Hiển thị hồ sơ, in trên thẻ và chứng nhận. Việc dò khuôn mặt để căn ảnh chạy ngay trên trình duyệt của người tải ảnh, ảnh không được gửi cho dịch vụ nhận diện nào khác.",
            ],
            [
              "Tên, số điện thoại, email của cha tuyên úy phụ trách giáo phận, giáo hạt, giáo xứ",
              "Quản trị viên nhập khi tạo hoặc sửa đơn vị",
              "Liên hệ với đơn vị trong công việc quản lý",
            ],
          ]}
        />
        <P>Chúng tôi không dùng dữ liệu cho mục đích khác ngoài bảng trên nếu chưa hỏi ý kiến bạn.</P>
      </Section>

      <Section id="ben-nhan" title="3. Ai được xem và bên thứ ba nhận dữ liệu">
        {/* Căn cứ: Điều 7 khoản 6 Luật 91/2025 cấm mua bán dữ liệu cá nhân. */}
        <P>
          Quản trị viên chỉ xem được dữ liệu của đơn vị mình phụ trách (giáo phận, giáo hạt hoặc giáo xứ) theo phân quyền trong hệ thống. Huynh trưởng có
          tài khoản xem được hồ sơ của chính mình.
        </P>
        <Table
          head={["Bên nhận", "Dữ liệu", "Lý do"]}
          rows={[
            ["Cloudinary", "Ảnh chân dung và hình ảnh hệ thống tải lên", "Lưu trữ và phân phối hình ảnh"],
            ["Google (dịch vụ Gmail SMTP)", "Địa chỉ email người nhận, nội dung email (mã OTP, thông tin tài khoản)", "Gửi email của hệ thống"],
            [
              "Nhà cung cấp hạ tầng điện toán đám mây (máy chủ đặt tại khu vực châu Á - Thái Bình Dương, ngoài lãnh thổ Việt Nam)",
              "Toàn bộ dữ liệu hệ thống (cơ sở dữ liệu, tệp)",
              "Vận hành hệ thống",
            ],
          ]}
        />
        <P>Chúng tôi không bán dữ liệu cá nhân của bạn.</P>
      </Section>

      <Section id="luu-tru" title="4. Lưu trữ và chuyển dữ liệu ra nước ngoài">
        {/* Căn cứ: khoản 1 Điều 20 Luật 91/2025 (3 trường hợp chuyển xuyên biên giới, gồm dùng nền tảng đặt ngoài Việt Nam); điểm b khoản 1 Điều 14: xóa khi đã hoàn thành mục đích.
            Chủ hệ thống còn phải lập hồ sơ đánh giá tác động chuyển dữ liệu theo khoản 2 Điều 20 (việc này nằm ngoài trang chính sách). */}
        <P>
          Máy chủ và cơ sở dữ liệu của hệ thống đặt tại khu vực châu Á - Thái Bình Dương, hình ảnh được lưu trên Cloudinary và email được gửi qua
          Google, đều là hạ tầng đặt ngoài lãnh thổ Việt Nam. Việc này là chuyển dữ liệu cá nhân ra nước ngoài.
        </P>
        <P>
          Chúng tôi lưu dữ liệu cho tới khi bạn yêu cầu xóa hoặc khi không còn cần cho các mục đích nêu trên, sau đó xóa hoặc khử nhận dạng, trừ khi
          pháp luật yêu cầu lưu lâu hơn.
        </P>
      </Section>

      <Section id="cookie" title="5. Cookie">
        {/* Căn cứ: khoản 8 Điều 28 Luật 91/2025 chỉ áp dụng cho quảng cáo theo hành vi. Mã nguồn không có script thống kê hay quảng cáo. */}
        <P>
          Hệ thống chỉ dùng cookie cần thiết để giữ phiên đăng nhập (accessToken, refreshToken). Chúng tôi không dùng cookie thống kê hay quảng cáo, không
          nhúng công cụ theo dõi của bên thứ ba.
        </P>
      </Section>

      <Section id="quyen" title="6. Quyền của bạn và cách thực hiện">
        {/* Căn cứ: Điều 4 khoản 1 Luật 91/2025 (danh sách quyền); Điều 10 khoản 2 (rút đồng ý, kể cả dạng điện tử); Điều 5 khoản 2, 3, 4 NĐ 356/2025 (thời hạn; gia hạn 1 lần tối đa 15/10/20 ngày).
            Không tự rút ngắn hay kéo dài các mốc này. */}
        <P>Bạn có quyền:</P>
        <List
          items={[
            "biết chúng tôi đang xử lý dữ liệu nào của bạn",
            "đồng ý, không đồng ý hoặc rút lại sự đồng ý (nút \"Rút đồng ý\" trong trang Hồ sơ cá nhân)",
            "xem, chỉnh sửa hoặc yêu cầu chỉnh sửa dữ liệu",
            "yêu cầu cung cấp, xóa, hạn chế xử lý dữ liệu và phản đối việc xử lý",
            "khiếu nại, tố cáo, khởi kiện, yêu cầu bồi thường theo quy định pháp luật",
          ]}
        />
        <P>
          <strong>Cách yêu cầu:</strong> gửi email tới {CONTROLLER_EMAIL} hoặc liên hệ quản trị viên đơn vị của bạn. Chúng tôi:
        </P>
        <List
          items={[
            "xác nhận đã nhận yêu cầu và hướng dẫn thủ tục trong 2 ngày làm việc",
            "cho xem, chỉnh sửa, cung cấp dữ liệu trong 10 ngày (15 ngày nếu cần bên xử lý dữ liệu hoặc bên thứ ba cùng thực hiện)",
            "xử lý yêu cầu rút đồng ý, hạn chế, phản đối trong 15 ngày (20 ngày nếu cần bên xử lý hoặc bên thứ ba ngừng xử lý)",
            "xóa dữ liệu trong 20 ngày (30 ngày nếu cần bên xử lý hoặc bên thứ ba cùng xóa)",
          ]}
        />
        <P>Yêu cầu phức tạp có thể được gia hạn một lần, chúng tôi sẽ báo lý do cho bạn.</P>
        <P>
          Khi bạn rút đồng ý, hệ thống ghi nhận việc rút và bạn cần đồng ý lại mới tiếp tục dùng được hệ thống. Việc rút đồng ý không tự xóa dữ liệu đã có:
          muốn xóa, hãy gửi yêu cầu xóa theo cách trên.
        </P>
      </Section>

      <Section id="vi-thanh-nien" title="7. Người chưa thành niên">
        {/* Căn cứ: khoản 2 Điều 24 Luật 91/2025. Chủ hệ thống xác nhận: khi đăng ký tham dự khóa huấn luyện đã có sự đồng ý của cha mẹ và đồng ý lưu hồ sơ vào hệ thống. */}
        <P>
          Huynh trưởng tham gia hệ thống từ đủ 16 tuổi, nên có người chưa đủ 18 tuổi. Khi đăng ký tham dự khóa huấn luyện, việc đăng ký đã có sự đồng ý của cha
          mẹ hoặc người đại diện theo pháp luật, kèm đồng ý để lưu hồ sơ vào hệ thống. Cha mẹ hoặc người đại diện có thể thực hiện các quyền nêu ở mục 6
          thay cho con.
        </P>
      </Section>

      <Section id="su-co" title="8. Khi có sự cố">
        {/* Căn cứ: Điều 23 khoản 1 Luật 91/2025: thông báo cơ quan chuyên trách chậm nhất 72 giờ kể từ khi phát hiện. Việc báo cho người dùng là cam kết tự nguyện. */}
        <P>
          Nếu xảy ra lộ hoặc mất dữ liệu cá nhân, chúng tôi thông báo cho cơ quan chuyên trách bảo vệ dữ liệu cá nhân chậm nhất 72 giờ kể từ khi phát hiện,
          theo quy định pháp luật.
        </P>
      </Section>

      <Section id="thay-doi" title="9. Thay đổi chính sách">
        <P>
          Khi thay đổi mục đích hoặc loại dữ liệu xử lý, chúng tôi cập nhật trang này, đổi số phiên bản và yêu cầu bạn xác nhận lại khi đăng nhập.
        </P>
      </Section>
    </div>
  );
}
