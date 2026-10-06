BẢNG LƯƠNG OFFLINE — PWA

1. CẤU TRÚC
- index.html: giao diện
- app.js: logic và dữ liệu
- styles.css: giao diện responsive
- manifest.webmanifest: cấu hình PWA
- sw.js: cache offline
- icons/: icon ứng dụng

2. CHẠY OFFLINE
Khuyến nghị chạy bằng localhost:
- Windows có Python: mở Terminal tại thư mục và chạy:
  python -m http.server 8080
- Mở: http://localhost:8080
- Trình duyệt sẽ cache PWA; sau lần đầu có thể sử dụng offline.

Không nên mở trực tiếp bằng file:// nếu muốn Service Worker/PWA hoạt động, vì trình duyệt chặn Service Worker trên file://.

3. CÀI TRÊN ĐIỆN THOẠI
Để có PWA cài được trên điện thoại, app phải được phục vụ qua HTTPS hoặc localhost trong môi trường phù hợp.
Nếu bạn đưa bộ này lên GitHub Pages/Netlify/Cloudflare Pages thì mở link HTTPS trên điện thoại → menu trình duyệt → Thêm vào màn hình chính/Cài ứng dụng.

4. DỮ LIỆU
Dữ liệu lưu trong LocalStorage trên thiết bị.
Vào Cài đặt → Xuất JSON để sao lưu.
Khi đổi máy → Nhập JSON.
Không có máy chủ, không đồng bộ tự động giữa các thiết bị.

5. CÔNG THỨC
- Lương cơ bản: 4.500.000 / 26 ngày
- Phụ cấp: 1.000.000 / 26 ngày
- VS công nghiệp: 10%
- VS tạp vụ: 7%
- Không có epoxy
- Tổng lương = lương ngày công + phụ cấp ngày công + tiền 10% + tiền 7%.
GitHub Pages deployment
