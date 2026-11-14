/**
 * Rainy Cafe: Grand Master Edition — Complete Web Engine (game.js — Part 1 of 4)
 * Polyfills, Retina Scaling, Formatters, 30-Currency Registry, Procedural Audio + Rain,
 * Weather & Condensation Wiping, Juggle Beans, 30-Currency Plinko & Upgrade Models
 */

// 4-Corner roundRect Polyfill (Supports [tl, tr, br, bl] arrays for rounded mug base)
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    let tl = 0, tr = 0, br = 0, bl = 0;
    if (Array.isArray(r)) {
      tl = r[0] || 0;
      tr = r[1] ?? tl;
      br = r[2] ?? tl;
      bl = r[3] ?? tr;
    } else if (typeof r === "number") {
      tl = tr = br = bl = r;
    }
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

function enableRetinaCanvas(canvas, logicalW, logicalH) {
  if (!canvas) return;
  canvas.width = logicalW;
  canvas.height = logicalH;
}

// =============================================================================
// 1. MATHEMATICAL FORMATTERS, 30-CURRENCY REGISTRY & SPECIALTY ALCHEMY DEFS
// =============================================================================

const SUFFIXES = [
  "", "K", "M", "B", "T", "Qd", "Qn", "Sx", "Sp", "Oc", "No",
  "Dc", "Ud", "Dd", "Td", "Qad", "Qnd", "Sxd", "Spd", "Ocd", "Nod", "Vg"
];

const SUFFIX_GUIDE = [
  { sym: "K", name: "Thousand (10³)" },
  { sym: "M", name: "Million (10⁶)" },
  { sym: "B", name: "Billion (10⁹)" },
  { sym: "T", name: "Trillion (10¹²)" },
  { sym: "Qd", name: "Quadrillion (10¹⁵)" },
  { sym: "Qn", name: "Quintillion (10¹⁸)" },
  { sym: "Sx", name: "Sextillion (10²¹)" },
  { sym: "Sp", name: "Septillion (10²⁴)" },
  { sym: "Oc", name: "Octillion (10²⁷)" },
  { sym: "No", name: "Nonillion (10³⁰)" },
  { sym: "Dc", name: "Decillion (10³³)" },
  { sym: "Ud+", name: "Undecillion+ (10³⁶+)" }
];

function safeNum(val, fallback = 0) {
  return Number.isFinite(val) && val >= 0 ? val : fallback;
}

function formatNum(val, notation = "suffix") {
  if (!Number.isFinite(val)) return "Infinity";
  if (val < 0) return "-" + formatNum(-val, notation);
  if (val < 1000.0) {
    if (Math.abs(val - Math.round(val)) < 1e-6) {
      return Math.round(val).toString();
    }
    return val < 10 ? val.toFixed(2) : val.toFixed(1);
  }
  if (notation === "scientific") {
    return val.toExponential(2);
  }
  let exp = Math.floor(Math.log10(Math.max(val, 1.0)) / 3.0);
  if (exp >= SUFFIXES.length) {
    return val.toExponential(2);
  }
  let scaled = val / Math.pow(1000.0, exp);
  if (scaled >= 999.95 && exp + 1 < SUFFIXES.length) {
    exp += 1;
    scaled = val / Math.pow(1000.0, exp);
  }
  return scaled >= 100.0
    ? `${scaled.toFixed(1)}${SUFFIXES[exp]}`
    : `${scaled.toFixed(2)}${SUFFIXES[exp]}`;
}

const COLORS = {
  bg: "#eee8e0",
  windowRain: "#afbcc6",
  text: "#3a2a22",
  textLight: "#7d685d",
  textMuted: "#9e8b80",
  accent: "#c66c44",
  card: "#fcf9f6",
  cardLocked: "#f2ece4",
  tokens: "#e67e22",
  gold: "#d49a2a",
  goldHover: "#ebb241",
  goldBg: "#fff9eb",
  astral: "#5a82d2",
  pantheon: "#a55fd7",
  darkMatter: "#4b2d6e",
  supernova: "#f56e23",
  chronos: "#28aa69",
  aether: "#23afc8",
  omega: "#e63c8c",
  celestialDew: "#4ba5eb",
  quasarNectar: "#eba519",
  voidTruffle: "#6e3255",
  nebulaHoney: "#d7871e",
  solarisAmber: "#e65f2d",
  genesisCrema: "#9146d2",
  eternalBean: "#f04ba5",
  // 12 Specialty & Endgame Colors
  raindropPearl: "#2980b9",
  velvetCrema: "#b87333",
  paradoxDust: "#8e44ad",
  royalSeal: "#c0392b",
  chronosSand: "#16a085",
  purrWhisker: "#e67e22",
  singularityFrag: "#d62b7c",
  architectInk: "#2c3e50",
  voidRelic: "#6c3483",
  franchiseDeed: "#1f618d",
  aetherCaramel: "#d35400",
  omniverseSeed: "#ff007f",
  mug: "#f8f4ee",
  mugShadow: "#d7d0c8",
  coffee: "#342014",
  crema: "#e1c3aa",
  saucer: "#d7cdc3",
  catFur: "#f2b982",
  catEars: "#f59191",
  success: "#417d50",
  danger: "#af4b4b",
  star: "#d99b26",
  heatCold: "#4682b4"
};

const CURRENCY_META = [
  { key: "beans", name: "Coffee Beans", short: "Beans", tier: "Core", color: COLORS.text, desc: "Primary currency earned by clicking the mug and running cafe equipment." },
  { key: "stars", name: "Customer Stars", short: "Stars ★", tier: "Service", color: COLORS.star, desc: "Earned from Orders, Quests & Memory Match (+2% global multiplier each)." },
  { key: "tokens", name: "Arcade Tokens", short: "Tokens 🪙", tier: "Arcade", color: COLORS.tokens, desc: "Earned from Arcade minigames & Quests; spent on permanent Arcade Prizes." },
  { key: "golden", name: "Golden Beans", short: "Golden", tier: "Prestige 1", color: COLORS.gold, desc: "Claimed on Roastery Rebirth (+15% additive & compounding multiplier + Roastery perks)." },
  { key: "astral", name: "Astral Crystals", short: "Crystals", tier: "Prestige 2", color: COLORS.astral, desc: "Claimed on Franchise Dynasty Ascension (+25% passive multiplier each + Dynasty perks)." },
  { key: "shards", name: "Starlight Shards", short: "Shards", tier: "Prestige 3", color: COLORS.pantheon, desc: "Claimed on Cosmic Pantheon Ascension (+100% passive multiplier each + Constellation perks)." },
  { key: "dark_matter", name: "Dark Matter Roast", short: "Dark Matter", tier: "Cosmic 1", color: COLORS.darkMatter, desc: "Forged from 100 Sp Beans (+100% global multiplier each)." },
  { key: "supernova", name: "Supernova Bean", short: "Supernova", tier: "Cosmic 2", color: COLORS.supernova, desc: "Forged from 10 Oc Beans (+250% global multiplier each)." },
  { key: "chronos", name: "Chronos Crystal", short: "Chronos", tier: "Cosmic 3", color: COLORS.chronos, desc: "Forged from 1 No Beans (+600% global multiplier & +2% offline efficiency each)." },
  { key: "aether", name: "Aetherial Essence", short: "Aether", tier: "Cosmic 4", color: COLORS.aether, desc: "Forged from 100 No Beans (+1,500% global multiplier each)." },
  { key: "omega", name: "Omega Singularity", short: "Omega", tier: "Cosmic 5", color: COLORS.omega, desc: "Forged from 10 Dc Beans (+7,500% global multiplier each)." },
  { key: "dew", name: "Celestial Dew", short: "Dew Drops", tier: "Cosmic 6", color: COLORS.celestialDew, desc: "Forged from 1 No Beans + 10 Shards (+25,000% mult & faster Raindrop Pearls)." },
  { key: "quasar", name: "Quasar Nectar", short: "Quasar", tier: "Cosmic 7", color: COLORS.quasarNectar, desc: "Forged from 100 No Beans + 3 Omega Singularity (+100,000% mult each)." },
  { key: "void_truffle", name: "Void Truffle", short: "Truffles", tier: "Cosmic 8", color: COLORS.voidTruffle, desc: "Forged from 500 Sp Beans + 5 Dark Matter (+150,000% mult & +10% Crit)." },
  { key: "nebula_honey", name: "Nebula Honey", short: "N-Honey", tier: "Cosmic 9", color: COLORS.nebulaHoney, desc: "Forged from 50 Oc Beans + 5 Supernova (+200,000% mult & +25% Tips)." },
  { key: "solaris_amber", name: "Solaris Amber", short: "S-Amber", tier: "Cosmic 10", color: COLORS.solarisAmber, desc: "Forged from 5 No Beans + 10 Chronos (+300,000% mult & +0.5x RNG Luck)." },
  { key: "genesis_crema", name: "Genesis Crema", short: "Genesis", tier: "Cosmic 11", color: COLORS.genesisCrema, desc: "Forged from 500 No Beans + 5 Aether + 5 Truffles (+400,000% mult each)." },
  { key: "eternal", name: "Eternal Bean", short: "Eternal", tier: "Pinnacle", color: COLORS.eternalBean, desc: "Ultimate Cosmic Currency (+500,000% mult; required for Sanctuary)." },
  { key: "raindrop_pearls", name: "Raindrop Pearls", short: "Pearls 💧", tier: "Specialty 1", color: COLORS.raindropPearl, desc: "Click Shimmering Raindrops or wipe foggy glass! Raises Soft-Cap & Offline efficiency." },
  { key: "velvet_crema", name: "Velvet Crema Essence", short: "Crema Ess.", tier: "Specialty 2", color: COLORS.velvetCrema, desc: "Distilled while keeping the Boiler in the green Sweet Spot (85°C–95°C). Upgrades Boiler mechanics." },
  { key: "paradox_dust", name: "Paradox Dust", short: "P-Dust ✨", tier: "Specialty 3", color: COLORS.paradoxDust, desc: "Salvage duplicate RNG Auras or hit Pity Charges. Sockets traits onto equipped Auras." },
  { key: "royal_seals", name: "Royal Coffee Seals", short: "Seals 👑", tier: "Specialty 4", color: COLORS.royalSeal, desc: "Earned from VIP Food Critics (every 5th order). Lets you keep Silo/Recipes across Rebirths." },
  { key: "chronos_sand", name: "Chronos Hourglass Sand", short: "Time Sand", tier: "Specialty 5", color: COLORS.chronosSand, desc: "Condensed automatically when Silo Storage is 100% full! Speeds up Brews, Auto-Rolls & Synthesis." },
  { key: "purr_whiskers", name: "Purr-Charm Whiskers", short: "Whiskers 🐾", tier: "Specialty 6", color: COLORS.purrWhisker, desc: "Dropped when petting Mochi at 5x Purr Bliss! Unlocks Auto-Silo, Auto-Brew & Auto-Rebirth." },
  { key: "singularity_frags", name: "Singularity Core Fragments", short: "Sing-Frags", tier: "Endgame 1", color: COLORS.singularityFrag, desc: "Condensed automatically while your Raw Multiplier exceeds the Soft-Cap! Raises compression exponent." },
  { key: "architect_ink", name: "Architect's Ink", short: "Arch. Ink", tier: "Endgame 2", color: COLORS.architectInk, desc: "Earned from 5★ RNG Auras, Lv.500+ Menu milestones & Cosmic 10x Plinko Jackpots. Rewrites core formulas." },
  { key: "void_relics", name: "Void-Rift Relics", short: "Void Relics", tier: "Endgame 3", color: COLORS.voidRelic, desc: "Extracted when rolling Transcendent+ (1 in 5M+) Auras. Unlocks Dual-Aura Equip & Rarity Floors." },
  { key: "franchise_deeds", name: "Multiversal Franchise Deeds", short: "M-Deeds", tier: "Endgame 4", color: COLORS.franchiseDeed, desc: "Earned on Pantheon Ascension with 1,000+ Shards or Sanctuary. Generates passive Golden/Crystals/Shards." },
  { key: "aether_caramels", name: "Aether-Flame Caramels", short: "Caramels", tier: "Endgame 5", color: COLORS.aetherCaramel, desc: "Earned by landing Crit Sips during Frenzy + 5x Purr + Sweet Spot simultaneously! Unlocks Frenzy Stacking." },
  { key: "omniverse_seeds", name: "Omniverse Seeds", short: "Omni-Seeds", tier: "Tier 4 Reset", color: COLORS.omniverseSeed, desc: "Harvested via Omniversal Transcendence after awakening Sanctuary. Exponential ^1.015 production & Auto-Forge." }
];

function getCurrencyName(key) {
  const found = CURRENCY_META.find((c) => c.key === key);
  return found ? found.name : key;
}

const SPECIALTY_UPGRADES = [
  { id: "sp1", name: "Pearl Soft-Cap Expander", curr: "raindrop_pearls", baseCost: 3, scale: 1.65, max: 30, color: COLORS.raindropPearl, desc: "Multiplies your Soft-Cap threshold by 5x per rank & +3% Offline efficiency" },
  { id: "sp2", name: "Velvet Crema Overdrive", curr: "velvet_crema", baseCost: 5, scale: 1.60, max: 20, color: COLORS.velvetCrema, desc: "Boosts Boiler Sweet-Spot bonus (+25%/rank) & eliminates Overheat penalty at Lv.5" },
  { id: "sp3", name: "Royal Prestige Keepers", curr: "royal_seals", baseCost: 2, scale: 1.85, max: 10, color: COLORS.royalSeal, desc: "Keep +3 Silo Levels & +1 Brew Recipe permanently through Rebirths & Dynasties" },
  { id: "sp4", name: "Temporal Flow Accelerator", curr: "chronos_sand", baseCost: 10, scale: 1.55, max: 25, color: COLORS.chronosSand, desc: "Accelerates Brew Lab, Auto-Rolls & Synthesis speed by +12% per rank (also +1%/held)" },
  { id: "sp5", name: "Mochi Grand Automation Suite", curr: "purr_whiskers", baseCost: 3, scale: 2.20, max: 3, color: COLORS.purrWhisker, desc: "Lv.1: Unlocks Auto-Silo | Lv.2: Unlocks Auto-Brew | Lv.3: Unlocks Auto-Rebirth" },
  { id: "sp6", name: "Singularity Exponent Stabilizer", curr: "singularity_frags", baseCost: 5, scale: 1.80, max: 15, color: COLORS.singularityFrag, desc: "Raises Soft-Cap compression exponent by +0.015 per rank (0.65 -> up to 0.875)" },
  { id: "sp7", name: "Architect's Golden Ledger", curr: "architect_ink", baseCost: 2, scale: 2.00, max: 10, color: COLORS.architectInk, desc: "Rewrites math: Menu milestones +0.1x, Spoon conversion +2%/rank, Star exponent +0.002" },
  { id: "sp8", name: "Void Dual-Aura Catalyst", curr: "void_relics", baseCost: 1, scale: 3.00, max: 4, color: COLORS.voidRelic, desc: "Lv.1: Unlocks 2nd Sub-Aura Slot | Lv.2+: Bans Common/Uncommon/Rare from Standard Rolls" },
  { id: "sp9", name: "Multiversal Passive Royalties", curr: "franchise_deeds", baseCost: 1, scale: 1.75, max: 15, color: COLORS.franchiseDeed, desc: "Passively generates +2%/s of pending Golden Beans, Astral Crystals & Starlight Shards" },
  { id: "sp10", name: "Aether Super-Frenzy Reactor", curr: "aether_caramels", baseCost: 2, scale: 1.90, max: 10, color: COLORS.aetherCaramel, desc: "Catching Croissants during Frenzy stacks Frenzy Mult (up to 49x/343x) & adds Mega-Crit chance" },
  { id: "sp11", name: "Omniversal Auto-Forge Matrix", curr: "omniverse_seeds", baseCost: 1, scale: 2.50, max: 5, color: COLORS.omniverseSeed, desc: "Lv.1: Unlocks Auto-Forge for all 12 Cosmic Forges | Lv.2+: Doubles Cosmic Forge output" },
  { id: "sp12", name: "Chronos Instant 30-Min Warp", curr: "chronos_sand", baseCost: 25, scale: 1.0, max: 999999, color: COLORS.chronosSand, isConsumable: true, desc: "Instant Action: Consumes 25 Time Sand to jump forward 30 minutes of full BPS & XP" }
];

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

function drawShimmeringRaindrop(ctx, cx, cy, radius = 11) {
  ctx.save();
  const grad = ctx.createRadialGradient(cx - 2, cy - 3, 2, cx, cy, radius * 1.4);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.5, "#5dade2");
  grad.addColorStop(1, "rgba(41, 128, 185, 0.15)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 1.4);
  ctx.bezierCurveTo(cx + radius, cy - radius * 0.2, cx + radius, cy + radius, cx, cy + radius);
  ctx.bezierCurveTo(cx - radius, cy + radius, cx - radius, cy - radius * 0.2, cx, cy - radius * 1.4);
  ctx.fill();
  ctx.restore();
}

// =============================================================================
// 3. WEB AUDIO API PROCEDURAL SYNTHESIZER + LOOPING RAIN AMBIENCE
// =============================================================================

