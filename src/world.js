import { createRng } from './utils.js';
import { StationManager } from './stations.js';
import { NebulaField } from './nebula.js';
import { AsteroidField } from './asteroids.js';
import { CometField } from './comets.js';
import { DerelictField } from './derelicts.js';
import { AnomalyField } from './anomalies.js';

const WORLD_RADIUS = 20000;

const PLANET_TYPES = [
  { name: 'rocky',    colors: ['#8B7355','#A0856C','#7A6248'], atmo: 'rgba(180,140,80,0.15)' },
  { name: 'oceanic',  colors: ['#2E86AB','#1A6B8A','#3AA5C8'], atmo: 'rgba(80,160,255,0.2)' },
  { name: 'gas',      colors: ['#C17B2A','#D49040','#B06820'], atmo: 'rgba(220,160,60,0.25)' },
  { name: 'frozen',   colors: ['#B0C8D8','#C8DCE8','#90B0C0'], atmo: 'rgba(160,200,255,0.2)' },
  { name: 'volcanic', colors: ['#5A1A0A','#7A2A10','#3A0A00'], atmo: 'rgba(255,80,20,0.25)' },
  { name: 'jungle',   colors: ['#1A5C2A','#2A7A38','#0E4020'], atmo: 'rgba(60,200,80,0.18)' },
  { name: 'desert',   colors: ['#C8A040','#D4B060','#B09030'], atmo: 'rgba(220,180,80,0.15)' },
];

function generatePlanet(rng, index) {
  const angle  = rng() * Math.PI * 2;
  const minR   = 1200 + index * 1400;
  const maxR   = minR + 800;
  const r      = minR + rng() * (maxR - minR);
  const type   = PLANET_TYPES[Math.floor(rng() * PLANET_TYPES.length)];
  const radius = 28 + rng() * 52;
  const hasRings  = rng() > 0.72;
  const numMoons  = Math.floor(rng() * 3.5);
  const color     = type.colors[Math.floor(rng() * type.colors.length)];
  const color2    = type.colors[Math.floor(rng() * type.colors.length)];
  const bandAngle = rng() * Math.PI;
  const bandCount = 2 + Math.floor(rng() * 4);

  const moons = [];
  for (let m = 0; m < numMoons; m++) {
    moons.push({
      orbitR: radius + 25 + m * 22 + rng() * 14,
      angle:  rng() * Math.PI * 2,
      speed:  (0.3 + rng() * 0.5) * (rng() > 0.5 ? 1 : -1),
      r:      3 + rng() * 5,
      color:  `hsl(${Math.floor(rng()*360)},20%,${50+Math.floor(rng()*30)}%)`,
    });
  }

  // Kepler-ish: outer planets orbit slower (ω ∝ r^-1.5 simplified to 1/√r)
  const orbitSpeed = 1.2 / Math.sqrt(r);

  return {
    orbitRadius: r,
    orbitAngle:  angle,
    orbitSpeed,
    x: Math.cos(angle) * r,   // kept as mutable fields, updated each frame
    y: Math.sin(angle) * r,
    radius,
    type: type.name,
    color,
    color2,
    atmo: type.atmo,
    hasRings,
    ringAngle: rng() * Math.PI / 3 - Math.PI / 6,
    ringInner: radius * 1.4,
    ringOuter: radius * 2.1 + rng() * radius,
    ringColor: `hsla(${Math.floor(rng()*360)},40%,70%,0.35)`,
    bandAngle,
    bandCount,
    moons,
    name: `Planet ${String.fromCharCode(65 + index)}`,
    labelColor: '#aac8ff',
  };
}

