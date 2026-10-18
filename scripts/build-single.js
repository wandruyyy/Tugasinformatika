/* ============================================================
   BUILD: satukan semua CSS & JS ke satu file index.html
   Menulis index-single.html (self-contained; asset eksternal
   hanya Google Fonts).
   Mode didukung:
   - index.html klasik (<link> + <script src="...">) → diganti inline
   - index.html sudah self-contained → isi <style>/<script> inline
     di-REFRESH dari file sumber (idempotent, bisa dipanggil ulang)
   Jalankan: node scripts/build-single.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const CSS_FILE = 'css/style.css';
const SCRIPTS = ['js/db.js', 'js/sfx.js', 'js/fx.js', 'js/questions.js', 'js/game.js'];
const die = msg => { console.error('BUILD FAIL: ' + msg); process.exit(1); };

let html = read('index.html');
const css = read(CSS_FILE).trim();

// Cek dulu: file JS tidak boleh mengandung </script> (membuat inline tidak aman)
for (const f of SCRIPTS) {
  if (/<\/script/i.test(read(f))) die(f + ' berisi </script>');
}

const classic = /<link rel="stylesheet" href="css\/style\.css">/.test(html) && /<script src=/.test(html);

if (classic) {
  /* ---------- MODE A: markup klasik ---------- */
  // Replacement WAJIB pakai fungsi: '$$' sebagai string replacement
  // berarti literal '$', dan akan merusak shorthand $$() di game.js.
  html = html.replace(/^[^\S\n]*<link rel="stylesheet" href="css\/style\.css">[^\S\n]*$/m,
    () => '<style>\n' + css + '\n</style>');
  for (const f of SCRIPTS) {
    const tagRe = new RegExp('<script(\\s[^>]*)? src="' + f.replace(/\//g, '\\/') + '"></script>');
    if (!tagRe.test(html)) die('SCRIPT TAG TIDAK DITEMUKAN: ' + f);
    const code = read(f);
    html = html.replace(tagRe, () => '<script>\n' + code + '\n</script>');
  }
} else {
  /* ---------- MODE B: sudah self-contained → refresh isi inline ---------- */
  let styleCount = 0;
  html = html.replace(/<style>\n[\s\S]*?\n<\/style>/, () => {
    styleCount++;
    return '<style>\n' + css + '\n</style>';
  });
  if (styleCount !== 1) die('blok <style> inline tidak ditemukan / lebih dari satu (n=' + styleCount + ')');

  let i = 0;
  const codegen = () => {
    const f = SCRIPTS[i++];
    return '<script>\n' + read(f) + '\n</script>';
  };
  html = html.replace(/<script>\n[\s\S]*?<\/script>/g, codegen);
  if (i !== SCRIPTS.length) die('jumlah blok <script> inline tidak sesuai (ditemukan ' + i + ', butuh ' + SCRIPTS.length + ')');
}

const out = path.join(ROOT, 'index-single.html');
fs.writeFileSync(out, html);

/* ============================ VERIFIKASI ============================ */
const count = (s, p) => (s.match(p) || []).length;
const srcGame = read('js/game.js');
const srcDb = read('js/db.js');

function countBytesOf(f) { return Buffer.byteLength(read(f)); }

const inlineStyle = html.match(/<style>\n([\s\S]*?)\n<\/style>/);
const inlineScripts = html.match(/<script>\n([\s\S]*?)\n<\/script>/g) || [];

const checks = [
  ['ukuran <style> inline == css/style.css', inlineStyle && inlineStyle[1].trim() === css],
  ['jumlah blok <script> inline == 5', inlineScripts.length === SCRIPTS.length],
  ['isi script inline == isi file sumber (berurutan)',
    SCRIPTS.every((f, idx) => inlineScripts[idx] === '<script>\n' + read(f) + '\n</script>')],
  ['shorthand $$ game.js utuh di file hasil (hitung di blok inline game.js)',
    inlineScripts.length === 5 &&
    (inlineScripts[4].match(/\$\$/g) || []).length === count(srcGame, /\$\$/g) &&
    count(srcGame, /\$\$/g) > 0],
  ['tidak ada lagi <script src=', count(html, /<script src=/g) === 0],
  ['tidak ada lagi <link ... css/style.css', !/href="css\/style\.css"/.test(html)],
  ['ukuran total masuk akal', Buffer.byteLength(html) > 100000],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '  OK   ' : ' FAIL  ') + name);
  if (!ok) failed++;
}
console.log('written', path.relative(ROOT, out), Buffer.byteLength(html), 'bytes');
process.exit(failed ? 1 : 0);
