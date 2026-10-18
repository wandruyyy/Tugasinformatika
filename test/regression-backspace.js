/* ============================================================
   REGRESSION: bug Backspace terminal (LIBRARY RECOVERY)
   Skenario user: ketik teks → hapus (Backspace) → tampilan sudah
   kosong, tapi buffer native (#term-input-catcher.value) masih
   menyimpan teks lama → saat mengetik lagi, teks lama "muncul
   kembali". Test ini memastikan buffer native ikut terhapus.
   Jalankan: node test/regression-backspace.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(w) {
    w.Element.prototype.scrollTo = w.Element.prototype.scrollTo || function () {};
    if (!w.CSS) w.CSS = {};
    if (!w.CSS.escape) w.CSS.escape = s => String(s).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, c => '\\' + c);
    if (!w.requestAnimationFrame) w.requestAnimationFrame = cb => setTimeout(cb, 16);
    w.Sfx = new Proxy({}, { get: () => () => {} });
    const ctx = new Proxy({}, {
      get(t, k) { if (k === 'measureText') return () => ({ width: 0 }); if (typeof k === 'string') return () => {}; return undefined; },
      set() { return true; },
    });
    w.HTMLCanvasElement.prototype.getContext = () => ctx;
  },
});

const w = dom.window;
let pass = 0, fail = 0;
const t = (name, cond) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name);
  cond ? pass++ : fail++;
};

setTimeout(async () => {
  const d = w.document;
  const $ = s => d.querySelector(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const kd = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  // 1) boot -> desktop -> buka terminal
  click($('#monitor'));
  await sleep(2500);
  click($('#btn-open-terminal'));
  await sleep(1200);

  const catcher = $('#term-input-catcher');
  const termInputEl = $('#terminal-input'); // elemen input aktual yang ditulis game
  t('terminal terbuka', $('#terminal-window').classList.contains('show'));
  t('catcher & #terminal-input ada', !!catcher && !!termInputEl);
  const clean = s => s.replace(/█/g, '').trim(); // buang caret

  // 2) ketik lewat jalur native (keyboard virtual / input element)
  catcher.focus();
  catcher.value = 'recov';
  catcher.dispatchEvent(new w.Event('input', { bubbles: true }));
  t('ketik via native: tampilan = recov', clean(termInputEl.textContent).includes('recov'));
  const full1 = catcher.value;
  t('buffer native = recov', full1 === 'recov');

  // 3) Backspace (event bubble dari catcher ke document; preventDefault memblokir hapus native)
  kd(catcher, 'Backspace');
  await sleep(60);
  const visual = clean(termInputEl.textContent);
  t('tampilan terhapus satu karakter', visual === 'reco');
  t('BUG FIX: buffer native ikut terhapus (value=reco)', catcher.value === 'reco');

  // 4) ngetik lagi via native — teks lama tidak boleh muncul kembali
  catcher.value = 'recoa';
  catcher.dispatchEvent(new w.Event('input', { bubbles: true }));
  t('ngetik lagi tidak memunculkan teks lama', clean(termInputEl.textContent) === 'recoa');
  t('teks lama (recov) benar-benar hilang', !termInputEl.textContent.includes('recov'));

  // 5) Enter via jalur fisik (document) juga harus kosongkan buffer native
  catcher.value = 'zzz';
  catcher.dispatchEvent(new w.Event('input', { bubbles: true }));
  kd(d.body, 'Enter');
  await sleep(60);
  t('Enter fisik mengosongkan tampilan', clean(termInputEl.textContent) === '');
  t('Enter fisik mengosongkan buffer native', catcher.value === '');

  console.log('----------------------------------------');
  console.log('PASS: ' + pass + '  FAIL: ' + fail);
  process.exit(fail ? 1 : 0);
}, 900);
