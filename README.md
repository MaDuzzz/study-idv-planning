# 🎯 Study & Individual Plan Tracker

Ứng dụng web cá nhân và đội ngũ quản lý kế hoạch học tập, mục tiêu cá nhân và soạn thảo tài liệu đính kèm với kiến trúc **Multi-Tenant Đám mây (Google Auth & Firestore)**, **Lưu trữ Google Drive cá nhân**, và **Trình soạn thảo văn bản Word (.docx) WYSIWYG trực tiếp trên trình duyệt**.

Hỗ trợ giao diện **Dark Mode độ tương phản cao**, co giãn thông minh (**Elastic Responsive**) tối ưu cho các màn hình **14 inch, 24 inch và 27 inch (2K/4K)**. Hoạt động 100% không cần cài đặt Node.js hay build bước nào (Zero-build client-side), triển khai trực tiếp trên **GitHub Pages** hoặc **Vercel**.

---

## ✨ Tính năng nổi bật

### 1. 👥 Multi-Tenant & Google Authentication
- **Cô lập dữ liệu người dùng tuyệt đối:** Mỗi người khi bấm **"Đăng nhập Google"** sẽ chỉ thấy và thao tác trên danh sách nhiệm vụ, tài liệu và liên kết của riêng mình (`users/{uid}/tasks`).
- Người dùng khác đăng nhập bằng Google Account khác sẽ có không gian làm việc độc lập hoàn toàn, không thể xem hay sửa task của nhau.
- **Chế độ Dual-Mode:** 
  - Hoạt động ngay lập tức ở chế độ **Local Sandbox** (lưu trên `localStorage` trình duyệt).
  - Kết nối đám mây chỉ bằng 1 thao tác dán mã JSON cấu hình Firebase miễn phí.

### 2. 📝 Trình soạn thảo Word (.docx) & Quản lý Tài liệu trực tiếp
- Mỗi nhiệm vụ (Task) đi kèm một **Trung tâm tài liệu & chi tiết**:
  - **Mở & Đọc file `.docx` từ máy tính:** Tích hợp `Mammoth.js` đọc trực tiếp file Word từ ổ cứng vào khung soạn thảo.
  - **Soạn thảo WYSIWYG phong cách Microsoft Word:** Tiêu đề (H1, H2, H3), in đậm, in nghiêng, gạch chân, trích dẫn, danh sách số, danh sách chấm, và **chèn bảng số liệu (Table)**.
  - **Tự động lưu (Auto-save):** Mọi thay đổi nội dung được tự động lưu sau mỗi 500ms kèm đếm số từ và số ký tự thời gian thực.
  - **Tải file `.docx` về máy:** Xuất trực tiếp sang file `.docx` chuẩn Microsoft Word nhờ `html-docx-js` và `FileSaver.js`.

### 3. 📂 Tích hợp Google Drive API (Tận dụng 15GB miễn phí của từng User)
- **Lưu trữ đám mây an toàn:** Nút **"Lưu vào Drive"** sẽ tự động tạo thư mục `Study-Planner-Documents` trên Google Drive của chính tài khoản người dùng và lưu file Word vào đó.
- **Quyền hạn tối thiểu (`drive.file`):** Ứng dụng chỉ có quyền đọc/ghi các file do chính ứng dụng tạo ra, đảm bảo an toàn bảo mật tuyệt đối cho Google Drive của người dùng.
- **Mở nhanh trên Google Docs:** Sau khi lưu lên Drive, hiển thị nút tắt chuyển hướng mở trực tiếp tài liệu trên **Google Docs**.

### 4. 🔗 Quản lý Tài nguyên & Liên kết ngoài (Related Links)
- Đính kèm không giới hạn liên kết tài liệu, slide bài giảng, link tham khảo vào từng task.
- Tự động lấy **Favicon logo** thương hiệu của website, hỗ trợ nút sao chép link 1 chạm và mở tab mới.

### 5. 🗓️ 4 Chế độ xem & Trung tâm Replan chủ động
- **Ngày (Day View):** Quản lý chi tiết công việc hôm nay, checkbox hoàn thành, tiến độ (%), phân loại ưu tiên.
- **Tuần (Week View):** Xem 7 cột từ Thứ 2 đến Chủ nhật, kéo thả task trực tiếp giữa các ngày để đổi lịch.
- **Tháng (Month View):** Lịch lưới tháng tổng quan, bấm vào task để mở ngay tài liệu soạn thảo.
- **Năm (Year Heatmap):** Đo lường mức độ kiên trì tương tự đồ thị commit của GitHub.
- **Trung tâm Replan:** Tự động gom các task quá hạn và hỗ trợ dời sang *Hôm nay*, *Ngày mai*, *Tuần sau* hoặc *Ngày bất kỳ*.

---

## ⚡ Hướng dẫn cấu hình Firebase & Google Drive trong 2 phút

1. Truy cập [console.firebase.google.com](https://console.firebase.google.com) và tạo một Project miễn phí.
2. Tại mục **Authentication** &rarr; Chọn thẻ **Sign-in method** &rarr; Bật **Google**.
3. Tại mục **Firestore Database** &rarr; Bấm **Create Database** (chọn chế độ test rules hoặc gán quy tắc `request.auth.uid == userId`).
4. Vào **Project Settings** (biểu tượng bánh răng) &rarr; Kéo xuống mục **Your apps** &rarr; Tạo Web App và copy đoạn `firebaseConfig`.
5. Mở ứng dụng &rarr; Bấm vào icon đám mây **"Cấu hình Firebase"** ở thanh trên cùng &rarr; Dán mã JSON và bấm **Lưu & Kết nối**.
6. Giờ đây bạn và bất kỳ ai đều có thể bấm **"Đăng nhập Google"** để tận hưởng hệ thống đồng bộ đám mây và Google Drive hoàn toàn miễn phí!

---

## 🚀 Triển khai (Deployment)

### Lựa chọn 1: GitHub Pages
1. Đẩy mã nguồn lên GitHub repository.
2. Vào **Settings** &rarr; **Pages** &rarr; Chọn nhánh `main` và thư mục `/ (root)`.
3. Nhấn **Save**.

### Lựa chọn 2: Vercel
1. Kết nối kho GitHub với Vercel.
2. Chọn Framework Preset: **Other** (Static Site).
3. Bấm **Deploy**. Không cần cấu hình build command nào.