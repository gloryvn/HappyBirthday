# Birthday Website — Thiệp sinh nhật tương tác

Website chúc mừng sinh nhật 3 giai đoạn, chạy hoàn toàn trên trình duyệt (HTML/CSS/JS thuần, không cần backend):

1. **Màn hình chào** — hộp quà rung nhẹ, nhấn "Open Your Surprise" để mở quà.
2. **Chiếc bánh kem** — nhấn vào bánh đủ 50 lần (mặc định). Bánh được "bơm căng" khi nhấn liên tục, thu nhỏ khi nghỉ. Đủ lần → nến bùng sáng, pháo giấy, mở khóa trang chúc mừng.
3. **Trang chúc mừng** — pháo hoa, album kỷ niệm kiểu Polaroid (có Lightbox), bức thư lời chúc, phong bì mở ra lời nhắn đặc biệt, nút Replay.

## Chạy website

```bash
pip install -r requirements.txt   # chỉ cần Flask
python app.py                     # mở http://127.0.0.1:5000
```

Mở trên điện thoại (cùng mạng Wi-Fi):

```bash
python app.py --host 0.0.0.0
```

Hoặc mở thẳng file `templates/index.html`? Không — vì file nằm trong `templates/`, cách dễ nhất vẫn là chạy `python app.py`, hoặc dùng Live Server mở trực tiếp cũng được (đường dẫn asset đã viết tương đối).

## Cá nhân hóa — chỉ sửa 1 file: `static/js/config.js`

| Muốn đổi | Chỗ sửa trong config.js |
| --- | --- |
| Tên người nhận | `name` |
| Số lần nhấn bánh | `taps` |
| Lời chúc phần hero | `heroText` |
| Bức thư lời chúc | `wishes` (mỗi phần tử = 1 đoạn) |
| Lời nhắn trong phong bì | `lastMessage` (giữ ngắn để vừa lá thư) |
| Ảnh kỷ niệm + caption | `photos` |
| Nhạc nền | `music` |
| Màu sắc chủ đạo | `colors` (pink / cream / cherry / gold) |
| Thông điệp các mốc nhấn bánh | `milestones` |

## Thêm ảnh kỷ niệm

1. Đặt ảnh vào `static/images/` (khuyên dùng `memory-01.jpg`, `memory-02.jpg`, ...).
2. Khai báo trong `config.js` → `photos`: `{ src: "static/images/memory-01.jpg", caption: "..." }`.

Ảnh chưa có file sẽ tự hiển thị ô trang trí pastel — website vẫn đẹp khi chưa thay ảnh.

## Nhạc nền

- Không bắt buộc. Đặt file MP3 vào `static/audio/birthday-music.mp3` (hoặc đổi tên trong `music`).
- Nhạc chỉ phát sau tương tác đầu tiên; nút 🔊 ở góc phải trên để bật/tắt.
- Âm hiệu ứng (nhấn bánh, chuông) được tạo bằng WebAudio, không cần file.

## Cấu trúc thư mục

```
├── app.py                  # server Flask tối giản (chỉ phục vụ trang)
├── templates/index.html    # cấu trúc trang + SVG bánh kem / hộp quà
├── static/
│   ├── css/style.css       # toàn bộ giao diện
│   ├── js/
│   │   ├── config.js       # ★ cấu hình tập trung — sửa file này
│   │   ├── main.js         # điều phối stage, phong bì, replay, âm thanh
│   │   ├── cake.js         # cơ chế nhấn bánh, bơm căng/thu nhỏ
│   │   ├── animations.js   # canvas: sao, confetti, pháo hoa, trái tim
│   │   └── gallery.js      # album Polaroid + Lightbox
│   ├── images/             # ảnh kỷ niệm
│   └── audio/              # nhạc nền (tùy chọn)
```

## Kiểm thử nhanh

- Mỗi lần chạm bánh chỉ tăng đúng 1 (dùng `pointerdown`, không dùng `click`); nhấn nhanh bất thường (<80ms) không được tính.
- Giữ tay trên bánh chỉ giữ bánh không xẹp; buông ra quá 250ms bánh xẹp dần — phải nhấn liên tục mới giữ được độ căng.
- Đạt đủ số lần nhấn → bánh phát sáng, nến phóng to và nút mở khóa trang chúc mừng mới xuất hiện.
- Replay đặt lại toàn bộ: kích thước bánh, phong bì, trạng thái nhạc.
