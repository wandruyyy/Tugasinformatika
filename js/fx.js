/* ============================================================
   LIBRARY RECOVERY — FX: CONFETTI & FIREWORKS (canvas)
   ============================================================ */

const Fx = (() => {
  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, raf = 0, running = false;
  let parts = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = ['#c9803a', '#b07d2a', '#8a5a2c', '#a83c2a', '#5a7d43', '#e3b877', '#f6e7c6', '#fdf3dd'];

  function spawnConfetti(n) {
    for (let i = 0; i < n; i++) {
      parts.push({
        type: 'c',
        x: Math.random() * W,
        y: -12 - Math.random() * H * 0.4,
        vx: (Math.random() - .5) * 1.8,
        vy: 2 + Math.random() * 3.2,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - .5) * .22,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        decay: 0.0022 + Math.random() * 0.0016,
      });
    }
  }

  function spawnFirework() {
    const x = W * (0.2 + Math.random() * 0.6);
    const y = H * (0.18 + Math.random() * 0.3);
    const hue = COLORS[(Math.random() * COLORS.length) | 0];
    const n = 34 + ((Math.random() * 22) | 0);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const sp = 2 + Math.random() * 3.4;
      parts.push({
        type: 'f',
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 1.6 + Math.random() * 1.8,
        color: Math.random() < .7 ? hue : COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.type === 'c') {
        p.vy += 0.035; p.vx *= 0.99; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      } else {
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.05;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      p.life -= p.decay;
      if (p.life <= 0 || p.y > H + 30) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    if (running || parts.length) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
    }
  }

  const api = {
    confetti(seconds = 6) {
      resize();
      running = true;
      const total = seconds * 1000;
      const t0 = performance.now();
      const iv = setInterval(() => {
        spawnConfetti(26);
        if (performance.now() - t0 > total) clearInterval(iv);
      }, 260);
      if (!raf) raf = requestAnimationFrame(loop);
      setTimeout(() => { running = false; }, total);
    },
    fireworkShow(seconds = 8) {
      resize();
      running = true;
      const total = seconds * 1000;
      const t0 = performance.now();
      const iv = setInterval(() => {
        spawnFirework();
        if (performance.now() - t0 > total) clearInterval(iv);
      }, 520);
      if (!raf) raf = requestAnimationFrame(loop);
      setTimeout(() => { running = false; }, total);
    },
    stop() { running = false; parts = []; },
  };
  return api;
})();

window.Fx = Fx;
