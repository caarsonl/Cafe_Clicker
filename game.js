/**
 * Cozy Rainy Cafe: Grand Master Edition — Complete Rebalanced Web Engine
 * Includes 12-Currency Progression, Multi-Currency Plinko, 10-Rarity RNG & Cutscenes
 */

// Polyfill roundRect for older browsers on GitHub Pages
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rad = Array.isArray(r) ? r[0] : (r || 0);
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

// =============================================================================
// 1. MATHEMATICAL FORMATTERS & COLOR CONSTANTS
// =============================================================================

const SUFFIXES = [
  "", "K", "M", "B", "T", "Qd", "Qn", "Sx", "Sp", "Oc", "No",
  "Dc", "Ud", "Dd", "Td", "Qad", "Qnd", "Sxd", "Spd", "Ocd", "Nod", "Vg"
];

function formatNum(val, notation = "suffix") {
  if (val < 0) return "-" + formatNum(-val, notation);
  if (val < 1000.0) {
    if (Number.isInteger(val) || Math.abs(val - Math.round(val)) < 1e-6) {
      return Math.floor(val).toString();
    }
    return val.toFixed(1);
  }
  if (notation === "scientific") {
    return val.toExponential(2);
  }
  const exp = Math.floor(Math.log10(Math.max(val, 1.0)) / 3.0);
  if (exp >= SUFFIXES.length) {
    return val.toExponential(2);
  }
  const scaled = val / Math.pow(1000.0, exp);
  return scaled >= 100.0
    ? `${scaled.toFixed(1)}${SUFFIXES[exp]}`
    : `${scaled.toFixed(2)}${SUFFIXES[exp]}`;
}

const COLORS = {
  bg: "rgb(238, 232, 224)",
  windowRain: "rgb(175, 188, 198)",
  text: "rgb(58, 42, 34)",
  textLight: "rgb(145, 125, 115)",
  textMuted: "rgb(180, 165, 155)",
  accent: "rgb(198, 108, 68)",
  card: "rgb(252, 249, 246)",
  cardLocked: "rgb(238, 234, 230)",
  gold: "rgb(212, 154, 42)",
  goldHover: "rgb(235, 178, 65)",
  goldBg: "rgb(255, 249, 235)",
  astral: "rgb(90, 130, 210)",
  pantheon: "rgb(165, 95, 215)",
  darkMatter: "rgb(75, 45, 110)",
  supernova: "rgb(245, 110, 35)",
  chronos: "rgb(40, 170, 105)",
  aether: "rgb(50, 195, 215)",
  omega: "rgb(240, 70, 150)",
  dew: "rgb(120, 210, 255)",
  quasar: "rgb(255, 190, 50)",
  eternal: "rgb(255, 105, 180)",
  mug: "rgb(248, 244, 238)",
  mugShadow: "rgb(215, 208, 200)",
  coffee: "rgb(52, 32, 20)",
  crema: "rgb(225, 195, 170)",
  saucer: "rgb(215, 205, 195)",
  catFur: "rgb(242, 185, 130)",
  catEars: "rgb(245, 145, 145)",
  success: "rgb(65, 125, 80)",
  danger: "rgb(175, 75, 75)",
  star: "rgb(225, 165, 45)",
  heatCold: "rgb(70, 130, 180)"
};

// =============================================================================
// 2. PROCEDURAL CANVAS ICON DRAWERS
// =============================================================================

function drawGoldenSparkle(ctx, cx, cy, size = 7, color = COLORS.gold) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size / 3, cy - size / 3);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx + size / 3, cy + size / 3);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size / 3, cy + size / 3);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx - size / 3, cy - size / 3);
  ctx.closePath();
  ctx.fill();
}

function drawAstralCrystal(ctx, cx, cy, size = 8, color = COLORS.astral) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.7, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.7, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.5);
  ctx.lineTo(cx + size * 0.3, cy);
  ctx.lineTo(cx, cy + size * 0.5);
  ctx.lineTo(cx - size * 0.3, cy);
  ctx.closePath();
  ctx.fill();
}

function drawStarlightShard(ctx, cx, cy, size = 8, color = COLORS.pantheon) {
  drawGoldenSparkle(ctx, cx, cy, size, color);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCroissantIcon(ctx, cx, cy, size = 24) {
  ctx.save();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = Math.max(4, size * 0.42);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.65, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  ctx.strokeStyle = COLORS.goldHover;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.55, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();
  ctx.restore();
}

// =============================================================================
// 3. WEB AUDIO API PROCEDURAL SYNTHESIZER
// =============================================================================

class PureSoundEngine {
  constructor() {
    this.ctx = null;
    this.sampleRate = 44100;
    this.buffers = {};
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this._buildAllBuffers();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  _createBuffer(duration, generatorFn) {
    const total = Math.floor(this.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, total, this.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < total; i++) {
      const t = i / this.sampleRate;
      data[i] = Math.max(-1, Math.min(1, generatorFn(t, i)));
    }
    return buffer;
  }

  _buildAllBuffers() {
    const pitches = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    this.buffers.taps = pitches.map((freq) => {
      let p1 = 0, p2 = 0;
      return this._createBuffer(0.14, (t) => {
        const env = Math.min(1.0, t / 0.003) * Math.exp(-t * 28.0);
        p1 += (2.0 * Math.PI * freq) / this.sampleRate;
        p2 += (2.0 * Math.PI * (freq * 2.76)) / this.sampleRate;
        return (Math.sin(p1) * 0.72 + Math.sin(p2) * 0.28) * env * 0.26;
      });
    });

    this.buffers.bell = this._createBuffer(0.4, (t) => {
      const env = Math.min(1.0, t / 0.003) * Math.exp(-t * 7.8);
      return (Math.sin(2 * Math.PI * 987.77 * t) * 0.75 + Math.sin(2 * Math.PI * 1975.54 * t) * 0.25) * env * 0.22;
    });

    this.buffers.thud = this._createBuffer(0.08, (t) => {
      const env = Math.min(1.0, t / 0.008) * Math.exp(-t * 38.0);
      return Math.sin(2 * Math.PI * 105.0 * t) * env * 0.25;
    });

    const chord = [523.25, 659.25, 783.99, 1046.5];
    this.buffers.rebirth = this._createBuffer(1.1, (t) => {
      const env = Math.min(1.0, t / 0.08) * Math.exp(-t * 3.0);
      return chord.reduce((acc, f) => acc + Math.sin(2 * Math.PI * f * t), 0) * 0.12 * env;
    });

    this.buffers.astral = this._createBuffer(1.6, (t) => {
      const env = Math.min(1.0, t / 0.15) * Math.exp(-t * 1.8);
      const f = 440.0 + 350.0 * (1.0 - Math.exp(-t * 3.0));
      return (Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.5) * env * 0.24;
    });

    const pNotes = [587.33, 880.0, 1174.66, 1760.0];
    this.buffers.pantheon = this._createBuffer(2.0, (t) => {
      const env = Math.min(1.0, t / 0.05) * Math.exp(-t * 1.4);
      return pNotes.reduce((acc, n) => acc + Math.sin(2 * Math.PI * n * t), 0) * 0.09 * env;
    });

    this.buffers.cosmic = this._createBuffer(2.4, (t) => {
      const env = Math.min(1.0, t / 0.2) * Math.exp(-t * 1.2);
      const f = 110.0 + 280.0 * Math.sin(2 * Math.PI * 0.8 * t);
      return (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * (f * 2.0) * t) * 0.4) * env * 0.28;
    });

    const fPitches = [659.25, 880.0, 1174.66, 1318.51];
    this.buffers.frenzy = this._createBuffer(0.5, (t) => {
      const step = Math.min(fPitches.length - 1, Math.floor(t / 0.12));
      const lt = t - step * 0.12;
      const env = Math.min(1.0, lt / 0.006) * Math.exp(-lt * 12.0);
      return Math.sin(2 * Math.PI * fPitches[step] * lt) * env * 0.22;
    });

    this.buffers.brew = this._createBuffer(0.2, (t) => {
      const env = Math.min(1.0, t / 0.006) * Math.exp(-t * 18.0);
      const f = 460.0 * (1.0 + 0.35 * Math.exp(-t * 40.0));
      return Math.sin(2 * Math.PI * f * t) * env * 0.24;
    });

    this.buffers.order = this._createBuffer(0.35, (t) => {
      const env = Math.min(1.0, t / 0.005) * Math.exp(-t * 9.0);
      return (Math.sin(2 * Math.PI * 1046.5 * t) * 0.7 + Math.sin(2 * Math.PI * 1567.98 * t) * 0.3) * env * 0.25;
    });

    this.buffers.purr = this._createBuffer(0.3, (t) => {
      const env = Math.min(1.0, t / 0.02) * Math.exp(-t * 10.0);
      const mod = 1.0 + 0.4 * Math.sin(2 * Math.PI * 25.0 * t);
      return Math.sin(2 * Math.PI * 180.0 * t * mod) * env * 0.25;
    });

    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    this.buffers.levelup = this._createBuffer(0.7, (t) => {
      const step = Math.min(arp.length - 1, Math.floor(t / 0.11));
      const lt = t - step * 0.11;
      const env = Math.min(1.0, lt / 0.005) * Math.exp(-lt * 8.5);
      return Math.sin(2 * Math.PI * arp[step] * lt) * env * 0.24;
    });

    this.buffers.vent = this._createBuffer(0.45, (t) => {
      const env = Math.min(1.0, t / 0.02) * Math.exp(-t * 6.5);
      const noise = (Math.random() * 2 - 1) * 0.22;
      return (Math.sin(2 * Math.PI * 650.0 * t) * 0.08 + noise) * env;
    });
  }

  playBuffer(buf, enabled = true, volume = 1.0) {
    if (!enabled) return;
    this._ensureContext();
    if (!this.ctx || !buf) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = Math.max(0, Math.min(1, volume));
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  playTap(e = true, v = 1.0) {
    this._ensureContext();
    if (!this.buffers.taps) return;
    const choice = this.buffers.taps[Math.floor(Math.random() * this.buffers.taps.length)];
    this.playBuffer(choice, e, v);
  }
  playBuy(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.bell, e, v); }
  playDeny(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.thud, e, v); }
  playRebirth(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.rebirth, e, v); }
  playAstral(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.astral, e, v); }
  playPantheon(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.pantheon, e, v); }
  playCosmic(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.cosmic, e, v); }
  playFrenzy(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.frenzy, e, v); }
  playBrew(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.brew, e, v); }
  playOrder(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.order, e, v); }
  playPurr(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.purr, e, v); }
  playLevelup(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.levelup, e, v); }
  playVent(e = true, v = 1.0) { this._ensureContext(); this.playBuffer(this.buffers.vent, e, v); }
}

// =============================================================================
// 4. ENVIRONMENT, STEAM, POPUPS & CROISSANT EVENT
// =============================================================================

class WeatherEngine {
  constructor(width, height, count = 55) {
    this.width = width;
    this.height = height;
    this.timeOfDay = 0.0;
    this.drops = [];
    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: Math.random() * (width + 100),
        y: Math.random() * height,
        len: 14 + Math.random() * 12,
        speed: 320 + Math.random() * 160
      });
    }
  }

  update(dt) {
    this.timeOfDay = (this.timeOfDay + dt * (4.0 / 60.0)) % 24.0;
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.22 * dt;
      if (d.y > this.height || d.x < -20) {
        d.y = -d.len;
        d.x = Math.random() * (this.width + 120);
      }
    }
  }

  getWindowColor() {
    const tod = this.timeOfDay;
    if (tod >= 5.0 && tod < 10.0) return "rgb(225, 230, 235)";
    if (tod >= 10.0 && tod < 16.0) return "rgb(215, 222, 228)";
    if (tod >= 16.0 && tod < 19.5) return "rgb(232, 218, 210)";
    return "rgb(185, 195, 205)";
  }

  drawRain(ctx) {
    ctx.strokeStyle = COLORS.windowRain;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of this.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.22, d.y + d.len);
    }
    ctx.stroke();
  }
}

class SteamPuff {
  constructor(x, y) {
    this.x = x + (Math.random() * 32 - 16);
    this.startX = this.x;
    this.y = y;
    this.radius = 9 + Math.random() * 6;
    this.life = 1.8 + Math.random() * 0.7;
    this.maxLife = this.life;
    this.driftFreq = 2.0 + Math.random() * 1.8;
  }

