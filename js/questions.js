/* ============================================================
   LIBRARY RECOVERY — DATA SOAL (17 SOAL)
   Level 1: Decomposition (3) · Level 2: Pattern Recognition (4)
   Level 3: Abstraction (5) · Level 4: Algorithm (4) · Final (1)
   ============================================================ */

const LEVELS = [
  {
    id: 1, name: 'DECOMPOSITION', sub: 'BREAK THE PROBLEM INTO SMALLER PARTS',
    intro: 'Library system contains multiple problems.\nYour task: Break the main problem into smaller parts.',
    concept: 'DECOMPOSITION = memecah masalah besar menjadi bagian-bagian kecil.',
    window: 'PROCESS 01 — DECOMPOSITION',
  },
  {
    id: 2, name: 'PATTERN RECOGNITION', sub: 'FIND WHAT REPEATS',
    intro: 'Analyze the library transaction log.\nYour task: Find the repeating pattern.',
    concept: 'PATTERN RECOGNITION = menemukan pola atau sesuatu yang berulang.',
    window: '📊 LIBRARY TRANSACTION LOG',
  },
  {
    id: 3, name: 'ABSTRACTION', sub: 'KEEP THE IMPORTANT DATA — IGNORE THE REST',
    intro: 'Database contains too much information.\nYour task: Filter only the important data.',
    concept: 'ABSTRACTION = mengambil informasi penting dan mengabaikan yang tidak diperlukan.',
    window: '🗄 DATABASE — FILTER VIEW',
  },
  {
    id: 4, name: 'ALGORITHM', sub: 'PUT THE STEPS IN THE CORRECT ORDER',
    intro: '⚙ PROCESS BUILDER\nYour task: Arrange the steps into a working algorithm.',
    concept: 'ALGORITHM = menyusun langkah penyelesaian masalah secara berurutan.',
    window: '⚙ PROCESS BUILDER',
  },
  {
    id: 5, name: 'FINAL ALGORITHM TEST', sub: 'REPAIR THE FINAL SEQUENCE',
    intro: 'The recovery system cannot continue.\nYour task: Rearrange the final algorithm.',
    concept: 'SUSUN ULANG ALGORITMA PEMINJAMAN BUKU.',
    window: 'FINAL ALGORITHM TEST',
  },
];