class PureSoundEngine {
  constructor() {
    this.ctx = null;
    this.sampleRate = 44100;
    this.buffers = {};
    this.rainSource = null;
    this.rainGain = null;
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

  updateRainAmbience(active, volume = 1.0) {
    if (!active || volume <= 0 || !this.ctx || this.ctx.state !== "running") {
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      }
      return;
    }

    if (!this.rainSource) {
      const len = this.sampleRate * 3;
      const buf = this.ctx.createBuffer(1, len, this.sampleRate);
      const data = buf.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 1.8;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 650;
      filter.Q.value = 0.6;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();

      this.rainSource = src;
      this.rainGain = gain;
    }
    this.rainGain.gain.setTargetAtTime(0.055 * volume, this.ctx.currentTime, 0.25);
  }
  playCelestialTick(progress = 0.5, enabled = true, volume = 1.0) {
    if (!enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520 + progress * 680, now);
    gain.gain.setValueAtTime(0.08 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playRoasterTick(progress = 0.5, enabled = true, volume = 1.0) {
    if (!enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160 + progress * 140, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);
    gain.gain.setValueAtTime(0.14 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playSuspenseBuild(enabled = true, volume = 1.0) {
    if (!enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.65);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.11 * volume, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.72);
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
// 4. ENVIRONMENT, WINDOW CONDENSATION WIPING, STEAM, CROISSANT & JUGGLE BEANS
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

    this.pearlDrop = null;
    this.pearlTimer = 12.0;

    // Window Condensation Fog (Wipe clear with mouse movement for Raindrop Pearls)
    this.fogAlpha = 0.0;
    this.wipeSteps = 0;
  }

  update(dt) {
    this.timeOfDay = (this.timeOfDay + dt * (4.0 / 60.0)) % 24.0;
    this.fogAlpha = Math.min(0.36, this.fogAlpha + 0.012 * dt);

    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.22 * dt;
      if (d.y > this.height || d.x < -20) {
        d.y = -d.len;
        d.x = Math.random() * (this.width + 120);
      }
    }

    if (!this.pearlDrop) {
      this.pearlTimer -= dt;
      if (this.pearlTimer <= 0) {
        this.pearlTimer = 26.0 + Math.random() * 18.0;
        this.pearlDrop = {
          x: 60 + Math.random() * (this.width - 120),
          y: 165,
          vy: 28 + Math.random() * 14
        };
      }
    } else {
      this.pearlDrop.y += this.pearlDrop.vy * dt;
      this.pearlDrop.x += Math.sin(this.pearlDrop.y * 0.04) * 8.0 * dt;
      if (this.pearlDrop.y > this.height - 165) {
        this.pearlDrop = null;
      }
    }
  }

  wipeFog(onClearRewardFn) {
    if (this.fogAlpha <= 0.04) return;
    this.fogAlpha = Math.max(0.0, this.fogAlpha - 0.012);
    this.wipeSteps += 1;
    if (this.wipeSteps >= 35 && this.fogAlpha <= 0.05) {
      this.wipeSteps = 0;
      if (onClearRewardFn) onClearRewardFn();
    }
  }

  checkPearlClick(x, y) {
    if (!this.pearlDrop) return false;
    if (Math.hypot(x - this.pearlDrop.x, y - this.pearlDrop.y) <= 24) {
      this.pearlDrop = null;
      return true;
    }
    return false;
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

    if (this.pearlDrop) {
      drawShimmeringRaindrop(ctx, this.pearlDrop.x, this.pearlDrop.y, 11);
    }
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

class JuggleBean {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() < 0.5 ? -1 : 1) * (85 + Math.random() * 65);
    this.vy = -290 - Math.random() * 60;
    this.bounces = 0;
    this.alive = true;
  }

  update(dt) {
    this.vy += 520 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 30) {
      this.x = 30;
      this.vx = Math.abs(this.vx);
    } else if (this.x > 420) {
      this.x = 420;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y > 510) {
      this.alive = false;
    }
  }

  checkClick(x, y) {
    if (!this.alive) return false;
    if (Math.hypot(x - this.x, y - this.y) <= 24) {
      this.bounces += 1;
      this.vy = -275 - Math.random() * 45;
      this.vx = (Math.random() - 0.5) * 210;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();
    ctx.fillStyle = COLORS.gold;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 12, 9, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#3a2a22";
    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.pow(2, this.bounces + 1)}x`, this.x, this.y + 3.5);
    ctx.restore();
  }
}

class GoldenCroissantEvent {
  constructor() {
    this.active = false;
    this.x = -50;
    this.y = 260;
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
    this.y = 265 + Math.random() * Math.max(80, height - 430);
    this.vx = 55.0 + Math.random() * 30.0;
    this.vy = -12.0 + Math.random() * 24.0;
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
// 5. 30-CURRENCY PLINKO PHYSICS SIMULATOR (WITH COZY / STANDARD / HIGH RISK)
// =============================================================================

class MultiCurrencyPlinko {
  constructor(width = 545, height = 350) {
    this.width = width;
    this.height = height;
    this.xCenter = width / 2;
    this.yTop = 4;
    this.pegR = 4;
    this.ballR = 6.2;
    this.gravity = 420.0;
    this.dx = 38;
    this.dy = 28.5;
    this.numRows = 9;

    this.pegs = [];
    for (let r = 0; r < this.numRows; r++) {
      const count = r + 3;
      const startX = this.xCenter - ((count - 1) * this.dx) / 2.0;
      const rowY = this.yTop + 44 + r * this.dy;
      for (let c = 0; c < count; c++) {
        this.pegs.push({ x: startX + c * this.dx, y: rowY });
      }
    }

    this.binY = this.yTop + 44 + (this.numRows - 1) * this.dy + 22;
    this.riskMode = "standard";
    this.riskTables = {
      cozy:     [3.0, 2.0, 1.4, 0.9, 0.7, 0.7, 0.9, 1.4, 2.0, 3.0],
      standard: [10.0, 4.0, 1.8, 0.6, 0.25, 0.25, 0.6, 1.8, 4.0, 10.0],
      high:     [25.0, 6.0, 1.5, 0.3, 0.1, 0.1, 0.3, 1.5, 6.0, 25.0]
    };
    this.multipliers = this.riskTables.standard;
    this.numBins = this.multipliers.length;
    const totalSpan = this.numBins * this.dx;
    this.binStartX = this.xCenter - totalSpan / 2.0;

    this.currencyType = "beans";
    this.balls = [];
    this.popups = [];
    this.lastPegSoundMs = 0;
  }

  setRiskMode(mode) {
    if (this.riskTables[mode]) {
      this.riskMode = mode;
      this.multipliers = this.riskTables[mode];
    }
  }

  getCurrencyBias(talentReduction = 0.0) {
    const biasMap = {
      beans: 0.0, stars: 0.15, tokens: 0.15, golden: 0.20, astral: 0.35, shards: 0.50,
      dark_matter: 0.60, supernova: 0.70, chronos: 0.78, aether: 0.85, omega: 0.90,
      dew: 0.92, quasar: 0.94, void_truffle: 0.94, nebula_honey: 0.95,
      solaris_amber: 0.95, genesis_crema: 0.96, eternal: 0.97,
      raindrop_pearls: 0.55, velvet_crema: 0.55, paradox_dust: 0.60,
      royal_seals: 0.65, chronos_sand: 0.65, purr_whiskers: 0.65,
      singularity_frags: 0.88, architect_ink: 0.90, void_relics: 0.92,
      franchise_deeds: 0.94, aether_caramels: 0.92, omniverse_seeds: 0.97
    };
    const base = biasMap[this.currencyType] || 0.0;
    return Math.max(0.0, base - talentReduction);
  }

  getMaxBet(currentBalance) {
    if (currentBalance < 1) return 0;
    if (currentBalance < 10) return 1;
    return Math.floor(currentBalance * 0.10);
  }

  parseBetAmount(str, currentBalance) {
    const maxAllowed = this.getMaxBet(currentBalance);
    if (maxAllowed <= 0) return 0;

    let s = (str || "").trim().toLowerCase();
    let mult = 1.0;

    const orderedSuffixes = SUFFIXES
      .map((suf, idx) => ({ suf: suf.toLowerCase(), idx }))
      .filter((item) => item.suf.length > 0)
      .sort((a, b) => b.suf.length - a.suf.length);

    for (const { suf, idx } of orderedSuffixes) {
      if (s.endsWith(suf)) {
        mult = Math.pow(1000.0, idx);
        s = s.slice(0, -suf.length);
        break;
      }
    }

    let val = parseFloat(s) * mult;
    if (!Number.isFinite(val) || val <= 0) val = 1.0;
    return Math.max(1.0, Math.min(maxAllowed, Math.floor(val)));
  }

  dropBall(xPos, betStr, currentBalance, talentReduction = 0.0, overrideBet = null) {
    const betAmt = overrideBet !== null ? overrideBet : this.parseBetAmount(betStr, currentBalance);
    if (currentBalance < betAmt || betAmt <= 0) return { success: false, amount: 0 };

    const clampedX = Math.max(this.xCenter - 110, Math.min(this.xCenter + 110, xPos));
    this.balls.push({
      x: clampedX + (-6 + Math.random() * 12),
      y: this.yTop + 26,
      vx: -18.0 + Math.random() * 36.0,
      vy: 10.0 + Math.random() * 20.0,
      bet: betAmt,
      currency: this.currencyType,
      bias: this.getCurrencyBias(talentReduction)
    });
    return { success: true, amount: betAmt };
  }

  getPendingRefundsByCurrency() {
    const refunds = {};
    for (const b of this.balls) {
      refunds[b.currency] = (refunds[b.currency] || 0) + b.bet;
    }
    return refunds;
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

            const nowMs = performance.now();
            if (nowMs - this.lastPegSoundMs > 45) {
              this.lastPegSoundMs = nowMs;
              sfx.playTap(sfxEnabled, sfxVol * 0.5);
            }
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

    const stripW = 280, stripH = 22;
    const stripX = this.xCenter - stripW / 2;
    const stripY = this.yTop + 4;
    ctx.fillStyle = COLORS.card;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(stripX, stripY, stripW, stripH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.textLight;
    ctx.font = "600 10.5px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CLICK STRIP TO AIM LAUNCH (10% MAX BET)", this.xCenter, stripY + 15);

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

    for (let idx = 0; idx < this.multipliers.length; idx++) {
      const mult = this.multipliers[idx];
      const bx = this.binStartX + idx * this.dx;
      let bg = COLORS.cardLocked, border = COLORS.textMuted, tc = COLORS.textMuted;
      if (mult >= 6.0) {
        bg = COLORS.goldBg; border = COLORS.gold; tc = "rgb(160, 105, 15)";
      } else if (mult >= 1.4) {
        bg = "rgb(235, 248, 238)"; border = COLORS.success; tc = COLORS.success;
      }

      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.roundRect(bx + 2, this.binY, this.dx - 4, 26, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = tc;
      ctx.font = "bold 10.5px 'Segoe UI', sans-serif";
      ctx.fillText(`${mult}x`, bx + this.dx / 2, this.binY + 17);
    }

    for (const b of this.balls) {
      const { x: bx, y: by, currency: curr } = b;
      const meta = CURRENCY_META.find((m) => m.key === curr);
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
        ctx.fillStyle = meta ? meta.color : COLORS.omega;
        ctx.beginPath();
        ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const pop of this.popups) {
      pop.draw(ctx);
    }
  }
}

// =============================================================================
// 6. GAME DATA MODELS (WITH LOG-SPACE OVERFLOW PROTECTION & NEXT MILESTONE)
// =============================================================================

const UPGRADE_MILESTONES = [25, 50, 100, 250, 500, 1000];

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

  getNextMilestone() {
    for (const th of UPGRADE_MILESTONES) {
      if (this.count < th) return th;
    }
    return null;
  }

  getMilestoneMult(baseStep = 2.0) {
    let m = 1.0;
    for (const th of UPGRADE_MILESTONES) {
      if (this.count >= th) m *= baseStep;
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
    if (buyMode === "next") {
      const nextM = this.getNextMilestone();
      const qty = nextM ? Math.max(1, nextM - this.count) : 25;
      const cost = baseC * Math.pow(r, this.count) * ((Math.pow(r, qty) - 1.0) / (r - 1.0));
      return { qty, cost: Math.max(1.0, cost) };
    }
    if (buyMode === "max") {
      const currentUnit = baseC * Math.pow(r, this.count);
      if (currentBeans < currentUnit || !Number.isFinite(currentUnit)) {
        return { qty: 1, cost: currentUnit };
      }
      // Log-space calculation prevents Infinity overflow near 1e300
      const logRatio = Math.log(currentBeans) - Math.log(currentUnit) + Math.log(r - 1.0);
      let qty = Math.max(1, Math.floor(logRatio / Math.log(r)));
      let cost = currentUnit * ((Math.pow(r, qty) - 1.0) / (r - 1.0));
      while (cost > currentBeans && qty > 1) {
        qty -= 1;
        cost = currentUnit * ((Math.pow(r, qty) - 1.0) / (r - 1.0));
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
    if (budget < cUnit || !Number.isFinite(cUnit)) return { qty: 0, cost: cUnit };
    const r = this.costScale;
    const logRatio = Math.log(budget) - Math.log(cUnit) + Math.log(r - 1.0);
    let k = Math.max(1, Math.floor(logRatio / Math.log(r)));
    let totalCost = cUnit * ((Math.pow(r, k) - 1.0) / (r - 1.0));
    while (totalCost > budget && k > 1) {
      k -= 1;
      totalCost = cUnit * ((Math.pow(r, k) - 1.0) / (r - 1.0));
    }
    return { qty: k, cost: totalCost };
  }
}
// =============================================================================
// 7. 15-TIER GRINDY RNG AURA SYSTEM, PARADOX TRAITS, GEAR FORGE & CUTSCENES
// =============================================================================

const RNG_RARITIES = [
  {
    index: 0, id: "common", tierName: "Common", auraName: "House Blend Steam",
    odds: 2, color: "#9e8c80", cssClass: "tier-common",
    buffType: "bps", baseBuff: 0.05, desc: "+5% Passive BPS"
  },
  {
    index: 1, id: "uncommon", tierName: "Uncommon", auraName: "Velvet Crema Glow",
    odds: 5, color: "#3e8e57", cssClass: "tier-uncommon",
    buffType: "click", baseBuff: 0.12, desc: "+12% Click Power"
  },
  {
    index: 2, id: "rare", tierName: "Rare", auraName: "Raindrop Lo-Fi Pulse",
    odds: 15, color: "#3670c7", cssClass: "tier-rare",
    buffType: "global", baseBuff: 0.25, desc: "+25% Global Multiplier"
  },
  {
    index: 3, id: "epic", tierName: "Epic", auraName: "Midnight Roast Vortex",
    odds: 50, color: "#9b59b6", cssClass: "tier-epic",
    buffType: "global", baseBuff: 0.60, desc: "+60% Global Multiplier"
  },
  {
    index: 4, id: "legendary", tierName: "Legendary", auraName: "Golden Sovereign Crown",
    odds: 250, color: "#f39c12", cssClass: "tier-legendary",
    buffType: "global", baseBuff: 1.50, desc: "+150% Global Mult & +0.25 Base Luck"
  },
  {
    index: 5, id: "mythic", tierName: "Mythic", auraName: "Crimson Supernova Core",
    odds: 1250, color: "#e74c3c", cssClass: "tier-mythic",
    buffType: "global", baseBuff: 4.50, desc: "+450% Global Mult & +50% Click Power"
  },
  {
    index: 6, id: "exotic", tierName: "Exotic", auraName: "Prismatic Nebula Brew",
    odds: 6000, color: "#00d2ff", cssClass: "tier-exotic",
    buffType: "global", baseBuff: 15.00, desc: "+1,500% Global Mult & +0.50 Base Luck"
  },
  {
    index: 7, id: "secret", tierName: "Secret", auraName: "Abyssal Cipher Espresso",
    odds: 25000, color: "#c266ff", cssClass: "tier-secret",
    buffType: "global", baseBuff: 50.00, desc: "+5,000% Global Mult & +1.5x Crit Mult"
  },
  {
    index: 8, id: "very_secret", tierName: "Very Secret", auraName: "Chronos Dimensional Rift",
    odds: 100000, color: "#00ffcc", cssClass: "tier-very-secret",
    buffType: "global", baseBuff: 250.00, desc: "+25,000% Global Mult & +20% Roll Speed"
  },
  {
    index: 9, id: "nearly_impossible", tierName: "Nearly Impossible", auraName: "Omniversal Singularity Bean",
    odds: 1000000, color: "#ffdd44", cssClass: "tier-impossible",
    buffType: "global", baseBuff: 2500.00, desc: "+250,000% Global Mult & +1.00 Base Luck"
  },
  {
    index: 10, id: "transcendent", tierName: "Transcendent", auraName: "Astral Seraphim Pour",
    odds: 5000000, color: "#ffd166", cssClass: "tier-transcendent",
    buffType: "global", baseBuff: 10000.00, desc: "+1,000,000% Global Mult & +25% Roll Speed"
  },
  {
    index: 11, id: "primordial", tierName: "Primordial", auraName: "Genesis Nebula Core",
    odds: 25000000, color: "#ff9e00", cssClass: "tier-primordial",
    buffType: "global", baseBuff: 50000.00, desc: "+5,000,000% Global Mult & +25% Forge Yields"
  },
  {
    index: 12, id: "dimensional", tierName: "Dimensional", auraName: "Void-Shatter Paradox",
    odds: 100000000, color: "#00f5d4", cssClass: "tier-dimensional",
    buffType: "global", baseBuff: 250000.00, desc: "+25,000,000% Global Mult & +1 Multi-Roll"
  },
  {
    index: 13, id: "omnipotent", tierName: "Omnipotent", auraName: "Sovereign Eclipse Crown",
    odds: 500000000, color: "#ffd700", cssClass: "tier-omnipotent",
    buffType: "global", baseBuff: 1000000.00, desc: "+100,000,000% Global Mult & 10x Soft-Cap"
  },
  {
    index: 14, id: "beyond_reality", tierName: "Beyond Reality", auraName: "The Rainy Architect's True Roast",
    odds: 2500000000, color: "#ff66cc", cssClass: "tier-beyond-reality",
    buffType: "global", baseBuff: 10000000.00, desc: "+1,000,000,000% Global Mult & 1.5x Final Luck"
  }
];

class RNGManager {
  constructor(game) {
    this.game = game;
    this.totalRolls = 0;
    this.counts = new Array(RNG_RARITIES.length).fill(0);
    this.fiveStarAwarded = new Array(RNG_RARITIES.length).fill(false);
    this.equippedIndex = -1;
    this.subEquippedIndex = -1;

    this.isRolling = false;
    this.rollTimer = 0.0;
    this.rollDuration = 2.20;
    this.lastTickStep = -1;
    this.activeRollMode = "standard";
    this.pendingCosts = {};
    this.pendingResult = null;
    this.batchResults = [];

    this.autoRoll = false;
    this.fastRoll = false;
    this.turboRoll = false;
    this.cutsceneThreshold = 4;

    this.traitSockets = [
      { id: "rt1", name: "Prism Luck Socket", baseCost: 15, scale: 1.55, level: 0, max: 30, desc: "+0.35 Base Luck per socket rank" },
      { id: "rt2", name: "Chrono Reel Socket", baseCost: 20, scale: 1.50, level: 0, max: 25, desc: "+10% Roll Speed per socket rank" },
      { id: "rt3", name: "Quantum Resonance Socket", baseCost: 30, scale: 1.65, level: 0, max: 20, desc: "+15% Passive Multiplier on all unlocked Auras per rank" }
    ];

    this.upgrades = [
      { id: "ru1", name: "Four-Leaf Clover Syrup", curr: "beans", baseCost: 1000, scale: 1.75, level: 0, max: 50, desc: "+0.12 Base Luck per level" },
      { id: "ru2", name: "Turbo Steam Bearings", curr: "beans", baseCost: 2500, scale: 1.65, level: 0, max: 50, desc: "+6% Roll Speed/lvl (Unlocks Fast at Lv.10, Turbo at Lv.30)" },
      { id: "ru3", name: "Golden Dice Infuser", curr: "golden", baseCost: 10, scale: 1.65, level: 0, max: 30, desc: "+0.35 Base Luck per level" },
      { id: "ru4", name: "Astral Quantum Dice", curr: "astral", baseCost: 5, scale: 2.35, level: 0, max: 5, desc: "+1 Simultaneous Roll per spin (Multi-Roll)" }
    ];

    this.gear = [
      {
        id: "rg1", name: "Clover Tamp Charm", crafted: false,
        luckBonus: 0.50, speedBonus: 0.0, multiRollBonus: 0,
        currType: "beans", currCost: 2500,
        auras: [{ idx: 0, qty: 25 }, { idx: 1, qty: 8 }, { idx: 2, qty: 2 }],
        effectDesc: "+0.50 Base Luck permanently"
      },
      {
        id: "rg2", name: "Brass Escapement Gear", crafted: false,
        luckBonus: 0.75, speedBonus: 0.25, multiRollBonus: 0,
        currType: "golden", currCost: 5,
        auras: [{ idx: 0, qty: 80 }, { idx: 1, qty: 30 }, { idx: 2, qty: 10 }, { idx: 3, qty: 2 }],
        effectDesc: "+25% Roll Speed & +0.75 Base Luck"
      },
      {
        id: "rg3", name: "Twin-Spout Portafilter", crafted: false,
        luckBonus: 1.25, speedBonus: 0.0, multiRollBonus: 1,
        currType: "golden", currCost: 25,
        auras: [{ idx: 1, qty: 100 }, { idx: 2, qty: 35 }, { idx: 3, qty: 10 }, { idx: 4, qty: 1 }],
        effectDesc: "+1 Multi-Roll & +1.25 Base Luck"
      },
      {
        id: "rg4", name: "Astral Astrolabe", crafted: false,
        luckBonus: 2.50, speedBonus: 0.35, multiRollBonus: 0,
        currType: "astral", currCost: 10,
        auras: [{ idx: 2, qty: 150 }, { idx: 3, qty: 45 }, { idx: 4, qty: 8 }, { idx: 5, qty: 1 }],
        effectDesc: "+35% Roll Speed & +2.50 Base Luck"
      },
      {
        id: "rg5", name: "Omniversal Crown Gauntlet", crafted: false,
        luckBonus: 5.00, speedBonus: 0.50, multiRollBonus: 1,
        currType: "shards", currCost: 10,
        auras: [{ idx: 3, qty: 100 }, { idx: 4, qty: 25 }, { idx: 5, qty: 5 }, { idx: 6, qty: 1 }],
        effectDesc: "+1 Multi-Roll, +50% Roll Speed & +5.00 Base Luck"
      }
    ];

    this.cutsceneActive = false;
    this.cutsceneTier = null;
    this.cutsceneTime = 0.0;
    this.cutsceneDuration = 4.0;
    this.particles = [];
  }

  getTraitCost(t) {
    return Math.max(1, Math.floor(t.baseCost * Math.pow(t.scale, t.level)));
  }

  getUpgradeCost(u) {
    return Math.max(1, Math.floor(u.baseCost * Math.pow(u.scale, u.level)));
  }

  getRollCosts(mode = "standard") {
    const beanBase = Math.max(15, Math.floor(this.game.bps * 0.6 + this.game.clickPower * 2.5));
    if (mode === "golden") {
      return { beans: beanBase * 5, golden: 2 };
    }
    if (mode === "astral") {
      return { astral: 1, shards: 1 };
    }
    return { beans: beanBase };
  }

  canAffordRoll(mode = "standard") {
    const costs = this.getRollCosts(mode);
    for (const [curr, amt] of Object.entries(costs)) {
      if (this.game.getCurrencyBalance(curr) < amt) return false;
    }
    return true;
  }

  getPendingRefunds() {
    return this.isRolling ? { ...this.pendingCosts } : {};
  }

  isDualAuraUnlocked() {
    return this.game.getSpecialtyLevel ? this.game.getSpecialtyLevel("sp8") >= 1 : false;
  }

  getStandardRarityFloor() {
    if (!this.game.getSpecialtyLevel) return 0;
    const sp8 = this.game.getSpecialtyLevel("sp8");
    if (sp8 >= 4) return 3;
    if (sp8 >= 3) return 2;
    if (sp8 >= 2) return 1;
    return 0;
  }

  getStarRank(owned) {
    if (owned >= 5000) return { stars: 5, mult: 5.00, next: null };
    if (owned >= 1000) return { stars: 4, mult: 2.50, next: 5000 };
    if (owned >= 250) return { stars: 3, mult: 1.60, next: 1000 };
    if (owned >= 50) return { stars: 2, mult: 1.25, next: 250 };
    if (owned >= 10) return { stars: 1, mult: 1.10, next: 50 };
    return { stars: 0, mult: 1.00, next: 10 };
  }

  getMasteredFiveStarCount() {
    let count = 0;
    for (let i = 0; i < RNG_RARITIES.length; i++) {
      if (this.counts[i] >= 5000) count += 1;
    }
    return count;
  }

  getNextPityInfo() {
    const nextRoll = this.totalRolls + 1;
    if (nextRoll % 1000 === 0) return { mult: 12.0, dust: 100, label: "OVERDRIVE CHARGE READY (12x Luck + 100 Dust)!", pct: 100 };
    if (nextRoll % 250 === 0) return { mult: 5.0, dust: 25, label: "SUPER CHARGE READY (5x Luck + 25 Dust)!", pct: 100 };
    if (nextRoll % 50 === 0) return { mult: 2.0, dust: 5, label: "LUCK CHARGE READY (2x Luck + 5 Dust)!", pct: 100 };

    const rem50 = 50 - (this.totalRolls % 50);
    const pct = ((this.totalRolls % 50) / 50) * 100;
    const upcomingMult = (this.totalRolls + rem50) % 1000 === 0 ? "12x"
      : (this.totalRolls + rem50) % 250 === 0 ? "5x" : "2x";
    return {
      mult: 1.0,
      dust: 0,
      label: `Next Luck Charge (${upcomingMult}) in ${rem50} rolls`,
      pct
    };
  }

  dissolveDuplicates() {
    const dustRates = [1, 3, 10, 35, 120, 400];
    let totalDust = 0;
    for (let i = 0; i <= 5; i++) {
      const reserve = 100;
      if (this.counts[i] > reserve) {
        const excess = this.counts[i] - reserve;
        this.counts[i] = reserve;
        totalDust += excess * dustRates[i];
      }
    }
    if (totalDust > 0) {
      this.game.paradoxDust += totalDust;
      this.game.addXp(50 + Math.floor(Math.log10(totalDust + 1) * 40));
      this.game.recalculateRates();
      this.game.markDirty();
      this.game.sfx.playCosmic(this.game.sfxEnabled, this.game.sfxVolume);
      this.game.popups.push(new FloatingPopup(`+${formatNum(totalDust, this.game.notationMode)} Paradox Dust!`, 245, 240, COLORS.paradoxDust));
    } else {
      this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
    }
  }

  getTotalLuck(modeMult = 1.0, includePity = false) {
    let rawLuck = 1.0;
    rawLuck += this.upgrades[0].level * 0.12;
    rawLuck += this.upgrades[2].level * 0.35;
    rawLuck += this.traitSockets[0].level * 0.35;

    for (const g of this.gear) {
      if (g.crafted) rawLuck += g.luckBonus;
    }

    if (this.counts[4] > 0) rawLuck += 0.25;
    if (this.counts[6] > 0) rawLuck += 0.50;
    if (this.counts[9] > 0) rawLuck += 1.00;
    rawLuck += this.getMasteredFiveStarCount() * 0.10;

    rawLuck += this.game.talents[4].rank * 0.15;
    rawLuck += this.game.solarisAmber * 0.50;
    if (this.game.arcade) {
      rawLuck += this.game.arcade.shopUpgrades[2].level * 0.15;
    }

    let effectiveLuck = rawLuck > 12.0
      ? 12.0 + Math.pow(rawLuck - 12.0, 0.72)
      : rawLuck;

    if (this.counts[14] > 0) effectiveLuck *= 1.50;
    effectiveLuck *= modeMult;

    if (includePity) {
      effectiveLuck *= this.getNextPityInfo().mult;
    }
    return effectiveLuck;
  }

  isFastRollUnlocked() {
    return this.upgrades[1].level >= 10;
  }

  isTurboRollUnlocked() {
    return this.upgrades[1].level >= 30;
  }

  getRollDuration() {
    let speedMult = 1.0 + this.upgrades[1].level * 0.06 + this.traitSockets[1].level * 0.10;
    for (const g of this.gear) {
      if (g.crafted) speedMult += g.speedBonus;
    }
    if (this.counts[8] > 0) speedMult += 0.20;
    if (this.counts[10] > 0) speedMult += 0.25;

    if (this.game.getTemporalSpeedMult) {
      speedMult *= this.game.getTemporalSpeedMult();
    }

    let dur = 2.20 / speedMult;
    if (this.turboRoll && this.isTurboRollUnlocked()) {
      dur *= 0.25;
    } else if (this.fastRoll && this.isFastRollUnlocked()) {
      dur *= 0.55;
    }
    return Math.max(0.08, dur);
  }

  getMultiRollCount() {
    let count = 1 + this.upgrades[3].level;
    for (const g of this.gear) {
      if (g.crafted) count += g.multiRollBonus;
    }
    if (this.counts[12] > 0) count += 1;
    return count;
  }

  getTierMultiplier(idx) {
    const r = RNG_RARITIES[idx];
    const owned = this.counts[idx];
    if (owned <= 0) return 0.0;
    const starBonus = this.getStarRank(owned).mult;
    const logBonus = 1.0 + Math.log10(owned) * 0.35;
    const socketMult = 1.0 + this.traitSockets[2].level * 0.15;
    const equipMult = this.equippedIndex === idx ? 2.0 : (this.isDualAuraUnlocked() && this.subEquippedIndex === idx ? 1.5 : 1.0);
    return r.baseBuff * starBonus * logBonus * socketMult * equipMult;
  }

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
      bpsMult: 1.0 + bpsBonus,
      softCapMult: this.counts[13] > 0 ? 10.0 : 1.0,
      cosmicYieldMult: this.counts[11] > 0 ? 1.25 : 1.0
    };
  }

  pickRandomRarity(mode = "standard") {
    const modeMult = mode === "astral" ? 4.0 : mode === "golden" ? 2.0 : 1.0;
    const baseFloor = this.getStandardRarityFloor();
    const minIndex = Math.max(baseFloor, mode === "astral" ? 2 : mode === "golden" ? 1 : 0);
    const totalLuck = this.getTotalLuck(modeMult, true);

    for (let i = RNG_RARITIES.length - 1; i >= minIndex + 1; i--) {
      const r = RNG_RARITIES[i];
      const chance = Math.min(0.45, totalLuck / r.odds);
      if (Math.random() < chance) {
        return r;
      }
    }
    return RNG_RARITIES[minIndex];
  }

  startRoll(modeOrIsAuto = "standard", isAuto = false) {
    let mode = "standard";
    let autoFlag = isAuto;
    if (typeof modeOrIsAuto === "boolean") {
      autoFlag = modeOrIsAuto;
      mode = this.activeRollMode || "standard";
    } else {
      mode = modeOrIsAuto || "standard";
    }

    if (this.isRolling || this.cutsceneActive) return;

    if (!this.canAffordRoll(mode)) {
      if (autoFlag && mode !== "standard" && this.canAffordRoll("standard")) {
        mode = "standard";
        this.activeRollMode = "standard";
      } else {
        if (!autoFlag) this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        return;
      }
    }

    const costs = this.getRollCosts(mode);
    for (const [curr, amt] of Object.entries(costs)) {
      this.game.deductCurrency(curr, amt);
    }

    this.activeRollMode = mode;
    this.pendingCosts = costs;
    this.isRolling = true;
    this.rollTimer = 0.0;
    this.lastTickStep = -1;
    this.suspenseTriggered = false;

    const rolls = this.getMultiRollCount();
    let best = RNG_RARITIES[0];
    this.batchResults = [];
    for (let c = 0; c < rolls; c++) {
      const picked = this.pickRandomRarity(mode);
      this.batchResults.push(picked);
      if (picked.index > best.index) best = picked;
    }
    this.pendingResult = best;

    // Build a 24-card roulette tape ending on the winning aura
    this.hasSuspenseTease = best.index >= 4 && !this.turboRoll && !autoFlag;
    this.rollDuration = this.hasSuspenseTease
      ? Math.max(2.65, this.getRollDuration() * 1.25)
      : this.getRollDuration();

    this.reelTape = [];
    for (let i = 0; i < 24; i++) {
      this.reelTape.push(RNG_RARITIES[Math.floor(Math.random() * Math.min(RNG_RARITIES.length, 8))]);
    }
    this.decoyRarity = RNG_RARITIES[Math.min(3, Math.max(2, best.index - 2))];
    this.reelTape[22] = this.hasSuspenseTease ? this.decoyRarity : best;

    document.getElementById("rng-result-readout").classList.add("hidden");
    document.getElementById("rng-roulette-track-wrap").classList.remove("hidden");
    document.getElementById("rng-suspense-banner").classList.add("hidden");
  }
  renderRouletteFrame(centerIdx, isTeasing = false) {
    const cardsEl = document.getElementById("rng-roulette-cards");
    if (!cardsEl) return;
    const left = this.reelTape[Math.max(0, centerIdx - 1)] || RNG_RARITIES[0];
    const center = this.reelTape[Math.min(this.reelTape.length - 1, centerIdx)] || RNG_RARITIES[0];
    const right = this.reelTape[Math.min(this.reelTape.length - 1, centerIdx + 1)] || RNG_RARITIES[1];

    const renderSlot = (r, isCenter) => `
      <div class="rng-slot-card${isCenter ? " center" : ""}${isCenter && isTeasing ? " tease-shake" : ""}" style="border-color: ${r.color};">
        <div class="rng-slot-tier" style="color: ${r.color};">${r.tierName}</div>
        <div class="rng-slot-name">${r.auraName}</div>
      </div>
    `;
    cardsEl.innerHTML = renderSlot(left, false) + renderSlot(center, true) + renderSlot(right, false);
  }

  completeRoll() {
    this.isRolling = false;
    this.rollTimer = 0.0;
    this.pendingCosts = {};

    let hadNewDiscovery = false;
    let voidRelicsFound = 0;
    let architectInkEarned = 0;

    for (const res of this.batchResults) {
      const pity = this.getNextPityInfo();
      if (pity.dust > 0) {
        this.game.paradoxDust += pity.dust;
      }

      const isFirstDiscovery = this.counts[res.index] === 0;
      if (isFirstDiscovery) hadNewDiscovery = true;
      this.totalRolls += 1;
      this.counts[res.index] += 1;

      if (res.index >= 10) {
        this.game.voidRelics += 1;
        voidRelicsFound += 1;
      }

      if (this.counts[res.index] >= 5000 && !this.fiveStarAwarded[res.index]) {
        this.fiveStarAwarded[res.index] = true;
        this.game.architectInk += 2;
        architectInkEarned += 2;
      }

      if (this.equippedIndex === -1 || (isFirstDiscovery && res.index > this.equippedIndex)) {
        if (this.isDualAuraUnlocked() && this.equippedIndex !== -1 && this.subEquippedIndex === -1) {
          this.subEquippedIndex = this.equippedIndex;
        }
        this.equippedIndex = res.index;
      }
    }

    if (voidRelicsFound > 0) {
      this.game.popups.push(new FloatingPopup(`+${voidRelicsFound} VOID-RIFT RELIC!`, 245, 215, COLORS.voidRelic));
    }
    if (architectInkEarned > 0) {
      this.game.popups.push(new FloatingPopup(`5★ MASTERY! +${architectInkEarned} Architect's Ink!`, 245, 195, COLORS.architectInk));
    }

    const r = this.pendingResult;
    this.setStageDisplay(r, false);
    this.game.addXp(22 * (r.index + 1));
    this.game.recalculateRates();
    this.game.markDirty();

    const shouldPlayCutscene =
      (this.cutsceneThreshold === 98 && hadNewDiscovery && r.index >= 4) ||
      (this.cutsceneThreshold < 98 && r.index >= this.cutsceneThreshold);

    if (shouldPlayCutscene) {
      this.triggerCutscene(r);
    } else if (r.index >= 2) {
      this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
    } else {
      this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.7);
    }
  }

  craftGear(gearObj) {
    if (gearObj.crafted) return;
    if (this.game.getCurrencyBalance(gearObj.currType) < gearObj.currCost) {
      this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
      return;
    }
    for (const req of gearObj.auras) {
      if (this.counts[req.idx] < req.qty) {
        this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        return;
      }
    }

    this.game.deductCurrency(gearObj.currType, gearObj.currCost);
    for (const req of gearObj.auras) {
      this.counts[req.idx] -= req.qty;
    }
    gearObj.crafted = true;
    this.game.addXp(450);
    this.game.recalculateRates();
    this.game.saveGame();
    this.game.sfx.playLevelup(this.game.sfxEnabled, this.game.sfxVolume);
    this.game.popups.push(new FloatingPopup(`CRAFTED GEAR: ${gearObj.name}!`, 245, 240, COLORS.gold));
  }

  resetStageDisplay() {
    const badge = document.getElementById("rng-current-tier-badge");
    const nameEl = document.getElementById("rng-current-aura-name");
    const oddsEl = document.getElementById("rng-current-odds");
    const buffEl = document.getElementById("rng-current-buff");
    if (!badge) return;
    badge.className = "rng-tier-badge tier-common";
    badge.textContent = "READY TO ROLL";
    nameEl.textContent = "Click Roll to Test Your Fate";
    nameEl.style.color = "#ffffff";
    oddsEl.textContent = "15 Rarities Available (Up to 1 in 2.50B)";
    buffEl.textContent = "Farm duplicate auras to craft Gear & reach 5★ Mastery!";
    document.getElementById("rng-roll-bar").style.width = "0%";
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
    oddsEl.textContent = `Base Odds: 1 in ${formatNum(r.odds, this.game.notationMode)}`;
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
      9: [130.81, 261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5],
      10: [329.63, 415.30, 493.88, 659.25, 830.61, 987.77, 1318.51],
      11: [110.0, 164.81, 220.0, 329.63, 440.0, 659.25, 880.0],
      12: [293.66, 369.99, 440.0, 587.33, 739.99, 880.0, 1174.66],
      13: [98.0, 146.83, 196.0, 293.66, 392.0, 587.33, 783.99, 1174.66],
      14: [130.81, 196.0, 261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
    };
    const notes = notesByTier[tierIndex] || notesByTier[4];
    const dur = tierIndex >= 12 ? 4.5 : tierIndex >= 8 ? 3.6 : 2.4;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tierIndex >= 10 ? "sine" : tierIndex >= 7 ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const peak = (0.14 / Math.sqrt(notes.length)) * this.game.sfxVolume;
      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(peak, now + idx * 0.08 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + dur + 0.05);
    });
  }

  triggerCutscene(r) {
    this.cutsceneActive = true;
    this.cutsceneTier = r;
    this.cutsceneTime = 0.0;
    this.cutsceneDuration = r.index >= 13 ? 6.0 : r.index >= 9 ? 5.0 : r.index >= 7 ? 4.0 : 3.0;

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
    const count = 45 + r.index * 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 290;
      this.particles.push({
        x: 560,
        y: 350,
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
    // PHASE 1 (0.0s - 1.15s): Mystery Vortex & Heartbeat Suspense Buildup
    const buildupDur = 1.15;
    const tierEl = document.getElementById("rng-cutscene-tier");
    const nameEl = document.getElementById("rng-cutscene-name");
    const oddsEl = document.getElementById("rng-cutscene-odds");

    if (t < buildupDur) {
      const p = t / buildupDur;
      tierEl.textContent = "✦ FATE CONVERGING ✦";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ★✦◈❖";
      nameEl.textContent = Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      oddsEl.textContent = "???";

      // Converging light beams & pulsing mystery core
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + t * 3.5;
        const innerR = (1 - p) * 280 + 25;
        const outerR = innerR + 140;
        ctx.strokeStyle = this.cutsceneTier.color;
        ctx.globalAlpha = 0.25 + p * 0.65;
        ctx.lineWidth = 2 + p * 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * innerR, Math.sin(ang) * innerR);
        ctx.lineTo(Math.cos(ang) * outerR, Math.sin(ang) * outerR);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 20 + Math.sin(t * 28) * 8 + p * 55, 0, Math.PI * 2);
      ctx.fillStyle = this.cutsceneTier.color;
      ctx.globalAlpha = 0.35 + p * 0.5;
      ctx.fill();
      ctx.restore();
      return;
    }

    // Reveal true Aura Name at t >= 1.15s
    tierEl.textContent = `★ ${this.cutsceneTier.tierName} ★`;
    nameEl.textContent = this.cutsceneTier.auraName;
    oddsEl.textContent = `1 in ${formatNum(this.cutsceneTier.odds, this.game.notationMode)}`;
    const canvas = document.getElementById("rng-cutscene-canvas");
    const ctx = canvas.getContext("2d");
    const W = 1120, H = 700;
    const cx = W / 2, cy = H / 2;
    const t = this.cutsceneTime;
    const idx = this.cutsceneTier.index;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = idx >= 7 ? "rgba(5, 2, 12, 0.93)" : "rgba(18, 12, 10, 0.85)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();

    if (idx === 4) {
      ctx.translate(cx, cy);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6 + t * 0.05);
        ctx.fillStyle = "rgba(243, 156, 18, 0.14)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-35, -550);
        ctx.lineTo(35, -550);
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
        const rad = ((t * 320 + ring * 120) % 580);
        ctx.strokeStyle = `rgba(231, 76, 60, ${Math.max(0, 1 - rad / 580)})`;
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
        ctx.strokeRect(-165, -165, 330, 330);
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
        ctx.lineTo(cx + Math.cos(ang) * 650, cy + Math.sin(ang) * 650);
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

    if (idx === 9) {
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
      ctx.restore();
      return;
    }

    if (idx === 10) {
      ctx.translate(cx, cy);
      for (let wing = -1; wing <= 1; wing += 2) {
        for (let feather = 0; feather < 7; feather++) {
          ctx.strokeStyle = "rgba(255, 243, 176, 0.75)";
          ctx.lineWidth = 6 - feather * 0.5;
          ctx.beginPath();
          ctx.moveTo(wing * 40, 20);
          ctx.quadraticCurveTo(wing * (180 + feather * 35), -140 + feather * 25, wing * (320 + feather * 40), -60 + feather * 45);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, -135, 110, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (idx === 11) {
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.9);
      for (let arm = 0; arm < 4; arm++) {
        ctx.rotate(Math.PI / 2);
        for (let d = 10; d < 420; d += 12) {
          const spiralAng = d * 0.018;
          const sx = Math.cos(spiralAng) * d;
          const sy = Math.sin(spiralAng) * d;
          ctx.fillStyle = d < 140 ? "rgba(255, 210, 100, 0.85)" : "rgba(155, 93, 229, 0.7)";
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      return;
    }

    if (idx === 12) {
      ctx.strokeStyle = "#00f5d4";
      ctx.lineWidth = 3;
      for (let crack = 0; crack < 14; crack++) {
        let px = cx, py = cy;
        const baseAng = (crack / 14) * Math.PI * 2 + Math.floor(t * 4) * 0.1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let seg = 1; seg <= 6; seg++) {
          px += Math.cos(baseAng + Math.sin(seg * 3 + t * 8) * 0.35) * 95;
          py += Math.sin(baseAng + Math.cos(seg * 3 + t * 8) * 0.35) * 95;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (idx === 13) {
      const grad = ctx.createRadialGradient(cx, cy, 110, cx, cy, 340);
      grad.addColorStop(0, "rgba(255, 215, 0, 0.95)");
      grad.addColorStop(0.4, "rgba(255, 140, 0, 0.45)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 340, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#050308";
      ctx.beginPath();
      ctx.arc(cx, cy, 118, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (idx >= 14) {
      const phase = t < 1.4 ? (1.4 - t) / 1.4 : (t - 1.4) * 1.6;
      ctx.translate(cx, cy);
      for (let b = 0; b < 32; b++) {
        const a = (b / 32) * Math.PI * 2 + t * 1.4;
        const hue = (b * 12 + t * 240) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 68%, 0.28)`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.06) * 700, Math.sin(a - 0.06) * 700);
        ctx.lineTo(Math.cos(a + 0.06) * 700, Math.sin(a + 0.06) * 700);
        ctx.closePath();
        ctx.fill();
      }
      for (let ring = 1; ring <= 8; ring++) {
        const hue = (ring * 45 + t * 220) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, 72%, 0.9)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(10, phase * 85 * ring), 0, Math.PI * 2);
        ctx.stroke();
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

      // Exponential ease-out deceleration curve (fast spin -> agonizing slow ticks)
      const eased = 1.0 - Math.pow(1.0 - pct, 2.8);
      const tapeIndex = Math.min(22, Math.floor(eased * 23));

      // Suspense Fake-Out Tease at 72% when rolling Legendary+
      const inTeaseWindow = this.hasSuspenseTease && pct >= 0.72 && pct < 0.96;
      if (inTeaseWindow && !this.suspenseTriggered) {
        this.suspenseTriggered = true;
        document.getElementById("rng-suspense-banner").classList.remove("hidden");
        this.game.sfx.playSuspenseBuild(this.game.sfxEnabled, this.game.sfxVolume);
      }

      if (pct >= 0.96 && this.hasSuspenseTease) {
        this.reelTape[22] = this.pendingResult;
      }

      if (tapeIndex !== this.lastTickStep || inTeaseWindow) {
        if (tapeIndex !== this.lastTickStep) {
          this.lastTickStep = tapeIndex;
          this.game.sfx.playCelestialTick(pct, this.game.sfxEnabled, this.game.sfxVolume * 0.8);
        }
        this.renderRouletteFrame(inTeaseWindow ? 22 : tapeIndex, inTeaseWindow);
      }

      if (this.rollTimer >= this.rollDuration) {
        document.getElementById("rng-roll-bar").style.width = "0%";
        document.getElementById("rng-roulette-track-wrap").classList.add("hidden");
        document.getElementById("rng-suspense-banner").classList.add("hidden");
        document.getElementById("rng-result-readout").classList.remove("hidden");
        this.completeRoll();
      }
    } else if (this.autoRoll) {
      this.startRoll(this.activeRollMode || "standard", true);
    }
  }

  buildDOM() {
    const traitsContainer = document.getElementById("rng-traits-list");
    traitsContainer.innerHTML = "";
    this.traitSockets.forEach((t) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "52px";
      card.innerHTML = `
        <div class="card-accent accent-pantheon"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${t.name}</span>
            <span class="card-count" id="lvl-${t.id}" style="color: #8e44ad;">Lv. 0/${t.max}</span>
          </div>
          <div class="card-desc">${t.desc}</div>
        </div>
        <button class="btn btn-sm btn-pantheon" id="btn-${t.id}" type="button">Socket</button>
      `;
      card.querySelector(`#btn-${t.id}`).addEventListener("click", () => {
        const cost = this.getTraitCost(t);
        if (t.level < t.max && this.game.paradoxDust >= cost) {
          this.game.paradoxDust -= cost;
          t.level += 1;
          this.game.recalculateRates();
          this.game.markDirty();
          this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
        } else {
          this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        }
      });
      traitsContainer.appendChild(card);
    });

    document.getElementById("btn-rng-dissolve").addEventListener("click", () => this.dissolveDuplicates());

    const gearContainer = document.getElementById("rng-gear-list");
    gearContainer.innerHTML = "";
    this.gear.forEach((g) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.id = `card-${g.id}`;
      const reqList = g.auras.map((a) => `${a.qty}× ${RNG_RARITIES[a.idx].tierName}`).join(" + ");
      card.innerHTML = `
        <div class="card-accent accent-gold" id="acc-${g.id}"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${g.name}</span>
            <span class="card-count" id="st-${g.id}">Uncrafted</span>
          </div>
          <div class="card-desc">${g.effectDesc}</div>
          <div class="card-cost" id="req-${g.id}">Recipe: ${reqList} + ${formatNum(g.currCost)} ${getCurrencyName(g.currType)}</div>
        </div>
        <button class="btn btn-sm btn-gold" id="btn-${g.id}" type="button">Craft Gear</button>
      `;
      card.querySelector(`#btn-${g.id}`).addEventListener("click", () => this.craftGear(g));
      gearContainer.appendChild(card);
    });

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
          this.game.markDirty();
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
            <span class="card-title"><span id="rng-cname-${r.index}">??? (${r.tierName})</span><span id="rng-cstars-${r.index}" class="rng-star-rank"></span></span>
            <span class="card-count" id="rng-ccount-${r.index}" style="color: ${r.color};">1 in ${formatNum(r.odds)}</span>
          </div>
          <div class="card-desc" id="rng-cdesc-${r.index}">${r.desc}</div>
        </div>
        <div class="sink-btn-group">
          <button class="btn btn-sm btn-secondary" id="rng-equip-${r.index}" type="button">Locked</button>
          <button class="btn btn-sm btn-pantheon hidden" id="rng-subequip-${r.index}" type="button">Sub</button>
          ${r.index >= 4 ? `<button class="btn btn-sm btn-accent hidden" id="rng-prev-${r.index}" type="button" title="Preview Cutscene">🎬</button>` : ""}
        </div>
      `;
      card.querySelector(`#rng-equip-${r.index}`).addEventListener("click", () => {
        if (this.counts[r.index] > 0) {
          if (this.subEquippedIndex === r.index) this.subEquippedIndex = -1;
          this.equippedIndex = r.index;
          this.game.recalculateRates();
          this.game.markDirty();
          this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume);
        }
      });
      card.querySelector(`#rng-subequip-${r.index}`).addEventListener("click", () => {
        if (this.counts[r.index] > 0 && this.isDualAuraUnlocked() && this.equippedIndex !== r.index) {
          this.subEquippedIndex = r.index;
          this.game.recalculateRates();
          this.game.markDirty();
          this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume);
        }
      });
      const prevBtn = card.querySelector(`#rng-prev-${r.index}`);
      if (prevBtn) {
        prevBtn.addEventListener("click", () => this.triggerCutscene(r));
      }
      compContainer.appendChild(card);
    });

    document.getElementById("btn-rng-roll").addEventListener("click", () => this.startRoll("standard", false));
    document.getElementById("btn-rng-roll-golden").addEventListener("click", () => this.startRoll("golden", false));
    document.getElementById("btn-rng-roll-astral").addEventListener("click", () => this.startRoll("astral", false));

    document.getElementById("btn-rng-auto").addEventListener("click", () => {
      this.autoRoll = !this.autoRoll;
      this.syncToggleButtons();
    });
    document.getElementById("btn-rng-fast").addEventListener("click", () => {
      if (!this.isFastRollUnlocked()) {
        this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        return;
      }
      this.fastRoll = !this.fastRoll;
      if (this.fastRoll) this.turboRoll = false;
      this.syncToggleButtons();
    });
    document.getElementById("btn-rng-turbo").addEventListener("click", () => {
      if (!this.isTurboRollUnlocked()) {
        this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        return;
      }
      this.turboRoll = !this.turboRoll;
      if (this.turboRoll) this.fastRoll = false;
      this.syncToggleButtons();
    });

    document.getElementById("rng-cutscene-threshold").addEventListener("change", (e) => {
      this.cutsceneThreshold = parseInt(e.target.value, 10);
    });
    document.getElementById("btn-skip-cutscene").addEventListener("click", () => this.closeCutscene());
  }

  syncToggleButtons() {
    const autoBtn = document.getElementById("btn-rng-auto");
    const fastBtn = document.getElementById("btn-rng-fast");
    const turboBtn = document.getElementById("btn-rng-turbo");
    const threshSel = document.getElementById("rng-cutscene-threshold");

    if (autoBtn) {
      autoBtn.textContent = `Auto-Roll: ${this.autoRoll ? "ON" : "OFF"}`;
      autoBtn.classList.toggle("active", this.autoRoll);
    }
    if (fastBtn) {
      const unlocked = this.isFastRollUnlocked();
      fastBtn.textContent = unlocked ? `Fast Roll: ${this.fastRoll ? "ON" : "OFF"}` : "🔒 Fast (Bearings Lv.10)";
      fastBtn.classList.toggle("active", unlocked && this.fastRoll);
    }
    if (turboBtn) {
      const unlocked = this.isTurboRollUnlocked();
      turboBtn.textContent = unlocked ? `Turbo Roll: ${this.turboRoll ? "ON" : "OFF"}` : "🔒 Turbo (Bearings Lv.30)";
      turboBtn.classList.toggle("active", unlocked && this.turboRoll);
    }
    if (threshSel) {
      threshSel.value = String(this.cutsceneThreshold);
    }
  }

  refreshDOM() {
    if (this.game.activeTab !== "rng") return;
    const nm = this.game.notationMode;
    const luck = this.getTotalLuck(1.0, false);
    const dur = this.getRollDuration();
    const multi = this.getMultiRollCount();

    document.getElementById("rng-stats-line").innerHTML =
      `Rolls: ${formatNum(this.totalRolls, nm)} &nbsp;|&nbsp; Luck: ${luck.toFixed(2)}x &nbsp;|&nbsp; Speed: ${dur.toFixed(2)}s &nbsp;|&nbsp; Multi: ${multi}x`;

    const primName = this.equippedIndex >= 0 ? RNG_RARITIES[this.equippedIndex].auraName : "None";
    const dualUnlocked = this.isDualAuraUnlocked();
    const subName = !dualUnlocked
      ? "Locked (Void Dual-Aura Catalyst)"
      : this.subEquippedIndex >= 0 ? RNG_RARITIES[this.subEquippedIndex].auraName : "Empty";
    document.getElementById("rng-equipped-bar").innerHTML =
      `Primary (2x): <strong>${primName}</strong> &nbsp;|&nbsp; Sub-Aura (1.5x): <strong>${subName}</strong>`;

    const pity = this.getNextPityInfo();
    document.getElementById("rng-pity-label").textContent = pity.label;
    document.getElementById("rng-pity-bar").style.width = `${pity.pct}%`;

    const stdCost = this.getRollCosts("standard");
    const stdBtn = document.getElementById("btn-rng-roll");
    stdBtn.textContent = `Standard (${formatNum(stdCost.beans, nm)} Beans) [R]`;
    stdBtn.disabled = this.isRolling || !this.canAffordRoll("standard");

    const gldCost = this.getRollCosts("golden");
    const gldBtn = document.getElementById("btn-rng-roll-golden");
    gldBtn.textContent = `Golden (2 Golden + ${formatNum(gldCost.beans, nm)})`;
    gldBtn.disabled = this.isRolling || !this.canAffordRoll("golden");

    const astBtn = document.getElementById("btn-rng-roll-astral");
    astBtn.textContent = `Astral (1 Crystal + 1 Shard)`;
    astBtn.disabled = this.isRolling || !this.canAffordRoll("astral");

    this.syncToggleButtons();

    for (const t of this.traitSockets) {
      const cost = this.getTraitCost(t);
      const can = t.level < t.max && this.game.paradoxDust >= cost;
      document.getElementById(`lvl-${t.id}`).textContent = `Lv. ${t.level}/${t.max}`;
      const btn = document.getElementById(`btn-${t.id}`);
      btn.textContent = t.level >= t.max ? "MAX" : `${formatNum(cost, nm)} P-Dust`;
      btn.className = `btn btn-sm ${can ? "btn-pantheon" : "btn-disabled"}`;
      btn.disabled = !can;
    }

    for (const g of this.gear) {
      const hasCurr = this.game.getCurrencyBalance(g.currType) >= g.currCost;
      const hasAuras = g.auras.every((a) => this.counts[a.idx] >= a.qty);
      const canCraft = !g.crafted && hasCurr && hasAuras;
      document.getElementById(`st-${g.id}`).textContent = g.crafted ? "EQUIPPED ✓" : canCraft ? "READY!" : "Locked";
      const reqEl = document.getElementById(`req-${g.id}`);
      reqEl.className = `card-cost ${g.crafted || canCraft ? "cost-afford" : "cost-locked"}`;
      const btn = document.getElementById(`btn-${g.id}`);
      if (g.crafted) {
        btn.textContent = "CRAFTED";
        btn.className = "btn btn-sm btn-success";
        btn.disabled = true;
      } else {
        btn.textContent = "Craft Gear";
        btn.className = `btn btn-sm ${canCraft ? "btn-gold" : "btn-disabled"}`;
        btn.disabled = !canCraft;
      }
    }

    for (const u of this.upgrades) {
      const cost = this.getUpgradeCost(u);
      const bal = this.game.getCurrencyBalance(u.curr);
      const can = u.level < u.max && bal >= cost;
      document.getElementById(`lvl-${u.id}`).textContent = `Lv. ${u.level}/${u.max}`;
      const btn = document.getElementById(`btn-${u.id}`);
      btn.textContent = u.level >= u.max ? "MAX" : `${formatNum(cost, nm)} ${getCurrencyName(u.curr)}`;
      btn.className = `btn btn-sm ${can ? "btn-gold" : "btn-disabled"}`;
      btn.disabled = !can;
    }

    for (const r of RNG_RARITIES) {
      const owned = this.counts[r.index];
      const unlocked = owned > 0;
      const isEq = this.equippedIndex === r.index;
      const isSubEq = dualUnlocked && this.subEquippedIndex === r.index;
      const starInfo = this.getStarRank(owned);
      const effOdds = Math.max(1, Math.round(r.odds / luck));

      document.getElementById(`rng-cname-${r.index}`).textContent = unlocked
        ? `${r.auraName} [${r.tierName}]`
        : `??? [${r.tierName}]`;
      document.getElementById(`rng-cstars-${r.index}`).textContent = starInfo.stars > 0
        ? ` ${"★".repeat(starInfo.stars)}`
        : "";
      document.getElementById(`rng-ccount-${r.index}`).textContent = unlocked
        ? `Owned: ${formatNum(owned, nm)}${starInfo.next ? `/${starInfo.next}` : " (MAX)"} | +${formatNum(this.getTierMultiplier(r.index) * 100, nm)}%`
        : `~1 in ${formatNum(effOdds, nm)}`;

      const eqBtn = document.getElementById(`rng-equip-${r.index}`);
      if (!unlocked) {
        eqBtn.textContent = "Locked";
        eqBtn.className = "btn btn-sm btn-disabled";
        eqBtn.disabled = true;
      } else if (isEq) {
        eqBtn.textContent = "PRIMARY ★";
        eqBtn.className = "btn btn-sm btn-success";
        eqBtn.disabled = false;
      } else {
        eqBtn.textContent = "Equip (2x)";
        eqBtn.className = "btn btn-sm btn-secondary";
        eqBtn.disabled = false;
      }

      const subBtn = document.getElementById(`rng-subequip-${r.index}`);
      subBtn.classList.toggle("hidden", !dualUnlocked || !unlocked);
      if (dualUnlocked && unlocked) {
        if (isSubEq) {
          subBtn.textContent = "SUB ★";
          subBtn.className = "btn btn-sm btn-pantheon";
          subBtn.disabled = true;
        } else {
          subBtn.textContent = "Sub (1.5x)";
          subBtn.className = "btn btn-sm btn-secondary";
          subBtn.disabled = isEq;
        }
      }

      const prevBtn = document.getElementById(`rng-prev-${r.index}`);
      if (prevBtn) {
        prevBtn.classList.toggle("hidden", !unlocked);
      }
    }
  }
}

