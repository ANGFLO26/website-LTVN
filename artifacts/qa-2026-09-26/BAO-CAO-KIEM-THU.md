# Báo cáo kiểm thử chức năng và logic website LT Việt Nam

Ngày kiểm tra: 26/09/2026. Phạm vi: mã nguồn hiện tại tại `D:\Work\LTVN\Last`.

**Kết luận: chưa nên đưa bản hiện tại vào vận hành chính thức.** Website có các luồng điều hướng, tìm kiếm và lọc hoạt động, nhưng còn lỗi ở xác thực, lưu dữ liệu, thông báo kết quả và xử lý nội dung. Ghi nhận **16 nhóm vấn đề: 8 P1 và 8 P2**. P1 cần xử lý trước khi mở hệ thống cho người dùng thật; P2 cần xử lý để các tình huống vận hành hoạt động đúng.

Không sửa mã nguồn ứng dụng, không chạy seed/migration, không tạo/sửa/xóa dữ liệu thật. Các tệp mới trong thư mục này là báo cáo, bằng chứng và kịch bản kiểm thử.

## Phương pháp và giới hạn

- Build bản production của website, admin và API; kiểm tra lint, i18n và các bài test API có sẵn.
- Chromium headless chạy bản build local. 22 đường dẫn × 2 ngôn ngữ VI/EN × 2 chiều rộng 1440/375 px = **88 lượt kiểm tra trang**. Dữ liệu API được giả lập từ dữ liệu mẫu sẵn có trong admin; các kịch bản biên dùng dữ liệu QA riêng. Chặn kết nối trình duyệt ra ngoài localhost.
- Kiểm thử form, bộ lọc, liên kết, menu mobile, trạng thái API thành công/lỗi/mất kết nối, dữ liệu rỗng và nội dung CMS thay đổi.
- Kiểm tra các controller NestJS thật với service giả lập để xác định request có vượt qua lớp xác thực/validation hay không. Mã HTTP trong các bài này chứng minh request đến được service, **không chứng minh đã ghi thành công vào database thật**.
- Dùng service và Drizzle thật để biên dịch truy vấn từ payload, chặn thực thi database. Đây là bằng chứng trực tiếp cho lỗi kiểu thời gian và trường dữ liệu được truy vấn.
- Chưa kiểm thử tên miền production, cấu hình reverse proxy đang triển khai, email/điện thoại thực tế, giao dịch trên PostgreSQL thật, tải đồng thời hoặc Safari/Firefox. Không coi kết quả mock là chứng nhận luồng CRUD thật đã hoạt động.

## Các phần đã đạt

| Hạng mục | Kết quả |
|---|---|
| Build website / admin / API | Đều thành công |
| Kiểm tra i18n | Đạt: 179 khóa giao diện, 12 giá trị nội dung song ngữ; không bao phủ nội dung CMS mới |
| Lint website | Đạt |
| Unit test và e2e API có sẵn | Mỗi nhóm 1 test đạt; đều chủ yếu kiểm tra `Hello World!` |
| Tìm kiếm sản phẩm | Tìm model không phân biệt hoa thường, bỏ khoảng trắng đầu/cuối; tìm tiêu chuẩn khi API có liên kết tiêu chuẩn |
| Bộ lọc | Lọc nhóm sản phẩm; tìm không có kết quả; xóa bộ lọc; các bộ lọc tin tức/dự án/sự kiện |
| Luồng sản phẩm → liên hệ | Tự chọn đúng sản phẩm trong form |
| Menu mobile | Mở menu và đóng bằng Escape |
| Ngôn ngữ | Giao diện đổi VI/EN, giữ lựa chọn qua lần tải trang |
| Ảnh và tràn ngang website | Không ghi nhận ảnh lỗi hoặc tràn ngang trên các trang render thành công trong bộ dữ liệu kiểm thử |
| Trang Giới thiệu | Render bình thường khi bài viết dùng làm ví dụ có đủ 3 đoạn; lỗi khi nội dung ngắn hơn, xem QA-06 |

Trong 88 lượt kiểm tra, 84 lượt có tiêu đề trang, đúng ngôn ngữ, không lỗi ảnh/tràn ngang. Bốn lượt `/gioi-thieu` bị crash với dữ liệu mẫu có một đoạn. Kiểm thử đối chứng với ba đoạn đã đạt. Đây là lỗi phụ thuộc nội dung, không phải kết luận trang production hiện tại luôn trắng.

