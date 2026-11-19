/* Hiệu ứng: hạt (confetti, tim, sao, pháo hoa) trên canvas, gõ chữ, trái tim bay, reveal khi cuộn */
const $ = s => document.querySelector(s);
const FX = (() => {
  const cv = $('#fx'), c = cv.getContext('2d'), D = Math.min(devicePixelRatio || 1, 2);
  let W, H, P = [], run = false, last = 0, fw = null;
  const R = (a, b) => a + Math.random() * (b - a);
  const col = () => [CONFIG.colors.pink, CONFIG.colors.cherry, CONFIG.colors.gold, '#fff', '#ff8fab'][Math.random() * 5 | 0];
  const rs = () => { W = innerWidth; H = innerHeight; cv.width = W * D; cv.height = H * D; c.setTransform(D, 0, 0, D, 0, 0); };
  addEventListener('resize', rs); rs();
  function add(p) { if (P.length > 380) return; P.push(p); if (!run) { run = true; last = performance.now(); requestAnimationFrame(tick); } }
  function tick(t) {
    const dt = Math.min((t - last) / 16.7, 3); last = t; c.clearRect(0, 0, W, H);
    P = P.filter(p => {
      if ((p.l -= dt) <= 0) return false;
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      c.save(); c.globalAlpha = Math.min(1, p.l / 20); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c;
      if (p.k === 'h' || p.k === 's') { c.font = p.s * 2 + 'px serif'; c.textAlign = 'center'; c.fillText(p.k === 'h' ? '♥' : '✦', 0, 0); }
      else if (p.k === 'd') { c.beginPath(); c.arc(0, 0, p.s / 3, 0, 6.3); c.fill(); }
      else c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6);
      c.restore(); return true;
    });
    P.length ? requestAnimationFrame(tick) : (run = false, c.clearRect(0, 0, W, H));
  }
  const burst = (x, y, n = 12, k = 's', sp = 5) => { for (let i = 0; i < n; i++) { const a = R(0, 6.28), v = R(1, sp); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: .1, r: R(0, 6), vr: R(-.2, .2), s: R(6, 12), l: R(45, 90), c: col(), k }); } };
  const confetti = (n = 60) => { for (let i = 0; i < n; i++) add({ x: R(0, W), y: -10, vx: R(-1.5, 1.5), vy: R(1, 4), g: .03, r: R(0, 6), vr: R(-.15, .15), s: R(7, 13), l: R(120, 220), c: col(), k: 'c' }); };
  const fireworks = (ms = 3500) => { clear(); const f = () => burst(R(W * .15, W * .85), R(H * .12, H * .5), 36, 'd', 7); f(); fw = setInterval(f, 450); setTimeout(() => clearInterval(fw), ms); };
  const clear = () => { clearInterval(fw); P = []; };
  const type = (el, t, ms = 45) => new Promise(r => { el.textContent = ''; let i = 0; (function f() { el.textContent = t.slice(0, ++i); i < t.length ? setTimeout(f, ms) : r(); })(); });
  const floaters = (el, n = 14) => { for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.className = 'fl'; s.textContent = Math.random() < .7 ? '♥' : '✦'; s.style.cssText = `left:${R(0, 100)}%;font-size:${R(12, 28)}px;animation-duration:${R(9, 17)}s;animation-delay:${R(-17, 0)}s;color:${col()}`; el.appendChild(s); } };
  const reveal = root => { const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { root, threshold: .15 }); root.querySelectorAll('.rv').forEach(e => io.observe(e)); };
  return { burst, confetti, fireworks, clear, type, floaters, reveal };
})();