// =============================================================================
// 8. BEANS EQUIPMENT SYSTEM (20 RARITIES, 2-SLOT LOADOUT, SYNERGIES & FUSION)
// =============================================================================

const BEAN_EQUIP_RARITIES = [
  { index: 0,  tier: "T1 Common",         name: "Roasted Arabica Bean",        odds: 2,         color: "#8c7b70", stats: { click: 0.12 } },
  { index: 1,  tier: "T2 Uncommon",       name: "Caramelized Robusta Bean",    odds: 4,         color: "#4e9a65", stats: { click: 0.22, bps: 0.08 } },
  { index: 2,  tier: "T3 Sturdy",         name: "Highland Peaberry",           odds: 8,         color: "#3b8268", stats: { click: 0.35, heatRed: 0.05 } },
  { index: 3,  tier: "T4 Fine",           name: "Velvet Liberica Bean",        odds: 16,        color: "#2e86ab", stats: { click: 0.55, critChance: 0.02 } },
  { index: 4,  tier: "T5 Rare",           name: "Rain-Washed Geisha Bean",     odds: 35,        color: "#3670c7", stats: { click: 0.90, critMult: 0.6 } },
  { index: 5,  tier: "T6 Superior",       name: "Spiced Cardamom Bean",        odds: 75,        color: "#5b5ea6", stats: { click: 1.40, bps: 0.30 } },
  { index: 6,  tier: "T7 Epic",           name: "Midnight Espresso Bean",      odds: 160,       color: "#8e44ad", stats: { click: 2.30, critChance: 0.04, heatRed: 0.10 } },
  { index: 7,  tier: "T8 Artisanal",      name: "Golden Crema Maragogipe",     odds: 350,       color: "#b5651d", stats: { click: 3.80, critMult: 1.4, bps: 0.60 } },
  { index: 8,  tier: "T9 Legendary",      name: "Sun-Dried Bourbon Bean",      odds: 800,       color: "#d49a2a", stats: { click: 6.50, echoChance: 0.08 } },
  { index: 9,  tier: "T10 Fabled",        name: "Alchemical Copper Bean",      odds: 2000,      color: "#e67e22", stats: { click: 11.0, critChance: 0.06, heatRed: 0.15 } },
  { index: 10, tier: "T11 Mythic",        name: "Crimson Supernova Bean",      odds: 5000,      color: "#c0392b", stats: { click: 20.0, critMult: 2.8, bps: 1.50 } },
  { index: 11, tier: "T12 Relic",         name: "Chronos Hourglass Bean",      odds: 12500,     color: "#16a085", stats: { click: 36.0, echoChance: 0.14, heatRed: 0.18 } },
  { index: 12, tier: "T13 Exotic",        name: "Prismatic Nebula Bean",       odds: 30000,     color: "#00a8cc", stats: { click: 65.0, critChance: 0.10, critMult: 4.5 } },
  { index: 13, tier: "T14 Secret",        name: "Abyssal Shadow-Roast Bean",   odds: 75000,     color: "#6c3483", stats: { click: 125.0, echoChance: 0.20, heatRed: 0.25 } },
  { index: 14, tier: "T15 Celestial",     name: "Astral Starlight Bean",       odds: 200000,    color: "#3f72af", stats: { click: 260.0, global: 4.0, critMult: 6.5 } },
  { index: 15, tier: "T16 Transcendent",  name: "Seraphic Gold-Leaf Bean",     odds: 600000,    color: "#d99b26", stats: { click: 600.0, critChance: 0.15, echoChance: 0.26 } },
  { index: 16, tier: "T17 Primordial",    name: "Genesis Volcano Bean",        odds: 2000000,   color: "#d35400", stats: { click: 1500.0, global: 20.0, heatRed: 0.35 } },
  { index: 17, tier: "T18 Dimensional",   name: "Void-Rift Paradox Bean",      odds: 7500000,   color: "#00b894", stats: { click: 4200.0, critMult: 12.0, echoChance: 0.34 } },
  { index: 18, tier: "T19 Omnipotent",    name: "Sovereign Eclipse Bean",      odds: 25000000,  color: "#b7950b", stats: { click: 12000.0, global: 90.0, critChance: 0.20 } },
  { index: 19, tier: "T20 Beyond Reality",name: "Architect's Eternal Bean",    odds: 100000000, color: "#e63c8c", stats: { click: 50000.0, global: 450.0, echoChance: 0.45, heatRed: 0.45 } }
];

class BeanEquipmentManager {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.counts = new Array(BEAN_EQUIP_RARITIES.length).fill(0);
    this.equipped = []; // Strict maximum of 2 bean types
    this.luckLevel = 0;
    this.totalRolls = 0;
    this.pityRolls = 0;

    this.isRolling = false;
    this.rollTimer = 0.0;
    this.rollDuration = 0.42;
    this.rollMode = "standard";
    this.pendingCost = {};
    this.pendingBatch = [];
    this.autoRoll = false;

    // Roaster Drum & Cracking Pod Animation State
    this.drumAngle = 0.0;
    this.lastBestItem = null;
    this.lastDrumTick = -1;
    this.podSuspensePlayed = false;
  }

  getLuckMultiplier(mode = "standard") {
    let luck = 1.0 + this.luckLevel * 0.25 + (this.game.talents ? this.game.talents[4].rank * 0.10 : 0);
    if (mode === "golden") luck *= 2.5;
    return luck;
  }

  getLuckUpgradeCost() {
    return Math.max(250, Math.floor(250 * Math.pow(1.85, this.luckLevel)));
  }

  // Decoupled from clickPower so equipping strong gear never inflates roll cost
  getRollCost(mode = "standard", count = 1) {
    if (mode === "golden") return { golden: count };
    let totalBeans = 0;
    for (let i = 0; i < count; i++) {
      totalBeans += Math.max(25, Math.floor(25 * Math.pow(1.035, this.totalRolls + i)));
    }
    return { beans: totalBeans };
  }

  canAffordRoll(mode = "standard", count = 1) {
    const cost = this.getRollCost(mode, count);
    return Object.entries(cost).every(([k, v]) => this.game.getCurrencyBalance(k) >= v);
  }

  getPendingRefunds() {
    return this.isRolling ? { ...this.pendingCost } : {};
  }

  getDuplicateScale(idx) {
    const c = this.counts[idx];
    if (c <= 0) return 0;
    return 1.0 + Math.log2(c) * 0.25;
  }

  formatBeanStats(idx) {
    const item = BEAN_EQUIP_RARITIES[idx];
    const scale = Math.max(1.0, this.getDuplicateScale(idx));
    const nm = this.game.notationMode;
    const parts = [];
    const s = item.stats;
    if (s.click) parts.push(`+${formatNum(s.click * scale * 100, nm)}% Click`);
    if (s.bps) parts.push(`+${formatNum(s.bps * scale * 100, nm)}% BPS`);
    if (s.global) parts.push(`+${formatNum(s.global * scale * 100, nm)}% Global`);
    if (s.critChance) parts.push(`+${(s.critChance * scale * 100).toFixed(1)}% Crit`);
    if (s.critMult) parts.push(`+${(s.critMult * scale).toFixed(1)}x Crit Dmg`);
    if (s.echoChance) parts.push(`${Math.min(85, s.echoChance * scale * 100).toFixed(1)}% Echo`);
    if (s.heatRed) parts.push(`-${Math.min(85, s.heatRed * scale * 100).toFixed(0)}% Heat`);
    return parts.join(" • ");
  }

  getActiveSynergy() {
    if (this.equipped.length < 2) return null;
    const idx0 = this.equipped[0];
    const idx1 = this.equipped[1];
    const s1 = BEAN_EQUIP_RARITIES[idx0].stats;
    const s2 = BEAN_EQUIP_RARITIES[idx1].stats;
    const hasHeat = !!(s1.heatRed || s2.heatRed);
    const hasEcho = !!(s1.echoChance || s2.echoChance);
    const hasCritC = !!(s1.critChance || s2.critChance);
    const hasCritM = !!(s1.critMult || s2.critMult);

    if ((idx0 === 0 && idx1 >= 14) || (idx1 === 0 && idx0 >= 14)) {
      return { id: "overdrive", name: "Espresso Overdrive", desc: "+1% Global Multiplier per 100 T1 Arabica Beans owned!" };
    }
    if (hasHeat && hasEcho) {
      return { id: "thermal", name: "Thermal Overclock", desc: "Echo clicks cool Boiler by -0.5°C & +25% Click Power!" };
    }
    if (hasCritC && hasCritM) {
      return { id: "precision", name: "Precision Extraction", desc: "Crit Sips extend Frenzy & Purr Bliss by +0.20s & +1.5x Crit Dmg!" };
    }
    if (Math.abs(idx0 - idx1) <= 2) {
      return { id: "purity", name: "Single-Origin Purity", desc: "1.35x multiplier to all stats on both equipped beans!" };
    }
    return null;
  }

  getEquippedStats() {
    const syn = this.getActiveSynergy();
    const purityMult = syn && syn.id === "purity" ? 1.35 : 1.0;

    let clickBonus = syn && syn.id === "thermal" ? 0.25 : 0.0;
    let bpsBonus = 0.0;
    let globalBonus = syn && syn.id === "overdrive" ? Math.floor(this.counts[0] / 100) * 0.01 : 0.0;
    let critChance = 0.0;
    let critMult = syn && syn.id === "precision" ? 1.5 : 0.0;
    let echoChance = 0.0;
    let heatReduction = 0.0;
    let hasT8Proc = false;

    for (const idx of this.equipped) {
      if (this.counts[idx] <= 0) continue;
      if (idx >= 7) hasT8Proc = true;
      const scale = this.getDuplicateScale(idx) * purityMult;
      const s = BEAN_EQUIP_RARITIES[idx].stats;
      if (s.click) clickBonus += s.click * scale;
      if (s.bps) bpsBonus += s.bps * scale;
      if (s.global) globalBonus += s.global * scale;
      if (s.critChance) critChance += s.critChance * scale;
      if (s.critMult) critMult += s.critMult * scale;
      if (s.echoChance) echoChance += s.echoChance * scale;
      if (s.heatRed) heatReduction += s.heatRed * scale;
    }

    return {
      synergy: syn,
      hasT8Proc,
      clickMult: 1.0 + clickBonus,
      bpsMult: 1.0 + bpsBonus,
      globalMult: 1.0 + globalBonus,
      critChance: Math.min(0.45, critChance),
      critMult,
      echoChance: Math.min(0.85, echoChance),
      heatReduction: Math.min(0.85, heatReduction)
    };
  }

  equipBean(idx, targetSlot = -1) {
    if (this.counts[idx] <= 0) return;
    if (this.equipped.includes(idx)) return;

    if (targetSlot === 0 || targetSlot === 1) {
      this.equipped[targetSlot] = idx;
    } else if (this.equipped.length < 2) {
      this.equipped.push(idx);
    } else {
      this.equipped[0] = idx;
    }

    this.equipped = [...new Set(this.equipped)].slice(0, 2);
    this.game.recalculateRates();
    this.game.markDirty();
    this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
  }

  unequipSlot(slotIdx) {
    if (slotIdx >= 0 && slotIdx < this.equipped.length) {
      this.equipped.splice(slotIdx, 1);
      this.game.recalculateRates();
      this.game.markDirty();
      this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.8);
    }
  }

  fuseBean(idx) {
    if (idx < 0 || idx >= BEAN_EQUIP_RARITIES.length - 1) return;
    if (this.counts[idx] < 6) {
      this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
      return;
    }
    this.counts[idx] -= 5;
    this.counts[idx + 1] += 1;
    this.lastBestItem = BEAN_EQUIP_RARITIES[idx + 1];
    this.game.addXp(30 * (idx + 2));
    this.game.recalculateRates();
    this.game.markDirty();
    this.game.sfx.playLevelup(this.game.sfxEnabled, this.game.sfxVolume);
  }

  pickRarity(mode = "standard") {
    this.pityRolls += 1;
    if (this.pityRolls >= 25) {
      this.pityRolls = 0;
      const luck = this.getLuckMultiplier(mode);
      for (let i = BEAN_EQUIP_RARITIES.length - 1; i >= 5; i--) {
        if (Math.random() < Math.min(0.45, luck / BEAN_EQUIP_RARITIES[i].odds)) {
          return BEAN_EQUIP_RARITIES[i];
        }
      }
      return BEAN_EQUIP_RARITIES[4]; // Guaranteed T5 Rare+
    }

    const luck = this.getLuckMultiplier(mode);
    const minIdx = mode === "golden" ? 2 : 0;
    for (let i = BEAN_EQUIP_RARITIES.length - 1; i >= minIdx + 1; i--) {
      const chance = Math.min(0.45, luck / BEAN_EQUIP_RARITIES[i].odds);
      if (Math.random() < chance) {
        if (i >= 4) this.pityRolls = 0;
        return BEAN_EQUIP_RARITIES[i];
      }
    }
    return BEAN_EQUIP_RARITIES[minIdx];
  }

  getBestPendingItem() {
    if (!this.pendingBatch || this.pendingBatch.length === 0) return BEAN_EQUIP_RARITIES[0];
    let best = this.pendingBatch[0];
    for (const item of this.pendingBatch) {
      if (item.index > best.index) best = item;
    }
    return best;
  }

  startRoll(mode = "standard", isAuto = false, batchCount = 1) {
    if (this.isRolling) return;
    if (!this.canAffordRoll(mode, batchCount)) {
      if (isAuto && mode === "golden" && this.canAffordRoll("standard", 1)) {
        mode = "standard";
        this.rollMode = "standard";
      } else {
        if (!isAuto) this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        return;
      }
    }

    const cost = this.getRollCost(mode, batchCount);
    for (const [k, v] of Object.entries(cost)) {
      this.game.deductCurrency(k, v);
    }

    this.rollMode = mode;
    this.pendingCost = cost;
    this.isRolling = true;
    this.rollTimer = 0.0;
    this.lastDrumTick = -1;
    this.podSuspensePlayed = false;
    this.pendingBatch = [];
    for (let i = 0; i < batchCount; i++) {
      this.pendingBatch.push(this.pickRarity(mode));
    }
  }

  completeRoll() {
    this.isRolling = false;
    this.rollTimer = 0.0;
    this.pendingCost = {};

    let bestItem = this.pendingBatch[0];
    let bestWasNew = false;

    for (const item of this.pendingBatch) {
      const isNew = this.counts[item.index] === 0;
      this.counts[item.index] += 1;
      this.totalRolls += 1;

      if (isNew && this.equipped.length < 2 && !this.equipped.includes(item.index)) {
        this.equipped.push(item.index);
      }
      if (item.index >= bestItem.index) {
        bestItem = item;
        bestWasNew = isNew;
      }
      this.game.addXp(16 * (item.index + 1));
    }

    this.lastBestItem = bestItem;

    const tierEl = document.getElementById("be-roll-tier");
    const nameEl = document.getElementById("be-roll-name");
    const statEl = document.getElementById("be-roll-stat-preview");
    if (tierEl && bestItem) {
      const batchTag = this.pendingBatch.length > 1 ? ` (Best of ${this.pendingBatch.length})` : "";
      tierEl.textContent = `${bestItem.tier} • 1 in ${formatNum(bestItem.odds, this.game.notationMode)}${batchTag}`;
      tierEl.style.backgroundColor = bestItem.color;
      nameEl.textContent = `${bestItem.name}${bestWasNew ? " — NEW!" : ` (x${this.counts[bestItem.index]})`}`;
      nameEl.style.color = bestItem.color;
      statEl.textContent = this.formatBeanStats(bestItem.index);
    }

    this.game.recalculateRates();
    this.game.markDirty();
    if (bestItem.index >= 4) {
      this.game.sfx.playFrenzy(this.game.sfxEnabled, this.game.sfxVolume);
    } else {
      this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume * 0.75);
    }
  }

  update(dt) {
    this.drumAngle = (this.drumAngle + dt * (this.isRolling ? 11.0 : 1.2)) % (Math.PI * 2);

    if (this.isRolling) {
      this.rollTimer += dt;
      const bestPending = this.getBestPendingItem();
      const isRareDrop = bestPending.index >= 4;
      const activeDur = isRareDrop && !this.autoRoll ? 1.15 : this.rollDuration;
      const pct = Math.min(1.0, this.rollTimer / activeDur);

      if (this.isOpen) {
        document.getElementById("be-roll-bar").style.width = `${pct * 100}%`;
      }

      const tickStep = Math.floor(Math.pow(pct, 0.7) * 9);
      if (tickStep !== this.lastDrumTick && pct < 0.72) {
        this.lastDrumTick = tickStep;
        if (this.game.sfx.playRoasterTick) {
          this.game.sfx.playRoasterTick(pct, this.game.sfxEnabled, this.game.sfxVolume * 0.85);
        }
      }

      if (isRareDrop && pct >= 0.65 && !this.podSuspensePlayed && !this.autoRoll) {
        this.podSuspensePlayed = true;
        if (this.game.sfx.playSuspenseBuild) {
          this.game.sfx.playSuspenseBuild(this.game.sfxEnabled, this.game.sfxVolume * 0.85);
        }
      }

      if (this.rollTimer >= activeDur) {
        this.lastDrumTick = -1;
        this.podSuspensePlayed = false;
        if (this.isOpen) document.getElementById("be-roll-bar").style.width = "0%";
        this.completeRoll();
      }
    } else if (this.autoRoll) {
      this.startRoll(this.rollMode || "standard", true, 1);
    }

    if (this.isOpen) {
      this.drawRoasterCanvas();
    }
  }

  drawRoasterCanvas() {
    const canvas = document.getElementById("be-roll-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 210, H = 74;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    // Rotating Brass Roaster Drum Ribs
    ctx.save();
    ctx.strokeStyle = "rgba(212, 154, 42, 0.28)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = this.drumAngle + (i * Math.PI) / 3;
      const rx = cx + Math.cos(a) * 85;
      ctx.beginPath();
      ctx.moveTo(rx, 4);
      ctx.lineTo(rx, H - 4);
      ctx.stroke();
    }
    ctx.restore();

    const bestPending = this.getBestPendingItem();
    const isRareDrop = this.isRolling && bestPending.index >= 4;
    const activeDur = isRareDrop && !this.autoRoll ? 1.15 : this.rollDuration;
    const pct = this.isRolling ? Math.min(1, this.rollTimer / activeDur) : 1;

    // Phase 1 (0% - 65%): Tumbling Coffee Beans inside Drum
    if (this.isRolling && pct < 0.65) {
      for (let b = 0; b < 7; b++) {
        const ang = this.drumAngle * 1.4 + b * 0.9;
        const bx = cx + Math.cos(ang) * (58 - b * 5);
        const by = cy + Math.sin(ang * 1.7) * 20;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(ang);
        ctx.fillStyle = b % 2 === 0 ? "#6f442a" : "#4a2c18";
        ctx.strokeStyle = "#d49a2a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    // Phase 2 (65% - 100%): Sealed Bean Pod Pressure-Cracking Suspense
    if (this.isRolling && pct >= 0.65) {
      const crackIntensity = (pct - 0.65) / 0.35;
      const shakeX = isRareDrop ? (Math.random() * 6 - 3) * crackIntensity : 0;
      const shakeY = isRareDrop ? (Math.random() * 4 - 2) * crackIntensity : 0;

      // Leaking Rarity Light Rays
      if (isRareDrop) {
        ctx.save();
        ctx.translate(cx + shakeX, cy + shakeY);
        for (let r = 0; r < 10; r++) {
          const rayAng = (r / 10) * Math.PI * 2 + this.drumAngle * 0.5;
          ctx.strokeStyle = bestPending.color;
          ctx.globalAlpha = 0.35 + crackIntensity * 0.65;
          ctx.lineWidth = 2 + crackIntensity * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(rayAng) * (35 + crackIntensity * 65), Math.sin(rayAng) * (35 + crackIntensity * 65));
          ctx.stroke();
        }
        ctx.restore();
      }

      // Giant Sealed Bean Capsule
      ctx.save();
      ctx.translate(cx + shakeX, cy + shakeY);
      ctx.fillStyle = isRareDrop ? bestPending.color : "#8c7b70";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24 + crackIntensity * 4, 16 + crackIntensity * 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Jagged Crack Seam
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.lineTo(-4, 3);
      ctx.lineTo(5, -3);
      ctx.lineTo(15, 4);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Idle Showcase: Rotating 3D-Shaded Last Rolled Bean Emblem
    let showcase = this.lastBestItem;
    if (!showcase) {
      let highestIdx = 0;
      for (let i = BEAN_EQUIP_RARITIES.length - 1; i >= 0; i--) {
        if (this.counts[i] > 0) {
          highestIdx = i;
          break;
        }
      }
      showcase = BEAN_EQUIP_RARITIES[highestIdx];
    }

    const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.06;
    ctx.save();
    ctx.translate(cx, cy);
    if (showcase.index >= 4) {
      const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 46);
      glow.addColorStop(0, showcase.color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.sin(performance.now() * 0.0025) * 0.22);
    ctx.fillStyle = showcase.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center Bean Crease
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(0, -5, 16, 0);
    ctx.stroke();
    ctx.restore();
  }

  buildDOM() {
    const modal = document.getElementById("bean-equip-modal");
    document.getElementById("btn-open-bean-equip").addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("multiplier-popover").classList.add("hidden");
      document.getElementById("glossary-popover").classList.add("hidden");
      document.getElementById("stats-popover").classList.add("hidden");
      this.isOpen = !this.isOpen;
      modal.classList.toggle("hidden", !this.isOpen);
      this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.8);
    });
    document.getElementById("btn-close-bean-equip").addEventListener("click", () => {
      this.isOpen = false;
      modal.classList.add("hidden");
      this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.7);
    });

    document.getElementById("btn-be-unequip-0").addEventListener("click", () => this.unequipSlot(0));
    document.getElementById("btn-be-unequip-1").addEventListener("click", () => this.unequipSlot(1));

    document.getElementById("btn-be-roll-std").addEventListener("click", () => this.startRoll("standard", false, 1));
    document.getElementById("btn-be-roll-x10").addEventListener("click", () => this.startRoll("standard", false, 10));
    document.getElementById("btn-be-roll-gld").addEventListener("click", () => this.startRoll("golden", false, 1));
    document.getElementById("btn-be-auto").addEventListener("click", () => {
      this.autoRoll = !this.autoRoll;
      this.game.markDirty();
    });
    document.getElementById("btn-be-luck-upg").addEventListener("click", () => {
      const cost = this.getLuckUpgradeCost();
      if (this.game.beans >= cost) {
        this.game.beans -= cost;
        this.luckLevel += 1;
        this.game.markDirty();
        this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
      } else {
        this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
      }
    });

    const list = document.getElementById("be-catalog-list");
    list.innerHTML = "";
    BEAN_EQUIP_RARITIES.forEach((item) => {
      const card = document.createElement("div");
      card.className = "game-card be-item-card";
      card.id = `be-card-${item.index}`;
      card.innerHTML = `
        <div class="card-accent" style="background:${item.color};"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title" id="be-name-${item.index}" style="color:${item.color};">??? (${item.tier})</span>
            <span class="card-count" id="be-cnt-${item.index}">1 in ${formatNum(item.odds)}</span>
          </div>
          <div class="card-desc" id="be-desc-${item.index}">${this.formatBeanStats(item.index)}</div>
        </div>
        <div class="sink-btn-group" id="be-actions-${item.index}">
          ${item.index < BEAN_EQUIP_RARITIES.length - 1 ? `<button class="btn btn-sm btn-pantheon hidden" id="be-fuse-${item.index}" type="button" title="Fuse 5 duplicates into ${BEAN_EQUIP_RARITIES[item.index + 1].tier}">Fuse 5</button>` : ""}
          <button class="btn btn-sm btn-disabled" id="be-eq-${item.index}" type="button" disabled>Locked</button>
          <button class="btn btn-sm btn-gold hidden" id="be-eq2-${item.index}" type="button">→ Slot 2</button>
        </div>
      `;
      const fuseBtn = card.querySelector(`#be-fuse-${item.index}`);
      if (fuseBtn) {
        fuseBtn.addEventListener("click", () => this.fuseBean(item.index));
      }
      card.querySelector(`#be-eq-${item.index}`).addEventListener("click", () => {
        const slotIdx = this.equipped.indexOf(item.index);
        if (slotIdx !== -1) {
          this.unequipSlot(slotIdx);
        } else {
          this.equipBean(item.index, this.equipped.length >= 2 ? 0 : -1);
        }
      });
      card.querySelector(`#be-eq2-${item.index}`).addEventListener("click", () => {
        this.equipBean(item.index, 1);
      });
      list.appendChild(card);
    });
  }

  refreshDOM() {
    if (!this.isOpen) return;
    const nm = this.game.notationMode;

    for (let s = 0; s < 2; s++) {
      const slotCard = document.getElementById(`be-slot-${s}`);
      const nameEl = document.getElementById(`be-slot-${s}-name`);
      const statsEl = document.getElementById(`be-slot-${s}-stats`);
      const unBtn = document.getElementById(`btn-be-unequip-${s}`);
      const eqIdx = this.equipped[s];

      if (eqIdx !== undefined && this.counts[eqIdx] > 0) {
        const item = BEAN_EQUIP_RARITIES[eqIdx];
        slotCard.classList.remove("empty");
        slotCard.style.borderColor = item.color;
        nameEl.textContent = `${item.name} (x${this.counts[eqIdx]})`;
        nameEl.style.color = item.color;
        statsEl.textContent = this.formatBeanStats(eqIdx);
        unBtn.classList.remove("hidden");
      } else {
        slotCard.classList.add("empty");
        slotCard.style.borderColor = "";
        nameEl.textContent = "Empty Slot";
        nameEl.style.color = "#3a2a22";
        statsEl.textContent = "Equip any unlocked bean below";
        unBtn.classList.add("hidden");
      }
    }

    const eq = this.getEquippedStats();
    const synBanner = document.getElementById("be-synergy-banner");
    if (eq.synergy) {
      synBanner.textContent = `★ BLEND SYNERGY ACTIVE: ${eq.synergy.name} — ${eq.synergy.desc}`;
      synBanner.style.backgroundColor = "#fff5dc";
      synBanner.style.color = "#b88014";
    } else {
      synBanner.textContent = "2-Bean Blend Synergy: Pair Heat+Echo, Crit%+CritDmg, or adjacent tiers for a Combo!";
      synBanner.style.backgroundColor = "";
      synBanner.style.color = "";
    }

    document.getElementById("be-combined-stats").textContent =
      `Active (${this.equipped.length}/2): +${formatNum((eq.clickMult - 1) * 100, nm)}% Click • +${(eq.critChance * 100).toFixed(1)}% Crit • +${eq.critMult.toFixed(1)}x Crit Dmg • ${(eq.echoChance * 100).toFixed(0)}% Echo • -${(eq.heatReduction * 100).toFixed(0)}% Heat`;

    const remPity = Math.max(1, 25 - this.pityRolls);
    document.getElementById("be-pity-label").textContent = `Guaranteed Rare+ (T5) in ${remPity} roll${remPity === 1 ? "" : "s"}`;
    document.getElementById("be-pity-bar").style.width = `${(this.pityRolls / 25) * 100}%`;

    const stdCost = this.getRollCost("standard", 1).beans;
    const stdBtn = document.getElementById("btn-be-roll-std");
    stdBtn.textContent = `Roll (${formatNum(stdCost, nm)})`;
    stdBtn.disabled = this.isRolling || !this.canAffordRoll("standard", 1);

    const x10Btn = document.getElementById("btn-be-roll-x10");
    x10Btn.disabled = this.isRolling || !this.canAffordRoll("standard", 10);

    const gldBtn = document.getElementById("btn-be-roll-gld");
    gldBtn.disabled = this.isRolling || !this.canAffordRoll("golden", 1);

    const autoBtn = document.getElementById("btn-be-auto");
    autoBtn.textContent = `Auto: ${this.autoRoll ? "ON" : "OFF"}`;
    autoBtn.classList.toggle("active", this.autoRoll);

    const luckCost = this.getLuckUpgradeCost();
    const luckBtn = document.getElementById("btn-be-luck-upg");
    luckBtn.textContent = `Luck Lv.${this.luckLevel} (${formatNum(luckCost, nm)})`;
    luckBtn.disabled = this.game.beans < luckCost;

    for (const item of BEAN_EQUIP_RARITIES) {
      const owned = this.counts[item.index];
      const unlocked = owned > 0;
      const slotIdx = this.equipped.indexOf(item.index);
      const isEq = slotIdx !== -1;

      const card = document.getElementById(`be-card-${item.index}`);
      card.classList.toggle("is-equipped", isEq);

      document.getElementById(`be-name-${item.index}`).innerHTML = unlocked
        ? `${item.name} [${item.tier}]${isEq ? `<span class="be-equip-badge">SLOT ${slotIdx + 1}</span>` : ""}`
        : `??? [${item.tier}]`;
      document.getElementById(`be-cnt-${item.index}`).textContent = unlocked
        ? `Owned: ${formatNum(owned, nm)} (${this.getDuplicateScale(item.index).toFixed(2)}x)`
        : `1 in ${formatNum(item.odds, nm)}`;
      document.getElementById(`be-desc-${item.index}`).textContent = this.formatBeanStats(item.index);

      const fuseBtn = document.getElementById(`be-fuse-${item.index}`);
      if (fuseBtn) {
        fuseBtn.classList.toggle("hidden", owned < 6);
      }

      const btn1 = document.getElementById(`be-eq-${item.index}`);
      const btn2 = document.getElementById(`be-eq2-${item.index}`);
      if (!unlocked) {
        btn1.textContent = "Locked";
        btn1.className = "btn btn-sm btn-disabled";
        btn1.disabled = true;
        btn2.classList.add("hidden");
      } else if (isEq) {
        btn1.textContent = "Unequip";
        btn1.className = "btn btn-sm btn-danger";
        btn1.disabled = false;
        btn2.classList.add("hidden");
      } else if (this.equipped.length >= 2) {
        btn1.textContent = "→ Slot 1";
        btn1.className = "btn btn-sm btn-gold";
        btn1.disabled = false;
        btn2.classList.remove("hidden");
      } else {
        btn1.textContent = "Equip";
        btn1.className = "btn btn-sm btn-success";
        btn1.disabled = false;
        btn2.classList.add("hidden");
      }
    }
  }
}
// =============================================================================
// 9. RAINY CAFE ARCADE ENGINE (4 PLAYABLE MINIGAMES + TOKEN PRIZE SHOP)
// =============================================================================