  update(dt) {
    this.life -= dt;
    this.y -= 36.0 * dt;
    const progress = 1.0 - this.life / this.maxLife;
    this.x = this.startX + Math.sin(progress * this.driftFreq * Math.PI) * 18.0;
    this.radius += 8.0 * dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, 0.28 * (this.life / this.maxLife));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class FloatingPopup {
  constructor(text, x, y, color = COLORS.accent) {
    this.text = text;
    this.x = x + (Math.random() * 24 - 12);
    this.y = y;
    this.life = 1.05;
    this.maxLife = this.life;
    this.color = color;
  }

  update(dt) {
    this.life -= dt;
    this.y -= 44.0 * dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class GoldenCroissantEvent {
  constructor() {
    this.active = false;
    this.x = -50;
    this.y = 200;
    this.vx = 0;
    this.vy = 0;
    this.size = 24;
    this.timer = 0.0;
    this.spawnInterval = 60.0 + Math.random() * 50.0;
  }

  update(dt, width, height, rateMult = 1.0) {
    if (!this.active) {
      this.timer += dt * rateMult;
      if (this.timer >= this.spawnInterval) {
        this.spawn(width, height);
      }
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt + Math.sin(performance.now() * 0.005) * 0.6;
      if (this.x > width + 50 || this.y > height + 50 || this.y < -50) {
        this.active = false;
        this.timer = 0.0;
        this.spawnInterval = 70.0 + Math.random() * 60.0;
      }
    }
  }

  spawn(width, height) {
    this.active = true;
    this.timer = 0.0;
    this.x = -35;
    this.y = 90 + Math.random() * (height - 220);
    this.vx = 55.0 + Math.random() * 30.0;
    this.vy = -15.0 + Math.random() * 30.0;
  }

  checkClick(x, y) {
    if (!this.active) return false;
    if (Math.hypot(x - this.x, y - this.y) <= this.size + 12) {
      this.active = false;
      this.timer = 0.0;
      this.spawnInterval = 70.0 + Math.random() * 60.0;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.active) {
      drawCroissantIcon(ctx, this.x, this.y, this.size);
    }
  }
}

// =============================================================================
// 5. MULTI-CURRENCY PLINKO PHYSICS SIMULATOR (WITH 10% BET CAP)
// =============================================================================

class MultiCurrencyPlinko {
  constructor(width = 545, height = 420) {
    this.width = width;
    this.height = height;
    this.xCenter = width / 2;
    this.yTop = 8;
    this.pegR = 4;
    this.ballR = 6.5;
    this.gravity = 420.0;
    this.dx = 38;
    this.dy = 34;
    this.numRows = 9;

    this.pegs = [];
    for (let r = 0; r < this.numRows; r++) {
      const count = r + 3;
      const startX = this.xCenter - ((count - 1) * this.dx) / 2.0;
      const rowY = this.yTop + 62 + r * this.dy;
      for (let c = 0; c < count; c++) {
        this.pegs.push({ x: startX + c * this.dx, y: rowY });
      }
    }

    this.binY = this.yTop + 62 + (this.numRows - 1) * this.dy + 30;
    // Balanced 10x edge bins (prevents infinite exponential exploits on prestige currencies)
    this.multipliers = [10.0, 4.0, 1.8, 0.6, 0.25, 0.25, 0.6, 1.8, 4.0, 10.0];
    this.numBins = this.multipliers.length;
    const totalSpan = this.numBins * this.dx;
    this.binStartX = this.xCenter - totalSpan / 2.0;

    this.currencyType = "beans";
    this.balls = [];
    this.popups = [];
  }

  getCurrencyBias(talentReduction = 0.0) {
    const biasMap = {
      beans: 0.0, golden: 0.2, astral: 0.35, shards: 0.5,
      dark_matter: 0.6, supernova: 0.7, chronos: 0.78,
      aether: 0.85, omega: 0.9, dew: 0.92, quasar: 0.94, eternal: 0.96
    };
    const base = biasMap[this.currencyType] || 0.0;
    return Math.max(0.0, base - talentReduction);
  }

  getMaxBet(currentBalance) {
    if (currentBalance < 1) return 0;
    if (currentBalance < 10) return 1;
    return Math.floor(currentBalance * 0.10); // Capped at 10% of balance
  }

  parseBetAmount(str, currentBalance) {
    const maxAllowed = this.getMaxBet(currentBalance);
    if (maxAllowed <= 0) return 0;

    let s = (str || "").trim().toLowerCase();
    let mult = 1.0;
    if (s.endsWith("k")) { mult = 1e3; s = s.slice(0, -1); }
    else if (s.endsWith("m")) { mult = 1e6; s = s.slice(0, -1); }
    else if (s.endsWith("b")) { mult = 1e9; s = s.slice(0, -1); }
    let val = parseFloat(s) * mult;
    if (isNaN(val) || val <= 0) val = 1.0;
    return Math.max(1.0, Math.min(maxAllowed, val));
  }

  dropBall(xPos, betStr, currentBalance, talentReduction = 0.0) {
    const betAmt = this.parseBetAmount(betStr, currentBalance);
    if (currentBalance < betAmt || betAmt <= 0) return { success: false, amount: 0 };

    const clampedX = Math.max(this.xCenter - 110, Math.min(this.xCenter + 110, xPos));
    this.balls.push({
      x: clampedX,
      y: this.yTop + 34,
      vx: -18.0 + Math.random() * 36.0,
      vy: 10.0 + Math.random() * 20.0,
      bet: betAmt,
      currency: this.currencyType,
      bias: this.getCurrencyBias(talentReduction)
    });
    return { success: true, amount: betAmt };
  }

  update(dt, sfx, sfxEnabled, sfxVol) {
    const completed = [];
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.vy += this.gravity * dt;
      if (b.bias > 0) {
        const distFromCenter = b.x - this.xCenter;
        b.vx -= distFromCenter * (b.bias * 4.2) * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      for (const p of this.pegs) {
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        const minDist = this.ballR + this.pegR;
        if (dist < minDist && dist > 0.001) {
          const nx = (b.x - p.x) / dist;
          const ny = (b.y - p.y) / dist;
          b.x = p.x + nx * minDist;
          b.y = p.y + ny * minDist;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            const restitution = 0.58;
            const sign = b.x - this.xCenter >= 0 ? 1 : -1;
            const inwardNudge = -sign * (b.bias * 16.0);
            b.vx = b.vx - (1.0 + restitution) * dot * nx + (-12 + Math.random() * 24) + inwardNudge;
            b.vy = b.vy - (1.0 + restitution) * dot * ny;
            sfx.playTap(sfxEnabled, sfxVol * 0.55);
          }
        }
      }

      const span = ((this.numRows + 2) * this.dx) / 2.0 + 15;
      if (b.x < this.xCenter - span) {
        b.x = this.xCenter - span;
        b.vx = Math.abs(b.vx) * 0.6;
      } else if (b.x > this.xCenter + span) {
        b.x = this.xCenter + span;
        b.vx = -Math.abs(b.vx) * 0.6;
      }

      if (b.y >= this.binY) {
        let binIdx = Math.floor((b.x - this.binStartX) / this.dx);
        binIdx = Math.max(0, Math.min(this.numBins - 1, binIdx));
        const mult = this.multipliers[binIdx];
        const payout = b.bet * mult;
        completed.push({ payout, mult, x: b.x, y: this.binY, currency: b.currency });
        this.balls.splice(i, 1);
      }
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].update(dt);
      if (this.popups[i].life <= 0) this.popups.splice(i, 1);
    }

    return completed;
  }

  draw(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    // Top Aim Strip
    const stripW = 260, stripH = 26;
    const stripX = this.xCenter - stripW / 2;
    const stripY = this.yTop + 8;
    ctx.fillStyle = COLORS.card;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(stripX, stripY, stripW, stripH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.textLight;
    ctx.font = "600 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CLICK STRIP TO AIM LAUNCH (10% MAX BET)", this.xCenter, stripY + 17);

    // Pegs
    for (const p of this.pegs) {
      ctx.fillStyle = "rgb(190, 160, 120)";
      ctx.beginPath();
      ctx.arc(p.x, p.y + 1, this.pegR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.pegR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Multiplier Bins
    for (let idx = 0; idx < this.multipliers.length; idx++) {
      const mult = this.multipliers[idx];
      const bx = this.binStartX + idx * this.dx;
      let bg = COLORS.cardLocked, border = COLORS.textMuted, tc = COLORS.textMuted;
      if (mult >= 10.0) {
        bg = COLORS.goldBg; border = COLORS.gold; tc = "rgb(160, 105, 15)";
      } else if (mult >= 1.8) {
        bg = "rgb(235, 248, 238)"; border = COLORS.success; tc = COLORS.success;
      }

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.roundRect(bx + 2, this.binY, this.dx - 4, 32, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = tc;
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.fillText(`${mult}x`, bx + this.dx / 2, this.binY + 20);
    }

    // Active Balls
    for (const b of this.balls) {
      const { x: bx, y: by, currency: curr } = b;
      if (curr === "beans") {
        ctx.fillStyle = COLORS.coffee;
        ctx.beginPath();
        ctx.ellipse(bx, by, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.crema;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.lineTo(bx + 5, by);
        ctx.stroke();
      } else if (curr === "golden") {
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        drawGoldenSparkle(ctx, bx, by, 4, "#ffffff");
      } else if (curr === "astral") {
        drawAstralCrystal(ctx, bx, by, 8, COLORS.astral);
      } else if (curr === "shards") {
        drawStarlightShard(ctx, bx, by, 8, COLORS.pantheon);
      } else {
        const cMap = {
          dark_matter: COLORS.darkMatter,
          supernova: COLORS.supernova,
          chronos: COLORS.chronos,
          aether: COLORS.aether,
          omega: COLORS.omega,
          dew: COLORS.dew,
          quasar: COLORS.quasar,
          eternal: COLORS.eternal
        };
        ctx.fillStyle = cMap[curr] || COLORS.omega;
        ctx.beginPath();
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const pop of this.popups) {
      pop.draw(ctx);
    }
  }
}

// =============================================================================
// 6. GAME DATA MODELS
// =============================================================================

class RegularUpgrade {
  constructor(uid, name, baseCost, bps, clickBoost, desc) {
    this.uid = uid;
    this.name = name;
    this.baseCost = baseCost;
    this.bps = bps;
    this.clickBoost = clickBoost;
    this.desc = desc;
    this.count = 0;
  }

  getMilestoneMult() {
    let m = 1.0;
    for (const th of [25, 50, 100, 250, 500, 1000]) {
      if (this.count >= th) m *= 2.0;
    }
    return m;
  }

  getCostSingle(discount = 1.0, r = 1.22) {
    return Math.max(1.0, this.baseCost * Math.pow(r, this.count) * discount);
  }

  getBulkInfo(buyMode, currentBeans, discount = 1.0, r = 1.22) {
    const baseC = this.baseCost * discount;
    if (buyMode === "1") {
      return { qty: 1, cost: Math.max(1.0, baseC * Math.pow(r, this.count)) };
    }
    if (buyMode === "10" || buyMode === "100") {
      const qty = buyMode === "10" ? 10 : 100;
      const cost = baseC * Math.pow(r, this.count) * ((Math.pow(r, qty) - 1.0) / (r - 1.0));
      return { qty, cost: Math.max(1.0, cost) };
    }
    if (buyMode === "max") {
      const currentUnit = baseC * Math.pow(r, this.count);
      if (currentBeans < currentUnit) return { qty: 1, cost: currentUnit };
      const val = 1.0 + (currentBeans * (r - 1.0)) / currentUnit;
      let qty = val > 1.0 ? Math.floor(Math.log(val) / Math.log(r)) : 1;
      qty = Math.max(1, qty);
      let cost = baseC * Math.pow(r, this.count) * ((Math.pow(r, qty) - 1.0) / (r - 1.0));
      while (cost > currentBeans && qty > 1) {
        qty -= 1;
        cost = baseC * Math.pow(r, this.count) * ((Math.pow(r, qty) - 1.0) / (r - 1.0));
      }
      return { qty, cost: Math.max(1.0, cost) };
    }
    return { qty: 1, cost: this.getCostSingle(discount, r) };
  }
}

class EndlessMoneySink {
  constructor(uid, name, baseCost, costScale, currencyType, desc, buffType, buffPerLvl) {
    this.uid = uid;
    this.name = name;
    this.baseCost = baseCost;
    this.costScale = costScale;
    this.currencyType = currencyType;
    this.desc = desc;
    this.buffType = buffType;
    this.buffPerLvl = buffPerLvl;
    this.level = 0;
  }

  getCostSingle() {
    return this.baseCost * Math.pow(this.costScale, this.level);
  }

  getMaxAffordable(budget) {
    const cUnit = this.getCostSingle();
    if (budget < cUnit) return { qty: 0, cost: cUnit };
    const r = this.costScale;
    const val = 1.0 + (budget * (r - 1.0)) / cUnit;
    if (val <= 1.0) return { qty: 0, cost: cUnit };
    let k = Math.max(1, Math.floor(Math.log(val) / Math.log(r)));
    let totalCost = cUnit * ((Math.pow(r, k) - 1.0) / (r - 1.0));
    while (totalCost > budget && k > 1) {
      k -= 1;
      totalCost = cUnit * ((Math.pow(r, k) - 1.0) / (r - 1.0));
    }
    return { qty: k, cost: totalCost };
  }
}

// =============================================================================
// 7. 10-TIER RNG AURA SYSTEM & PROCEDURAL CUTSCENE ENGINE
// =============================================================================

const RNG_RARITIES = [
  {
    index: 0, id: "common", tierName: "Common", auraName: "House Blend Steam",
    odds: 2, color: "#9e8c80", cssClass: "tier-common",
    buffType: "bps", baseBuff: 0.05, desc: "+5% Passive BPS (+1% per dup)"
  },
  {
    index: 1, id: "uncommon", tierName: "Uncommon", auraName: "Velvet Crema Glow",
    odds: 5, color: "#3e8e57", cssClass: "tier-uncommon",
    buffType: "click", baseBuff: 0.12, desc: "+12% Click Power (+2.5% per dup)"
  },
  {
    index: 2, id: "rare", tierName: "Rare", auraName: "Raindrop Lo-Fi Pulse",
    odds: 15, color: "#3670c7", cssClass: "tier-rare",
    buffType: "global", baseBuff: 0.25, desc: "+25% Global Multiplier (+5% per dup)"
  },
  {
    index: 3, id: "epic", tierName: "Epic", auraName: "Midnight Roast Vortex",
    odds: 50, color: "#9b59b6", cssClass: "tier-epic",
    buffType: "global", baseBuff: 0.60, desc: "+60% Global Multiplier (+12% per dup)"
  },
  {
    index: 4, id: "legendary", tierName: "Legendary", auraName: "Golden Sovereign Crown",
    odds: 250, color: "#f39c12", cssClass: "tier-legendary",
    buffType: "global", baseBuff: 1.50, desc: "+150% Global Mult & +15% Luck"
  },
  {
    index: 5, id: "mythic", tierName: "Mythic", auraName: "Crimson Supernova Core",
    odds: 1250, color: "#e74c3c", cssClass: "tier-mythic",
    buffType: "global", baseBuff: 4.50, desc: "+450% Global Mult & +50% Click Power"
  },
  {
    index: 6, id: "exotic", tierName: "Exotic", auraName: "Prismatic Nebula Brew",
    odds: 6000, color: "#00d2ff", cssClass: "tier-exotic",
    buffType: "global", baseBuff: 15.00, desc: "+1,500% Global Mult & +35% Luck"
  },
  {
    index: 7, id: "secret", tierName: "Secret", auraName: "Abyssal Cipher Espresso",
    odds: 25000, color: "#c266ff", cssClass: "tier-secret",
    buffType: "global", baseBuff: 50.00, desc: "+5,000% Global Mult & +100% Crit Power"
  },
  {
    index: 8, id: "very_secret", tierName: "Very Secret", auraName: "Chronos Dimensional Rift",
    odds: 100000, color: "#00ffcc", cssClass: "tier-very-secret",
    buffType: "global", baseBuff: 250.00, desc: "+25,000% Global Mult & +25% Roll Speed"
  },
  {
    index: 9, id: "nearly_impossible", tierName: "Nearly Impossible", auraName: "Omniversal Singularity Bean",
    odds: 1000000, color: "#ffdd44", cssClass: "tier-impossible",
    buffType: "global", baseBuff: 2500.00, desc: "+250,000% Global Mult & +100% Luck"
  }
];

class RNGManager {
  constructor(game) {
    this.game = game;
    this.totalRolls = 0;
    this.counts = new Array(RNG_RARITIES.length).fill(0);
    this.equippedIndex = -1;

    this.isRolling = false;
    this.rollTimer = 0.0;
    this.rollDuration = 1.35;
    this.lastTickStep = -1;
    this.pendingResult = null;
    this.batchResults = [];
    this.autoRoll = false;
    this.fastRoll = false;
    this.cutsceneThreshold = 4;

    // Tempered Luck & Speed Upgrades
    this.upgrades = [
      { id: "ru1", name: "Four-Leaf Clover Syrup", curr: "beans", baseCost: 500, scale: 1.65, level: 0, max: 50, desc: "+10% RNG Luck per level" },
      { id: "ru2", name: "Turbo Steam Bearings", curr: "beans", baseCost: 2500, scale: 1.85, level: 0, max: 20, desc: "+8% Roll Animation Speed per level" },
      { id: "ru3", name: "Golden Dice Infuser", curr: "golden", baseCost: 5, scale: 1.60, level: 0, max: 25, desc: "x1.20 Compounding RNG Luck per level" },
      { id: "ru4", name: "Astral Quantum Dice", curr: "astral", baseCost: 3, scale: 2.25, level: 0, max: 5, desc: "+1 Simultaneous Roll per spin (Multi-Roll)" }
    ];

    this.cutsceneActive = false;
    this.cutsceneTier = null;
    this.cutsceneTime = 0.0;
    this.cutsceneDuration = 4.0;
    this.particles = [];
  }

  getUpgradeCost(u) {
    return Math.max(1, Math.floor(u.baseCost * Math.pow(u.scale, u.level)));
  }

  getRollCost() {
    return Math.max(10, Math.floor(this.game.bps * 0.5 + this.game.clickPower * 2.0));
  }

  getTotalLuck() {
    let luck = 1.0 + this.upgrades[0].level * 0.10; // Up to 6.0x
    luck *= Math.pow(1.20, Math.min(25, this.upgrades[2].level)); // Up to 95.4x
    if (this.counts[4] > 0) luck *= 1.15;
    if (this.counts[6] > 0) luck *= 1.35;
    if (this.counts[9] > 0) luck *= 2.00;
    luck *= 1.0 + this.game.talents[4].rank * 0.08;
    return luck;
  }

  getRollDuration() {
    let base = this.fastRoll ? 0.42 : 1.35;
    base /= 1.0 + this.upgrades[1].level * 0.08;
    if (this.counts[8] > 0) base *= 0.75;
    return Math.max(0.15, base);
  }

  getMultiRollCount() {
    return 1 + this.upgrades[3].level;
  }

  getTierMultiplier(idx) {
    const r = RNG_RARITIES[idx];
    const owned = this.counts[idx];
    if (owned <= 0) return 0.0;
    const dupBonus = 1.0 + Math.log10(owned) * 0.5 + Math.min(owned - 1, 50) * 0.05;
    const equipMult = this.equippedIndex === idx ? 2.0 : 1.0; // Equipping doubles that aura's buff
    return r.baseBuff * dupBonus * equipMult;
  }

  // Additive Compendium stacking so collecting all 10 tiers scales cleanly into the soft-cap
  getCombinedBuffs() {
    let globalBonus = 0.0;
    let clickBonus = 0.0;
    let bpsBonus = 0.0;
    for (let i = 0; i < RNG_RARITIES.length; i++) {
      if (this.counts[i] > 0) {
        const val = this.getTierMultiplier(i);
        const t = RNG_RARITIES[i].buffType;
        if (t === "global") globalBonus += val;
        else if (t === "click") clickBonus += val;
        else if (t === "bps") bpsBonus += val;
      }
    }
    return {
      globalMult: 1.0 + globalBonus,
      clickMult: 1.0 + clickBonus,
      bpsMult: 1.0 + bpsBonus
    };
  }

  pickRandomRarity() {
    const luck = this.getTotalLuck();
    for (let i = RNG_RARITIES.length - 1; i >= 1; i--) {
      const r = RNG_RARITIES[i];
      const chance = Math.min(0.45, luck / r.odds);
      if (Math.random() < chance) {
        return r;
      }
    }
    return RNG_RARITIES[0];
  }

  startRoll(isAuto = false) {
    if (this.isRolling || this.cutsceneActive) return;

    const cost = this.getRollCost();
    if (this.game.beans < cost) {
      if (!isAuto) {
        this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
      }
      return;
    }

    this.game.beans -= cost;
    this.isRolling = true;
    this.rollTimer = 0.0;
    this.rollDuration = this.getRollDuration();
    this.lastTickStep = -1;

    const rolls = this.getMultiRollCount();
    let best = RNG_RARITIES[0];
    this.batchResults = [];
    for (let c = 0; c < rolls; c++) {
      const picked = this.pickRandomRarity();
      this.batchResults.push(picked);
      if (picked.index > best.index) best = picked;
    }
    this.pendingResult = best;
  }

  completeRoll() {
    this.isRolling = false;
    this.rollTimer = 0.0;

    for (const res of this.batchResults) {
      this.totalRolls += 1;
      this.counts[res.index] += 1;
      if (this.equippedIndex < res.index) {
        this.equippedIndex = res.index;
      }
    }

    const r = this.pendingResult;
    this.setStageDisplay(r, false);
    this.game.addXp(15 * (r.index + 1));
    this.game.recalculateRates();

    if (r.index >= this.cutsceneThreshold) {
      this.triggerCutscene(r);
    } else if (r.index >= 2) {
      this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
    } else {
      this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.7);
    }
  }

  setStageDisplay(r, isRollingPreview = false) {
    const badge = document.getElementById("rng-current-tier-badge");
    const nameEl = document.getElementById("rng-current-aura-name");
    const oddsEl = document.getElementById("rng-current-odds");
    const buffEl = document.getElementById("rng-current-buff");
    const reelWin = document.getElementById("rng-reel-window");

    badge.className = `rng-tier-badge ${r.cssClass}`;
    badge.textContent = isRollingPreview ? `ROLLING... (${r.tierName})` : r.tierName;
    nameEl.textContent = r.auraName;
    nameEl.style.color = r.color;
    oddsEl.textContent = `1 in ${formatNum(r.odds, this.game.notationMode)}`;
    buffEl.textContent = r.desc;

    if (isRollingPreview) {
      reelWin.classList.remove("rolling-tick");
      void reelWin.offsetWidth;
      reelWin.classList.add("rolling-tick");
    }
  }

  playRarityFanfare(tierIndex) {
    if (!this.game.sfxEnabled) return;
    this.game.sfx._ensureContext();
    const ctx = this.game.sfx.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    const notesByTier = {
      4: [523.25, 659.25, 783.99, 1046.50],
      5: [220.0, 277.18, 329.63, 440.0, 659.25],
      6: [440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51],
      7: [146.83, 155.56, 220.0, 293.66, 440.0],
      8: [261.63, 392.0, 523.25, 783.99, 1046.5, 1567.98],
      9: [130.81, 261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5]
    };
    const notes = notesByTier[tierIndex] || notesByTier[4];
    const dur = tierIndex >= 8 ? 3.8 : 2.4;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tierIndex >= 7 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      const peak = (0.14 / Math.sqrt(notes.length)) * this.game.sfxVolume;
      gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(peak, now + idx * 0.09 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + dur + 0.05);
    });
  }

  triggerCutscene(r) {
    this.cutsceneActive = true;
    this.cutsceneTier = r;
    this.cutsceneTime = 0.0;
    this.cutsceneDuration = r.index >= 9 ? 5.5 : r.index >= 7 ? 4.2 : 3.0;

    const overlay = document.getElementById("rng-cutscene-overlay");
    const tierEl = document.getElementById("rng-cutscene-tier");
    const nameEl = document.getElementById("rng-cutscene-name");
    const oddsEl = document.getElementById("rng-cutscene-odds");

    tierEl.textContent = `★ ${r.tierName} ★`;
    tierEl.style.color = r.color;
    nameEl.textContent = r.auraName;
    nameEl.style.color = r.color;
    oddsEl.textContent = `1 in ${formatNum(r.odds, this.game.notationMode)}`;
    overlay.classList.remove("hidden");

    if (r.index >= 5) {
      const gc = document.getElementById("game-container");
      gc.classList.remove("screen-shake");
      void gc.offsetWidth;
      gc.classList.add("screen-shake");
    }

    this.particles = [];
    const count = 40 + r.index * 15;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 280;
      this.particles.push({
        x: 530,
        y: 340,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        hue: Math.random() * 360,
        char: String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))
      });
    }

    this.playRarityFanfare(r.index);
  }

  closeCutscene() {
    this.cutsceneActive = false;
    document.getElementById("rng-cutscene-overlay").classList.add("hidden");
  }

  drawCutscene(dt) {
    if (!this.cutsceneActive || !this.cutsceneTier) return;
    this.cutsceneTime += dt;
    if (this.cutsceneTime >= this.cutsceneDuration) {
      this.closeCutscene();
      return;
    }

    const canvas = document.getElementById("rng-cutscene-canvas");
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const t = this.cutsceneTime;
    const idx = this.cutsceneTier.index;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = idx >= 7 ? "rgba(5, 2, 12, 0.92)" : "rgba(18, 12, 10, 0.85)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (idx === 4) {
      ctx.translate(cx, cy);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6 + t * 0.05);
        ctx.fillStyle = "rgba(243, 156, 18, 0.12)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-35, -500);
        ctx.lineTo(35, -500);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        drawGoldenSparkle(ctx, p.x, p.y, p.size * 1.4, "#f1c40f");
      }
      return;
    }

    if (idx === 5) {
      for (let ring = 0; ring < 3; ring++) {
        const rad = ((t * 320 + ring * 120) % 550);
        ctx.strokeStyle = `rgba(231, 76, 60, ${Math.max(0, 1 - rad / 550)})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of this.particles) {
        p.x += p.vx * dt * 1.3;
        p.y += p.vy * dt * 1.3;
        drawStarlightShard(ctx, p.x, p.y, p.size * 1.3, "#ff4d4d");
      }
      ctx.restore();
      return;
    }

    if (idx === 6) {
      ctx.translate(cx, cy);
      for (let i = 0; i < 24; i++) {
        const hue = (i * 15 + t * 120) % 360;
        ctx.strokeStyle = `hsla(${hue}, 95%, 60%, 0.65)`;
        ctx.lineWidth = 3;
        ctx.save();
        ctx.rotate((i * Math.PI) / 12 + t * 0.8);
        ctx.strokeRect(-160, -160, 320, 320);
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (idx === 7) {
      for (const p of this.particles) {
        p.y += 140 * dt;
        if (p.y > H) p.y = 0;
        ctx.fillStyle = "rgba(194, 102, 255, 0.75)";
        ctx.font = "bold 16px monospace";
        ctx.fillText(p.char, p.x, p.y);
      }
      ctx.strokeStyle = "#b545ff";
      ctx.lineWidth = 8;
      ctx.shadowColor = "#b545ff";
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(cx + (Math.random() * 6 - 3), cy, 130 + Math.sin(t * 20) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (idx === 8) {
      ctx.strokeStyle = "rgba(0, 255, 204, 0.55)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + t * 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * 600, cy + Math.sin(ang) * 600);
        ctx.stroke();
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 90 + Math.sin(t * 8) * 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (idx >= 9) {
      const phase = t < 1.1 ? (1.1 - t) / 1.1 : (t - 1.1) * 1.8;
      ctx.translate(cx, cy);
      for (let ring = 1; ring <= 6; ring++) {
        const hue = (ring * 60 + t * 180) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.85)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const r = Math.max(8, phase * 95 * ring);
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let b = 0; b < 20; b++) {
        const a = (b / 20) * Math.PI * 2 - t * 1.2;
        const hue = (b * 18 + t * 200) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.25)`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.08) * 650, Math.sin(a - 0.08) * 650);
        ctx.lineTo(Math.cos(a + 0.08) * 650, Math.sin(a + 0.08) * 650);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  update(dt) {
    if (this.cutsceneActive) {
      this.drawCutscene(dt);
      return;
    }

    if (this.isRolling) {
      this.rollTimer += dt;
      const pct = Math.min(1.0, this.rollTimer / this.rollDuration);
      document.getElementById("rng-roll-bar").style.width = `${pct * 100}%`;

      const tickStep = Math.floor(Math.pow(pct, 0.65) * 11);
      if (tickStep !== this.lastTickStep && pct < 0.96) {
        this.lastTickStep = tickStep;
        const previewIdx = Math.floor(Math.random() * Math.min(RNG_RARITIES.length, 5 + Math.floor(pct * 5)));
        this.setStageDisplay(RNG_RARITIES[previewIdx], true);
        this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.35);
      }

      if (this.rollTimer >= this.rollDuration) {
        document.getElementById("rng-roll-bar").style.width = "0%";
        this.completeRoll();
      }
    } else if (this.autoRoll) {
      this.startRoll(true);
    }
  }

  buildDOM() {
    const upgContainer = document.getElementById("rng-upgrades-list");
    upgContainer.innerHTML = "";
    this.upgrades.forEach((u) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "54px";
      card.innerHTML = `
        <div class="card-accent accent-gold" id="acc-${u.id}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${u.name}</span>
            <span class="card-count" id="lvl-${u.id}">Lv. 0/${u.max}</span>
          </div>
          <div class="card-desc">${u.desc}</div>
        </div>
        <button class="btn btn-sm" id="btn-${u.id}" type="button">Buy</button>
      `;
      card.querySelector(`#btn-${u.id}`).addEventListener("click", () => {
        const cost = this.getUpgradeCost(u);
        const bal = this.game.getCurrencyBalance(u.curr);
        if (u.level < u.max && bal >= cost) {
          this.game.deductCurrency(u.curr, cost);
          u.level += 1;
          this.game.recalculateRates();
          this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
        } else {
          this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        }
      });
      upgContainer.appendChild(card);
    });

    const compContainer = document.getElementById("rng-compendium-list");
    compContainer.innerHTML = "";
    RNG_RARITIES.forEach((r) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `rng-comp-${r.index}`;
      card.innerHTML = `
        <div class="card-accent" style="background: ${r.color};"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title" id="rng-cname-${r.index}">??? (${r.tierName})</span>
            <span class="card-count" id="rng-ccount-${r.index}" style="color: ${r.color};">1 in ${formatNum(r.odds)}</span>
          </div>
          <div class="card-desc" id="rng-cdesc-${r.index}">${r.desc}</div>
        </div>
        <div class="sink-btn-group">
          <button class="btn btn-sm btn-secondary" id="rng-equip-${r.index}" type="button">Locked</button>
          ${r.index >= 4 ? `<button class="btn btn-sm btn-accent" id="rng-prev-${r.index}" type="button" title="Preview Cutscene">🎬</button>` : ""}
        </div>
      `;
      card.querySelector(`#rng-equip-${r.index}`).addEventListener("click", () => {
        if (this.counts[r.index] > 0) {
          this.equippedIndex = r.index;
          this.game.recalculateRates();
          this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume);
        }
      });
      const prevBtn = card.querySelector(`#rng-prev-${r.index}`);
      if (prevBtn) {
        prevBtn.addEventListener("click", () => this.triggerCutscene(r));
      }
      compContainer.appendChild(card);
    });

    document.getElementById("btn-rng-roll").addEventListener("click", () => this.startRoll(false));
    document.getElementById("btn-rng-auto").addEventListener("click", (e) => {
      this.autoRoll = !this.autoRoll;
      e.currentTarget.textContent = `Auto-Roll: ${this.autoRoll ? "ON" : "OFF"}`;
      e.currentTarget.classList.toggle("active", this.autoRoll);
    });
    document.getElementById("btn-rng-fast").addEventListener("click", (e) => {
      this.fastRoll = !this.fastRoll;
      e.currentTarget.textContent = `Fast Roll: ${this.fastRoll ? "ON" : "OFF"}`;
      e.currentTarget.classList.toggle("active", this.fastRoll);
    });
    document.getElementById("rng-cutscene-threshold").addEventListener("change", (e) => {
      this.cutsceneThreshold = parseInt(e.target.value, 10);
    });
    document.getElementById("btn-skip-cutscene").addEventListener("click", () => this.closeCutscene());
  }

  refreshDOM() {
    if (this.game.activeTab !== "rng") return;
    const nm = this.game.notationMode;
    const luck = this.getTotalLuck();
    const { globalMult } = this.getCombinedBuffs();
    const rollCost = this.getRollCost();

    document.getElementById("rng-stats-line").innerHTML =
      `Total Rolls: ${formatNum(this.totalRolls, nm)} &nbsp;|&nbsp; Luck: ${luck.toFixed(2)}x &nbsp;|&nbsp; RNG Mult: ${formatNum(globalMult, nm)}x`;

    const rollBtn = document.getElementById("btn-rng-roll");
    rollBtn.textContent = `ROLL AURA (${formatNum(rollCost, nm)} Beans) [R]`;
    rollBtn.disabled = this.isRolling || this.game.beans < rollCost;

    for (const u of this.upgrades) {
      const cost = this.getUpgradeCost(u);
      const bal = this.game.getCurrencyBalance(u.curr);
      const can = u.level < u.max && bal >= cost;
      document.getElementById(`lvl-${u.id}`).textContent = `Lv. ${u.level}/${u.max}`;
      const btn = document.getElementById(`btn-${u.id}`);
      btn.textContent = u.level >= u.max ? "MAX" : `${formatNum(cost, nm)} ${u.curr}`;
      btn.className = `btn btn-sm ${can ? "btn-gold" : "btn-disabled"}`;
      btn.disabled = !can;
    }

    for (const r of RNG_RARITIES) {
      const owned = this.counts[r.index];
      const unlocked = owned > 0;
      const isEq = this.equippedIndex === r.index;
      document.getElementById(`rng-cname-${r.index}`).textContent = unlocked
        ? `${r.auraName} [${r.tierName}]`
        : `??? [${r.tierName}]`;
      document.getElementById(`rng-ccount-${r.index}`).textContent = unlocked
        ? `Owned: ${formatNum(owned, nm)} (+${formatNum(this.getTierMultiplier(r.index) * 100, nm)}%)`
        : `1 in ${formatNum(r.odds, nm)}`;
      const eqBtn = document.getElementById(`rng-equip-${r.index}`);
      if (!unlocked) {
        eqBtn.textContent = "Locked";
        eqBtn.className = "btn btn-sm btn-disabled";
        eqBtn.disabled = true;
      } else if (isEq) {
        eqBtn.textContent = "EQUIPPED ★";
        eqBtn.className = "btn btn-sm btn-success";
        eqBtn.disabled = false;
      } else {
        eqBtn.textContent = "Equip (2x)";
        eqBtn.className = "btn btn-sm btn-secondary";
        eqBtn.disabled = false;
      }
    }
  }
}

