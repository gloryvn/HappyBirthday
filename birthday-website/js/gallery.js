/* Album polaroid + lightbox (ảnh thiếu sẽ hiện ô giữ chỗ màu pastel) */
const Gallery = (() => {
  const lb = $('#lb'), li = $('#lbImg'), lc = $('#lbCap'), close = () => lb.classList.remove('on');
  lb.onclick = close; addEventListener('keydown', e => e.key === 'Escape' && close());
  function build() {
    const g = $('#gallery'); g.innerHTML = '';
    CONFIG.photos.forEach((p, i) => {
      const f = document.createElement('figure'); f.className = 'pol rv'; f.style.setProperty('--r', ((i * 37 % 9) - 4) + 'deg');
      const im = new Image(); im.alt = p.caption;
      im.onerror = () => { const d = document.createElement('div'); d.className = 'ph'; d.textContent = '♥'; d.style.setProperty('--a', ['3/4', '1', '4/5', '5/6'][i % 4]); im.replaceWith(d); };
      im.src = p.src;
      const c = document.createElement('figcaption'); c.textContent = p.caption; f.append(im, c);
      f.onclick = () => { li.style.display = ''; li.onerror = () => li.style.display = 'none'; li.src = p.src; lc.textContent = p.caption; lb.classList.add('on'); };
      g.appendChild(f);
    });
  }
  return { build };
})();