class ArcadeManager {
  constructor(game) {
    this.game = game;
    this.activeGame = "shot";

    this.shotPos = 0.0;
    this.shotDir = 1;
    this.shotStreak = 0;
    this.shotSweetStart = 42.0;
    this.shotSweetWidth = 16.0;
    this.shotBuffTimer = 0.0;

    this.catcherActive = false;
    this.catcherTime = 25.0;
    this.catcherScore = 0;
    this.catcherCupX = 260;
    this.catcherMoveDir = 0;
    this.catcherItems = [];
    this.catcherSpawnTimer = 0.0;

    this.memorySymbols = ["☕", "🥐", "🐱", "🌧️", "⭐", "✨"];
    this.memoryCards = [];
    this.memoryFlipped = [];
    this.memoryMatched = 0;
    this.memoryMoves = 0;
    this.memoryLock = false;

    this.roastActive = false;
    this.roastStep = 0;
    this.roastBaseWager = 0;
    this.roastPotBeans = 0;
    this.roastPotTokens = 0;
    this.roastMultipliers = [1.5, 2.5, 4.0, 7.0, 12.0, 25.0];
    this.roastChances = [0.85, 0.72, 0.60, 0.48, 0.36, 0.25];

    this.shopUpgrades = [
      { id: "arc1", name: "Golden Arcade Membership", baseCost: 15, scale: 1.45, level: 0, max: 50, desc: "+25% Global Multiplier per level" },
      { id: "arc2", name: "Double-Shot Token Magnet", baseCost: 25, scale: 1.65, level: 0, max: 20, desc: "+15% more Arcade Tokens won from all minigames" },
      { id: "arc3", name: "Four-Leaf Token Charm", baseCost: 40, scale: 1.75, level: 0, max: 25, desc: "+0.15 Base RNG Luck per level" },
      { id: "arc4", name: "Precision Pressure Valve", baseCost: 30, scale: 1.80, level: 0, max: 10, desc: "Widens the Espresso Shot-Puller sweet spot" }
    ];
  }

  getShopCost(u) {
    return Math.max(1, Math.floor(u.baseCost * Math.pow(u.scale, u.level)));
  }

  getTokenGainMult() {
    return 1.0 + this.shopUpgrades[1].level * 0.15;
  }

  getArcadeGlobalMult() {
    let m = 1.0 + this.shopUpgrades[0].level * 0.25;
    if (this.shotBuffTimer > 0) m *= 1.25;
    return m;
  }

  awardTokens(baseAmt) {
    const gained = Math.max(1, Math.round(baseAmt * this.getTokenGainMult()));
    this.game.arcadeTokens += gained;
    return gained;
  }

  pullEspressoShot() {
    const needleCenter = this.shotPos;
    const end = this.shotSweetStart + this.shotSweetWidth;
    if (needleCenter >= this.shotSweetStart && needleCenter <= end) {
      this.shotStreak += 1;
      const tokens = this.awardTokens(2 + this.shotStreak);
      const beanBonus = Math.max(150, (this.game.bps * 8 + this.game.clickPower * 15) * (1 + this.shotStreak * 0.25));
      this.game.beans = Math.min(this.game.getMaxStorage(), this.game.beans + beanBonus);
      this.game.lifetimeBeansRun += beanBonus;
      this.game.lifetimeBeansAll += beanBonus;
      this.shotBuffTimer = 20.0;
      this.game.addXp(55 * this.shotStreak);
      this.game.recalculateRates();
      this.game.markDirty();
      this.game.sfx.playFrenzy(this.game.sfxEnabled, this.game.sfxVolume);
      document.getElementById("shot-result-text").textContent =
        `PERFECT 9-BAR! +${tokens} Tokens & +${formatNum(beanBonus, this.game.notationMode)} Beans!`;
    } else {
      this.shotStreak = 0;
      this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
      document.getElementById("shot-result-text").textContent =
        needleCenter < this.shotSweetStart ? "Under-extracted! Too early." : "Over-extracted! Too late.";
    }
    const baseW = 16.0 + this.shopUpgrades[3].level * 1.5;
    this.shotSweetWidth = Math.min(34.0, baseW);
    this.shotSweetStart = 15.0 + Math.random() * (70.0 - this.shotSweetWidth);
  }

  startBeanCatcher() {
    this.catcherActive = true;
    this.catcherTime = 25.0;
    this.catcherScore = 0;
    this.catcherItems = [];
    this.catcherSpawnTimer = 0.0;
    document.getElementById("btn-start-catcher").disabled = true;
    document.getElementById("catcher-result-text").textContent = "Catch beans & golden tokens! Avoid grey steam!";
    this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume);
  }

  finishBeanCatcher() {
    this.catcherActive = false;
    document.getElementById("btn-start-catcher").disabled = false;
    const tokens = this.awardTokens(Math.max(1, Math.floor(this.catcherScore / 3)));
    const beansWon = Math.max(200, (this.game.bps * 15 + this.game.clickPower * 25) * (1 + this.catcherScore * 0.1));
    this.game.beans = Math.min(this.game.getMaxStorage(), this.game.beans + beansWon);
    this.game.lifetimeBeansRun += beansWon;
    this.game.lifetimeBeansAll += beansWon;
    this.game.addXp(150 + this.catcherScore * 12);
    this.game.recalculateRates();
    this.game.markDirty();
    this.game.sfx.playLevelup(this.game.sfxEnabled, this.game.sfxVolume);
    document.getElementById("catcher-result-text").textContent =
      `Finished! Score ${this.catcherScore} -> +${tokens} Tokens & +${formatNum(beansWon, this.game.notationMode)} Beans!`;
  }

  resetMemoryBoard() {
    const deck = [...this.memorySymbols, ...this.memorySymbols];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.memoryCards = deck.map((sym, idx) => ({ id: idx, sym, flipped: false, matched: false }));
    this.memoryFlipped = [];
    this.memoryMatched = 0;
    this.memoryMoves = 0;
    this.memoryLock = false;
    this.renderMemoryGrid();
    document.getElementById("memory-result-text").textContent = "Flip two cards to find matching pairs.";
  }

  renderMemoryGrid() {
    const grid = document.getElementById("memory-grid");
    if (!grid) return;
    grid.innerHTML = "";
    this.memoryCards.forEach((card) => {
      const el = document.createElement("div");
      el.className = `memory-card${card.flipped ? " flipped" : ""}${card.matched ? " matched" : ""}`;
      el.textContent = card.flipped || card.matched ? card.sym : "?";
      el.addEventListener("click", () => this.handleMemoryFlip(card.id));
      grid.appendChild(el);
    });
    document.getElementById("memory-moves-label").textContent =
      `Pairs: ${this.memoryMatched}/6 | Moves: ${this.memoryMoves}`;
  }

  handleMemoryFlip(id) {
    if (this.memoryLock) return;
    const card = this.memoryCards[id];
    if (!card || card.flipped || card.matched) return;

    card.flipped = true;
    this.memoryFlipped.push(card);
    this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.7);
    this.renderMemoryGrid();

    if (this.memoryFlipped.length === 2) {
      this.memoryMoves += 1;
      const [c1, c2] = this.memoryFlipped;
      if (c1.sym === c2.sym) {
        c1.matched = true;
        c2.matched = true;
        this.memoryMatched += 1;
        this.memoryFlipped = [];
        this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
        this.renderMemoryGrid();

        if (this.memoryMatched === 6) {
          const efficiencyBonus = Math.max(1, 14 - this.memoryMoves);
          const tokens = this.awardTokens(5 + efficiencyBonus);
          const beansWon = Math.max(500, this.game.bps * 30 + this.game.clickPower * 40);
          this.game.beans = Math.min(this.game.getMaxStorage(), this.game.beans + beansWon);
          this.game.lifetimeBeansRun += beansWon;
          this.game.lifetimeBeansAll += beansWon;
          this.game.customerStars += 1;
          this.game.addXp(300);
          this.game.recalculateRates();
          this.game.markDirty();
          this.game.sfx.playFrenzy(this.game.sfxEnabled, this.game.sfxVolume);
          document.getElementById("memory-result-text").textContent =
            `BOARD CLEARED! +${tokens} Tokens, +1 Star ★ & +${formatNum(beansWon, this.game.notationMode)} Beans!`;
        }
      } else {
        this.memoryLock = true;
        setTimeout(() => {
          c1.flipped = false;
          c2.flipped = false;
          this.memoryFlipped = [];
          this.memoryLock = false;
          this.renderMemoryGrid();
        }, 550);
      }
    }
  }

  cancelRoastRisk() {
    this.roastActive = false;
    this.roastStep = 0;
    this.roastBaseWager = 0;
    this.roastPotBeans = 0;
    this.roastPotTokens = 0;
    this.syncRoastRiskUI();
  }

  startRoastRisk() {
    const wager = Math.max(50, Math.floor(this.game.beans * 0.10));
    if (this.game.beans < wager) {
      this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
      return;
    }
    this.game.beans -= wager;
    this.roastActive = true;
    this.roastStep = 0;
    this.roastBaseWager = wager;
    this.roastPotBeans = wager;
    this.roastPotTokens = 2;
    this.game.markDirty();
    this.game.sfx.playBrew(this.game.sfxEnabled, this.game.sfxVolume);
    this.syncRoastRiskUI();
  }

  pushRoastRisk() {
    if (!this.roastActive) return;
    const chance = this.roastChances[Math.min(this.roastStep, this.roastChances.length - 1)];
    if (Math.random() < chance) {
      this.roastStep += 1;
      const mult = this.roastMultipliers[Math.min(this.roastStep - 1, this.roastMultipliers.length - 1)];
      this.roastPotBeans = Math.floor(this.roastBaseWager * mult);
      this.roastPotTokens += 3 * this.roastStep;
      this.game.sfx.playFrenzy(this.game.sfxEnabled, this.game.sfxVolume);
      if (this.roastStep >= this.roastMultipliers.length) {
        this.cashOutRoastRisk();
        return;
      }
    } else {
      this.roastActive = false;
      this.roastBaseWager = 0;
      this.roastPotBeans = 0;
      this.roastPotTokens = 0;
      this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
    }
    this.syncRoastRiskUI();
  }

  cashOutRoastRisk() {
    if (!this.roastActive) return;
    this.roastActive = false;
    const tokens = this.awardTokens(this.roastPotTokens);
    this.game.beans = Math.min(this.game.getMaxStorage(), this.game.beans + this.roastPotBeans);
    this.game.lifetimeBeansRun += this.roastPotBeans;
    this.game.lifetimeBeansAll += this.roastPotBeans;
    this.game.addXp(120 * (this.roastStep + 1));
    this.game.recalculateRates();
    this.game.markDirty();
    this.game.sfx.playLevelup(this.game.sfxEnabled, this.game.sfxVolume);
    document.getElementById("roastluck-pot-display").textContent =
      `CASHED OUT! +${formatNum(this.roastPotBeans, this.game.notationMode)} Beans & +${tokens} Tokens!`;
    this.roastBaseWager = 0;
    this.roastPotBeans = 0;
    this.roastPotTokens = 0;
    this.syncRoastRiskUI(true);
  }

  syncRoastRiskUI(keepPotMsg = false) {
    const nm = this.game.notationMode;
    const mult = this.roastStep === 0 ? 1.0 : this.roastMultipliers[Math.min(this.roastStep - 1, this.roastMultipliers.length - 1)];
    const nextChance = Math.round(this.roastChances[Math.min(this.roastStep, this.roastChances.length - 1)] * 100);
    document.getElementById("roastluck-stage-label").textContent = `Batch Multiplier: ${mult.toFixed(1)}x`;
    if (!keepPotMsg) {
      document.getElementById("roastluck-pot-display").textContent = this.roastActive
        ? `Current Pot: ${formatNum(this.roastPotBeans, nm)} Beans + ${this.roastPotTokens} Tokens`
        : "Batch Scorched or Ready — Start a new roast!";
    }
    document.getElementById("roastluck-chance-display").textContent = this.roastActive
      ? `Next Roast Success Chance: ${nextChance}%`
      : "Wager 10% of Beans to begin";

    document.getElementById("btn-roastluck-start").disabled = this.roastActive || this.game.beans < 50;
    document.getElementById("btn-roastluck-push").disabled = !this.roastActive;
    document.getElementById("btn-roastluck-cash").disabled = !this.roastActive;
  }

  update(dt) {
    if (this.shotBuffTimer > 0) {
      this.shotBuffTimer -= dt;
      if (this.shotBuffTimer <= 0) {
        this.shotBuffTimer = 0;
        this.game.recalculateRates();
      }
    }

    const speed = 75.0 + this.shotStreak * 12.0;
    this.shotPos += this.shotDir * speed * dt;
    if (this.shotPos >= 100.0) { this.shotPos = 100.0; this.shotDir = -1; }
    else if (this.shotPos <= 0.0) { this.shotPos = 0.0; this.shotDir = 1; }

    if (this.catcherActive) {
      if (this.catcherMoveDir !== 0) {
        this.catcherCupX = Math.max(32, Math.min(488, this.catcherCupX + this.catcherMoveDir * 360 * dt));
      }
      this.catcherTime -= dt;
      if (this.catcherTime <= 0) {
        this.catcherTime = 0;
        this.finishBeanCatcher();
      } else {
        this.catcherSpawnTimer += dt;
        if (this.catcherSpawnTimer >= 0.38) {
          this.catcherSpawnTimer = 0;
          const r = Math.random();
          const type = r < 0.55 ? "bean" : r < 0.80 ? "golden" : "steam";
          this.catcherItems.push({
            x: 24 + Math.random() * 472,
            y: -15,
            vy: 140 + Math.random() * 90,
            type
          });
        }
        for (let i = this.catcherItems.length - 1; i >= 0; i--) {
          const it = this.catcherItems[i];
          it.y += it.vy * dt;
          if (Math.abs(it.x - this.catcherCupX) < 36 && Math.abs(it.y - 196) < 20) {
            if (it.type === "bean") { this.catcherScore += 1; this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.5); }
            else if (it.type === "golden") { this.catcherScore += 3; this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume * 0.7); }
            else { this.catcherScore = Math.max(0, this.catcherScore - 2); this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume * 0.6); }
            this.catcherItems.splice(i, 1);
          } else if (it.y > 245) {
            this.catcherItems.splice(i, 1);
          }
        }
      }
    }
  }

  drawCatcherCanvas() {
    const canvas = document.getElementById("catcher-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 520, 230);

    ctx.strokeStyle = COLORS.windowRain;
    ctx.lineWidth = 1;
    for (let x = 20; x < 520; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x - 8, 220);
      ctx.stroke();
    }

    for (const it of this.catcherItems) {
      if (it.type === "bean") {
        ctx.fillStyle = COLORS.coffee;
        ctx.beginPath();
        ctx.ellipse(it.x, it.y, 8, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.type === "golden") {
        drawGoldenSparkle(ctx, it.x, it.y, 10, COLORS.gold);
      } else {
        ctx.fillStyle = "rgba(120, 120, 125, 0.85)";
        ctx.beginPath();
        ctx.arc(it.x, it.y, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = COLORS.mug;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.catcherCupX - 28, 184, 56, 30, [2, 2, 12, 12]);
    ctx.fill();
    ctx.stroke();
  }

  buildDOM() {
    document.querySelectorAll(".arcade-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeGame = btn.dataset.minigame;
        document.querySelectorAll(".arcade-tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.minigame === this.activeGame));
        document.querySelectorAll(".minigame-panel").forEach((p) => p.classList.toggle("active", p.id === `mg-${this.activeGame}`));
        this.game.sfx.playTap(this.game.sfxEnabled, this.game.sfxVolume * 0.7);
      });
    });

    document.getElementById("btn-pull-shot").addEventListener("click", () => this.pullEspressoShot());
    document.getElementById("btn-start-catcher").addEventListener("click", () => this.startBeanCatcher());

    const cCanvas = document.getElementById("catcher-canvas");
    const updateCupFromClientX = (clientX) => {
      const rect = cCanvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (520 / rect.width);
      this.catcherCupX = Math.max(32, Math.min(488, x));
    };
    cCanvas.addEventListener("pointermove", (e) => updateCupFromClientX(e.clientX));
    cCanvas.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        updateCupFromClientX(e.touches[0].clientX);
      }
    }, { passive: false });

    document.getElementById("btn-reset-memory").addEventListener("click", () => this.resetMemoryBoard());
    this.resetMemoryBoard();

    document.getElementById("btn-roastluck-start").addEventListener("click", () => this.startRoastRisk());
    document.getElementById("btn-roastluck-push").addEventListener("click", () => this.pushRoastRisk());
    document.getElementById("btn-roastluck-cash").addEventListener("click", () => this.cashOutRoastRisk());

    const shopList = document.getElementById("arcade-shop-list");
    shopList.innerHTML = "";
    this.shopUpgrades.forEach((u) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "56px";
      card.innerHTML = `
        <div class="card-accent" style="background: #e67e22;"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${u.name}</span>
            <span class="card-count" id="lvl-${u.id}" style="color: #e67e22;">Lv. 0/${u.max}</span>
          </div>
          <div class="card-desc">${u.desc}</div>
        </div>
        <button class="btn btn-sm" id="btn-${u.id}" type="button">Buy</button>
      `;
      card.querySelector(`#btn-${u.id}`).addEventListener("click", () => {
        const cost = this.getShopCost(u);
        if (u.level < u.max && this.game.arcadeTokens >= cost) {
          this.game.arcadeTokens -= cost;
          u.level += 1;
          this.game.recalculateRates();
          this.game.markDirty();
          this.game.sfx.playBuy(this.game.sfxEnabled, this.game.sfxVolume);
        } else {
          this.game.sfx.playDeny(this.game.sfxEnabled, this.game.sfxVolume);
        }
      });
      shopList.appendChild(card);
    });
  }

  refreshDOM() {
    if (this.game.activeTab !== "arcade") return;
    const nm = this.game.notationMode;
    document.getElementById("arcade-tokens-display").innerHTML =
      `Arcade Tokens: ${formatNum(this.game.arcadeTokens, nm)} 🪙 &nbsp;|&nbsp; Active Arcade Buff: ${this.getArcadeGlobalMult().toFixed(2)}x`;

    if (this.activeGame === "shot") {
      document.getElementById("shot-streak-label").textContent = `Streak: ${this.shotStreak}x`;
      const zone = document.getElementById("shot-sweet-zone");
      zone.style.left = `${this.shotSweetStart}%`;
      zone.style.width = `${this.shotSweetWidth}%`;
      document.getElementById("shot-needle").style.left = `${this.shotPos}%`;
    } else if (this.activeGame === "catcher") {
      document.getElementById("catcher-hud-label").textContent =
        `Score: ${this.catcherScore} | Time: ${Math.ceil(this.catcherTime)}s`;
      this.drawCatcherCanvas();
    } else if (this.activeGame === "roastluck" && !this.roastActive) {
      document.getElementById("btn-roastluck-start").disabled = this.game.beans < 50;
    }

    for (const u of this.shopUpgrades) {
      const cost = this.getShopCost(u);
      const can = u.level < u.max && this.game.arcadeTokens >= cost;
      document.getElementById(`lvl-${u.id}`).textContent = `Lv. ${u.level}/${u.max}`;
      const btn = document.getElementById(`btn-${u.id}`);
      btn.textContent = u.level >= u.max ? "MAX" : `${formatNum(cost, nm)} Tokens`;
      btn.className = `btn btn-sm ${can ? "btn-gold" : "btn-disabled"}`;
      btn.disabled = !can;
    }
  }
}

// =============================================================================
// 10. MASTER GAME ENGINE (INITIALIZATION, REBALANCED CURVES & SAVE/LOAD)
// =============================================================================

class GameState {
  constructor() {
    this.sfxEnabled = true;
    this.sfxVolume = 1.0;
    this.rainEnabled = true;
    this.particlesEnabled = true;
    this.notationMode = "suffix";
    this.buyMode = "1";
    this.wipeConfirmActive = false;
    this.wipeConfirmTimer = 0.0;
    this.saveDirty = false;
    this.lastSaveTimeMs = Date.now();

    // QoL Automation Toggles
    this.autoVent = false;
    this.autoServe = false;
    this.autoSilo = false;
    this.autoBrew = false;
    this.autoRebirth = false;
    this.autoForge = false;

    // Active Click Stances, Ultimates, Crema Spark & Juggle Beans
    this.clickStance = "normal";
    this.ultCharge = 0;
    this.overdriveTimer = 0.0;
    this.mochiBarrageTimer = 0.0;
    this.mochiBarrageTick = 0.0;
    this.cremaSpark = { angle: 0.0, radiusX: 38, radiusY: 5, combo: 0, comboTimer: 0.0 };
    this.juggleBeans = [];

    // Stabilizers
    this.siloLevel = 0;
    this.boilerTemp = 70.0;
    this.overheatLockout = false;
    this.overheatTimer = 0.0;
    this.boilerVents = 0;
    this.sweetSpotAccumTimer = 0.0;

    // Level & Progression
    this.level = 1;
    this.xp = 0.0;
    this.altarBlessings = 0;

    // 3 Core / Service / Arcade Currencies
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    this.lifetimeBeansAll = 0.0;
    this.customerStars = 0;
    this.arcadeTokens = 0;

    // 3 Prestige Currencies
    this.goldenBeans = 0;
    this.lifetimeGolden = 0;
    this.astralCrystals = 0;
    this.lifetimeCrystals = 0;
    this.starlightShards = 0;

    // 12 Cosmic & Transcendent Currencies
    this.darkMatter = 0;
    this.supernovaBeans = 0;
    this.chronosCrystals = 0;
    this.aetherEssence = 0;
    this.omegaSingularity = 0;
    this.celestialDew = 0;
    this.quasarNectar = 0;
    this.voidTruffle = 0;
    this.nebulaHoney = 0;
    this.solarisAmber = 0;
    this.genesisCrema = 0;
    this.eternalBeans = 0;

    // 6 Mid/Late Specialty Currencies
    this.raindropPearls = 0;
    this.velvetCrema = 0;
    this.paradoxDust = 0;
    this.royalSeals = 0;
    this.chronosSand = 0;
    this.purrWhiskers = 0;

    // 6 Ultra-Endgame Currencies
    this.singularityFrags = 0;
    this.architectInk = 0;
    this.voidRelics = 0;
    this.franchiseDeeds = 0;
    this.aetherCaramels = 0;
    this.omniverseSeeds = 0;

    this.specialtyLevels = {};
    for (const sp of SPECIALTY_UPGRADES) {
      this.specialtyLevels[sp.id] = 0;
    }

    this.sanctuaryUnlocked = false;

    // Stats & Timers
    this.manualClicks = 0;
    this.rebirthCount = 0;
    this.dynastyCount = 0;
    this.pantheonCount = 0;
    this.omniverseCount = 0;
    this.croissantsCaught = 0;
    this.ordersCompleted = 0;
    this.totalOrdersSpawned = 0;
    this.plinkoBallsDropped = 0;
    this.playTime = 0.0;
    this.lastAutoBuyTick = 0;
    this.dynastySynthTimer = 0.0;
    this.guildAutoBuyTimer = 0.0;
    this.chronosWarpTimer = 0.0;
    this.sandAccumTimer = 0.0;
    this.fragAccumTimer = 0.0;
    this.deedRoyaltyTimer = 0.0;
    this.sp9Frac = { golden: 0, astral: 0, shards: 0 };
    this.autoForgeTimer = 0.0;

    // Multipliers
    this.bps = 0.0;
    this.clickPower = 1.0;
    this.totalMultiplier = 1.0;
    this.frenzyTimer = 0.0;
    this.frenzyMult = 1.0;
    this.multBreakdown = null;

    // Canvas Entities
    this.catCenter = { x: 88, y: 626 };
    this.catScaleX = 1.0;
    this.catScaleY = 1.0;
    this.purrBlissTimer = 0.0;
    this.purrCombo = 0;

    this.mugCenter = { x: 245, y: 392 };
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.latteStage = 0;

    this.activeTab = "menu";
    this.tabs = [
      "menu", "staff", "decor", "brew", "orders", "arcade", "plinko", "rng",
      "talents", "sinks", "cosmos", "roast", "dynasty", "pantheon", "quests", "config"
    ];

    // Sharpen Canvases for High-DPI / Retina Displays
    enableRetinaCanvas(document.getElementById("scene-canvas"), 450, 652);
    enableRetinaCanvas(document.getElementById("plinko-canvas"), 545, 350);
    enableRetinaCanvas(document.getElementById("catcher-canvas"), 520, 230);
    enableRetinaCanvas(document.getElementById("rng-cutscene-canvas"), 1120, 700);

    this.sfx = new PureSoundEngine();
    this.weather = new WeatherEngine(450, 652);
    this.plinko = new MultiCurrencyPlinko(545, 350);
    this.rng = new RNGManager(this);
    this.arcade = new ArcadeManager(this);
    this.beanEquip = new BeanEquipmentManager(this);

    this.steamParticles = [];
    this.popups = [];
    this.steamTimer = 0.0;
    this.croissant = new GoldenCroissantEvent();

    this.activeOrder = null;
    this.orderTimer = 4.0;
    this.toastQueue = [];
    this.activeToast = null;
    this.toastTimer = 0.0;

    this._lastCurrencyGridHtml = "";
    this._lastMultPopHtml = "";

    this.initCatalogs();
    this.loadGame();
    this.recalculateRates();
    this.buildStaticDOM();
    this.rng.buildDOM();
    this.arcade.buildDOM();
    this.beanEquip.buildDOM();
    this.rng.syncToggleButtons();
    this.syncBuyModeButtons();
    this.syncStanceButtons();
    this.bindEvents();
  }

  markDirty() {
    this.saveDirty = true;
  }

  getSpecialtyLevel(id) {
    return this.specialtyLevels[id] || 0;
  }

  getSpecialtyCost(sp) {
    if (sp.isConsumable) return sp.baseCost;
    const lvl = this.getSpecialtyLevel(sp.id);
    return Math.max(1, Math.floor(sp.baseCost * Math.pow(sp.scale, lvl)));
  }

  getTemporalSpeedMult() {
    const sp4 = this.getSpecialtyLevel("sp4");
    const heldBonus = Math.min(2.0, this.chronosSand * 0.01);
    return 1.0 + sp4 * 0.12 + heldBonus;
  }

  initCatalogs() {
    this.upgrades = [
      new RegularUpgrade("u01", "Cinnamon Dusting", 15, 0.4, 1, "+1 Click & +0.4 BPS (Milestone bonus at 25/50/100...)"),
      new RegularUpgrade("u02", "Vanilla Bean Syrup", 60, 1.2, 2, "+2 Click & +1.2 BPS (Milestone bonus at 25/50/100...)"),
      new RegularUpgrade("u03", "Stoneware Saucer", 180, 3.2, 3, "+3 Click & +3.2 BPS (Milestone bonus at 25/50/100...)"),
      new RegularUpgrade("u04", "French Press Carafe", 550, 8.5, 5, "+5 Click & +8.5 BPS (Milestone bonus at 25/50/100...)"),
      new RegularUpgrade("u05", "Barista Linen Apron", 1600, 22.0, 10, "+10 Click & +22 BPS (Milestone bonus at 25/50/100...)"),
      new RegularUpgrade("u06", "Ceramic Pour-Over Cone", 4800, 58.0, 20, "+20 Click & +58 BPS"),
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
      { uid: "dec3", name: "Brass Wind Chimes", cost: 22000, desc: "Golden Croissants & Shimmering Raindrops spawn 20% faster", buffType: "croissant_rate", buffVal: 1.20, bought: false },
      { uid: "dec4", name: "Antique Oak Bookshelf", cost: 180000, desc: "Earn +25% beans from customer order tips (renders on window ledge)", buffType: "tip_mult", buffVal: 1.25, bought: false },
      { uid: "dec5", name: "Velvet Fireside Armchair", cost: 1.5e6, desc: "+30% offline production rate (adds warm hearth glow)", buffType: "offline_mult", buffVal: 1.30, bought: false },
      { uid: "dec6", name: "Starlight Crystal Terrarium", cost: 18e6, desc: "x1.50 to all production permanently (renders glowing terrarium)", buffType: "total_mult", buffVal: 1.50, bought: false }
    ];

    this.staff = [
      { uid: "s01", name: "Mochi the Calico Cat", role: "Nap Mascot", baseCost: 150, desc: "Automatically pats the mug every second (+1 Auto-Sip/s per level)", level: 0 },
      { uid: "s02", name: "Pip the Sparrow", role: "Window Scout", baseCost: 1200, desc: "Catches Golden Croissants & Shimmering Raindrops (15% chance/lvl)", level: 0 },
      { uid: "s03", name: "Clara the Senior Barista", role: "Floor Manager", baseCost: 8500, desc: "Automatically purchases cheapest Menu upgrades every 3s (scales with Dynasty)", level: 0 },
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
      { uid: "t05", name: "Fortune Bean Shaker", desc: "+8% Croissant spawns, +0.15 Base RNG Luck & -3% Plinko bias", maxRank: 10, rank: 0 },
      { uid: "t06", name: "Cosmic Roasting Lineage", desc: "-5% Rebirth & Dynasty cost requirements", maxRank: 10, rank: 0 }
    ];

    this.milestones = [
      { targetLvl: 5, beans: 25000, golden: 5, crystals: 0, shards: 0, tokens: 10, claimed: false },
      { targetLvl: 10, beans: 150000, golden: 20, crystals: 1, shards: 0, tokens: 25, claimed: false },
      { targetLvl: 20, beans: 1000000, golden: 75, crystals: 5, shards: 0, tokens: 50, claimed: false },
      { targetLvl: 35, beans: 10000000, golden: 250, crystals: 20, shards: 1, tokens: 100, claimed: false },
      { targetLvl: 50, beans: 100000000, golden: 1000, crystals: 60, shards: 5, tokens: 200, claimed: false },
      { targetLvl: 75, beans: 1000000000, golden: 5000, crystals: 200, shards: 15, tokens: 400, claimed: false },
      { targetLvl: 100, beans: 10000000000, golden: 25000, crystals: 1000, shards: 50, tokens: 1000, claimed: false }
    ];

    this.sinks = [
      new EndlessMoneySink("snk1", "Overclocked Boiler", 5e6, 1.45, "beans", "+5% Global Multiplier per level", "total_mult", 0.05),
      new EndlessMoneySink("snk2", "Diamond Steam Tamp", 10e6, 1.50, "beans", "+10% Click Power Multiplier per level", "click_mult", 0.10),
      new EndlessMoneySink("snk3", "Golden Vault Reserve", 100, 1.35, "golden", "+15% Global Multiplier per level", "total_mult", 0.15),
      new EndlessMoneySink("snk4", "Astral Overdrive Core", 25, 1.40, "astral", "+25% Global Multiplier per level", "total_mult", 0.25),
      new EndlessMoneySink("snk5", "Calico Whisker Shrine", 5, 1.60, "purr_whiskers", "+35% Click & Global Multiplier per level", "total_mult", 0.35),
      new EndlessMoneySink("snk6", "Void-Rift Singularity Altar", 3, 1.75, "void_relics", "+150% Global Multiplier per level", "total_mult", 1.50)
    ];

    this.cosmicPerks = [
      new EndlessMoneySink("cos1", "Abyssal Matter Infuser", 1, 1.25, "dark_matter", "+100% Global Multiplier per Dark Matter Roast", "total_mult", 1.00),
      new EndlessMoneySink("cos2", "Supernova Click Corona", 1, 1.30, "supernova", "+5.0x Crit Sip Multiplier per Supernova Bean", "click_mult", 5.00),
      new EndlessMoneySink("cos3", "Chronos Warp Engine", 1, 1.35, "chronos", "+50% Global Mult & 1h BPS warp every 5m/lvl", "total_mult", 0.50),
      new EndlessMoneySink("cos4", "Aetherial Horizon", 1, 1.40, "aether", "+200% Global Multiplier per Aetherial Essence", "total_mult", 2.00),
      new EndlessMoneySink("cos5", "Omega Singularity Void", 1, 1.50, "omega", "+1,000% Global Production per Omega Singularity", "total_mult", 10.00),
      new EndlessMoneySink("cos6", "Genesis Crema Reactor", 1, 1.60, "genesis_crema", "+2,500% Global Production per Genesis Crema", "total_mult", 25.00)
    ];

    this.roasteryUpgrades = [
      { uid: "r01", name: "Master Roaster Certification", baseCost: 1, maxLvl: 15, desc: "+35% total BPS and Click Power per level", count: 0 },
      { uid: "r02", name: "Direct Sourcing Contracts", baseCost: 2, maxLvl: 10, desc: "-5% regular upgrade prices per level (max -50%)", count: 0 },
      { uid: "r03", name: "Heavy Stoneware Ceramic", baseCost: 3, maxLvl: 8, desc: "+15 permanent flat click power per level", count: 0 },
      { uid: "r04", name: "Self-Stirring Brass Spoons", baseCost: 4, maxLvl: 8, desc: "Converts 5% (+2%/Architect Ink) of click power into passive BPS", count: 0 },
      { uid: "r05", name: "Golden Aroma Resonance", baseCost: 5, maxLvl: 12, desc: "+4% additive multiplier per unspent Golden Bean held", count: 0 },
      { uid: "r06", name: "Raindrop Melodic Harmony", baseCost: 6, maxLvl: 10, desc: "+10% multiplier bonus per completed Rebirth", count: 0 },
      { uid: "r07", name: "Caramelized Crema Infusion", baseCost: 8, maxLvl: 8, desc: "x1.40 click power multiplier per level", count: 0 },
      { uid: "r08", name: "Perpetual Steam Generator", baseCost: 12, maxLvl: 6, desc: "+0.06% of bean balance/sec (up to 5x BPS)", count: 0 }
    ];

    this.dynastyPerks = [
      { uid: "d01", name: "Planetary Franchise License", cost: 1, maxLvl: 10, desc: "+150% total production multiplier per level", count: 0 },
      { uid: "d02", name: "Astral Bean Synthesis", cost: 2, maxLvl: 8, desc: "Generates +1 free Golden Bean/lvl every 60 seconds", count: 0 },
      { uid: "d03", name: "Infinite Crema Horizon", cost: 3, maxLvl: 5, desc: "Clicks have a 5%/lvl chance to award 10s of full BPS", count: 0 },
      { uid: "d04", name: "Cosmic Logistics Grid", cost: 4, maxLvl: 5, desc: "Reduces upgrade cost scaling exponent (halved at Lv. 5)", count: 0 },
      { uid: "d05", name: "Celestial Barista Guild", cost: 6, maxLvl: 5, desc: "Auto-buys cheapest upgrades in bulk every 2s (faster per level)", count: 0 },
      { uid: "d06", name: "The Eternal Rainy Cafe", cost: 25, maxLvl: 1, desc: "Permanently grants a x5.0 transcendent multiplier", count: 0 }
    ];

    this.pantheonPerks = [
      { uid: "p01", name: "Constellation of Perpetual Warmth", cost: 1, maxLvl: 5, desc: "x3.0 total global multiplier per level", count: 0 },
      { uid: "p02", name: "Infinite Croissant Galaxy", cost: 2, maxLvl: 5, desc: "+15s Croissant Frenzy per level (Permanent at Lv. 5)", count: 0 },
      { uid: "p03", name: "Starlight Instant Brewing", cost: 3, maxLvl: 3, desc: "Brew Lab craft times reduced by 50% per level", count: 0 },
      { uid: "p04", name: "Cosmic Harmony Singularity", cost: 5, maxLvl: 1, desc: "Golden Beans and Astral Crystals multiply each other", count: 0 }
    ];

    this.quests = [
      { qid: "q01", title: "Sip the Morning Roast", desc: "Manually click the coffee mug.", targetVal: 150, rewardBeans: 25000, rewardStars: 2, rewardTokens: 5, currentVal: 0, completed: false, retired: false, tier: 1, refreshTimer: 0 },
      { qid: "q02", title: "Pamper Mochi", desc: "Pet the sleeping window cat.", targetVal: 15, rewardBeans: 50000, rewardStars: 3, rewardTokens: 6, currentVal: 0, completed: false, retired: false, tier: 1, refreshTimer: 0 },
      { qid: "q03", title: "Order Fulfillment", desc: "Serve customer orders at the counter.", targetVal: 5, rewardBeans: 120000, rewardStars: 5, rewardTokens: 8, currentVal: 0, completed: false, retired: false, tier: 1, refreshTimer: 0 },
      { qid: "q04", title: "Bean Slinger", desc: "Drop balls through Plinko.", targetVal: 10, rewardBeans: 80000, rewardStars: 3, rewardTokens: 6, currentVal: 0, completed: false, retired: false, tier: 1, refreshTimer: 0 },
      { qid: "q05", title: "Brew Master", desc: "Complete recipes in the Brew Lab.", targetVal: 2, rewardBeans: 200000, rewardStars: 6, rewardTokens: 10, currentVal: 0, completed: false, retired: false, tier: 1, refreshTimer: 0 },
      { qid: "q06", title: "Steam Operator", desc: "Vent the espresso boiler.", targetVal: 3, rewardBeans: 150000, rewardStars: 4, rewardTokens: 7, currentVal: 0, completed: false, retired: false, tier: 1, refreshTimer: 0 }
    ];

    this.achievements = [
      { aid: "a01", title: "First Sip", desc: "Click coffee mug 1 time.", check: (s) => s.manualClicks >= 1, unlocked: false },
      { aid: "a02", title: "Warm Routine", desc: "Click coffee mug 1,000 times.", check: (s) => s.manualClicks >= 1000, unlocked: false },
      { aid: "a03", title: "Aromatic Stash", desc: "Accumulate 100,000 Coffee Beans.", check: (s) => s.beans >= 100000, unlocked: false },
      { aid: "a04", title: "Millionaire Barista", desc: "Accumulate 1,000,000 Coffee Beans.", check: (s) => s.beans >= 1000000, unlocked: false },
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
      { aid: "a23", title: "Arcade Regular", desc: "Collect 50 Arcade Tokens.", check: (s) => s.arcadeTokens >= 50, unlocked: false },
      { aid: "a24", title: "Transcendent Roller", desc: "Roll a Transcendent or rarer Aura.", check: (s) => s.rng && s.rng.counts.slice(10).some((c) => c > 0), unlocked: false },
      { aid: "a25", title: "Sanctuary Guardian", desc: "Awaken the Omniversal Rainy Haven.", check: (s) => s.sanctuaryUnlocked, unlocked: false }
    ];
  }

