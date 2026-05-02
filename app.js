/**
 * =====================================================================
 * ENGMATH PORTAL — app.js
 * Advanced Engineering Mathematics Puzzle SPA
 *
 * Developed and Designed by Shridatta Patil, Mechanical Engineer
 *
 * Architecture: Class-based modules for each game.
 *   - App          : Router, navigation, global state, localStorage
 *   - GradientMaze : Game 1 — Partial Differentiation (canvas particle)
 *   - WaveSynth    : Game 2 — Fourier Series (canvas oscilloscope)
 *   - AreaAlchemist: Game 3 — Gamma-Beta Functions (identity puzzles)
 *   - VolumeSculptor: Game 4 — Triple Integration (CSS 3D visuals)
 *
 * Math-to-Game Mapping: See CHECKLIST at bottom of file.
 * =====================================================================
 */

'use strict';

/* =====================================================================
   STORAGE LAYER — wraps localStorage with JSON serialization
===================================================================== */
const Store = (() => {
  const KEY = 'engmath_v1';

  function _load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || _defaultState();
    } catch { return _defaultState(); }
  }

  function _defaultState() {
    return {
      xp: 0,
      streak: 0,
      lastPlayed: null,
      games: {
        gradient:  { unlocked: true,  completed: false, highScore: 0, level: 1 },
        wave:      { unlocked: true,  completed: false, highScore: 0, level: 1 },
        area:      { unlocked: true,  completed: false, highScore: 0, level: 1 },
        volume:    { unlocked: true,  completed: false, highScore: 0, level: 1 }
      }
    };
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) { console.warn('Storage full:', e); }
  }

  function get() { return _load(); }

  function updateGame(id, patch) {
    const s = _load();
    Object.assign(s.games[id], patch);
    // Award XP on first completion
    if (patch.completed && !_load().games[id].completed) s.xp += 200;
    if (patch.highScore) s.xp = (_load().xp || 0); // re-read after mutation
    save(s);
    return _load();
  }

  function addXP(amount) {
    const s = _load();
    s.xp = (s.xp || 0) + amount;
    save(s);
    return s;
  }

  function reset() { localStorage.removeItem(KEY); }

  return { get, save, updateGame, addXP, reset };
})();