// =============================================================================
// 8. MASTER GAME ENGINE
// =============================================================================

class GameState {
  constructor() {
    // Settings
    this.sfxEnabled = true;
    this.sfxVolume = 1.0;
    this.rainEnabled = true;
    this.particlesEnabled = true;
    this.notationMode = "suffix";
    this.buyMode = "1";
    this.wipeConfirmActive = false;

    // QoL Automation
    this.autoVent = false;
    this.autoServe = true;

    // Stabilizers
    this.siloLevel = 0;
    this.boilerTemp = 70.0;
    this.overheatLockout = false;
    this.overheatTimer = 0.0;
    this.boilerVents = 0;

    // Level & Progression
    this.level = 1;
    this.xp = 0.0;
    this.altarBlessings = 0;

    // 12 Currencies
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    this.lifetimeBeansAll = 0.0;
    this.goldenBeans = 0;
    this.lifetimeGolden = 0;
    this.astralCrystals = 0;
    this.lifetimeCrystals = 0;
    this.starlightShards = 0;
    this.customerStars = 0;

    this.darkMatter = 0;
    this.supernovaBeans = 0;
    this.chronosCrystals = 0;
    this.aetherEssence = 0;
    this.omegaSingularity = 0;
    this.celestialDew = 0;
    this.quasarNectar = 0;
    this.eternalBeans = 0;

    this.sanctuaryUnlocked = false;

    // Stats & Perk Timers
    this.manualClicks = 0;
    this.rebirthCount = 0;
    this.dynastyCount = 0;
    this.pantheonCount = 0;
    this.croissantsCaught = 0;
    this.ordersCompleted = 0;
    this.plinkoBallsDropped = 0;
    this.playTime = 0.0;
    this.lastAutoBuyTick = 0;
    this.dynastySynthTimer = 0.0;
    this.guildAutoBuyTimer = 0.0;
    this.chronosWarpTimer = 0.0;

    // Multipliers
    this.bps = 0.0;
    this.clickPower = 1.0;
    this.totalMultiplier = 1.0;
    this.frenzyTimer = 0.0;
    this.frenzyMult = 1.0;

    // Canvas Entities
    this.catCenter = { x: 85, y: 576 };
    this.catScaleX = 1.0;
    this.catScaleY = 1.0;
    this.purrBlissTimer = 0.0;
    this.purrCombo = 0;

    this.mugCenter = { x: 240, y: 371 };
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.latteStage = 0;

    this.activeTab = "menu";
    this.tabs = [
      "menu", "staff", "decor", "brew", "orders", "plinko", "talents", "rng",
      "sinks", "cosmos", "roast", "dynasty", "pantheon", "quests", "config"
    ];

    this.sfx = new PureSoundEngine();
    this.weather = new WeatherEngine(440, 632);
    this.plinko = new MultiCurrencyPlinko(545, 420);
    this.rng = new RNGManager(this);

    this.steamParticles = [];
    this.popups = [];
    this.steamTimer = 0.0;
    this.croissant = new GoldenCroissantEvent();

    this.activeOrder = null;
    this.orderTimer = 5.0;
    this.toastQueue = [];
    this.activeToast = null;
    this.toastTimer = 0.0;

    this.initCatalogs();
    this.loadGame();
    this.recalculateRates();
    this.buildStaticDOM();
    this.rng.buildDOM();
    this.bindEvents();
  }

  initCatalogs() {
    this.upgrades = [
      new RegularUpgrade("u01", "Cinnamon Dusting", 15, 0.4, 1, "+1 Click & +0.4 BPS (2x at 25/50/100...)"),
      new RegularUpgrade("u02", "Vanilla Bean Syrup", 60, 1.2, 2, "+2 Click & +1.2 BPS (2x at 25/50/100...)"),
      new RegularUpgrade("u03", "Stoneware Saucer", 180, 3.2, 3, "+3 Click & +3.2 BPS (2x at 25/50/100...)"),
      new RegularUpgrade("u04", "French Press Carafe", 550, 8.5, 5, "+5 Click & +8.5 BPS (2x at 25/50/100...)"),
      new RegularUpgrade("u05", "Barista Linen Apron", 1600, 22.0, 10, "+10 Click & +22 BPS (2x at 25/50/100...)"),
      new RegularUpgrade("u06", "Ceramic Pour-Over Cone", 4800, 58.0, 20, "+20 Click & +58 BPS (2x at 25/50/100...)"),
      new RegularUpgrade("u07", "Lo-Fi Vinyl Record Player", 14000, 150.0, 45, "+45 Click & +150 BPS"),
      new RegularUpgrade("u08", "Italian Espresso Machine", 42000, 380.0, 100, "+100 Click & +380 BPS"),
      new RegularUpgrade("u09", "Cold Brew Drip Tower", 125000, 960.0, 220, "+220 Click & +960 BPS"),
      new RegularUpgrade("u10", "Rainy Window Velvet Booth", 380000, 2400.0, 500, "+500 Click & +2.4K BPS"),
      new RegularUpgrade("u11", "Artisan Coffee Roaster", 1.1e6, 6200.0, 1.2e3, "+1.2K Click & +6.2K BPS"),
      new RegularUpgrade("u12", "Cat Barista Assistant", 3.2e6, 16e3, 2.8e3, "+2.8K Click & +16K BPS"),
      new RegularUpgrade("u13", "Fair-Trade Mountain Farm", 9.5e6, 42e3, 6.5e3, "+6.5K Click & +42K BPS"),
      new RegularUpgrade("u14", "Ceramic Potter's Wheel", 28e6, 110e3, 15e3, "+15K Click & +110K BPS"),
      new RegularUpgrade("u15", "Live Acoustic Jazz Trio", 85e6, 290e3, 35e3, "+35K Click & +290K BPS"),
      new RegularUpgrade("u16", "Steam-Powered Bean Grinder", 260e6, 780e3, 85e3, "+85K Click & +780K BPS"),
      new RegularUpgrade("u17", "Cardamom Chai Kettle", 780e6, 2.1e6, 200e3, "+200K Click & +2.1M BPS"),
      new RegularUpgrade("u18", "Late-Night Espresso Truck", 2.4e9, 5.6e6, 500e3, "+500K Click & +5.6M BPS"),
      new RegularUpgrade("u19", "Golden Glass Chemex", 7.2e9, 15e6, 1.2e6, "+1.2M Click & +15M BPS"),
      new RegularUpgrade("u20", "Cozy Brick Fireplace Hearth", 22e9, 42e6, 3.0e6, "+3.0M Click & +42M BPS"),
      new RegularUpgrade("u21", "Glass Greenhouse Rooftop", 68e9, 115e6, 7.5e6, "+7.5M Click & +115M BPS"),
      new RegularUpgrade("u22", "Hydroponic Arabica Grove", 210e9, 320e6, 18e6, "+18M Click & +320M BPS"),
      new RegularUpgrade("u23", "Alpine Microclimate Roastery", 650e9, 910e6, 45e6, "+45M Click & +910M BPS"),
      new RegularUpgrade("u24", "Rainy Attic Library Sanctuary", 2.0e12, 2.6e9, 120e6, "+120M Click & +2.6B BPS"),
      new RegularUpgrade("u25", "Alchemical Copper Alembic", 6.2e12, 7.5e9, 320e6, "+320M Click & +7.5B BPS"),
      new RegularUpgrade("u26", "Suborbital Bean Dehydrator", 19e12, 22e9, 850e6, "+850M Click & +22B BPS"),
      new RegularUpgrade("u27", "Pressurized Nitrogen Extractor", 60e12, 65e9, 2.2e9, "+2.2B Click & +65B BPS"),
      new RegularUpgrade("u28", "Northern Lights Terrace", 190e12, 195e9, 6.0e9, "+6.0B Click & +195B BPS"),
      new RegularUpgrade("u29", "Quantum Entangled Bean Mill", 600e12, 580e9, 16e9, "+16B Click & +580B BPS"),
      new RegularUpgrade("u30", "Infinite Cozy Espresso Dimension", 220e15, 165e12, 2.5e12, "+2.5T Click & +165T BPS")
    ];

    this.decor = [
      { uid: "dec1", name: "Fairy String Lights", cost: 450, desc: "+10% total BPS and gentle ceiling glow", buffType: "bps_mult", buffVal: 1.10, bought: false },
      { uid: "dec2", name: "Hanging Pothos Vine", cost: 3200, desc: "+15% click power with a lush window plant", buffType: "click_mult", buffVal: 1.15, bought: false },
      { uid: "dec3", name: "Brass Wind Chimes", cost: 22000, desc: "Golden Croissants spawn 20% more frequently", buffType: "croissant_rate", buffVal: 1.20, bought: false },
      { uid: "dec4", name: "Antique Oak Bookshelf", cost: 180000, desc: "Earn +25% beans from customer order tips", buffType: "tip_mult", buffVal: 1.25, bought: false },
      { uid: "dec5", name: "Velvet Fireside Armchair", cost: 1.5e6, desc: "+30% offline production rate", buffType: "offline_mult", buffVal: 1.30, bought: false },
      { uid: "dec6", name: "Starlight Crystal Terrarium", cost: 18e6, desc: "x1.50 to all production permanently", buffType: "total_mult", buffVal: 1.50, bought: false }
    ];

    this.staff = [
      { uid: "s01", name: "Mochi the Calico Cat", role: "Nap Mascot", baseCost: 150, desc: "Automatically pats the mug every second (+1 Auto-Sip/s per level)", level: 0 },
      { uid: "s02", name: "Pip the Sparrow", role: "Window Scout", baseCost: 1200, desc: "Catches lucky croissants flying past the window (15% chance/lvl)", level: 0 },
      { uid: "s03", name: "Clara the Senior Barista", role: "Floor Manager", baseCost: 8500, desc: "Automatically purchases the cheapest Cafe Menu upgrade every 3s", level: 0 },
      { uid: "s04", name: "Oliver the Night Owl", role: "Night Shift", baseCost: 45000, desc: "Provides +10% passive production while away per level", level: 0 },
      { uid: "s05", name: "Barnaby the Baker", role: "Pastry Chef", baseCost: 250000, desc: "Customer order tip payouts award +25% bonus beans per level", level: 0 }
    ];

    this.recipes = [
      { uid: "b01", name: "Classic Espresso", costBeans: 250, brewTime: 4.0, buffDesc: "+10% Click Power permanently", buffType: "click_mult", buffVal: 1.10, crafted: false, brewing: false, progress: 0 },
      { uid: "b02", name: "Cortado", costBeans: 1200, brewTime: 7.0, buffDesc: "+8% Passive BPS permanently", buffType: "bps_mult", buffVal: 1.08, crafted: false, brewing: false, progress: 0 },
      { uid: "b03", name: "Velvet Cappuccino", costBeans: 6000, brewTime: 12.0, buffDesc: "+5% cheaper Cafe Menu upgrades", buffType: "discount", buffVal: 0.95, crafted: false, brewing: false, progress: 0 },
      { uid: "b04", name: "Flat White", costBeans: 25000, brewTime: 18.0, buffDesc: "+15% Click Power permanently", buffType: "click_mult", buffVal: 1.15, crafted: false, brewing: false, progress: 0 },
      { uid: "b05", name: "Caramel Macchiato", costBeans: 120000, brewTime: 25.0, buffDesc: "+15% Passive BPS permanently", buffType: "bps_mult", buffVal: 1.15, crafted: false, brewing: false, progress: 0 },
      { uid: "b06", name: "Spiced Dark Mocha", costBeans: 500000, brewTime: 35.0, buffDesc: "+10% spawn rate for Croissants", buffType: "lucky_rate", buffVal: 1.10, crafted: false, brewing: false, progress: 0 },
      { uid: "b07", name: "Irish Cream Coffee", costBeans: 2.5e6, brewTime: 50.0, buffDesc: "+25% Click Power permanently", buffType: "click_mult", buffVal: 1.25, crafted: false, brewing: false, progress: 0 },
      { uid: "b08", name: "Nitro Cold Brew", costBeans: 12e6, brewTime: 75.0, buffDesc: "+25% Passive BPS permanently", buffType: "bps_mult", buffVal: 1.25, crafted: false, brewing: false, progress: 0 },
      { uid: "b09", name: "Gelato Affogato", costBeans: 65e6, brewTime: 100.0, buffDesc: "-8% cheaper Cafe Menu upgrades", buffType: "discount", buffVal: 0.92, crafted: false, brewing: false, progress: 0 },
      { uid: "b10", name: "Turkish Cardamom Brew", costBeans: 350e6, brewTime: 140.0, buffDesc: "+50% Click Power permanently", buffType: "click_mult", buffVal: 1.50, crafted: false, brewing: false, progress: 0 },
      { uid: "b11", name: "Aurora Borealis Latte", costBeans: 2.0e9, brewTime: 200.0, buffDesc: "+50% Passive BPS permanently", buffType: "bps_mult", buffVal: 1.50, crafted: false, brewing: false, progress: 0 },
      { uid: "b12", name: "Celestial Starlight Roast", costBeans: 15e9, brewTime: 300.0, buffDesc: "x2.0 to all production permanently", buffType: "total_mult", buffVal: 2.00, crafted: false, brewing: false, progress: 0 }
    ];

    this.talents = [
      { uid: "t01", name: "Latte Art Precision", desc: "+3% Critical Sip chance per rank (Base: 1%)", maxRank: 10, rank: 0 },
      { uid: "t02", name: "Rich Crema Strike", desc: "+1.5x Critical Sip bean multiplier per rank", maxRank: 10, rank: 0 },
      { uid: "t03", name: "Atmospheric Diffusion", desc: "+6% global passive BPS boost per rank", maxRank: 10, rank: 0 },
      { uid: "t04", name: "Customer Magnet", desc: "+15% Customer tips & faster customer order queue", maxRank: 10, rank: 0 },
      { uid: "t05", name: "Fortune Bean Shaker", desc: "+8% Croissant spawns, +8% RNG Luck & -3% Plinko bias", maxRank: 10, rank: 0 },
      { uid: "t06", name: "Cosmic Roasting Lineage", desc: "-5% Rebirth & Dynasty cost requirements", maxRank: 10, rank: 0 }
    ];

    this.milestones = [
      { targetLvl: 5, beans: 25000, golden: 5, crystals: 0, shards: 0, claimed: false },
      { targetLvl: 10, beans: 150000, golden: 20, crystals: 1, shards: 0, claimed: false },
      { targetLvl: 20, beans: 1000000, golden: 75, crystals: 5, shards: 0, claimed: false },
      { targetLvl: 35, beans: 10000000, golden: 250, crystals: 20, shards: 1, claimed: false },
      { targetLvl: 50, beans: 100000000, golden: 1000, crystals: 60, shards: 5, claimed: false },
      { targetLvl: 75, beans: 1000000000, golden: 5000, crystals: 200, shards: 15, claimed: false },
      { targetLvl: 100, beans: 10000000000, golden: 25000, crystals: 1000, shards: 50, claimed: false }
    ];

    this.sinks = [
      new EndlessMoneySink("snk1", "Overclocked Boiler", 5e6, 1.45, "beans", "+5% Global Multiplier per level", "total_mult", 0.05),
      new EndlessMoneySink("snk2", "Diamond Steam Tamp", 10e6, 1.50, "beans", "+10% Click Power Multiplier per level", "click_mult", 0.10),
      new EndlessMoneySink("snk3", "Golden Vault Reserve", 100, 1.35, "golden", "+15% Global Multiplier per level", "total_mult", 0.15),
      new EndlessMoneySink("snk4", "Astral Overdrive Core", 25, 1.40, "astral", "+25% Global Multiplier per level", "total_mult", 0.25)
    ];

    this.cosmicPerks = [
      new EndlessMoneySink("cos1", "Abyssal Matter Infuser", 1, 1.25, "dark_matter", "+100% Global Multiplier per DMR", "total_mult", 1.00),
      new EndlessMoneySink("cos2", "Supernova Click Corona", 1, 1.30, "supernova", "+5.0x Crit Sip Multiplier per SNB", "click_mult", 5.00),
      new EndlessMoneySink("cos3", "Chronos Warp Engine", 1, 1.35, "chronos", "+50% Global Mult & 1h BPS warp every 5m/lvl", "total_mult", 0.50),
      new EndlessMoneySink("cos4", "Aetherial Horizon", 1, 1.40, "aether", "+200% Global Multiplier per AE", "total_mult", 2.00),
      new EndlessMoneySink("cos5", "Omega Singularity Void", 1, 1.50, "omega", "+1,000% Global Production per OSB", "total_mult", 10.00)
    ];

    this.roasteryUpgrades = [
      { uid: "r01", name: "Master Roaster Certification", baseCost: 1, maxLvl: 15, desc: "+25% total BPS and Click Power per level", count: 0 },
      { uid: "r02", name: "Direct Sourcing Contracts", baseCost: 2, maxLvl: 10, desc: "-5% regular upgrade prices per level (max -50%)", count: 0 },
      { uid: "r03", name: "Heavy Stoneware Ceramic", baseCost: 3, maxLvl: 8, desc: "+15 permanent flat click power per level", count: 0 },
      { uid: "r04", name: "Self-Stirring Brass Spoons", baseCost: 4, maxLvl: 8, desc: "Converts 5% of click power directly into passive BPS", count: 0 },
      { uid: "r05", name: "Golden Aroma Resonance", baseCost: 5, maxLvl: 12, desc: "+2% multiplier per unspent Golden Bean held", count: 0 },
      { uid: "r06", name: "Raindrop Melodic Harmony", baseCost: 6, maxLvl: 10, desc: "+6% multiplier bonus per completed Rebirth", count: 0 },
      { uid: "r07", name: "Caramelized Crema Infusion", baseCost: 8, maxLvl: 8, desc: "x1.40 click power multiplier per level", count: 0 },
      { uid: "r08", name: "Perpetual Steam Generator", baseCost: 12, maxLvl: 6, desc: "Passively generates +0.06% of current bean balance/sec", count: 0 }
    ];

    this.dynastyPerks = [
      { uid: "d01", name: "Planetary Franchise License", cost: 1, maxLvl: 10, desc: "+100% total production multiplier per level", count: 0 },
      { uid: "d02", name: "Astral Bean Synthesis", cost: 2, maxLvl: 8, desc: "Generates +1 free Golden Bean/lvl every 60 seconds", count: 0 },
      { uid: "d03", name: "Infinite Crema Horizon", cost: 3, maxLvl: 5, desc: "Clicks have a 5%/lvl chance to award 10s of full BPS", count: 0 },
      { uid: "d04", name: "Cosmic Logistics Grid", cost: 4, maxLvl: 5, desc: "Reduces upgrade cost scaling exponent (halved at Lv. 5)", count: 0 },
      { uid: "d05", name: "Celestial Barista Guild", cost: 6, maxLvl: 5, desc: "Auto-buys cheapest upgrade every 2s (faster per level)", count: 0 },
      { uid: "d06", name: "The Eternal Rainy Cafe", cost: 25, maxLvl: 1, desc: "Permanently grants a x5.0 transcendent multiplier", count: 0 }
    ];

    this.pantheonPerks = [
      { uid: "p01", name: "Constellation of Perpetual Warmth", cost: 1, maxLvl: 5, desc: "x3.0 total global multiplier per level", count: 0 },
      { uid: "p02", name: "Infinite Croissant Galaxy", cost: 2, maxLvl: 5, desc: "+15s Croissant Frenzy per level (Permanent at Lv. 5)", count: 0 },
      { uid: "p03", name: "Starlight Instant Brewing", cost: 3, maxLvl: 3, desc: "Brew Lab craft times reduced by 50% per level", count: 0 },
      { uid: "p04", name: "Cosmic Harmony Singularity", cost: 5, maxLvl: 1, desc: "Golden Beans and Astral Crystals multiply each other", count: 0 }
    ];

    this.quests = [
      { qid: "q01", title: "Sip the Morning Roast", desc: "Manually click the coffee mug 150 times.", targetVal: 150, rewardBeans: 25000, rewardStars: 2, currentVal: 0, completed: false },
      { qid: "q02", title: "Pamper Mochi", desc: "Pet the sleeping window cat 15 times.", targetVal: 15, rewardBeans: 50000, rewardStars: 3, currentVal: 0, completed: false },
      { qid: "q03", title: "Order Fulfillment", desc: "Serve 5 customer orders at the counter.", targetVal: 5, rewardBeans: 120000, rewardStars: 5, currentVal: 0, completed: false },
      { qid: "q04", title: "Bean Slinger", desc: "Drop 10 balls through Plinko.", targetVal: 10, rewardBeans: 80000, rewardStars: 3, currentVal: 0, completed: false },
      { qid: "q05", title: "Brew Master", desc: "Complete 2 recipes in the Brew Lab.", targetVal: 2, rewardBeans: 200000, rewardStars: 6, currentVal: 0, completed: false },
      { qid: "q06", title: "Steam Operator", desc: "Vent the espresso boiler 3 times.", targetVal: 3, rewardBeans: 150000, rewardStars: 4, currentVal: 0, completed: false }
    ];

    this.achievements = [
      { aid: "a01", title: "First Sip", desc: "Click coffee mug 1 time.", check: (s) => s.manualClicks >= 1, unlocked: false },
      { aid: "a02", title: "Warm Routine", desc: "Click coffee mug 1,000 times.", check: (s) => s.manualClicks >= 1000, unlocked: false },
      { aid: "a03", title: "Aromatic Stash", desc: "Accumulate 100,000 beans.", check: (s) => s.beans >= 100000, unlocked: false },
      { aid: "a04", title: "Millionaire Barista", desc: "Accumulate 1,000,000 beans.", check: (s) => s.beans >= 1000000, unlocked: false },
      { aid: "a05", title: "Golden Awakening", desc: "Perform your first Rebirth.", check: (s) => s.rebirthCount >= 1, unlocked: false },
      { aid: "a06", title: "Franchise Founder", desc: "Ascend to Dynasty Prestige.", check: (s) => s.dynastyCount >= 1, unlocked: false },
      { aid: "a07", title: "Cosmic Ascendant", desc: "Reach Pantheon Ascension.", check: (s) => s.pantheonCount >= 1, unlocked: false },
      { aid: "a08", title: "Dark Matter Brew", desc: "Forge your first Dark Matter Roast.", check: (s) => s.darkMatter >= 1, unlocked: false },
      { aid: "a09", title: "Supernova Shock", desc: "Forge your first Supernova Bean.", check: (s) => s.supernovaBeans >= 1, unlocked: false },
      { aid: "a10", title: "Chronos Master", desc: "Forge your first Chronos Crystal.", check: (s) => s.chronosCrystals >= 1, unlocked: false },
      { aid: "a11", title: "Aetherial Sovereign", desc: "Forge your first Aetherial Essence.", check: (s) => s.aetherEssence >= 1, unlocked: false },
      { aid: "a12", title: "Omega Deity", desc: "Forge the Omega Singularity.", check: (s) => s.omegaSingularity >= 1, unlocked: false },
      { aid: "a13", title: "Cat Whisperer", desc: "Reach 5x Purr Bliss combo on Mochi.", check: (s) => s.purrCombo >= 5, unlocked: false },
      { aid: "a14", title: "Croissant Snatcher", desc: "Catch 10 lucky croissants.", check: (s) => s.croissantsCaught >= 10, unlocked: false },
      { aid: "a15", title: "Plinko Enthusiast", desc: "Drop 25 balls in Plinko.", check: (s) => s.plinkoBallsDropped >= 25, unlocked: false },
      { aid: "a16", title: "Level 10 Barista", desc: "Reach Barista Level 10.", check: (s) => s.level >= 10, unlocked: false },
      { aid: "a17", title: "Level 50 Roaster", desc: "Reach Barista Level 50.", check: (s) => s.level >= 50, unlocked: false },
      { aid: "a18", title: "Century Brewer", desc: "Reach Barista Level 100.", check: (s) => s.level >= 100, unlocked: false },
      { aid: "a19", title: "Decor Stylist", desc: "Place all 6 Cafe Decor pieces.", check: (s) => s.decor.every((d) => d.bought), unlocked: false },
      { aid: "a20", title: "Staff Manager", desc: "Level all 5 Staff members to Lv. 5+.", check: (s) => s.staff.every((st) => st.level >= 5), unlocked: false },
      { aid: "a21", title: "Order Specialist", desc: "Complete 25 customer orders.", check: (s) => s.ordersCompleted >= 25, unlocked: false },
      { aid: "a22", title: "Master Sommelier", desc: "Craft all 12 coffee recipes.", check: (s) => s.recipes.every((r) => r.crafted), unlocked: false },
      { aid: "a23", title: "Silo Architect", desc: "Reach Silo Storage Level 5.", check: (s) => s.siloLevel >= 5, unlocked: false },
      { aid: "a24", title: "Steam Master", desc: "Vent the espresso boiler 10 times.", check: (s) => s.boilerVents >= 10, unlocked: false },
      { aid: "a25", title: "Sanctuary Guardian", desc: "Awaken the Omniversal Rainy Haven.", check: (s) => s.sanctuaryUnlocked, unlocked: false }
    ];
  }