  // --- Economy & Rebalanced Prestige Curves ---

  getMaxStorage() {
    return 50000.0 * Math.pow(4.5, this.siloLevel);
  }

  getSiloUpgradeCost() {
    return Math.floor(this.getMaxStorage() * 0.35);
  }

  getStaffCost(st) { return Math.max(10.0, st.baseCost * Math.pow(1.30, st.level)); }
  getRoasteryCost(upg) { return Math.max(1, Math.floor(upg.baseCost * Math.pow(1.40, upg.count))); }

  getUpgradeExponent() {
    const d04Count = this.dynastyPerks ? this.dynastyPerks[3].count : 0;
    return 1.0 + 0.22 * (1.0 - 0.10 * d04Count);
  }

  getTemperatureMultiplier() {
    const sp2 = this.getSpecialtyLevel("sp2");
    if (this.overheatLockout) {
      return sp2 >= 5 ? 1.0 : 0.20;
    }
    if (this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0) {
      return 1.50 + sp2 * 0.25;
    }
    return 1.0;
  }

  getXpNeeded(lvl) {
    return Math.floor(100 + Math.pow(lvl, 2.2) * 18 + Math.pow(1.10, lvl - 1) * 40);
  }

  getXpMultiplier() {
    let xpMult = 1.0 + this.rebirthCount * 0.25 + this.dynastyCount * 1.0 + this.pantheonCount * 3.0;
    xpMult *= 1.0 + Math.min(this.customerStars, 500) * 0.02;
    if (this.frenzyTimer > 0) xpMult *= 2.0;
    if (this.purrBlissTimer > 0) xpMult *= 1.0 + this.purrCombo * 0.15;
    if (this.sanctuaryUnlocked) xpMult *= 5.0;
    return xpMult;
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
    const eqStats = this.beanEquip ? this.beanEquip.getEquippedStats() : { critChance: 0, critMult: 0 };
    const rngCritBonus = this.rng && this.rng.counts[7] > 0 ? 1.5 : 0.0;
    const truffleCritBonus = this.voidTruffle * 0.10;
    const stanceCritBonus = this.clickStance === "velvet" ? 0.20 : 0.0;
    const chance = Math.min(0.85, 0.01 + this.level * 0.001 + this.talents[0].rank * 0.03 + eqStats.critChance + stanceCritBonus);
    const mult = 3.0 + this.talents[1].rank * 1.5 + this.cosmicPerks[1].level * 5.0 + rngCritBonus + truffleCritBonus + eqStats.critMult;
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
      beans: this.beans,
      stars: this.customerStars,
      tokens: this.arcadeTokens,
      golden: this.goldenBeans,
      astral: this.astralCrystals,
      shards: this.starlightShards,
      dark_matter: this.darkMatter,
      supernova: this.supernovaBeans,
      chronos: this.chronosCrystals,
      aether: this.aetherEssence,
      omega: this.omegaSingularity,
      dew: this.celestialDew,
      quasar: this.quasarNectar,
      void_truffle: this.voidTruffle,
      nebula_honey: this.nebulaHoney,
      solaris_amber: this.solarisAmber,
      genesis_crema: this.genesisCrema,
      eternal: this.eternalBeans,
      raindrop_pearls: this.raindropPearls,
      velvet_crema: this.velvetCrema,
      paradox_dust: this.paradoxDust,
      royal_seals: this.royalSeals,
      chronos_sand: this.chronosSand,
      purr_whiskers: this.purrWhiskers,
      singularity_frags: this.singularityFrags,
      architect_ink: this.architectInk,
      void_relics: this.voidRelics,
      franchise_deeds: this.franchiseDeeds,
      aether_caramels: this.aetherCaramels,
      omniverse_seeds: this.omniverseSeeds
    };
    return map[cType] ?? this.beans;
  }

  addCurrency(cType, amount) {
    if (cType === "beans") {
      const prev = this.beans;
      this.beans = Math.min(this.getMaxStorage(), this.beans + amount);
      const actual = Math.max(0, this.beans - prev);
      this.lifetimeBeansRun += amount;
      this.lifetimeBeansAll += amount;
      this.recalculateRates();
      return actual;
    }

    const whole = Math.floor(amount);
    const frac = amount - whole;
    const amt = whole + (frac > 0 && Math.random() < frac ? 1 : 0);

    if (amt > 0) {
      if (cType === "stars") this.customerStars += amt;
      else if (cType === "tokens") this.arcadeTokens += amt;
      else if (cType === "golden") { this.goldenBeans += amt; this.lifetimeGolden += amt; }
      else if (cType === "astral") { this.astralCrystals += amt; this.lifetimeCrystals += amt; }
      else if (cType === "shards") this.starlightShards += amt;
      else if (cType === "dark_matter") this.darkMatter += amt;
      else if (cType === "supernova") this.supernovaBeans += amt;
      else if (cType === "chronos") this.chronosCrystals += amt;
      else if (cType === "aether") this.aetherEssence += amt;
      else if (cType === "omega") this.omegaSingularity += amt;
      else if (cType === "dew") this.celestialDew += amt;
      else if (cType === "quasar") this.quasarNectar += amt;
      else if (cType === "void_truffle") this.voidTruffle += amt;
      else if (cType === "nebula_honey") this.nebulaHoney += amt;
      else if (cType === "solaris_amber") this.solarisAmber += amt;
      else if (cType === "genesis_crema") this.genesisCrema += amt;
      else if (cType === "eternal") this.eternalBeans += amt;
      else if (cType === "raindrop_pearls") this.raindropPearls += amt;
      else if (cType === "velvet_crema") this.velvetCrema += amt;
      else if (cType === "paradox_dust") this.paradoxDust += amt;
      else if (cType === "royal_seals") this.royalSeals += amt;
      else if (cType === "chronos_sand") this.chronosSand += amt;
      else if (cType === "purr_whiskers") this.purrWhiskers += amt;
      else if (cType === "singularity_frags") this.singularityFrags += amt;
      else if (cType === "architect_ink") this.architectInk += amt;
      else if (cType === "void_relics") this.voidRelics += amt;
      else if (cType === "franchise_deeds") this.franchiseDeeds += amt;
      else if (cType === "aether_caramels") this.aetherCaramels += amt;
      else if (cType === "omniverse_seeds") this.omniverseSeeds += amt;
      this.recalculateRates();
    }
    return amt;
  }

  deductCurrency(cType, amount) {
    const amt = Math.floor(amount);
    if (cType === "beans") this.beans -= amount;
    else if (cType === "stars") this.customerStars -= amt;
    else if (cType === "tokens") this.arcadeTokens -= amt;
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
    else if (cType === "void_truffle") this.voidTruffle -= amt;
    else if (cType === "nebula_honey") this.nebulaHoney -= amt;
    else if (cType === "solaris_amber") this.solarisAmber -= amt;
    else if (cType === "genesis_crema") this.genesisCrema -= amt;
    else if (cType === "eternal") this.eternalBeans -= amt;
    else if (cType === "raindrop_pearls") this.raindropPearls -= amt;
    else if (cType === "velvet_crema") this.velvetCrema -= amt;
    else if (cType === "paradox_dust") this.paradoxDust -= amt;
    else if (cType === "royal_seals") this.royalSeals -= amt;
    else if (cType === "chronos_sand") this.chronosSand -= amt;
    else if (cType === "purr_whiskers") this.purrWhiskers -= amt;
    else if (cType === "singularity_frags") this.singularityFrags -= amt;
    else if (cType === "architect_ink") this.architectInk -= amt;
    else if (cType === "void_relics") this.voidRelics -= amt;
    else if (cType === "franchise_deeds") this.franchiseDeeds -= amt;
    else if (cType === "aether_caramels") this.aetherCaramels -= amt;
    else if (cType === "omniverse_seeds") this.omniverseSeeds -= amt;
    this.recalculateRates();
  }

  // Rebalanced Golden Bean & Prestige Thresholds (Anchored to lifetimeGolden, ^0.60-0.65 root)
  getRebirthThreshold() {
    const base = 25000.0 * Math.pow(1.08, Math.min(this.lifetimeGolden, 650));
    const discount = Math.pow(0.95, this.talents[5].rank);
    return Math.max(10000.0, base * discount);
  }

  getPendingGoldenBeans() {
    const th = this.getRebirthThreshold();
    if (this.lifetimeBeansRun < th) return 0;
    return Math.floor(Math.pow(this.lifetimeBeansRun / th, 0.60));
  }

  getDynastyThreshold() {
    const base = Math.max(40, Math.floor(75.0 * Math.pow(1.45, this.dynastyCount)));
    const discount = Math.pow(0.95, this.talents[5].rank);
    return Math.max(25, Math.floor(base * discount));
  }

  getPendingAstralCrystals() {
    const th = this.getDynastyThreshold();
    if (this.lifetimeGolden < th) return 0;
    return Math.max(1, Math.floor(Math.pow(this.lifetimeGolden / th, 0.65)));
  }

  getPantheonThreshold() {
    return Math.max(20, Math.floor(40.0 * Math.pow(1.50, this.pantheonCount)));
  }

  getPendingStarlightShards() {
    const th = this.getPantheonThreshold();
    if (this.lifetimeCrystals < th) return 0;
    return Math.max(1, Math.floor(Math.pow(this.lifetimeCrystals / th, 0.65)));
  }

  getPendingOmniverseSeeds() {
    if (!this.sanctuaryUnlocked) return 0;
    const totalCosmic = this.darkMatter + this.supernovaBeans + this.chronosCrystals +
      this.aetherEssence + this.omegaSingularity + this.celestialDew +
      this.quasarNectar + this.voidTruffle + this.nebulaHoney +
      this.solarisAmber + this.genesisCrema + this.eternalBeans;
    return Math.max(1, Math.floor(Math.pow(Math.max(1, totalCosmic / 10), 0.60)));
  }

  addXp(amount) {
    this.xp += amount * this.getXpMultiplier();
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
      this.popups.push(new FloatingPopup(`LEVEL UP! Lv. ${this.level} (+1 Skill Point)`, 245, 230, COLORS.gold));
    }
  }

  recalculateRates() {
    const sp7 = this.getSpecialtyLevel("sp7");
    const milestoneStep = 2.0 + sp7 * 0.10;

    let baseBps = 0.0;
    let baseClicks = 1.0;

    for (const upg of this.upgrades) {
      const mMult = upg.getMilestoneMult(milestoneStep);
      baseBps += upg.count * upg.bps * mMult;
      baseClicks += upg.count * upg.clickBoost * mMult;
    }

    baseClicks += this.roasteryUpgrades[2].count * 15.0;

    // 1. Rebalanced Hybrid Additive + Capped Compounding Prestige Tiers
    const rMult = 1.0 + this.rebirthCount * (0.20 + this.roasteryUpgrades[5].count * 0.10);
    const gLinear = 1.0 + this.goldenBeans * (0.15 + this.roasteryUpgrades[4].count * 0.04);
    const gCompound = Math.pow(1.025, Math.min(this.goldenBeans, 300));
    const gMult = gLinear * gCompound;
    const mMult = 1.0 + this.roasteryUpgrades[0].count * 0.35;

    const cPassiveMult = 1.0 + this.astralCrystals * 0.25;
    const dMult = (1.0 + this.dynastyPerks[0].count * 1.5) * cPassiveMult;
    const d06Mult = this.dynastyPerks[5].count > 0 ? 5.0 : 1.0;

    const sPassiveMult = 1.0 + this.starlightShards * 1.00;
    const pMult = Math.pow(3.0, this.pantheonPerks[0].count) * sPassiveMult;
    const harmonyMult = this.pantheonPerks[3].count > 0
      ? 1.0 + this.goldenBeans * this.astralCrystals * 0.02
      : 1.0;
    const prestigeTotal = rMult * gMult * mMult * dMult * d06Mult * pMult * harmonyMult;

    // 2. Cafe, Customer Stars, Milestone-Scaled Altar, Sinks & Active Buffs
    const starMult = sp7 > 0
      ? Math.pow(1.0 + 0.015 + sp7 * 0.002, Math.min(this.customerStars, 2500))
      : 1.0 + this.customerStars * 0.02;

    const frenzy = this.frenzyTimer > 0 ? this.frenzyMult : 1.0;
    const catBliss = this.purrBlissTimer > 0 ? 1.0 + this.purrCombo * 0.10 : 1.0;
    const tempMult = this.getTemperatureMultiplier();
    const levelMult = 1.0 + (this.level - 1) * 0.03;
    const talentBpsMult = 1.0 + this.talents[2].rank * 0.06;
    const altarMilestoneMult = Math.pow(1.5, Math.floor(this.altarBlessings / 25));
    const altarMult = (1.0 + this.altarBlessings * 0.02) * altarMilestoneMult;
    const arcadeMult = this.arcade ? this.arcade.getArcadeGlobalMult() : 1.0;

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

    let rBps = 1.0, rClick = 1.0, rTot = 1.0;
    for (const r of this.recipes) {
      if (r.crafted) {
        if (r.buffType === "bps_mult") rBps *= r.buffVal;
        else if (r.buffType === "click_mult") rClick *= r.buffVal;
        else if (r.buffType === "total_mult") rTot *= r.buffVal;
      }
    }

    const cafeActiveTotal = starMult * frenzy * catBliss * tempMult * levelMult * altarMult * crucibleMult * decorTot * rTot * arcadeMult;

    // 3. All 12 Cosmic & Transcendent Currencies + God-Tier Perks
    let cosmicCurrencyMult =
      (1.0 + this.darkMatter * 1.0) *
      (1.0 + this.supernovaBeans * 2.5) *
      (1.0 + this.chronosCrystals * 6.0) *
      (1.0 + this.aetherEssence * 15.0) *
      (1.0 + this.omegaSingularity * 75.0) *
      (1.0 + this.celestialDew * 250.0) *
      (1.0 + this.quasarNectar * 1000.0) *
      (1.0 + this.voidTruffle * 1500.0) *
      (1.0 + this.nebulaHoney * 2000.0) *
      (1.0 + this.solarisAmber * 3000.0) *
      (1.0 + this.genesisCrema * 4000.0) *
      (1.0 + this.eternalBeans * 5000.0);

    if (this.sanctuaryUnlocked) cosmicCurrencyMult *= 25.0;

    let cosmicPerksMult = 1.0;
    for (const cp of this.cosmicPerks) {
      if (cp.buffType === "total_mult") cosmicPerksMult *= 1.0 + cp.level * cp.buffPerLvl;
      else if (cp.buffType === "click_mult") sinkClickMult *= 1.0 + cp.level * cp.buffPerLvl;
    }
    const cosmicTotal = cosmicCurrencyMult * cosmicPerksMult;

    // 4. 15-Tier RNG Compendium & 20-Rarity Beans Equipment Loadout
    let rngGlobal = 1.0, rngClick = 1.0, rngBps = 1.0, rngSoftCapMult = 1.0;
    if (this.rng) {
      const buffs = this.rng.getCombinedBuffs();
      rngGlobal = buffs.globalMult;
      rngClick = buffs.clickMult;
      rngBps = buffs.bpsMult;
      rngSoftCapMult = buffs.softCapMult;
      if (this.rng.counts[5] > 0) rngClick *= 1.50;
    }

    const eqStats = this.beanEquip
      ? this.beanEquip.getEquippedStats()
      : { clickMult: 1.0, bpsMult: 1.0, globalMult: 1.0 };

    // 5. Raw Total & Soft-Cap Compression
    const sp1 = this.getSpecialtyLevel("sp1");
    const sp6 = this.getSpecialtyLevel("sp6");
    const pearlCapMult = Math.pow(5.0, sp1);
    const softCapExp = Math.min(0.92, 0.65 + sp6 * 0.015);

    const rawMult = prestigeTotal * cafeActiveTotal * cosmicTotal * rngGlobal * eqStats.globalMult;
    const softCapStart = (this.sanctuaryUnlocked ? 1e24 : 1e18) * rngSoftCapMult * pearlCapMult;
    const isSoftCapped = rawMult > softCapStart;

    let compressedMult = isSoftCapped
      ? softCapStart * Math.pow(rawMult / softCapStart, softCapExp)
      : rawMult;

    if (this.omniverseSeeds > 0 && compressedMult > 1.0) {
      compressedMult = Math.pow(compressedMult, 1.0 + this.omniverseSeeds * 0.015);
    }
    this.totalMultiplier = compressedMult;

    this.multBreakdown = {
      rebirthAndGolden: rMult * gMult * mMult,
      dynastyAndPantheon: dMult * d06Mult * pMult * harmonyMult,
      prestigeTotal,
      cafePermanent: levelMult * starMult * altarMult * decorTot * crucibleMult * rTot,
      activeTempAndEvents: tempMult * frenzy * catBliss * arcadeMult,
      cosmicCurrencyMult,
      cosmicPerksMult,
      cosmicTotal,
      rngGlobal,
      rngBps,
      rngClick,
      beanEquipGlobal: eqStats.globalMult,
      rawMult,
      softCapStart,
      softCapExp,
      isSoftCapped,
      finalMult: this.totalMultiplier
    };

    const stanceClickMult = this.clickStance === "turbo" ? 2.5 : 1.0;

    this.clickPower =
      baseClicks * this.totalMultiplier * rClick * decorClick *
      sinkClickMult * rngClick * eqStats.clickMult * stanceClickMult *
      Math.pow(1.40, this.roasteryUpgrades[6].count);

    const spoonRate = 0.05 + sp7 * 0.02;
    const spoonBonusBps = this.roasteryUpgrades[3].count * spoonRate * this.clickPower;
    this.bps = baseBps * this.totalMultiplier * rBps * decorBps * talentBpsMult * rngBps * eqStats.bpsMult + spoonBonusBps;

    if (this.lifetimeBeansAll >= 1e15) this.latteStage = 5;
    else if (this.lifetimeBeansAll >= 1e11) this.latteStage = 4;
    else if (this.lifetimeBeansAll >= 1e8) this.latteStage = 3;
    else if (this.lifetimeBeansAll >= 1e5) this.latteStage = 2;
    else if (this.lifetimeBeansAll >= 1e3) this.latteStage = 1;
    else this.latteStage = 0;
  }

  // --- Gameplay, Ultimates & Bulk Actions ---

  syncStanceButtons() {
    document.querySelectorAll(".stance-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.stance === this.clickStance);
    });
  }

  triggerUltimate(type) {
    if (type === "overdrive" && this.ultCharge >= 40) {
      this.ultCharge -= 40;
      this.overdriveTimer = 8.0;
      this.boilerTemp = 90.0;
      this.overheatLockout = false;
      this.recalculateRates();
      this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("🔥 DOUBLE-SPOUT OVERDRIVE (8s)!", 245, 255, COLORS.gold));
    } else if (type === "magnet" && this.ultCharge >= 80) {
      this.ultCharge -= 80;
      this.raindropPearls += 3;
      this.croissantsCaught += 2;
      this.triggerCroissantFrenzy(245, 240, "🌧️ RAINSTORM MAGNET! (+3 Pearls & Frenzy!)");
    } else if (type === "mochi" && this.ultCharge >= 120) {
      this.ultCharge -= 120;
      this.mochiBarrageTimer = 10.0;
      this.mochiBarrageTick = 0.0;
      this.sfx.playPurr(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("🐾 MOCHI PAW BARRAGE (15x Clicks/s)!", 245, 255, COLORS.purrWhisker));
    }
  }

  triggerCroissantFrenzy(popupX = 245, popupY = 265, label = "CAFFEINE FRENZY! (7x)") {
    const p02Count = this.pantheonPerks[1].count;
    const sp10 = this.getSpecialtyLevel("sp10");

    if (sp10 > 0 && this.frenzyTimer > 0) {
      const maxFrenzy = Math.min(2401.0, 7.0 * Math.pow(7.0, Math.min(3, sp10)));
      this.frenzyMult = Math.min(maxFrenzy, this.frenzyMult * 7.0);
      label = `SUPER FRENZY STACKED! (${formatNum(this.frenzyMult, this.notationMode)}x)`;
    } else {
      this.frenzyMult = 7.0;
    }

    this.frenzyTimer = p02Count >= 5 ? 999999.0 : 20.0 + p02Count * 15.0;
    this.addXp(160);
    this.recalculateRates();
    this.markDirty();
    this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(label, popupX, popupY, COLORS.gold));
  }

  upgradeSilo() {
    const cost = this.getSiloUpgradeCost();
    if (this.beans >= cost) {
      this.beans -= cost;
      this.siloLevel += 1;
      this.markDirty();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`Silo Upgraded! (Cap: ${formatNum(this.getMaxStorage(), this.notationMode)})`, 245, 225, COLORS.success));
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
    this.popups.push(new FloatingPopup("Steam Vented!", 245, 305, COLORS.heatCold));
  }

  serveCurrentOrder() {
    if (!this.activeOrder) return false;
    const isStarterOrder = this.activeOrder.recipeName === "House Drip Coffee";
    const rec = this.recipes.find((r) => r.name === this.activeOrder.recipeName);
    if (isStarterOrder || (rec && rec.crafted)) {
      const isVip = !!this.activeOrder.isVip;
      let payout = Math.max(250.0, this.bps * 40.0 * this.activeOrder.rewardMult * (isVip ? 3.0 : 1.0));
      const tipDecor = this.decor[3].bought ? this.decor[3].buffVal : 1.0;
      const talentTip = 1.0 + this.talents[3].rank * 0.15;
      const honeyTip = 1.0 + this.nebulaHoney * 0.25;
      payout *= (1.0 + this.staff[4].level * 0.25) * tipDecor * talentTip * honeyTip;

      this.beans = Math.min(this.getMaxStorage(), this.beans + payout);
      this.lifetimeBeansRun += payout;
      this.lifetimeBeansAll += payout;

      this.customerStars += isVip ? 3 : 1;
      this.ordersCompleted += 1;
      this.quests[2].currentVal += 1;

      if (isVip) {
        this.royalSeals += 1;
        this.popups.push(new FloatingPopup(`👑 VIP CRITIC SERVED! +1 Royal Seal & +${formatNum(payout, this.notationMode)}!`, 245, 245, COLORS.royalSeal));
      } else {
        this.popups.push(new FloatingPopup(`+${formatNum(payout, this.notationMode)} Tip!`, 245, 265, COLORS.star));
      }

      this.activeOrder = null;
      this.orderTimer = Math.max(2.5, 8.0 - this.talents[3].rank * 0.4);
      this.addXp(isVip ? 750 : 350);
      this.recalculateRates();
      this.markDirty();
      this.sfx.playOrder(this.sfxEnabled, this.sfxVolume);
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
        const prevCount = upg.count;
        const upgIdx = this.upgrades.indexOf(upg);
        this.beans -= cost;
        upg.count += qty;
        purchased = true;
        this.addXp(22 * (upgIdx + 1) * Math.min(qty, 25));

        if ((prevCount < 500 && upg.count >= 500) || (prevCount < 1000 && upg.count >= 1000)) {
          this.architectInk += 1;
          this.popups.push(new FloatingPopup(`MILESTONE! +1 Architect's Ink!`, 245, 200, COLORS.architectInk));
        }
      }
    }
    if (purchased) {
      this.recalculateRates();
      this.markDirty();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("ALL AFFORDABLE BOUGHT!", 245, 225, COLORS.success));
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
          this.addXp(110 * cheapest.level);
          if (cheapest.level % 10 === 0) {
            this.purrWhiskers += 1;
          }
          boughtAny = true;
          changed = true;
        }
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.markDirty();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("STAFF MAXED!", 245, 225, COLORS.star));
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
          this.addXp(300);
          boughtAny = true;
          changed = true;
        }
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.markDirty();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("ROASTERY UPGRADES MAXED!", 245, 225, COLORS.gold));
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
        this.addXp(1200);
        boughtAny = true;
        changed = true;
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.markDirty();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("CRYSTAL PERKS MAXED!", 245, 225, COLORS.astral));
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
        this.addXp(5000);
        boughtAny = true;
        changed = true;
      }
    }
    if (boughtAny) {
      this.recalculateRates();
      this.markDirty();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("PANTHEON PERKS MAXED!", 245, 225, COLORS.pantheon));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  applyPrestigeKeepers() {
    const sp3 = this.getSpecialtyLevel("sp3");
    if (sp3 > 0) {
      this.siloLevel = Math.max(this.siloLevel, sp3 * 3);
      for (let i = 0; i < Math.min(this.recipes.length, sp3); i++) {
        this.recipes[i].crafted = true;
        this.recipes[i].brewing = false;
      }
    }
  }

  triggerRebirth() {
    const earned = this.getPendingGoldenBeans();
    if (earned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    if (this.arcade) this.arcade.cancelRoastRisk();
    this.goldenBeans += earned;
    this.lifetimeGolden += earned;
    this.rebirthCount += 1;
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    for (const u of this.upgrades) u.count = 0;
    this.applyPrestigeKeepers();
    this.addXp(500 * this.rebirthCount);
    this.recalculateRates();
    this.saveGame();
    this.sfx.playRebirth(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${earned} GOLDEN BEANS!`, 245, 245, COLORS.gold));
  }

  triggerDynasty() {
    const earned = this.getPendingAstralCrystals();
    if (earned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    if (this.arcade) this.arcade.cancelRoastRisk();
    this.astralCrystals += earned;
    this.lifetimeCrystals += earned;
    this.dynastyCount += 1;
    this.beans = 0.0;
    this.goldenBeans = 0;
    this.lifetimeBeansRun = 0.0;
    this.lifetimeGolden = 0;
    this.rebirthCount = 0;
    for (const u of this.upgrades) u.count = 0;
    for (const r of this.roasteryUpgrades) r.count = 0;
    this.applyPrestigeKeepers();
    this.addXp(2500 * this.dynastyCount);
    this.recalculateRates();
    this.saveGame();
    this.sfx.playAstral(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${earned} ASTRAL CRYSTALS!`, 245, 245, COLORS.astral));
  }

  triggerPantheon() {
    const earned = this.getPendingStarlightShards();
    if (earned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    if (this.arcade) this.arcade.cancelRoastRisk();

    if (this.multBreakdown && this.multBreakdown.isSoftCapped) {
      this.singularityFrags += 5;
    }
    if (this.starlightShards >= 1000) {
      const deedsGained = Math.max(1, Math.floor(this.starlightShards / 1000));
      this.franchiseDeeds += deedsGained;
      this.popups.push(new FloatingPopup(`+${deedsGained} Multiversal Franchise Deeds!`, 245, 215, COLORS.franchiseDeed));
    }

    this.starlightShards += earned;
    this.pantheonCount += 1;
    this.beans = 0.0;
    this.goldenBeans = 0;
    this.astralCrystals = 0;
    this.lifetimeBeansRun = 0.0;
    this.lifetimeGolden = 0;
    this.lifetimeCrystals = 0;
    this.rebirthCount = 0;
    this.dynastyCount = 0;
    for (const u of this.upgrades) u.count = 0;
    for (const r of this.roasteryUpgrades) r.count = 0;
    for (const d of this.dynastyPerks) d.count = 0;
    this.applyPrestigeKeepers();
    this.addXp(10000 * this.pantheonCount);
    this.recalculateRates();
    this.saveGame();
    this.sfx.playPantheon(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${earned} STARLIGHT SHARDS!`, 245, 245, COLORS.pantheon));
  }

  triggerOmniverseTranscendence() {
    const seedsEarned = this.getPendingOmniverseSeeds();
    if (!this.sanctuaryUnlocked || seedsEarned <= 0) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      return;
    }
    if (this.arcade) this.arcade.cancelRoastRisk();
    this.omniverseSeeds += seedsEarned;
    this.omniverseCount += 1;

    this.darkMatter = 0;
    this.supernovaBeans = 0;
    this.chronosCrystals = 0;
    this.aetherEssence = 0;
    this.omegaSingularity = 0;
    this.celestialDew = 0;
    this.quasarNectar = 0;
    this.voidTruffle = 0;
    this.nebulaHoney = 0;
    this.solarisAmber = 0;
    this.genesisCrema = 0;
    this.eternalBeans = 0;
    this.sanctuaryUnlocked = false;
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    for (const u of this.upgrades) u.count = 0;
    this.applyPrestigeKeepers();

    this.recalculateRates();
    this.saveGame();
    this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup(`+${seedsEarned} OMNIVERSE SEEDS HARVESTED!`, 245, 225, COLORS.omniverseSeed));
  }

  checkGoalCompletion() {
    return (
      this.level >= 100 &&
      this.recipes.every((r) => r.crafted) &&
      this.siloLevel >= 45 &&
      this.omegaSingularity >= 10 &&
      this.genesisCrema >= 3 &&
      this.eternalBeans >= 1
    );
  }

  activateSanctuary() {
    if (this.checkGoalCompletion() && !this.sanctuaryUnlocked) {
      this.sanctuaryUnlocked = true;
      this.franchiseDeeds += 3;
      this.recalculateRates();
      this.saveGame();
      this.sfx.playLevelup(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("★ SANCTUARY AWAKENED! (+2500% & +3 Deeds) ★", 245, 225, COLORS.gold));
    } else {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  syncBuyModeButtons() {
    document.querySelectorAll(".mode-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === this.buyMode);
    });
  }

  // --- Save, Load, Sanitize & Modern UTF-8 Base64 Export/Import ---

  buildSavePayload() {
    const plinkoRefunds = this.plinko ? this.plinko.getPendingRefundsByCurrency() : {};
    const rngRefunds = this.rng ? this.rng.getPendingRefunds() : {};
    const beRefunds = this.beanEquip ? this.beanEquip.getPendingRefunds() : {};
    const sumRefund = (k) => (plinkoRefunds[k] || 0) + (rngRefunds[k] || 0) + (beRefunds[k] || 0);

    return {
      autoVent: this.autoVent,
      autoServe: this.autoServe,
      autoSilo: this.autoSilo,
      autoBrew: this.autoBrew,
      autoRebirth: this.autoRebirth,
      autoForge: this.autoForge,
      clickStance: this.clickStance,
      ultCharge: this.ultCharge,
      level: this.level,
      xp: safeNum(this.xp, 0),
      playTime: this.playTime,
      siloLevel: this.siloLevel,
      boilerTemp: this.boilerTemp,
      altarBlessings: this.altarBlessings,
      boilerVents: this.boilerVents,
      plinkoBallsDropped: this.plinkoBallsDropped,
      croissantsCaught: this.croissantsCaught,
      totalOrdersSpawned: this.totalOrdersSpawned,
      sanctuaryUnlocked: this.sanctuaryUnlocked,
      specialtyLevels: { ...this.specialtyLevels },
      sinks: Object.fromEntries(this.sinks.map((s) => [s.uid, s.level])),
      cosmicPerks: Object.fromEntries(this.cosmicPerks.map((c) => [c.uid, c.level])),
      talents: Object.fromEntries(this.talents.map((t) => [t.uid, t.rank])),
      milestones: this.milestones.filter((m) => m.claimed).map((m) => m.targetLvl),
      achievements: this.achievements.filter((a) => a.unlocked).map((a) => a.aid),
      quests: this.quests.map((q) => ({
        qid: q.qid, cur: q.currentVal, done: q.completed, retired: !!q.retired,
        target: q.targetVal, rwBeans: q.rewardBeans, rwStars: q.rewardStars, rwTokens: q.rewardTokens, tier: q.tier
      })),
      sfxEnabled: this.sfxEnabled,
      sfxVolume: this.sfxVolume,
      rainEnabled: this.rainEnabled,
      particlesEnabled: this.particlesEnabled,
      notationMode: this.notationMode,
      buyMode: this.buyMode,
      beans: safeNum(this.beans + sumRefund("beans"), 0),
      lifetimeBeansRun: safeNum(this.lifetimeBeansRun, 0),
      lifetimeBeansAll: safeNum(this.lifetimeBeansAll, 0),
      customerStars: this.customerStars + sumRefund("stars"),
      arcadeTokens: this.arcadeTokens + sumRefund("tokens"),
      goldenBeans: this.goldenBeans + sumRefund("golden"),
      lifetimeGolden: this.lifetimeGolden,
      astralCrystals: this.astralCrystals + sumRefund("astral"),
      lifetimeCrystals: this.lifetimeCrystals,
      starlightShards: this.starlightShards + sumRefund("shards"),
      darkMatter: this.darkMatter + sumRefund("dark_matter"),
      supernovaBeans: this.supernovaBeans + sumRefund("supernova"),
      chronosCrystals: this.chronosCrystals + sumRefund("chronos"),
      aetherEssence: this.aetherEssence + sumRefund("aether"),
      omegaSingularity: this.omegaSingularity + sumRefund("omega"),
      celestialDew: this.celestialDew + sumRefund("dew"),
      quasarNectar: this.quasarNectar + sumRefund("quasar"),
      voidTruffle: this.voidTruffle + sumRefund("void_truffle"),
      nebulaHoney: this.nebulaHoney + sumRefund("nebula_honey"),
      solarisAmber: this.solarisAmber + sumRefund("solaris_amber"),
      genesisCrema: this.genesisCrema + sumRefund("genesis_crema"),
      eternalBeans: this.eternalBeans + sumRefund("eternal"),
      raindropPearls: this.raindropPearls + sumRefund("raindrop_pearls"),
      velvetCrema: this.velvetCrema + sumRefund("velvet_crema"),
      paradoxDust: this.paradoxDust + sumRefund("paradox_dust"),
      royalSeals: this.royalSeals + sumRefund("royal_seals"),
      chronosSand: this.chronosSand + sumRefund("chronos_sand"),
      purrWhiskers: this.purrWhiskers + sumRefund("purr_whiskers"),
      singularityFrags: this.singularityFrags + sumRefund("singularity_frags"),
      architectInk: this.architectInk + sumRefund("architect_ink"),
      voidRelics: this.voidRelics + sumRefund("void_relics"),
      franchiseDeeds: this.franchiseDeeds + sumRefund("franchise_deeds"),
      aetherCaramels: this.aetherCaramels + sumRefund("aether_caramels"),
      omniverseSeeds: this.omniverseSeeds + sumRefund("omniverse_seeds"),
      manualClicks: this.manualClicks,
      rebirthCount: this.rebirthCount,
      dynastyCount: this.dynastyCount,
      pantheonCount: this.pantheonCount,
      omniverseCount: this.omniverseCount,
      ordersCompleted: this.ordersCompleted,
      lastSaveTimestamp: Date.now() / 1000,
      upgrades: Object.fromEntries(this.upgrades.map((u) => [u.uid, u.count])),
      decor: Object.fromEntries(this.decor.map((d) => [d.uid, d.bought])),
      staff: Object.fromEntries(this.staff.map((s) => [s.uid, s.level])),
      roastery: Object.fromEntries(this.roasteryUpgrades.map((r) => [r.uid, r.count])),
      dynasty: Object.fromEntries(this.dynastyPerks.map((d) => [d.uid, d.count])),
      pantheon: Object.fromEntries(this.pantheonPerks.map((p) => [p.uid, p.count])),
      recipes: Object.fromEntries(this.recipes.map((r) => [r.uid, { crafted: r.crafted, brewing: r.brewing, progress: r.progress }])),
      rng: {
        totalRolls: this.rng.totalRolls,
        counts: this.rng.counts,
        fiveStarAwarded: this.rng.fiveStarAwarded,
        equippedIndex: this.rng.equippedIndex,
        subEquippedIndex: this.rng.subEquippedIndex,
        autoRoll: this.rng.autoRoll,
        fastRoll: this.rng.fastRoll,
        turboRoll: this.rng.turboRoll,
        cutsceneThreshold: this.rng.cutsceneThreshold,
        traits: this.rng.traitSockets.map((t) => t.level),
        upgrades: this.rng.upgrades.map((u) => u.level),
        gear: Object.fromEntries(this.rng.gear.map((g) => [g.id, g.crafted]))
      },
      beanEquip: {
        counts: this.beanEquip.counts,
        equipped: this.beanEquip.equipped,
        luckLevel: this.beanEquip.luckLevel,
        totalRolls: this.beanEquip.totalRolls,
        pityRolls: this.beanEquip.pityRolls
      },
      arcadeShop: this.arcade.shopUpgrades.map((u) => u.level)
    };
  }

  saveGame() {
    try {
      const payload = this.buildSavePayload();
      localStorage.setItem("rainy_cafe_grand_master_save", JSON.stringify(payload));
      this.saveDirty = false;
      this.lastSaveTimeMs = Date.now();
    } catch (e) {
      console.warn("Save failed:", e);
    }
  }

  applyLoadedData(data) {
    this.level = data.level ?? 1;
    this.xp = safeNum(data.xp, 0.0);
    this.playTime = data.playTime ?? 0.0;
    this.siloLevel = data.siloLevel ?? 0;
    this.boilerTemp = data.boilerTemp ?? 70.0;
    this.altarBlessings = data.altarBlessings ?? 0;
    this.boilerVents = data.boilerVents ?? 0;
    this.plinkoBallsDropped = data.plinkoBallsDropped ?? 0;
    this.croissantsCaught = data.croissantsCaught ?? 0;
    this.totalOrdersSpawned = data.totalOrdersSpawned ?? 0;
    this.sanctuaryUnlocked = data.sanctuaryUnlocked ?? false;
    this.autoVent = data.autoVent ?? false;
    this.autoServe = data.autoServe ?? false;
    this.autoSilo = data.autoSilo ?? false;
    this.autoBrew = data.autoBrew ?? false;
    this.autoRebirth = data.autoRebirth ?? false;
    this.autoForge = data.autoForge ?? false;
    this.clickStance = data.clickStance ?? "turbo";
    this.ultCharge = data.ultCharge ?? 0;

    if (data.specialtyLevels) {
      for (const sp of SPECIALTY_UPGRADES) {
        this.specialtyLevels[sp.id] = data.specialtyLevels[sp.id] ?? 0;
      }
    }

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
          q.retired = !!qData.retired;
          if (qData.target) q.targetVal = qData.target;
          if (qData.rwBeans && Number.isFinite(qData.rwBeans)) q.rewardBeans = qData.rwBeans;
          if (qData.rwStars) q.rewardStars = qData.rwStars;
          if (qData.rwTokens) q.rewardTokens = qData.rwTokens;
          if (qData.tier) q.tier = qData.tier;
        }
      }
    }

    this.sfxEnabled = data.sfxEnabled ?? true;
    this.sfxVolume = data.sfxVolume ?? 1.0;
    this.rainEnabled = data.rainEnabled ?? true;
    this.particlesEnabled = data.particlesEnabled ?? true;
    this.notationMode = data.notationMode ?? "suffix";
    this.buyMode = data.buyMode ?? "1";

    this.beans = safeNum(data.beans, 0.0);
    this.lifetimeBeansRun = safeNum(data.lifetimeBeansRun, 0.0);
    this.lifetimeBeansAll = safeNum(data.lifetimeBeansAll, 0.0);
    this.customerStars = data.customerStars ?? 0;
    this.arcadeTokens = data.arcadeTokens ?? 0;
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
    this.voidTruffle = data.voidTruffle ?? 0;
    this.nebulaHoney = data.nebulaHoney ?? 0;
    this.solarisAmber = data.solarisAmber ?? 0;
    this.genesisCrema = data.genesisCrema ?? 0;
    this.eternalBeans = data.eternalBeans ?? 0;

    this.raindropPearls = data.raindropPearls ?? 0;
    this.velvetCrema = data.velvetCrema ?? 0;
    this.paradoxDust = data.paradoxDust ?? 0;
    this.royalSeals = data.royalSeals ?? 0;
    this.chronosSand = data.chronosSand ?? 0;
    this.purrWhiskers = data.purrWhiskers ?? 0;

    this.singularityFrags = data.singularityFrags ?? 0;
    this.architectInk = data.architectInk ?? 0;
    this.voidRelics = data.voidRelics ?? 0;
    this.franchiseDeeds = data.franchiseDeeds ?? 0;
    this.aetherCaramels = data.aetherCaramels ?? 0;
    this.omniverseSeeds = data.omniverseSeeds ?? 0;

    this.manualClicks = data.manualClicks ?? 0;
    this.rebirthCount = data.rebirthCount ?? 0;
    this.dynastyCount = data.dynastyCount ?? 0;
    this.pantheonCount = data.pantheonCount ?? 0;
    this.omniverseCount = data.omniverseCount ?? 0;
    this.ordersCompleted = data.ordersCompleted ?? 0;

    for (const u of this.upgrades) u.count = data.upgrades?.[u.uid] ?? 0;
    for (const d of this.decor) d.bought = data.decor?.[d.uid] ?? false;
    for (const s of this.staff) s.level = data.staff?.[s.uid] ?? 0;
    for (const r of this.roasteryUpgrades) r.count = data.roastery?.[r.uid] ?? 0;
    for (const dyn of this.dynastyPerks) dyn.count = data.dynasty?.[dyn.uid] ?? 0;
    for (const p of this.pantheonPerks) p.count = data.pantheon?.[p.uid] ?? 0;

    for (const rec of this.recipes) {
      const savedRec = data.recipes?.[rec.uid];
      if (typeof savedRec === "boolean") {
        rec.crafted = savedRec;
      } else if (savedRec && typeof savedRec === "object") {
        rec.crafted = !!savedRec.crafted;
        rec.brewing = !!savedRec.brewing && !rec.crafted;
        rec.progress = savedRec.progress ?? 0;
      }
    }

    if (data.rng) {
      this.rng.totalRolls = data.rng.totalRolls ?? 0;
      if (Array.isArray(data.rng.counts)) {
        for (let i = 0; i < Math.min(data.rng.counts.length, RNG_RARITIES.length); i++) {
          this.rng.counts[i] = data.rng.counts[i] || 0;
        }
      }
      if (Array.isArray(data.rng.fiveStarAwarded)) {
        for (let i = 0; i < Math.min(data.rng.fiveStarAwarded.length, RNG_RARITIES.length); i++) {
          this.rng.fiveStarAwarded[i] = !!data.rng.fiveStarAwarded[i];
        }
      }
      this.rng.equippedIndex = data.rng.equippedIndex ?? -1;
      this.rng.subEquippedIndex = data.rng.subEquippedIndex ?? -1;
      this.rng.autoRoll = !!data.rng.autoRoll;
      this.rng.fastRoll = !!data.rng.fastRoll;
      this.rng.turboRoll = !!data.rng.turboRoll;
      this.rng.cutsceneThreshold = data.rng.cutsceneThreshold ?? 4;
      if (Array.isArray(data.rng.traits)) {
        data.rng.traits.forEach((lvl, i) => {
          if (this.rng.traitSockets[i]) this.rng.traitSockets[i].level = lvl;
        });
      }
      if (Array.isArray(data.rng.upgrades)) {
        data.rng.upgrades.forEach((lvl, i) => {
          if (this.rng.upgrades[i]) this.rng.upgrades[i].level = lvl;
        });
      }
      if (data.rng.gear) {
        for (const g of this.rng.gear) {
          g.crafted = !!data.rng.gear[g.id];
        }
      }
    }

    if (data.beanEquip && this.beanEquip) {
      if (Array.isArray(data.beanEquip.counts)) {
        for (let i = 0; i < Math.min(data.beanEquip.counts.length, BEAN_EQUIP_RARITIES.length); i++) {
          this.beanEquip.counts[i] = data.beanEquip.counts[i] || 0;
        }
      }
      if (Array.isArray(data.beanEquip.equipped)) {
        this.beanEquip.equipped = data.beanEquip.equipped
          .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < BEAN_EQUIP_RARITIES.length)
          .slice(0, 2);
      }
      this.beanEquip.luckLevel = data.beanEquip.luckLevel ?? 0;
      this.beanEquip.totalRolls = data.beanEquip.totalRolls ?? 0;
      this.beanEquip.pityRolls = data.beanEquip.pityRolls ?? 0;
    }

    if (Array.isArray(data.arcadeShop)) {
      data.arcadeShop.forEach((lvl, i) => {
        if (this.arcade.shopUpgrades[i]) this.arcade.shopUpgrades[i].level = lvl;
      });
    }

    if (!Number.isFinite(this.beans) || this.beans < 0) this.beans = this.getMaxStorage();
    if (!Number.isFinite(this.lifetimeBeansRun) || this.lifetimeBeansRun < 0) this.lifetimeBeansRun = this.beans;
    if (!Number.isFinite(this.lifetimeBeansAll) || this.lifetimeBeansAll < 0) this.lifetimeBeansAll = this.beans;

    const brewQuest = this.quests.find((q) => q.qid === "q05");
    if (brewQuest && (!Number.isFinite(brewQuest.rewardBeans) || brewQuest.tier > 12)) {
      brewQuest.tier = 1;
      brewQuest.targetVal = 12;
      brewQuest.currentVal = 12;
      brewQuest.rewardBeans = 200000;
      brewQuest.rewardStars = 6;
      brewQuest.rewardTokens = 10;
      brewQuest.completed = true;
      brewQuest.retired = this.recipes.every((r) => r.crafted);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem("rainy_cafe_grand_master_save");
      if (!raw) return;
      const data = JSON.parse(raw);
      this.applyLoadedData(data);

      const lastTs = data.lastSaveTimestamp ?? 0;
      if (lastTs > 0) {
        const elapsed = Date.now() / 1000 - lastTs;
        if (elapsed > 15) {
          const sp1 = this.getSpecialtyLevel("sp1");
          let offlinePct = Math.min(1.0, 0.20 + this.staff[3].level * 0.10 + sp1 * 0.03 + this.chronosCrystals * 0.02);
          if (this.decor[4].bought) offlinePct = Math.min(1.0, offlinePct + 0.30);
          this.recalculateRates();
          const prev = this.beans;
          const rawOffline = this.bps * elapsed * offlinePct;
          this.beans = Math.min(this.getMaxStorage(), this.beans + rawOffline);
          const offlineEarned = Math.max(0, this.beans - prev);
          this.lifetimeBeansRun += rawOffline;
          this.lifetimeBeansAll += rawOffline;
          const xpEarned = Math.max(15, Math.floor(Math.log10(Math.max(10.0, rawOffline)) * 22.0));
          this.addXp(xpEarned);

          const mins = Math.floor(elapsed / 60);
          const timeLabel = mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${Math.max(1, mins)}m`;
          const banner = document.getElementById("offline-banner");
          const sumEl = document.getElementById("offline-summary-text");
          if (banner && sumEl) {
            sumEl.textContent = `Away ${timeLabel} (${Math.round(offlinePct * 100)}% rate): +${formatNum(offlineEarned, this.notationMode)} Beans & +${formatNum(xpEarned, this.notationMode)} XP!`;
            banner.classList.remove("hidden");
          }
        }
      }
    } catch (e) {
      console.warn("Load failed:", e);
    }
  }

  // Modern UTF-8 Safe Base64 Save Export & Import (Replaces deprecated escape/unescape)
  exportSaveBase64() {
    try {
      const json = JSON.stringify(this.buildSavePayload());
      const bytes = new TextEncoder().encode(json);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      return btoa(bin);
    } catch (e) {
      return "";
    }
  }

  importSaveBase64(b64Str) {
    try {
      const bin = atob(b64Str.trim());
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const data = JSON.parse(json);
      if (!data || typeof data !== "object") return false;
      this.applyLoadedData(data);
      this.recalculateRates();
      this.saveGame();
      this.rng.syncToggleButtons();
      this.syncBuyModeButtons();
      this.syncStanceButtons();
      return true;
    } catch (e) {
      return false;
    }
  }

  wipeAllData() {
    localStorage.removeItem("rainy_cafe_grand_master_save");
    this.level = 1;
    this.xp = 0.0;
    this.playTime = 0.0;
    this.siloLevel = 0;
    this.boilerTemp = 70.0;
    this.overheatLockout = false;
    this.altarBlessings = 0;
    this.boilerVents = 0;
    this.plinkoBallsDropped = 0;
    this.beans = 0.0;
    this.lifetimeBeansRun = 0.0;
    this.lifetimeBeansAll = 0.0;
    this.customerStars = 0;
    this.arcadeTokens = 0;
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
    this.voidTruffle = 0;
    this.nebulaHoney = 0;
    this.solarisAmber = 0;
    this.genesisCrema = 0;
    this.eternalBeans = 0;
    this.raindropPearls = 0;
    this.velvetCrema = 0;
    this.paradoxDust = 0;
    this.royalSeals = 0;
    this.chronosSand = 0;
    this.purrWhiskers = 0;
    this.singularityFrags = 0;
    this.architectInk = 0;
    this.voidRelics = 0;
    this.franchiseDeeds = 0;
    this.aetherCaramels = 0;
    this.omniverseSeeds = 0;
    this.sp9Frac = { golden: 0, astral: 0, shards: 0 };

    for (const sp of SPECIALTY_UPGRADES) {
      this.specialtyLevels[sp.id] = 0;
    }

    this.sanctuaryUnlocked = false;
    this.autoSilo = false;
    this.autoBrew = false;
    this.autoRebirth = false;
    this.autoForge = false;
    this.clickStance = "turbo";
    this.ultCharge = 0;
    this.overdriveTimer = 0.0;
    this.mochiBarrageTimer = 0.0;
    this.juggleBeans = [];
    this.manualClicks = 0;
    this.rebirthCount = 0;
    this.dynastyCount = 0;
    this.pantheonCount = 0;
    this.omniverseCount = 0;
    this.croissantsCaught = 0;
    this.ordersCompleted = 0;
    this.totalOrdersSpawned = 0;
    this.dynastySynthTimer = 0.0;
    this.guildAutoBuyTimer = 0.0;
    this.chronosWarpTimer = 0.0;
    this.activeOrder = null;

    this.initCatalogs();
    this.buildStaticDOM(); // Rebinds all DOM click closures to the reset catalog arrays
    this.syncBuyModeButtons();
    this.syncStanceButtons();

    this.rng.totalRolls = 0;
    this.rng.counts.fill(0);
    this.rng.fiveStarAwarded.fill(false);
    this.rng.equippedIndex = -1;
    this.rng.subEquippedIndex = -1;
    this.rng.autoRoll = false;
    this.rng.fastRoll = false;
    this.rng.turboRoll = false;
    for (const rt of this.rng.traitSockets) rt.level = 0;
    for (const ru of this.rng.upgrades) ru.level = 0;
    for (const rg of this.rng.gear) rg.crafted = false;
    this.rng.syncToggleButtons();
    this.rng.resetStageDisplay();

    this.beanEquip.counts.fill(0);
    this.beanEquip.equipped = [];
    this.beanEquip.luckLevel = 0;
    this.beanEquip.totalRolls = 0;
    this.beanEquip.pityRolls = 0;
    this.beanEquip.autoRoll = false;

    for (const au of this.arcade.shopUpgrades) au.level = 0;
    this.arcade.shotStreak = 0;
    this.arcade.cancelRoastRisk();
    this.arcade.resetMemoryBoard();

    this.wipeConfirmActive = false;
    this.wipeConfirmTimer = 0.0;
    this.recalculateRates();
    this.saveGame();
    this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    this.popups.push(new FloatingPopup("DATA WIPED CLEAN", 245, 265, COLORS.danger));
  }
  // ===========================================================================
  // 11. STATIC DOM INITIALIZATION & IN-PLACE UI UPDATERS
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
            <span class="card-count" id="cnt-${upg.uid}">x0/25 (+1)</span>
          </div>
          <div class="card-desc">${upg.desc}</div>
          <div class="card-cost" id="cost-${upg.uid}">Cost: 0 Coffee Beans</div>
        </div>
      `;
      card.addEventListener("click", () => {
        const disc = this.getDiscountFactor();
        const exp = this.getUpgradeExponent();
        const { qty, cost } = upg.getBulkInfo(this.buyMode, this.beans, disc, exp);
        if (this.beans >= cost) {
          const prevCount = upg.count;
          const upgIdx = this.upgrades.indexOf(upg);
          this.beans -= cost;
          upg.count += qty;
          if ((prevCount < 500 && upg.count >= 500) || (prevCount < 1000 && upg.count >= 1000)) {
            this.architectInk += 1;
            this.popups.push(new FloatingPopup(`MILESTONE! +1 Architect's Ink!`, 245, 200, COLORS.architectInk));
          }
          this.addXp(22 * (upgIdx + 1) * Math.min(qty, 25));
          this.recalculateRates();
          this.markDirty();
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
          <div class="card-cost" style="color: #d99b26;" id="lvl-${st.uid}">Level: 0</div>
        </div>
        <button class="btn" id="btn-${st.uid}" type="button">150 Beans</button>
      `;
      card.querySelector(`#btn-${st.uid}`).addEventListener("click", () => {
        const cost = this.getStaffCost(st);
        if (this.beans >= cost) {
          this.beans -= cost;
          st.level += 1;
          if (st.level % 10 === 0) {
            this.purrWhiskers += 1;
            this.popups.push(new FloatingPopup(`STAFF MILESTONE! +1 Purr-Charm Whisker 🐾`, 245, 215, COLORS.purrWhisker));
          }
          this.addXp(110 * st.level);
          this.recalculateRates();
          this.markDirty();
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
          this.addXp(260 * (idx + 1));
          this.recalculateRates();
          this.markDirty();
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
          this.addXp(90);
          this.markDirty();
          this.sfx.playBrew(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      brewList.appendChild(card);
    });

    const plinkoGrid = document.getElementById("plinko-currency-grid");
    plinkoGrid.innerHTML = "";
    CURRENCY_META.forEach((meta) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plinko-curr-btn";
      btn.dataset.curr = meta.key;
      btn.dataset.color = meta.color;
      btn.title = `${meta.name} (${meta.tier})`;
      btn.textContent = meta.short;
      btn.addEventListener("click", () => {
        this.plinko.currencyType = meta.key;
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
          this.markDirty();
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
      let rw = `+${formatNum(m.beans)} Coffee Beans | +${m.tokens} Arcade Tokens`;
      if (m.golden > 0) rw += ` | +${m.golden} Golden Beans`;
      if (m.crystals > 0) rw += ` | +${m.crystals} Astral Crystals`;
      if (m.shards > 0) rw += ` | +${m.shards} Starlight Shards`;
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
          this.beans += m.beans;
          this.lifetimeBeansAll += m.beans;
          this.arcadeTokens += m.tokens;
          this.goldenBeans += m.golden;
          this.astralCrystals += m.crystals;
          this.starlightShards += m.shards;
          this.recalculateRates();
          this.saveGame();
          this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
          this.popups.push(new FloatingPopup(`CRATE CLAIMED! (Lv. ${m.targetLvl})`, 245, 245, COLORS.gold));
        }
      });
      msList.appendChild(card);
    });

    const specList = document.getElementById("specialty-alchemy-list");
    specList.innerHTML = "";
    SPECIALTY_UPGRADES.forEach((sp) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "56px";
      card.innerHTML = `
        <div class="card-accent" style="background: ${sp.color};"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${sp.name}</span>
            <span class="card-count" id="splvl-${sp.id}" style="color: ${sp.color};">${sp.isConsumable ? "Instant" : `Lv. 0/${sp.max}`}</span>
          </div>
          <div class="card-desc">${sp.desc}</div>
        </div>
        <button class="btn btn-sm" id="btn-${sp.id}" type="button">Buy</button>
      `;
      card.querySelector(`#btn-${sp.id}`).addEventListener("click", () => {
        const cost = this.getSpecialtyCost(sp);
        const bal = this.getCurrencyBalance(sp.curr);
        const lvl = this.getSpecialtyLevel(sp.id);
        if (lvl < sp.max && bal >= cost) {
          this.deductCurrency(sp.curr, cost);
          if (sp.isConsumable) {
            const warpGain = Math.max(1000, this.bps * 1800.0);
            const prev = this.beans;
            this.beans = Math.min(this.getMaxStorage(), this.beans + warpGain);
            const actual = Math.max(0, this.beans - prev);
            this.lifetimeBeansRun += warpGain;
            this.lifetimeBeansAll += warpGain;
            this.addXp(500);
            this.popups.push(new FloatingPopup(`30-MIN TIME WARP! +${formatNum(actual, this.notationMode)}`, 245, 230, COLORS.chronosSand));
          } else {
            this.specialtyLevels[sp.id] = lvl + 1;
            this.addXp(400);
          }
          this.recalculateRates();
          this.saveGame();
          this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        } else {
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        }
      });
      specList.appendChild(card);
    });

    const transList = document.getElementById("transmute-list");
    transList.innerHTML = "";
    const transmutes = [
      { id: "tr1", title: "Coffee Beans → Golden Bean", sub: "500M Coffee Beans → +1 Golden Bean", fn: () => {
        if (this.beans >= 500e6) {
          this.beans -= 500e6; this.goldenBeans += 1; this.lifetimeGolden += 1;
          this.recalculateRates(); this.markDirty(); this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr2", title: "Golden Beans → Astral Crystal", sub: "250 Golden Beans → +1 Astral Crystal", fn: () => {
        if (this.goldenBeans >= 250) {
          this.goldenBeans -= 250; this.astralCrystals += 1; this.lifetimeCrystals += 1;
          this.recalculateRates(); this.markDirty(); this.sfx.playAstral(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr3", title: "Astral Crystals → Starlight Shard", sub: "100 Astral Crystals → +1 Starlight Shard", fn: () => {
        if (this.astralCrystals >= 100) {
          this.astralCrystals -= 100; this.starlightShards += 1;
          this.recalculateRates(); this.markDirty(); this.sfx.playPantheon(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr4", title: "Arcade Tokens → Golden Bean", sub: "20 Arcade Tokens → +1 Golden Bean", fn: () => {
        if (this.arcadeTokens >= 20) {
          this.arcadeTokens -= 20; this.goldenBeans += 1; this.lifetimeGolden += 1;
          this.recalculateRates(); this.markDirty(); this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr5", title: "Abyssal Void-Rift Extraction", sub: "500 Paradox Dust + 1 Eternal Bean → +1 Void-Rift Relic", fn: () => {
        if (this.paradoxDust >= 500 && this.eternalBeans >= 1) {
          this.paradoxDust -= 500; this.eternalBeans -= 1; this.voidRelics += 1;
          this.recalculateRates(); this.saveGame(); this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }},
      { id: "tr6", title: "Whisker & Relic Alchemy", sub: "15 Purr Whiskers + 5 Void Relics → +1 Architect's Ink", fn: () => {
        if (this.purrWhiskers >= 15 && this.voidRelics >= 5) {
          this.purrWhiskers -= 15; this.voidRelics -= 5; this.architectInk += 1;
          this.recalculateRates(); this.saveGame(); this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
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
        <button class="btn btn-sm" id="btn-${tr.id}" type="button">Transmute</button>
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
          this.markDirty();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      });
      card.querySelector(`#b25-${snk.uid}`).addEventListener("click", () => {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const { qty, cost } = snk.getMaxAffordable(bal * 0.25);
        if (qty > 0 && bal >= cost) {
          snk.level += qty;
          this.deductCurrency(snk.currencyType, cost);
          this.markDirty();
          this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      });
      card.querySelector(`#b90-${snk.uid}`).addEventListener("click", () => {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const { qty, cost } = snk.getMaxAffordable(bal * 0.90);
        if (qty > 0 && bal >= cost) {
          snk.level += qty;
          this.deductCurrency(snk.currencyType, cost);
          this.markDirty();
          this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        } else this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      });
      sinksList.appendChild(card);
    });

    const forgeGain = () => {
      let g = this.rng && this.rng.counts[11] > 0 ? 2 : 1;
      if (this.getSpecialtyLevel("sp11") >= 2) g *= 2;
      return g;
    };
    const cForgeList = document.getElementById("cosmic-forges-list");
    cForgeList.innerHTML = "";
    this.cosmicForgeDefs = [
      { id: "cf1", name: "Dark Matter Roast", req: "Requires: 100 Sp Coffee Beans → Dark Matter Roast (+100% Mult)", col: COLORS.darkMatter,
        can: () => this.beans >= 1e26, getOwned: () => this.darkMatter,
        act: () => { this.beans -= 1e26; this.darkMatter += forgeGain(); } },
      { id: "cf2", name: "Supernova Bean", req: "Requires: 10 Oc Coffee Beans → Supernova Bean (+250% Mult)", col: COLORS.supernova,
        can: () => this.beans >= 1e28, getOwned: () => this.supernovaBeans,
        act: () => { this.beans -= 1e28; this.supernovaBeans += forgeGain(); } },
      { id: "cf3", name: "Chronos Crystal", req: "Requires: 1 No Coffee Beans → Chronos Crystal (+600% Mult & +2% Offline)", col: COLORS.chronos,
        can: () => this.beans >= 1e30, getOwned: () => this.chronosCrystals,
        act: () => { this.beans -= 1e30; this.chronosCrystals += forgeGain(); } },
      { id: "cf4", name: "Aetherial Essence", req: "Requires: 100 No Coffee Beans → Aetherial Essence (+1,500% Mult)", col: COLORS.aether,
        can: () => this.beans >= 1e32, getOwned: () => this.aetherEssence,
        act: () => { this.beans -= 1e32; this.aetherEssence += forgeGain(); } },
      { id: "cf5", name: "Omega Singularity", req: "Requires: 10 Dc Coffee Beans → Omega Singularity (+7,500% Mult)", col: COLORS.omega,
        can: () => this.beans >= 1e34, getOwned: () => this.omegaSingularity,
        act: () => { this.beans -= 1e34; this.omegaSingularity += forgeGain(); } },
      { id: "cf6", name: "Celestial Dew", req: "Requires: 1 No Coffee Beans + 10 Starlight Shards → Celestial Dew", col: COLORS.celestialDew,
        can: () => this.beans >= 1e30 && this.starlightShards >= 10, getOwned: () => this.celestialDew,
        act: () => { this.beans -= 1e30; this.starlightShards -= 10; this.celestialDew += forgeGain(); } },
      { id: "cf7", name: "Quasar Nectar", req: "Requires: 100 No Coffee Beans + 3 Omega Singularity → Quasar Nectar", col: COLORS.quasarNectar,
        can: () => this.beans >= 1e32 && this.omegaSingularity >= 3, getOwned: () => this.quasarNectar,
        act: () => { this.beans -= 1e32; this.omegaSingularity -= 3; this.quasarNectar += forgeGain(); } },
      { id: "cf8", name: "Void Truffle", req: "Requires: 500 Sp Coffee Beans + 5 Dark Matter Roast → Void Truffle (+10% Crit)", col: COLORS.voidTruffle,
        can: () => this.beans >= 5e26 && this.darkMatter >= 5, getOwned: () => this.voidTruffle,
        act: () => { this.beans -= 5e26; this.darkMatter -= 5; this.voidTruffle += forgeGain(); } },
      { id: "cf9", name: "Nebula Honey", req: "Requires: 50 Oc Coffee Beans + 5 Supernova Beans → Nebula Honey (+25% Tips)", col: COLORS.nebulaHoney,
        can: () => this.beans >= 5e28 && this.supernovaBeans >= 5, getOwned: () => this.nebulaHoney,
        act: () => { this.beans -= 5e28; this.supernovaBeans -= 5; this.nebulaHoney += forgeGain(); } },
      { id: "cf10", name: "Solaris Amber", req: "Requires: 5 No Coffee Beans + 10 Chronos Crystals → Solaris Amber (+0.5x Luck)", col: COLORS.solarisAmber,
        can: () => this.beans >= 5e30 && this.chronosCrystals >= 10, getOwned: () => this.solarisAmber,
        act: () => { this.beans -= 5e30; this.chronosCrystals -= 10; this.solarisAmber += forgeGain(); } },
      { id: "cf11", name: "Genesis Crema", req: "Requires: 500 No Coffee Beans + 5 Aetherial Essence + 5 Void Truffles → Genesis Crema", col: COLORS.genesisCrema,
        can: () => this.beans >= 5e32 && this.aetherEssence >= 5 && this.voidTruffle >= 5, getOwned: () => this.genesisCrema,
        act: () => { this.beans -= 5e32; this.aetherEssence -= 5; this.voidTruffle -= 5; this.genesisCrema += forgeGain(); } },
      { id: "cf12", name: "The Eternal Bean", req: "Requires: 10 Dc Beans + 5 Quasar Nectar + 25 Celestial Dew + 3 Genesis Crema → Eternal Bean", col: COLORS.eternalBean,
        can: () => this.beans >= 1e34 && this.quasarNectar >= 5 && this.celestialDew >= 25 && this.genesisCrema >= 3,
        getOwned: () => this.eternalBeans,
        act: () => { this.beans -= 1e34; this.quasarNectar -= 5; this.celestialDew -= 25; this.genesisCrema -= 3; this.eternalBeans += forgeGain(); } }
    ];
    this.cosmicForgeDefs.forEach((cf) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.style.minHeight = "52px";
      card.innerHTML = `
        <div class="card-accent" id="acc-${cf.id}" style="background:${cf.col};"></div>
        <div class="card-main">
          <div class="card-top-line">
            <span class="card-title">${cf.name}</span>
            <span class="card-count" id="own-${cf.id}" style="color: ${cf.col};">Owned: 0</span>
          </div>
          <div class="card-desc">${cf.req}</div>
        </div>
        <button class="btn btn-sm" id="btn-${cf.id}" type="button">Forge</button>
      `;
      card.querySelector(`#btn-${cf.id}`).addEventListener("click", () => {
        if (cf.can()) {
          cf.act();
          this.recalculateRates();
          this.markDirty();
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
          this.markDirty();
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
          this.markDirty();
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
          this.markDirty();
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
          this.markDirty();
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
          <div class="card-title" id="qtitle-${q.qid}">${q.title} (Tier ${q.tier})</div>
          <div class="card-desc" id="qdesc-${q.qid}">${q.desc}</div>
          <div class="card-cost" id="prog-${q.qid}">Progress: 0 / ${q.targetVal}</div>
        </div>
        <button class="btn btn-sm" id="btn-${q.qid}" type="button">IN PROGRESS</button>
      `;
      card.querySelector(`#btn-${q.qid}`).addEventListener("click", () => this.claimSingleQuest(q));
      questsList.appendChild(card);
    });
  }

  claimSingleQuest(q) {
    if (q.currentVal >= q.targetVal && !q.completed && !q.retired) {
      q.completed = true;
      q.refreshTimer = 10.0;
      const gain = safeNum(q.rewardBeans, 25000);
      this.beans = Math.min(this.getMaxStorage(), this.beans + gain);
      this.lifetimeBeansAll += gain;
      this.customerStars += q.rewardStars;
      this.arcadeTokens += q.rewardTokens || 5;
      this.addXp(250 * q.tier);
      this.recalculateRates();
      this.markDirty();
      this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`+${formatNum(gain, this.notationMode)} Beans & +${q.rewardTokens} Tokens!`, 245, 245, COLORS.gold));
      return true;
    }
    return false;
  }

  claimAllReadyQuests() {
    let any = false;
    for (const q of this.quests) {
      if (this.claimSingleQuest(q)) any = true;
    }
    if (!any) {
      this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    }
  }

  // --- Event Listeners & Hotkeys ---

  bindEvents() {
    const sceneCanvas = document.getElementById("scene-canvas");
    sceneCanvas.addEventListener("mousedown", (e) => {
      const rect = sceneCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (450 / rect.width);
      const y = (e.clientY - rect.top) * (652 / rect.height);
      this.handleSceneClick(x, y);
    });

    sceneCanvas.addEventListener("pointermove", () => {
      this.weather.wipeFog(() => {
        this.raindropPearls += 1;
        this.addXp(110);
        this.markDirty();
        this.sfx.playBuy(this.sfxEnabled, this.sfxVolume * 0.7);
        this.popups.push(new FloatingPopup(`💧 Window Cleared! +1 Pearl`, 225, 315, COLORS.raindropPearl));
      });
    });

    const multDisplay = document.getElementById("multiplier-display");
    const multPopover = document.getElementById("multiplier-popover");
    const glossaryBtn = document.getElementById("btn-open-glossary");
    const glossaryPopover = document.getElementById("glossary-popover");
    const statsBtn = document.getElementById("btn-open-stats");
    const statsPopover = document.getElementById("stats-popover");
    const beanEquipModal = document.getElementById("bean-equip-modal");

    const closeAllPopovers = () => {
      multPopover.classList.add("hidden");
      glossaryPopover.classList.add("hidden");
      statsPopover.classList.add("hidden");
    };

    multDisplay.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = multPopover.classList.contains("hidden");
      closeAllPopovers();
      beanEquipModal.classList.add("hidden");
      this.beanEquip.isOpen = false;
      multPopover.classList.toggle("hidden", !opening);
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      if (opening) this.renderMultiplierBreakdown(true);
    });

    glossaryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = glossaryPopover.classList.contains("hidden");
      closeAllPopovers();
      beanEquipModal.classList.add("hidden");
      this.beanEquip.isOpen = false;
      glossaryPopover.classList.toggle("hidden", !opening);
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      if (opening) this.renderCurrencyGlossary();
    });

    statsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const opening = statsPopover.classList.contains("hidden");
      closeAllPopovers();
      beanEquipModal.classList.add("hidden");
      this.beanEquip.isOpen = false;
      statsPopover.classList.toggle("hidden", !opening);
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      if (opening) this.renderStatsModal();
    });

    document.getElementById("btn-close-mult-pop").addEventListener("click", (e) => {
      e.stopPropagation();
      multPopover.classList.add("hidden");
    });
    document.getElementById("btn-close-glossary").addEventListener("click", (e) => {
      e.stopPropagation();
      glossaryPopover.classList.add("hidden");
    });
    document.getElementById("btn-close-stats").addEventListener("click", (e) => {
      e.stopPropagation();
      statsPopover.classList.add("hidden");
    });
    document.getElementById("btn-close-offline").addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("offline-banner").classList.add("hidden");
    });

    [multPopover, glossaryPopover, statsPopover].forEach((pop) => {
      pop.addEventListener("mousedown", (e) => e.stopPropagation());
    });
    sceneCanvas.addEventListener("mousedown", closeAllPopovers);

    // Click Stances & Ultimates
    document.querySelectorAll(".stance-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.clickStance = btn.dataset.stance;
        this.syncStanceButtons();
        this.recalculateRates();
        this.markDirty();
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.85);
      });
    });

    document.getElementById("btn-ult-overdrive").addEventListener("click", () => this.triggerUltimate("overdrive"));
    document.getElementById("btn-ult-magnet").addEventListener("click", () => this.triggerUltimate("magnet"));
    document.getElementById("btn-ult-mochi").addEventListener("click", () => this.triggerUltimate("mochi"));

    document.getElementById("btn-silo-upgrade").addEventListener("click", () => this.upgradeSilo());
    document.getElementById("btn-auto-silo").addEventListener("click", () => {
      this.autoSilo = !this.autoSilo;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-vent").addEventListener("click", () => this.ventBoiler());
    document.getElementById("btn-auto-vent").addEventListener("click", () => {
      this.autoVent = !this.autoVent;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeAllPopovers();
        this.switchTab(btn.dataset.tab);
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.7);
      });
    });

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.buyMode = btn.dataset.mode;
        this.syncBuyModeButtons();
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.8);
      });
    });

    document.getElementById("btn-buy-max-menu").addEventListener("click", () => this.buyMaxAllUpgrades());
    document.getElementById("btn-buy-max-staff").addEventListener("click", () => this.buyMaxAllStaff());
    document.getElementById("btn-buy-max-roast").addEventListener("click", () => this.buyMaxAllRoastery());
    document.getElementById("btn-buy-max-dynasty").addEventListener("click", () => this.buyMaxAllDynasty());
    document.getElementById("btn-buy-max-pantheon").addEventListener("click", () => this.buyMaxAllPantheon());
    document.getElementById("btn-claim-all-quests").addEventListener("click", () => this.claimAllReadyQuests());

    document.getElementById("btn-auto-brew").addEventListener("click", () => {
      this.autoBrew = !this.autoBrew;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-auto-rebirth").addEventListener("click", () => {
      this.autoRebirth = !this.autoRebirth;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-auto-forge").addEventListener("click", () => {
      this.autoForge = !this.autoForge;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });

    document.getElementById("btn-auto-serve").addEventListener("click", () => {
      this.autoServe = !this.autoServe;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-serve-order").addEventListener("click", () => {
      if (!this.serveCurrentOrder()) this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
    });

    // Plinko Controls & Risk Modes
    document.querySelectorAll(".plinko-risk-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.plinko.setRiskMode(btn.dataset.risk);
        document.querySelectorAll(".plinko-risk-btn").forEach((b) => b.classList.toggle("active", b.dataset.risk === this.plinko.riskMode));
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume * 0.75);
      });
    });

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

    const triggerPlinkoDrop = (xPos, count = 1) => {
      let dropped = 0;
      for (let i = 0; i < count; i++) {
        const bal = this.getCurrencyBalance(this.plinko.currencyType);
        const red = this.talents[4].rank * 0.03;
        const { success, amount } = this.plinko.dropBall(xPos, betInput.value, bal, red);
        if (success) {
          this.deductCurrency(this.plinko.currencyType, amount);
          this.plinkoBallsDropped += 1;
          this.addXp(20);
          this.quests[3].currentVal += 1;
          dropped += 1;
        } else {
          break;
        }
      }
      if (dropped > 0) {
        this.markDirty();
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
      } else {
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      }
    };

    document.getElementById("btn-plinko-drop").addEventListener("click", () => triggerPlinkoDrop(this.plinko.xCenter, 1));
    document.getElementById("btn-plinko-drop5").addEventListener("click", () => triggerPlinkoDrop(this.plinko.xCenter, 5));

    const plinkoCanvas = document.getElementById("plinko-canvas");
    plinkoCanvas.addEventListener("mousedown", (e) => {
      const rect = plinkoCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (545 / rect.width);
      triggerPlinkoDrop(x, 1);
    });

    document.getElementById("btn-reset-talents").addEventListener("click", () => {
      this.talents.forEach((t) => (t.rank = 0));
      this.recalculateRates();
      this.markDirty();
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
      this.markDirty();
      this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup(`ALTAR BLESSING #${this.altarBlessings}! +${xpGain} XP`, 245, 245, COLORS.gold));
    });

    document.getElementById("sanctuary-goal-banner").addEventListener("click", () => this.activateSanctuary());
    document.getElementById("btn-trigger-omniverse").addEventListener("click", () => this.triggerOmniverseTranscendence());
    document.getElementById("btn-trigger-rebirth").addEventListener("click", () => this.triggerRebirth());
    document.getElementById("btn-trigger-dynasty").addEventListener("click", () => this.triggerDynasty());
    document.getElementById("btn-trigger-pantheon").addEventListener("click", () => this.triggerPantheon());

    document.getElementById("btn-cfg-sfx").addEventListener("click", () => {
      this.sfxEnabled = !this.sfxEnabled;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.querySelectorAll(".vol-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.sfxVolume = parseFloat(btn.dataset.vol);
        this.markDirty();
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
      });
    });
    document.getElementById("btn-cfg-rain").addEventListener("click", () => {
      this.rainEnabled = !this.rainEnabled;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-cfg-particles").addEventListener("click", () => {
      this.particlesEnabled = !this.particlesEnabled;
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-cfg-notation").addEventListener("click", () => {
      this.notationMode = this.notationMode === "suffix" ? "scientific" : "suffix";
      this.markDirty();
      this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
    });
    document.getElementById("btn-cfg-save").addEventListener("click", () => {
      this.saveGame();
      this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
      this.popups.push(new FloatingPopup("SAVED TO LOCALSTORAGE", 245, 265, COLORS.success));
    });
    document.getElementById("btn-cfg-export").addEventListener("click", () => {
      const code = this.exportSaveBase64();
      const statusEl = document.getElementById("cfg-export-status");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
      if (statusEl) statusEl.textContent = "Save code copied to clipboard ✓";
      window.prompt("Copy your Rainy Cafe Save Code (already copied to clipboard):", code);
    });
    document.getElementById("btn-cfg-import").addEventListener("click", () => {
      const input = window.prompt("Paste your Base64 Rainy Cafe Save Code:");
      if (!input) return;
      if (this.importSaveBase64(input)) {
        this.sfx.playLevelup(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup("SAVE IMPORTED SUCCESSFULLY!", 245, 245, COLORS.success));
      } else {
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        window.alert("Invalid save code. Please make sure you copied the entire Base64 string.");
      }
    });
    document.getElementById("btn-cfg-wipe").addEventListener("click", () => {
      if (!this.wipeConfirmActive) {
        this.wipeConfirmActive = true;
        this.wipeConfirmTimer = 4.0;
        this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
      } else {
        this.wipeAllData();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.activeElement === betInput) return;

      if (e.key === "Escape") {
        closeAllPopovers();
        beanEquipModal.classList.add("hidden");
        this.beanEquip.isOpen = false;
        return;
      }

      if (this.rng && this.rng.cutsceneActive && e.code === "Space") {
        e.preventDefault();
        this.rng.closeCutscene();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (this.activeTab === "plinko") {
          triggerPlinkoDrop(this.plinko.xCenter, 1);
        } else if (this.activeTab === "rng") {
          this.rng.startRoll("standard", false);
        } else if (this.activeTab === "arcade") {
          if (this.arcade.activeGame === "shot") this.arcade.pullEspressoShot();
          else if (this.arcade.activeGame === "catcher" && !this.arcade.catcherActive) this.arcade.startBeanCatcher();
          else if (this.arcade.activeGame === "roastluck" && this.arcade.roastActive) this.arcade.cashOutRoastRisk();
        } else {
          this.handleSceneClick(this.mugCenter.x, this.mugCenter.y);
        }
      } else if (e.key === "1") {
        this.clickStance = "turbo";
        this.syncStanceButtons();
        this.recalculateRates();
      } else if (e.key === "2") {
        this.clickStance = "velvet";
        this.syncStanceButtons();
        this.recalculateRates();
      } else if (e.key === "3") {
        this.clickStance = "fortune";
        this.syncStanceButtons();
        this.recalculateRates();
      } else if (e.key === "m" || e.key === "M") {
        this.sfxEnabled = !this.sfxEnabled;
        this.markDirty();
      } else if (e.key === "ArrowLeft" && this.activeTab === "arcade" && this.arcade.catcherActive) {
        this.arcade.catcherMoveDir = -1;
      } else if (e.key === "ArrowRight" && this.activeTab === "arcade" && this.arcade.catcherActive) {
        this.arcade.catcherMoveDir = 1;
      } else if (e.key === "r" || e.key === "R") {
        if (this.rng) this.rng.startRoll("standard", false);
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
        this.popups.push(new FloatingPopup("SAVED TO LOCALSTORAGE", 245, 265, COLORS.success));
      } else if (e.key === "e" || e.key === "E") {
        const idx = (this.tabs.indexOf(this.activeTab) + 1) % this.tabs.length;
        this.switchTab(this.tabs[idx]);
      } else if (e.key === "q" || e.key === "Q") {
        const idx = (this.tabs.indexOf(this.activeTab) - 1 + this.tabs.length) % this.tabs.length;
        this.switchTab(this.tabs[idx]);
      }
    });

    window.addEventListener("keyup", (e) => {
      if ((e.key === "ArrowLeft" && this.arcade.catcherMoveDir === -1) ||
          (e.key === "ArrowRight" && this.arcade.catcherMoveDir === 1)) {
        this.arcade.catcherMoveDir = 0;
      }
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    if (this.beanEquip) {
      this.beanEquip.isOpen = false;
      const modal = document.getElementById("bean-equip-modal");
      if (modal) modal.classList.add("hidden");
    }
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabId}`));
  }

  handleSceneClick(x, y, isAutomated = false) {
    // 1. Check airborne Juggle Beans first
    if (!isAutomated) {
      for (const jb of this.juggleBeans) {
        if (jb.checkClick(x, y)) {
          const bounceMult = Math.pow(2, jb.bounces);
          const reward = this.clickPower * bounceMult * 4.0;
          this.beans = Math.min(this.getMaxStorage(), this.beans + reward);
          this.lifetimeBeansRun += reward;
          this.lifetimeBeansAll += reward;
          this.arcadeTokens += 1;
          this.addXp(45 * jb.bounces);
          this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
          this.popups.push(new FloatingPopup(`JUGGLE ${bounceMult}x! +${formatNum(reward, this.notationMode)} & +1 🪙`, jb.x, jb.y - 14, COLORS.gold));
          return;
        }
      }

      // 2. Check Shimmering Raindrop Pearl click
      if (this.weather.checkPearlClick(x, y)) {
        this.raindropPearls += 1;
        this.addXp(220);
        this.recalculateRates();
        this.markDirty();
        this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`💧 +1 Raindrop Pearl!`, x, y - 16, COLORS.raindropPearl));
        return;
      }

      // 3. Check Golden Croissant click
      if (this.croissant.checkClick(x, y)) {
        this.croissantsCaught += 1;
        this.triggerCroissantFrenzy(x, y - 20, "CAFFEINE FRENZY! (7x)");
        return;
      }

      // 4. Check Sleeping Cat click (Drops Purr-Charm Whiskers at max 5x Purr Bliss)
      if (Math.hypot(x - this.catCenter.x, y - this.catCenter.y) <= 44) {
        this.catScaleX = 1.25;
        this.catScaleY = 0.75;
        const wasMax = this.purrCombo === 5;
        this.purrCombo = Math.min(5, this.purrCombo + 1);
        this.purrBlissTimer = 10.0;
        this.quests[1].currentVal += 1;
        this.addXp(30 * this.purrCombo);
        this.recalculateRates();
        this.markDirty();
        this.sfx.playPurr(this.sfxEnabled, this.sfxVolume);
        if (wasMax && Math.random() < 0.35) {
          this.purrWhiskers += 1;
          this.popups.push(new FloatingPopup(`🐾 +1 Purr-Charm Whisker!`, this.catCenter.x, this.catCenter.y - 42, COLORS.purrWhisker));
        } else {
          this.popups.push(new FloatingPopup(`Purr Bliss x${this.purrCombo} (+${this.purrCombo * 10}%)`, this.catCenter.x, this.catCenter.y - 35, COLORS.gold));
        }
        return;
      }
    }

    // 5. Check Coffee Mug click
    const { x: cx, y: cy } = this.mugCenter;
    if (x >= cx - 95 && x <= cx + 95 && y >= cy - 80 && y <= cy + 80) {
      const eqStats = this.beanEquip
        ? this.beanEquip.getEquippedStats()
        : { heatReduction: 0, echoChance: 0, synergy: null, hasT8Proc: false };

      const prevTemp = this.boilerTemp;
      if (this.overdriveTimer > 0) {
        this.boilerTemp = 90.0;
        this.overheatLockout = false;
      } else {
        const stanceHeat = this.clickStance === "turbo" ? 2.4 : this.clickStance === "velvet" ? 0.6 : 1.2;
        const heatAdded = stanceHeat * Math.max(0.15, 1.0 - eqStats.heatReduction);
        this.boilerTemp = Math.min(100.0, this.boilerTemp + heatAdded);
        if (this.boilerTemp >= 100.0) {
          this.overheatLockout = true;
          this.overheatTimer = 5.0;
          this.recalculateRates();
          this.sfx.playDeny(this.sfxEnabled, this.sfxVolume);
        } else if (
          (prevTemp < 85.0 && this.boilerTemp >= 85.0) ||
          (prevTemp <= 95.0 && this.boilerTemp > 95.0)
        ) {
          this.recalculateRates();
        }
      }

      // Check Surface Crema Spark bullseye
      const h = 65 * this.scaleY;
      const sparkX = cx + Math.cos(this.cremaSpark.angle) * (this.cremaSpark.radiusX * this.scaleX);
      const sparkY = (cy - h + 2) + Math.sin(this.cremaSpark.angle) * (this.cremaSpark.radiusY * this.scaleY);
      const hitCremaSpark = !isAutomated && Math.hypot(x - sparkX, y - sparkY) <= 19;
      if (hitCremaSpark) {
        this.cremaSpark.combo = Math.min(12, this.cremaSpark.combo + 1);
        this.cremaSpark.comboTimer = 4.0;
        this.boilerTemp = Math.max(70.0, this.boilerTemp - 3.2);
        this.recalculateRates();
      }

      const inSweetSpot = this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0 && !this.overheatLockout;
      const { chance, mult } = this.getCritStats();
      const isCrit = hitCremaSpark || Math.random() < chance;
      const sp10 = this.getSpecialtyLevel("sp10");
      const isMegaCrit = isCrit && sp10 > 0 && Math.random() < sp10 * 0.05;
      const effectiveCritMult = isMegaCrit ? mult * mult : mult;

      let gained = this.clickPower * (isCrit ? effectiveCritMult : 1.0);
      if (hitCremaSpark) {
        gained *= 1.0 + this.cremaSpark.combo * 0.25;
      }
      if (this.overdriveTimer > 0) {
        gained *= 2.0;
      }

      // Inline Echo Double-Click (Prevents popup lag during rapid clicking)
      const isEcho = eqStats.echoChance > 0 && Math.random() < eqStats.echoChance;
      if (isEcho) {
        gained *= 2.0;
        if (eqStats.synergy && eqStats.synergy.id === "thermal") {
          this.boilerTemp = Math.max(70.0, this.boilerTemp - 0.5);
        }
      }

      // Precision Extraction synergy: Crits extend active Frenzy & Purr Bliss timers
      if (isCrit && eqStats.synergy && eqStats.synergy.id === "precision") {
        if (this.frenzyTimer > 0 && this.frenzyTimer < 900000) this.frenzyTimer += 0.20;
        if (this.purrBlissTimer > 0) this.purrBlissTimer = Math.min(20.0, this.purrBlissTimer + 0.20);
      }

      const d03Chance = this.dynastyPerks[2].count * 0.05;
      const isCremaSurge = this.overdriveTimer > 0 || (d03Chance > 0 && this.bps > 0 && Math.random() < d03Chance);
      if (isCremaSurge && this.bps > 0) {
        gained += this.bps * 10.0;
      }

      this.beans = Math.min(this.getMaxStorage(), this.beans + gained);
      this.lifetimeBeansRun += gained;
      this.lifetimeBeansAll += gained;
      this.manualClicks += 1;
      if (!isAutomated) {
        this.ultCharge = Math.min(120, this.ultCharge + 1);
      }
      this.scaleX = isCrit ? 1.20 : 1.14;
      this.scaleY = isCrit ? 0.80 : 0.86;
      this.markDirty();
      this.quests[0].currentVal += 1;

      // Spawn airborne Juggle Bean every 20 manual clicks
      // Spawn airborne Juggle Bean every 20 manual clicks
      if (!isAutomated && this.manualClicks % 20 === 0) {
        this.juggleBeans.push(new JuggleBean(cx, cy - 60));
      }

      // Stance & T8+ Bean Equipment On-Hit Procs
      if (!isAutomated) {
        if (eqStats.hasT8Proc && this.manualClicks % 10 === 0 && this.beans >= 100) {
          const savedCurr = this.plinko.currencyType;
          this.plinko.currencyType = "beans";
          const freeBet = Math.max(1, Math.floor(this.beans * 0.005));
          this.plinko.dropBall(this.plinko.xCenter, String(freeBet), this.beans, 0, freeBet);
          this.plinko.currencyType = savedCurr;
        }
        if (this.clickStance === "fortune") {
          if (this.rng && this.rng.isRolling) this.rng.rollTimer += 0.15;
          if (Math.random() < 0.12) this.customerStars += 1;
        }
        if (eqStats.hasT8Proc && inSweetSpot && Math.random() < 0.08) {
          this.velvetCrema += 1;
        }
        if (eqStats.hasT8Proc && this.manualClicks % 25 === 0) {
          if (this.croissant.active) {
            this.croissant.active = false;
            this.croissantsCaught += 1;
            this.triggerCroissantFrenzy(cx, cy - 55, "🧲 BEAN MAGNET: FRENZY!");
          }
          if (this.weather.pearlDrop) {
            this.weather.pearlDrop = null;
            this.raindropPearls += 1;
          }
        }
      }

      // Aether-Flame Caramel drop condition
      if (isCrit && this.frenzyTimer > 0 && this.purrCombo >= 5 && inSweetSpot && Math.random() < 0.25) {
        this.aetherCaramels += 1;
        this.popups.push(new FloatingPopup(`🔥 +1 Aether-Flame Caramel!`, x, y - 55, COLORS.aetherCaramel));
      }

      const echoTag = isEcho ? "ECHO " : "";
      if (hitCremaSpark) {
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`✨ SPARK x${this.cremaSpark.combo} (-2°C)! +${formatNum(gained, this.notationMode)}`, x, y - 42, COLORS.goldHover));
        this.addXp(90);
      } else if (isCremaSurge) {
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`${echoTag}CREMA SURGE! +${formatNum(gained, this.notationMode)}`, x, y - 42, COLORS.astral));
        this.addXp(95);
      } else if (isMegaCrit) {
        this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`${echoTag}MEGA-CRIT²! +${formatNum(gained, this.notationMode)}`, x, y - 42, COLORS.aetherCaramel));
        this.addXp(140);
      } else if (isCrit) {
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`${echoTag}CRIT SIP! +${formatNum(gained, this.notationMode)}`, x, y - 35, COLORS.gold));
        this.addXp(70 + this.level * 2 + Math.floor(Math.log10(Math.max(1.0, this.clickPower)) * 10));
      } else {
        this.sfx.playTap(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`${echoTag}+${formatNum(gained, this.notationMode)}`, x, y - 25));
        this.addXp(15 + this.level * 2 + Math.floor(Math.log10(Math.max(1.0, this.clickPower)) * 4));
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
  // 12. MAIN GAME LOOP (UPDATE, CANVAS RENDER & DOM SYNC)
  // ===========================================================================

  update(dt) {
    this.playTime += dt;
    const temporalMult = this.getTemporalSpeedMult();

    // Update Procedural Rain Audio Ambience
    this.sfx.updateRainAmbience(this.sfxEnabled && this.rainEnabled, this.sfxVolume);

    // Orbit Crema Spark & update Juggle Beans
    this.cremaSpark.angle = (this.cremaSpark.angle + dt * 2.4) % (Math.PI * 2);
    if (this.cremaSpark.comboTimer > 0) {
      this.cremaSpark.comboTimer -= dt;
      if (this.cremaSpark.comboTimer <= 0) this.cremaSpark.combo = 0;
    }
    for (let i = this.juggleBeans.length - 1; i >= 0; i--) {
      this.juggleBeans[i].update(dt);
      if (!this.juggleBeans[i].alive) this.juggleBeans.splice(i, 1);
    }

    // Active Ultimate Timers
    if (this.overdriveTimer > 0) {
      this.overdriveTimer = Math.max(0, this.overdriveTimer - dt);
      this.boilerTemp = 90.0;
    }
    if (this.mochiBarrageTimer > 0) {
      this.mochiBarrageTimer = Math.max(0, this.mochiBarrageTimer - dt);
      this.mochiBarrageTick += dt;
      while (this.mochiBarrageTick >= 0.066) {
        this.mochiBarrageTick -= 0.066;
        this.handleSceneClick(this.mugCenter.x, this.mugCenter.y, true);
      }
    }

    if (this.wipeConfirmActive) {
      this.wipeConfirmTimer -= dt;
      if (this.wipeConfirmTimer <= 0) this.wipeConfirmActive = false;
    }

    if (this.overheatLockout) {
      this.overheatTimer -= dt;
      if (this.overheatTimer <= 0) {
        this.overheatLockout = false;
        this.boilerTemp = 85.0;
        this.recalculateRates();
      }
    } else if (this.boilerTemp > 70.0 && this.overdriveTimer <= 0) {
      this.boilerTemp = Math.max(70.0, this.boilerTemp - 1.8 * dt);
      this.recalculateRates();
    }

    // Velvet Crema Essence distillation (3x faster in Velvet Extract stance)
    if (!this.overheatLockout && this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0) {
      const distillMult = this.clickStance === "velvet" ? 3.0 : 1.0;
      this.sweetSpotAccumTimer += dt * distillMult;
      if (this.sweetSpotAccumTimer >= 18.0) {
        this.sweetSpotAccumTimer -= 18.0;
        this.velvetCrema += 1;
        this.markDirty();
        this.popups.push(new FloatingPopup(`+1 Velvet Crema Essence!`, 245, 290, COLORS.velvetCrema));
      }
    }

    const maxCap = this.getMaxStorage();

    // Auto-Silo Upgrade
    if (this.getSpecialtyLevel("sp5") >= 1 && this.autoSilo && this.beans >= maxCap * 0.95) {
      const siloCost = this.getSiloUpgradeCost();
      if (this.beans >= siloCost) {
        this.beans -= siloCost;
        this.siloLevel += 1;
        this.markDirty();
      }
    }

    // Chronos Hourglass Sand condensation when Silo Storage is 100% full
    if (this.beans >= maxCap * 0.999 && this.bps > 0) {
      this.sandAccumTimer += dt;
      if (this.sandAccumTimer >= 10.0) {
        this.sandAccumTimer -= 10.0;
        this.chronosSand += 1;
        this.recalculateRates();
        this.markDirty();
      }
    }

    // Singularity Core Fragments condensation while Soft-Capped
    if (this.multBreakdown && this.multBreakdown.isSoftCapped) {
      this.fragAccumTimer += dt;
      if (this.fragAccumTimer >= 12.0) {
        this.fragAccumTimer -= 12.0;
        this.singularityFrags += 1;
        this.markDirty();
      }
    }

    // Fixed sp9 Multiversal Passive Royalties (Fractional accumulator prevents flooring to 0)
    const sp9 = this.getSpecialtyLevel("sp9");
    if (sp9 > 0 && this.franchiseDeeds > 0) {
      this.deedRoyaltyTimer += dt;
      if (this.deedRoyaltyTimer >= 1.0) {
        this.deedRoyaltyTimer -= 1.0;
        const pct = sp9 * 0.02;
        this.sp9Frac.golden += this.getPendingGoldenBeans() * pct;
        this.sp9Frac.astral += this.getPendingAstralCrystals() * pct;
        this.sp9Frac.shards += this.getPendingStarlightShards() * pct;

        const gGain = Math.floor(this.sp9Frac.golden);
        const cGain = Math.floor(this.sp9Frac.astral);
        const sGain = Math.floor(this.sp9Frac.shards);
        this.sp9Frac.golden -= gGain;
        this.sp9Frac.astral -= cGain;
        this.sp9Frac.shards -= sGain;

        if (gGain > 0) { this.goldenBeans += gGain; this.lifetimeGolden += gGain; }
        if (cGain > 0) { this.astralCrystals += cGain; this.lifetimeCrystals += cGain; }
        if (sGain > 0) { this.starlightShards += sGain; }
        if (gGain > 0 || cGain > 0 || sGain > 0) {
          this.recalculateRates();
          this.markDirty();
        }
      }
    }

    // Reversed Auto-Forge Priority Order (cf12 -> cf1 so pinnacle recipes craft first)
    if (this.getSpecialtyLevel("sp11") >= 1 && this.autoForge && this.cosmicForgeDefs) {
      this.autoForgeTimer += dt;
      if (this.autoForgeTimer >= 1.0) {
        this.autoForgeTimer = 0.0;
        let forgedAny = false;
        for (let i = this.cosmicForgeDefs.length - 1; i >= 0; i--) {
          const cf = this.cosmicForgeDefs[i];
          if (cf.can()) {
            cf.act();
            forgedAny = true;
          }
        }
        if (forgedAny) {
          this.recalculateRates();
          this.markDirty();
        }
      }
    }

    // Auto-Rebirth
    if (this.getSpecialtyLevel("sp5") >= 3 && this.autoRebirth && this.getPendingGoldenBeans() >= 100) {
      this.triggerRebirth();
    }

    // Passive Production (Overflow still credits lifetimeBeansRun so full Silo never stalls Rebirth)
    if (this.bps > 0) {
      let gained = this.bps * dt;
      if (this.roasteryUpgrades[7].count > 0) {
        const interest = Math.min(this.bps * 5.0, this.beans * (this.roasteryUpgrades[7].count * 0.0006));
        gained += interest * dt;
      }
      if (this.beans < maxCap) {
        this.beans = Math.min(maxCap, this.beans + gained);
      }
      this.lifetimeBeansRun += gained;
      this.lifetimeBeansAll += gained;

      const logBps = Math.log10(Math.max(10.0, this.bps));
      const xpTrickle = (logBps * 2.5 + this.level * 1.5) * dt;
      this.addXp(xpTrickle);
    }

    if (this.dynastyPerks[1].count > 0) {
      this.dynastySynthTimer += dt * temporalMult;
      if (this.dynastySynthTimer >= 60.0) {
        this.dynastySynthTimer -= 60.0;
        const synthAmt = this.dynastyPerks[1].count;
        this.goldenBeans += synthAmt;
        this.lifetimeGolden += synthAmt;
        this.recalculateRates();
        this.markDirty();
        this.popups.push(new FloatingPopup(`+${synthAmt} Synthesized Golden Bean!`, 245, 245, COLORS.gold));
      }
    }

    // Celestial Barista Guild Bulk Auto-Buyer
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
          const bulkMode = this.dynastyPerks[4].count >= 3 ? "10" : "1";
          const { qty, cost } = cheapest.getBulkInfo(bulkMode, this.beans, disc, exp);
          if (this.beans >= cost) {
            this.beans -= cost;
            cheapest.count += qty;
            this.recalculateRates();
            this.markDirty();
          }
        }
      }
    }

    if (this.cosmicPerks[2].level > 0 && this.bps > 0) {
      this.chronosWarpTimer += dt * temporalMult;
      const warpInterval = 300.0 / this.cosmicPerks[2].level;
      if (this.chronosWarpTimer >= warpInterval) {
        this.chronosWarpTimer = 0.0;
        const warpAmount = this.bps * 3600.0;
        const prev = this.beans;
        this.beans = Math.min(maxCap, this.beans + warpAmount);
        const actualWarp = Math.max(0, this.beans - prev);
        this.lifetimeBeansRun += warpAmount;
        this.lifetimeBeansAll += warpAmount;
        this.markDirty();
        this.sfx.playCosmic(this.sfxEnabled, this.sfxVolume);
        this.popups.push(new FloatingPopup(`CHRONOS WARP! +${formatNum(actualWarp, this.notationMode)}`, 245, 230, COLORS.chronos));
      }
    }

    const payouts = this.plinko.update(dt, this.sfx, this.sfxEnabled, this.sfxVolume);
    for (const p of payouts) {
      const awarded = this.addCurrency(p.currency, p.payout);
      const cName = getCurrencyName(p.currency);
      if (awarded <= 0) {
        this.plinko.popups.push(new FloatingPopup(`0 ${cName} (${p.mult}x)`, p.x, p.y - 15, COLORS.danger));
      } else if (p.mult >= 6.0) {
        this.addXp(650);
        const nonBasic = !["beans", "stars", "tokens", "golden", "astral", "shards"].includes(p.currency);
        if (nonBasic && p.mult >= 10.0) {
          this.architectInk += 1;
          this.plinko.popups.push(new FloatingPopup(`JACKPOT! +1 Architect's Ink!`, p.x, p.y - 42, COLORS.architectInk));
        }
        this.sfx.playFrenzy(this.sfxEnabled, this.sfxVolume);
        this.plinko.popups.push(new FloatingPopup(`+${formatNum(awarded, this.notationMode)} ${cName} (${p.mult}x)!`, p.x, p.y - 25, COLORS.gold));
      } else if (p.mult >= 1.4) {
        this.addXp(85);
        this.sfx.playBuy(this.sfxEnabled, this.sfxVolume);
        this.plinko.popups.push(new FloatingPopup(`+${formatNum(awarded, this.notationMode)} (${p.mult}x)`, p.x, p.y - 20, COLORS.success));
      } else {
        this.addXp(15);
        this.plinko.popups.push(new FloatingPopup(`+${formatNum(awarded, this.notationMode)} (${p.mult}x)`, p.x, p.y - 15, COLORS.textMuted));
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

    if (this.staff[0].level > 0) {
      const mochiGain = this.clickPower * this.staff[0].level * dt;
      if (this.beans < maxCap) {
        this.beans = Math.min(maxCap, this.beans + mochiGain);
      }
      this.lifetimeBeansRun += mochiGain;
      this.lifetimeBeansAll += mochiGain;
      const mochiXp = Math.max(0.5, Math.log10(Math.max(10.0, this.clickPower)) * 1.2) * this.staff[0].level * dt;
      this.addXp(mochiXp);
    }

    const autoTick = Math.floor(this.playTime / 3.0);
    if (this.staff[2].level > 0 && autoTick > this.lastAutoBuyTick) {
      this.lastAutoBuyTick = autoTick;
      const disc = this.getDiscountFactor();
      const exp = this.getUpgradeExponent();
      const affordable = this.upgrades.filter((u) => this.beans >= u.getCostSingle(disc, exp));
      if (affordable.length > 0) {
        affordable.sort((a, b) => a.getCostSingle(disc, exp) - b.getCostSingle(disc, exp));
        const cheapest = affordable[0];
        const qtyMode = this.dynastyCount > 0 ? "10" : "1";
        const { qty, cost } = cheapest.getBulkInfo(qtyMode, this.beans, disc, exp);
        if (this.beans >= cost) {
          this.beans -= cost;
          cheapest.count += qty;
          this.addXp(40 * qty);
          this.recalculateRates();
          this.markDirty();
        }
      }
    }

    if (this.staff[1].level > 0) {
      if (this.croissant.active && Math.random() < this.staff[1].level * 0.15 * dt) {
        this.croissant.active = false;
        this.croissantsCaught += 1;
        this.triggerCroissantFrenzy(245, 265, "Pip caught a Croissant!");
      }
      if (this.weather.pearlDrop && Math.random() < this.staff[1].level * 0.15 * dt) {
        this.weather.pearlDrop = null;
        this.raindropPearls += 1;
        this.recalculateRates();
        this.markDirty();
        this.popups.push(new FloatingPopup(`Pip caught a Raindrop Pearl 💧!`, 245, 240, COLORS.raindropPearl));
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

    if (this.getSpecialtyLevel("sp5") >= 2 && this.autoBrew) {
      for (const r of this.recipes) {
        if (!r.crafted && !r.brewing && this.beans >= r.costBeans) {
          this.beans -= r.costBeans;
          r.brewing = true;
          r.progress = 0.0;
          this.markDirty();
        }
      }
    }

    const speedMult = Math.pow(2.0, this.pantheonPerks[2].count) * temporalMult;
    for (const r of this.recipes) {
      if (r.brewing) {
        r.progress += dt * speedMult;
        if (r.progress >= r.brewTime) {
          r.brewing = false;
          r.crafted = true;
          this.quests[4].currentVal += 1;
          this.addXp(550);
          this.recalculateRates();
          this.markDirty();
          this.sfx.playBrew(this.sfxEnabled, this.sfxVolume);
          this.popups.push(new FloatingPopup(`BREWED: ${r.name}!`, 245, 275, COLORS.success));
        }
      }
    }
    if (this.recipes.every((r) => r.crafted) && !this.quests[4].completed && this.quests[4].tier === 1) {
      this.quests[4].currentVal = this.quests[4].targetVal;
    }

    if (this.activeOrder) {
      this.activeOrder.timeRemaining -= dt;
      this.activeOrder.age = (this.activeOrder.age || 0) + dt;
      if (this.activeOrder.timeRemaining <= 0) {
        this.activeOrder = null;
        this.orderTimer = 6.0;
      } else if (this.autoServe && this.activeOrder.age >= 1.5) {
        this.serveCurrentOrder();
      }
    } else {
      this.orderTimer -= dt;
      if (this.orderTimer <= 0) {
        this.totalOrdersSpawned += 1;
        const isVip = this.totalOrdersSpawned % 5 === 0;
        const craftedNames = this.recipes.filter((r) => r.crafted).map((r) => r.name);
        const target = craftedNames.length > 0
          ? craftedNames[Math.floor(Math.random() * craftedNames.length)]
          : "House Drip Coffee";
        this.activeOrder = {
          recipeName: target,
          rewardMult: 1.2 + Math.random() * 1.3,
          timeRemaining: isVip ? 25.0 : 35.0,
          age: 0.0,
          isVip
        };
      }
    }

    for (const q of this.quests) {
      if (q.completed && !q.retired) {
        if (q.qid === "q05" && this.recipes.every((r) => r.crafted)) {
          q.retired = true;
          continue;
        }
        q.refreshTimer += dt;
        if (q.refreshTimer >= 10.0) {
          q.completed = false;
          q.refreshTimer = 0.0;
          q.currentVal = 0;
          q.tier += 1;
          q.targetVal = Math.min(1e12, Math.ceil(q.targetVal * 1.45));
          const scaledReward = Math.max(q.rewardBeans * 2.5, this.bps * 60.0);
          q.rewardBeans = Number.isFinite(scaledReward) ? Math.min(1e300, scaledReward) : 1e300;
          q.rewardStars += 1;
          q.rewardTokens = (q.rewardTokens || 5) + 3;
        }
      }
    }

    if (this.autoVent && this.boilerTemp >= 95.0 && !this.overheatLockout) {
      this.ventBoiler();
    }

    this.scaleX += (1.0 - this.scaleX) * Math.min(14.0 * dt, 1.0);
    this.scaleY += (1.0 - this.scaleY) * Math.min(14.0 * dt, 1.0);
    this.catScaleX += (1.0 - this.catScaleX) * Math.min(12.0 * dt, 1.0);
    this.catScaleY += (1.0 - this.catScaleY) * Math.min(12.0 * dt, 1.0);

    let cRate = 1.0 + this.talents[4].rank * 0.08 + this.celestialDew * 0.05;
    if (this.decor[2].bought) cRate *= this.decor[2].buffVal;
    if (this.recipes[5].crafted) cRate *= this.recipes[5].buffVal;
    if (this.rainEnabled) this.weather.update(dt * Math.max(1.0, cRate * 0.85));
    this.croissant.update(dt, 450, 652, cRate);

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
    if (this.arcade) this.arcade.update(dt);
    if (this.beanEquip) this.beanEquip.update(dt);

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
    ctx.clearRect(0, 0, 450, 652);

    ctx.fillStyle = this.weather.getWindowColor();
    ctx.beginPath();
    ctx.roundRect(0, 0, 450, 652, 16);
    ctx.fill();

    // Decor 1: Fairy String Lights
    if (this.decor[0].bought) {
      for (let lx = 15; lx < 435; lx += 36) {
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

    // Decor 2: Hanging Pothos Vine
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

    // Decor 3: Brass Wind Chimes
    if (this.decor[2].bought) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(400, 2);
      ctx.lineTo(400, 26);
      ctx.stroke();
      for (const cxOff of [-6, 0, 6]) {
        ctx.strokeStyle = COLORS.goldHover;
        ctx.beginPath();
        ctx.moveTo(400 + cxOff, 26);
        ctx.lineTo(400 + cxOff, 51 + Math.abs(cxOff) * 3);
        ctx.stroke();
      }
    }

    // Decor 5: Velvet Fireside Armchair Warm Hearth Glow
    if (this.decor[4].bought) {
      const hearthGrad = ctx.createRadialGradient(420, 620, 10, 420, 620, 120);
      hearthGrad.addColorStop(0, "rgba(235, 140, 52, 0.32)");
      hearthGrad.addColorStop(1, "rgba(235, 140, 52, 0)");
      ctx.fillStyle = hearthGrad;
      ctx.fillRect(280, 500, 170, 152);
    }

    if (this.rainEnabled) this.weather.drawRain(ctx);

    // Windowsill line
    ctx.strokeStyle = "rgb(200, 190, 180)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 650);
    ctx.lineTo(450, 650);
    ctx.stroke();

    // Decor 4: Antique Oak Bookshelf Stack on left windowsill
    if (this.decor[3].bought) {
      const bookCols = ["#8c4438", "#3e6b52", "#4a5d82", "#b88014"];
      bookCols.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(14 + i * 8, 622 + (i % 2) * 3, 7, 26 - (i % 2) * 3);
      });
    }

    // Decor 6: Starlight Crystal Terrarium on right windowsill
    if (this.decor[5].bought) {
      ctx.save();
      ctx.fillStyle = "rgba(200, 240, 255, 0.45)";
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(395, 636, 16, Math.PI, 0);
      ctx.lineTo(411, 648);
      ctx.lineTo(379, 648);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawGoldenSparkle(ctx, 395, 636, 6, "#00dfd8");
      ctx.restore();
    }

    // Sleeping Calico Cat (Mochi)
    const { x: catX, y: catY } = this.catCenter;
    const rx = 34 * this.catScaleX;
    const ry = 22 * this.catScaleY;
    ctx.fillStyle = "rgb(210, 200, 195)";
    ctx.beginPath();
    ctx.ellipse(catX, catY + 4, rx + 4, ry, 0, 0, Math.PI * 2);
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
    for (const jb of this.juggleBeans) jb.draw(ctx);
    if (this.particlesEnabled) {
      for (const s of this.steamParticles) s.draw(ctx);
    }

    // Mug & Aura Rings
    const { x: cx, y: cy } = this.mugCenter;
    if (this.frenzyTimer > 0 || (this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0 && !this.overheatLockout)) {
      const auraGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 125);
      auraGrad.addColorStop(0, this.frenzyTimer > 0 ? "rgba(235, 178, 65, 0.35)" : "rgba(65, 160, 95, 0.28)");
      auraGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 125, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.rng && this.rng.equippedIndex >= 0) {
      const eqRarity = RNG_RARITIES[this.rng.equippedIndex];
      const pulse = 92 + Math.sin(performance.now() * 0.004) * 6;
      ctx.save();
      ctx.strokeStyle = eqRarity.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 3 + this.rng.equippedIndex * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.rng && this.rng.isDualAuraUnlocked() && this.rng.subEquippedIndex >= 0) {
      const subRarity = RNG_RARITIES[this.rng.subEquippedIndex];
      const subPulse = 104 + Math.cos(performance.now() * 0.005) * 5;
      ctx.save();
      ctx.strokeStyle = subRarity.color;
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, subPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

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

    // Multi-Stage Evolving Latte Art
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
    } else if (this.latteStage <= 2) {
      for (let tier = -1; tier <= 1; tier++) {
        ctx.beginPath();
        ctx.ellipse(cx, foamY + 2 + tier * 3, (16 - Math.abs(tier) * 4) * this.scaleX, 3.5 * this.scaleY, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.latteStage <= 4) {
      drawGoldenSparkle(ctx, cx, foamY + 2, 11 * this.scaleX, COLORS.goldHover);
    } else {
      ctx.strokeStyle = COLORS.goldHover;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, foamY + 2, 22 * this.scaleX, 6 * this.scaleY, 0, 0, Math.PI * 1.75);
      ctx.stroke();
      drawGoldenSparkle(ctx, cx, foamY + 2, 9 * this.scaleX, "#ffffff");
    }

    // Orbiting Equipped Bean Gears around the Mug
    if (this.beanEquip && this.beanEquip.equipped.length > 0) {
      const nowSec = performance.now() * 0.0022;
      this.beanEquip.equipped.forEach((bIdx, slotIndex) => {
        const bItem = BEAN_EQUIP_RARITIES[bIdx];
        if (!bItem) return;
        const orbAngle = nowSec + slotIndex * Math.PI;
        const ox = cx + Math.cos(orbAngle) * 108;
        const oy = cy + Math.sin(orbAngle) * 34;
        ctx.save();
        ctx.fillStyle = bItem.color;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ox, oy, 10, 7, orbAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    // Glowing Surface Crema Spark Target
    const sparkX = cx + Math.cos(this.cremaSpark.angle) * (this.cremaSpark.radiusX * this.scaleX);
    const sparkY = (cy - h + 2) + Math.sin(this.cremaSpark.angle) * (this.cremaSpark.radiusY * this.scaleY);
    ctx.save();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 10, 0, Math.PI * 2);
    ctx.stroke();
    drawGoldenSparkle(ctx, sparkX, sparkY, 5.5, "#ffffff");
    ctx.restore();

    for (const p of this.popups) p.draw(ctx);
  }

  renderCurrencyGlossary() {
    const body = document.getElementById("glossary-pop-body");
    if (!body) return;
    const nm = this.notationMode;

    const currencyCards = CURRENCY_META.map((c) => {
      const bal = this.getCurrencyBalance(c.key);
      return `
        <div class="glossary-item" style="border-left-color: ${c.color};">
          <div class="glossary-item-top">
            <span style="color: ${c.color};">${c.name} (${c.tier})</span>
            <span>Owned: ${formatNum(bal, nm)}</span>
          </div>
          <div class="glossary-item-desc">${c.desc}</div>
        </div>
      `;
    }).join("");

    const suffixChips = SUFFIX_GUIDE.map(
      (s) => `<div class="suffix-chip"><strong>${s.sym}</strong> = ${s.name}</div>`
    ).join("");

    body.innerHTML = `
      <div class="mult-section-label">Number Suffix Cheat Sheet</div>
      <div class="suffix-grid">${suffixChips}</div>
      <div class="mult-section-label">All 30 Currencies &amp; How to Earn Them</div>
      ${currencyCards}
    `;
  }

  renderStatsModal() {
    const pop = document.getElementById("stats-popover");
    if (!pop || pop.classList.contains("hidden")) return;
    const nm = this.notationMode;
    const unlockedCount = this.achievements.filter((a) => a.unlocked).length;
    pop.querySelector(".popover-title").textContent = `Cafe Stats & Achievements (${unlockedCount}/${this.achievements.length})`;

    const mins = Math.floor(this.playTime / 60);
    const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${Math.floor(this.playTime % 60)}s`;

    const statsHtml = [
      `<strong>Play Time:</strong> ${timeStr}`,
      `<strong>Manual Sips:</strong> ${formatNum(this.manualClicks, nm)}`,
      `<strong>Lifetime Beans:</strong> ${formatNum(this.lifetimeBeansAll, nm)}`,
      `<strong>Orders Served:</strong> ${formatNum(this.ordersCompleted, nm)}`,
      `<strong>Croissants Caught:</strong> ${formatNum(this.croissantsCaught, nm)}`,
      `<strong>Plinko Drops:</strong> ${formatNum(this.plinkoBallsDropped, nm)}`,
      `<strong>Rebirths / Dynasties:</strong> ${this.rebirthCount} / ${this.dynastyCount}`,
      `<strong>Pantheons / Seeds:</strong> ${this.pantheonCount} / ${this.omniverseSeeds}`
    ].map((item) => `<div class="suffix-chip">${item}</div>`).join("");

    document.getElementById("stats-summary-grid").innerHTML = statsHtml;

    document.getElementById("achievements-list").innerHTML = this.achievements.map((a) => `
      <div class="ach-row${a.unlocked ? " unlocked" : ""}">
        <div class="glossary-item-top">
          <span>${a.unlocked ? "🏆" : "🔒"} ${a.title}</span>
          <span>${a.unlocked ? "UNLOCKED" : "Locked"}</span>
        </div>
        <div class="glossary-item-desc">${a.desc}</div>
      </div>
    `).join("");
  }

  renderMultiplierBreakdown(force = false) {
    const pop = document.getElementById("multiplier-popover");
    if (!pop || pop.classList.contains("hidden") || !this.multBreakdown) return;

    const nm = this.notationMode;
    const b = this.multBreakdown;

    const row = (label, valStr, color = "#3a2a22") => `
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
          <strong style="color: #af4b4b;">Soft-Cap Active (Above ${formatNum(b.softCapStart, nm)}x)</strong><br/>
          Raw Total: <strong>${formatNum(b.rawMult, nm)}x</strong> &rarr; Compressed: <strong>${formatNum(b.finalMult, nm)}x</strong><br/>
          Formula: <code>Cap × (Raw / Cap)^${b.softCapExp.toFixed(3)}</code> (${pctStr} retained)
        </div>
      `;
    } else {
      softCapHtml = `
        <div class="mult-softcap-box">
          <strong style="color: #417d50;">Soft-Cap Inactive (100% Efficiency)</strong><br/>
          Compression begins above <strong>${formatNum(b.softCapStart, nm)}x</strong>
        </div>
      `;
    }

    const html = `
      <div class="mult-section-label">Prestige &amp; Ascension</div>
      ${row("Rebirth, Golden & Roastery", `${formatNum(b.rebirthAndGolden, nm)}x`, "#b88014")}
      ${row("Dynasty & Pantheon Tiers", `${formatNum(b.dynastyAndPantheon, nm)}x`, "#8c44bf")}
      ${row("Total Prestige Multiplier", `${formatNum(b.prestigeTotal, nm)}x`, "#436cc2")}

      <div class="mult-section-label">12 Cosmic &amp; Transcendent Currencies</div>
      ${row("Cosmic Currencies & Sanctuary", `${formatNum(b.cosmicCurrencyMult, nm)}x`, "#d62b7c")}
      ${row("God-Tier Cosmic Perks", `${formatNum(b.cosmicPerksMult, nm)}x`, "#23afc8")}
      ${row("Total Cosmic Multiplier", `${formatNum(b.cosmicTotal, nm)}x`, "#d62b7c")}

      <div class="mult-section-label">RNG, Bean Gear &amp; Cafe</div>
      ${row("RNG Aura & Bean Gear Global", `${formatNum(b.rngGlobal * (b.beanEquipGlobal || 1), nm)}x`, "#f56e23")}
      ${row("RNG Dedicated BPS / Click", `${formatNum(b.rngBps, nm)}x / ${formatNum(b.rngClick, nm)}x`, "#7d685d")}
      ${row("Cafe Level, Stars, Brew & Sinks", `${formatNum(b.cafePermanent, nm)}x`, "#c66c44")}
      ${row("Boiler, Frenzy, Purr & Arcade", `${formatNum(b.activeTempAndEvents, nm)}x`, "#417d50")}

      <div class="mult-divider"></div>
      <div class="mult-row mult-row-total">
        <span class="mult-row-label">Effective Global Multiplier</span>
        <span class="mult-row-val" style="color: #b88014;">${formatNum(b.finalMult, nm)}x</span>
      </div>
      ${softCapHtml}
    `;

    if (force || html !== this._lastMultPopHtml) {
      this._lastMultPopHtml = html;
      document.getElementById("mult-pop-body").innerHTML = html;
    }
  }

  refreshDOM() {
    const nm = this.notationMode;

    document.getElementById("beans-display").textContent = `${formatNum(this.beans, nm)} Coffee Beans`;
    document.getElementById("rates-display").innerHTML = `${formatNum(this.bps, nm)}/s &nbsp;|&nbsp; +${formatNum(this.clickPower, nm)}/sip`;

    let mStr = `Multiplier: ${formatNum(this.totalMultiplier, nm)}x`;
    if (this.frenzyTimer > 0) {
      mStr += this.pantheonPerks[1].count >= 5 ? " (ETERNAL FRENZY)" : ` (FRENZY: ${this.frenzyTimer.toFixed(1)}s)`;
    }
    if (this.purrBlissTimer > 0) mStr += ` (Purr: +${this.purrCombo * 10}%)`;
    if (this.altarBlessings > 0) mStr += ` (Altar: ${this.altarBlessings}★)`;
    if (this.sanctuaryUnlocked) mStr += " ★ SANCTUARY";
    const mEl = document.getElementById("multiplier-display");
    mEl.textContent = `${mStr} ▾`;
    mEl.classList.toggle("frenzy-active", this.frenzyTimer > 0 || this.sanctuaryUnlocked);
    this.renderMultiplierBreakdown(false);
    this.renderStatsModal();

    // Update Click-Charged Ultimate Buttons
    const btnOd = document.getElementById("btn-ult-overdrive");
    btnOd.disabled = this.ultCharge < 40;
    btnOd.classList.toggle("ready", this.ultCharge >= 40);
    btnOd.textContent = this.overdriveTimer > 0
      ? `🔥 ACTIVE (${this.overdriveTimer.toFixed(1)}s)`
      : `🔥 Overdrive (${Math.min(40, this.ultCharge)}/40)`;

    const btnMag = document.getElementById("btn-ult-magnet");
    btnMag.disabled = this.ultCharge < 80;
    btnMag.classList.toggle("ready", this.ultCharge >= 80);
    btnMag.textContent = `🌧️ Rain Magnet (${Math.min(80, this.ultCharge)}/80)`;

    const btnMochi = document.getElementById("btn-ult-mochi");
    btnMochi.disabled = this.ultCharge < 120;
    btnMochi.classList.toggle("ready", this.ultCharge >= 120);
    btnMochi.textContent = this.mochiBarrageTimer > 0
      ? `🐾 BARRAGE (${this.mochiBarrageTimer.toFixed(1)}s)`
      : `🐾 Paw Barrage (${Math.min(120, this.ultCharge)}/120)`;

    // Update 16-Tab Notification Alert Dots
    const tabAlerts = {
      orders: !!this.activeOrder,
      talents: this.getAvailableTalentPoints() > 0 || this.milestones.some((m) => this.level >= m.targetLvl && !m.claimed),
      roast: this.getPendingGoldenBeans() > 0,
      dynasty: this.getPendingAstralCrystals() > 0,
      pantheon: this.getPendingStarlightShards() > 0,
      quests: this.quests.some((q) => q.currentVal >= q.targetVal && !q.completed && !q.retired)
    };
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("has-alert", !!tabAlerts[btn.dataset.tab]);
    });

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

    const activeSecondary = CURRENCY_META
      .filter((m) => m.key !== "beans" && this.getCurrencyBalance(m.key) > 0)
      .map((m) => ({
        amt: this.getCurrencyBalance(m.key),
        label: m.short,
        fullName: m.name,
        col: m.color
      }));

    const nextGridHtml = activeSecondary
      .map((c) => `<div class="curr-badge" style="color:${c.col}" title="${c.fullName}"><span class="curr-dot" style="background:${c.col}"></span>${formatNum(c.amt, nm)} ${c.label}</div>`)
      .join("");
    if (nextGridHtml !== this._lastCurrencyGridHtml) {
      this._lastCurrencyGridHtml = nextGridHtml;
      document.getElementById("currency-grid").innerHTML = nextGridHtml;
    }

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

    const autoSiloBtn = document.getElementById("btn-auto-silo");
    autoSiloBtn.classList.toggle("hidden", this.getSpecialtyLevel("sp5") < 1);
    autoSiloBtn.classList.toggle("active", this.autoSilo);

    const tPct = Math.max(0, Math.min(100, ((this.boilerTemp - 50.0) / 50.0) * 100));
    let tStatus = "Normal Temperature", tClass = "heat-cold", tFillClass = "heat-cold-fill";
    if (this.overheatLockout) {
      tStatus = this.getSpecialtyLevel("sp2") >= 5 ? "BOILING (Shielded!)" : "OVERHEATED (-80% Penalty!)";
      tClass = "heat-over"; tFillClass = "heat-over-fill";
    } else if (this.boilerTemp >= 85.0 && this.boilerTemp <= 95.0) {
      tStatus = `SWEET SPOT (+${Math.round((this.getTemperatureMultiplier() - 1) * 100)}% & Distilling!)`;
      tClass = "heat-optimal"; tFillClass = "heat-optimal-fill";
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
    const milestoneStep = 2.0 + this.getSpecialtyLevel("sp7") * 0.10;

    if (this.activeTab === "menu") {
      for (const upg of this.upgrades) {
        const { qty, cost } = upg.getBulkInfo(this.buyMode, this.beans, disc, exp);
        const afford = this.beans >= cost;
        const mMult = upg.getMilestoneMult(milestoneStep);
        const nextM = upg.getNextMilestone();
        const progTag = nextM ? `x${upg.count}/${nextM}` : `x${upg.count}`;
        document.getElementById(`card-${upg.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`acc-${upg.uid}`).className = `card-accent ${afford ? "" : "accent-muted"}`;
        document.getElementById(`cnt-${upg.uid}`).textContent = `${progTag} (+${qty})${mMult > 1 ? ` [${formatNum(mMult, nm)}x]` : ""}`;
        const costEl = document.getElementById(`cost-${upg.uid}`);
        costEl.textContent = `Cost: ${formatNum(cost, nm)} Coffee Beans`;
        costEl.className = `card-cost ${afford ? "cost-afford" : "cost-locked"}`;
      }
    } else if (this.activeTab === "staff") {
      for (const st of this.staff) {
        const cost = this.getStaffCost(st);
        const afford = this.beans >= cost;
        document.getElementById(`card-${st.uid}`).classList.toggle("locked", !afford);
        document.getElementById(`lvl-${st.uid}`).textContent = `Level: ${st.level}`;
        const btn = document.getElementById(`btn-${st.uid}`);
        btn.textContent = `${formatNum(cost, nm)} Beans`;
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
          btn.textContent = `${formatNum(dec.cost, nm)} Beans`;
          btn.className = `btn ${afford ? "btn-accent" : "btn-disabled"}`;
          btn.disabled = !afford;
        }
      }
    } else if (this.activeTab === "brew") {
      const abBtn = document.getElementById("btn-auto-brew");
      abBtn.classList.toggle("hidden", this.getSpecialtyLevel("sp5") < 2);
      abBtn.textContent = this.autoBrew ? "Auto-Brew: ON" : "Auto-Brew: OFF";
      abBtn.className = `btn btn-sm ${this.autoBrew ? "btn-success" : "btn-secondary"}`;

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
          btn.textContent = `${formatNum(rec.costBeans, nm)} Beans`;
          btn.className = `btn ${afford ? "btn-accent" : "btn-disabled"}`;
          btn.disabled = !afford;
        }
      }
    } else if (this.activeTab === "orders") {
      const asBtn = document.getElementById("btn-auto-serve");
      asBtn.textContent = this.autoServe ? "Auto-Serve: ON" : "Auto-Serve: OFF";
      asBtn.className = `btn btn-sm ${this.autoServe ? "btn-success" : "btn-secondary"}`;
      const remVip = 5 - (this.totalOrdersSpawned % 5);
      document.getElementById("customer-stars-display").textContent =
        `Customer Stars Collected: ${this.customerStars} ★ | Next VIP Critic in ${remVip} order${remVip === 1 ? "" : "s"}`;

      const vipBadge = document.getElementById("order-vip-badge");
      const titleEl = document.getElementById("order-title");
      const timerEl = document.getElementById("order-timer");
      const serveBtn = document.getElementById("btn-serve-order");

      if (this.activeOrder) {
        vipBadge.classList.toggle("hidden", !this.activeOrder.isVip);
        titleEl.textContent = `Current Order: ${this.activeOrder.recipeName}`;
        timerEl.textContent = `Time Remaining: ${Math.ceil(this.activeOrder.timeRemaining)}s`;
        const isStarter = this.activeOrder.recipeName === "House Drip Coffee";
        const rec = this.recipes.find((r) => r.name === this.activeOrder.recipeName);
        const canServe = isStarter || (rec && rec.crafted);
        serveBtn.classList.remove("hidden");
        serveBtn.textContent = canServe ? (this.activeOrder.isVip ? "Serve VIP Critic! 👑" : "Serve Drink!") : "Recipe Not Mastered";
        serveBtn.disabled = !canServe;
      } else {
        vipBadge.classList.add("hidden");
        titleEl.textContent = "Waiting for next customer...";
        timerEl.textContent = "";
        serveBtn.classList.add("hidden");
      }
    } else if (this.activeTab === "arcade") {
      this.arcade.refreshDOM();
    } else if (this.activeTab === "plinko") {
      document.querySelectorAll(".plinko-curr-btn").forEach((b) => {
        const active = b.dataset.curr === this.plinko.currencyType;
        b.classList.toggle("active", active);
        b.style.backgroundColor = active ? b.dataset.color : "";
      });
      const bias = this.plinko.getCurrencyBias(this.talents[4].rank * 0.03);
      const fullCurrName = getCurrencyName(this.plinko.currencyType);
      document.getElementById("plinko-risk-label").textContent = `${fullCurrName}: Center Bias ${Math.round(bias * 100)}%`;

      const bal = this.getCurrencyBalance(this.plinko.currencyType);
      const maxBet = this.plinko.getMaxBet(bal);
      document.getElementById("plinko-bal-label").textContent = `Bal: ${formatNum(bal, nm)} (Max: ${formatNum(maxBet, nm)})`;
      const betVal = this.plinko.parseBetAmount(document.getElementById("plinko-bet-input").value, bal);
      const dropBtn = document.getElementById("btn-plinko-drop");
      dropBtn.textContent = `DROP (${formatNum(betVal, nm)})`;
      dropBtn.disabled = bal < betVal || betVal <= 0;
      document.getElementById("btn-plinko-drop5").disabled = bal < betVal * 5 || betVal <= 0;

      const pCanvas = document.getElementById("plinko-canvas");
      this.plinko.draw(pCanvas.getContext("2d"));
    } else if (this.activeTab === "rng") {
      this.rng.refreshDOM();
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
    } else if (this.activeTab === "sinks") {
      document.getElementById("altar-title").textContent = `Altar of the Roast (Blessings: ${this.altarBlessings} ★)`;
      document.getElementById("btn-altar-sacrifice").disabled = this.beans < 1e6;

      for (const sp of SPECIALTY_UPGRADES) {
        const lvl = this.getSpecialtyLevel(sp.id);
        const cost = this.getSpecialtyCost(sp);
        const bal = this.getCurrencyBalance(sp.curr);
        const can = lvl < sp.max && bal >= cost;
        document.getElementById(`splvl-${sp.id}`).textContent = sp.isConsumable
          ? `Owned: ${formatNum(bal, nm)}`
          : `Lv. ${lvl}/${sp.max}`;
        const btn = document.getElementById(`btn-${sp.id}`);
        if (!sp.isConsumable && lvl >= sp.max) {
          btn.textContent = "MAXED";
          btn.className = "btn btn-sm btn-disabled";
          btn.disabled = true;
        } else {
          btn.textContent = `${formatNum(cost, nm)} ${getCurrencyName(sp.curr)}`;
          btn.className = `btn btn-sm ${can ? "btn-gold" : "btn-disabled"}`;
          btn.disabled = !can;
        }
      }

      document.getElementById("btn-tr1").disabled = this.beans < 500e6;
      document.getElementById("btn-tr2").disabled = this.goldenBeans < 250;
      document.getElementById("btn-tr3").disabled = this.astralCrystals < 100;
      document.getElementById("btn-tr4").disabled = this.arcadeTokens < 20;
      document.getElementById("btn-tr5").disabled = this.paradoxDust < 500 || this.eternalBeans < 1;
      document.getElementById("btn-tr6").disabled = this.purrWhiskers < 15 || this.voidRelics < 5;

      for (const snk of this.sinks) {
        const bal = this.getCurrencyBalance(snk.currencyType);
        const cost = snk.getCostSingle();
        const can = bal >= cost;
        document.getElementById(`ttl-${snk.uid}`).textContent = `${snk.name} (Lv. ${snk.level})`;
        const costEl = document.getElementById(`cost-${snk.uid}`);
        costEl.textContent = `Cost: ${formatNum(cost, nm)} ${getCurrencyName(snk.currencyType)}`;
        costEl.className = `card-cost ${can ? "cost-afford" : "cost-locked"}`;
        document.getElementById(`b1-${snk.uid}`).disabled = !can;
        document.getElementById(`b25-${snk.uid}`).disabled = !can;
        document.getElementById(`b90-${snk.uid}`).disabled = !can;
      }
    } else if (this.activeTab === "cosmos") {
      const afBtn = document.getElementById("btn-auto-forge");
      afBtn.classList.toggle("hidden", this.getSpecialtyLevel("sp11") < 1);
      afBtn.textContent = this.autoForge ? "Auto-Forge: ON" : "Auto-Forge: OFF";
      afBtn.className = `btn btn-sm ${this.autoForge ? "btn-success" : "btn-secondary"}`;

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
        banner.textContent = "GOAL: Lv.100, 12 Recipes, Silo 45, 10 Omega Singularity, 3 Genesis Crema & 1 Eternal Bean";
      }

      const pendingSeeds = this.getPendingOmniverseSeeds();
      document.getElementById("omniverse-bal-header").textContent =
        `Omniverse Seeds: ${formatNum(this.omniverseSeeds, nm)} (Production ^${(1.0 + this.omniverseSeeds * 0.015).toFixed(3)})`;
      const omniBanner = document.getElementById("btn-trigger-omniverse");
      omniBanner.classList.toggle("ready", pendingSeeds > 0);
      document.getElementById("omniverse-status-text").textContent = pendingSeeds > 0
        ? `Harvest +${formatNum(pendingSeeds, nm)} Omniverse Seeds (Resets Cosmic Forges)`
        : "Awaken the Sanctuary first to harvest Omniverse Seeds";

      for (const cp of this.cosmicPerks) {
        const bal = this.getCurrencyBalance(cp.currencyType);
        const cost = cp.getCostSingle();
        const can = bal >= cost;
        const cFullName = getCurrencyName(cp.currencyType);
        document.getElementById(`ttl-${cp.uid}`).textContent = `${cp.name} (Lv. ${cp.level})`;
        const costEl = document.getElementById(`cost-${cp.uid}`);
        costEl.textContent = `Cost: ${formatNum(cost, nm)} ${cFullName} (Owned: ${formatNum(bal, nm)})`;
        costEl.className = `card-cost ${can ? "cost-afford" : "cost-locked"}`;
        const btn = document.getElementById(`btn-${cp.uid}`);
        btn.disabled = !can;
        btn.style.backgroundColor = can ? "#e63c8c" : "";
      }
    } else if (this.activeTab === "roast") {
      document.getElementById("roast-bal-header").textContent = `Available: ${formatNum(this.goldenBeans, nm)} Golden Beans`;
      const arBtn = document.getElementById("btn-auto-rebirth");
      arBtn.classList.toggle("hidden", this.getSpecialtyLevel("sp5") < 3);
      arBtn.textContent = this.autoRebirth ? "Auto-Rebirth: ON" : "Auto-Rebirth: OFF";
      arBtn.className = `btn btn-sm ${this.autoRebirth ? "btn-success" : "btn-secondary"}`;

      const pending = this.getPendingGoldenBeans();
      const banner = document.getElementById("btn-trigger-rebirth");
      banner.classList.toggle("ready", pending > 0);
      document.getElementById("rebirth-status-text").textContent = pending > 0
        ? `Claim +${formatNum(pending, nm)} Golden Beans`
        : `${formatNum(this.lifetimeBeansRun, nm)} / ${formatNum(this.getRebirthThreshold(), nm)} Coffee Beans`;

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
        : `${formatNum(this.lifetimeGolden, nm)} / ${formatNum(this.getDynastyThreshold(), nm)} Golden Beans`;

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
        : `${formatNum(this.lifetimeCrystals, nm)} / ${formatNum(this.getPantheonThreshold(), nm)} Astral Crystals`;

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
        const ready = q.currentVal >= q.targetVal && !q.completed && !q.retired;
        document.getElementById(`qtitle-${q.qid}`).textContent = `${q.title} (Tier ${q.tier})`;
        document.getElementById(`qdesc-${q.qid}`).textContent = `${q.desc} — Reward: +${formatNum(q.rewardBeans, nm)} Beans, +${q.rewardStars} ★ & +${q.rewardTokens || 5} Tokens`;
        const btn = document.getElementById(`btn-${q.qid}`);
        if (q.retired) {
          document.getElementById(`prog-${q.qid}`).textContent = "All 12 Brew Lab recipes mastered!";
          btn.textContent = "ALL MASTERED"; btn.className = "btn btn-sm btn-disabled"; btn.disabled = true;
        } else if (q.completed) {
          document.getElementById(`prog-${q.qid}`).textContent = `Refreshing in ${Math.ceil(10 - q.refreshTimer)}s...`;
          btn.textContent = "CLAIMED"; btn.className = "btn btn-sm btn-disabled"; btn.disabled = true;
        } else if (ready) {
          document.getElementById(`prog-${q.qid}`).textContent = `Progress: ${formatNum(q.currentVal, nm)} / ${formatNum(q.targetVal, nm)}`;
          btn.textContent = "CLAIM!"; btn.className = "btn btn-sm btn-success"; btn.disabled = false;
        } else {
          document.getElementById(`prog-${q.qid}`).textContent = `Progress: ${formatNum(q.currentVal, nm)} / ${formatNum(q.targetVal, nm)}`;
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

      const secsAgo = Math.max(0, Math.floor((Date.now() - this.lastSaveTimeMs) / 1000));
      document.getElementById("cfg-last-saved").textContent =
        secsAgo === 0 ? "Auto-saved just now ✓" : `Auto-saved ${secsAgo}s ago ✓`;

      document.getElementById("btn-cfg-notation").textContent = this.notationMode === "suffix" ? "Suffixes (1.5M)" : "Scientific (1e6)";
      document.getElementById("btn-cfg-wipe").textContent = this.wipeConfirmActive ? "CLICK AGAIN TO CONFIRM" : "Wipe All Save Data";
    }

    if (this.beanEquip) this.beanEquip.refreshDOM();
  }
}

