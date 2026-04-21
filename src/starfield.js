import { createRng } from './utils.js';

const LAYERS = [
  { count: 180, speed: 0.05, minR: 0.4, maxR: 0.8, alpha: 0.4 },  // distant
  { count: 100, speed: 0.15, minR: 0.7, maxR: 1.2, alpha: 0.65 }, // mid
  { count:  50, speed: 0.30, minR: 1.0, maxR: 1.8, alpha: 0.9 },  // near
];

export class Starfield {
  constructor(seed) {
    const rng = createRng(seed ^ 0xdeadbeef);
    // Each star: { x, y } in [0,1) normalised screen space, radius, alpha, layer
    this.layers = LAYERS.map(cfg => {
      const stars = [];
      for (let i = 0; i < cfg.count; i++) {
        stars.push({ nx: rng(), ny: rng(), r: cfg.minR + rng() * (cfg.maxR - cfg.minR) });
      }
      return { cfg, stars };
    });
  }

  draw(ctx, canvas, camera) {
    const { width: W, height: H } = canvas;
    for (const { cfg, stars } of this.layers) {
      ctx.globalAlpha = cfg.alpha;
      for (const s of stars) {
        // Wrap star position with parallax offset
        const px = ((s.nx * W + camera.x * cfg.speed) % W + W) % W;
        const py = ((s.ny * H + camera.y * cfg.speed) % H + H) % H;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
