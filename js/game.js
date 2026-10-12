/* ============================================================
   LIBRARY RECOVERY — GAME CONTROLLER
   ============================================================ */

(() => {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const TOTAL = 17;

  const state = {
    started: false,
    solved: 0,
    perLevelIndex: {},
    levelStatus: { 1: 'locked', 2: 'locked', 3: 'locked', 4: 'locked', 5: 'locked' },
    analyzeShown: false,
    countdownLeft: 20 * 60,
    countdownTimer: null,
    termEnabled: false,
    scanning: false,
    answered: false,
    solvedIds: new Set(),
    finished: false,
  };

  // ---------- elements ----------
  const deskScene = $('#desk-scene');
  const computerScene = $('#computer-scene');
  const monitor = $('#monitor');
  const bootScreen = $('#boot-screen');
  const desktopScreen = $('#desktop-screen');
  const terminalWindow = $('#terminal-window');
  const termOut = $('#terminal-output');
  const termInput = $('#terminal-input');
  const termHint = $('#term-hint');
  const gameWindow = $('#game-window');
  const gameBody = $('#game-body');
  const levelTitle = $('#level-title');
  const glitchOverlay = $('#glitch-overlay');
  const bezelStatus = $('#bezel-status');
  const bezelStatusDot = $('.bezel-status-dot');

  // ============================================================
  // UTIL
  // ============================================================
  const timers = [];
  function wait(ms) { return new Promise(r => timers.push(setTimeout(r, ms))); }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function playGlitch(times) {
    const n = times || 1;
    for (let i = 0; i < n; i++) {
      timers.push(setTimeout(() => {
        glitchOverlay.classList.remove('on');
        void glitchOverlay.offsetWidth;
        glitchOverlay.classList.add('on');
        Sfx.glitch();
      }, i * 700));
    }
  }

  function setBezel(text, ok) {
    bezelStatus.textContent = text;
    bezelStatus.className = 'bezel-status' + (ok ? ' ok' : '');
    if (bezelStatusDot) bezelStatusDot.classList.toggle('ok', !!ok);
  }

  function startClocks() {
    const bc = $('#bezel-clock');
    const tc = $('#taskbar-clock');
    const tick = () => {
      const t = new Date().toTimeString().slice(0, 5);
      bc.textContent = t;
      tc.textContent = t;
    };
    tick();
    timers.push(setInterval(tick, 15000));
  }

  // ============================================================
  // WINDOWS
  // ============================================================
  const openList = [];
  const WIN_META = {
    'error-window': { icon: '⚠', label: 'Library System' },
    'terminal-window': { icon: '💻', label: 'Terminal' },
    'game-window': { icon: '⚙', label: 'Recovery' },
    'database-window': { icon: '📊', label: 'Database' },
    'recovery-window': { icon: '🛠', label: 'Restore' },
    'notes-window': { icon: '📝', label: 'Notes' },
    'files-window': { icon: '📁', label: 'Files' },
  };
  const WIN_ORDER = ['error-window', 'terminal-window', 'game-window', 'database-window', 'recovery-window', 'notes-window', 'files-window'];

  function syncTaskbar() {
    const items = $('#taskbar-items');
    items.innerHTML = '';
    for (const id of WIN_ORDER) {
      if (openList.indexOf(id) === -1) continue;
      const m = WIN_META[id];
      const el = document.createElement('div');
      el.className = 'tb-item' + (minimizedSet.has(id) ? ' minimized' : ' active');
      el.title = m.label;
      el.innerHTML = '<span>' + m.icon + '</span><span>' + m.label + '</span>';
      el.onclick = () => {
        Sfx.click();
        if (minimizedSet.has(id)) { restoreWindow(id); return; }
        if (focusedId === id) { minimizeWindow(id); return; }
        focusWindow(id);
      };
      items.appendChild(el);
    }
  }

  let focusedId = null;
  let maximizedId = null;
  const minimizedSet = new Set();

  // how to (re)open each window — used by taskbar restore & desktop icons (anti soft-lock)
  const winOpeners = {
    'error-window': () => openWindow('error-window', { width: 560 }),
    'terminal-window': () => { openWindow('terminal-window', { width: 640 }); },
    'game-window': () => {
      const lvl = activeGameLevel();
      const L = LEVELS.find(l => l.id === lvl);
      openWindow('game-window', { width: 640, title: L ? L.window : 'RECOVERY', badge: L ? 'LEVEL 0' + lvl : 'RECOVERY' });
      renderQuestionForLevel(lvl);
    },
    'database-window': () => { openWindow('database-window', { width: 680 }); renderDatabaseApp(); },
    'recovery-window': () => openWindow('recovery-window', { width: 640 }),
    'notes-window': () => openWindow('notes-window', { width: 420 }),
    'files-window': () => openWindow('files-window', { width: 420 }),
  };

  function activeGameLevel() {
    for (let l = 1; l <= 5; l++) if (state.levelStatus[l] === 'active') return l;
    let last = 1;
    for (let l = 1; l <= 5; l++) if (state.levelStatus[l] === 'done') last = l;
    return last;
  }

  function openWindow(id, opts) {
    const o = opts || {};
    const el = document.getElementById(id);
    if (!el) return;
    if (o.width) el.style.width = 'min(' + o.width + 'px, calc(100vw - 24px))';
    if (o.title) $('.os-window-title', el).textContent = o.title;
    const badge = $('.os-window-badge', el);
    if (badge && o.badge) badge.textContent = o.badge;
    // letakkan window ini paling depan (di atas semua window lain yang sedang terbuka)
    const otherZ = $$('.os-window')
      .filter(w => w !== el && !w.classList.contains('hidden') && !w.classList.contains('minimized'))
      .reduce((max, w) => Math.max(max, parseInt(w.style.zIndex, 10) || 20), 20);
    el.style.zIndex = otherZ + 1;
    if (maximizedId === id) unmaximizeWindow(el);
    minimizedSet.delete(id);
    el.classList.remove('minimized');
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    focusedId = id;
    if (openList.indexOf(id) === -1) openList.push(id);
    Sfx.open();
    syncTaskbar();
  }

  function minimizeWindow(id) {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains('show') || el.classList.contains('minimized')) return;
    if (maximizedId === id) unmaximizeWindow(el);
    el.classList.remove('show');
    el.classList.add('minimized');
    minimizedSet.add(id);
    if (focusedId === id) focusedId = null;
    Sfx.click();
    syncTaskbar();
  }

  function restoreWindow(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('minimized');
    minimizedSet.delete(id);
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    focusWindow(id);
    Sfx.open();
    if (id === 'terminal-window' && state.termEnabled) focusTerm();
    syncTaskbar();
  }

  function toggleMaximize(id) {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains('show') || el.classList.contains('minimized')) return;
    if (el.classList.contains('maximized')) {
      unmaximizeWindow(el);
      Sfx.place();
    } else {
      if (maximizedId && maximizedId !== id) unmaximizeWindow(document.getElementById(maximizedId));
      el._preMaxWidth = el.style.width;
      el.style.width = 'calc(100% - 20px)';
      el.classList.add('maximized');
      maximizedId = id;
      Sfx.place();
    }
    focusWindow(id);
  }

  function unmaximizeWindow(el) {
    if (!el) return;
    if (el.classList.contains('maximized')) {
      el.classList.remove('maximized');
      el.style.width = el._preMaxWidth != null ? el._preMaxWidth : '';
    }
    if (maximizedId === el.id) maximizedId = null;
  }

  function closeWindow(id) {
    const el = document.getElementById(id);
    if (!el || el.classList.contains('hidden')) return;
    if (maximizedId === id) maximizedId = null;
    minimizedSet.delete(id);
    el.classList.remove('show');
    el.classList.remove('minimized');
    timers.push(setTimeout(() => { if (!el.classList.contains('show')) el.classList.add('hidden'); }, 240));
    const i = openList.indexOf(id);
    if (i >= 0) openList.splice(i, 1);
    if (focusedId === id) focusedId = null;
    Sfx.click();
    syncTaskbar();
  }

  function focusWindow(id) {
    $$('.os-window').forEach(w => { w.style.zIndex = 20; });
    const el = document.getElementById(id);
    if (el) el.style.zIndex = 30;
    focusedId = id;
    syncTaskbar();
  }

  function isShown(id) {
    const el = document.getElementById(id);
    return !!el && el.classList.contains('show') && !el.classList.contains('hidden') && !el.classList.contains('minimized');
  }

  // ============================================================
  // DESKTOP
  // ============================================================
  const ICONS = [
    { id: 'library', icon: '📚', label: 'Library System' },
    { id: 'database', icon: '🗄', label: 'Database' },
    { id: 'terminal', icon: '💻', label: 'Terminal' },
    { id: 'files', icon: '📁', label: 'Files' },
    { id: 'notes', icon: '📝', label: 'Notes' },
  ];

  function buildDesktop() {
    const wrap = $('#desktop-icons');
    wrap.innerHTML = '';
    ICONS.forEach(it => {
      const d = document.createElement('div');
      d.className = 'd-icon';
      d.innerHTML = '<span class="ic">' + it.icon + '</span><span class="lb">' + it.label + '</span>';
      d.onclick = () => { Sfx.click(); openApp(it.id); };
      d.onmouseenter = () => Sfx.hover();
      wrap.appendChild(d);
    });
    $('#desktop-hint').textContent = '> CLICK [ LIBRARY SYSTEM ] TO CONTINUE';
  }

  function openApp(id) {
    if (id === 'library') {
      // after the game has started, the Library System icon points to the active Recovery window
      if (state.levelStatus[1] !== 'locked') winOpeners['game-window']();
      else openWindow('error-window', { width: 560 });
    }
    else if (id === 'terminal') openTerminalIntro();
    else if (id === 'database') winOpeners['database-window']();
    else if (id === 'files') openWindow('files-window', { width: 420 });
    else if (id === 'notes') openWindow('notes-window', { width: 420 });
  }

  // ============================================================
  // PHASE 1: DESK → ZOOM → BOOT
  // ============================================================
  async function startGame() {
    if (state.started) return;
    state.started = true;
    Sfx.unlock();
    Sfx.open();
    deskScene.classList.add('zooming');
    await wait(1500);
    computerScene.classList.remove('hidden-scene');
    deskScene.classList.add('hidden-scene');
    await wait(350);
    runBoot();
  }

  async function runBoot() {
    bootScreen.classList.remove('hidden');
    setBezel('BOOTING', false);
    Sfx.boot();
    const status = $('#boot-status');
    const fill = $('.boot-bar-fill', bootScreen);
    const steps = ['BOOTING...', 'Loading Library Management System...', 'Mounting library.db ...', 'Checking recovery tools...'];
    for (let i = 0; i < steps.length; i++) {
      status.textContent = steps[i];
      fill.style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
      Sfx.scanTick();
      await wait(i === 1 ? 950 : 600);
    }
    await wait(350);
    bootScreen.classList.add('hidden');
    showDesktop();
  }

  async function showDesktop() {
    desktopScreen.classList.remove('hidden');
    buildDesktop();
    syncTaskbar();
    await wait(900);
    openApp('library');
    playGlitch(2);
    setBezel('ERROR', false);
    startCountdown();
  }

  function startCountdown() {
    if (state.countdownTimer) return;
    const el = $('#error-countdown');
    state.countdownTimer = setInterval(() => {
      state.countdownLeft = Math.max(0, state.countdownLeft - 1);
      const m = String(Math.floor(state.countdownLeft / 60)).padStart(2, '0');
      const s = String(state.countdownLeft % 60).padStart(2, '0');
      if (el) el.textContent = state.countdownLeft === 0
        ? 'SYSTEM LOCKDOWN IMMINENT'
        : 'SYSTEM LOCKDOWN IN: ' + m + ':' + s;
      if (state.countdownLeft === 0) {
        clearInterval(state.countdownTimer); state.countdownTimer = null;
        playGlitch(2);
      }
    }, 1000);
  }
  // ============================================================
  // PROGRESS
  // ============================================================
  function updateProgress() {
    $('#gp-fill').style.width = Math.round((state.solved / TOTAL) * 100) + '%';
    $('#gp-count').textContent = state.solved + ' / ' + TOTAL;
    renderLevelChips();
  }

  function renderLevelChips() {
    const wrap = $('#game-levels');
    const st = state.levelStatus;
    wrap.innerHTML = '';
    [1, 2, 3, 4, 5].forEach(n => {
      const chip = document.createElement('div');
      const cls = st[n] === 'done' ? 'done' : st[n] === 'active' ? 'now' : 'locked';
      chip.className = 'lv-chip ' + cls;
      const sym = st[n] === 'done' ? '✓' : st[n] === 'active' ? '…' : '🔒';
      const name = n === 5 ? 'FINAL' : 'LEVEL 0' + n;
      chip.innerHTML = name + ' <b>' + sym + '</b>';
      wrap.appendChild(chip);
    });
  }

  function questionNumber(q) {
    return QUESTIONS.indexOf(q) + 1;
  }

  // ============================================================
  // LEVEL TITLE CINEMATIC
  // ============================================================
  function showLevelTitle(level, cb) {
    const L = LEVELS.find(l => l.id === level);
    $('#lt-level').textContent = 'LEVEL 0' + level;
    $('#lt-name').textContent = L.name;
    $('#lt-sub').textContent = L.sub;
    levelTitle.classList.remove('hidden');
    const inner = $('.lt-inner', levelTitle);
    const fresh = inner.cloneNode(true);
    inner.parentNode.replaceChild(fresh, inner);
    Sfx.open();
    timers.push(setTimeout(() => {
      levelTitle.classList.add('hidden');
      cb();
    }, 2650));
  }

  function startLevel(level) {
    state.levelStatus[level] = 'active';
    renderLevelChips();
    showLevelTitle(level, () => {
      const L = LEVELS.find(l => l.id === level);
      openWindow('game-window', { width: 640, title: L.window, badge: 'LEVEL 0' + level });
      renderQuestionForLevel(level);
    });
  }

  function renderQuestionForLevel(level) {
    const qs = QUESTIONS.filter(q => q.level === level);
    const idx = state.perLevelIndex[level] || 0;
    renderQuestion(qs[Math.min(idx, qs.length - 1)]);
  }

  // ============================================================
  // RENDER QUESTION
  // ============================================================
  function renderQuestion(q) {
    state.current = q;
    state.answered = false;
    gameBody.scrollTop = 0;
    const tag = 'SOAL ' + questionNumber(q) + ' / 17';

    let panelHtml = '';
    if (q.panel) {
      if (q.panel.kind === 'log') {
        panelHtml = '<div class="log-panel">' + q.panel.lines.map(l => '<div>' + l + '</div>').join('') + '</div>';
      } else if (q.panel.kind === 'dbcard') {
        panelHtml =
          '<div class="log-panel" style="padding:14px 16px">' +
          '<div class="q-kicker" style="margin-bottom:10px">' + esc(q.panel.title) + '</div>' +
          '<div class="db-profile">' +
          q.panel.fields.map(f =>
            '<button class="db-field" data-key="' + esc(f.key) + '"><b>' + esc(f.key) + '</b>' + esc(f.value) + '</button>'
          ).join('') +
          '</div></div>';
      } else if (q.panel.kind === 'table') {
        panelHtml = SQL.renderTable(q.panel.table, q.panel.cols);
      } else if (q.panel.kind === 'filter_table') {
        panelHtml =
          '<div class="filter-row"><span class="q-tag">FILTER STATUS</span>' +
          '<button class="filter-chip on" data-f="ALL">ALL</button>' +
          '<button class="filter-chip" data-f="Tersedia">TERSEDIA</button>' +
          '<button class="filter-chip" data-f="Dipinjam">DIPINJAM</button></div>' +
          '<div id="q-table">' + SQL.renderTable(q.panel.table, q.panel.cols) + '</div>';
      }
    }

    let bodyHtml = '';
    if (q.type === 'multi') {
      bodyHtml =
        '<div class="cards-grid" id="q-cards">' +
        q.cards.map(c => '<button class="card-opt">' + esc(c) + '</button>').join('') +
        '</div>' +
        '<div class="q-actions"><button class="btn btn-primary" id="q-check">CHECK ANSWER</button></div>';
    } else if (q.type === 'mc' || q.type === 'analyze') {
      const showOpts = !(q.type === 'analyze' && !state.analyzeShown);
      const opts = showOpts
        ? '<div class="mc-list">' + q.options.map((o, i) =>
            '<button class="mc-opt" data-i="' + i + '"><span class="key">' + o.slice(0, 1) + '</span><span>' + esc(o.slice(3)) + '</span></button>'
          ).join('') + '</div>'
        : '<div class="mc-list"></div>';
      const analyzeBtn = (q.type === 'analyze' && !state.analyzeShown)
        ? '<div class="q-actions"><button class="btn btn-primary" id="q-analyze">' + (q.analyzeLabel || 'ANALYZE') + '</button></div>'
        : '';
      bodyHtml = analyzeBtn + opts;
    } else if (q.type === 'fields') {
      bodyHtml =
        '<div class="q-sub">Klik semua data yang PENTING. Data tidak relevan dibiarkan.</div>' +
        '<div class="q-actions"><button class="btn btn-primary" id="q-check">APPLY FILTER</button>' +
        '<button class="btn btn-ghost" id="q-reset">RESET</button></div>';
    } else if (q.type === 'drag' || q.type === 'sort') {
      const hintText = q.type === 'sort'
        ? 'Klik kartu angka sesuai urutan dari terkecil ke terbesar.'
        : 'Drag kartu ke slot 1-4. Di layar sentuh: tap kartu, lalu tap slot.';
      bodyHtml =
        '<div class="q-sub">' + hintText + '</div>' +
        '<div class="dd-slots" id="q-slots"></div>' +
        '<div class="dd-pool" id="q-pool"></div>' +
        '<div class="q-actions"><button class="btn btn-primary" id="q-check">' +
        (q.type === 'sort' ? 'CHECK ORDER' : 'RUN PROCESS') + '</button>' +
        '<button class="btn btn-ghost" id="q-reset">RESET</button></div>';
    }

    gameBody.innerHTML =
      '<div class="q-meta"><span class="q-tag">' + tag + '</span></div>' +
      '<div><div class="q-kicker">' + esc(q.kicker) + '</div>' +
      '<div class="q-text" style="white-space:pre-wrap">' + esc(q.text) + '</div></div>' +
      panelHtml +
      '<div id="q-answer-area">' + bodyHtml + '</div>' +
      '<div id="q-feedback"></div>';

    if (q.panel && q.panel.kind === 'filter_table') bindFilterChips(q);
    bindQuestionEvents(q);
  }

  function bindFilterChips(q) {
    // chip filter ada di panel (di luar #q-answer-area) — cari di gameBody
    $$('.filter-chip', gameBody).forEach(chip => {
      chip.onclick = () => {
        $$('.filter-chip', gameBody).forEach(c => c.classList.remove('on'));
        chip.classList.add('on');
        const f = chip.dataset.f;
        const html = SQL.renderTable(q.panel.table, q.panel.cols, {
          rowFilter: f === 'ALL' ? null : (r => r.status === f),
        });
        $('#q-table').innerHTML = html;
        Sfx.click();
      };
    });
  }

  function showFeedback(q, ok) {
    const fb = $('#q-feedback');
    if (ok) {
      const lines = q.feedback.map(l => '<span>' + esc(l) + '</span>').join('<span style="opacity:.4">·</span>');
      fb.innerHTML = '<div class="fb ok"><span>✓ CORRECT</span>' + lines + '</div>';
    } else {
      fb.innerHTML = '<div class="fb no"><span>✕ INCORRECT</span><span>Think about the problem again.</span></div>';
    }
  }

  function finishQuestion(q) {
    state.answered = true;
    // main ulang soal yang sudah selesai tidak menaikkan skor (maks 17/17)
    const firstTime = !state.solvedIds.has(q.id);
    state.solvedIds.add(q.id);
    if (firstTime) { state.solved += 1; updateProgress(); }
    const num = questionNumber(q);
    termPrint('C:\\SMAN6_LIBRARY> challenge_' + num, 'dim');
    termPrint('> CHALLENGE ' + num + ' / 17 COMPLETE', 'ok');
    advance(q);
  }

  // ============================================================
  // QUESTION EVENTS
  // ============================================================
  function bindQuestionEvents(q) {
    const area = $('#q-answer-area');
    const checkGuard = () => state.answered;

    if (q.type === 'multi') {
      $$('#q-cards .card-opt').forEach(btn => {
        btn.onclick = () => { btn.classList.toggle('sel'); Sfx.click(); };
        btn.onmouseenter = () => Sfx.hover();
      });
      $('#q-check').onclick = () => {
        if (checkGuard()) return;
        const chosen = $$('#q-cards .card-opt.sel').map(b => b.textContent);
        const ok = chosen.length === q.answer.length && q.answer.every(a => chosen.indexOf(a) >= 0);
        if (ok) {
          $$('#q-cards .card-opt').forEach(b => {
            b.classList.remove('sel');
            b.classList.add(q.answer.indexOf(b.textContent) >= 0 ? 'correct' : 'disabled');
          });
          Sfx.correct();
          showFeedback(q, true);
          finishQuestion(q);
        } else {
          Sfx.wrong();
          $$('#q-cards .card-opt.sel').forEach(b => { b.classList.add('wrong'); b.classList.remove('sel'); });
          showFeedback(q, false);
          timers.push(setTimeout(() => $$('#q-cards .card-opt.wrong').forEach(b => b.classList.remove('wrong')), 600));
        }
      };
    }

    if (q.type === 'mc' || q.type === 'analyze') {
      const bindOpts = () => {
        $$('#q-answer-area .mc-opt').forEach(btn => {
          btn.onclick = () => {
            if (btn.classList.contains('disabled')) return;
            const i = Number(btn.dataset.i);
            if (i === q.answer) {
              $$('#q-answer-area .mc-opt').forEach(b => { b.classList.add('disabled'); b.classList.remove('wrong'); });
              btn.classList.add('correct');
              Sfx.correct();
              showFeedback(q, true);
              finishQuestion(q);
            } else {
              btn.classList.add('wrong');
              Sfx.wrong();
              showFeedback(q, false);
              timers.push(setTimeout(() => btn.classList.remove('wrong'), 500));
            }
          };
          btn.onmouseenter = () => Sfx.hover();
        });
      };
      const analyzeBtn = $('#q-analyze');
      if (analyzeBtn) {
        analyzeBtn.onclick = () => {
          state.analyzeShown = true;
          Sfx.scan();
          analyzeBtn.parentNode.remove();
          $('.mc-list', area).innerHTML = q.options.map((o, i) =>
            '<button class="mc-opt" data-i="' + i + '"><span class="key">' + o.slice(0, 1) + '</span><span>' + esc(o.slice(3)) + '</span></button>'
          ).join('');
          bindOpts();
        };
      } else {
        bindOpts();
      }
    }

    if (q.type === 'fields') {
      $$('.db-field').forEach(f => {
        f.onclick = () => { f.classList.toggle('sel'); Sfx.click(); };
        f.onmouseenter = () => Sfx.hover();
      });
      $('#q-reset').onclick = () => { $$('.db-field').forEach(f => f.classList.remove('sel')); Sfx.click(); };
      $('#q-check').onclick = () => {
        if (checkGuard()) return;
        const chosen = $$('.db-field.sel').map(f => f.dataset.key);
        const ok = chosen.length === q.answer.length && q.answer.every(a => chosen.indexOf(a) >= 0);
        if (ok) {
          $$('.db-field').forEach(f => {
            f.classList.remove('sel');
            f.classList.add(q.answer.indexOf(f.dataset.key) >= 0 ? 'correct' : 'wrong');
          });
          Sfx.correct();
          showFeedback(q, true);
          finishQuestion(q);
        } else {
          $$('.db-field.sel').forEach(f => { f.classList.add('wrong'); f.classList.remove('sel'); });
          Sfx.wrong();
          showFeedback(q, false);
          timers.push(setTimeout(() => $$('.db-field.wrong').forEach(f => f.classList.remove('wrong')), 600));
        }
      };
    }

    if (q.type === 'drag' || q.type === 'sort') {
      const slotsEl = $('#q-slots');
      const poolEl = $('#q-pool');
      const nSlots = q.type === 'sort' ? q.pool.length : 4;
      slotsEl.innerHTML = '';
      for (let i = 0; i < nSlots; i++) {
        const s = document.createElement('div');
        s.className = 'dd-slot';
        s.dataset.pos = String(i);
        s.innerHTML = '<span class="slot-num">' + (i + 1) + '</span><span class="slot-card"></span>';
        slotsEl.appendChild(s);
      }

      const shuffled = q.pool.slice().sort(() => Math.random() - 0.5);
      let dragVal = null;
      let tapVal = null;

      const makeChip = (val) => {
        const chip = document.createElement('span');
        chip.className = 'dd-chip';
        chip.dataset.value = String(val);
        chip.textContent = String(val);
        chip.draggable = true;
        chip.addEventListener('dragstart', e => {
          dragVal = chip.dataset.value;
          chip.classList.add('dragging');
          if (e.dataTransfer) e.dataTransfer.setData('text/plain', chip.dataset.value);
        });
        chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
        chip.onclick = () => {
          if (tapVal === chip.dataset.value) { tapVal = null; chip.classList.remove('sel'); return; }
          $$('.dd-chip.sel').forEach(c => c.classList.remove('sel'));
          tapVal = chip.dataset.value;
          chip.classList.add('sel');
          Sfx.click();
        };
        poolEl.appendChild(chip);
      };

      shuffled.forEach(makeChip);

      $$('.dd-slot').forEach(slot => {
        slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('over'); });
        slot.addEventListener('dragleave', () => slot.classList.remove('over'));
        slot.addEventListener('drop', e => {
          e.preventDefault();
          slot.classList.remove('over');
          const val = dragVal || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '');
          if (!val) return;
          placeInSlot(slot, val);
          dragVal = null;
        });
        slot.addEventListener('click', () => {
          if (tapVal == null) return;
          placeInSlot(slot, tapVal);
          $$('.dd-chip.sel').forEach(c => c.classList.remove('sel'));
          tapVal = null;
        });
      });

      function placeInSlot(slot, val) {
        if (slot.dataset.value) restorePool(slot.dataset.value);
        const chip = poolEl.querySelector('.dd-chip[data-value="' + CSS.escape(val) + '"]');
        if (chip) chip.remove();
        slot.dataset.value = val;
        slot.classList.add('locked');
        // chip di slot tetap interaktif (klik = angkat kembali ke pool)
        slot.querySelector('.slot-card').innerHTML =
          '<span class="dd-chip placed" data-value="' + esc(val) + '" title="Klik untuk mengeluarkan">' + esc(val) + '</span>';
        slot.querySelector('.slot-card .dd-chip').onclick = () => {
          tapVal = null;
          $$('.dd-chip.sel').forEach(c => c.classList.remove('sel'));
          restorePool(val);
          Sfx.click();
        };
        Sfx.place();
      }
      function restorePool(val) {
        slotClear(slotOf(val));
        makeChip(val);
      }
      function slotOf(val) {
        return $$('.dd-slot').find(s => s.dataset.value === val);
      }
      function slotClear(slot) {
        if (!slot) return;
        delete slot.dataset.value;
        slot.classList.remove('locked');
        slot.querySelector('.slot-card').innerHTML = '';
      }

      $('#q-reset').onclick = () => { Sfx.click(); renderQuestion(q); };
      $('#q-check').onclick = () => {
        if (checkGuard()) return;
        const placed = $$('.dd-slot').map(s => s.dataset.value || null);
        const needed = q.order.map(String);
        const ok = placed.every((v, i) => v !== null && v === needed[i]);
        if (ok) {
          $$('.dd-chip').forEach(c => c.classList.add('correct'));
          Sfx.correct();
          showFeedback(q, true);
          finishQuestion(q);
        } else {
          Sfx.wrong();
          showFeedback(q, false);
          $$('.dd-slot').forEach((s, i) => {
            const chip = $('.slot-card .dd-chip', s);
            if (!chip) return;
            const good = s.dataset.value === needed[i];
            chip.classList.toggle('correct', good);
            chip.classList.toggle('wrong', !good);
          });
          timers.push(setTimeout(() => {
            $$('.dd-chip').forEach(c => c.classList.remove('wrong'));
          }, 900));
        }
      };
    }
  }

  // ============================================================
  // ADVANCE
  // ============================================================
  function advance(q) {
    timers.push(setTimeout(() => {
      const qs = QUESTIONS.filter(x => x.level === q.level);
      const idx = qs.indexOf(q);
      if (idx < qs.length - 1) {
        state.perLevelIndex[q.level] = idx + 1;
        renderQuestionForLevel(q.level);
        return;
      }
      state.levelStatus[q.level] = 'done';
      updateProgress();
      if (q.level === 1 || q.level === 2 || q.level === 3) {
        startLevel(q.level + 1);
      } else if (q.level === 4) {
        closeWindow('game-window');
        finalTerminal();
      } else {
        closeWindow('game-window');
        // replay soal final setelah game selesai tidak mengulang sekuens recovery
        if (!state.finished) runRecovery();
      }
    }, 1900));
  }

  // ============================================================
  // TERMINAL
  // ============================================================
  function termPrint(html, cls) {
    const div = document.createElement('div');
    div.className = 't-line' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    termOut.appendChild(div);
    termOut.scrollTop = termOut.scrollHeight;
  }

  async function typeLine(text, cls) {
    const div = document.createElement('div');
    div.className = 't-line' + (cls ? ' ' + cls : '');
    termOut.appendChild(div);
    for (const ch of text) {
      div.textContent += ch;
      termOut.scrollTop = termOut.scrollHeight;
      if (ch !== ' ') Sfx.key();
      await wait(14);
    }
  }

  function setTermEnabled(on, hintHtml) {
    state.termEnabled = on;
    $('#terminal-input-line').classList.toggle('hidden', !on);
    termHint.classList.toggle('hidden', !on);
    if (on && hintHtml) termHint.innerHTML = hintHtml;
    if (on) focusTerm();
  }

  function focusTerm() {
    const c = $('#term-input-catcher');
    if (c) c.focus({ preventScroll: true });
  }

  function resetTerminal() {
    termOut.innerHTML = '';
    termInput.textContent = '';
    // buang tombol [ START ] basi dari sesi scan sebelumnya
    $$('.terminal-body .btn-primary', terminalWindow).forEach(b => b.remove());
  }

  // satu pintu untuk perintah `recovery` (dipakai catcher mobile & keyboard fisik)
  function handleRecoveryCmd(cmd) {
    if (state.scanning) return; // scan sedang berjalan → abaikan duplikat
    // setelah game mulai, `recovery` tidak scan ulang — buka Recovery window aktif
    if (state.levelStatus[1] !== 'locked') {
      termPrint('C:\\SMAN6_LIBRARY&gt; ' + esc(cmd));
      termPrint('> RECOVERY SESSION ALREADY ACTIVE', 'warn');
      termPrint('> OPENING RECOVERY WINDOW', 'cy');
      Sfx.wrong();
      state.termEnabled = false;
      setTermEnabled(false);
      winOpeners['game-window']();
      return;
    }
    state.termEnabled = false;
    setTermEnabled(false);
    runScanning();
  }

  async function openTerminalIntro() {
    openWindow('terminal-window', { width: 640 });
    resetTerminal();
    await typeLine('Microsoft Windows [Version 6.2]', 'dim');
    await typeLine('(c) SMAN 6 Tambun Selatan. All rights reserved.', 'dim');
    await typeLine('', '');
    setTermEnabled(true, 'Ketik <b>recovery</b> lalu tekan <kbd>ENTER</kbd>');
  }

  // Mirror the hidden input into the fake terminal line (mobile keyboards)
  function bindTermCatcher() {
    const catcher = $('#term-input-catcher');
    if (!catcher) return;
    catcher.addEventListener('input', () => {
      if (state.termEnabled) termInput.textContent = catcher.value;
    });
    $('.terminal-body', terminalWindow).addEventListener('click', () => {
      if (state.termEnabled) focusTerm();
    });
    catcher.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = (catcher.value || '').trim().toLowerCase();
        catcher.value = '';
        termInput.textContent = '';
        if (!cmd) return;
        if (cmd === 'recovery') {
          handleRecoveryCmd(cmd);
        } else {
          termPrint('C:\\SMAN6_LIBRARY&gt; ' + esc(cmd));
          termPrint('Unknown command.', 'err');
          termPrint('Try again.', 'err');
          Sfx.wrong();
        }
      }
    });
  }
  bindTermCatcher();

  async function runScanning() {
    if (state.scanning) return;
    state.scanning = true;
    closeWindow('error-window');
    await typeLine('Starting Recovery System...', 'cy');
    await typeLine('Scanning Data', '');
    const prog = document.createElement('div');
    prog.className = 't-line term-progress';
    termOut.appendChild(prog);
    for (let p = 0; p <= 100; p += 5) {
      const filled = Math.round(p / 5);
      prog.textContent = '[' + '█'.repeat(filled).padEnd(20, '░') + '] ' + p + '%';
      termOut.scrollTop = termOut.scrollHeight;
      Sfx.scanTick();
      await wait(110);
    }
    await wait(300);
    await typeLine('Scanning Complete.', 'ok');
    await typeLine('ERROR 404: ALGORITHM NOT FOUND', 'err');
    await typeLine('System Need Help To Fix It.', 'warn');
    await wait(400);
    await typeLine('4 CORE PROCESSES REQUIRED', 'cy');
    await typeLine('[1] DECOMPOSITION', 'dim');
    await typeLine('[2] PATTERN RECOGNITION', 'dim');
    await typeLine('[3] ABSTRACTION', 'dim');
    await typeLine('[4] ALGORITHM', 'dim');
    await typeLine('> Recovery process initialized.', 'ok');
    await wait(500);
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = '[ START ]';
    btn.onclick = () => {
      Sfx.click();
      btn.remove();
      // jangan turunkan progres: jika game sudah mulai, buka Recovery window aktif
      if (state.levelStatus[1] === 'locked') startLevel(1);
      else winOpeners['game-window']();
    };
    $('.terminal-body', terminalWindow).appendChild(btn);
    state.scanning = false;
  }

  // ============================================================
  // FINAL TERMINAL
  // ============================================================
  async function finalTerminal() {
    openWindow('terminal-window', { width: 640 });
    resetTerminal();
    await typeLine('C:\\SMAN6_LIBRARY> final_test', 'ok');
    await wait(300);
    await typeLine('FINAL ALGORITHM TEST', 'cy');
    await typeLine('1. Simpan transaksi', 'dim');
    await typeLine('2. Pilih buku', 'dim');
    await typeLine('3. Cek ketersediaan', 'dim');
    await typeLine('4. Input siswa', 'dim');
    await wait(300);
    playGlitch(1);
    await typeLine('> INVALID ALGORITHM', 'err');
    await typeLine('> STEP ORDER ERROR', 'err');
    await typeLine('The recovery system cannot continue.', 'warn');
    await typeLine('Rearrange the algorithm.', 'cy');
    await wait(400);
    state.levelStatus[5] = 'active';
    renderLevelChips();
    openWindow('game-window', { width: 640, title: 'FINAL ALGORITHM TEST', badge: 'FINAL' });
    renderQuestion(QUESTIONS.find(x => x.id === 17));
  }

  // ============================================================
  // RECOVERY
  // ============================================================
  async function runRecovery() {
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
    closeWindow('terminal-window');
    openWindow('recovery-window', { width: 640 });
    const body = $('#recovery-body');
    body.innerHTML = '';
    const line = async (html, cls) => {
      const div = document.createElement('div');
      div.className = 't-line ' + (cls || '');
      div.innerHTML = html;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      await wait(240);
    };
    const prog = document.createElement('div');
    prog.className = 't-line term-progress';
    body.appendChild(prog);
    Sfx.restore();
    await line('C:\\SMAN6_LIBRARY> verify', 'ok');
    await line('Verifying recovery data...', 'cy');
    await line('DECOMPOSITION&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[COMPLETE]', 'ok');
    await line('PATTERN RECOGNITION&nbsp;[COMPLETE]', 'ok');
    await line('ABSTRACTION&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[COMPLETE]', 'ok');
    await line('ALGORITHM&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[COMPLETE]', 'ok');
    await line('Recovery codes verified.', 'cy');
    await wait(300);
    await line('Starting system restoration...', 'cy');
    const steps = [20, 40, 60, 80, 100];
    for (const p of steps) {
      prog.textContent = '[' + '█'.repeat(p / 5).padEnd(20, '░') + '] ' + p + '%';
      body.scrollTop = body.scrollHeight;
      Sfx.scanTick();
      await wait(320);
    }
    await wait(350);
    await line('&gt; Restoring Book Database...&nbsp;&nbsp;&nbsp;&nbsp;[OK]', 'ok');
    await line('&gt; Restoring Student Database...&nbsp;&nbsp;[OK]', 'ok');
    await line('&gt; Restoring Borrow System...&nbsp;&nbsp;&nbsp;&nbsp;[OK]', 'ok');
    await line('&gt; Restoring Return System...&nbsp;&nbsp;&nbsp;&nbsp;[OK]', 'ok');
    await wait(500);
    await line('========================================', 'cy');
    await line('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;LIBRARY SYSTEM RESTORED', 'cy');
    await line('========================================', 'cy');
    await line('SMAN 6 TAMBUN SELATAN', '');
    await line('LIBRARY MANAGEMENT SYSTEM', '');
    await line('STATUS: ONLINE ✓', 'ok');
    await line('All systems operational.', '');
    await line('C:\\SMAN6_LIBRARY&gt; _', 'ok');
    await wait(900);
    finalCinematic();
  }

  // ============================================================
  // FINAL CINEMATIC
  // ============================================================
  async function finalCinematic() {
    state.finished = true;
    setBezel('ONLINE', true);
    closeWindow('recovery-window');
    playGlitch(1);
    await wait(900);
    computerScene.classList.add('hidden-scene');
    deskScene.classList.remove('hidden-scene');
    deskScene.classList.remove('zooming');
    Sfx.fanfare();
    Fx.confetti(7);
    timers.push(setTimeout(() => Fx.fireworkShow(8), 900));
    const fc = $('#final-cine');
    fc.classList.remove('hidden');
    $('#fc-score').textContent = state.solved + ' / ' + TOTAL + ' CHALLENGES COMPLETED';
  }

  // ============================================================
  // INPUT
  // ============================================================
  monitor.addEventListener('click', startGame);
  monitor.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); }
  });

  document.addEventListener('keydown', e => {
    if (!isShown('terminal-window')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!state.termEnabled) return;
      const cmd = termInput.textContent.trim().toLowerCase();
      termInput.textContent = '';
      if (!cmd) return;
      if (cmd === 'recovery') {
        handleRecoveryCmd(cmd);
      } else {
        termPrint('C:\\SMAN6_LIBRARY&gt; ' + esc(cmd));
        termPrint('Unknown command.', 'err');
        termPrint('Try again.', 'err');
        Sfx.wrong();
      }
      return;
    }
    if (!state.termEnabled) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      termInput.textContent = termInput.textContent.slice(0, -1);
      Sfx.key();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      termInput.textContent += e.key;
      Sfx.key();
    }
  });

  $('#btn-open-terminal').onclick = () => { Sfx.click(); closeWindow('error-window'); openTerminalIntro(); };
  $('#btn-play-again').onclick = () => location.reload();
  // KELUAR = kembali ke desktop komputer (meja tak bisa dipakai lagi karena state.started)
  $('#btn-exit-desk').onclick = () => {
    Sfx.click();
    $('#final-cine').classList.add('hidden');
    deskScene.classList.add('hidden-scene');
    computerScene.classList.remove('hidden-scene');
  };

  // window controls: minimize / maximize(restore) / close — plus click-to-focus & dblclick title
  $$('.os-window').forEach(w => {
    w.addEventListener('mousedown', () => { if (focusedId !== w.id) focusWindow(w.id); });
    const minBtn = $('.os-window-btn[aria-label="Minimize"]', w);
    const maxBtn = $('.os-window-btn[aria-label="Maximize"]', w);
    const xBtn = $('.os-window-x', w);
    if (minBtn) minBtn.addEventListener('click', e => { e.stopPropagation(); minimizeWindow(w.id); });
    if (maxBtn) maxBtn.addEventListener('click', e => { e.stopPropagation(); toggleMaximize(w.id); });
    if (xBtn) xBtn.addEventListener('click', e => {
      e.stopPropagation();
      closeWindow(w.id);
      // keep the story moving: closing the error window after the game started jumps to Recovery
      if (w.id === 'error-window' && state.levelStatus[1] !== 'locked') winOpeners['game-window']();
    });
    const bar = $('.os-window-bar', w);
    if (bar) bar.addEventListener('dblclick', e => {
      if (e.target.closest('.os-window-btn') || e.target.closest('.os-window-x')) return;
      toggleMaximize(w.id);
    });
  });

  // ============================================================
  // DATABASE APP
  // ============================================================
  function renderDatabaseApp() {
    const body = $('#database-body');
    body.innerHTML =
      '<div class="q-kicker">SELECT title, status FROM books WHERE status = \'Tersedia\';</div>' +
      SQL.renderTable('books', ['id', 'title', 'status'], { rowFilter: r => r.status === 'Tersedia' }) +
      '<div class="q-kicker">SELECT * FROM books;</div>' +
      SQL.renderTable('books', ['id', 'title', 'author', 'genre', 'pages', 'cover_color', 'status']) +
      '<div class="q-kicker">SELECT * FROM transactions;</div>' +
      SQL.renderTable('transactions', ['student_id', 'book', 'borrow_date', 'return_date', 'status', 'color']);
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    startClocks();
    renderLevelChips();
    updateProgress();
    monitor.focus();
  }
  init();
})();
