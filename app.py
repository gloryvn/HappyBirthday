"""Minimal 3D Photocard Showcase - Flask server.

Chạy:
    python app.py                          # http://127.0.0.1:5000
    python app.py --host 0.0.0.0 --https   # thử Gyroscope trên điện thoại (cần `pip install cryptography`)

Ảnh card: đặt front.png / back.png (hoặc .webp / .jpg) vào static/images/.
PNG có nền trong suốt sẽ giữ nguyên hình dáng viền (ví dụ răng cưa của tem).
"""
import argparse
import io
from functools import lru_cache
from pathlib import Path

from flask import Flask, abort, render_template, request, send_file, url_for

try:
    from PIL import Image, ImageOps
except ImportError:  # vẫn chạy được, chỉ là không tối ưu ảnh
    Image = None

app = Flask(__name__)

IMAGE_DIR = Path(app.static_folder) / "images"
CACHE_DIR = Path(app.instance_path) / "image-cache"
EXTENSIONS = ("png", "webp", "jpg", "jpeg")

# Ảnh chỉ hiển thị tối đa ~440 CSS px; 1600 px là đủ nét cả trên màn hình retina.
MAX_IMAGE_EDGE = 1600
WEBP_QUALITY = 90


def find_source(name):
    """Trả về Path của ảnh đầu tiên tồn tại (ưu tiên png), hoặc None."""
    for ext in EXTENSIONS:
        path = IMAGE_DIR / f"{name}.{ext}"
        if path.is_file():
            return path
    return None


def has_alpha(img):
    return img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)


@lru_cache(maxsize=8)
def optimized_image(path_str, mtime_ns):
    """Resize + nén ảnh nguồn sang WebP, cache theo mtime của file."""
    path = Path(path_str)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{path.stem}-{mtime_ns}.webp"

    if cache_path.is_file():
        return cache_path.read_bytes()

    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        if max(img.size) > MAX_IMAGE_EDGE:
            img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.Resampling.LANCZOS)
        if not has_alpha(img):
            img = img.convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, "WEBP", quality=WEBP_QUALITY, method=6)
    data = buffer.getvalue()

    cache_path.write_bytes(data)
    for old in CACHE_DIR.glob(f"{path.stem}-*.webp"):
        if old != cache_path:
            try:
                old.unlink()
            except OSError:
                pass
    return data


def find_image(name):
    """Trả về URL của ảnh đã tối ưu, hoặc None nếu không có ảnh."""
    source = find_source(name)
    if source is None:
        return None
    # mtime trên URL để thay ảnh là trình duyệt tải bản mới ngay.
    return url_for("media", name=name, v=source.stat().st_mtime_ns)


@app.get("/media/<name>")
def media(name):
    if name not in ("front", "back"):
        abort(404)
    source = find_source(name)
    if source is None:
        abort(404)

    if Image is None:
        return send_file(source)

    mtime_ns = source.stat().st_mtime_ns
    try:
        data = optimized_image(str(source), mtime_ns)
    except Exception:
        # Ảnh lỗi/định dạng lạ: vẫn phục vụ file gốc.
        return send_file(source)

    response = app.response_class(data, mimetype="image/webp")
    response.set_etag(f"{mtime_ns}-{len(data)}")
    response.headers["Cache-Control"] = "public, max-age=86400"
    return response.make_conditional(request)


@app.route("/")
def index():
    front = find_image("front")
    back = find_image("back")
    return render_template("index.html", front=front, back=back)


@app.after_request
def add_headers(response):
    # Trong lúc phát triển, tránh trình duyệt giữ bản CSS/JS/ảnh cũ.
    if app.debug:
        response.headers["Cache-Control"] = "no-store"
    return response


def parse_args():
    parser = argparse.ArgumentParser(description="Photocard Showcase server")
    parser.add_argument("--host", default="127.0.0.1", help="mặc định 127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--debug", action="store_true")
    parser.add_argument(
        "--https",
        action="store_true",
        help="dùng chứng chỉ tự ký (DeviceOrientation yêu cầu HTTPS trên điện thoại)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    app.run(
        host=args.host,
        port=args.port,
        debug=args.debug,
        ssl_context="adhoc" if args.https else None,
    )
