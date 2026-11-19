/* Điều phối 3 giai đoạn: chào mừng -> bánh kem -> trang chúc mừng */
const w = ms => new Promise(r => setTimeout(r, ms));
const Sound = {
  on: true, ctx: null, music: null, available: false,
  init() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (CONFIG.music && !this.music) {
        this.music = new Audio(CONFIG.music);
        this.music.loop = true; this.music.volume = .35;
        this.music.addEventListener('canplaythrough', () => this.available = true, { once: true });
        this.music.addEventListener('error', () => this.available = false, { once: true });
        this.music.play().catch(() => {});
      }
    } catch (e) {}
  },
  blip(n) { if (!this.on || !this.ctx) return; const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    o.frequency.value = [523, 587, 659, 784, 880][n % 5]; o.connect(g); g.connect(this.ctx.destination);
    g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.001, t + .18); o.start(t); o.stop(t + .2); },
  chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.blipNote(f), i * 120)); },
  blipNote(f) { if (!this.on || !this.ctx) return; const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    o.frequency.value = f; o.connect(g); g.connect(this.ctx.destination);
    g.gain.setValueAtTime(.09, t); g.gain.exponentialRampToValueAtTime(.001, t + .45); o.start(t); o.stop(t + .5); },
  toggle() { this.on = !this.on; $('#snd').textContent = this.on ? '🔊' : '🔇'; this.music && (this.on ? this.music.play().catch(() => {}) : this.music.pause()); }
};
const go = id => document.querySelectorAll('.stage').forEach(s => s.classList.toggle('on', s.id === id));
let fired = false;

function setup() {
  Object.entries(CONFIG.colors).forEach(([k, v]) => document.documentElement.style.setProperty('--' + k, v));
  document.title = 'Happy Birthday, ' + CONFIG.name + '!';
  const st = $('#stars');
  for (let i = 0; i < 45; i++) { const s = document.createElement('i'); s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--z:${2 + Math.random() * 4}px;--d:${Math.random() * 3}s`; st.appendChild(s); }
  $('#t2').textContent = CONFIG.welcomeSub;
  $('#openBtn').textContent = CONFIG.openLabel;
  $('#s2 h2').textContent = CONFIG.cakeTitle;
  $('#s2 > p').textContent = CONFIG.cakeHint;
  $('#fin h2').textContent = CONFIG.doneTitle;
  $('#fin p').textContent = CONFIG.doneSub;
  $('#revealBtn').textContent = CONFIG.revealLabel;
  $('#heroP').textContent = CONFIG.heroText;
  $('#wishes').innerHTML = CONFIG.wishes.map(t => `<p>${t}</p>`).join('');
  $('#last').innerHTML = CONFIG.lastMessage.map(t => `<p>${t}</p>`).join('');
  $('#final h2').textContent = CONFIG.finalTitle;
  $('#final > p').textContent = CONFIG.finalSub;
  $('#replay').textContent = CONFIG.replayLabel;
  document.querySelectorAll('.fls').forEach(e => FX.floaters(e, 14));
  Gallery.build(); FX.reveal($('#s3'));
}

async function intro() {
  ['#t2', '#openBtn', '#gift'].forEach(s => $(s).classList.remove('show', 'open'));
  document.querySelectorAll('#stars i').forEach(i => i.classList.remove('on'));
  await w(500); await FX.type($('#t1'), CONFIG.welcomeText, 55);
  document.querySelectorAll('#stars i').forEach((s, i) => setTimeout(() => s.classList.add('on'), i * 90));
  await w(1200); $('#gift').classList.add('show');
  await w(1000); $('#t2').classList.add('show');
  await w(700); $('#openBtn').classList.add('show');
}

$('#openBtn').onclick = async () => {
  Sound.init(); $('#openBtn').classList.remove('show');
  const g = $('#gift'), r = g.getBoundingClientRect(); g.classList.add('open');
  FX.burst(r.left + r.width / 2, r.top + 40, 40, 's', 6); FX.burst(r.left + r.width / 2, r.top + 40, 14, 'h', 5);
  await w(1500); go('s2'); Cake.start();
};
$('#revealBtn').onclick = () => {
  Cake.stop(); go('s3'); $('#s3').scrollTop = 0; FX.confetti(120); FX.fireworks(3500); Sound.chime();
  w(900).then(() => FX.type($('#heroT'), 'Happy Birthday, ' + CONFIG.name + '!', 70));
};
$('#scrollBtn').onclick = () => $('#gal').scrollIntoView({ behavior: 'smooth' });
$('#env').onclick = function () {
  if (this.classList.contains('open')) return; this.classList.add('open');
  setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
  setTimeout(() => { const r = this.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top, 30, 'h', 5); }, 3000);
};
new IntersectionObserver(([e]) => { if (e.isIntersecting && !fired) { fired = true; FX.fireworks(3000); } }, { root: $('#s3'), threshold: .5 }).observe($('#final'));
$('#replay').onclick = () => {
  FX.clear(); fired = false; Cake.reset(); $('#env').classList.remove('open'); $('#heroT').textContent = '';
  document.querySelectorAll('.rv.in').forEach(e => e.classList.remove('in'));
  go('s1'); setTimeout(() => $('#s3').scrollTop = 0, 1000); intro();
};
$('#snd').onclick = () => Sound.toggle();
setup(); intro();