export class World {
  constructor(seed) {
    const rng = createRng(seed);
    this.worldRadius = WORLD_RADIUS;

    // Sun
    this.sun = {
      x: 0, y: 0,
      radius: 90,
      color1: '#FFF07A',
      color2: '#FF9A00',
      glowColor: 'rgba(255,200,50,0.12)',
    };
    this._flares = [];
    this._flareTimer = 8 + rng() * 8; // seconds until next flare

    // 6-9 planets
    const count = 6 + Math.floor(rng() * 4);
    this.planets = [];
    for (let i = 0; i < count; i++) {
      this.planets.push(generatePlanet(rng, i));
    }

    this.stationManager = new StationManager(rng);
    this.nebulae        = new NebulaField(seed, WORLD_RADIUS);
    this.asteroids      = new AsteroidField(seed);
    this.comets         = new CometField(rng);
    this.derelicts      = new DerelictField(seed, WORLD_RADIUS);
    this.anomalies      = new AnomalyField(seed, WORLD_RADIUS);
  }

  get stations() { return this.stationManager.stations; }
  get spawnPoint() { return this.stationManager.spawnPoint; }

  update(dt) {
    // Solar flare spawning
    this._flareTimer -= dt;
    if (this._flareTimer <= 0) {
      const rng = createRng(Date.now() ^ 0xF1A2E3);
      const angle = rng() * Math.PI * 2;
      this._flares.push({
        angle,
        life: 0,
        maxLife: 1.6 + rng() * 0.8,
        length: this.sun.radius * (0.9 + rng() * 1.4),
        width:  this.sun.radius * (0.18 + rng() * 0.22),
        curve:  (rng() - 0.5) * 1.2,
      });
      this._flareTimer = 8 + rng() * 14;
    }
    for (let i = this._flares.length - 1; i >= 0; i--) {
      this._flares[i].life += dt;
      if (this._flares[i].life >= this._flares[i].maxLife) this._flares.splice(i, 1);
    }

    for (const p of this.planets) {
      p.orbitAngle += p.orbitSpeed * dt;
      p.x = Math.cos(p.orbitAngle) * p.orbitRadius;
      p.y = Math.sin(p.orbitAngle) * p.orbitRadius;
      for (const m of p.moons) {
        m.angle += m.speed * dt;
      }
    }
    this.stationManager.update(dt);
    this.asteroids.update(dt);
    this.comets.update(dt);
    this.derelicts.update(dt);
    this.anomalies.update(dt);
  }