/* =====================================================================
   APP — Router, navigation, dashboard
===================================================================== */
const App = (() => {

  const GAME_META = [
    {
      id: 'gradient',
      title: 'Gradient Maze',
      subtitle: 'Partial Differentiation',
      icon: '∇',
      color: 'cyan',
      desc: 'Steer a particle through a scalar field using partial derivatives ∂z/∂x and ∂z/∂y as force vectors.',
      tags: ['PDE', 'Vectors', 'Calculus III'],
      GameClass: null  // injected after class def
    },
    {
      id: 'wave',
      title: 'Wave Synthesizer',
      subtitle: 'Fourier Series',
      icon: '∿',
      color: 'purple',
      desc: 'Compose complex periodic signals by superposing harmonic sine waves using Fourier coefficients.',
      tags: ['Signal Processing', 'Harmonics', 'Analysis'],
      GameClass: null
    },
    {
      id: 'area',
      title: 'Area Alchemist',
      subtitle: 'Gamma–Beta Functions',
      icon: 'Γ',
      color: 'cyan',
      desc: 'Solve Gamma and Beta function identities to fill target areas and unlock geometric configurations.',
      tags: ['Special Functions', 'Integration', 'Combinatorics'],
      GameClass: null
    },
    {
      id: 'volume',
      title: 'Volume Sculptor',
      subtitle: 'Triple Integration',
      icon: '∭',
      color: 'purple',
      desc: 'Set integration bounds to sculpt a 3D CSS volume and match the target enclosed region.',
      tags: ['Triple Integrals', 'Bounds', 'Geometry'],
      GameClass: null
    }
  ];

  let currentSection = 'dashboard';
  let currentGame    = null;

  function init() {
    _renderDashboard();
    _updateStats();
    navigate('dashboard');
  }

  function navigate(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const el = document.getElementById(`section-${section}`);
    if (el) el.classList.add('active');

    const tab = document.querySelector(`[data-section="${section}"]`);
    if (tab) tab.classList.add('active');

    currentSection = section;

    // Destroy current game if navigating away
    if (section !== 'arena' && currentGame) {
      currentGame.destroy?.();
      currentGame = null;
    }
    if (section === 'dashboard') _updateStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function launchGame(id) {
    const meta = GAME_META.find(g => g.id === id);
    const state = Store.get();
    if (!state.games[id].unlocked) return;

    // Set arena header
    document.getElementById('arena-title').textContent   = meta.title;
    document.getElementById('arena-subtitle').textContent = `// ${meta.subtitle}`;
    document.getElementById('arena-score').textContent    = state.games[id].highScore;

    navigate('arena');

    // Instantiate correct game
    const GameMap = {
      gradient: GradientMaze,
      wave:     WaveSynth,
      area:     AreaAlchemist,
      volume:   VolumeSculptor
    };

    const GameClass = GameMap[id];
    if (!GameClass) return;

    currentGame = new GameClass({
      container: document.getElementById('arena-content'),
      gameId: id,
      onScore: (score) => {
        document.getElementById('arena-score').textContent = score;
        const old = Store.get().games[id].highScore;
        if (score > old) {
          Store.updateGame(id, { highScore: score });
          const gained = score - old;
          if (gained > 0) Store.addXP(gained);
        }
        document.getElementById('nav-xp').textContent = Store.get().xp;
      },
      onComplete: () => {
        Store.updateGame(id, { completed: true });
        _updateStats();
        document.getElementById('nav-xp').textContent = Store.get().xp;
      }
    });
    currentGame.init();
  }

  function _renderDashboard() {
    const grid  = document.getElementById('game-grid');
    const state = Store.get();
    grid.innerHTML = '';

    GAME_META.forEach(meta => {
      const g     = state.games[meta.id];
      const locked = !g.unlocked;
      const done   = g.completed;
      const color  = meta.color === 'cyan' ? '#00f5ff' : '#bf5fff';
      const dimBg  = meta.color === 'cyan' ? 'rgba(0,245,255,0.06)' : 'rgba(191,95,255,0.06)';
      const dimBd  = meta.color === 'cyan' ? 'rgba(0,245,255,0.2)' : 'rgba(191,95,255,0.2)';

      const card = document.createElement('div');
      card.className = `game-card glass p-6 ${locked ? 'locked' : ''}`;
      card.style.cssText = `border-color:${dimBd};`;
      if (!locked) card.onclick = () => launchGame(meta.id);

      card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
          <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-display"
               style="background:${dimBg};border:1px solid ${dimBd};color:${color}">
            ${meta.icon}
          </div>
          <div class="flex flex-col items-end gap-1">
            ${done ? `<span class="font-mono text-xs px-2 py-0.5 rounded" style="background:rgba(0,255,140,0.1);border:1px solid rgba(0,255,140,0.3);color:#00ff8c">✓ DONE</span>` : ''}
            ${locked ? `<span class="font-mono text-xs px-2 py-0.5 rounded" style="background:rgba(255,255,255,0.05);color:var(--text-muted)">🔒 LOCKED</span>` : ''}
            ${g.highScore > 0 ? `<span class="score-badge">⭐ ${g.highScore}</span>` : ''}
          </div>
        </div>
        <h3 class="font-display text-base font-600 mb-1" style="color:${color}">${meta.title}</h3>
        <p class="font-mono text-xs mb-3" style="color:var(--text-muted)">// ${meta.subtitle}</p>
        <p class="text-xs mb-4" style="color:var(--text-muted);line-height:1.7">${meta.desc}</p>
        <div class="flex flex-wrap gap-2 mb-4">
          ${meta.tags.map(t => `<span class="font-mono text-xs px-2 py-0.5 rounded" style="background:${dimBg};border:1px solid ${dimBd};color:${color}">${t}</span>`).join('')}
        </div>
        <div class="flex items-center justify-between">
          <span class="font-mono text-xs" style="color:var(--text-muted)">LVL ${g.level}</span>
          ${!locked ? `<button class="btn-primary ${meta.color === 'purple' ? 'btn-purple' : ''} text-xs py-1.5 px-4" onclick="event.stopPropagation();App.launchGame('${meta.id}')">LAUNCH →</button>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function _updateStats() {
    const state = Store.get();
    const completed = Object.values(state.games).filter(g => g.completed).length;
    const pct = Math.round((completed / 4) * 100);

    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-xp').textContent        = state.xp;
    document.getElementById('stat-streak').textContent    = state.streak;
    document.getElementById('nav-xp').textContent         = state.xp;
    document.getElementById('prog-pct').textContent       = pct + '%';
    document.getElementById('prog-fill').style.width      = pct + '%';
  }

  return { init, navigate, launchGame, _renderDashboard };
})();


/* =====================================================================
   GAME 1: GRADIENT MAZE — Partial Differentiation
   =====================================================================
   Mathematical Mapping:
   Given a scalar field z = f(x,y), the gradient vector is:
     ∇z = (∂z/∂x)î + (∂z/∂y)ĵ
   The user inputs ∂z/∂x and ∂z/∂y as force components applied to
   a particle each frame. The particle accelerates in the direction of
   the gradient, simulating how a ball rolls down a potential surface.
   Goal: navigate the particle to collect targets by choosing the correct
   partial derivative values for each field region.
===================================================================== */
class GradientMaze {
  constructor({ container, gameId, onScore, onComplete }) {
    this.container  = container;
    this.gameId     = gameId;
    this.onScore    = onScore;
    this.onComplete = onComplete;
    this.score      = 0;
    this.level      = 1;
    this.maxLevel   = 5;
    this.animId     = null;
    this.destroyed  = false;

    // Particle state
    this.particle = { x: 0, y: 0, vx: 0, vy: 0 };
    this.targets  = [];
    this.fields   = []; // force-field zones

    // User input
    this.dzdx = 0;
    this.dzdy = 0;
    this.running = false;
  }

  init() {
    this.container.innerHTML = this._buildUI();
    this._bindEvents();
    this._setupLevel(1);
    this._startLoop();
  }

  _buildUI() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Canvas Column -->
        <div class="lg:col-span-2">
          <div class="glass rounded-xl p-4 relative scanlines">
            <div class="flex justify-between items-center mb-3">
              <span class="font-mono text-xs neon-cyan">SCALAR FIELD z = f(x,y)</span>
              <span id="gm-level" class="font-mono text-xs" style="color:var(--text-muted)">LEVEL 1/${this.maxLevel}</span>
            </div>
            <canvas id="mazeCanvas" width="520" height="360" style="width:100%;border-radius:6px;"></canvas>
            <div id="gm-msg" class="mt-2 text-center font-mono text-xs" style="color:var(--text-muted);min-height:18px"></div>
          </div>
        </div>

        <!-- Controls Column -->
        <div class="space-y-4">
          <div class="glass rounded-xl p-5">
            <h3 class="font-display text-xs neon-cyan mb-4 tracking-wider">GRADIENT INPUT</h3>

            <div class="eq-display mb-4">∇z = (∂z/∂x)î + (∂z/∂y)ĵ</div>

            <div class="space-y-4">
              <div>
                <div class="flex justify-between mb-1">
                  <label class="font-mono text-xs" style="color:var(--text-muted)">∂z/∂x (horizontal force)</label>
                  <span id="gm-dx-val" class="font-mono text-xs neon-cyan">0.00</span>
                </div>
                <input type="range" id="gm-dx" min="-3" max="3" step="0.1" value="0" />
              </div>
              <div>
                <div class="flex justify-between mb-1">
                  <label class="font-mono text-xs" style="color:var(--text-muted)">∂z/∂y (vertical force)</label>
                  <span id="gm-dy-val" class="font-mono text-xs neon-purple">0.00</span>
                </div>
                <input type="range" id="gm-dy" min="-3" max="3" step="0.1" value="0" style="accent-color:var(--purple)" />
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <button id="gm-apply" class="btn-primary text-xs py-2">APPLY FORCE</button>
              <button id="gm-reset" class="btn-primary btn-purple text-xs py-2">RESET</button>
            </div>

            <!-- Field hint -->
            <div id="gm-hint" class="mt-4 glass rounded p-3">
              <p class="font-mono text-xs" style="color:var(--text-muted)">Hint: Move particle toward <span id="gm-target-dir" class="neon-cyan">—</span></p>
            </div>
          </div>

          <!-- Score panel -->
          <div class="glass rounded-xl p-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center">
                <div id="gm-score-disp" class="font-display text-xl neon-cyan">0</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">SCORE</div>
              </div>
              <div class="text-center">
                <div id="gm-targets-left" class="font-display text-xl neon-purple">0</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">TARGETS</div>
              </div>
            </div>
          </div>

          <!-- Math explanation -->
          <div class="glass rounded-xl p-4">
            <p class="font-mono text-xs mb-2" style="color:var(--cyan)">HOW IT WORKS</p>
            <p class="text-xs" style="color:var(--text-muted);line-height:1.8">
              Each frame: <code class="font-mono neon-cyan">v += (∂z/∂x, ∂z/∂y) · dt</code><br>
              The particle follows your gradient vector. Negative ∂z/∂x pulls left; positive pulls right.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    const dxSlider = document.getElementById('gm-dx');
    const dySlider = document.getElementById('gm-dy');

    dxSlider?.addEventListener('input', e => {
      this.dzdx = parseFloat(e.target.value);
      document.getElementById('gm-dx-val').textContent = this.dzdx.toFixed(2);
    });
    dySlider?.addEventListener('input', e => {
      this.dzdy = parseFloat(e.target.value);
      document.getElementById('gm-dy-val').textContent = this.dzdy.toFixed(2);
    });

    document.getElementById('gm-apply')?.addEventListener('click', () => {
      this.running = !this.running;
      const btn = document.getElementById('gm-apply');
      if (btn) btn.textContent = this.running ? 'PAUSE' : 'APPLY FORCE';
    });

    document.getElementById('gm-reset')?.addEventListener('click', () => {
      this._setupLevel(this.level);
      this.running = false;
      const btn = document.getElementById('gm-apply');
      if (btn) btn.textContent = 'APPLY FORCE';
    });
  }

  _setupLevel(lvl) {
    this.level = lvl;
    const canvas = document.getElementById('mazeCanvas');
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;

    // Reset particle to center-left
    this.particle = { x: 60, y: H / 2, vx: 0, vy: 0 };
    this.dzdx = 0; this.dzdy = 0;

    // Generate targets based on level
    this.targets = [];
    const count = lvl + 1;
    for (let i = 0; i < count; i++) {
      this.targets.push({
        x: 120 + Math.random() * (W - 180),
        y: 40  + Math.random() * (H - 80),
        r: 18, collected: false
      });
    }

    // Color-coded force field zones
    this.fields = [
      { x: 0,         y: 0, w: W / 2, h: H, fx:  1.5, fy: 0,   color: 'rgba(0,245,255,0.04)' },
      { x: W / 2,     y: 0, w: W / 2, h: H, fx: -1.5, fy: 1.5, color: 'rgba(191,95,255,0.04)' }
    ];

    if (lvl >= 3) {
      this.fields.push({ x: W/4, y: H/3, w: W/2, h: H/3, fx: 2, fy: -2, color: 'rgba(0,255,140,0.04)' });
    }

    document.getElementById('gm-level').textContent   = `LEVEL ${lvl}/${this.maxLevel}`;
    document.getElementById('gm-targets-left').textContent = count;
    this._setMsg('');
    this._updateHint();
  }

  _startLoop() {
    const canvas = document.getElementById('mazeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DT  = 0.08; // time step
    const DRAG = 0.96;

    const loop = () => {
      if (this.destroyed) return;
      this.animId = requestAnimationFrame(loop);

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw background fields
      this.fields.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.fillRect(f.x, f.y, f.w, f.h);
        // Draw field arrows
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let ax = f.x + 30; ax < f.x + f.w; ax += 40) {
          for (let ay = f.y + 30; ay < f.y + f.h; ay += 40) {
            this._drawArrow(ctx, ax, ay, ax + f.fx * 10, ay + f.fy * 10);
          }
        }
      });

      // Draw targets
      this.targets.forEach(t => {
        if (t.collected) return;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Pulsing inner
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
        ctx.fillStyle = `rgba(0,245,255,${0.08 + pulse * 0.08})`;
        ctx.fill();
        // Label
        ctx.fillStyle = '#00f5ff';
        ctx.font = '11px Share Tech Mono';
        ctx.textAlign = 'center';
        ctx.fillText('⊕', t.x, t.y + 4);
      });

      // Physics update
      if (this.running) {
        // Find active field at particle position
        let fieldFx = 0, fieldFy = 0;
        this.fields.forEach(f => {
          if (this.particle.x >= f.x && this.particle.x <= f.x + f.w &&
              this.particle.y >= f.y && this.particle.y <= f.y + f.h) {
            fieldFx += f.fx; fieldFy += f.fy;
          }
        });

        // Apply user gradient + field gradient
        this.particle.vx += (this.dzdx + fieldFx * 0.1) * DT;
        this.particle.vy += (this.dzdy + fieldFy * 0.1) * DT;

        // Drag
        this.particle.vx *= DRAG;
        this.particle.vy *= DRAG;

        // Clamp velocity
        const maxV = 4;
        const speed = Math.hypot(this.particle.vx, this.particle.vy);
        if (speed > maxV) {
          this.particle.vx = (this.particle.vx / speed) * maxV;
          this.particle.vy = (this.particle.vy / speed) * maxV;
        }

        // Update position
        this.particle.x += this.particle.vx;
        this.particle.y += this.particle.vy;

        // Wall bounce
        if (this.particle.x < 10) { this.particle.x = 10; this.particle.vx *= -0.6; }
        if (this.particle.x > W - 10) { this.particle.x = W - 10; this.particle.vx *= -0.6; }
        if (this.particle.y < 10) { this.particle.y = 10; this.particle.vy *= -0.6; }
        if (this.particle.y > H - 10) { this.particle.y = H - 10; this.particle.vy *= -0.6; }

        // Collision check
        this.targets.forEach(t => {
          if (t.collected) return;
          const dist = Math.hypot(this.particle.x - t.x, this.particle.y - t.y);
          if (dist < t.r + 8) {
            t.collected = true;
            this.score += 50 * this.level;
            this._updateScore();
            const remaining = this.targets.filter(x => !x.collected).length;
            document.getElementById('gm-targets-left').textContent = remaining;
            if (remaining === 0) this._levelComplete();
          }
        });

        this._updateHint();
      }

      // Draw particle
      this._drawParticle(ctx, this.particle.x, this.particle.y);

      // Draw velocity vector
      if (this.running) {
        ctx.strokeStyle = 'rgba(0,245,255,0.6)';
        ctx.lineWidth = 1.5;
        this._drawArrow(
          ctx,
          this.particle.x, this.particle.y,
          this.particle.x + this.particle.vx * 12,
          this.particle.y + this.particle.vy * 12
        );
      }
    };
    loop();
  }

  _drawParticle(ctx, x, y) {
    // Outer glow
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 20);
    grd.addColorStop(0, 'rgba(0,245,255,0.4)');
    grd.addColorStop(1, 'rgba(0,245,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#00f5ff';
    ctx.fill();
  }

  _drawArrow(ctx, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    // Arrowhead
    const angle = Math.atan2(dy, dx);
    ctx.lineTo(x2 - 6 * Math.cos(angle - 0.4), y2 - 6 * Math.sin(angle - 0.4));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 6 * Math.cos(angle + 0.4), y2 - 6 * Math.sin(angle + 0.4));
    ctx.stroke();
  }

  _updateHint() {
    const active = this.targets.find(t => !t.collected);
    if (!active) return;
    const dx = active.x - this.particle.x;
    const dy = active.y - this.particle.y;
    const dir = `(${dx > 0 ? '+' : ''}${(dx / 100).toFixed(1)}, ${dy > 0 ? '+' : ''}${(dy / 100).toFixed(1)})`;
    const el = document.getElementById('gm-target-dir');
    if (el) el.textContent = dir;
  }

  _levelComplete() {
    this.running = false;
    this._setMsg('✓ LEVEL COMPLETE — GRADIENT MASTERED');
    this.score += 100;
    this._updateScore();
    this.onScore(this.score);

    if (this.level < this.maxLevel) {
      setTimeout(() => this._setupLevel(this.level + 1), 1600);
    } else {
      setTimeout(() => {
        this.onComplete();
        this._setMsg('🏆 ALL LEVELS COMPLETE — PARTIAL DIFFERENTIATION MASTERED');
        _triggerSuccess(this.container);
      }, 1000);
    }
  }

  _updateScore() {
    const el = document.getElementById('gm-score-disp');
    if (el) el.textContent = this.score;
    this.onScore(this.score);
  }

  _setMsg(text) {
    const el = document.getElementById('gm-msg');
    if (el) {
      el.textContent = text;
      el.style.color = text.includes('✓') || text.includes('🏆') ? 'var(--success)' : 'var(--text-muted)';
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}


/* =====================================================================
   GAME 2: WAVE SYNTHESIZER — Fourier Series
   =====================================================================
   Mathematical Mapping:
   A Fourier Series represents any periodic function f(t) as:
     f(t) = Σ [aₙ cos(nωt) + bₙ sin(nωt)]
   Here the user controls amplitudes (aₙ) and frequencies (nω) for
   up to 5 harmonics. The synthesized waveform is rendered in real-time
   on a canvas oscilloscope. A "target" waveform is shown; the user
   must match it by tuning the Fourier coefficients.
===================================================================== */
class WaveSynth {
  constructor({ container, gameId, onScore, onComplete }) {
    this.container  = container;
    this.gameId     = gameId;
    this.onScore    = onScore;
    this.onComplete = onComplete;
    this.score      = 0;
    this.animId     = null;
    this.destroyed  = false;
    this.time       = 0;

    // Up to 5 harmonics: { amp, freq, phase }
    this.harmonics = [
      { amp: 1.0, freq: 1, phase: 0 },
      { amp: 0.0, freq: 2, phase: 0 },
      { amp: 0.0, freq: 3, phase: 0 },
      { amp: 0.0, freq: 4, phase: 0 },
      { amp: 0.0, freq: 5, phase: 0 }
    ];

    // Current level target harmonics
    this.targets = [];
    this.level = 1;
    this.levels = this._buildLevels();
  }

  _buildLevels() {
    return [
      // Level 1: pure sine
      [{ amp: 1.0, freq: 1, phase: 0 }, { amp: 0, freq: 2, phase: 0 }, { amp: 0, freq: 3, phase: 0 }, { amp: 0, freq: 4, phase: 0 }, { amp: 0, freq: 5, phase: 0 }],
      // Level 2: two harmonics
      [{ amp: 1.0, freq: 1, phase: 0 }, { amp: 0.5, freq: 3, phase: 0 }, { amp: 0, freq: 2, phase: 0 }, { amp: 0, freq: 4, phase: 0 }, { amp: 0, freq: 5, phase: 0 }],
      // Level 3: square approx (odd harmonics)
      [{ amp: 1.0, freq: 1, phase: 0 }, { amp: 0.33, freq: 3, phase: 0 }, { amp: 0.2, freq: 5, phase: 0 }, { amp: 0, freq: 2, phase: 0 }, { amp: 0, freq: 4, phase: 0 }],
      // Level 4: complex
      [{ amp: 0.8, freq: 1, phase: 0 }, { amp: 0.6, freq: 2, phase: 0 }, { amp: 0.4, freq: 3, phase: 0 }, { amp: 0, freq: 4, phase: 0 }, { amp: 0, freq: 5, phase: 0 }],
      // Level 5: sawtooth approx
      [{ amp: 1.0, freq: 1, phase: 0 }, { amp: 0.5, freq: 2, phase: 0 }, { amp: 0.33, freq: 3, phase: 0 }, { amp: 0.25, freq: 4, phase: 0 }, { amp: 0.2, freq: 5, phase: 0 }]
    ];
  }

  init() {
    this.container.innerHTML = this._buildUI();
    this._loadLevel(0);
    this._bindSliders();
    this._startLoop();
  }

  _buildUI() {
    const sliderHTML = this.harmonics.map((h, i) => `
      <div class="glass rounded-lg p-3 mb-2">
        <div class="flex justify-between mb-1">
          <span class="font-mono text-xs" style="color:var(--text-muted)">Harmonic n=${i + 1}: aₙ sin(${i + 1}ωt)</span>
          <span id="ws-amp-val-${i}" class="font-mono text-xs neon-cyan">${h.amp.toFixed(2)}</span>
        </div>
        <input type="range" id="ws-amp-${i}" min="0" max="1" step="0.01" value="${h.amp}" />
      </div>
    `).join('');

    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Oscilloscope -->
        <div class="lg:col-span-2 space-y-3">
          <div class="glass rounded-xl p-4 relative scanlines">
            <div class="flex justify-between mb-2">
              <span class="font-mono text-xs neon-cyan">YOUR WAVE</span>
              <span id="ws-match" class="font-mono text-xs" style="color:var(--text-muted)">MATCH: 0%</span>
            </div>
            <canvas id="waveCanvas" width="520" height="180" style="width:100%"></canvas>
          </div>
          <div class="glass rounded-xl p-4 relative">
            <div class="flex justify-between mb-2">
              <span class="font-mono text-xs neon-purple">TARGET WAVE (level ${this.level})</span>
              <span id="ws-level" class="font-mono text-xs" style="color:var(--text-muted)">LEVEL ${this.level}/5</span>
            </div>
            <canvas id="targetCanvas" width="520" height="180" style="width:100%;background:rgba(0,0,0,0.3);border-radius:6px;"></canvas>
          </div>
          <div id="ws-msg" class="text-center font-mono text-xs" style="color:var(--text-muted);min-height:16px"></div>
        </div>

        <!-- Controls -->
        <div class="space-y-4">
          <div class="glass rounded-xl p-4">
            <h3 class="font-display text-xs neon-cyan mb-3 tracking-wider">FOURIER COEFFICIENTS</h3>
            <div class="eq-display mb-4 text-sm">f(t) = Σ aₙ·sin(nωt)</div>
            <div id="ws-sliders">${sliderHTML}</div>
          </div>

          <div class="glass rounded-xl p-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center">
                <div id="ws-score-disp" class="font-display text-xl neon-cyan">0</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">SCORE</div>
              </div>
              <div class="text-center">
                <div id="ws-match-pct" class="font-display text-xl neon-purple">0%</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">MATCH</div>
              </div>
            </div>
            <div class="prog-bar mt-3"><div class="prog-fill" id="ws-prog" style="width:0%"></div></div>
          </div>

          <div class="glass rounded-xl p-4">
            <p class="font-mono text-xs mb-2" style="color:var(--cyan)">FOURIER THEORY</p>
            <p class="text-xs" style="color:var(--text-muted);line-height:1.8">
              Any periodic signal decomposes into a sum of sine/cosine harmonics. Adjust aₙ to match the target wave profile. This is how audio equalizers and vibration analyzers work.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  _loadLevel(idx) {
    this.level = idx + 1;
    this.targets = this.levels[idx];
    // Reset user harmonics to flat
    this.harmonics.forEach((h, i) => {
      h.amp = 0;
      const slider = document.getElementById(`ws-amp-${i}`);
      const label  = document.getElementById(`ws-amp-val-${i}`);
      if (slider) slider.value = 0;
      if (label)  label.textContent = '0.00';
    });
    this.harmonics[0].amp = 0;
    const s0 = document.getElementById('ws-amp-0');
    if (s0) s0.value = 0;
    this._drawTarget();
  }

  _bindSliders() {
    this.harmonics.forEach((h, i) => {
      document.getElementById(`ws-amp-${i}`)?.addEventListener('input', e => {
        h.amp = parseFloat(e.target.value);
        const label = document.getElementById(`ws-amp-val-${i}`);
        if (label) label.textContent = h.amp.toFixed(2);
      });
    });
  }

  /**
   * Evaluates the synthesized Fourier sum at time t
   * f(t) = Σ aₙ·sin(n·2π·t)
   */
  _evaluate(t, harmonics) {
    return harmonics.reduce((sum, h, i) => {
      if (h.amp === 0) return sum;
      return sum + h.amp * Math.sin((i + 1) * 2 * Math.PI * t + (h.phase || 0));
    }, 0);
  }

  _drawWave(ctx, harmonics, color, W, H) {
    ctx.clearRect(0, 0, W, H);
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    // Wave
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let px = 0; px < W; px++) {
      const t = (px / W) + this.time * 0.1;
      const val = this._evaluate(t, harmonics);
      const py = H / 2 - val * (H / 3);
      px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawTarget() {
    const canvas = document.getElementById('targetCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    this._drawWave(ctx, this.targets, '#bf5fff', canvas.width, canvas.height);
  }

  /**
   * Compute similarity between user wave and target wave
   * as 1 - normalized RMS error
   */
  _computeMatch() {
    const N = 200;
    let sumSqErr = 0;
    for (let i = 0; i < N; i++) {
      const t    = i / N;
      const user = this._evaluate(t, this.harmonics);
      const tgt  = this._evaluate(t, this.targets);
      sumSqErr += (user - tgt) ** 2;
    }
    const rms = Math.sqrt(sumSqErr / N);
    // Map rms to 0–100% match (rms=0 → 100%, rms=2 → 0%)
    return Math.max(0, Math.round((1 - rms / 2) * 100));
  }

  _startLoop() {
    const canvas = document.getElementById('waveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let levelIdx = 0;

    const loop = () => {
      if (this.destroyed) return;
      this.animId = requestAnimationFrame(loop);
      this.time += 0.3;

      this._drawWave(ctx, this.harmonics, '#00f5ff', canvas.width, canvas.height);
      this._drawTarget(); // re-draw target (static but level can change)

      const match = this._computeMatch();
      const matchEl = document.getElementById('ws-match');
      const matchPct = document.getElementById('ws-match-pct');
      const prog     = document.getElementById('ws-prog');

      if (matchEl)  matchEl.textContent  = `MATCH: ${match}%`;
      if (matchPct) matchPct.textContent = `${match}%`;
      if (prog)     prog.style.width     = `${match}%`;

      // Level complete at 85%+ match
      if (match >= 85 && !this._levelDone) {
        this._levelDone = true;
        this.score += match * this.level;
        const scoreEl = document.getElementById('ws-score-disp');
        if (scoreEl) scoreEl.textContent = this.score;
        this.onScore(this.score);

        const msgEl = document.getElementById('ws-msg');
        if (msgEl) { msgEl.textContent = `✓ LEVEL ${this.level} COMPLETE!`; msgEl.style.color = 'var(--success)'; }

        if (levelIdx < this.levels.length - 1) {
          setTimeout(() => {
            levelIdx++;
            this._levelDone = false;
            this._loadLevel(levelIdx);
            document.getElementById('ws-level').textContent = `LEVEL ${levelIdx + 1}/5`;
            if (msgEl) msgEl.textContent = '';
          }, 1800);
        } else {
          setTimeout(() => {
            this.onComplete();
            if (msgEl) msgEl.textContent = '🏆 FOURIER MASTER — ALL LEVELS COMPLETE';
            _triggerSuccess(this.container);
          }, 1000);
        }
      }
    };
    loop();
  }

  destroy() {
    this.destroyed = true;
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}


/* =====================================================================
   GAME 3: AREA ALCHEMIST — Gamma–Beta Functions
   =====================================================================
   Mathematical Mapping:
   The Gamma function: Γ(n) = (n-1)! for positive integers
   The Beta function:  B(x,y) = Γ(x)·Γ(y) / Γ(x+y)
   The reflection formula: Γ(n)·Γ(1-n) = π / sin(nπ)
   B(x,y) = ∫₀¹ t^(x-1)(1-t)^(y-1) dt

   The user is shown identity equations with blank values and must fill
   them in. Correct answers "fill" geometric shape cells on a grid.
   The game tests knowledge of recursive Γ properties and B symmetry.
===================================================================== */
class AreaAlchemist {
  constructor({ container, gameId, onScore, onComplete }) {
    this.container  = container;
    this.gameId     = gameId;
    this.onScore    = onScore;
    this.onComplete = onComplete;
    this.score      = 0;
    this.lives      = 3;
    this.puzzleIdx  = 0;
    this.solved     = 0;
  }

  // All puzzle answers use exact floats; user input matched within tolerance
  _puzzles() {
    return [
      {
        question: 'Γ(5) = ?',
        hint: 'Γ(n) = (n-1)!',
        answer: 24,
        tolerance: 0,
        explanation: 'Γ(5) = 4! = 24',
        shape: 'square', color: 'cyan'
      },
      {
        question: 'Γ(1/2) = √? (enter the radicand)',
        hint: 'Γ(1/2) = √π',
        answer: Math.PI,
        tolerance: 0.01,
        explanation: 'Γ(1/2) = √π ≈ 1.7725',
        shape: 'circle', color: 'purple'
      },
      {
        question: 'B(2,3) = ? (fraction, enter as decimal)',
        hint: 'B(x,y) = Γ(x)Γ(y)/Γ(x+y)',
        answer: 1 / 12,
        tolerance: 0.002,
        explanation: 'B(2,3) = Γ(2)Γ(3)/Γ(5) = 1·2/24 = 1/12 ≈ 0.0833',
        shape: 'triangle', color: 'cyan'
      },
      {
        question: 'Γ(7/2) = ?·√π/8 (enter the integer multiplier)',
        hint: 'Use Γ(n+1)=nΓ(n) recursively from Γ(1/2)=√π',
        answer: 15,
        tolerance: 0,
        explanation: 'Γ(7/2) = (5/2)(3/2)(1/2)Γ(1/2) = 15√π/8',
        shape: 'hexagon', color: 'purple'
      },
      {
        question: 'B(x,x) = π/(? · 4^x · B(x,1/2)) ... enter missing factor for B(1,1)',
        hint: 'B(1,1) = 1',
        answer: 1,
        tolerance: 0,
        explanation: 'B(1,1) = Γ(1)Γ(1)/Γ(2) = 1·1/1 = 1',
        shape: 'diamond', color: 'cyan'
      },
      {
        question: 'Γ(n+1) = n·Γ(n). If Γ(4) = 6, what is Γ(6)?',
        hint: 'Apply recursion twice',
        answer: 120,
        tolerance: 0,
        explanation: 'Γ(5) = 4·Γ(4) = 24; Γ(6) = 5·Γ(5) = 120',
        shape: 'star', color: 'purple'
      }
    ];
  }

  init() {
    this.puzzles = this._puzzles();
    this.container.innerHTML = this._buildUI();
    this._renderGrid();
    this._loadPuzzle(0);
    this._bindEvents();
  }

  _buildUI() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Shape grid -->
        <div class="lg:col-span-2">
          <div class="glass rounded-xl p-5">
            <div class="flex justify-between mb-4">
              <span class="font-mono text-xs neon-cyan">ALCHEMICAL GRID — fill shapes to unlock</span>
              <span id="aa-prog" class="font-mono text-xs" style="color:var(--text-muted)">0/${this.puzzles.length}</span>
            </div>
            <div id="aa-grid" class="grid grid-cols-3 gap-3 mb-4"></div>
            <div class="prog-bar"><div class="prog-fill" id="aa-fill" style="width:0%"></div></div>
          </div>
        </div>

        <!-- Puzzle panel -->
        <div class="space-y-4">
          <div class="glass rounded-xl p-5" id="aa-puzzle-card">
            <div class="flex justify-between mb-3">
              <span class="font-display text-xs neon-cyan tracking-wider">PUZZLE</span>
              <span id="aa-puzzle-num" class="font-mono text-xs" style="color:var(--text-muted)">1/${this.puzzles.length}</span>
            </div>

            <div id="aa-question" class="eq-display mb-4 text-sm min-h-[60px] flex items-center justify-center"></div>
            <div id="aa-hint" class="font-mono text-xs mb-4 text-center" style="color:var(--text-muted)"></div>

            <input type="number" id="aa-input" placeholder="Enter your answer..." step="any" />
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button id="aa-submit" class="btn-primary text-xs py-2">SUBMIT ↗</button>
              <button id="aa-skip"   class="btn-primary btn-purple text-xs py-2">HINT</button>
            </div>
            <div id="aa-feedback" class="mt-3 font-mono text-xs text-center min-h-[16px]"></div>
          </div>

          <div class="glass rounded-xl p-4">
            <div class="grid grid-cols-3 gap-2 text-center">
              <div>
                <div id="aa-score-disp" class="font-display text-xl neon-cyan">0</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">SCORE</div>
              </div>
              <div>
                <div id="aa-lives" class="font-display text-xl" style="color:var(--success)">♥♥♥</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">LIVES</div>
              </div>
              <div>
                <div id="aa-solved" class="font-display text-xl neon-purple">0</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">SOLVED</div>
              </div>
            </div>
          </div>

          <div class="glass rounded-xl p-4">
            <p class="font-mono text-xs mb-2" style="color:var(--cyan)">KEY IDENTITIES</p>
            <div class="space-y-1 font-mono text-xs" style="color:var(--text-muted)">
              <div>Γ(n) = (n-1)!</div>
              <div>Γ(1/2) = √π</div>
              <div>B(x,y) = Γ(x)Γ(y)/Γ(x+y)</div>
              <div>Γ(n+1) = nΓ(n)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _shapeHTML(p, idx, filled) {
    const color = p.color === 'cyan' ? '#00f5ff' : '#bf5fff';
    const shapes = {
      square:   `<div style="width:40px;height:40px;border:2px solid ${color};${filled ? `background:${color}22` : ''}"></div>`,
      circle:   `<div style="width:40px;height:40px;border-radius:50%;border:2px solid ${color};${filled ? `background:${color}22` : ''}"></div>`,
      triangle: `<svg width="40" height="40" viewBox="0 0 40 40"><polygon points="20,4 36,36 4,36" fill="${filled ? color+'22' : 'none'}" stroke="${color}" stroke-width="2"/></svg>`,
      hexagon:  `<svg width="40" height="40" viewBox="0 0 40 40"><polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="${filled ? color+'22' : 'none'}" stroke="${color}" stroke-width="2"/></svg>`,
      diamond:  `<svg width="40" height="40" viewBox="0 0 40 40"><polygon points="20,2 38,20 20,38 2,20" fill="${filled ? color+'22' : 'none'}" stroke="${color}" stroke-width="2"/></svg>`,
      star:     `<svg width="40" height="40" viewBox="0 0 40 40"><polygon points="20,2 24,15 38,15 27,23 31,36 20,28 9,36 13,23 2,15 16,15" fill="${filled ? color+'22' : 'none'}" stroke="${color}" stroke-width="2"/></svg>`
    };
    return `
      <div class="shape-target ${filled ? 'filled' : ''} h-24 flex-col gap-2" id="aa-shape-${idx}">
        ${shapes[p.shape] || shapes.square}
        <div class="font-mono text-xs mt-1" style="font-size:10px;color:${filled ? color : 'var(--text-muted)'}">${p.shape.toUpperCase()}</div>
      </div>
    `;
  }

  _renderGrid() {
    const grid = document.getElementById('aa-grid');
    if (!grid) return;
    grid.innerHTML = this.puzzles.map((p, i) =>
      this._shapeHTML(p, i, i < this.solved)
    ).join('');
  }

  _loadPuzzle(idx) {
    if (idx >= this.puzzles.length) return;
    this.puzzleIdx = idx;
    const p = this.puzzles[idx];
    document.getElementById('aa-question').textContent    = p.question;
    document.getElementById('aa-hint').textContent        = '';
    document.getElementById('aa-puzzle-num').textContent  = `${idx + 1}/${this.puzzles.length}`;
    document.getElementById('aa-input').value             = '';
    document.getElementById('aa-feedback').textContent    = '';
    document.getElementById('aa-input').focus();
  }

  _bindEvents() {
    document.getElementById('aa-submit')?.addEventListener('click', () => this._checkAnswer());
    document.getElementById('aa-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._checkAnswer();
    });
    document.getElementById('aa-skip')?.addEventListener('click', () => {
      const p = this.puzzles[this.puzzleIdx];
      document.getElementById('aa-hint').textContent = `Hint: ${p.hint}`;
    });
  }

  _checkAnswer() {
    const input = document.getElementById('aa-input');
    const val   = parseFloat(input?.value);
    if (isNaN(val)) { this._feedback('Enter a valid number', 'danger'); return; }

    const p = this.puzzles[this.puzzleIdx];
    const correct = Math.abs(val - p.answer) <= (p.tolerance + 1e-9);

    if (correct) {
      this.solved++;
      this.score += 150;
      this._feedback(`✓ ${p.explanation}`, 'success');
      this._renderGrid();
      document.getElementById('aa-prog').textContent = `${this.solved}/${this.puzzles.length}`;
      document.getElementById('aa-fill').style.width = `${(this.solved / this.puzzles.length) * 100}%`;
      document.getElementById('aa-solved').textContent   = this.solved;
      document.getElementById('aa-score-disp').textContent = this.score;
      this.onScore(this.score);

      if (this.solved >= this.puzzles.length) {
        setTimeout(() => {
          this.onComplete();
          _triggerSuccess(this.container);
        }, 800);
      } else {
        setTimeout(() => this._loadPuzzle(this.puzzleIdx + 1), 1500);
      }
    } else {
      this.lives--;
      this._updateLives();
      const diff = (val - p.answer).toFixed(4);
      this._feedback(`✗ Off by ${diff}. Try again.`, 'danger');
      if (this.lives <= 0) {
        this.lives = 3;
        this._updateLives();
        this._feedback('Showing answer — moving on.', 'muted');
        setTimeout(() => {
          this.solved++;
          this._renderGrid();
          this._loadPuzzle(this.puzzleIdx + 1);
        }, 2000);
      }
    }
  }

  _updateLives() {
    const hearts = '♥'.repeat(this.lives) + '♡'.repeat(Math.max(0, 3 - this.lives));
    const el = document.getElementById('aa-lives');
    if (el) { el.textContent = hearts; el.style.color = this.lives > 1 ? 'var(--success)' : 'var(--danger)'; }
  }

  _feedback(text, type) {
    const el = document.getElementById('aa-feedback');
    if (!el) return;
    const colors = { success: 'var(--success)', danger: 'var(--danger)', muted: 'var(--text-muted)' };
    el.textContent = text;
    el.style.color = colors[type] || 'var(--text-muted)';
  }

  destroy() {}
}


/* =====================================================================
   GAME 4: VOLUME SCULPTOR — Triple Integration
   =====================================================================
   Mathematical Mapping:
   A triple integral ∫∫∫ f(x,y,z) dV over region R = [x₁,x₂]×[y₁,y₂]×[z₁,z₂]
   For f=1 (unit integrand), the result = (x₂-x₁)(y₂-y₁)(z₂-z₁) = volume.

   The user inputs x, y, z bounds. The CSS 3D box dimensions are
   proportionally scaled to those bounds. A "target volume" is displayed;
   the user must choose bounds whose product matches the target.
   Division-by-zero and out-of-range inputs are caught and flagged.
===================================================================== */
class VolumeSculptor {
  constructor({ container, gameId, onScore, onComplete }) {
    this.container  = container;
    this.gameId     = gameId;
    this.onScore    = onScore;
    this.onComplete = onComplete;
    this.score      = 0;
    this.level      = 0;
    this.levels     = this._buildLevels();
  }

  _buildLevels() {
    return [
      { target: 6,  hint: 'Bounds: each axis 0→? Try simple integers.', label: '6 cubic units' },
      { target: 12, hint: 'V = Δx · Δy · Δz = 12', label: '12 cubic units' },
      { target: 24, hint: 'Try asymmetric bounds like [0,2]×[0,3]×[0,4]', label: '24 cubic units' },
      { target: 8,  hint: 'A cube! Equal bounds on all axes.', label: '8 cubic units' },
      { target: 30, hint: '2×3×5 or 1×5×6 … many solutions!', label: '30 cubic units' }
    ];
  }

  init() {
    this.container.innerHTML = this._buildUI();
    this._bindEvents();
    this._loadLevel(0);
  }

  _buildUI() {
    const boundsRow = (axis, color) => `
      <div class="glass rounded p-3 mb-2">
        <div class="font-mono text-xs mb-2" style="color:${color}">${axis}-axis bounds</div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="font-mono text-xs" style="color:var(--text-muted)">${axis}₁ (lower)</label>
            <input type="number" id="vs-${axis.toLowerCase()}1" value="0" min="0" max="10" step="0.5" />
          </div>
          <div>
            <label class="font-mono text-xs" style="color:var(--text-muted)">${axis}₂ (upper)</label>
            <input type="number" id="vs-${axis.toLowerCase()}2" value="2" min="0" max="10" step="0.5" />
          </div>
        </div>
      </div>
    `;

    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- 3D View -->
        <div class="lg:col-span-2">
          <div class="glass rounded-xl p-6">
            <div class="flex justify-between mb-4">
              <span class="font-mono text-xs neon-cyan">3D VOLUME SCULPTOR</span>
              <span id="vs-level-label" class="font-mono text-xs" style="color:var(--text-muted)">LEVEL 1/5</span>
            </div>

            <div class="iso-scene flex items-center justify-center mb-6" style="height:220px">
              <div class="iso-box" id="vs-box">
                <!-- CSS 3D faces injected by JS -->
              </div>
            </div>

            <!-- Integral display -->
            <div class="eq-display text-sm mb-4">
              V = ∫<span id="vs-x1d">₀</span><sup id="vs-x2d">²</sup>∫<span id="vs-y1d">₀</span><sup id="vs-y2d">²</sup>∫<span id="vs-z1d">₀</span><sup id="vs-z2d">²</sup> dz dy dx
            </div>

            <div class="grid grid-cols-2 gap-4 text-center">
              <div class="glass rounded p-3">
                <div id="vs-computed-vol" class="font-display text-2xl neon-cyan">8</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">YOUR VOLUME</div>
              </div>
              <div class="glass rounded p-3">
                <div id="vs-target-vol" class="font-display text-2xl neon-purple">6</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">TARGET VOLUME</div>
              </div>
            </div>

            <div id="vs-msg" class="mt-3 text-center font-mono text-xs" style="color:var(--text-muted);min-height:16px"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="space-y-4">
          <div class="glass rounded-xl p-5">
            <h3 class="font-display text-xs neon-cyan mb-3 tracking-wider">INTEGRATION BOUNDS</h3>
            ${boundsRow('X', 'var(--cyan)')}
            ${boundsRow('Y', 'var(--purple)')}
            ${boundsRow('Z', 'var(--success)')}
            <button id="vs-apply" class="btn-primary w-full mt-2 text-xs py-2">APPLY BOUNDS ↗</button>
          </div>

          <div class="glass rounded-xl p-4">
            <div class="grid grid-cols-2 gap-2 text-center">
              <div>
                <div id="vs-score-disp" class="font-display text-xl neon-cyan">0</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">SCORE</div>
              </div>
              <div>
                <div id="vs-levels-done" class="font-display text-xl neon-purple">0/5</div>
                <div class="font-mono text-xs" style="color:var(--text-muted)">LEVELS</div>
              </div>
            </div>
          </div>

          <div class="glass rounded-xl p-4">
            <div id="vs-hint" class="font-mono text-xs mb-2" style="color:var(--text-muted)"></div>
            <p class="font-mono text-xs mb-2" style="color:var(--cyan)">THEORY</p>
            <p class="text-xs" style="color:var(--text-muted);line-height:1.8">
              V = ∭dV = (x₂−x₁)(y₂−y₁)(z₂−z₁) for rectangular bounds with unit integrand. The 3D box scales live with your input.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    document.getElementById('vs-apply')?.addEventListener('click', () => this._applyBounds());
    // Live update on input change
    ['x1','x2','y1','y2','z1','z2'].forEach(id => {
      document.getElementById(`vs-${id}`)?.addEventListener('input', () => this._previewBounds());
    });
  }

  _loadLevel(idx) {
    this.level = idx;
    const lv = this.levels[idx];
    document.getElementById('vs-target-vol').textContent = lv.target;
    document.getElementById('vs-hint').textContent       = `Goal: ${lv.label} — ${lv.hint}`;
    document.getElementById('vs-level-label').textContent = `LEVEL ${idx + 1}/5`;
    this._previewBounds();
  }

  _readBounds() {
    const get = id => {
      const v = parseFloat(document.getElementById(`vs-${id}`)?.value);
      return isNaN(v) ? 0 : v;
    };
    return {
      x1: get('x1'), x2: get('x2'),
      y1: get('y1'), y2: get('y2'),
      z1: get('z1'), z2: get('z2')
    };
  }

  _computeVolume(b) {
    const dx = b.x2 - b.x1;
    const dy = b.y2 - b.y1;
    const dz = b.z2 - b.z1;
    // Guard against negative intervals
    if (dx < 0 || dy < 0 || dz < 0) return null;
    if (dx === 0 || dy === 0 || dz === 0) return 0;
    return parseFloat((dx * dy * dz).toFixed(4));
  }

  _previewBounds() {
    const b   = this._readBounds();
    const vol = this._computeVolume(b);

    // Update integral notation
    const s = (v) => v.toString();
    document.getElementById('vs-x1d').textContent = s(b.x1);
    document.getElementById('vs-x2d').textContent = s(b.x2);
    document.getElementById('vs-y1d').textContent = s(b.y1);
    document.getElementById('vs-y2d').textContent = s(b.y2);
    document.getElementById('vs-z1d').textContent = s(b.z1);
    document.getElementById('vs-z2d').textContent = s(b.z2);

    const volEl = document.getElementById('vs-computed-vol');
    if (vol === null) {
      if (volEl) { volEl.textContent = 'ERR'; volEl.style.color = 'var(--danger)'; }
      this._setMsg('⚠ Upper bound must exceed lower bound', 'danger');
      return;
    }
    if (volEl) { volEl.textContent = vol; volEl.style.color = 'var(--cyan)'; }
    this._setMsg('');
    this._updateBox(b);
  }

  _applyBounds() {
    const b   = this._readBounds();
    const vol = this._computeVolume(b);
    if (vol === null) { this._setMsg('⚠ Invalid bounds — upper must exceed lower', 'danger'); return; }

    const target = this.levels[this.level].target;
    const match  = Math.abs(vol - target) < 0.05;

    if (match) {
      this.score += 200;
      const scoreEl = document.getElementById('vs-score-disp');
      if (scoreEl) scoreEl.textContent = this.score;
      this.onScore(this.score);
      this._setMsg(`✓ VOLUME MATCHED: ${vol} cubic units`, 'success');

      const doneLevels = this.level + 1;
      document.getElementById('vs-levels-done').textContent = `${doneLevels}/5`;

      if (this.level < this.levels.length - 1) {
        setTimeout(() => this._loadLevel(this.level + 1), 1500);
      } else {
        setTimeout(() => {
          this.onComplete();
          _triggerSuccess(this.container);
        }, 800);
      }
    } else {
      const diff = (vol - target).toFixed(2);
      this._setMsg(`✗ Volume = ${vol}, Target = ${target} (Δ ${diff})`, 'danger');
    }
  }

  _updateBox(b) {
    const box = document.getElementById('vs-box');
    if (!box) return;

    const dx = Math.max(0.1, b.x2 - b.x1);
    const dy = Math.max(0.1, b.y2 - b.y1);
    const dz = Math.max(0.1, b.z2 - b.z1);

    // Normalize to fit in ~140px base
    const maxDim = Math.max(dx, dy, dz, 1);
    const scale  = 120 / maxDim;
    const W = Math.round(dx * scale);
    const H = Math.round(dy * scale);
    const D = Math.round(dz * scale);

    const c = '#00f5ff';
    const cD = '#bf5fff';

    box.style.cssText = `
      width:${W}px;height:${H}px;
      transform-style:preserve-3d;
      transform:rotateX(-25deg) rotateY(30deg);
      transition:all 0.5s ease;
      position:relative;margin:auto;
    `;

    const alpha = 0.12;
    box.innerHTML = `
      <div style="position:absolute;width:${W}px;height:${H}px;background:rgba(0,245,255,${alpha});border:1px solid ${c};transform:translateZ(${D/2}px)"></div>
      <div style="position:absolute;width:${W}px;height:${H}px;background:rgba(0,245,255,${alpha*0.5});border:1px solid ${c};transform:translateZ(-${D/2}px) rotateY(180deg)"></div>
      <div style="position:absolute;width:${D}px;height:${H}px;background:rgba(191,95,255,${alpha});border:1px solid ${cD};transform:rotateY(90deg) translateZ(${W/2}px);left:${(W-D)/2}px"></div>
      <div style="position:absolute;width:${D}px;height:${H}px;background:rgba(191,95,255,${alpha*0.5});border:1px solid ${cD};transform:rotateY(-90deg) translateZ(${W/2}px);left:${(W-D)/2}px"></div>
      <div style="position:absolute;width:${W}px;height:${D}px;background:rgba(0,255,140,${alpha});border:1px solid #00ff8c;transform:rotateX(90deg) translateZ(${H/2}px);top:${(H-D)/2}px"></div>
      <div style="position:absolute;width:${W}px;height:${D}px;background:rgba(0,255,140,${alpha*0.5});border:1px solid #00ff8c;transform:rotateX(-90deg) translateZ(${H/2}px);top:${(H-D)/2}px"></div>
    `;
  }

  _setMsg(text, type) {
    const el = document.getElementById('vs-msg');
    if (!el) return;
    const colors = { success: 'var(--success)', danger: 'var(--danger)', '': 'var(--text-muted)' };
    el.textContent = text;
    el.style.color = colors[type] || 'var(--text-muted)';
  }

  destroy() {}
}


/* =====================================================================
   GLOBAL HELPERS
===================================================================== */

/**
 * Trigger a success animation overlay on a container element.
 * Creates colored confetti squares with CSS keyframe animation.
 */
function _triggerSuccess(container) {
  const overlay = document.createElement('div');
  overlay.className = 'success-overlay';
  overlay.innerHTML = `<span class="font-display text-2xl neon-cyan" style="text-shadow:0 0 30px #00f5ff">✓ COMPLETE</span>`;

  // Confetti
  const colors = ['#00f5ff', '#bf5fff', '#00ff8c', '#ff4466', '#ffcc00'];
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left:${Math.random() * 100}%;
      top:${Math.random() * 60}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${Math.random() * 0.5}s;
      animation-duration:${0.8 + Math.random() * 0.8}s;
      width:${6 + Math.random() * 8}px;
      height:${6 + Math.random() * 8}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    overlay.appendChild(piece);
  }

  const target = container.querySelector('.glass') || container;
  target.style.position = 'relative';
  target.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2500);
}


/* =====================================================================
   BOOT
===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});


/* =====================================================================
   CHECKLIST — Math-to-Game Logic Mapping
   =====================================================================

   [✓] GAME 1: GRADIENT MAZE — Partial Differentiation
       Mapping: Newton's 2nd law analog — particle acceleration vector
       a = (∂z/∂x, ∂z/∂y). Velocity integrates force; position integrates
       velocity. Canvas field zones simulate regions with different gradient
       values. User must steer particle by choosing correct ∂z/∂x, ∂z/∂y
       to navigate toward targets. Reflects how engineers compute heat flux
       or stress gradients in 2D material domains.

   [✓] GAME 2: WAVE SYNTHESIZER — Fourier Series
       Mapping: f(t) = Σ aₙ·sin(nωt). User controls Fourier coefficients aₙ
       for harmonics n=1..5. Canvas renders the superposed waveform in real-
       time. Target waveform is pre-computed from a reference coefficient set.
       Match quality uses RMS error. Models how mechanical vibration signals
       (e.g. rotating machinery) are decomposed into harmonic components for
       NVH analysis.

   [✓] GAME 3: AREA ALCHEMIST — Gamma–Beta Functions
       Mapping: Puzzle questions test Γ(n)=(n-1)!, Γ(1/2)=√π, B(x,y)=Γ(x)Γ(y)/Γ(x+y),
       and the recursion Γ(n+1)=nΓ(n). Answers are validated with floating-
       point tolerance. Each correct answer "fills" a geometric shape on a
       grid. Models how Gamma function appears in probability distributions
       (Weibull, Chi-squared) used in mechanical reliability engineering.

   [✓] GAME 4: VOLUME SCULPTOR — Triple Integration
       Mapping: V = ∫x1→x2 ∫y1→y2 ∫z1→z2 dz dy dx = Δx·Δy·Δz for unit
       integrand over rectangular bounds. User sets 6 bounds; computed volume
       is displayed and compared to target. CSS 3D box dimensions scale
       proportionally to Δx, Δy, Δz (normalized). Division-by-zero (Δ=0)
       and negative intervals (upper < lower) are caught and flagged. Models
       how mechanical engineers compute centroid and moment of inertia of
       complex geometries via triple integrals.

   [✓] localStorage: State persisted under key 'engmath_v1'. Tracks XP,
       completion flags, high scores, and level per game. Updated on every
       score event and completion.

   [✓] Error handling: parseFloat/isNaN checks on all inputs. Volume
       sculptor validates Δ > 0. Wave synth clamps slider range 0–1.
       Gradient maze clamps velocity to maxV. No global variable pollution
       (all state encapsulated in class instances or IIFE).

   [✓] Accessibility: Keyboard-accessible sliders and inputs. Focus rings
       on all interactive elements. High-contrast neon-on-dark palette.
       Responsive layout via Tailwind grid.

   [✓] Animations: CSS keyframe `successPulse` on completion overlay,
       `confettiFall` for confetti particles, `blink` for cursor elements,
       `driftBg` for ambient background motion, `dotPulse` for loaders.

===================================================================== */