## Các vấn đề P1

### QA-01 — API quản trị chưa có xác thực và phân quyền

**Tác động:** nếu triển khai API ra ngoài mà không có lớp bảo vệ bổ sung, người chưa đăng nhập có thể gọi API đọc liên hệ/tài khoản và thao tác quản trị. Vai trò admin/editor trên giao diện chưa được thực thi bằng quyền truy cập.

**Bằng chứng:** không có auth guard/global guard trong API; admin mở thẳng Dashboard. Request không có token tới `GET /api/users`, `GET /api/contacts` nhận 200 trong harness. Các POST quản trị nhận 201 và DELETE nhận 200, đến được service giả lập. POST liên hệ công khai là hợp lệ về mặt quyền; lỗi là các API quản trị và đọc dữ liệu riêng tư không được bảo vệ.

**Vị trí:** [main.ts](D:/Work/LTVN/Last/api/src/main.ts:5), [users.controller.ts](D:/Work/LTVN/Last/api/src/modules/users/users.controller.ts:17), [contacts.controller.ts](D:/Work/LTVN/Last/api/src/modules/contacts/contacts.controller.ts:18), [admin App.tsx](D:/Work/LTVN/Last/admin/src/App.tsx:24).

**Hướng sửa:** triển khai đăng nhập/session hoặc token; bảo vệ toàn bộ API quản trị và kiểm tra role ở server. `.addBearerAuth()` hiện chỉ khai báo tài liệu Swagger. CORS hiện cho phép `*`; whitelist CORS là cấu hình bổ sung, không thay thế xác thực.

### QA-02 — Truy vấn bài viết/liên hệ lấy cả trường băm mật khẩu

**Tác động:** phản hồi có thể chứa `author.passwordHash` hoặc `assignedUser.passwordHash` khi có tài khoản liên kết.

**Bằng chứng:** `author: true` và `assignedUser: true` lấy tất cả cột user. Truy vấn SQL do Drizzle thật sinh ra chứa `password_hash`; service trả thẳng kết quả quan hệ. Không đọc hay trích xuất mật khẩu/hash thật trong đợt kiểm tra này.

**Vị trí:** [news-events.service.ts](D:/Work/LTVN/Last/api/src/modules/news-events/news-events.service.ts:17), [contacts.service.ts](D:/Work/LTVN/Last/api/src/modules/contacts/contacts.service.ts:16).

**Hướng sửa:** chọn rõ các cột công khai, dùng DTO phản hồi; loại bỏ passwordHash khỏi mọi quan hệ và kiểm thử cả endpoint danh sách/chi tiết.

### QA-03 — Payload quản trị không tương thích với kiểu dữ liệu backend

**Tác động:** tạo/cập nhật dữ liệu có thể thất bại dù ứng dụng build thành công.

**Tái hiện:** mở form sửa hoặc thêm máy, lưu; lấy JSON request thực tế từ trình duyệt rồi đưa qua service và Drizzle thật. Cả PUT và POST đều lỗi **`value.toISOString is not a function`** khi biên dịch truy vấn. Payload tương đương từ form tin tức, người dùng, media và tiêu chuẩn cũng tái hiện lỗi này.

**Nguyên nhân:** admin gửi `createdAt`, `updatedAt`, `publishedAt` dưới dạng chuỗi JSON; schema timestamp đang dùng `Date`, còn service chuyển thẳng body vào ORM. Form tạo mới còn gửi `id: ''`; `sanitizeUuid` giữ lại chuỗi rỗng. Khi có `mainImageId: ''`, logic kiểm tra hiện tại cũng không chuyển thành `null`. Các giá trị UUID rỗng vẫn cần sửa sau khi sửa timestamp.

**Vị trí:** [MachinesPage.tsx](D:/Work/LTVN/Last/admin/src/pages/MachinesPage.tsx:28), [machines.service.ts](D:/Work/LTVN/Last/api/src/modules/machines/machines.service.ts:83), [uuid.util.ts](D:/Work/LTVN/Last/api/src/common/uuid.util.ts:5), [schema.ts](D:/Work/LTVN/Last/api/src/database/schema.ts:106).

**Hướng sửa:** dùng DTO ghi dữ liệu riêng; để server/database tạo ID và thời điểm hệ thống, parse/validate các ngày do người dùng nhập và chuẩn hóa khóa ngoại rỗng thành null. Sau đó kiểm tra CRUD bằng database test riêng.

