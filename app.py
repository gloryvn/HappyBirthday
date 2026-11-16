"""Minimal 3D Photocard Showcase - Flask server.

Chạy:
    python app.py                          # http://127.0.0.1:5000
    python app.py --host 0.0.0.0 --https   # thử Gyroscope trên điện thoại (cần `pip install cryptography`)

Ảnh card: đặt front.png / back.png (hoặc .webp / .jpg) vào static/images/.
PNG có nền trong suốt sẽ giữ nguyên hình dáng viền (ví dụ răng cưa của tem).
Ảnh được tự resize (tối đa 1600 px) và nén sang WebP khi phục vụ, có cache
trong instance/image-cache/. Cần Pillow (`pip install -r requirements.txt`).
"""
import argparse
import io
import os
import threading
import time
from contextlib import contextmanager
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

# Trần an toàn: ảnh quá lớn sẽ được phục vụ nguyên bản thay vì decode
# (decode ảnh PNG cực lớn có thể vượt giới hạn RAM của instance).
MAX_OPTIMIZE_PIXELS = 30_000_000

# Flask dev server chạy đa luồng: 2 request ảnh giống nhau (img + CSS mask)
# có thể cùng decode một ảnh lớn. Xếp hàng để mỗi lúc chỉ có 1 ảnh được xử lý.
_IMAGE_LOCK = threading.Lock()
_LOCK_FILE = ".convert.lock"


class ImageTooLarge(Exception):
    pass


def _lock_handle(handle):
    """Khóa file liên tiến trình (Windows: msvcrt, POSIX: fcntl)."""
    if os.name == "nt":
        import msvcrt

        while True:
            try:
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                return
            except OSError:
                time.sleep(0.05)
    else:
        import fcntl

        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)


def _unlock_handle(handle):
    if os.name == "nt":
        import msvcrt

        try:
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        except OSError:
            pass
    else:
        import fcntl

        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


@contextmanager
def conversion_lock():
    """Chỉ một ảnh được convert tại một thời điểm, kể cả nhiều process."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    lock_path = CACHE_DIR / _LOCK_FILE
    with _IMAGE_LOCK:
        with open(lock_path, "a+b") as handle:
            if handle.seek(0, os.SEEK_END) == 0:
                handle.write(b"\0")
                handle.flush()
            _lock_handle(handle)
            try:
                yield
            finally:
                _unlock_handle(handle)


def find_source(name):
    """Trả về Path của ảnh đầu tiên tồn tại (ưu tiên png), hoặc None."""
    for ext in EXTENSIONS:
        path = IMAGE_DIR / f"{name}.{ext}"
        if path.is_file():
            return path
    return None


def has_transparency(img):
    """True nếu ảnh thực sự có pixel trong suốt (không chỉ là mode RGBA)."""
    if img.mode in ("RGBA", "LA"):
        return img.getchannel("A").getextrema()[0] < 255
    return img.mode == "P" and "transparency" in img.info


@lru_cache(maxsize=8)
def optimized_image(path_str, mtime_ns):
    """Resize + nén ảnh nguồn sang WebP, cache theo mtime của file."""
    path = Path(path_str)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{path.stem}-{mtime_ns}.webp"

    if cache_path.is_file():
        return cache_path.read_bytes()

    with conversion_lock():
        # Request/process khác có thể đã tạo xong file trong lúc ta chờ lock.
        if cache_path.is_file():
            return cache_path.read_bytes()

        with Image.open(path) as img:
            if img.width * img.height > MAX_OPTIMIZE_PIXELS:
                raise ImageTooLarge

            # JPEG có thể decode thẳng ở kích thước nhỏ hơn -> tiết kiệm RAM.
            if img.format == "JPEG":
                img.draft("RGB", (MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))

            # in_place tránh copy toàn bộ ảnh (tiết kiệm ~100MB với ảnh lớn).
            img = ImageOps.exif_transpose(img, in_place=True) or img
            if max(img.size) > MAX_IMAGE_EDGE:
                img.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.Resampling.LANCZOS)
            if not has_transparency(img):
                img = img.convert("RGB")
            buffer = io.BytesIO()
            img.save(buffer, "WEBP", quality=WEBP_QUALITY, method=6)
        data = buffer.getvalue()

        # Ghi file tạm rồi đổi tên: không ai đọc phải file cache đang ghi dở.
        tmp_path = cache_path.with_name(cache_path.name + ".tmp")
        tmp_path.write_bytes(data)
        os.replace(tmp_path, cache_path)
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
    except ImageTooLarge:
        # Ảnh quá lớn để decode an toàn trong RAM -> trả file gốc.
        return send_file(source)
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
