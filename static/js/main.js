/* ==========================================================================
   Minimal 3D Photocard Showcase - main.js
   Vanilla JS, CSS 3D transforms, requestAnimationFrame.
   ========================================================================== */
(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     Config & strings
     ---------------------------------------------------------------------- */
  const CONFIG = {
    dragSensitivity: 0.4,   // độ xoay (deg) trên mỗi pixel kéo
    inertiaDamping: 2.6,    // càng lớn, quán tính tắt càng nhanh
    maxSpin: 900,           // deg/s tối đa khi thả chuột
    hoverTilt: 13,          // góc nghiêng tối đa theo chuột (deg)
    gyroTilt: 24,           // góc nghiêng tối đa theo cảm biến (deg)
    gyroRange: 35,          // độ nghiêng thiết bị tương ứng góc tối đa
    tiltRate: 7,            // tốc độ làm mượt (lerp) của nghiêng
    goalRate: 6.5,          // tốc độ về đích khi Flip / Reset
    floatAmp: 0.012,        // biên độ lơ lửng, tính theo bề rộng card
    tapMs: 320,             // khoảng thời gian tối đa giữa 2 lần chạm
    tapSlop: 8,             // px tối đa để vẫn tính là "chạm"
    gyroWaitMs: 1500,       // chờ dữ liệu cảm biến đầu tiên
    toastMs: 2800,
    startDate: "2024-02-06", // 06/02/2024 - mốc đếm ngày trên mặt sau
  };

  const STR = {
    hintPointer: "Drag to rotate · Double click to reset",
    hintTouch: "Drag to rotate · Double tap to reset",
    unsupported: "Motion sensors aren’t supported here. Touch and drag still work.",
    denied: "Motion access was declined. You can still drag the card.",
    noSensor: "No motion data received. A motion sensor and an HTTPS connection are required.",
    motionOn: "Motion on",
    motionOff: "Motion off",
  };

  const RAD = Math.PI / 180;

  /* ------------------------------------------------------------------------
     Helpers
     ---------------------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  // Độ lệch so với mặt card gần nhất (chu kỳ 180°) -> [-90, 90)
  const wrapDev = (a) => ((((a + 90) % 180) + 180) % 180) - 90;
  const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

  const el = {
    stage: $("#stage"),
    card: $("#card"),
    shadow: $("#shadow"),
    aura: $("#aura"),
    hint: $("#hint"),
    dayCount: $("#day-count"),
    toast: $("#toast"),
    flip: $("#btn-flip"),
    reset: $("#btn-reset"),
    motion: $("#btn-motion"),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ------------------------------------------------------------------------
     State
     ---------------------------------------------------------------------- */
  const state = {
    yaw: 0,               // xoay quanh trục Y (deg), người dùng điều khiển
    pitch: 0,             // xoay quanh trục X (deg)
    vYaw: 0,              // vận tốc quán tính (deg/s)
    vPitch: 0,
    tilt: { x: 0, y: 0 }, // nghiêng hiện tại (đã làm mượt)
    goal: null,           // {yaw, pitch} khi đang Flip / Reset
    dragging: false,
    hover: false,
    pointer: { x: 0, y: 0 }, // vị trí chuột chuẩn hoá [-1, 1]
    motionOn: false,
    gyro: { x: 0, y: 0 },    // nghiêng mục tiêu từ cảm biến
    idle: 1,                 // hệ số biên độ lơ lửng
  };

  const size = { w: 300, h: 464 };

  function measure() {
    size.w = el.card.offsetWidth || size.w;
    size.h = el.card.offsetHeight || size.h;
  }

  // Card lấy tỷ lệ theo ảnh front để không bị méo / cắt viền
  function applyRatio(img) {
    if (!img.naturalWidth || !img.naturalHeight) return;
    document.documentElement.style.setProperty("--ratio", (img.naturalWidth / img.naturalHeight).toFixed(4));
    measure();
  }

  /* ------------------------------------------------------------------------
     Images: load / error handling
     ---------------------------------------------------------------------- */
  function initImages() {
    document.querySelectorAll(".face").forEach((face) => {
      const img = face.querySelector("img");
      if (!img) { face.classList.add("is-missing"); return; }
      const isFront = face.classList.contains("face--front");
      const ok = () => {
        face.classList.add("is-loaded");
        if (isFront) applyRatio(img);
        // Giải mã sẵn, tránh khựng khi lần đầu lật sang mặt sau.
        if (typeof img.decode === "function") img.decode().catch(() => {});
      };
      const fail = () => face.classList.add("is-missing");
      img.addEventListener("load", ok);
      img.addEventListener("error", fail);
      if (img.complete) (img.naturalWidth > 0 ? ok : fail)();
    });
  }

  /* ------------------------------------------------------------------------
     Toast
     ---------------------------------------------------------------------- */
  let toastTimer = 0;
  function notify(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), CONFIG.toastMs);
  }

  /* ------------------------------------------------------------------------
     Card actions
     ---------------------------------------------------------------------- */
  function flipCard() {
    state.vYaw = state.vPitch = 0;
    state.goal = {
      yaw: (Math.round(state.yaw / 180) + 1) * 180,
      pitch: Math.round(state.pitch / 360) * 360,
    };
  }

  function resetCard() {
    state.vYaw = state.vPitch = 0;
    state.goal = {
      yaw: Math.round(state.yaw / 360) * 360,
      pitch: Math.round(state.pitch / 360) * 360,
    };
    Motion.recalibrate();
  }

  /* ------------------------------------------------------------------------
     Pointer input (mouse + touch + pen)
     ---------------------------------------------------------------------- */
  const Input = (() => {
    let drag = null;
    let lastTap = 0;

    function setHover(e) {
      state.pointer.x = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
      state.pointer.y = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
      state.hover = true;
    }

    function onDown(e) {
      if (e.target.closest(".controls")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (drag) return; // chỉ theo dõi một ngón tay

      drag = {
        id: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      state.dragging = true;
      state.goal = null;
      state.vYaw = state.vPitch = 0;
      el.stage.classList.add("is-dragging");
      try { el.stage.setPointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ }
    }

    function onMove(e) {
      if (drag && e.pointerId === drag.id) {
        const now = performance.now();
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        const dt = Math.max(1, now - drag.lastT) / 1000;

        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > CONFIG.tapSlop) {
          drag.moved = true;
        }

        const dYaw = dx * CONFIG.dragSensitivity;
        const dPitch = -dy * CONFIG.dragSensitivity;
        state.yaw += dYaw;
        state.pitch += dPitch;

        // Vận tốc làm mượt để thả tay có quán tính tự nhiên
        const k = 0.5;
        state.vYaw = clamp(state.vYaw * (1 - k) + (dYaw / dt) * k, -CONFIG.maxSpin, CONFIG.maxSpin);
        state.vPitch = clamp(state.vPitch * (1 - k) + (dPitch / dt) * k, -CONFIG.maxSpin, CONFIG.maxSpin);

        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.lastT = now;
      } else if (e.pointerType === "mouse" && !drag) {
        setHover(e);
      }
    }

    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const now = performance.now();

      // Dừng tay trước khi thả -> không còn quán tính
      if (now - drag.lastT > 90) state.vYaw = state.vPitch = 0;

      // Double click / double tap -> reset
      if (e.type === "pointerup" && !drag.moved) {
        if (now - lastTap < CONFIG.tapMs) {
          lastTap = 0;
          resetCard();
        } else {
          lastTap = now;
        }
      } else {
        lastTap = 0;
      }

      state.dragging = false;
      drag = null;
      el.stage.classList.remove("is-dragging");
      try { el.stage.releasePointerCapture(e.pointerId); } catch (_) { /* bỏ qua */ }
      if (e.pointerType === "mouse") setHover(e);
    }

    function init() {
      el.stage.addEventListener("pointerdown", onDown);
      el.stage.addEventListener("pointermove", onMove);
      el.stage.addEventListener("pointerup", onUp);
      el.stage.addEventListener("pointercancel", onUp);
      el.stage.addEventListener("contextmenu", (e) => e.preventDefault());
      document.documentElement.addEventListener("mouseleave", () => { state.hover = false; });
      window.addEventListener("blur", () => { state.hover = false; });
    }

    return { init };
  })();

  /* ------------------------------------------------------------------------
     Motion (DeviceOrientationEvent)
     ---------------------------------------------------------------------- */
  const Motion = (() => {
    let base = null;
    let gotData = false;
    let waitTimer = 0;

    function screenAngle() {
      const a = (screen.orientation ? screen.orientation.angle : window.orientation) || 0;
      return ((a % 360) + 360) % 360;
    }

    function onOrientation(e) {
      if (e.beta == null || e.gamma == null) return;
      gotData = true;

      let b = e.beta;
      let g = e.gamma;
      switch (screenAngle()) {
        case 90:  [b, g] = [-g, b]; break;
        case 180: [b, g] = [-b, -g]; break;
        case 270: [b, g] = [g, -b]; break;
        default: break;
      }

      // Lấy tư thế cầm máy đầu tiên làm mốc để card bắt đầu ở trạng thái thẳng
      if (!base) base = { b, g };
      const db = wrap180(b - base.b);
      const dg = wrap180(g - base.g);

      state.gyro.x = clamp(db / CONFIG.gyroRange, -1, 1) * CONFIG.gyroTilt;
      state.gyro.y = clamp(-dg / CONFIG.gyroRange, -1, 1) * CONFIG.gyroTilt;
    }

    function setUI(on) {
      el.motion.setAttribute("aria-pressed", String(on));
      el.motion.setAttribute("aria-label", on ? "Turn motion off" : "Turn motion on");
      el.motion.title = on ? "Motion: on" : "Motion: off";
    }

    function stop() {
      window.removeEventListener("deviceorientation", onOrientation);
      clearTimeout(waitTimer);
      state.motionOn = false;
      state.gyro.x = state.gyro.y = 0;
      base = null;
      setUI(false);
    }

    async function start() {
      if (!("DeviceOrientationEvent" in window)) {
        notify(STR.unsupported);
        return;
      }

      // Phải gọi trực tiếp trong sự kiện click (iOS yêu cầu thao tác của người dùng)
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
          const result = await DeviceOrientationEvent.requestPermission();
          if (result !== "granted") {
            notify(STR.denied);
            return;
          }
        } catch (_) {
          notify(STR.denied);
          return;
        }
      }

      gotData = false;
      base = null;
      window.addEventListener("deviceorientation", onOrientation);
      state.motionOn = true;
      setUI(true);

      waitTimer = setTimeout(() => {
        if (!gotData && state.motionOn) {
          stop();
          notify(STR.noSensor);
        }
      }, CONFIG.gyroWaitMs);
    }

    function toggle() {
      if (state.motionOn) {
        stop();
        notify(STR.motionOff);
      } else {
        start();
      }
    }

    function recalibrate() { base = null; }

    function init() {
      window.addEventListener("orientationchange", recalibrate);
      setUI(false);
    }

    return { init, toggle, recalibrate };
  })();

  /* ------------------------------------------------------------------------
     Day counter (back face)
     ---------------------------------------------------------------------- */
  const DayCounter = (() => {
    // Tính theo ngày địa phương. Dùng UTC để tránh lệch do DST.
    const [startYear, startMonth, startDay] = CONFIG.startDate.split("-").map(Number);
    const START = Date.UTC(startYear, startMonth - 1, startDay);
    const MS_DAY = 86400000;
    let timer = 0;

    function count() {
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.max(0, Math.round((today - START) / MS_DAY));
    }

    function schedule() {
      clearTimeout(timer);
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 250);
      timer = setTimeout(update, Math.max(1000, next - now));
    }

    function update() {
      el.dayCount.textContent = String(count());
      schedule();
    }

    function init() {
      if (!el.dayCount) return;
      update();
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) update();
      });
    }

    return { init };
  })();

  /* ------------------------------------------------------------------------
     Simulation step
     ---------------------------------------------------------------------- */
  function update(dt) {
    // 1. Flip / Reset: ease về góc đích
    if (state.goal) {
      const k = 1 - Math.exp(-CONFIG.goalRate * dt);
      state.yaw += (state.goal.yaw - state.yaw) * k;
      state.pitch += (state.goal.pitch - state.pitch) * k;
      if (Math.abs(state.goal.yaw - state.yaw) < 0.05 && Math.abs(state.goal.pitch - state.pitch) < 0.05) {
        // Chuẩn hoá về [0, 360) để số góc không tăng vô hạn (hình ảnh không đổi)
        state.yaw = (((state.goal.yaw % 360) + 360) % 360);
        state.pitch = (((state.goal.pitch % 360) + 360) % 360);
        state.goal = null;
      }
    } else if (!state.dragging) {
      // 2. Quán tính sau khi thả
      state.yaw += state.vYaw * dt;
      state.pitch += state.vPitch * dt;
      const damp = Math.exp(-CONFIG.inertiaDamping * dt);
      state.vYaw *= damp;
      state.vPitch *= damp;
      if (Math.abs(state.vYaw) < 1) state.vYaw = 0;
      if (Math.abs(state.vPitch) < 1) state.vPitch = 0;
    }

    // 3. Nghiêng nhẹ: cảm biến > chuột > 0 (luôn lerp nên không bị giật khi đổi nguồn)
    let tx = 0;
    let ty = 0;
    if (!state.dragging) {
      if (state.motionOn) {
        tx = state.gyro.x;
        ty = state.gyro.y;
      } else if (state.hover) {
        tx = -state.pointer.y * CONFIG.hoverTilt;
        ty = state.pointer.x * CONFIG.hoverTilt;
      }
    }
    const k = 1 - Math.exp(-CONFIG.tiltRate * dt);
    state.tilt.x += (tx - state.tilt.x) * k;
    state.tilt.y += (ty - state.tilt.y) * k;

    // 4. Lơ lửng yếu đi khi đang tương tác
    const idleTarget = state.dragging || state.goal ? 0.3 : 1;
    state.idle += (idleTarget - state.idle) * k;
  }

  /* ------------------------------------------------------------------------
     Rendering
     ---------------------------------------------------------------------- */
  function render(now) {
    const t = now / 1000;
    const amp = reduceMotion ? 0 : state.idle;

    const floatY = Math.sin(t * 1.1) * CONFIG.floatAmp * size.w * amp;
    const floatRX = Math.sin(t * 0.8) * 1.6 * amp;
    const floatRY = Math.cos(t * 0.65) * 2.2 * amp;

    const rx = state.pitch + state.tilt.x + floatRX;
    const ry = state.yaw + state.tilt.y + floatRY;

    el.card.style.transform =
      `translate3d(0, ${floatY.toFixed(2)}px, 0) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;

    // --- Dynamic lighting ---
    const devX = wrapDev(rx);
    const devY = wrapDev(ry);
    const nx = clamp(devY / 32, -1, 1);
    const ny = clamp(-devX / 32, -1, 1);
    const cosX = Math.cos(devX * RAD);
    const cosY = Math.cos(devY * RAD);
    const facing = cosX * cosY;
    const mag = Math.min(1, Math.hypot(devX, devY) / 35);

    const style = el.card.style;
    style.setProperty("--mx", `${(50 + nx * 50).toFixed(1)}%`);
    style.setProperty("--my", `${(50 + ny * 50).toFixed(1)}%`);
    style.setProperty("--sx", `${(50 - nx * 30).toFixed(1)}%`);
    style.setProperty("--glare", (facing * (0.3 + 0.7 * mag)).toFixed(3));

    // --- Shadow: đổi vị trí / độ đậm theo góc xoay và độ cao ---
    const bob = floatY / (CONFIG.floatAmp * size.w); // -1..1
    const shX = -nx * size.w * 0.14;
    const shY = size.h * 0.5 + size.w * 0.2;
    const scale = (1 + clamp(bob, -1, 1) * 0.06);
    const squash = 0.35 + 0.65 * Math.max(0, cosY);
    el.shadow.style.transform =
      `translate(calc(-50% + ${shX.toFixed(1)}px), ${shY.toFixed(1)}px) scale(${(scale * squash).toFixed(3)}, ${scale.toFixed(3)})`;
    el.shadow.style.opacity = ((0.55 + 0.35 * Math.max(0, facing)) * (1 - 0.15 * Math.max(0, -bob))).toFixed(3);

    // --- Aura sau card ---
    el.aura.style.transform = `translate3d(${(nx * 24).toFixed(1)}px, ${(-ny * 24).toFixed(1)}px, 0)`;
  }

  /* ------------------------------------------------------------------------
     Main loop
     ---------------------------------------------------------------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    render(now);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  function init() {
    el.hint.textContent = isTouch ? STR.hintTouch : STR.hintPointer;
    initImages();
    measure();
    Input.init();
    Motion.init();
    DayCounter.init();

    el.flip.addEventListener("click", flipCard);
    el.reset.addEventListener("click", resetCard);
    el.motion.addEventListener("click", () => Motion.toggle());

    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", () => { last = performance.now(); });

    requestAnimationFrame(frame);
  }

  init();
})();