### QA-04 — Admin báo lưu thành công khi API trả lỗi

**Tái hiện:** sửa tên một máy; giả lập PUT trả 500 và POST trả 500. Admin tự gọi thêm POST sau PUT thất bại, đóng form, hiện “Đã lưu thông tin Máy PAC thành công!”, trong khi bảng vẫn có tên cũ.

**Nguyên nhân:** `apiRequest` chuyển mọi lỗi thành `null`; lớp dịch vụ tự tạo kết quả localStorage và phía giao diện luôn hiện toast thành công. Cách xử lý tương tự xuất hiện trong các chức năng lưu/xóa khác. Dữ liệu lưu cục bộ không có hàng đợi đồng bộ được xác nhận.

**Vị trí:** [api.ts](D:/Work/LTVN/Last/admin/src/services/api.ts:1724), [saveMachine](D:/Work/LTVN/Last/admin/src/services/api.ts:1767), [App.tsx](D:/Work/LTVN/Last/admin/src/App.tsx:78).

**Bằng chứng:** [Ảnh admin báo thành công](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/admin-false-save-success.png), [payload đã bắt](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/admin-mutation-payloads.json).

**Hướng sửa:** trả lỗi rõ ràng, chờ xác nhận lưu từ server, giữ form khi thất bại; không biến mọi lỗi cập nhật thành thao tác tạo mới. Nếu hỗ trợ offline, phải thể hiện “chưa đồng bộ” và có cơ chế đồng bộ thực tế.

### QA-05 — Form liên hệ báo gửi thành công khi chưa gửi được

**Tái hiện:** điền form hợp lệ; lần lượt cho POST `/api/contacts` trả 500 và mất kết nối. Cả hai trường hợp đều hiện “Yêu cầu tư vấn của bạn đã được gửi thành công”.

**Nguyên nhân:** không kiểm tra `response.ok`, bỏ qua lỗi và luôn `setSubmitted(true)` trong `finally`.

**Vị trí:** [ContactPage.tsx](D:/Work/LTVN/Last/src/pages/ContactPage.tsx:45).

**Bằng chứng:** [Ảnh thông báo gửi thành công sai](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/contact-false-success.png).

**Hướng sửa:** chỉ thông báo thành công khi API xác nhận; có lỗi, timeout và nút thử lại, giữ nguyên dữ liệu khách đã nhập.

### QA-06 — Trang Giới thiệu crash nếu bài viết có ít hơn ba đoạn

**Tái hiện:** bài `hoi-thao-van-an-toan` có một paragraph hợp lệ; mở `/gioi-thieu` → trắng nội dung và lỗi `Cannot read properties of undefined (reading 'vi')`. Chế độ EN lỗi tương tự với `en`. Đối chứng ba paragraph render thành công.

**Nguyên nhân:** trang truy cập trực tiếp `paragraphs[0]`, `[2]`, `[1]` rồi gọi hàm đọc ngôn ngữ, không kiểm tra sự tồn tại. Quản trị viên sửa ngắn bài viết có thể vô tình làm hỏng trang Giới thiệu.

**Vị trí:** [AboutPage.tsx](D:/Work/LTVN/Last/src/pages/AboutPage.tsx:142).

**Hướng sửa:** mô hình hóa riêng các trường của khối ví dụ, hoặc render có điều kiện khi thiếu đoạn; thêm xử lý lỗi trang để một lỗi dữ liệu không làm mất toàn bộ giao diện.

### QA-07 — Nội dung nháp/lưu trữ chưa được bảo vệ ở API công khai

**Bằng chứng:** `findAll()` của machines/news không lọc status; `findOne()` chỉ lọc ID/slug. Website tải toàn bộ rồi tự lọc published ở trình duyệt. Người gọi API vẫn nhận dữ liệu nháp/lưu trữ nếu tồn tại.

**Vị trí:** [machines.service.ts](D:/Work/LTVN/Last/api/src/modules/machines/machines.service.ts:38), [news-events.service.ts](D:/Work/LTVN/Last/api/src/modules/news-events/news-events.service.ts:12), [DataContext.tsx](D:/Work/LTVN/Last/src/context/DataContext.tsx:268).