const QUESTIONS = [
  /* ============ LEVEL 1 — DECOMPOSITION (3 soal) ============ */
  {
    id: 1, level: 1, type: 'multi',
    kicker: 'SYSTEM PROBLEM',
    text: '"Library borrowing system is not working."\nIdentify the components related to the problem.',
    cards: ['DATA BUKU', 'DATA SISWA', 'PEMINJAMAN', 'PENGEMBALIAN', 'WARNA WEBSITE', 'MUSIK'],
    answer: ['DATA BUKU', 'DATA SISWA', 'PEMINJAMAN', 'PENGEMBALIAN'],
    feedback: ['> COMPONENTS IDENTIFIED.', 'DECOMPOSITION: 33%'],
  },
  {
    id: 2, level: 1, type: 'multi',
    kicker: 'DECOMPOSE FURTHER',
    text: 'The problem becomes more specific.\n"Banyak siswa tidak dapat meminjam buku."\nBreak this problem into smaller parts.',
    cards: ['A. Data siswa', 'B. Data buku', 'C. Ketersediaan buku', 'D. Sistem peminjaman', 'E. Warna website', 'F. Musik website'],
    answer: ['A. Data siswa', 'B. Data buku', 'C. Ketersediaan buku', 'D. Sistem peminjaman'],
    feedback: ['> PROBLEM SUCCESSFULLY DECOMPOSED.', 'DECOMPOSITION: 66%'],
  },
  {
    id: 3, level: 1, type: 'multi',
    kicker: 'CHECK THE PARTS',
    text: '"Data peminjaman buku tidak tercatat."\nSelect the parts that should be checked.',
    cards: ['DATA SISWA', 'DATA BUKU', 'TRANSAKSI PEMINJAMAN', 'WALLPAPER', 'MUSIK'],
    answer: ['DATA SISWA', 'DATA BUKU', 'TRANSAKSI PEMINJAMAN'],
    feedback: ['> DECOMPOSITION COMPLETE.', 'RECOVERY DATA: D-01'],
  },

  /* ============ LEVEL 2 — PATTERN RECOGNITION (4 soal) ============ */
  {
    id: 4, level: 2, type: 'mc',
    kicker: 'TRANSACTION LOG',
    text: 'Apa pola dari data tersebut?',
    panel: { kind: 'log', lines: [
      'MONDAY       <num>40</num>',
      'TUESDAY      <num>55</num>',
      'WEDNESDAY    <num>40</num>',
      'THURSDAY     <num>55</num>',
      'FRIDAY       <num>40</num>',
    ] },
    options: ['A. 40 → 55 → 40 → 55 → 40', 'B. 40 → 40 → 40', 'C. Selalu meningkat', 'D. Tidak ada pola'],
    answer: 0,
    feedback: ['> REPEATING PATTERN DETECTED.'],
  },
  {
    id: 5, level: 2, type: 'mc',
    kicker: 'BOOK ID REGISTRY',
    text: 'Pola apa yang terlihat pada ID buku?',
    panel: { kind: 'log', lines: ['BOOK ID', '<num>101</num>  <num>103</num>  <num>105</num>  <num>107</num>  <num>109</num>'] },
    options: ['A. Bertambah 1', 'B. Bertambah 2', 'C. Berkurang 2', 'D. Tidak memiliki pola'],
    answer: 1,
    feedback: ['> ID PATTERN LOCKED.'],
  },
  {
    id: 6, level: 2, type: 'mc',
    kicker: 'SYSTEM LOG',
    text: 'Apa pola yang terlihat?',
    panel: { kind: 'log', lines: [
      '<hl>LOGIN</hl>   <bad>ERROR</bad>',
      '<hl>LOGIN</hl>   <bad>ERROR</bad>',
      '<hl>LOGIN</hl>   <bad>ERROR</bad>',
    ] },
    options: ['A. LOGIN selalu muncul', 'B. ERROR selalu muncul', 'C. LOGIN dan ERROR muncul bergantian', 'D. Tidak ada pola'],
    answer: 2,
    feedback: ['> ALTERNATING PATTERN FOUND.'],
  },
  {
    id: 7, level: 2, type: 'analyze',
    kicker: 'BORROW HISTORY — 14/09/2026',
    text: 'Apa yang terjadi pada jumlah buku yang dipinjam dan dikembalikan?',
    analyzeLabel: '🔍 ANALYZE PATTERN',
    panel: { kind: 'log', lines: [
      '<dim>Hari       Dipinjam    Dikembalikan</dim>',
      'Senin         <num>40</num>          <num>15</num>',
      'Selasa        <num>55</num>          <num>20</num>',
      'Rabu          <num>40</num>          <num>15</num>',
      'Kamis         <num>55</num>          <num>20</num>',
      'Jumat         <num>40</num>          <num>15</num>',
    ] },
    options: [
      'A. Angkanya naik setiap hari.',
      'B. Jumlah buku yang dikembalikan terlihat teratur.',
      'C. Angkanya selalu sama setiap hari.',
      'D. Tidak ada hubungan antara datanya.',
    ],
    answer: 1,
    feedback: ['> REPEATING PATTERN DETECTED.', 'PATTERN RECOGNITION COMPLETE.', 'RECOVERY DATA: P-02'],
  },

  /* ============ LEVEL 3 — ABSTRACTION (5 soal) ============ */
  {
    id: 8, level: 3, type: 'fields',
    kicker: 'DATABASE > STUDENTS',
    text: 'Data apa yang diperlukan untuk mengetahui buku yang belum dikembalikan?\nKlik data yang penting.',
    panel: { kind: 'dbcard', title: 'DATABASE > STUDENTS', fields: [
      { key: 'Name', value: 'Baihaqi' },
      { key: 'Class', value: 'X-A' },
      { key: 'Student ID', value: '1027' },
      { key: 'Hobby', value: 'Watching movies' },
      { key: 'Height', value: '170 cm' },
      { key: 'Book', value: 'Laskar Pelangi' },
      { key: 'Status', value: 'NOT RETURNED' },
    ] },
    answer: ['Student ID', 'Book', 'Status'],
    feedback: ['> IRRELEVANT DATA REMOVED.'],
  },
  {
    id: 9, level: 3, type: 'mc',
    kicker: 'DATABASE > BOOKS',
    text: 'Jika ingin mencari buku karya Tere Liye, informasi apa yang paling penting?',
    panel: { kind: 'table', table: 'books', cols: ['id', 'title', 'author', 'genre'] },
    options: ['A. Judul dan Penulis', 'B. Warna sampul dan halaman', 'C. Genre dan halaman', 'D. ID dan warna sampul'],
    answer: 0,
    feedback: ['> KEY INFORMATION SELECTED.'],
  },
  {
    id: 10, level: 3, type: 'mc',
    kicker: 'DATABASE > BOOKS (FULL)',
    text: 'Jika sistem ingin mengetahui buku mana yang masih bisa dipinjam, bagian mana yang paling penting diperhatikan?\n(Coba filter status di atas tabel.)',
    panel: { kind: 'filter_table', table: 'books', cols: ['id', 'title', 'author', 'genre', 'pages', 'cover_color', 'status'] },
    options: ['A. Judul buku dan Status buku', 'B. Warna sampul dan jumlah halaman', 'C. Nama penulis dan genre', 'D. ID buku dan warna sampul'],
    answer: 0,
    feedback: ['> AVAILABILITY FOCUS FOUND.'],
  },
  {
    id: 11, level: 3, type: 'mc',
    kicker: 'DATABASE > TRANSACTIONS',
    text: 'Untuk menemukan siswa yang terlambat mengembalikan buku, informasi mana yang perlu diperhatikan?',
    panel: { kind: 'table', table: 'transactions', cols: ['student_id', 'book', 'borrow_date', 'return_date', 'status', 'color'] },
    options: ['A. Student ID dan Status', 'B. Warna dan tanggal pinjam', 'C. Judul dan warna', 'D. Warna dan tanggal kembali'],
    answer: 0,
    feedback: ['> LATE DETECTOR FIELDS FOUND.'],
  },
  {
    id: 12, level: 3, type: 'fields',
    kicker: 'ABSTRACTION FILTER',
    text: 'Cari semua siswa yang masih memiliki buku yang belum dikembalikan.\nGunakan hanya informasi yang diperlukan.',
    panel: { kind: 'dbcard', title: 'DATABASE > STUDENTS (RAW)', fields: [
      { key: 'Student ID', value: '1027' },
      { key: 'Name', value: 'Baihaqi' },
      { key: 'Class', value: 'X-A' },
      { key: 'Book', value: 'Laskar Pelangi' },
      { key: 'Genre', value: 'Fiksi' },
      { key: 'Borrow Date', value: '01/09/2026' },
      { key: 'Status', value: 'NOT RETURNED' },
      { key: 'Favorite Color', value: 'Blue' },
      { key: 'Height', value: '170 cm' },
      { key: 'Hobby', value: 'Watching movies' },
    ] },
    answer: ['Student ID', 'Name', 'Book', 'Status'],
    feedback: ['> DATA FILTERED.', '> RELEVANT INFORMATION FOUND.', 'ABSTRACTION COMPLETE.', 'RECOVERY DATA: A-03'],
  },

  /* ============ LEVEL 4 — ALGORITHM (4 soal) ============ */
  {
    id: 13, level: 4, type: 'drag',
    kicker: '⚙ PROCESS BUILDER',
    text: 'Susun algoritma PEMINJAMAN buku yang benar.',
    pool: ['SIMPAN TRANSAKSI', 'PILIH BUKU', 'INPUT DATA SISWA', 'CEK KETERSEDIAAN'],
    order: ['PILIH BUKU', 'CEK KETERSEDIAAN', 'INPUT DATA SISWA', 'SIMPAN TRANSAKSI'],
    feedback: ['> PROCESS VALID.'],
  },
  {
    id: 14, level: 4, type: 'drag',
    kicker: '⚙ PROCESS BUILDER',
    text: 'Susun algoritma PENGEMBALIAN buku yang benar.',
    pool: ['UPDATE STATUS BUKU', 'CARI DATA PEMINJAMAN', 'INPUT ID SISWA', 'KONFIRMASI PENGEMBALIAN'],
    order: ['INPUT ID SISWA', 'CARI DATA PEMINJAMAN', 'KONFIRMASI PENGEMBALIAN', 'UPDATE STATUS BUKU'],
    feedback: ['> RETURN ALGORITHM VALID.'],
  },
  {
    id: 15, level: 4, type: 'drag',
    kicker: '⚙ PROCESS BUILDER',
    text: 'Susun algoritma SEARCH buku yang benar.',
    pool: ['TAMPILKAN HASIL', 'BUKA LIBRARY APP', 'MASUKKAN JUDUL', 'SEARCH DATABASE'],
    order: ['BUKA LIBRARY APP', 'MASUKKAN JUDUL', 'SEARCH DATABASE', 'TAMPILKAN HASIL'],
    feedback: ['> SEARCH ALGORITHM VALID.'],
  },
  {
    id: 16, level: 4, type: 'sort',
    kicker: '⚙ PROCESS BUILDER — SORTING',
    text: 'Urutkan ID buku dari yang TERKECIL ke TERBESAR.\nKlik kartu sesuai urutan yang benar.',
    pool: [109, 101, 105, 103, 107],
    order: [101, 103, 105, 107, 109],
    feedback: ['> DATABASE SORTED.', '> ALGORITHM COMPLETE.'],
  },

  /* ============ FINAL TERMINAL (1 soal) ============ */
  {
    id: 17, level: 5, type: 'drag',
    kicker: 'FINAL ALGORITHM TEST',
    text: 'The recovery system cannot continue.\nRearrange the algorithm.',
    wrongShown: ['Simpan transaksi', 'Pilih buku', 'Cek ketersediaan', 'Input siswa'],
    pool: ['SIMPAN TRANSAKSI', 'PILIH BUKU', 'CEK KETERSEDIAAN', 'INPUT SISWA'],
    order: ['PILIH BUKU', 'CEK KETERSEDIAAN', 'INPUT SISWA', 'SIMPAN TRANSAKSI'],
    feedback: ['> ALGORITHM VALID.', '> FINAL RECOVERY SEQUENCE ACCEPTED.'],
  },
];

window.LEVELS = LEVELS;
window.QUESTIONS = QUESTIONS;