// =============================================================================
// 13. RESPONSIVE VIEWPORT AUTO-SCALING & RELIABLE AUTO-SAVE 60FPS LOOP
// =============================================================================

function fitGameToViewport() {
  const container = document.getElementById("game-container");
  if (!container) return;
  const pad = 16;
  const scaleX = (window.innerWidth - pad) / 1120;
  const scaleY = (window.innerHeight - pad) / 700;
  const scale = Math.min(1.0, scaleX, scaleY);
  container.style.transform = scale < 1.0 ? `scale(${scale.toFixed(4)})` : "";
}

window.addEventListener("DOMContentLoaded", () => {
  fitGameToViewport();
  window.addEventListener("resize", fitGameToViewport);

  const game = new GameState();
  let lastTime = performance.now();
  let saveTimer = 0.0;
  let dirtySaveTimer = 0.0;

  window.addEventListener("pointerdown", () => game.markDirty());
  window.addEventListener("keydown", () => game.markDirty());

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000.0, 0.1);
    lastTime = now;

    game.update(dt);
    game.drawSceneCanvas();
    game.refreshDOM();

    saveTimer += dt;
    if (game.saveDirty) {
      dirtySaveTimer += dt;
      if (dirtySaveTimer >= 1.5) {
        dirtySaveTimer = 0.0;
        saveTimer = 0.0;
        game.saveGame();
      }
    }
    if (saveTimer >= 5.0) {
      saveTimer = 0.0;
      dirtySaveTimer = 0.0;
      game.saveGame();
    }

    requestAnimationFrame(loop);
  }

  window.addEventListener("pagehide", () => game.saveGame());
  window.addEventListener("beforeunload", () => game.saveGame());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      game.saveGame();
    }
  });

  requestAnimationFrame(loop);
});