  // --- Economy & Multiplier Calculations ---
  renderMultiplierBreakdown() {
    const pop = document.getElementById("multiplier-popover");
    if (!pop || pop.classList.contains("hidden") || !this.multBreakdown) return;

    const nm = this.notationMode;
    const b = this.multBreakdown;
    const body = document.getElementById("mult-pop-body");

    const row = (label, valStr, color = "var(--color-text)") => `
      <div class="mult-row">
        <span class="mult-row-label">${label}</span>
        <span class="mult-row-val" style="color: ${color};">${valStr}</span>
      </div>
    `;

    let softCapHtml = "";
    if (b.isSoftCapped) {
      const retentionPct = (b.finalMult / b.rawMult) * 100;
      const pctStr = retentionPct >= 0.01 ? `${retentionPct.toFixed(2)}%` : `${retentionPct.toExponential(2)}%`;
      softCapHtml = `
        <div class="mult-softcap-box mult-softcap-active">
          <strong style="color: var(--color-danger);">Soft-Cap Active (Above ${formatNum(b.softCapStart, nm)}x)</strong><br/>
          Raw Total: <strong>${formatNum(b.rawMult, nm)}x</strong> &rarr; Compressed: <strong>${formatNum(b.finalMult, nm)}x</strong><br/>
          Formula: <code>Cap × (Raw / Cap)^0.65</code> (${pctStr} retained)
        </div>
      `;
    } else {
      softCapHtml = `
        <div class="mult-softcap-box">
          <strong style="color: var(--color-success);">Soft-Cap Inactive (100% Efficiency)</strong><br/>
          Compression begins above <strong>${formatNum(b.softCapStart, nm)}x</strong>
        </div>
      `;
    }

    body.innerHTML = `
      <div class="mult-section-label">Prestige &amp; Ascension</div>
      ${row("Rebirth, Golden & Roastery", `${formatNum(b.rebirthAndGolden, nm)}x`, "var(--color-gold)")}
      ${row("Dynasty & Pantheon Tiers", `${formatNum(b.dynastyAndPantheon, nm)}x`, "var(--color-pantheon)")}
      ${row("Total Prestige Multiplier", `${formatNum(b.prestigeTotal, nm)}x`, "var(--color-astral)")}

      <div class="mult-section-label">Cosmic &amp; Transcendent</div>
      ${row("Cosmic Currencies & Sanctuary", `${formatNum(b.cosmicCurrencyMult, nm)}x`, "var(--color-omega)")}
      ${row("God-Tier Cosmic Perks", `${formatNum(b.cosmicPerksMult, nm)}x`, "var(--color-aether)")}
      ${row("Total Cosmic Multiplier", `${formatNum(b.cosmicTotal, nm)}x`, "var(--color-omega)")}

      <div class="mult-section-label">RNG Compendium &amp; Cafe</div>
      ${row("RNG Global Aura Mult", `${formatNum(b.rngGlobal, nm)}x`, "var(--color-supernova)")}
      ${row("RNG Dedicated BPS / Click", `${formatNum(b.rngBps, nm)}x / ${formatNum(b.rngClick, nm)}x`, "var(--color-text-light)")}
      ${row("Cafe Level, Stars, Decor & Sinks", `${formatNum(b.cafePermanent, nm)}x`, "var(--color-accent)")}
      ${row("Boiler Temp, Frenzy & Mochi Purr", `${formatNum(b.activeTempAndEvents, nm)}x`, "var(--color-success)")}

      <div class="mult-divider"></div>
      <div class="mult-row mult-row-total">
        <span class="mult-row-label">Effective Global Multiplier</span>
        <span class="mult-row-val" style="color: var(--color-gold);">${formatNum(b.finalMult, nm)}x</span>
      </div>
      ${softCapHtml}
    `;
  }
  getMaxStorage() { return 50000.0 * Math.pow(4.5, this.siloLevel); }
  getSiloUpgradeCost() { return 12000.0 * Math.pow(4.0, this.siloLevel); }
  getStaffCost(st) { return Math.max(10.0, st.baseCost * Math.pow(1.30, st.level)); }
  getRoasteryCost(upg) { return Math.max(1, Math.floor(upg.baseCost * Math.pow(1.40, upg.count) * Math.pow(1.15, this.rebirthCount))); }

  // Dynasty d04: Halves the 0.22 upgrade scaling exponent at Lv. 5 (1.22 -> 1.11)
  getUpgradeExponent() {
    const d04Count = this.dynastyPerks ? this.dynastyPerks[3].count : 0;
    return 1.0 + 0.22 * (1.0 - 0.10 * d04Count);
  }

  getTemperatureMultiplier() {
    if (this.overheatLockout) return 0.20;
    if (this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0) return 1.50;
    return 1.0;
  }

  getXpNeeded(lvl) {
    return Math.floor(100 * Math.pow(1.28, lvl - 1) + 50 * lvl);
  }

  getBaristaTitle(lvl) {
    if (this.sanctuaryUnlocked) return "Omniversal Coffee Deity";
    if (lvl < 5) return "Amateur Sipper";
    if (lvl < 10) return "Cafe Regular";
    if (lvl < 20) return "Junior Barista";
    if (lvl < 35) return "Artisan Brewer";
    if (lvl < 50) return "Head Roaster";
    if (lvl < 75) return "Cafe Proprietor";
    if (lvl < 100) return "Coffee Maestro";
    return "Cosmic Roaster";
  }

  getAvailableTalentPoints() {
    const total = Math.max(0, this.level - 1);
    const spent = this.talents.reduce((acc, t) => acc + t.rank, 0);
    return Math.max(0, total - spent);
  }

  getCritStats() {
    const rngCritBonus = this.rng && this.rng.counts[7] > 0 ? 1.0 : 0.0;
    const chance = Math.min(0.60, 0.01 + this.level * 0.001 + this.talents[0].rank * 0.03);
    const mult = 3.0 + this.talents[1].rank * 1.5 + this.cosmicPerks[1].level * 5.0 + rngCritBonus;
    return { chance, mult };
  }

  getDiscountFactor() {
    let d = Math.max(0.50, 1.0 - this.roasteryUpgrades[1].count * 0.05);
    for (const r of this.recipes) {
      if (r.crafted && r.buffType === "discount") d *= r.buffVal;
    }
    return Math.max(0.20, d);
  }

  getCurrencyBalance(cType) {
    const map = {
      beans: this.beans, golden: this.goldenBeans, astral: this.astralCrystals,
      shards: this.starlightShards, dark_matter: this.darkMatter,
      supernova: this.supernovaBeans, chronos: this.chronosCrystals,
      aether: this.aetherEssence, omega: this.omegaSingularity,
      dew: this.celestialDew, quasar: this.quasarNectar, eternal: this.eternalBeans
    };
    return map[cType] ?? this.beans;
  }

  addCurrency(cType, amount) {
    const amt = Math.max(1, Math.floor(amount));
    if (cType === "beans") {
      this.beans = Math.min(this.getMaxStorage(), this.beans + amount);
      this.lifetimeBeansAll += amount;
    } else if (cType === "golden") { this.goldenBeans += amt; this.lifetimeGolden += amt; }
    else if (cType === "astral") { this.astralCrystals += amt; this.lifetimeCrystals += amt; }
    else if (cType === "shards") { this.starlightShards += amt; }
    else if (cType === "dark_matter") { this.darkMatter += amt; }
    else if (cType === "supernova") { this.supernovaBeans += amt; }
    else if (cType === "chronos") { this.chronosCrystals += amt; }
    else if (cType === "aether") { this.aetherEssence += amt; }
    else if (cType === "omega") { this.omegaSingularity += amt; }
    else if (cType === "dew") { this.celestialDew += amt; }
    else if (cType === "quasar") { this.quasarNectar += amt; }
    else if (cType === "eternal") { this.eternalBeans += amt; }
    this.recalculateRates();
  }

  deductCurrency(cType, amount) {
    const amt = Math.floor(amount);
    if (cType === "beans") this.beans -= amount;
    else if (cType === "golden") this.goldenBeans -= amt;
    else if (cType === "astral") this.astralCrystals -= amt;
    else if (cType === "shards") this.starlightShards -= amt;
    else if (cType === "dark_matter") this.darkMatter -= amt;
    else if (cType === "supernova") this.supernovaBeans -= amt;
    else if (cType === "chronos") this.chronosCrystals -= amt;
    else if (cType === "aether") this.aetherEssence -= amt;
    else if (cType === "omega") this.omegaSingularity -= amt;
    else if (cType === "dew") this.celestialDew -= amt;
    else if (cType === "quasar") this.quasarNectar -= amt;
    else if (cType === "eternal") this.eternalBeans -= amt;
    this.recalculateRates();
  }

  getRebirthThreshold() {
    const base = Math.max(25000.0, 25000.0 * Math.pow(2.5, this.rebirthCount));
    const discount = Math.pow(0.95, this.talents[5].rank);
    return Math.max(10000.0, base * discount);
  }

  getPendingGoldenBeans() {
    const th = this.getRebirthThreshold();
    if (this.lifetimeBeansRun < th) return 0;
    return Math.floor(Math.sqrt(this.lifetimeBeansRun / th));
  }

  getDynastyThreshold() {
    const base = Math.max(50, Math.floor(100.0 * Math.pow(2.0, this.dynastyCount)));
    const discount = Math.pow(0.95, this.talents[5].rank);
    return Math.max(25, Math.floor(base * discount));
  }

  getPendingAstralCrystals() {
    const th = this.getDynastyThreshold();
    if (this.lifetimeGolden < th) return 0;
    return Math.max(1, Math.floor(Math.sqrt(this.lifetimeGolden / th)));
  }

  getPantheonThreshold() {
    return Math.max(25, Math.floor(50.0 * Math.pow(2.5, this.pantheonCount)));
  }

  getPendingStarlightShards() {
    const th = this.getPantheonThreshold();
    if (this.lifetimeCrystals < th) return 0;
    return Math.max(1, Math.floor(Math.sqrt(this.lifetimeCrystals / th)));
  }