  draw(ctx, camera, canvas) {

    // World boundary ring
    ctx.save();
    ctx.strokeStyle = 'rgba(80,120,200,0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 18]);
    ctx.beginPath();
    ctx.arc(0, 0, this.worldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Nebulae drawn first, behind everything
    this.nebulae.draw(ctx);
    this.comets.draw(ctx);

    this._drawSun(ctx);

    for (const p of this.planets) {
      this._drawOrbitLine(ctx, p);
    }

    // Asteroid belts between orbit lines and planets
    this.asteroids.draw(ctx);

    for (const p of this.planets) {
      this._drawPlanet(ctx, p, camera, canvas);
    }
    this.stationManager.draw(ctx);
    this.derelicts.draw(ctx);
    this.anomalies.draw(ctx);
  }

  _drawSun(ctx) {
    const s = this.sun;

    // Solar flares (drawn behind sun body)
    for (const f of this._flares) {
      const t = f.life / f.maxLife;           // 0→1 over lifetime
      // Ease: rise fast (0→0.3), then fade slow (0.3→1)
      const alpha = t < 0.3
        ? (t / 0.3) * 0.72
        : (1 - (t - 0.3) / 0.7) * 0.72;
      const ext = t < 0.3
        ? (t / 0.3)
        : 1 - (t - 0.3) / 0.7 * 0.4;        // slight retraction as it fades

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(f.angle);

      const baseR = s.radius * 0.92;
      const tipR  = baseR + f.length * ext;
      const hw    = f.width * (1 - t * 0.5);  // narrows as it fades

      // Arch: control point offset perpendicular by curve amount
      const cpx = f.curve * hw * 3;
      const cpy = (baseR + tipR) / 2;

      const grad = ctx.createLinearGradient(0, baseR, 0, tipR);
      grad.addColorStop(0,   `rgba(255,220,80,${alpha})`);
      grad.addColorStop(0.4, `rgba(255,140,30,${alpha * 0.75})`);
      grad.addColorStop(1,   `rgba(255,80,10,0)`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(-hw, baseR);
      ctx.quadraticCurveTo(cpx - hw * 0.5, cpy, 0, tipR);
      ctx.quadraticCurveTo(cpx + hw * 0.5, cpy, hw, baseR);
      ctx.closePath();
      ctx.fill();

      // Bright core streak
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = `rgba(255,245,180,0.9)`;
      ctx.lineWidth   = Math.max(0.5, hw * 0.25);
      ctx.beginPath();
      ctx.moveTo(0, baseR);
      ctx.quadraticCurveTo(cpx, cpy, 0, tipR);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    // Outer corona layers
    for (let i = 3; i >= 0; i--) {
      const gr = ctx.createRadialGradient(s.x, s.y, s.radius * 0.8, s.x, s.y, s.radius * (2.5 + i));
      gr.addColorStop(0, `rgba(255,200,50,${0.06 - i * 0.01})`);
      gr.addColorStop(1, 'rgba(255,150,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * (2.5 + i), 0, Math.PI * 2);
      ctx.fill();
    }

    // Sun body
    const grad = ctx.createRadialGradient(s.x - s.radius * 0.3, s.y - s.radius * 0.3, s.radius * 0.1, s.x, s.y, s.radius);
    grad.addColorStop(0, '#FFFAAA');
    grad.addColorStop(0.5, s.color1);
    grad.addColorStop(1, s.color2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawOrbitLine(ctx, p) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,150,220,0.28)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, p.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawPlanet(ctx, p, camera, canvas) {
    const { x, y, radius } = p;

    // Atmosphere glow
    const ag = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius * 1.7);
    ag.addColorStop(0, p.atmo);
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Planet body
    const pg = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.05, x, y, radius);
    pg.addColorStop(0, lighten(p.color, 40));
    pg.addColorStop(0.6, p.color);
    pg.addColorStop(1, darken(p.color, 40));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Surface bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    for (let b = 0; b < p.bandCount; b++) {
      const by = y - radius + (b / p.bandCount) * radius * 2 + 4;
      const bh = radius / (p.bandCount * 1.2);
      ctx.fillStyle = `rgba(0,0,0,0.08)`;
      ctx.fillRect(x - radius, by, radius * 2, bh);
    }
    // Specular highlight
    const spec = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x - radius * 0.3, y - radius * 0.3, radius * 0.7);
    spec.addColorStop(0, 'rgba(255,255,255,0.18)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();

    // Rings (behind planet for back, over planet for front)
    if (p.hasRings) {
      this._drawRings(ctx, p, false);
    }

    // Moons
    for (const m of p.moons) {
      const mx = x + Math.cos(m.angle) * m.orbitR;
      const my = y + Math.sin(m.angle) * m.orbitR;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Planet label
    ctx.fillStyle = p.labelColor;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, x, y + radius + 18);
  }

  _drawRings(ctx, p, behind) {
    const { x, y } = p;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.3 + Math.abs(Math.sin(p.ringAngle)) * 0.25);
    const rg = ctx.createRadialGradient(0, 0, p.ringInner, 0, 0, p.ringOuter);
    rg.addColorStop(0,   p.ringColor);
    rg.addColorStop(0.4, p.ringColor.replace(/[\d.]+\)$/, '0.5)'));
    rg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = p.ringOuter - p.ringInner;
    ctx.beginPath();
    ctx.arc(0, 0, (p.ringInner + p.ringOuter) / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function lighten(hex, amt) {
  return adjustColor(hex, amt);
}
function darken(hex, amt) {
  return adjustColor(hex, -amt);
}
function adjustColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp255((n >> 16) + amt);
  const g = clamp255(((n >> 8) & 0xff) + amt);
  const b = clamp255((n & 0xff) + amt);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
function clamp255(v) { return Math.max(0, Math.min(255, v)); }
