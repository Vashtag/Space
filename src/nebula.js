import { createRng } from './utils.js';

const PALETTES = [
  [80, 40, 140],   // purple
  [30, 60, 160],   // blue
  [140, 30, 90],   // magenta
  [20, 110, 130],  // teal
  [70, 40, 120],   // violet
  [50, 110, 60],   // green
];

function makeNebula(rng, worldRadius) {
  const angle = rng() * Math.PI * 2;
  const dist  = worldRadius * (0.25 + rng() * 0.65);
  const [r, g, b] = PALETTES[Math.floor(rng() * PALETTES.length)];
  const cx   = Math.cos(angle) * dist;
  const cy   = Math.sin(angle) * dist;
  const size = 220 + rng() * 380;

  const blobs = [];
  const count = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    blobs.push({
      ox:    (rng() - 0.5) * size * 0.7,
      oy:    (rng() - 0.5) * size * 0.7,
      rx:    size * (0.35 + rng() * 0.65),
      ry:    size * (0.25 + rng() * 0.55),
      rot:   rng() * Math.PI,
      alpha: 0.055 + rng() * 0.075,
    });
  }
  return { cx, cy, r, g, b, blobs };
}

export class NebulaField {
  constructor(seed, worldRadius) {
    const rng   = createRng(seed ^ 0xCAFE1234);
    const count = 5 + Math.floor(rng() * 4);
    this.nebulae = Array.from({ length: count }, () => makeNebula(rng, worldRadius));
  }

  draw(ctx) {
    for (const n of this.nebulae) {
      for (const b of n.blobs) {
        const maxR = Math.max(b.rx, b.ry);
        ctx.save();
        ctx.translate(n.cx + b.ox, n.cy + b.oy);
        ctx.rotate(b.rot);
        ctx.scale(b.rx / maxR, b.ry / maxR);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
        grad.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${b.alpha})`);
        grad.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${(b.alpha * 0.35).toFixed(3)})`);
        grad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, maxR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
