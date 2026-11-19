/* Bánh kem: mỗi lần chạm = +1 (chỉ dùng pointerdown), bánh phồng lên khi chạm liên tục, xẹp dần khi dừng */
const Cake = (() => {
  const wrap = $('#cakeWrap'), cake = $('#cake'), msg = $('#msg'), fin = $('#fin'), hint = $('#hint'), s2 = $('#s2');
  let n = 0, heat = 0, last = 0, prev = 0, done = false, run = false, holding = false, lastTapAt = 0;
  (function draw() {
    let d = '';
    [[20, 150, 180, 60], [45, 100, 130, 52], [70, 56, 80, 44]].forEach(([x, y, w, h]) => {
      d += `<rect x="${x}" y="${y}" width="${w}" height="14" rx="7" fill="#fff"/>`;
      for (let i = x + 12; i < x + w - 12; i += 20) d += `<rect x="${i}" y="${y + 4}" width="9" height="${16 + i * 7 % 12}" rx="4.5" fill="#fff"/>`;
      d += `<path d="M${x + 10} ${y + h - 6}h${w - 20}" stroke="#e6c27a" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 11"/>`;
    });
    [[30, 150], [190, 150], [56, 100], [164, 100], [98, 56], [122, 56]].forEach(([x, y]) => d += `<path d="M${x} ${y}q4-14 12-16" stroke="#6b8f4e" stroke-width="2" fill="none"/><circle cx="${x}" cy="${y + 2}" r="7" fill="#d6264f"/><circle cx="${x - 2}" cy="${y}" r="2" fill="#fff8"/>`);
    $('#deco').innerHTML = d;
  })();
  const say = t => { msg.textContent = t; msg.classList.remove('on'); void msg.offsetWidth; msg.classList.add('on'); };
  function tap(x, y) {
    if (done) return;
    const now = performance.now();
    if (now - lastTapAt < 80) return; // chặn nhấn nhanh bất thường
    lastTapAt = now;
    n++; heat = Math.min(1, heat + .05); last = now; hint.classList.add('off');
    cake.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1,.92)' }, { transform: 'scale(.97,1.04)' }, { transform: 'scale(1)' }], { duration: 260 });
    FX.burst(x, y, 6, Math.random() < .5 ? 'h' : 's', 4); Sound.blip(n);
    if (CONFIG.milestones[n]) {
      say(CONFIG.milestones[n]);
      if (n === 25) FX.confetti(50);
    }
    if (n >= CONFIG.taps) finish();
  }
  cake.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); holding = true; tap(e.clientX, e.clientY); });
  addEventListener('pointerup', () => holding = false); addEventListener('pointercancel', () => holding = false);
  cake.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); const r = cake.getBoundingClientRect(); tap(r.left + r.width / 2, r.top + r.height / 2); } });
  function finish() {
    done = true; heat = .85; s2.classList.add('done'); wrap.classList.add('glow-on', 'big-flame');
    FX.confetti(160); FX.fireworks(2500); Sound.chime(); setTimeout(() => fin.classList.add('show'), 900);
  }
  function loop(t) {
    if (!run) return; const dt = t - prev; prev = t;
    // Giữ tay chỉ tránh tụt; khi buông ra quá 250ms bánh xẹp dần
    if (!done) { if (holding) { last = t; } else if (t - last > 250) heat = Math.max(0, heat - dt * .0012); }
    wrap.style.transform = `scale(${1 + heat * .4})`;
    requestAnimationFrame(loop);
  }
  const start = () => { run = true; prev = performance.now(); requestAnimationFrame(loop); };
  const stop = () => { run = false; };
  function reset() {
    n = 0; heat = 0; done = false; holding = false; stop(); wrap.style.transform = ''; wrap.className = '';
    s2.classList.remove('done'); fin.classList.remove('show'); hint.classList.remove('off'); msg.classList.remove('on');
  }
  return { start, stop, reset };
})();
