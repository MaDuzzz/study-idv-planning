# 🎯 Study & Individual Plan Tracker

Ứng dụng web cá nhân quản lý kế hoạch học tập và mục tiêu phát triển bản thân với cơ chế **Cảnh báo (Overdue Warning) & Replan chủ động**.

Triển khai trực tiếp và miễn phí trên **GitHub Pages**.

---

## ✨ Tính năng chính

1. **4 Chế độ xem lịch linh hoạt:**
   - **Ngày (Day View):** Quản lý chi tiết công việc hôm nay, checkbox hoàn thành, tiến độ (%), phân loại ưu tiên.
   - **Tuần (Week View):** Xem 7 cột từ Thứ 2 đến Chủ nhật, thêm task nhanh theo từng ngày.
   - **Tháng (Month View):** Lịch lưới tháng tổng quan, chấm cảnh báo ngày có task trễ hạn.
   - **Năm (Year Heatmap):** Đo lường mức độ kiên trì tương tự đồ thị commit của GitHub (tô xanh theo số lượng task hoàn thành).

2. **Cơ chế Cảnh báo & Trung tâm Replan (Core Feature):**
   - Tự động nhận diện các task từ ngày trước chưa hoàn thành.
   - Hiển thị banner cảnh báo và nút badge rung lắc.
   - Trung tâm Replan cho phép xử lý 1 chạm:
     - **Dời sang hôm nay (Move to Today)**
     - **Dời sang ngày mai (Move to Tomorrow)**
     - **Dời tất cả sang hôm nay**
     - Đếm số lần 1 task bị dời (cảnh báo khi $\ge 3$ lần).

3. **Lưu trữ & Sao lưu:**
   - Lưu trữ tự động tại `localStorage` trình duyệt.
   - Tích hợp 2 nút **Sao lưu (Export JSON)** và **Khôi phục (Import JSON)** để chuyển đổi giữa máy tính và điện thoại mà không lo mất dữ liệu.

---

## 🚀 Hướng dẫn kích hoạt GitHub Pages

1. Vào trang Repository của bạn trên GitHub.
2. Chọn tab **Settings** > ở menu bên trái chọn **Pages**.
3. Tại mục **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` và thư mục `/ (root)`
   - Nhấn **Save**.
4. Chờ 1 phút, website sẽ hoạt động tại địa chỉ:  
   `https://<username>.github.io/study-idv-planning/`