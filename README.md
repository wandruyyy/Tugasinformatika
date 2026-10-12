# LIBRARY RECOVERY: SMAN 6 TAMBUN SELATAN

Game edukasi interaktif untuk mata pelajaran **Informatika Kelas 10** dengan tema **Berpikir Komputasional (Computational Thinking)**.

Pemain ditugaskan memperbaiki sistem perpustakaan sekolah yang error — melalui 4 proses pemulihan:

1. **Decomposition** — memecah masalah besar menjadi bagian kecil
2. **Pattern Recognition** — menemukan pola yang berulang
3. **Abstraction** — menyaring informasi penting
4. **Algorithm** — menyusun langkah secara berurutan

Total **17 soal** (3 + 4 + 5 + 4 + 1 final), dengan mekanik bervariasi: multi-select, pattern analysis, database filtering, click-data, drag & drop, sorting, dan input terminal.

## Teknologi

- HTML5 + CSS3 + JavaScript murni (tanpa framework berat, tanpa build step)
- Simulasi database SQL (`books`, `students`, `transactions`) dengan tampilan query SQL
- WebAudio untuk sound effect (tanpa file audio eksternal)
- Canvas untuk confetti & fireworks
- Responsive: desktop & mobile (drag&drop punya mode tap untuk layar sentuh)

## Menjalankan

```bash
npm start          # atau: node server.js
```

Server berjalan di `0.0.0.0:3000` (mengikuti variabel `PORT`). Bisa juga langsung membuka `index.html` di browser.

## Struktur

```
index.html          — semua scene (meja → boot → desktop → game → ending)
css/style.css       — tema retro Windows klasik (cokelat/krem/putih), CRT, bevel, glitch
js/db.js            — database perpustakaan tersimulasi + render tabel SQL
js/questions.js     — 17 soal (4 level + final)
js/sfx.js           — sound effect WebAudio
js/fx.js            — confetti & fireworks canvas
js/game.js          — alur game, terminal, window OS, cinematics
server.js           — static server tanpa dependensi
```
