import { createRng } from './utils.js';

// Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 6; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

// Semi-major axis, eccentricity, orbital inclination, starting mean anomaly
const COMET_DEFS = [
  { a: 14000, e: 0.82, incl: 0.30, M0: 0.5 },
  { a: 10500, e: 0.76, incl: 1.85, M0: 2.2 },
  { a: 16500, e: 0.89, incl: -0.55, M0: 4.1 },
  { a:  9000, e: 0.70, incl: 2.60, M0: 1.3 },
];

export class CometField {
  constructor(rng) {
    this.comets = COMET_DEFS.map((def, i) => {
      const c = {
        a:    def.a,
        e:    def.e,
        incl: def.incl + (rng() - 0.5) * 0.3,
        M:    def.M0 + rng() * 0.4,
        n:    1.1 / Math.sqrt(def.a),   // mean motion (rad/s)
        name: `Comet ${['Hale','Encke','Bopp','Swift'][i]}`,
        x: 0, y: 0,
      };
      this._updatePos(c);
      return c;
    });
  }

  _updatePos(c) {
    const E    = solveKepler(c.M, c.e);
    const xOrb = c.a * (Math.cos(E) - c.e);
    const yOrb = c.a * Math.sqrt(1 - c.e * c.e) * Math.sin(E);
    const cos  = Math.cos(c.incl), sin = Math.sin(c.incl);
    c.x = xOrb * cos - yOrb * sin;
    c.y = xOrb * sin + yOrb * cos;
  }

  update(dt) {
    for (const c of this.comets) {
      c.M += c.n * dt;
      this._updatePos(c);
    }
  }

  draw(ctx) {
    for (const c of this.comets) this._drawComet(ctx, c);
  }

  _drawComet(ctx, c) {
    const { x, y, a, e } = c;
    const r = Math.sqrt(x * x + y * y);
    if (r < 1) return;

    // Tail direction: away from sun (radially outward)
    const tdx = x / r, tdy = y / r;
    const pdx = -tdy, pdy = tdx; // perpendicular

    // Tail length: longer when closer to sun (solar wind effect)
    const peri    = a * (1 - e);
    const tailLen = Math.min(1400, Math.max(60, 700 * peri / r));
    const baseW   = tailLen * 0.10;

    // Ion tail (blue-white, narrow)
    const ionGrad = ctx.createLinearGradient(x, y, x + tdx * tailLen, y + tdy * tailLen);
    ionGrad.addColorStop(0,   'rgba(180,220,255,0.55)');
    ionGrad.addColorStop(0.4, 'rgba(130,180,255,0.22)');
    ionGrad.addColorStop(1,   'rgba(80,130,255,0)');
    ctx.fillStyle = ionGrad;
    ctx.beginPath();
    ctx.moveTo(x + pdx * baseW,        y + pdy * baseW);
    ctx.lineTo(x - pdx * baseW,        y - pdy * baseW);
    ctx.lineTo(x + tdx * tailLen,      y + tdy * tailLen);
    ctx.closePath();
    ctx.fill();

    // Dust tail (yellow-brown, wider, slight angular offset)
    const da   = 0.18;
    const ddx  = tdx * Math.cos(da) - tdy * Math.sin(da);
    const ddy  = tdx * Math.sin(da) + tdy * Math.cos(da);
    const dLen = tailLen * 0.75;
    const dW   = baseW * 1.6;
    const dustGrad = ctx.createLinearGradient(x, y, x + ddx * dLen, y + ddy * dLen);
    dustGrad.addColorStop(0,   'rgba(255,210,130,0.35)');
    dustGrad.addColorStop(0.5, 'rgba(210,160,80,0.14)');
    dustGrad.addColorStop(1,   'rgba(180,120,50,0)');
    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.moveTo(x + pdx * dW,   y + pdy * dW);
    ctx.lineTo(x - pdx * dW,   y - pdy * dW);
    ctx.lineTo(x + ddx * dLen, y + ddy * dLen);
    ctx.closePath();
    ctx.fill();

    // Coma (glowing head)
    const comaR   = 10 + tailLen * 0.015;
    const comaGrd = ctx.createRadialGradient(x, y, 0, x, y, comaR);
    comaGrd.addColorStop(0,   'rgba(230,245,255,0.95)');
    comaGrd.addColorStop(0.35,'rgba(180,220,255,0.45)');
    comaGrd.addColorStop(1,   'rgba(100,160,255,0)');
    ctx.fillStyle = comaGrd;
    ctx.beginPath();
    ctx.arc(x, y, comaR, 0, Math.PI * 2);
    ctx.fill();

    // Nucleus
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Name label (only when somewhat visible on screen — rough check)
    if (r < 18000) {
      ctx.fillStyle = 'rgba(160,210,255,0.55)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, x, y - comaR - 6);
    }
  }
}
