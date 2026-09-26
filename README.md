# 🎯 Study & Individual Plan Tracker

Ứng dụng web cá nhân quản lý kế hoạch học tập và mục tiêu phát triển bản thân với cơ chế **Cảnh báo (Overdue Warning) & Replan chủ động**, tích hợp sẵn **Phân quyền Admin & Khách (Chỉ xem)**.

Triển khai trực tiếp và miễn phí trên **GitHub Pages**.

---

## ✨ Tính năng chính

1. **Phân quyền người dùng (Role-based Access Control):**
   - **Khách (Chưa đăng nhập):** Chế độ chỉ xem an toàn (Read-only). Được phép duyệt xem toàn bộ kế hoạch (Ngày, Tuần, Tháng, Năm Heatmap), nhưng **bị khóa hoàn toàn** các thao tác: Thêm task, sửa, xóa, tích hoàn thành, dời lịch Replan, Sao lưu (Export) và Nhập (Import).
   - **Admin (Quản trị viên):** Toàn quyền kiểm soát và cập nhật kế hoạch.
   - *Mật khẩu Admin mặc định:* `admin123` (có thể đổi bất cứ lúc nào qua menu Admin góc phải).

2. **4 Chế độ xem lịch linh hoạt:**
   - **Ngày (Day View):** Quản lý chi tiết công việc hôm nay, checkbox hoàn thành, tiến độ (%), phân loại ưu tiên.
   - **Tuần (Week View):** Xem 7 cột từ Thứ 2 đến Chủ nhật, thêm task nhanh theo từng ngày.
   - **Tháng (Month View):** Lịch lưới tháng tổng quan, chấm cảnh báo ngày có task trễ hạn.
   - **Năm (Year Heatmap):** Đo lường mức độ kiên trì tương tự đồ thị commit của GitHub (tô xanh theo số lượng task hoàn thành).

3. **Cơ chế Cảnh báo & Trung tâm Replan (Core Feature):**
   - Tự động nhận diện các task từ ngày trước chưa hoàn thành.
   - Dời lịch linh hoạt 1 chạm:
     - **Dời sang hôm nay (Move to Today)**
     - **Dời sang ngày mai (Move to Tomorrow)**
     - **Dời sang tuần sau (+7 ngày)**
     - **Tự chọn ngày bất kỳ qua ô lịch (Custom Date Picker)**
     - **Dời tất cả sang hôm nay / tuần sau**
     - Đếm số lần 1 task bị dời (cảnh báo khi $\ge 3$ lần).

4. **Lưu trữ & Sao lưu:**
   - Lưu trữ tự động tại `localStorage` trình duyệt.
   - Tích hợp 2 nút **Sao lưu (Export JSON)** và **Khôi phục (Import JSON)** để chuyển đổi giữa các thiết bị.

---

## 🚀 Hướng dẫn kích hoạt GitHub Pages

1. Đẩy code lên GitHub:
   ```bash
   git add .
   git commit -m "feat: add auth & guest read-only mode"
   git push origin main
   ```
2. Vào trang Repository của bạn trên GitHub.
3. Chọn tab **Settings** > ở menu bên trái chọn **Pages**.
4. Tại mục **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` và thư mục `/ (root)`
   - Nhấn **Save**.
5. Chờ 1 phút, website sẽ hoạt động tại địa chỉ:  
   `https://<username>.github.io/study-idv-planning/`