/* ============================================================
   LIBRARY RECOVERY — SIMULATED SQL DATABASE
   Konsep query SQL disimulasikan dengan JavaScript/local data.
   ============================================================ */

const SQL = (() => {
  // CREATE TABLE books ( id, title, author, genre, pages, cover_color, status );
  const BOOKS = [
    { id: 101, title: 'Bumi', author: 'Tere Liye', genre: 'Fiksi', pages: 440, cover_color: 'Biru', status: 'Tersedia' },
    { id: 102, title: 'Laskar Pelangi', author: 'Andrea Hirata', genre: 'Fiksi', pages: 529, cover_color: 'Kuning', status: 'Dipinjam' },
    { id: 103, title: 'Laut Bercerita', author: 'Leila S. Chudori', genre: 'Fiksi', pages: 379, cover_color: 'Merah', status: 'Tersedia' },
    { id: 104, title: 'Negeri 5 Menara', author: 'Ahmad Fuadi', genre: 'Fiksi', pages: 423, cover_color: 'Hijau', status: 'Dipinjam' },
    { id: 105, title: 'Atomic Habits', author: 'James Clear', genre: 'Nonfiksi', pages: 320, cover_color: 'Putih', status: 'Tersedia' },
    { id: 106, title: 'Filosofi Teras', author: 'Henry Manampiring', genre: 'Nonfiksi', pages: 344, cover_color: 'Biru', status: 'Dipinjam' },
    { id: 107, title: 'Dilan 1990', author: 'Pidi Baiq', genre: 'Fiksi', pages: 332, cover_color: 'Hitam', status: 'Tersedia' },
    { id: 108, title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', genre: 'Fiksi', pages: 535, cover_color: 'Cokelat', status: 'Dipinjam' },
    { id: 109, title: 'Janji', author: 'Tere Liye', genre: 'Fiksi', pages: 488, cover_color: 'Hijau', status: 'Tersedia' },
  ];

  // CREATE TABLE students ( id, name, class, book, status );
  const STUDENTS = [
    { id: 1027, name: 'Baihaqi', class: 'X-A', book: 'Laskar Pelangi', status: 'NOT RETURNED' },
    { id: 1031, name: 'Citra', class: 'X-A', book: 'Janji', status: 'RETURNED' },
    { id: 1042, name: 'Dewi', class: 'X-B', book: 'Dilan 1990', status: 'NOT RETURNED' },
    { id: 1050, name: 'Fajar', class: 'X-B', book: 'Laut Bercerita', status: 'RETURNED' },
    { id: 1062, name: 'Gita', class: 'X-C', book: 'Bumi Manusia', status: 'NOT RETURNED' },
  ];

  // CREATE TABLE transactions ( student_id, book, borrow_date, return_date, status, color );
  const TRANSACTIONS = [
    { student_id: 1027, book: 'Bumi', borrow_date: '01/09/2026', return_date: '-', status: 'Late', color: 'Blue' },
    { student_id: 1031, book: 'Janji', borrow_date: '02/09/2026', return_date: '09/09/2026', status: 'Returned', color: 'Green' },
    { student_id: 1042, book: 'Dilan', borrow_date: '03/09/2026', return_date: '-', status: 'Late', color: 'Black' },
    { student_id: 1050, book: 'Laut Bercerita', borrow_date: '04/09/2026', return_date: '11/09/2026', status: 'Returned', color: 'Red' },
    { student_id: 1062, book: 'Bumi Manusia', borrow_date: '05/09/2026', return_date: '-', status: 'Late', color: 'Brown' },
  ];

  // CREATE TABLE weekly_log ( day, borrowed, returned );
  const WEEKLY_LOG = [
    { day: 'Senin', borrowed: 40, returned: 15 },
    { day: 'Selasa', borrowed: 55, returned: 20 },
    { day: 'Rabu', borrowed: 40, returned: 15 },
    { day: 'Kamis', borrowed: 55, returned: 20 },
    { day: 'Jumat', borrowed: 40, returned: 15 },
  ];

  const WEEKLY_LOG_EN = [
    { day: 'Monday', borrowed: 40, returned: 15 },
    { day: 'Tuesday', borrowed: 55, returned: 20 },
    { day: 'Wednesday', borrowed: 40, returned: 15 },
    { day: 'Thursday', borrowed: 55, returned: 20 },
    { day: 'Friday', borrowed: 40, returned: 15 },
  ];

  const BOOK_IDS_ODD = [101, 103, 105, 107, 109];

  const TABLES = { books: BOOKS, students: STUDENTS, transactions: TRANSACTIONS, weekly_log: WEEKLY_LOG };

  // SELECT * FROM books WHERE status = 'Tersedia';
  function select(table, whereFn) {
    const rows = TABLES[table] || [];
    return whereFn ? rows.filter(whereFn) : rows.slice();
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Render an HTML <table> from rows (with optional hidden columns + hidden rows)
  function renderTable(table, columns, opts = {}) {
    const rows = select(table).filter(opts.rowFilter || (() => true));
    const cols = columns || Object.keys(rows[0] || { id: 1 });
    const hiddenRows = opts.hiddenRowIds || [];
    const highlight = opts.highlightValue || null;
    let html = `<div class="sql-table-wrap"><table class="sql-table"><thead><tr>`;
    for (const c of cols) html += `<th>${esc(c.replace(/_/g, ' ').toUpperCase())}</th>`;
    html += `</tr></thead><tbody>`;
    for (const r of rows) {
      if (hiddenRows.includes(r.id) || hiddenRows.includes(r.student_id)) continue;
      html += `<tr${highlight && String(Object.values(r)).includes(highlight) ? ' class="row-highlight"' : ''}>`;
      for (const c of cols) {
        let v = r[c];
        let cls = '';
        if (c === 'status') {
          if (v === 'Tersedia' || v === 'Returned' || v === 'RETURNED') cls = 'st-avail';
          else if (v === 'Dipinjam' || v === 'Late' || v === 'NOT RETURNED') cls = 'st-borrowed';
        }
        html += `<td class="${cls}">${esc(v)}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    return html;
  }

  return { BOOKS, STUDENTS, TRANSACTIONS, WEEKLY_LOG, WEEKLY_LOG_EN, BOOK_IDS_ODD, select, renderTable, esc };
})();

window.SQL = SQL;
