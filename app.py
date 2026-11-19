"""Birthday Website — server Flask tối giản.

Chạy:
    python app.py                                # http://127.0.0.1:5000
    python app.py --host 0.0.0.0                 # mở từ điện thoại cùng mạng Wi-Fi
    python app.py --host 0.0.0.0 --port 8000

Website không cần backend: toàn bộ hiệu ứng chạy bằng HTML/CSS/JS thuần.
Server chỉ để phục vụ trang và tiện việc mở trên điện thoại.

Nội dung cá nhân hóa (tên, lời chúc, ảnh, nhạc, số lần nhấn bánh):
sửa file static/js/config.js.

Ảnh kỷ niệm: đặt vào static/images/ rồi khai báo trong config.js (mảng `memories`).
Nhạc nền: đặt file vào static/audio/ rồi điền tên file vào `musicSrc` trong config.js.
"""
import argparse

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.after_request
def add_headers(response):
    # Trong lúc phát triển, tránh trình duyệt giữ bản CSS/JS/ảnh cũ.
    if app.debug:
        response.headers["Cache-Control"] = "no-store"
    return response


def parse_args():
    parser = argparse.ArgumentParser(description="Birthday Website server")
    parser.add_argument("--host", default="127.0.0.1", help="mặc định 127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    app.run(host=args.host, port=args.port, debug=args.debug)