**Hướng sửa:** endpoint công khai phải lọc published ở server cho cả danh sách và chi tiết; quyền xem nháp chỉ dành cho API quản trị đã xác thực.

### QA-08 — Thiếu validation và giới hạn trường ở form/API liên hệ

**Tái hiện:** nhập họ tên và lời nhắn chỉ gồm dấu cách, trường liên hệ là `abc`. Form vẫn gửi `fullName: ''`, `message: ''`, `phone: 'abc'`, kèm email tự đặt `info@customer.vn`. Request trực tiếp có `status: 'resolved'` và `adminNote` cũng đi tới service không bị controller chặn; service đưa toàn bộ dữ liệu vào insert.

**Tác động:** thông tin liên hệ không sử dụng được; người gửi có thể tự đặt các trường thuộc nghiệp vụ quản trị. Database `NOT NULL` không kiểm tra được một chuỗi rỗng hoặc email sai định dạng.

**Vị trí:** [ContactPage.tsx](D:/Work/LTVN/Last/src/pages/ContactPage.tsx:29), [contacts.controller.ts](D:/Work/LTVN/Last/api/src/modules/contacts/contacts.controller.ts:34), [contacts.service.ts](D:/Work/LTVN/Last/api/src/modules/contacts/contacts.service.ts:32).

**Hướng sửa:** DTO công khai chỉ cho phép các trường khách được nhập; trim và kiểm tra hợp lệ ở server, đặt trạng thái mặc định ở server. Cho phép email/điện thoại theo quy tắc rõ ràng, không tạo email giả.

## Các vấn đề P2

| Mã | Vấn đề, cách tái hiện và ảnh hưởng | Vị trí và hướng sửa |
|---|---|---|
| QA-09 | **Gửi trùng liên hệ.** Khi API phản hồi chậm, double-click nút gửi tạo 2 POST. | [ContactPage.tsx](D:/Work/LTVN/Last/src/pages/ContactPage.tsx:131). Khóa nút trong khi gửi, có trạng thái đang xử lý; cân nhắc chống trùng ở server. |
| QA-10 | **Dữ liệu cũ không mất khi API trả `[]`.** Tải một sản phẩm/bài viết rồi đổi API thành rỗng, chuyển focus: sản phẩm cũ vẫn còn; bài thử news vẫn còn 2 thẻ. Tải lại toàn trang mới hết. | [DataContext.tsx](D:/Work/LTVN/Last/src/context/DataContext.tsx:267). Chấp nhận mảng rỗng là dữ liệu hợp lệ và cập nhật state. |
| QA-11 | **Trang chi tiết tải vô hạn khi không có nội dung published.** API đã xong nhưng trang sản phẩm hoặc bài viết không tồn tại vẫn hiện “Đang tải…”. Có thể xảy ra khi danh mục trống, toàn bộ là nháp hoặc API lỗi. | [ProductPage.tsx](D:/Work/LTVN/Last/src/pages/ProductPage.tsx:16), [ArticlePage.tsx](D:/Work/LTVN/Last/src/pages/ArticlePage.tsx:16). Tách loading, error, empty và not-found; không dùng độ dài danh sách để suy ra loading. |
| QA-12 | **Bài viết mất nội dung ngoài paragraph.** API trả heading, paragraph, bullet_list và image; website chỉ hiện paragraph, không hiện heading/danh sách/ảnh nội dung. | [DataContext.tsx](D:/Work/LTVN/Last/src/context/DataContext.tsx:198). Render đầy đủ các block mà CMS/schema cho phép; xử lý URL và nội dung an toàn. |
| QA-13 | **Liên kết còn trỏ đến trang Baker Hughes đã đóng.** CTA cuối bài hội thảo và breadcrumb sản phẩm thuộc Baker Hughes dẫn tới `/baker-hughes` → 404. Việc tạm đóng route là chủ ý; lỗi là các đường dẫn còn hoạt động. | [DataContext.tsx](D:/Work/LTVN/Last/src/context/DataContext.tsx:217), [ProductPage.tsx](D:/Work/LTVN/Last/src/pages/ProductPage.tsx:32). Ẩn/đổi đích các link tương ứng hoặc mở lại route theo quyết định sản phẩm. |
| QA-14 | **Nội dung CMS mới không tự có bản tiếng Anh.** Đổi EN với bài “Bản tin thử nghiệm mới”; `html.lang=en` nhưng tiêu đề giữ nguyên tiếng Việt. | [translator.ts](D:/Work/LTVN/Last/src/services/translator.ts). Hiện chỉ dùng từ điển và thay thế mẫu, rồi trả nguyên văn. Cần trường VI/EN trong CMS hoặc quy trình dịch/lưu bản dịch; không coi check:i18n hiện tại là kiểm tra nội dung động. |
| QA-15 | **Link xem website/tài liệu trong admin cố định localhost.** “Xem trang sản phẩm” mở `http://localhost:5173/...`; xem tin và Swagger tương tự. Trên máy người quản trị production, localhost là chính máy đó. | [MachinesPage.tsx](D:/Work/LTVN/Last/admin/src/pages/MachinesPage.tsx:184), [NewsEventsPage.tsx](D:/Work/LTVN/Last/admin/src/pages/NewsEventsPage.tsx:180), [Header.tsx](D:/Work/LTVN/Last/admin/src/components/Header.tsx:47). Cấu hình URL theo môi trường hoặc dùng đường dẫn phù hợp cùng origin. |
| QA-16 | **Admin không dùng được thuận tiện ở màn hình 375 px.** Sidebar cố định chiếm 260 px; phần chính còn 115 px, trang rộng 600 px, chữ/nút bị ép và cắt. | [admin.css](D:/Work/LTVN/Last/admin/src/admin.css:78). Thêm breakpoint và menu thu gọn; kiểm tra bảng/form/modal. [Ảnh bằng chứng](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/admin-mobile.png). |