  addXp(amount) {
    this.xp += amount;
    let leveled = false;
    while (true) {
      const needed = this.getXpNeeded(this.level);
      if (this.xp >= needed) {
        this.xp -= needed;
        this.level += 1;
        leveled = true;
      } else {
        break;
      }
    }
    if (leveled) {
      this.recalculateRates();
      this.sfx.playLevelup(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`LEVEL UP! Lv. ${this.level} (+1 Skill Point)`, 240, 220, COLORS.gold));
    }
  }

  recalculateRates() {
    let baseBps = 0.0;
    let baseClicks = 1.0;

    for (const upg of this.upgrades) {
      const mMult = upg.getMilestoneMult();
      baseBps += upg.count * upg.bps * mMult;
      baseClicks += upg.count * upg.clickBoost * mMult;
    }

    baseClicks += this.roasteryUpgrades[2].count * 15.0;
    baseBps += this.roasteryUpgrades[3].count * 0.05 * baseClicks;

    // 1. Prestige Tiers (Rebirth, Golden, Roastery, Dynasty, Pantheon)
    const rMult = 1.0 + this.rebirthCount * (0.10 + this.roasteryUpgrades[5].count * 0.06);
    const gMult = 1.0 + this.goldenBeans * (0.05 + this.roasteryUpgrades[4].count * 0.02);
    const mMult = 1.0 + this.roasteryUpgrades[0].count * 0.25;
    const dMult = 1.0 + this.dynastyPerks[0].count * 1.0;
    const d06Mult = this.dynastyPerks[5].count > 0 ? 5.0 : 1.0;
    const pMult = Math.pow(3.0, this.pantheonPerks[0].count);
    const harmonyMult = this.pantheonPerks[3].count > 0
      ? 1.0 + this.goldenBeans * this.astralCrystals * 0.01
      : 1.0;
    const prestigeTotal = rMult * gMult * mMult * dMult * d06Mult * pMult * harmonyMult;

    // 2. Cafe, Staff, Crucible Sinks & Active Buffs
    const starMult = 1.0 + this.customerStars * 0.02;
    const frenzy = this.frenzyTimer > 0 ? this.frenzyMult : 1.0;
    const catBliss = this.purrBlissTimer > 0 ? 1.0 + this.purrCombo * 0.10 : 1.0;
    const tempMult = this.getTemperatureMultiplier();
    const levelMult = 1.0 + (this.level - 1) * 0.03;
    const talentBpsMult = 1.0 + this.talents[2].rank * 0.06;
    const altarMult = 1.0 + this.altarBlessings * 0.02;

    let crucibleMult = 1.0;
    let sinkClickMult = 1.0;
    for (const snk of this.sinks) {
      if (snk.buffType === "total_mult") crucibleMult *= 1.0 + snk.level * snk.buffPerLvl;
      else if (snk.buffType === "click_mult") sinkClickMult *= 1.0 + snk.level * snk.buffPerLvl;
    }

    let decorBps = 1.0, decorClick = 1.0, decorTot = 1.0;
    for (const dec of this.decor) {
      if (dec.bought) {
        if (dec.buffType === "bps_mult") decorBps *= dec.buffVal;
        else if (dec.buffType === "click_mult") decorClick *= dec.buffVal;
        else if (dec.buffType === "total_mult") decorTot *= dec.buffVal;
      }
    }
    const cafeActiveTotal = starMult * frenzy * catBliss * tempMult * levelMult * altarMult * crucibleMult * decorTot;

    // 3. Cosmic & Transcendent Currencies + God-Tier Perks
    let cosmicCurrencyMult =
      (1.0 + this.darkMatter * 1.0) *
      (1.0 + this.supernovaBeans * 2.5) *
      (1.0 + this.chronosCrystals * 6.0) *
      (1.0 + this.aetherEssence * 15.0) *
      (1.0 + this.omegaSingularity * 75.0) *
      (1.0 + this.celestialDew * 250.0) *
      (1.0 + this.quasarNectar * 1000.0) *
      (1.0 + this.eternalBeans * 5000.0);

    if (this.sanctuaryUnlocked) cosmicCurrencyMult *= 25.0;

    let cosmicPerksMult = 1.0;
    for (const cp of this.cosmicPerks) {
      if (cp.buffType === "total_mult") cosmicPerksMult *= 1.0 + cp.level * cp.buffPerLvl;
      else if (cp.buffType === "click_mult") sinkClickMult *= 1.0 + cp.level * cp.buffPerLvl;
    }
    const cosmicTotal = cosmicCurrencyMult * cosmicPerksMult;

    // 4. RNG Compendium & Equipped Aura
    let rngGlobal = 1.0, rngClick = 1.0, rngBps = 1.0;
    if (this.rng) {
      const buffs = this.rng.getCombinedBuffs();
      rngGlobal = buffs.globalMult;
      rngClick = buffs.clickMult;
      rngBps = buffs.bpsMult;
      if (this.rng.counts[5] > 0) rngClick *= 1.50;
    }

    // 5. Raw Total & Soft-Cap Compression
    const rawMult = prestigeTotal * cafeActiveTotal * cosmicTotal * rngGlobal;
    const softCapStart = this.sanctuaryUnlocked ? 1e22 : 1e18;
    const isSoftCapped = rawMult > softCapStart;

    if (isSoftCapped) {
      this.totalMultiplier = softCapStart * Math.pow(rawMult / softCapStart, 0.65);
    } else {
      this.totalMultiplier = rawMult;
    }

    // Store snapshot for the HUD Multiplier Breakdown popover
    this.multBreakdown = {
      rebirthAndGolden: rMult * gMult * mMult,
      dynastyAndPantheon: dMult * d06Mult * pMult * harmonyMult,
      prestigeTotal,
      cafePermanent: levelMult * starMult * altarMult * decorTot * crucibleMult,
      activeTempAndEvents: tempMult * frenzy * catBliss,
      cosmicCurrencyMult,
      cosmicPerksMult,
      cosmicTotal,
      rngGlobal,
      rngBps,
      rngClick,
      rawMult,
      softCapStart,
      isSoftCapped,
      finalMult: this.totalMultiplier
    };

    let rBps = 1.0, rClick = 1.0;
    for (const r of this.recipes) {
      if (r.crafted) {
        if (r.buffType === "bps_mult") rBps *= r.buffVal;
        else if (r.buffType === "click_mult") rClick *= r.buffVal;
      }
    }

    this.bps = baseBps * this.totalMultiplier * rBps * decorBps * talentBpsMult * rngBps;
    this.clickPower =
      baseClicks * this.totalMultiplier * rClick * decorClick *
      sinkClickMult * rngClick * Math.pow(1.40, this.roasteryUpgrades[6].count);

    if (this.lifetimeBeansAll >= 1e15) this.latteStage = 5;
    else if (this.lifetimeBeansAll >= 1e11) this.latteStage = 4;
    else if (this.lifetimeBeansAll >= 1e8) this.latteStage = 3;
    else if (this.lifetimeBeansAll >= 1e5) this.latteStage = 2;
    else if (this.lifetimeBeansAll >= 1e3) this.latteStage = 1;
    else this.latteStage = 0;
  }

  // --- Gameplay Actions ---

  triggerCroissantFrenzy(popupX = 240, popupY = 255, label = "CAFFEINE FRENZY! (7x)") {
    const p02Count = this.pantheonPerks[1].count;
    this.frenzyMult = 7.0;
    this.frenzyTimer = p02Count >= 5 ? 999999.0 : 20.0 + p02Count * 15.0;
    this.addXp(150);
    this.recalculateRates();
    this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(label, popupX, popupY, COLORS.gold));
  }

  upgradeSilo() {
    const cost = this.getSiloUpgradeCost();
    if (this.beans >= cost) {
      this.beans -= cost;
      this.siloLevel += 1;
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`Silo Upgraded! (Cap: ${formatNum(this.getMaxStorage(), this.notationMode)})`, 240, 215, COLORS.success));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  ventBoiler() {
    this.boilerTemp = Math.max(70.0, this.boilerTemp - 25.0);
    this.overheatLockout = false;
    this.boilerVents += 1;
    this.quests[5].currentVal += 1;
    this.recalculateRates();
    this.sfx.playVent(this.sfxEnabled, this.sfxVolume);
    for (let i = 0; i < 8; i++) {
      this.steamParticles.push(new SteamPuff(this.mugCenter.x, this.mugCenter.y - 80));
    }
    this.popups.push(new FloatingPopup("Steam Vented!", 240, 295, COLORS.heatCold));
  }

  serveCurrentOrder() {
    if (!this.activeOrder) return false;
    const rec = this.recipes.find((r) => r.name === this.activeOrder.recipeName);
    if (rec && rec.crafted) {
      let payout = Math.max(500.0, this.bps * 40.0 * this.activeOrder.rewardMult);
      const tipDecor = this.decor[3].bought ? this.decor[3].buffVal : 1.0;
      const talentTip = 1.0 + this.talents[3].rank * 0.15;
      payout *= (1.0 + this.staff[4].level * 0.25) * tipDecor * talentTip;

      this.beans = Math.min(this.getMaxStorage(), this.beans + payout);
      this.lifetimeBeansRun += payout;
      this.lifetimeBeansAll += payout;
      this.customerStars += 1;
      this.ordersCompleted += 1;
      this.quests[2].currentVal += 1;
      this.activeOrder = null;
      this.orderTimer = Math.max(2.5, 8.0 - this.talents[3].rank * 0.4);
      this.addXp(350);
      this.recalculateRates();
      this.sfx.playOrder(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`+${formatNum(payout, this.notationMode)} Tip!`, 240, 255, COLORS.star));
      return true;
    }
    return false;
  }

  buyMaxAllUpgrades() {
    const disc = this.getDiscountFactor();
    const exp = this.getUpgradeExponent();
    let purchased = false;
    const sorted = [...this.upgrades].sort((a, b) => a.getCostSingle(disc, exp) - b.getCostSingle(disc, exp));
    for (const upg of sorted) {
      const { qty, cost } = upg.getBulkInfo("max", this.beans, disc, exp);
      if (this.beans >= cost) {
        this.beans -= cost;
        upg.count += qty;
        purchased = true;
      }
    }
    if (purchased) {
      this.recalculateRates();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("ALL AFFORDABLE BOUGHT!", 240, 215, COLORS.success));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  buyMaxAllStaff() {
    let boughtAny = false;
    let changed = true;
    while (changed) {
      changed = false;
      const avail = this.staff.filter((s) => this.beans >= this.getStaffCost(s));
      if (avail.length > 0) {
        avail.sort((a, b) => this.getStaffCost(a) - this.getStaffCost(b));
        const cheapest = avail[0];
        const cost = this.getStaffCost(cheapest);
        if (this.beans >= cost) {
          this.beans -= cost;
          cheapest.level += 1;
          boughtAny = true;
          changed = true;
        }
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("STAFF MAXED!", 240, 215, COLORS.star));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  buyMaxAllRoastery() {
    let boughtAny = false;
    let changed = true;
    while (changed) {
      changed = false;
      const avail = this.roasteryUpgrades.filter((u) => u.count < u.maxLvl && this.goldenBeans >= this.getRoasteryCost(u));
      if (avail.length > 0) {
        avail.sort((a, b) => this.getRoasteryCost(a) - this.getRoasteryCost(b));
        const cheapest = avail[0];
        const cost = this.getRoasteryCost(cheapest);
        if (this.goldenBeans >= cost) {
          this.goldenBeans -= cost;
          cheapest.count += 1;
          boughtAny = true;
          changed = true;
        }
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("ROASTERY UPGRADES MAXED!", 240, 215, COLORS.gold));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  buyMaxAllDynasty() {
    let boughtAny = false;
    let changed = true;
    while (changed) {
      changed = false;
      const avail = this.dynastyPerks.filter((p) => p.count < p.maxLvl && this.astralCrystals >= p.cost);
      if (avail.length > 0) {
        avail.sort((a, b) => a.cost - b.cost);
        const cheapest = avail[0];
        this.astralCrystals -= cheapest.cost;
        cheapest.count += 1;
        boughtAny = true;
        changed = true;
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("CRYSTAL PERKS MAXED!", 240, 215, COLORS.astral));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  buyMaxAllPantheon() {
    let boughtAny = false;
    let changed = true;
    while (changed) {
      changed = false;
      const avail = this.pantheonPerks.filter((p) => p.count < p.maxLvl && this.starlightShards >= p.cost);
      if (avail.length > 0) {
        avail.sort((a, b) => a.cost - b.cost);
        const cheapest = avail[0];
        this.starlightShards -= cheapest.cost;
        cheapest.count += 1;
        boughtAny = true;
        changed = true;
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("PANTHEON PERKS MAXED!", 240, 215, COLORS.pantheon));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  triggerRebirth() {
    const earned = this.getPendingGoldenBeans();
    if (earned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    this.goldenBeans += earned;
    this.lifetimeGolden += earned;
    this.rebirthCount += 1;
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    for (const u of this.upgrades) u.count = 0;
    this.addXp(500 * this.rebirthCount);
    this.recalculateRates();
    this.sfx.playRebirth(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${earned} GOLDEN BEANS!`, 240, 235, COLORS.gold));
  }

  triggerDynasty() {
    const earned = this.getPendingAstralCrystals();
    if (earned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    this.astralCrystals += earned;
    this.lifetimeCrystals += earned;
    this.dynastyCount += 1;
    this.beans = 0.0;
    this.goldenBeans = 0;
    this.lifetimeBeansRun = 0.0;
    this.rebirthCount = 0;
    for (const u of this.upgrades) u.count = 0;
    for (const r of this.roasteryUpgrades) r.count = 0;
    this.addXp(2500 * this.dynastyCount);
    this.recalculateRates();
    this.sfx.playAstral(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${earned} ASTRAL CRYSTALS!`, 240, 235, COLORS.astral));
  }

  triggerPantheon() {
    const earned = this.getPendingStarlightShards();
    if (earned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    this.starlightShards += earned;
    this.pantheonCount += 1;
    this.beans = 0.0;
    this.goldenBeans = 0;
    this.astralCrystals = 0;
    this.lifetimeBeansRun = 0.0;
    this.rebirthCount = 0;
    this.dynastyCount = 0;
    for (const u of this.upgrades) u.count = 0;
    for (const r of this.roasteryUpgrades) r.count = 0;
    for (const d of this.dynastyPerks) d.count = 0;
    this.addXp(10000 * this.pantheonCount);
    this.recalculateRates();
    this.sfx.playPantheon(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${earned} STARLIGHT SHARDS!`, 240, 235, COLORS.pantheon));
  }

  // Updated to Silo Lv. 45 so storage physically holds the 10 Dc Eternal Bean requirement
  checkGoalCompletion() {
    return (
      this.level >= 100 &&
      this.recipes.every((r) => r.crafted) &&
      this.siloLevel >= 45 &&
      this.omegaSingularity >= 10 &&
      this.eternalBeans >= 1
    );
  }

  activateSanctuary() {
    if (this.checkGoalCompletion() && !this.sanctuaryUnlocked) {
      this.sanctuaryUnlocked = true;
      this.recalculateRates();
      this.sfx.playLevelup(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("★ OMNIVERSAL SANCTUARY AWAKENED! (x25 Production) ★", 240, 215, COLORS.gold));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  // --- Save & Load (LocalStorage) ---

  saveGame() {
    const data = {
      autoVent: this.autoVent,
      autoServe: this.autoServe,
      level: this.level,
      xp: this.xp,
      siloLevel: this.siloLevel,
      boilerTemp: this.boilerTemp,
      altarBlessings: this.altarBlessings,
      boilerVents: this.boilerVents,
      plinkoBallsDropped: this.plinkoBallsDropped,
      croissantsCaught: this.croissantsCaught,
      sanctuaryUnlocked: this.sanctuaryUnlocked,
      sinks: Object.fromEntries(this.sinks.map((s) => [s.uid, s.level])),
      cosmicPerks: Object.fromEntries(this.cosmicPerks.map((c) => [c.uid, c.level])),
      talents: Object.fromEntries(this.talents.map((t) => [t.uid, t.rank])),
      milestones: this.milestones.filter((m) => m.claimed).map((m) => m.targetLvl),
      achievements: this.achievements.filter((a) => a.unlocked).map((a) => a.aid),
      quests: this.quests.map((q) => ({ qid: q.qid, cur: q.currentVal, done: q.completed })),
      sfxEnabled: this.sfxEnabled,
      sfxVolume: this.sfxVolume,
      rainEnabled: this.rainEnabled,
      particlesEnabled: this.particlesEnabled,
      notationMode: this.notationMode,
      buyMode: this.buyMode,
      beans: this.beans,
      lifetimeBeansRun: this.lifetimeBeansRun,
      lifetimeBeansAll: this.lifetimeBeansAll,
      goldenBeans: this.goldenBeans,
      lifetimeGolden: this.lifetimeGolden,
      astralCrystals: this.astralCrystals,
      lifetimeCrystals: this.lifetimeCrystals,
      starlightShards: this.starlightShards,
      darkMatter: this.darkMatter,
      supernovaBeans: this.supernovaBeans,
      chronosCrystals: this.chronosCrystals,
      aetherEssence: this.aetherEssence,
      omegaSingularity: this.omegaSingularity,
      celestialDew: this.celestialDew,
      quasarNectar: this.quasarNectar,
      eternalBeans: this.eternalBeans,
      customerStars: this.customerStars,
      manualClicks: this.manualClicks,
      rebirthCount: this.rebirthCount,
      dynastyCount: this.dynastyCount,
      pantheonCount: this.pantheonCount,
      ordersCompleted: this.ordersCompleted,
      lastSaveTimestamp: Date.now() / 1000,
      upgrades: Object.fromEntries(this.upgrades.map((u) => [u.uid, u.count])),
      decor: Object.fromEntries(this.decor.map((d) => [d.uid, d.bought])),
      staff: Object.fromEntries(this.staff.map((s) => [s.uid, s.level])),
      roastery: Object.fromEntries(this.roasteryUpgrades.map((r) => [r.uid, r.count])),
      dynasty: Object.fromEntries(this.dynastyPerks.map((d) => [d.uid, d.count])),
      pantheon: Object.fromEntries(this.pantheonPerks.map((p) => [p.uid, p.count])),
      recipes: Object.fromEntries(this.recipes.map((r) => [r.uid, r.crafted])),
      rng: {
        totalRolls: this.rng.totalRolls,
        counts: this.rng.counts,
        equippedIndex: this.rng.equippedIndex,
        upgrades: this.rng.upgrades.map((u) => u.level)
      }
    };
    try {
      localStorage.setItem("rainy_cafe_grand_master_save", JSON.stringify(data));
    } catch (e) {
      console.warn("Save failed:", e);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem("rainy_cafe_grand_master_save");
      if (!raw) return;
      const data = JSON.parse(raw);

      this.level = data.level ?? 1;
      this.xp = data.xp ?? 0.0;
      this.siloLevel = data.siloLevel ?? 0;
      this.boilerTemp = data.boilerTemp ?? 70.0;
      this.altarBlessings = data.altarBlessings ?? 0;
      this.boilerVents = data.boilerVents ?? 0;
      this.plinkoBallsDropped = data.plinkoBallsDropped ?? 0;
      this.croissantsCaught = data.croissantsCaught ?? 0;
      this.sanctuaryUnlocked = data.sanctuaryUnlocked ?? false;
      this.autoVent = data.autoVent ?? false;
      this.autoServe = data.autoServe ?? true;

      for (const s of this.sinks) s.level = data.sinks?.[s.uid] ?? 0;
      for (const c of this.cosmicPerks) c.level = data.cosmicPerks?.[c.uid] ?? 0;
      for (const t of this.talents) t.rank = data.talents?.[t.uid] ?? 0;

      const claimedM = data.milestones || [];
      for (const m of this.milestones) m.claimed = claimedM.includes(m.targetLvl);

      const unlockedA = data.achievements || [];
      for (const a of this.achievements) a.unlocked = unlockedA.includes(a.aid);

      if (Array.isArray(data.quests)) {
        for (const qData of data.quests) {
          const q = this.quests.find((item) => item.qid === qData.qid);
          if (q) {
            q.currentVal = qData.cur ?? 0;
            q.completed = qData.done ?? false;
          }
        }
      }

      this.sfxEnabled = data.sfxEnabled ?? true;
      this.sfxVolume = data.sfxVolume ?? 1.0;
      this.rainEnabled = data.rainEnabled ?? true;
      this.particlesEnabled = data.particlesEnabled ?? true;
      this.notationMode = data.notationMode ?? "suffix";
      this.buyMode = data.buyMode ?? "1";

      this.beans = data.beans ?? 0.0;
      this.lifetimeBeansRun = data.lifetimeBeansRun ?? 0.0;
      this.lifetimeBeansAll = data.lifetimeBeansAll ?? 0.0;
      this.goldenBeans = data.goldenBeans ?? 0;
      this.lifetimeGolden = data.lifetimeGolden ?? 0;
      this.astralCrystals = data.astralCrystals ?? 0;
      this.lifetimeCrystals = data.lifetimeCrystals ?? 0;
      this.starlightShards = data.starlightShards ?? 0;

      this.darkMatter = data.darkMatter ?? 0;
      this.supernovaBeans = data.supernovaBeans ?? 0;
      this.chronosCrystals = data.chronosCrystals ?? 0;
      this.aetherEssence = data.aetherEssence ?? 0;
      this.omegaSingularity = data.omegaSingularity ?? 0;
      this.celestialDew = data.celestialDew ?? 0;
      this.quasarNectar = data.quasarNectar ?? 0;
      this.eternalBeans = data.eternalBeans ?? 0;

      this.customerStars = data.customerStars ?? 0;
      this.manualClicks = data.manualClicks ?? 0;
      this.rebirthCount = data.rebirthCount ?? 0;
      this.dynastyCount = data.dynastyCount ?? 0;
      this.pantheonCount = data.pantheonCount ?? 0;
      this.ordersCompleted = data.ordersCompleted ?? 0;

      for (const u of this.upgrades) u.count = data.upgrades?.[u.uid] ?? 0;
      for (const d of this.decor) d.bought = data.decor?.[d.uid] ?? false;
      for (const s of this.staff) s.level = data.staff?.[s.uid] ?? 0;
      for (const r of this.roasteryUpgrades) r.count = data.roastery?.[r.uid] ?? 0;
      for (const dyn of this.dynastyPerks) dyn.count = data.dynasty?.[dyn.uid] ?? 0;
      for (const p of this.pantheonPerks) p.count = data.pantheon?.[p.uid] ?? 0;
      for (const rec of this.recipes) rec.crafted = data.recipes?.[rec.uid] ?? false;

      if (data.rng) {
        this.rng.totalRolls = data.rng.totalRolls ?? 0;
        if (Array.isArray(data.rng.counts)) this.rng.counts = data.rng.counts;
        this.rng.equippedIndex = data.rng.equippedIndex ?? -1;
        if (Array.isArray(data.rng.upgrades)) {
          data.rng.upgrades.forEach((lvl, i) => {
            if (this.rng.upgrades[i]) this.rng.upgrades[i].level = lvl;
          });
        }
      }

      const lastTs = data.lastSaveTimestamp ?? 0;
      if (lastTs > 0) {
        const elapsed = Date.now() / 1000 - lastTs;
        if (elapsed > 10) {
          let offlinePct = 0.20 + this.staff[3].level * 0.10;
          if (this.decor[4].bought) offlinePct += 0.30;
          this.recalculateRates();
          const offlineEarned = Math.min(this.getMaxStorage(), this.bps * elapsed * offlinePct);
          this.beans = Math.min(this.getMaxStorage(), this.beans + offlineEarned);
          this.lifetimeBeansAll += offlineEarned;
          this.addXp(Math.max(10, Math.floor(Math.log10(Math.max(10.0, offlineEarned)) * 18.0)));
          this.popups.push(new FloatingPopup(`Welcome back! +${formatNum(offlineEarned, this.notationMode)}`, 240, 215, COLORS.gold));
        }
      }
    } catch (e) {
      console.warn("Load failed:", e);
    }
  }

  wipeAllData() {
    localStorage.removeItem("rainy_cafe_grand_master_save");
    localStorage.removeItem("rainy_cafe_rng_save");
    this.level = 1;
    this.xp = 0.0;
    this.siloLevel = 0;
    this.boilerTemp = 70.0;
    this.overheatLockout = false;
    this.altarBlessings = 0;
    this.boilerVents = 0;
    this.plinkoBallsDropped = 0;
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    this.lifetimeBeansAll = 0.0;
    this.goldenBeans = 0;
    this.lifetimeGolden = 0;
    this.astralCrystals = 0;
    this.lifetimeCrystals = 0;
    this.starlightShards = 0;
    this.darkMatter = 0;
    this.supernovaBeans = 0;
    this.chronosCrystals = 0;
    this.aetherEssence = 0;
    this.omegaSingularity = 0;
    this.celestialDew = 0;
    this.quasarNectar = 0;
    this.eternalBeans = 0;
    this.sanctuaryUnlocked = false;
    this.customerStars = 0;
    this.manualClicks = 0;
    this.rebirthCount = 0;
    this.dynastyCount = 0;
    this.pantheonCount = 0;
    this.croissantsCaught = 0;
    this.ordersCompleted = 0;
    this.dynastySynthTimer = 0.0;
    this.guildAutoBuyTimer = 0.0;
    this.chronosWarpTimer = 0.0;

    for (const s of [...this.sinks, ...this.cosmicPerks]) s.level = 0;
    for (const t of this.talents) t.rank = 0;
    for (const m of this.milestones) m.claimed = false;
    for (const u of this.upgrades) u.count = 0;
    for (const d of this.decor) d.bought = false;
    for (const st of this.staff) st.level = 0;
    for (const r of this.roasteryUpgrades) r.count = 0;
    for (const dyn of this.dynastyPerks) dyn.count = 0;
    for (const p of this.pantheonPerks) p.count = 0;
    for (const rec of this.recipes) { rec.crafted = false; rec.brewing = false; rec.progress = 0; }
    for (const q of this.quests) { q.currentVal = 0; q.completed = false; }
    for (const a of this.achievements) a.unlocked = false;

    this.rng.totalRolls = 0;
    this.rng.counts.fill(0);
    this.rng.equippedIndex = -1;
    for (const ru of this.rng.upgrades) ru.level = 0;

    this.wipeConfirmActive = false;
    this.recalculateRates();
    this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup("DATA WIPED CLEAN", 240, 255, COLORS.danger));
  }

  // ===========================================================================
  // 9. STATIC DOM INITIALIZATION & IN-PLACE UI UPDATERS
  // ===========================================================================

  buildStaticDOM() {
    const upgList = document.getElementById("upgrades-list");
    upgList.innerHTML = "";
    this.upgrades.forEach((upg) => {
      const card = document.createElement("div");
      card.className = "game-card clickable";
      card.id = `card-${upg.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${upg.uid}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${upg.name}</span>
            <span class="card-count" id="cnt-${upg.uid}">x0 (+1)</span>
          </div>
          <div class="card-desc">${upg.desc}</div>
          <div class="card-cost" id="cost-${upg.uid}">Cost: 0 beans</div>
        </div>
      `;
      card.addEventListener("click", () => {
        const disc = this.getDiscountFactor();
        const exp = this.getUpgradeExponent();
        const { qty, cost } = upg.getBulkInfo(this.buyMode, this.beans, disc, exp);
        if (this.beans >= cost) {
          this.beans -= cost;
          upg.count += qty;
          this.addXp(20 * (this.upgrades.indexOf(upg) + 1));
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      upgList.appendChild(card);
    });

    const staffList = document.getElementById("staff-list");
    staffList.innerHTML = "";
    this.staff.forEach((st) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-${st.uid}`;
      card.innerHTML = `
        <div class="card-accent accent-star" id="acc-${st.uid}"></div>
        <div class="card-main">
          <div class="card-title">${st.name} (${st.role})</div>
          <div class="card-desc">${st.desc}</div>
          <div class="card-cost" style="color: var(--color-star);" id="lvl-${st.uid}">Level: 0</div>
        </div>
        <button class="btn" id="btn-${st.uid}" type="button">150</button>
      `;
      card.querySelector(`#btn-${st.uid}`).addEventListener("click", () => {
        const cost = this.getStaffCost(st);
        if (this.beans >= cost) {
          this.beans -= cost;
          st.level += 1;
          this.addXp(100 * st.level);
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      staffList.appendChild(card);
    });

    const decorList = document.getElementById("decor-list");
    decorList.innerHTML = "";
    this.decor.forEach((dec, idx) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-${dec.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${dec.uid}"></div>
        <div class="card-main">
          <div class="card-title">${dec.name}</div>
          <div class="card-desc">${dec.desc}</div>
        </div>
        <button class="btn" id="btn-${dec.uid}" type="button"></button>
      `;
      card.querySelector(`#btn-${dec.uid}`).addEventListener("click", () => {
        if (!dec.bought && this.beans >= dec.cost) {
          this.beans -= dec.cost;
          dec.bought = true;
          this.addXp(250 * (idx + 1));
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      decorList.appendChild(card);
    });

    const brewList = document.getElementById("brew-list");
    brewList.innerHTML = "";
    this.recipes.forEach((rec) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-${rec.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${rec.uid}"></div>
        <div class="card-main">
          <div class="card-title">${rec.name}</div>
          <div class="card-desc">${rec.buffDesc}</div>
        </div>
        <button class="btn" id="btn-${rec.uid}" type="button"></button>
      `;
      card.querySelector(`#btn-${rec.uid}`).addEventListener("click", () => {
        if (!rec.crafted && !rec.brewing && this.beans >= rec.costBeans) {
          this.beans -= rec.costBeans;
          rec.brewing = true;
          rec.progress = 0.0;
          this.addXp(80);
          this.quests[4].currentVal += 1;
          this.sfx.playBrew(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      brewList.appendChild(card);
    });

    const plinkoGrid = document.getElementById("plinko-currency-grid");
    plinkoGrid.innerHTML = "";
    const plinkoCurrs = [
      ["beans", "Beans", COLORS.text], ["golden", "Golden", COLORS.gold],
      ["astral", "Crystals", COLORS.astral], ["shards", "Shards", COLORS.pantheon],
      ["dark_matter", "DMR", COLORS.darkMatter], ["supernova", "SNB", COLORS.supernova],
      ["chronos", "CTC", COLORS.chronos], ["aether", "AE", COLORS.aether],
      ["omega", "OSB", COLORS.omega], ["dew", "Dew", COLORS.dew],
      ["quasar", "QN", COLORS.quasar], ["eternal", "ERB", COLORS.eternal]
    ];
    plinkoCurrs.forEach(([key, label, col]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plinko-curr-btn";
      btn.dataset.curr = key;
      btn.dataset.color = col;
      btn.textContent = label;
      btn.addEventListener("click", () => {
        this.plinko.currencyType = key;
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      });
      plinkoGrid.appendChild(btn);
    });

    const talentsList = document.getElementById("talents-list");
    talentsList.innerHTML = "";
    this.talents.forEach((t) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-${t.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${t.uid}"></div>
        <div class="card-main">
          <div class="card-title">${t.name}</div>
          <div class="card-cost" id="rnk-${t.uid}">Rank 0/${t.maxRank}</div>
          <div class="card-desc">${t.desc}</div>
        </div>
        <button class="btn" id="btn-${t.uid}" type="button">+1 Pt</button>
      `;
      card.querySelector(`#btn-${t.uid}`).addEventListener("click", () => {
        if (this.getAvailableTalentPoints() >= 1 && t.rank < t.maxRank) {
          t.rank += 1;
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      talentsList.appendChild(card);
    });

    const msList = document.getElementById("milestones-list");
    msList.innerHTML = "";
    this.milestones.forEach((m) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-ms-${m.targetLvl}`;
      let rw = `+${formatNum(m.beans)} Beans`;
      if (m.golden > 0) rw += ` | +${m.golden} Golden`;
      if (m.crystals > 0) rw += ` | +${m.crystals} Crystals`;
      if (m.shards > 0) rw += ` | +${m.shards} Shards`;
      card.innerHTML = `
        <div class="card-accent" id="acc-ms-${m.targetLvl}"></div>
        <div class="card-main">
          <div class="card-title">Milestone Level ${m.targetLvl} Crate</div>
          <div class="card-desc">${rw}</div>
        </div>
        <button class="btn" id="btn-ms-${m.targetLvl}" type="button"></button>
      `;
      card.querySelector(`#btn-ms-${m.targetLvl}`).addEventListener("click", () => {
        if (this.level >= m.targetLvl && !m.claimed) {
          m.claimed = true;
          this.beans = Math.min(this.getMaxStorage(), this.beans + m.beans);
          this.goldenBeans += m.golden;
          this.astralCrystals += m.crystals;
          this.starlightShards += m.shards;
          this.recalculateRates();
          this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
          this.popups.push(new FloatingPopup(`CRATE CLAIMED! (Lv. ${m.targetLvl})`, 240, 235, COLORS.gold));
        }
      });
      msList.appendChild(card);
    });

    const transList = document.getElementById("transmute-list");
    transList.innerHTML = "";
    const transmutes = [
      { id: "tr1", title: "Beans -> Golden Bean", sub: "500M Beans -> +1 Golden Bean", fn: () => {
        if (this.beans >= 500e6) {
          this.beans -= 500e6; this.goldenBeans += 1; this.lifetimeGolden += 1;
          this.recalculateRates(); this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr2", title: "Golden -> Astral Crystal", sub: "250 Golden -> +1 Astral Crystal", fn: () => {
        if (this.goldenBeans >= 250) {
          this.goldenBeans -= 250; this.astralCrystals += 1; this.lifetimeCrystals += 1;
          this.recalculateRates(); this.sfx.playAstral(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr3", title: "Crystal -> Starlight Shard", sub: "100 Crystals -> +1 Starlight Shard", fn: () => {
        if (this.astralCrystals >= 100) {
          this.astralCrystals -= 100; this.starlightShards += 1;
          this.recalculateRates(); this.sfx.playPantheon(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }}
    ];
    transmutes.forEach((tr) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "50px";
      card.innerHTML = `
        <div class="card-accent" id="acc-${tr.id}"></div>
        <div class="card-main">
          <div class="card-title">${tr.title}</div>
          <div class="card-desc">${tr.sub}</div>
        </div>
        <button class="btn btn-sm" id="btn-${tr.id}" type="button">Transmute Forge</button>
      `;
      card.querySelector(`#btn-${tr.id}`).addEventListener("click", tr.fn);
      transList.appendChild(card);
    });

    const sinksList = document.getElementById("sinks-list");
    sinksList.innerHTML = "";
    this.sinks.forEach((snk) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.innerHTML = `
        <div class="card-accent" id="acc-${snk.uid}"></div>
        <div class="card-main">
          <div class="card-title" id="ttl-${snk.uid}">${snk.name} (Lv. 0)</div>
          <div class="card-desc">${snk.desc}</div>
          <div class="card-cost" id="cost-${snk.uid}">Cost: 0</div>
        </div>
        <div class="sink-btn-group">
          <button class="btn btn-accent btn-sm" id="b1-${snk.uid}" type="button">+1</button>
          <button class="btn btn-gold btn-sm" id="b25-${snk.uid}" type="button">Dump 25%</button>
          <button class="btn btn-danger btn-sm" id="b90-${snk.uid}" type="button">Dump 90%</button>
        </div>
      `;
      card.querySelector(`#b1-${snk.uid}`).addEventListener("click", () => {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const cost = snk.getCostSingle();
        if (bal >= cost) {
          snk.level += 1;
          this.deductCurrency(snk.currencyType, cost);
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      });
      card.querySelector(`#b25-${snk.uid}`).addEventListener("click", () => {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const { qty, cost } = snk.getMaxAffordable(bal * 0.25);
        if (qty > 0 && bal >= cost) {
          snk.level += qty;
          this.deductCurrency(snk.currencyType, cost);
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      });
      card.querySelector(`#b90-${snk.uid}`).addEventListener("click", () => {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const { qty, cost } = snk.getMaxAffordable(bal * 0.90);
        if (qty > 0 && bal >= cost) {
          snk.level += qty;
          this.deductCurrency(snk.currencyType, cost);
          this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      });
      sinksList.appendChild(card);
    });

    const cForgeList = document.getElementById("cosmic-forges-list");
    cForgeList.innerHTML = "";
    this.cosmicForgeDefs = [
      { id: "cf1", name: "Dark Matter Roast (DMR)", req: "100 Sp Beans -> +1 DMR", col: COLORS.darkMatter,
        can: () => this.beans >= 1e26, getOwned: () => this.darkMatter,
        act: () => { this.beans -= 1e26; this.darkMatter += 1; } },
      { id: "cf2", name: "Supernova Bean (SNB)", req: "10 Oc Beans -> +1 SNB", col: COLORS.supernova,
        can: () => this.beans >= 1e28, getOwned: () => this.supernovaBeans,
        act: () => { this.beans -= 1e28; this.supernovaBeans += 1; } },
      { id: "cf3", name: "Chronos Crystal (CTC)", req: "1 No Beans -> +1 CTC", col: COLORS.chronos,
        can: () => this.beans >= 1e30, getOwned: () => this.chronosCrystals,
        act: () => { this.beans -= 1e30; this.chronosCrystals += 1; } },
      { id: "cf4", name: "Aetherial Essence (AE)", req: "100 No Beans -> +1 AE", col: COLORS.aether,
        can: () => this.beans >= 1e32, getOwned: () => this.aetherEssence,
        act: () => { this.beans -= 1e32; this.aetherEssence += 1; } },
      { id: "cf5", name: "Omega Singularity (OSB)", req: "10 Dc Beans -> +1 OSB", col: COLORS.omega,
        can: () => this.beans >= 1e34, getOwned: () => this.omegaSingularity,
        act: () => { this.beans -= 1e34; this.omegaSingularity += 1; } },
      { id: "cf6", name: "Celestial Dew (CD)", req: "1 No Beans + 10 Shards -> +1 Dew", col: COLORS.dew,
        can: () => this.beans >= 1e30 && this.starlightShards >= 10, getOwned: () => this.celestialDew,
        act: () => { this.beans -= 1e30; this.starlightShards -= 10; this.celestialDew += 1; } },
      { id: "cf7", name: "Quasar Nectar (QN)", req: "100 No Beans + 3 OSB -> +1 Nectar", col: COLORS.quasar,
        can: () => this.beans >= 1e32 && this.omegaSingularity >= 3, getOwned: () => this.quasarNectar,
        act: () => { this.beans -= 1e32; this.omegaSingularity -= 3; this.quasarNectar += 1; } },
      { id: "cf8", name: "The Eternal Bean (ERB)", req: "10 Dc Beans + 5 QN + 25 Dew -> +1 ERB", col: COLORS.eternal,
        can: () => this.beans >= 1e34 && this.quasarNectar >= 5 && this.celestialDew >= 25, getOwned: () => this.eternalBeans,
        act: () => { this.beans -= 1e34; this.quasarNectar -= 5; this.celestialDew -= 25; this.eternalBeans += 1; } }
    ];
    this.cosmicForgeDefs.forEach((cf) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "52px";
      card.innerHTML = `
        <div class="card-accent" id="acc-${cf.id}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${cf.name}</span>
            <span class="card-count" id="own-${cf.id}" style="color: ${cf.col};">Owned: 0</span>
          </div>
          <div class="card-desc">${cf.req}</div>
        </div>
        <button class="btn btn-sm" id="btn-${cf.id}" type="button">Forge Cosmic</button>
      `;
      card.querySelector(`#btn-${cf.id}`).addEventListener("click", () => {
        if (cf.can()) {
          cf.act();
          this.recalculateRates();
          this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      cForgeList.appendChild(card);
    });

    const cPerksList = document.getElementById("cosmic-perks-list");
    cPerksList.innerHTML = "";
    this.cosmicPerks.forEach((cp) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.innerHTML = `
        <div class="card-accent" id="acc-${cp.uid}"></div>
        <div class="card-main">
          <div class="card-title" id="ttl-${cp.uid}">${cp.name} (Lv. 0)</div>
          <div class="card-desc">${cp.desc}</div>
          <div class="card-cost" id="cost-${cp.uid}">Cost: 1</div>
        </div>
        <button class="btn btn-sm" id="btn-${cp.uid}" type="button">+1 Rank</button>
      `;
      card.querySelector(`#btn-${cp.uid}`).addEventListener("click", () => {
        const bal = this.getCurrencyBalance(cp.currencyType);
        const cost = cp.getCostSingle();
        if (bal >= cost) {
          cp.level += 1;
          this.deductCurrency(cp.currencyType, cost);
          this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      cPerksList.appendChild(card);
    });

    const roastList = document.getElementById("roastery-list");
    roastList.innerHTML = "";
    this.roasteryUpgrades.forEach((upg) => {
      const card = document.createElement("div");
      card.className = "game-card clickable";
      card.id = `card-${upg.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${upg.uid}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${upg.name}</span>
            <span class="card-count" id="cnt-${upg.uid}">0/${upg.maxLvl}</span>
          </div>
          <div class="card-desc">${upg.desc}</div>
          <div class="card-cost" id="cost-${upg.uid}">Cost: 1 Golden Beans</div>
        </div>
      `;
      card.addEventListener("click", () => {
        const cost = this.getRoasteryCost(upg);
        if (upg.count < upg.maxLvl && this.goldenBeans >= cost) {
          this.goldenBeans -= cost;
          upg.count += 1;
          this.addXp(300);
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      roastList.appendChild(card);
    });

    const dynList = document.getElementById("dynasty-list");
    dynList.innerHTML = "";
    this.dynastyPerks.forEach((perk) => {
      const card = document.createElement("div");
      card.className = "game-card clickable";
      card.id = `card-${perk.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${perk.uid}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${perk.name}</span>
            <span class="card-count" id="cnt-${perk.uid}">0/${perk.maxLvl}</span>
          </div>
          <div class="card-desc">${perk.desc}</div>
          <div class="card-cost" id="cost-${perk.uid}">Cost: ${perk.cost} Astral Crystals</div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (perk.count < perk.maxLvl && this.astralCrystals >= perk.cost) {
          this.astralCrystals -= perk.cost;
          perk.count += 1;
          this.addXp(1200);
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      dynList.appendChild(card);
    });

    const panList = document.getElementById("pantheon-list");
    panList.innerHTML = "";
    this.pantheonPerks.forEach((perk) => {
      const card = document.createElement("div");
      card.className = "game-card clickable";
      card.id = `card-${perk.uid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${perk.uid}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${perk.name}</span>
            <span class="card-count" id="cnt-${perk.uid}">0/${perk.maxLvl}</span>
          </div>
          <div class="card-desc">${perk.desc}</div>
          <div class="card-cost" id="cost-${perk.uid}">Cost: ${perk.cost} Starlight Shards</div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (perk.count < perk.maxLvl && this.starlightShards >= perk.cost) {
          this.starlightShards -= perk.cost;
          perk.count += 1;
          this.addXp(5000);
          this.recalculateRates();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      panList.appendChild(card);
    });

    const questsList = document.getElementById("quests-list");
    questsList.innerHTML = "";
    this.quests.forEach((q) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-${q.qid}`;
      card.innerHTML = `
        <div class="card-accent" id="acc-${q.qid}"></div>
        <div class="card-main">
          <div class="card-title">${q.title}</div>
          <div class="card-desc">${q.desc}</div>
          <div class="card-cost" id="prog-${q.qid}">Progress: 0 / ${q.targetVal}</div>
        </div>
        <button class="btn btn-sm" id="btn-${q.qid}" type="button">IN PROGRESS</button>
      `;
      card.querySelector(`#btn-${q.qid}`).addEventListener("click", () => {
        if (q.currentVal >= q.targetVal && !q.completed) {
          q.completed = true;
          this.beans = Math.min(this.getMaxStorage(), this.beans + q.rewardBeans);
          this.customerStars += q.rewardStars;
          this.addXp(250);
          this.recalculateRates();
          this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        }
      });
      questsList.appendChild(card);
    });
  }

  // --- Event Listeners & Hotkeys ---

  bindEvents() {
    const sceneCanvas = document.getElementById("scene-canvas");
    sceneCanvas.addEventListener("mousedown", (e) => {
      const rect = sceneCanvas.getBoundingClientRect();
      const scaleX = sceneCanvas.width / rect.width;
      const scaleY = sceneCanvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.handleSceneClick(x, y);
    });
    // Multiplier Breakdown Popover Toggle & Close
    const multDisplay = document.getElementById("multiplier-display");
    const multPopover = document.getElementById("multiplier-popover");

    const toggleMultPopover = () => {
      const opening = multPopover.classList.contains("hidden");
      multPopover.classList.toggle("hidden", !opening);
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      if (opening) this.renderMultiplierBreakdown();
    };

    multDisplay.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMultPopover();
    });
    multDisplay.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMultPopover();
      }
    });
    document.getElementById("btn-close-mult-pop").addEventListener("click", (e) => {
      e.stopPropagation();
      multPopover.classList.add("hidden");
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.7);
    });
    multPopover.addEventListener("mousedown", (e) => e.stopPropagation());
    sceneCanvas.addEventListener("mousedown", () => {
      if (!multPopover.classList.contains("hidden")) {
        multPopover.classList.add("hidden");
      }
    });
    document.getElementById("btn-silo-upgrade").addEventListener("click", () => this.upgradeSilo());
    document.getElementById("btn-vent").addEventListener("click", () => this.ventBoiler());
    document.getElementById("btn-auto-vent").addEventListener("click", () => {
      this.autoVent = !this.autoVent;
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.7);
      });
    });

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.buyMode = btn.dataset.mode;
        document.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === this.buyMode));
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      });
    });

    document.getElementById("btn-buy-max-menu").addEventListener("click", () => this.buyMaxAllUpgrades());
    document.getElementById("btn-buy-max-staff").addEventListener("click", () => this.buyMaxAllStaff());
    document.getElementById("btn-buy-max-roast").addEventListener("click", () => this.buyMaxAllRoastery());
    document.getElementById("btn-buy-max-dynasty").addEventListener("click", () => this.buyMaxAllDynasty());
    document.getElementById("btn-buy-max-pantheon").addEventListener("click", () => this.buyMaxAllPantheon());

    document.getElementById("btn-auto-serve").addEventListener("click", () => {
      this.autoServe = !this.autoServe;
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-serve-order").addEventListener("click", () => {
      if (!this.serveCurrentOrder()) this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    });

    // Plinko Controls (with 10% Max Bet Cap)
    const betInput = document.getElementById("plinko-bet-input");
    document.querySelectorAll(".chip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bal = this.getCurrencyBalance(this.plinko.currencyType);
        const maxCap = this.plinko.getMaxBet(bal);
        const mode = btn.dataset.chip;
        if (mode === "min") betInput.value = "1";
        else if (mode === "10") betInput.value = String(Math.max(1, Math.min(maxCap, Math.floor(bal * 0.02))));
        else if (mode === "50") betInput.value = String(Math.max(1, Math.min(maxCap, Math.floor(bal * 0.05))));
        else if (mode === "max") betInput.value = String(Math.max(1, maxCap));
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.7);
      });
    });

    const triggerPlinkoDrop = (xPos) => {
      const bal = this.getCurrencyBalance(this.plinko.currencyType);
      const red = this.talents[4].rank * 0.03;
      const { success, amount } = this.plinko.dropBall(xPos, betInput.value, bal, red);
      if (success) {
        this.deductCurrency(this.plinko.currencyType, amount);
        this.plinkoBallsDropped += 1;
        this.addXp(15);
        this.quests[3].currentVal += 1;
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
      } else {
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }
    };

    document.getElementById("btn-plinko-drop").addEventListener("click", () => {
      triggerPlinkoDrop(this.plinko.xCenter);
    });

    const plinkoCanvas = document.getElementById("plinko-canvas");
    plinkoCanvas.addEventListener("mousedown", (e) => {
      const rect = plinkoCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (plinkoCanvas.width / rect.width);
      triggerPlinkoDrop(x);
    });

    document.getElementById("btn-reset-talents").addEventListener("click", () => {
      this.talents.forEach((t) => (t.rank = 0));
      this.recalculateRates();
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    });

    document.getElementById("btn-altar-sacrifice").addEventListener("click", () => {
      if (this.beans < 1e6) {
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        return;
      }
      const sac = this.beans * 0.50;
      this.beans -= sac;
      this.altarBlessings += 1;
      const xpGain = Math.floor(Math.log10(Math.max(10.0, sac)) * 350.0);
      this.addXp(xpGain);
      this.recalculateRates();
      this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`ALTAR BLESSING (+2%)! +${xpGain} XP`, 240, 235, COLORS.gold));
    });

    document.getElementById("sanctuary-goal-banner").addEventListener("click", () => this.activateSanctuary());
    document.getElementById("btn-trigger-rebirth").addEventListener("click", () => this.triggerRebirth());
    document.getElementById("btn-trigger-dynasty").addEventListener("click", () => this.triggerDynasty());
    document.getElementById("btn-trigger-pantheon").addEventListener("click", () => this.triggerPantheon());

    document.getElementById("btn-cfg-sfx").addEventListener("click", () => {
      this.sfxEnabled = !this.sfxEnabled;
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.querySelectorAll(".vol-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfxVolume = parseFloat(btn.dataset.vol);
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
      });
    });
    document.getElementById("btn-cfg-rain").addEventListener("click", () => {
      this.rainEnabled = !this.rainEnabled;
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-cfg-particles").addEventListener("click", () => {
      this.particlesEnabled = !this.particlesEnabled;
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-cfg-notation").addEventListener("click", () => {
      this.notationMode = this.notationMode === "suffix" ? "scientific" : "suffix";
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-cfg-save").addEventListener("click", () => {
      this.saveGame();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("SAVED TO LOCALSTORAGE", 240, 255, COLORS.success));
    });
    document.getElementById("btn-cfg-wipe").addEventListener("click", () => {
      if (!this.wipeConfirmActive) {
        this.wipeConfirmActive = true;
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      } else {
        this.wipeAllData();
      }
    });

    // Global Keyboard Hotkeys
    window.addEventListener("keydown", (e) => {
      if (document.activeElement === betInput) return;
      if (this.rng && this.rng.cutsceneActive && e.code === "Space") {
        e.preventDefault();
        this.rng.closeCutscene();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (this.activeTab === "plinko") {
          triggerPlinkoDrop(this.plinko.xCenter);
        } else if (this.activeTab === "rng") {
          this.rng.startRoll(false);
        } else {
          this.handleSceneClick(this.mugCenter.x, this.mugCenter.y);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (this.rng) this.rng.startRoll(false);
      } else if (e.key === "b" || e.key === "B") {
        if (this.activeTab === "roast") this.buyMaxAllRoastery();
        else if (this.activeTab === "dynasty") this.buyMaxAllDynasty();
        else if (this.activeTab === "pantheon") this.buyMaxAllPantheon();
        else if (this.activeTab === "staff") this.buyMaxAllStaff();
        else this.buyMaxAllUpgrades();
      } else if (e.key === "v" || e.key === "V") {
        this.ventBoiler();
      } else if (e.key === "s" || e.key === "S") {
        this.saveGame();
        this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup("SAVED TO LOCALSTORAGE", 240, 255, COLORS.success));
      } else if (e.key === "e" || e.key === "E") {
        const idx = (this.tabs.indexOf(this.activeTab) + 1) % this.tabs.length;
        this.switchTab(this.tabs[idx]);
      } else if (e.key === "q" || e.key === "Q") {
        const idx = (this.tabs.indexOf(this.activeTab) - 1 + this.tabs.length) % this.tabs.length;
        this.switchTab(this.tabs[idx]);
      }
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabId}`));
  }

  handleSceneClick(x, y) {
    // 1. Flying Lucky Croissant
    if (this.croissant.checkClick(x, y)) {
      this.croissantsCaught += 1;
      this.triggerCroissantFrenzy(x, y - 20, "CAFFEINE FRENZY! (7x)");
      return;
    }

    // 2. Sleeping Cat Mochi
    if (Math.hypot(x - this.catCenter.x, y - this.catCenter.y) <= 44) {
      this.catScaleX = 1.25;
      this.catScaleY = 0.75;
      this.purrCombo = Math.min(5, this.purrCombo + 1);
      this.purrBlissTimer = 10.0;
      this.quests[1].currentVal += 1;
      this.addXp(25 * this.purrCombo);
      this.recalculateRates();
      this.sfx.playPurr(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`Purr Bliss x${this.purrCombo} (+${this.purrCombo * 10}%)`, this.catCenter.x, this.catCenter.y - 35, COLORS.gold));
      return;
    }

    // 3. Coffee Mug Hitbox
    const { x: cx, y: cy } = this.mugCenter;
    if (x >= cx - 95 && x <= cx + 95 && y >= cy - 80 && y <= cy + 80) {
      const { chance, mult } = this.getCritStats();
      const isCrit = Math.random() < chance;
      let gained = this.clickPower * (isCrit ? mult : 1.0);

      // Dynasty d03: 5%/rank chance on click to award 10 seconds of full BPS
      const d03Chance = this.dynastyPerks[2].count * 0.05;
      const isCremaSurge = d03Chance > 0 && this.bps > 0 && Math.random() < d03Chance;
      if (isCremaSurge) {
        gained += this.bps * 10.0;
      }

      this.beans = Math.min(this.getMaxStorage(), this.beans + gained);
      this.lifetimeBeansRun += gained;
      this.lifetimeBeansAll += gained;
      this.manualClicks += 1;
      this.scaleX = isCrit ? 1.20 : 1.14;
      this.scaleY = isCrit ? 0.80 : 0.86;

      this.quests[0].currentVal += 1;
      this.boilerTemp = Math.min(100.0, this.boilerTemp + 1.2);
      if (this.boilerTemp >= 100.0) {
        this.overheatLockout = true;
        this.overheatTimer = 5.0;
        this.recalculateRates();
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }

      if (isCremaSurge) {
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`CREMA SURGE! +${formatNum(gained, this.notationMode)}`, x, y - 42, COLORS.astral));
        this.addXp(85);
      } else if (isCrit) {
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`CRIT SIP! +${formatNum(gained, this.notationMode)}`, x, y - 35, COLORS.gold));
        this.addXp(60 + Math.floor(Math.log10(Math.max(1.0, this.clickPower)) * 8));
      } else {
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`+${formatNum(gained, this.notationMode)}`, x, y - 25));
        this.addXp(12 + Math.floor(Math.log10(Math.max(1.0, this.clickPower)) * 2));
      }

      if (this.particlesEnabled) {
        const count = isCrit ? 5 : 3;
        for (let i = 0; i < count; i++) {
          this.steamParticles.push(new SteamPuff(cx, cy - 80));
        }
      }
    }
  }

  // ===========================================================================
  // 10. MAIN GAME LOOP (UPDATE, SCENE RENDER & DOM SYNC)
  // ===========================================================================

  update(dt) {
    this.playTime += dt;

    if (this.overheatLockout) {
      this.overheatTimer -= dt;
      if (this.overheatTimer <= 0) {
        this.overheatLockout = false;
        this.boilerTemp = 85.0;
        this.recalculateRates();
      }
    } else if (this.boilerTemp > 70.0) {
      this.boilerTemp = Math.max(70.0, this.boilerTemp - 1.8 * dt);
      this.recalculateRates();
    }

    const maxCap = this.getMaxStorage();
    if (this.beans < maxCap) {
      let gained = this.bps * dt;
      // Roastery r08: Perpetual Steam Generator (+0.06%/lvl of current balance/sec)
      if (this.roasteryUpgrades[7].count > 0) {
        gained += this.beans * (this.roasteryUpgrades[7].count * 0.0006) * dt;
      }
      this.beans = Math.min(maxCap, this.beans + gained);
      this.lifetimeBeansRun += gained;
      this.lifetimeBeansAll += gained;
    }

    if (this.bps > 0) {
      const xpTrickle = Math.max(0.2, Math.log10(Math.max(10.0, this.bps)) * 0.45) * dt;
      this.addXp(xpTrickle);
    }

    // Dynasty d02: Astral Bean Synthesis (+1 Golden Bean/lvl every 60s)
    if (this.dynastyPerks[1].count > 0) {
      this.dynastySynthTimer += dt;
      if (this.dynastySynthTimer >= 60.0) {
        this.dynastySynthTimer -= 60.0;
        const synthAmt = this.dynastyPerks[1].count;
        this.goldenBeans += synthAmt;
        this.lifetimeGolden += synthAmt;
        this.recalculateRates();
        this.popups.push(new FloatingPopup(`+${synthAmt} Synthesized Golden Bean!`, 240, 235, COLORS.gold));
      }
    }

    // Dynasty d05: Celestial Barista Guild (Auto-buys cheapest upgrade every 2s / level)
    if (this.dynastyPerks[4].count > 0) {
      this.guildAutoBuyTimer += dt;
      const interval = 2.0 / this.dynastyPerks[4].count;
      if (this.guildAutoBuyTimer >= interval) {
        this.guildAutoBuyTimer = 0.0;
        const disc = this.getDiscountFactor();
        const exp = this.getUpgradeExponent();
        const affordable = this.upgrades.filter((u) => this.beans >= u.getCostSingle(disc, exp));
        if (affordable.length > 0) {
          affordable.sort((a, b) => a.getCostSingle(disc, exp) - b.getCostSingle(disc, exp));
          const cheapest = affordable[0];
          this.beans -= cheapest.getCostSingle(disc, exp);
          cheapest.count += 1;
          this.recalculateRates();
        }
      }
    }

    // Cosmic cos3: Chronos Warp Engine (Grants 1 hour of BPS every 300s / level)
    if (this.cosmicPerks[2].level > 0 && this.bps > 0) {
      this.chronosWarpTimer += dt;
      const warpInterval = 300.0 / this.cosmicPerks[2].level;
      if (this.chronosWarpTimer >= warpInterval) {
        this.chronosWarpTimer = 0.0;
        const warpGain = this.bps * 3600.0;
        this.beans = Math.min(maxCap, this.beans + warpGain);
        this.lifetimeBeansRun += warpGain;
        this.lifetimeBeansAll += warpGain;
        this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`CHRONOS WARP! +${formatNum(warpGain, this.notationMode)}`, 240, 220, COLORS.chronos));
      }
    }

    // Plinko Update
    const payouts = this.plinko.update(dt, this.sfx, this.sfxEnabled, this.sfxVolume);
    for (const p of payouts) {
      this.addCurrency(p.currency, p.payout);
      const cName = p.currency.replace("_", " ").toUpperCase();
      if (p.mult >= 10.0) {
        this.addXp(600);
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.plinko.popups.push(new FloatingPopup(`+${formatNum(p.payout, this.notationMode)} ${cName} (10x JACKPOT)!`, p.x, p.y - 25, COLORS.gold));
      } else if (p.mult >= 1.8) {
        this.addXp(75);
        this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        this.plinko.popups.push(new FloatingPopup(`+${formatNum(p.payout, this.notationMode)} (${p.mult}x)`, p.x, p.y - 20, COLORS.success));
      } else {
        this.addXp(10);
        this.plinko.popups.push(new FloatingPopup(`+${formatNum(p.payout, this.notationMode)} (${p.mult}x)`, p.x, p.y - 15, COLORS.textMuted));
      }
    }

    if (this.purrBlissTimer > 0) {
      this.purrBlissTimer -= dt;
      if (this.purrBlissTimer <= 0) {
        this.purrBlissTimer = 0.0;
        this.purrCombo = 0;
        this.recalculateRates();
      }
    }

    // Staff 1: Mochi Auto-Sip
    if (this.staff[0].level > 0) {
      const mochiGain = this.clickPower * this.staff[0].level * dt;
      this.beans = Math.min(maxCap, this.beans + mochiGain);
      this.lifetimeBeansRun += mochiGain;
      this.lifetimeBeansAll += mochiGain;
      const mochiXp = Math.max(0.2, Math.log10(Math.max(10.0, this.clickPower)) * 0.6) * this.staff[0].level * dt;
      this.addXp(mochiXp);
    }

    // Staff 3: Clara Auto-Buyer (every 3s)
    const autoTick = Math.floor(this.playTime / 3.0);
    if (this.staff[2].level > 0 && autoTick > this.lastAutoBuyTick) {
      this.lastAutoBuyTick = autoTick;
      const disc = this.getDiscountFactor();
      const exp = this.getUpgradeExponent();
      const affordable = this.upgrades.filter((u) => this.beans >= u.getCostSingle(disc, exp));
      if (affordable.length > 0) {
        affordable.sort((a, b) => a.getCostSingle(disc, exp) - b.getCostSingle(disc, exp));
        const cheapest = affordable[0];
        this.beans -= cheapest.getCostSingle(disc, exp);
        cheapest.count += 1;
        this.addXp(35);
        this.recalculateRates();
      }
    }

    // Staff 2: Pip Croissant Scout
    if (this.staff[1].level > 0 && this.croissant.active) {
      if (Math.random() < this.staff[1].level * 0.15 * dt) {
        this.croissant.active = false;
        this.croissantsCaught += 1;
        this.triggerCroissantFrenzy(240, 255, "Pip caught a Croissant!");
      }
    }

    if (this.frenzyTimer > 0 && this.pantheonPerks[1].count < 5) {
      this.frenzyTimer -= dt;
      if (this.frenzyTimer <= 0) {
        this.frenzyTimer = 0.0;
        this.frenzyMult = 1.0;
        this.recalculateRates();
      }
    }

    // Brew Lab Progress
    const speedMult = Math.pow(2.0, this.pantheonPerks[2].count);
    for (const r of this.recipes) {
      if (r.brewing) {
        r.progress += dt * speedMult;
        if (r.progress >= r.brewTime) {
          r.brewing = false;
          r.crafted = true;
          this.addXp(500);
          this.recalculateRates();
          this.sfx.playBrew(this.sfxEnabled, this.sfxVolume);
          this.popups.push(new FloatingPopup(`BREWED: ${r.name}!`, 240, 265, COLORS.success));
        }
      }
    }

    // Customer Orders
    if (this.activeOrder) {
      this.activeOrder.timeRemaining -= dt;
      if (this.activeOrder.timeRemaining <= 0) {
        this.activeOrder = null;
        this.orderTimer = 6.0;
      }
    } else {
      this.orderTimer -= dt;
      if (this.orderTimer <= 0) {
        const craftedNames = this.recipes.filter((r) => r.crafted).map((r) => r.name);
        const target = craftedNames.length > 0
          ? craftedNames[Math.floor(Math.random() * craftedNames.length)]
          : "Classic Espresso";
        this.activeOrder = {
          recipeName: target,
          rewardMult: 1.2 + Math.random() * 1.3,
          timeRemaining: 35.0
        };
      }
    }

    if (this.autoVent && this.boilerTemp >= 95.0 && !this.overheatLockout) {
      this.ventBoiler();
    }
    if (this.autoServe && this.activeOrder) {
      this.serveCurrentOrder();
    }

    // Spring Physics for Mug & Cat
    this.scaleX += (1.0 - this.scaleX) * Math.min(14.0 * dt, 1.0);
    this.scaleY += (1.0 - this.scaleY) * Math.min(14.0 * dt, 1.0);
    this.catScaleX += (1.0 - this.catScaleX) * Math.min(12.0 * dt, 1.0);
    this.catScaleY += (1.0 - this.catScaleY) * Math.min(12.0 * dt, 1.0);

    if (this.rainEnabled) this.weather.update(dt);

    // Croissant Spawn Rate Buffs (dec3, b06, t05)
    let cRate = 1.0 + this.talents[4].rank * 0.08;
    if (this.decor[2].bought) cRate *= this.decor[2].buffVal;
    if (this.recipes[5].crafted) cRate *= this.recipes[5].buffVal;
    this.croissant.update(dt, 440, 632, cRate);

    if (this.particlesEnabled) {
      this.steamTimer += dt;
      if (this.steamTimer >= 0.20) {
        this.steamTimer = 0.0;
        this.steamParticles.push(new SteamPuff(this.mugCenter.x, this.mugCenter.y - 70));
      }
    }

    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      this.steamParticles[i].update(dt);
      if (this.steamParticles[i].life <= 0) this.steamParticles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].update(dt);
      if (this.popups[i].life <= 0) this.popups.splice(i, 1);
    }

    if (this.rng) this.rng.update(dt);

    for (const ach of this.achievements) {
      if (!ach.unlocked && ach.check(this)) {
        ach.unlocked = true;
        this.toastQueue.push(ach);
        this.sfx.playLevelup(this.sfxEnabled, this.sfxVolume);
      }
    }

    if (this.activeToast) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.activeToast = null;
        document.getElementById("achievement-toast").classList.add("hidden");
      }
    } else if (this.toastQueue.length > 0) {
      this.activeToast = this.toastQueue.shift();
      this.toastTimer = 3.5;
      document.getElementById("toast-title").textContent = `Achievement: ${this.activeToast.title}`;
      document.getElementById("toast-desc").textContent = this.activeToast.desc;
      document.getElementById("achievement-toast").classList.remove("hidden");
    }
  }

  drawSceneCanvas() {
    const canvas = document.getElementById("scene-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = this.weather.getWindowColor();
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 16);
    ctx.fill();

    if (this.decor[0].bought) {
      for (let lx = 15; lx < 425; lx += 36) {
        ctx.strokeStyle = "rgb(180, 160, 140)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, 2);
        ctx.lineTo(lx + 18, 14);
        ctx.stroke();

        ctx.fillStyle = "rgb(255, 230, 150)";
        ctx.beginPath();
        ctx.arc(lx + 18, 16, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.decor[1].bought) {
      ctx.fillStyle = "rgb(140, 100, 70)";
      ctx.beginPath();
      ctx.roundRect(20, 16, 24, 18, 3);
      ctx.fill();
      for (const [vy, vrad] of [[34, 6], [46, 8], [60, 7], [72, 5]]) {
        ctx.fillStyle = "rgb(90, 145, 80)";
        ctx.beginPath();
        ctx.arc(32, vy, vrad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.decor[2].bought) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(390, 2);
      ctx.lineTo(390, 26);
      ctx.stroke();
      for (const cxOff of [-6, 0, 6]) {
        ctx.strokeStyle = COLORS.goldHover;
        ctx.beginPath();
        ctx.moveTo(390 + cxOff, 26);
        ctx.lineTo(390 + cxOff, 51 + Math.abs(cxOff) * 3);
        ctx.stroke();
      }
    }

    if (this.rainEnabled) this.weather.drawRain(ctx);

    ctx.strokeStyle = "rgb(200, 190, 180)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 630);
    ctx.lineTo(440, 630);
    ctx.stroke();

    // Sleeping Cat Mochi
    const { x: catX, y: catY } = this.catCenter;
    const rx = 34 * this.catScaleX;
    const ry = 22 * this.catScaleY;
    ctx.fillStyle = "rgb(210, 200, 195)";
    ctx.beginPath();
    ctx.ellipse(catX, catY + 8, rx + 4, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.catFur;
    ctx.beginPath();
    ctx.ellipse(catX, catY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(catX - rx + 4, catY - ry + 6);
    ctx.lineTo(catX - rx + 12, catY - ry - 10);
    ctx.lineTo(catX - rx + 20, catY - ry + 4);
    ctx.fill();

    ctx.fillStyle = COLORS.catEars;
    ctx.beginPath();
    ctx.moveTo(catX - rx + 7, catY - ry + 5);
    ctx.lineTo(catX - rx + 12, catY - ry - 6);
    ctx.lineTo(catX - rx + 17, catY - ry + 4);
    ctx.fill();

    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(catX - 9, catY, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(catX + 9, catY, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();

    this.croissant.draw(ctx);
    if (this.particlesEnabled) {
      for (const s of this.steamParticles) s.draw(ctx);
    }

    // Equipped RNG Aura Halo behind the Mug
    const { x: cx, y: cy } = this.mugCenter;
    if (this.rng && this.rng.equippedIndex >= 0) {
      const eqRarity = RNG_RARITIES[this.rng.equippedIndex];
      const pulse = 92 + Math.sin(performance.now() * 0.004) * 6;
      ctx.save();
      ctx.strokeStyle = eqRarity.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3 + this.rng.equippedIndex * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Coffee Mug
    const w = 75 * this.scaleX;
    const h = 65 * this.scaleY;

    ctx.fillStyle = COLORS.saucer;
    ctx.beginPath();
    ctx.ellipse(cx, cy + h + 3, w * 1.55, 15 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.mug;
    ctx.beginPath();
    ctx.ellipse(cx + w + 13 * this.scaleX, cy - h * 0.4 + 26 * this.scaleY, 21 * this.scaleX, 26 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.weather.getWindowColor();
    ctx.beginPath();
    ctx.ellipse(cx + w + 14 * this.scaleX, cy - h * 0.25 + 17 * this.scaleY, 12 * this.scaleX, 17 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.mug;
    ctx.beginPath();
    ctx.roundRect(cx - w, cy - h, w * 2, h * 2, [0, 0, 32 * this.scaleX, 32 * this.scaleX]);
    ctx.fill();

    ctx.fillStyle = COLORS.mugShadow;
    ctx.beginPath();
    ctx.roundRect(cx - w + 6, cy + h - 14, (w - 6) * 2, 10, [0, 0, 20, 20]);
    ctx.fill();

    ctx.fillStyle = COLORS.mug;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h, w, 13 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.coffee;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h + 2, w - 6, 10 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    const foamY = cy - h - 2 * this.scaleY;
    ctx.fillStyle = COLORS.crema;
    if (this.latteStage === 0) {
      ctx.beginPath();
      ctx.arc(cx - 7, foamY, Math.max(2, 6 * this.scaleX), 0, Math.PI * 2);
      ctx.arc(cx + 7, foamY, Math.max(2, 6 * this.scaleX), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 13, foamY + 1);
      ctx.lineTo(cx + 13, foamY + 1);
      ctx.lineTo(cx, foamY + 10 * this.scaleY);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, foamY + 2, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.popups) p.draw(ctx);
  }

  refreshDOM() {
    const nm = this.notationMode;

    document.getElementById("beans-display").textContent = `${formatNum(this.beans, nm)} Beans`;
    document.getElementById("rates-display").innerHTML = `${formatNum(this.bps, nm)}/s &nbsp;|&nbsp; +${formatNum(this.clickPower, nm)}/sip`;

    let mStr = `Multiplier: ${formatNum(this.totalMultiplier, nm)}x`;
    if (this.frenzyTimer > 0) {
      mStr += this.pantheonPerks[1].count >= 5 ? " (ETERNAL FRENZY)" : ` (FRENZY: ${this.frenzyTimer.toFixed(1)}s)`;
    }
    if (this.purrBlissTimer > 0) mStr += ` (Purr: +${this.purrCombo * 10}%)`;
    if (this.altarBlessings > 0) mStr += ` (Altar: +${this.altarBlessings * 2}%)`;
    if (this.sanctuaryUnlocked) mStr += " ★ SANCTUARY";
    const mEl = document.getElementById("multiplier-display");
    mEl.textContent = `${mStr} ▾`;
    mEl.classList.toggle("frenzy-active", this.frenzyTimer > 0 || this.sanctuaryUnlocked);
    this.renderMultiplierBreakdown();

    const neededXp = this.getXpNeeded(this.level);
    const xpPct = Math.max(0, Math.min(100, (this.xp / neededXp) * 100));
    document.getElementById("level-title").textContent = `Lv. ${this.level} - ${this.getBaristaTitle(this.level)}`;
    document.getElementById("xp-bar-fill").style.width = `${xpPct}%`;

    const availPts = this.getAvailableTalentPoints();
    let xpStr = `${formatNum(this.xp, nm)} / ${formatNum(neededXp, nm)} XP`;
    if (availPts > 0) xpStr += `  (+${availPts} SKILL PTS!)`;
    const xpTextEl = document.getElementById("xp-text");
    xpTextEl.textContent = xpStr;
    xpTextEl.classList.toggle("has-points", availPts > 0);

    const currs = [
      [this.goldenBeans, "Golden", COLORS.gold],
      [this.astralCrystals, "Crystals", COLORS.astral],
      [this.starlightShards, "Shards", COLORS.pantheon],
      [this.darkMatter, "Dark Matter", COLORS.darkMatter],
      [this.supernovaBeans, "Supernova", COLORS.supernova],
      [this.chronosCrystals, "Chronos", COLORS.chronos],
      [this.aetherEssence, "Aether", COLORS.aether],
      [this.omegaSingularity, "Omega Void", COLORS.omega],
      [this.celestialDew, "Dew Drops", COLORS.dew],
      [this.quasarNectar, "Q-Nectar", COLORS.quasar],
      [this.eternalBeans, "Eternal", COLORS.eternal]
    ].filter(([amt]) => amt > 0);

    const gridEl = document.getElementById("currency-grid");
    gridEl.innerHTML = currs
      .map(([amt, name, col]) => `<div class="curr-badge" style="color:${col}"><span class="curr-dot" style="background:${col}"></span>${formatNum(amt, nm)} ${name}</div>`)
      .join("");

    const maxCap = this.getMaxStorage();
    const siloPct = Math.max(0, Math.min(100, (this.beans / maxCap) * 100));
    document.getElementById("silo-text").textContent = `Silo Storage (Lv.${this.siloLevel}): ${formatNum(this.beans, nm)} / ${formatNum(maxCap, nm)}`;
    const siloFill = document.getElementById("silo-bar-fill");
    siloFill.style.width = `${siloPct}%`;
    siloFill.classList.toggle("silo-full", siloPct >= 98);

    const siloCost = this.getSiloUpgradeCost();
    const siloBtn = document.getElementById("btn-silo-upgrade");
    siloBtn.textContent = `+Cap (${formatNum(siloCost, nm)})`;
    siloBtn.disabled = this.beans < siloCost;

    const tPct = Math.max(0, Math.min(100, ((this.boilerTemp - 50.0) / 50.0) * 100));
    let tStatus = "Normal Temperature", tClass = "heat-cold", tFillClass = "heat-cold-fill";
    if (this.overheatLockout) {
      tStatus = "OVERHEATED (-80% Penalty!)"; tClass = "heat-over"; tFillClass = "heat-over-fill";
    } else if (this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0) {
      tStatus = "SWEET SPOT (+50% Extraction!)"; tClass = "heat-optimal"; tFillClass = "heat-optimal-fill";
    } else if (this.boilerTemp > 95.0) {
      tStatus = "WARNING: Boiler Boiling!"; tClass = "heat-warn"; tFillClass = "heat-warn-fill";
    }

    const boilerText = document.getElementById("boiler-text");
    boilerText.textContent = `Boiler: ${Math.floor(this.boilerTemp)}°C  (${tStatus})`;
    boilerText.className = `meter-label ${tClass}`;

    const boilerFill = document.getElementById("boiler-bar-fill");
    boilerFill.style.width = `${tPct}%`;
    boilerFill.className = `progress-fill ${tFillClass}`;

    document.getElementById("btn-auto-vent").classList.toggle("active", this.autoVent);

    const disc = this.getDiscountFactor();
    const exp = this.getUpgradeExponent();

    if (this.activeTab === "menu") {
      for (const upg of this.upgrades) {
        const { qty, cost } = upg.getBulkInfo(this.buyMode, this.beans, disc, exp);
        const afford = this.beans >= cost;
        const mMult = upg.getMilestoneMult();
        document.getElementById(`card-${upg.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`acc-${upg.uid}`).className = `card-accent ${afford ? "" : "accent-muted"}`;
        document.getElementById(`cnt-${upg.uid}`).textContent = `x${upg.count} (+${qty})${mMult > 1 ? ` [${formatNum(mMult, nm)}x]` : ""}`;
        const costEl = document.getElementById(`cost-${upg.uid}`);
        costEl.textContent = `Cost: ${formatNum(cost, nm)} beans`;
        costEl.className = `card-cost ${afford ? "cost-afford" : "cost-locked"}`;
      }
    } else if (this.activeTab === "staff") {
      for (const st of this.staff) {
        const cost = this.getStaffCost(st);
        const afford = this.beans >= cost;
        document.getElementById(`card-${st.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`lvl-${st.uid}`).textContent = `Level: ${st.level}`;
        const btn = document.getElementById(`btn-${st.uid}`);
        btn.textContent = formatNum(cost, nm);
        btn.className = `btn ${afford ? "btn-gold" : "btn-disabled"}`;
      }
    } else if (this.activeTab === "decor") {
      for (const dec of this.decor) {
        const afford = !dec.bought && this.beans >= dec.cost;
        document.getElementById(`card-${dec.uid}`).classList.toggle("locked", !dec.bought && !afford);
        document.getElementById(`acc-${dec.uid}`).className = `card-accent ${dec.bought ? "accent-success" : afford ? "" : "accent-muted"}`;
        const btn = document.getElementById(`btn-${dec.uid}`);
        if (dec.bought) {
          btn.textContent = "PLACED";
          btn.className = "btn btn-success";
          btn.disabled = true;
        } else {
          btn.textContent = formatNum(dec.cost, nm);
          btn.className = `btn ${afford ? "btn-accent" : "btn-disabled"}`;
          btn.disabled = !afford;
        }
      }
    } else if (this.activeTab === "brew") {
      for (const rec of this.recipes) {
        const afford = !rec.crafted && !rec.brewing && this.beans >= rec.costBeans;
        document.getElementById(`card-${rec.uid}`).classList.toggle("locked", !rec.crafted && !afford);
        document.getElementById(`acc-${rec.uid}`).className = `card-accent ${rec.crafted ? "accent-success" : afford ? "" : "accent-muted"}`;
        const btn = document.getElementById(`btn-${rec.uid}`);
        if (rec.crafted) {
          btn.textContent = "MASTERED";
          btn.className = "btn btn-success";
          btn.disabled = true;
        } else if (rec.brewing) {
          btn.textContent = `${Math.floor((rec.progress / rec.brewTime) * 100)}%`;
          btn.className = "btn btn-gold";
          btn.disabled = true;
        } else {
          btn.textContent = formatNum(rec.costBeans, nm);
          btn.className = `btn ${afford ? "btn-accent" : "btn-disabled"}`;
          btn.disabled = !afford;
        }
      }
    } else if (this.activeTab === "orders") {
      const asBtn = document.getElementById("btn-auto-serve");
      asBtn.textContent = this.autoServe ? "Auto-Serve: ON" : "Auto-Serve: OFF";
      asBtn.className = `btn btn-sm ${this.autoServe ? "btn-success" : "btn-secondary"}`;
      document.getElementById("customer-stars-display").textContent = `Customer Stars Collected: ${this.customerStars} ★ (+${this.customerStars * 2}% Multiplier)`;

      const titleEl = document.getElementById("order-title");
      const timerEl = document.getElementById("order-timer");
      const serveBtn = document.getElementById("btn-serve-order");

      if (this.activeOrder) {
        titleEl.textContent = `Current Order: ${this.activeOrder.recipeName}`;
        timerEl.textContent = `Time Remaining: ${Math.ceil(this.activeOrder.timeRemaining)}s`;
        const rec = this.recipes.find((r) => r.name === this.activeOrder.recipeName);
        const canServe = rec && rec.crafted;
        serveBtn.classList.remove("hidden");
        serveBtn.textContent = canServe ? "Serve Drink!" : "Recipe Not Mastered";
        serveBtn.disabled = !canServe;
      } else {
        titleEl.textContent = "Waiting for next customer...";
        timerEl.textContent = "";
        serveBtn.classList.add("hidden");
      }
    } else if (this.activeTab === "plinko") {
      document.querySelectorAll(".plinko-curr-btn").forEach((b) => {
        const active = b.dataset.curr === this.plinko.currencyType;
        b.classList.toggle("active", active);
        b.style.backgroundColor = active ? b.dataset.color : "";
      });
      const bias = this.plinko.getCurrencyBias(this.talents[4].rank * 0.03);
      document.getElementById("plinko-risk-label").textContent = `${this.plinko.currencyType.replace("_", " ").toUpperCase()}: Bias Handicap ${Math.round(bias * 100)}%`;

      const bal = this.getCurrencyBalance(this.plinko.currencyType);
      const maxBet = this.plinko.getMaxBet(bal);
      document.getElementById("plinko-bal-label").textContent = `Bal: ${formatNum(bal, nm)} (Max: ${formatNum(maxBet, nm)})`;
      const betVal = this.plinko.parseBetAmount(document.getElementById("plinko-bet-input").value, bal);
      const dropBtn = document.getElementById("btn-plinko-drop");
      dropBtn.textContent = `DROP (${formatNum(betVal, nm)})`;
      dropBtn.disabled = bal < betVal || betVal <= 0;

      const pCanvas = document.getElementById("plinko-canvas");
      this.plinko.draw(pCanvas.getContext("2d"));
    } else if (this.activeTab === "talents") {
      const { chance, mult } = this.getCritStats();
      document.getElementById("talent-points-display").innerHTML = `Unspent Points: ${availPts} &nbsp;|&nbsp; Crit: ${Math.round(chance * 100)}% (${mult.toFixed(1)}x)`;
      for (const t of this.talents) {
        const can = availPts >= 1 && t.rank < t.maxRank;
        document.getElementById(`card-${t.uid}`).classList.toggle("locked", !can);
        document.getElementById(`acc-${t.uid}`).className = `card-accent ${can ? "accent-gold" : "accent-muted"}`;
        document.getElementById(`rnk-${t.uid}`).textContent = t.rank >= t.maxRank ? `MAX (${t.rank}/${t.maxRank})` : `Rank ${t.rank}/${t.maxRank}`;
        const btn = document.getElementById(`btn-${t.uid}`);
        btn.className = `btn ${can ? "btn-gold" : "btn-disabled"}`;
        btn.disabled = !can;
      }
      for (const m of this.milestones) {
        const can = this.level >= m.targetLvl && !m.claimed;
        const btn = document.getElementById(`btn-ms-${m.targetLvl}`);
        if (m.claimed) {
          btn.textContent = "CLAIMED"; btn.className = "btn btn-disabled"; btn.disabled = true;
        } else if (can) {
          btn.textContent = "CLAIM!"; btn.className = "btn btn-success"; btn.disabled = false;
        } else {
          btn.textContent = `Lv. ${m.targetLvl}`; btn.className = "btn btn-disabled"; btn.disabled = true;
        }
      }
    } else if (this.activeTab === "rng") {
      this.rng.refreshDOM();
    } else if (this.activeTab === "sinks") {
      document.getElementById("altar-title").textContent = `Altar of the Roast (Blessings: ${this.altarBlessings} ★)`;
      document.getElementById("btn-altar-sacrifice").disabled = this.beans < 1e6;

      document.getElementById("btn-tr1").disabled = this.beans < 500e6;
      document.getElementById("btn-tr2").disabled = this.goldenBeans < 250;
      document.getElementById("btn-tr3").disabled = this.astralCrystals < 100;

      for (const snk of this.sinks) {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const cost = snk.getCostSingle();
        const can = bal >= cost;
        document.getElementById(`ttl-${snk.uid}`).textContent = `${snk.name} (Lv. ${snk.level})`;
        const costEl = document.getElementById(`cost-${snk.uid}`);
        costEl.textContent = `Cost: ${formatNum(cost, nm)} ${snk.currencyType}`;
        costEl.className = `card-cost ${can ? "cost-afford" : "cost-locked"}`;
        document.getElementById(`b1-${snk.uid}`).disabled = !can;
        document.getElementById(`b25-${snk.uid}`).disabled = !can;
        document.getElementById(`b90-${snk.uid}`).disabled = !can;
      }
    } else if (this.activeTab === "cosmos") {
      for (const cf of this.cosmicForgeDefs) {
        const can = cf.can();
        document.getElementById(`own-${cf.id}`).textContent = `Owned: ${formatNum(cf.getOwned(), nm)}`;
        const btn = document.getElementById(`btn-${cf.id}`);
        btn.disabled = !can;
        btn.style.backgroundColor = can ? cf.col : "";
      }
      const ready = this.checkGoalCompletion();
      const banner = document.getElementById("sanctuary-goal-banner");
      banner.classList.toggle("ready", ready);
      banner.classList.toggle("unlocked", this.sanctuaryUnlocked);
      if (this.sanctuaryUnlocked) {
        banner.textContent = "★ OMNIVERSAL SANCTUARY ACTIVE: +2500% PRODUCTION AURA ★";
      } else if (ready) {
        banner.textContent = "★ CLICK TO AWAKEN THE OMNIVERSAL SANCTUARY (+2500% MULT) ★";
      } else {
        banner.textContent = "GOAL: Lv.100, 12 Recipes, Silo 45, 10 OSB, 1 Eternal Bean";
      }

      for (const cp of this.cosmicPerks) {
        const bal = this.getCurrencyBalance(cp.currencyType);
        const cost = cp.getCostSingle();
        const can = bal >= cost;
        document.getElementById(`ttl-${cp.uid}`).textContent = `${cp.name} (Lv. ${cp.level})`;
        const costEl = document.getElementById(`cost-${cp.uid}`);
        costEl.textContent = `Cost: ${formatNum(cost, nm)} ${cp.currencyType.toUpperCase()} (Have: ${formatNum(bal, nm)})`;
        costEl.className = `card-cost ${can ? "cost-afford" : "cost-locked"}`;
        const btn = document.getElementById(`btn-${cp.uid}`);
        btn.disabled = !can;
        btn.style.backgroundColor = can ? COLORS.omega : "";
      }
    } else if (this.activeTab === "roast") {
      document.getElementById("roast-bal-header").textContent = `Available: ${formatNum(this.goldenBeans, nm)} Golden Beans`;
      const pending = this.getPendingGoldenBeans();
      const banner = document.getElementById("btn-trigger-rebirth");
      banner.classList.toggle("ready", pending > 0);
      document.getElementById("rebirth-status-text").textContent = pending > 0
        ? `Claim +${formatNum(pending, nm)} Golden Beans`
        : `${formatNum(this.lifetimeBeansRun, nm)} / ${formatNum(this.getRebirthThreshold(), nm)} beans`;

      for (const upg of this.roasteryUpgrades) {
        const cost = this.getRoasteryCost(upg);
        const afford = this.goldenBeans >= cost && upg.count < upg.maxLvl;
        document.getElementById(`card-${upg.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`cnt-${upg.uid}`).textContent = `${upg.count}/${upg.maxLvl}`;
        const costEl = document.getElementById(`cost-${upg.uid}`);
        costEl.textContent = upg.count >= upg.maxLvl ? "Completed" : `Cost: ${formatNum(cost, nm)} Golden Beans`;
        costEl.className = `card-cost ${afford ? "cost-afford" : "cost-locked"}`;
      }
    } else if (this.activeTab === "dynasty") {
      document.getElementById("dynasty-bal-header").textContent = `Available: ${formatNum(this.astralCrystals, nm)} Astral Crystals`;
      const pending = this.getPendingAstralCrystals();
      const banner = document.getElementById("btn-trigger-dynasty");
      banner.classList.toggle("ready", pending > 0);
      document.getElementById("dynasty-status-text").textContent = pending > 0
        ? `Claim +${formatNum(pending, nm)} Astral Crystals`
        : `${formatNum(this.lifetimeGolden, nm)} / ${formatNum(this.getDynastyThreshold(), nm)} golden beans`;

      for (const perk of this.dynastyPerks) {
        const afford = this.astralCrystals >= perk.cost && perk.count < perk.maxLvl;
        document.getElementById(`card-${perk.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`cnt-${perk.uid}`).textContent = `${perk.count}/${perk.maxLvl}`;
        const costEl = document.getElementById(`cost-${perk.uid}`);
        costEl.textContent = perk.count >= perk.maxLvl ? "Completed" : `Cost: ${formatNum(perk.cost, nm)} Astral Crystals`;
        costEl.className = `card-cost ${afford ? "cost-afford" : "cost-locked"}`;
      }
    } else if (this.activeTab === "pantheon") {
      document.getElementById("pantheon-bal-header").textContent = `Available: ${formatNum(this.starlightShards, nm)} Starlight Shards`;
      const pending = this.getPendingStarlightShards();
      const banner = document.getElementById("btn-trigger-pantheon");
      banner.classList.toggle("ready", pending > 0);
      document.getElementById("pantheon-status-text").textContent = pending > 0
        ? `Claim +${formatNum(pending, nm)} Starlight Shards`
        : `${formatNum(this.lifetimeCrystals, nm)} / ${formatNum(this.getPantheonThreshold(), nm)} astral crystals`;

      for (const perk of this.pantheonPerks) {
        const afford = this.starlightShards >= perk.cost && perk.count < perk.maxLvl;
        document.getElementById(`card-${perk.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`cnt-${perk.uid}`).textContent = `${perk.count}/${perk.maxLvl}`;
        const costEl = document.getElementById(`cost-${perk.uid}`);
        costEl.textContent = perk.count >= perk.maxLvl ? "Completed" : `Cost: ${formatNum(perk.cost, nm)} Starlight Shards`;
        costEl.className = `card-cost ${afford ? "cost-afford" : "cost-locked"}`;
      }
    } else if (this.activeTab === "quests") {
      for (const q of this.quests) {
        const ready = q.currentVal >= q.targetVal && !q.completed;
        document.getElementById(`prog-${q.qid}`).textContent = q.completed ? "COMPLETED" : `Progress: ${q.currentVal} / ${q.targetVal}`;
        const btn = document.getElementById(`btn-${q.qid}`);
        if (q.completed) {
          btn.textContent = "CLAIMED"; btn.className = "btn btn-sm btn-disabled"; btn.disabled = true;
        } else if (ready) {
          btn.textContent = "CLAIM!"; btn.className = "btn btn-sm btn-success"; btn.disabled = false;
        } else {
          btn.textContent = "IN PROGRESS"; btn.className = "btn btn-sm btn-disabled"; btn.disabled = true;
        }
      }
    } else if (this.activeTab === "config") {
      const sfxBtn = document.getElementById("btn-cfg-sfx");
      sfxBtn.textContent = this.sfxEnabled ? "ENABLED" : "MUTED";
      sfxBtn.className = `btn btn-cfg ${this.sfxEnabled ? "btn-success" : "btn-danger"}`;

      document.querySelectorAll(".vol-btn").forEach((b) => {
        b.classList.toggle("active", Math.abs(parseFloat(b.dataset.vol) - this.sfxVolume) < 0.01);
      });

      const rainBtn = document.getElementById("btn-cfg-rain");
      rainBtn.textContent = this.rainEnabled ? "ENABLED" : "OFF";
      rainBtn.className = `btn btn-cfg ${this.rainEnabled ? "btn-success" : "btn-danger"}`;

      const ptBtn = document.getElementById("btn-cfg-particles");
      ptBtn.textContent = this.particlesEnabled ? "ENABLED" : "OFF";
      ptBtn.className = `btn btn-cfg ${this.particlesEnabled ? "btn-success" : "btn-danger"}`;

      document.getElementById("btn-cfg-notation").textContent = this.notationMode === "suffix" ? "Suffixes (1.5M)" : "Scientific (1e6)";
      document.getElementById("btn-cfg-wipe").textContent = this.wipeConfirmActive ? "CLICK AGAIN TO CONFIRM" : "Wipe All Save Data";
    }
  }
}

// =============================================================================
// 11. BOOTSTRAP & 60FPS REQUESTANIMATIONFRAME LOOP
// =============================================================================

window.addEventListener("DOMContentLoaded", () => {
  const game = new GameState();
  let lastTime = performance.now();
  let saveTimer = 0.0;

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000.0, 0.1);
    lastTime = now;

    game.update(dt);
    game.drawSceneCanvas();
    game.refreshDOM();

    saveTimer += dt;
    if (saveTimer >= 30.0) {
      saveTimer = 0.0;
      game.saveGame();
    }

    requestAnimationFrame(loop);
  }

  window.addEventListener("beforeunload", () => game.saveGame());
  requestAnimationFrame(loop);
});