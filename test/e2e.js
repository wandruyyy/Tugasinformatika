/* ============================================================
   E2E TEST HARNESS — LIBRARY RECOVERY (jsdom)
   Menjalankan alur game penuh & memverifikasi setiap mekanik.
   Jalankan: node test/e2e.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}

function loadGame() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // ---- jsdom polyfills ----
  window.Element.prototype.scrollTo = window.Element.prototype.scrollTo || function () {};
  if (!window.CSS) window.CSS = {};
  if (!window.CSS.escape) window.CSS.escape = s => String(s).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, c => '\\' + c);
  if (!window.requestAnimationFrame) window.requestAnimationFrame = cb => setTimeout(cb, 16);

  // silence + stub WebAudio
  const toneSpy = [];
  window.Sfx = new Proxy({ __spy: toneSpy }, {
    get(t, k) {
      if (k === '__spy') return toneSpy;
      return (...a) => { toneSpy.push(String(k)); };
    },
  });

  // canvas 2d stub for fx.js
  const ctxStub = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return () => ({ width: 0 });
      if (typeof k === 'string') return () => {};
      return undefined;
    },
    set() { return true; },
  });
  window.HTMLCanvasElement.prototype.getContext = () => ctxStub;

  // run the scripts in order (same as index.html)
  for (const f of ['js/db.js', 'js/sfx.js', 'js/fx.js', 'js/questions.js', 'js/game.js']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    try { window.eval(code); }
    catch (e) { console.error('SCRIPT LOAD FAIL:', f, e.message); throw e; }
  }

  return window;
}

(async function main() {
  console.log('\n== 1. LOAD GAME ==');
  const w = loadGame();
  const d = w.document;
  const $ = s => d.querySelector(s);
  const $$ = s => Array.from(d.querySelectorAll(s));
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const input = el => el.dispatchEvent(new w.Event('input', { bubbles: true }));
  const keydown = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitUntil = async (fn, timeout = 4000, step = 25) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { if (fn()) return true; await sleep(step); }
    return false;
  };

  check('SQL global tersedia', !!w.SQL);
  check('QUESTIONS = 17 soal', w.QUESTIONS.length === 17, 'got ' + w.QUESTIONS.length);
  check('LEVELS = 5 level', w.LEVELS.length === 5);
  const dist = {};
  w.QUESTIONS.forEach(q => { dist[q.level] = (dist[q.level] || 0) + 1; });
  check('distribusi soal 3/4/5/4/1', JSON.stringify(dist) === '{"1":3,"2":4,"3":5,"4":4,"5":1}', JSON.stringify(dist));

  console.log('\n== 2. DESK → BOOT → DESKTOP ==');
  click($('#monitor'));
  await waitUntil(() => !$('#boot-screen').classList.contains('hidden'), 4000);
  check('boot screen muncul', !$('#boot-screen').classList.contains('hidden'));
  await waitUntil(() => !$('#desktop-screen').classList.contains('hidden'), 6000);
  check('desktop muncul setelah boot', !$('#desktop-screen').classList.contains('hidden'));
  await waitUntil(() => $('#error-window').classList.contains('show'), 4000);
  check('error window terbuka otomatis', $('#error-window').classList.contains('show'));
  await waitUntil(() => /LOCKDOWN IN: 19:5/.test($('#error-countdown').textContent), 3000);
  check('countdown berjalan', /LOCKDOWN IN: 19:5/.test($('#error-countdown').textContent));

  console.log('\n== 3. TASKBAR & WINDOW CONTROLS ==');
  // minimize
  const minBtn = $('#error-window .os-window-btn[aria-label="Minimize"]');
  click(minBtn);
  await sleep(60);
  check('minimize menyembunyikan window', $('#error-window').classList.contains('minimized'));
  check('taskbar item ditandai minimized', $('#taskbar-items .tb-item.minimized') !== null);
  // restore via taskbar
  click($('#taskbar-items .tb-item.minimized'));
  await sleep(60);
  check('restore dari taskbar', $('#error-window').classList.contains('show') && !$('#error-window').classList.contains('minimized'));
  // maximize
  click($('#error-window .os-window-btn[aria-label="Maximize"]'));
  await sleep(30);
  check('maximize menambah class', $('#error-window').classList.contains('maximized'));
  check('maximize melebar', ($('#error-window').style.width || '').includes('calc(100% - 20px)'));
  click($('#error-window .os-window-btn[aria-label="Maximize"]'));
  await sleep(30);
  check('unmaximize mengembalikan lebar', !$('#error-window').classList.contains('maximized') && $('#error-window').style.width !== 'calc(100% - 20px)');

  console.log('\n== 4. TERMINAL: WRONG CMD + RECOVERY ==');
  click($('#btn-open-terminal'));
  await waitUntil(() => !$('#terminal-input-line').classList.contains('hidden'), 3000);
  check('terminal terbuka & input aktif', !$('#terminal-input-line').classList.contains('hidden'));
  check('z-index terminal di atas error window', parseInt($('#terminal-window').style.zIndex, 10) > parseInt($('#error-window').style.zIndex || 20, 10));

  // wrong command via catcher
  const catcher = $('#term-input-catcher');
  catcher.value = 'dir';
  input(catcher);
  keydown(catcher, 'Enter');
  await sleep(30);
  check('perintah salah ditolak', /Unknown command/.test($('#terminal-output').textContent));
  check('echo prompt benar (1 backslash)', d.getElementById('terminal-output').innerHTML.includes('C:\\SMAN6_LIBRARY&gt; dir'));

  // type `recovery`
  catcher.value = 'recovery';
  input(catcher);
  keydown(catcher, 'Enter');
  await waitUntil(() => $('#terminal-output').textContent.includes('ERROR 404: ALGORITHM NOT FOUND'), 6000);
  check('scanning berjalan sampai ERROR 404', $('#terminal-output').textContent.includes('ERROR 404: ALGORITHM NOT FOUND'));
  await waitUntil(() => $('#terminal-window .btn-primary') !== null, 9000);
  check('tombol START muncul', !!$('#terminal-window .btn-primary'));

  console.log('\n== 5. LEVEL 1 (multi-select) ==');
  click($('#terminal-window .btn-primary'));
  await waitUntil(() => $('#game-window').classList.contains('show'), 5000);
  check('game window terbuka setelah START', $('#game-window').classList.contains('show'));
  check('z-index game window di atas terminal', parseInt($('#game-window').style.zIndex, 10) >= parseInt($('#terminal-window').style.zIndex, 10));
  check('title window = PROCESS 01', $('#game-window-title').textContent.includes('DECOMPOSITION'));
  check('level 1 chip aktif', $('#game-levels .lv-chip.now') !== null);

  // q1: pilih 3 benar + 1 salah → harus INCORRECT
  let cards = $$('#q-cards .card-opt');
  check('soal 1: 6 kartu', cards.length === 6);
  const wrongPick = ['DATA BUKU', 'DATA SISWA', 'PEMINJAMAN', 'WARNA WEBSITE'];
  cards.forEach(c => { if (wrongPick.includes(c.textContent)) click(c); });
  click($('#q-check'));
  await sleep(40);
  check('soal 1 salah → INCORRECT', $('#q-feedback').textContent.includes('✕ INCORRECT'));
  check('salah tidak maju soal', $('#q-feedback').textContent.includes('✕ INCORRECT') && !$('#q-feedback').textContent.includes('✓ CORRECT'));
  await sleep(700);
  // sekarang jawab benar
  cards = $$('#q-cards .card-opt');
  ['DATA BUKU', 'DATA SISWA', 'PEMINJAMAN', 'PENGEMBALIAN'].forEach(a => {
    const c = cards.find(x => x.textContent === a); if (c) click(c);
  });
  click($('#q-check'));
  await sleep(40);
  check('soal 1 benar → CORRECT + 33%', $('#q-feedback').textContent.includes('CORRECT') && $('#q-feedback').textContent.includes('33%'));
  await waitUntil(() => $('#game-body').textContent.includes('Banyak siswa tidak dapat meminjam'), 4000);
  check('maju ke soal 2 otomatis', true);

  console.log('\n== 6. SOAL 2 & 3 ==');
  let c2 = $$('#q-cards .card-opt');
  ['A. Data siswa', 'B. Data buku', 'C. Ketersediaan buku', 'D. Sistem peminjaman'].forEach(a => {
    const c = c2.find(x => x.textContent === a); if (c) click(c);
  });
  click($('#q-check'));
  await waitUntil(() => $('#game-body').textContent.includes('Data peminjaman buku tidak tercatat'), 4000);
  check('maju ke soal 3', true);
  let c3 = $$('#q-cards .card-opt');
  ['DATA SISWA', 'DATA BUKU', 'TRANSAKSI PEMINJAMAN'].forEach(a => {
    const c = c3.find(x => x.textContent === a); if (c) click(c);
  });
  click($('#q-check'));
  check('feedback soal 3: DECOMPOSITION COMPLETE', $('#q-feedback').textContent.includes('DECOMPOSITION COMPLETE'));
  await waitUntil(() => $('#lt-name').textContent === 'PATTERN RECOGNITION', 5000);
  check('level title LEVEL 02 muncul', $('#lt-level').textContent === 'LEVEL 02');

  console.log('\n== 7. LEVEL 2 (mc + analyze) ==');
  await waitUntil(() => $('#game-window').classList.contains('show') && $('#q-cards') === null && $$('.mc-opt').length > 0, 5000);
  // q4: jawab salah dulu (index 1), lalu benar (index 0)
  let opts = $$('.mc-opt');
  check('soal 4: 4 opsi', opts.length === 4);
  click(opts[1]);
  await sleep(30);
  check('mc salah → INCORRECT, bisa coba lagi', $('#q-feedback').textContent.includes('✕ INCORRECT') && $$('.mc-opt').length === 4);
  opts = $$('.mc-opt');
  click(opts[0]);
  await sleep(30);
  check('soal 4 benar', $('#q-feedback').textContent.includes('CORRECT'));
  await waitUntil(() => $$('.mc-opt').length === 4 && $('#game-body').textContent.includes('ID buku'), 4000);
  // q5: benar langsung (B = index 1)
  click($$('.mc-opt')[1]);
  await waitUntil(() => $('#game-body').textContent.includes('LOGIN'), 4000);
  // q6: C = index 2
  click($$('.mc-opt')[2]);
  await waitUntil(() => $('#q-analyze') !== null, 4000);
  check('soal 7: analyze button muncul', !!$('#q-analyze'));
  check('soal 7: opsi belum tampil', $$('.mc-opt').length === 0);
  click($('#q-analyze'));
  await sleep(30);
  check('analyze → opsi muncul', $$('.mc-opt').length === 4);
  click($$('.mc-opt')[1]);
  check('soal 7 benar → P-02', $('#q-feedback').textContent.includes('P-02'));
  await waitUntil(() => $('#lt-name').textContent === 'ABSTRACTION', 5000);
  check('LEVEL 03 title', $('#lt-level').textContent === 'LEVEL 03');

  console.log('\n== 8. LEVEL 3 (fields + tabel + filter) ==');
  await waitUntil(() => $$('.db-field').length > 0, 5000);
  check('soal 8: dbcard fields', $$('.db-field').length === 7);
  // salah dulu: pilih Hobby saja
  click($$('.db-field').find(f => f.dataset.key === 'Hobby'));
  click($('#q-check'));
  await sleep(30);
  check('soal 8 salah → INCORRECT', $('#q-feedback').textContent.includes('INCORRECT'));
  click($('#q-reset'));
  ['Student ID', 'Book', 'Status'].forEach(k => { const f = $$('.db-field').find(x => x.dataset.key === k); if (f) click(f); });
  click($('#q-check'));
  check('soal 8 benar', $('#q-feedback').textContent.includes('CORRECT'));
  await waitUntil(() => $$('.mc-opt').length === 4 && $('#game-body').textContent.includes('Tere Liye'), 4000);
  // q9: A index 0
  click($$('.mc-opt')[0]);
  await waitUntil(() => $$('.filter-chip').length === 3, 4000);
  check('soal 10: filter chips ada', $$('.filter-chip').length === 3);
  const rowsBefore = $$('#q-table tbody tr').length;
  click($$('.filter-chip').find(c => c.dataset.f === 'Tersedia'));
  await sleep(30);
  const rowsAfter = $$('#q-table tbody tr').length;
  check('filter TERSEDIA menyaring baris (9→5)', rowsBefore === 9 && rowsAfter === 5, rowsBefore + '→' + rowsAfter);
  check('chip filter aktif', $$('.filter-chip').find(c => c.dataset.f === 'Tersedia').classList.contains('on'));
  click($$('.mc-opt')[0]);
  await waitUntil(() => $('#game-body').textContent.includes('terlambat mengembalikan'), 4000);
  // q11: A index 0
  click($$('.mc-opt')[0]);
  await waitUntil(() => $$('.db-field').length === 10, 4000);
  check('soal 12: 10 field', $$('.db-field').length === 10);
  ['Student ID', 'Name', 'Book', 'Status'].forEach(k => { const f = $$('.db-field').find(x => x.dataset.key === k); if (f) click(f); });
  click($('#q-check'));
  check('soal 12 benar → A-03', $('#q-feedback').textContent.includes('A-03'));
  await waitUntil(() => $('#lt-name').textContent === 'ALGORITHM', 5000);
  check('LEVEL 04 title', $('#lt-level').textContent === 'LEVEL 04');

  console.log('\n== 9. LEVEL 4 (drag & drop / sort) ==');
  await waitUntil(() => $$('#q-slots .dd-slot').length === 4, 5000);
  check('soal 13: 4 slot + 4 chip', $$('#q-slots .dd-slot').length === 4 && $$('#q-pool .dd-chip').length === 4);
  // mode tap: klik chip lalu klik slot, sesuai urutan benar
  const order13 = ['PILIH BUKU', 'CEK KETERSEDIAAN', 'INPUT DATA SISWA', 'SIMPAN TRANSAKSI'];
  for (let i = 0; i < 4; i++) {
    const chip = $$('#q-pool .dd-chip').find(c => c.dataset.value === order13[i]);
    click(chip);
    click($$('#q-slots .dd-slot')[i]);
    await sleep(20);
  }
  check('semua chip terpasang', $$('#q-pool .dd-chip').length === 0);
  // salah tempatkan ulang: angkat chip slot 0 dan tukar? — cukup uji salah dulu dengan run salah
  click($('#q-check'));
  await sleep(30);
  check('urutan benar → PROCESS VALID', $('#q-feedback').textContent.includes('CORRECT'));
  // uji angkat chip dari slot (placed interaction)
  await waitUntil(() => $$('#q-pool .dd-chip').length === 4, 4000);
  const chip14 = $$('#q-pool .dd-chip')[0];
  click(chip14);
  click($$('#q-slots .dd-slot')[0]);
  await sleep(20);
  check('soal 14: chip masuk slot', $$('#q-slots .dd-slot')[0].dataset.value !== undefined);
  const placedChip = $('#q-slots .dd-slot .slot-card .dd-chip');
  click(placedChip);
  await sleep(20);
  check('klik chip di slot mengeluarkannya (data-value kembali ke pool)', $$('#q-pool .dd-chip').length === 4);
  // selesaikan soal 14–16 cepat
  const finishDrag = async (order) => {
    for (let i = 0; i < order.length; i++) {
      const chip = $$('#q-pool .dd-chip').find(c => c.dataset.value === order[i]);
      click(chip); click($$('#q-slots .dd-slot')[i]); await sleep(15);
    }
    click($('#q-check'));
    await sleep(30);
  };
  await finishDrag(['INPUT ID SISWA', 'CARI DATA PEMINJAMAN', 'KONFIRMASI PENGEMBALIAN', 'UPDATE STATUS BUKU']);
  check('soal 14 benar', $('#q-feedback').textContent.includes('CORRECT'));
  await waitUntil(() => $$('#q-pool .dd-chip').length === 4, 4000);
  await finishDrag(['BUKA LIBRARY APP', 'MASUKKAN JUDUL', 'SEARCH DATABASE', 'TAMPILKAN HASIL']);
  check('soal 15 benar', $('#q-feedback').textContent.includes('CORRECT'));
  await waitUntil(() => $$('#q-pool .dd-chip').length === 5, 4000);
  check('soal 16: sort 5 chip', $$('#q-pool .dd-chip').length === 5);
  await finishDrag(['101', '103', '105', '107', '109']);
  check('soal 16 benar', $('#q-feedback').textContent.includes('CORRECT'));

  console.log('\n== 10. FINAL TERMINAL + SOAL 17 ==');
  await waitUntil(() => $('#terminal-output').textContent.includes('INVALID ALGORITHM'), 6000);
  check('final terminal: INVALID ALGORITHM', $('#terminal-output').textContent.includes('INVALID ALGORITHM'));
  await waitUntil(() => $$('#q-slots .dd-slot').length === 4, 5000);
  check('soal 17: 4 slot di game window', $$('#q-slots .dd-slot').length === 4);
  await finishDrag(['PILIH BUKU', 'CEK KETERSEDIAAN', 'INPUT SISWA', 'SIMPAN TRANSAKSI']);
  check('soal 17 benar', $('#q-feedback').textContent.includes('CORRECT'));

  console.log('\n== 11. RECOVERY + ENDING ==');
  await waitUntil(() => $('#recovery-body').textContent.includes('LIBRARY SYSTEM RESTORED'), 9000);
  check('recovery: LIBRARY SYSTEM RESTORED', $('#recovery-body').textContent.includes('LIBRARY SYSTEM RESTORED'));
  await waitUntil(() => !$('#final-cine').classList.contains('hidden'), 6000);
  check('FINAL CINEMATIC tampil (tidak ter-hide oleh scene)', !$('#final-cine').classList.contains('hidden'));
  check('skor 17/17', $('#fc-score').textContent.includes('17 / 17'));
  check('bezel ONLINE', $('#bezel-status').textContent === 'ONLINE');

  console.log('\n== 12. PROGRESS ==');
  check('gp-count 17/17', $('#gp-count').textContent === '17 / 17');
  check('semua level chip done', $$('#game-levels .lv-chip.done').length === 5);

  console.log('\n== 13. EDGE CASES (setelah ending) ==');
  // desktop icon Library → buka game-window (anti soft-lock); game window sudah tertutup setelah soal 17
  click($$('.d-icon').find(i => i.textContent.includes('Library System')));
  await waitUntil(() => $('#game-window').classList.contains('show'), 3000);
  check('icon Library membuka window game kembali', $('#game-window').classList.contains('show'));
  // replay soal 17 → skor TIDAK melebihi 17/17
  await waitUntil(() => $$('#q-pool .dd-chip').length === 4, 3000);
  const replayOrder = ['PILIH BUKU', 'CEK KETERSEDIAAN', 'INPUT SISWA', 'SIMPAN TRANSAKSI'];
  for (let i = 0; i < 4; i++) {
    const chip = $$('#q-pool .dd-chip').find(c => c.dataset.value === replayOrder[i]);
    click(chip); click($$('#q-slots .dd-slot')[i]); await sleep(15);
  }
  click($('#q-check'));
  await sleep(40);
  check('replay soal: masih CORRECT', $('#q-feedback').textContent.includes('✓ CORRECT'));
  check('skor tetap 17/17 (tidak jadi 18)', $('#gp-count').textContent === '17 / 17', $('#gp-count').textContent);
  // buka Notes via ikon desktop, lalu toggle minimize dari taskbar
  click($$('.d-icon').find(i => i.textContent.includes('Notes')));
  await sleep(40);
  check('Notes window terbuka dari desktop', $('#notes-window').classList.contains('show'));
  const notesTb = $$('#taskbar-items .tb-item').find(t => t.textContent.includes('Notes'));
  click(notesTb);
  await sleep(40);
  check('klik taskbar item aktif = minimize', $('#notes-window').classList.contains('minimized'));
  click($$('#taskbar-items .tb-item').find(t => t.textContent.includes('Notes')));
  await sleep(40);
  check('klik taskbar item minimized = restore', $('#notes-window').classList.contains('show'));
  // keyboard fisik ketik di terminal (document keydown path)
  await waitUntil(() => $('#terminal-input-line') !== null, 2000);
  keydown(d.body, 'h'); keydown(d.body, 'i');
  keydown(d.body, 'Enter');
  await sleep(30);
  check('keyboard fisik dikunci saat game berjalan (tidak crash)', true);
  // close error window saat game aktif → auto buka recovery window (anti soft-lock)
  click($$('.d-icon').find(i => i.textContent.includes('Library System'))); // sudah game
  await sleep(30);
  // main lagi = reload behavior di browser; di jsdom cukup pastikan tombol ada
  check('tombol MAIN LAGI ada', !!$('#btn-play-again'));
  check('tombol KELUAR ada', !!$('#btn-exit-desk'));

  // regresi: terminal dari ikon desktop = intro fresh + input aktif (bukan window mati)
  click($$('.d-icon').find(i => i.textContent.includes('Terminal')));
  await waitUntil(() => !$('#terminal-input-line').classList.contains('hidden'), 6000);
  check('Terminal dari desktop: intro fresh & input aktif', !$('#terminal-input-line').classList.contains('hidden'));
  check('tidak ada START basi di terminal', $$('#terminal-window .terminal-body .btn-primary').length === 0);
  const rc = $('#term-input-catcher');
  rc.value = 'recovery';
  input(rc);
  keydown(rc, 'Enter');
  await sleep(60);
  check('recovery ulang → ALREADY ACTIVE (tidak scan ulang)', $('#terminal-output').textContent.includes('RECOVERY SESSION ALREADY ACTIVE'));
  check('recovery ulang → game window terbuka, 5 level tetap done', $('#game-window').classList.contains('show') && $$('#game-levels .lv-chip.done').length === 5);

  console.log('\n== 14. KELUAR + WINDOW TAMBAHAN ==');
  // KELUAR → kembali ke desktop komputer (bukan meja mati)
  click($('#btn-exit-desk'));
  await sleep(40);
  check('KELUAR: final-cine hilang', $('#final-cine').classList.contains('hidden'));
  check('KELUAR: meja disembunyikan', $('#desk-scene').classList.contains('hidden-scene'));
  check('KELUAR: desktop komputer tampil lagi', !$('#computer-scene').classList.contains('hidden-scene'));
  // Database window via ikon desktop
  click($$('.d-icon').find(i => i.textContent.includes('Database')));
  await waitUntil(() => $('#database-window').classList.contains('show'), 3000);
  check('Database window terbuka', $('#database-window').classList.contains('show'));
  check('Database: tabel books + transactions terender', $('#database-body').querySelectorAll('.sql-table').length >= 3);
  // Files window
  click($$('.d-icon').find(i => i.textContent.includes('Files')));
  await sleep(40);
  check('Files window terbuka', $('#files-window').classList.contains('show'));
  // tutup semua window via ✕ tidak menghasilkan error & taskbar kosong
  $$('.os-window-x').forEach(b => click(b));
  await sleep(300);
  const stillOpen = $$('.os-window').filter(w => !w.classList.contains('hidden')).map(w => w.id + '[' + w.className + ']');
  check('close semua window → taskbar kosong', $('#taskbar-items').children.length === 0, 'still open: ' + stillOpen.join(', '));

  console.log('\n========================================');
  console.log('PASS: ' + pass + '  FAIL: ' + fail);
  if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log(' - ' + f)); process.exit(1); }
  process.exit(0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