## Kiểm tra tự động và các phần cần bổ sung

- `npm run build`, `npm run build:admin`, `npm run build:api`: đạt. Hai build Vite ban đầu bị sandbox chặn tạo tiến trình (`EPERM`); chạy lại với quyền phù hợp đã đạt, không ghi nhận đây là lỗi ứng dụng.
- `npm run lint`: đạt.
- `npm --prefix api test`: 1/1 đạt.
- `npm --prefix api run test:e2e`: 1/1 đạt, dùng chuỗi database giả để tránh truy cập database thật.
- `npm --prefix api run lint`: **chưa đạt**, lỗi `typescript(no-floating-promises)` tại [seed.ts](D:/Work/LTVN/Last/api/src/database/seed.ts:1727).
- Không chạy nguyên trạng các script kiểm tra ghi/xóa database như `verify-live-connection` hoặc `verify-drizzle-admin`. Đã thay bằng harness riêng. Test sẵn có chưa đủ bao phủ xác thực, lỗi lưu, mất mạng và trường hợp nội dung rỗng.

Sau khi sửa, cần database test riêng để kiểm tra tạo → đọc lại → sửa → đọc lại → xóa, khóa ngoại/transaction, lưu liên hệ thật vào hệ thống, quyền admin/editor, và dữ liệu thay đổi từ admin phản ánh đúng ngoài website. Các bài này chưa được coi là đạt trong báo cáo hiện tại.

## Thứ tự xử lý đề xuất

1. Bảo vệ API quản trị, loại trường nhạy cảm và tách dữ liệu công khai: QA-01, QA-02, QA-07, QA-08.
2. Làm đúng luồng ghi dữ liệu và phản hồi cho người dùng: QA-03, QA-04, QA-05, QA-09.
3. Sửa crash và trạng thái dữ liệu: QA-06, QA-10, QA-11, QA-12.
4. Hoàn thiện liên kết, ngôn ngữ và quản trị mobile: QA-13 đến QA-16.

## Bằng chứng và cách chạy lại

- [Kết quả trình duyệt](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/browser-results.json).
- [Kết quả đối chứng và bộ lọc](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/targeted-browser-results.json).
- [Kết quả API/ORM](D:/Work/LTVN/Last/artifacts/qa-2026-09-26/api-results.json).

Chạy từ thư mục dự án, sau khi build ba phần và để trống cổng 4173/4174:

```powershell
node artifacts/qa-2026-09-26/browser-audit.mjs
node artifacts/qa-2026-09-26/targeted-browser.mjs
node artifacts/qa-2026-09-26/api-audit.mjs
```

Các script là công cụ chẩn đoán: cần đọc trường `passed` trong JSON, không chỉ dựa vào exit code. Script API sử dụng payload do script trình duyệt ghi ra; chạy theo thứ tự trên. Không script nào thực thi giao dịch lên database thật.

