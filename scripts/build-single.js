/* ============================================================
   BUILD: satukan semua CSS & JS ke satu file index.html
   Menghasilkan index-single.html (self-contained, hanya butuh
   Google Fonts dari CDN — semuanya lainnya inline).
   Jalankan: node scripts/build-single.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

let html = read('index.html');
const css = read('css/style.css').trim();

/* 1) Inline CSS — pakai replacement FUNCTION supaya karakter '$'
      di dalam konten tidak diinterpretasi sebagai pattern khusus. */
const linkRe = /^[^\S\n]*<link rel="stylesheet" href="css\/style\.css">[^\S\n]*$/m;
if (!linkRe.test(html)) { console.error('LINK TAG css/style.css TIDAK DITEMUKAN'); process.exit(1); }
html = html.replace(linkRe, () => '<style>\n' + css + '\n</style>');

/* 2) Inline JS satu per satu (urutan sama dengan tag asli).
      Catatan penting: WAJIB replacement function — kalau string
      dipakai langsung, '$$' di game.js akan dianggap '$' literal
      dan semua shorthand $$() rusak. */
const scripts = ['js/db.js', 'js/sfx.js', 'js/fx.js', 'js/questions.js', 'js/game.js'];
for (const f of scripts) {
  const tagRe = new RegExp('<script src="' + f.replace(/\//g, '\\/') + '"></script>');
  if (!tagRe.test(html)) { console.error('SCRIPT TAG TIDAK DITEMUKAN: ' + f); process.exit(1); }
  const code = read(f);
  if (/<\/script/i.test(code)) { console.error(f, 'berisi </script> — bikin inline tidak aman'); process.exit(1); }
  html = html.replace(tagRe, () => '<script>\n' + code + '\n</script>');
}

const out = path.join(ROOT, 'index-single.html');
fs.writeFileSync(out, html);

/* 3) Verifikasi pasca-build */
const checks = [];
const count = (s, p) => (s.match(p) || []).length;
const a = count(read('js/game.js'), /\$\$/g);
const b = count(html, /\$\$/g);
checks.push(['$$ game.js = $$ di single-file', a > 0 && a === b, a + ' vs ' + b]);
checks.push(['tidak ada lagi <script src=', (html.match(/<script src=/g) || []).length === 0]);
checks.push(['tidak ada lagi <link ... style.css', !/href="css\/style\.css"/.test(html)]);
checks.push(['ada 1 <style> inline', count(html, /<style>/g) === 1]);
checks.push(['ada 5 <script> inline', count(html, /<script>\n/g) === 5]);

let failed = 0;
for (const [name, ok, extra] of checks) {
  console.log((ok ? '  OK   ' : ' FAIL  ') + name + (ok ? '' : ' — ' + extra));
  if (!ok) failed++;
}
console.log('written', path.relative(ROOT, out), Buffer.byteLength(html), 'bytes');
process.exit(failed ? 1 : 0);
