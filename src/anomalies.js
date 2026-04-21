import { createRng } from './utils.js';

export class AnomalyField {
  constructor(seed, worldRadius) {
    const rng = createRng(Date.now() ^ 0xAB0DE1CF);
    const R   = worldRadius;

    // 1 black hole in the outer system
    const bhAngle = rng() * Math.PI * 2;
    const bhDist  = R * (0.6 + rng() * 0.25);
    this.blackHole = {
      type:        'blackhole',
      x:           Math.cos(bhAngle) * bhDist,
      y:           Math.sin(bhAngle) * bhDist,
      radius:      38,
      gravRange:   1200,
      gravStrength: 28000,
      diskAngle:   0,
    };

    // 1 pulsar in mid-system
    const psAngle = rng() * Math.PI * 2;
    const psDist  = R * (0.35 + rng() * 0.2);
    this.pulsar = {
      type:      'pulsar',
      x:         Math.cos(psAngle) * psDist,
      y:         Math.sin(psAngle) * psDist,
      radius:    14,
      beamAngle: rng() * Math.PI * 2,
      beamSpeed: 1.8 + rng() * 1.2,   // rad/s
      beamLen:   2200,
    };

    // 1 wormhole pair
    const wa1 = rng() * Math.PI * 2, wr1 = R * (0.3 + rng() * 0.2);
    const wa2 = rng() * Math.PI * 2, wr2 = R * (0.5 + rng() * 0.3);
    const swirl1 = { phase: 0, phase2: rng() * Math.PI * 2 };
    const swirl2 = { phase: Math.PI, phase2: rng() * Math.PI * 2 };
    this.wormholes = [
      { type: 'wormhole', x: Math.cos(wa1) * wr1, y: Math.sin(wa1) * wr1,
        radius: 28, partnerId: 1, swirl: swirl1, label: 'Wormhole α' },
      { type: 'wormhole', x: Math.cos(wa2) * wr2, y: Math.sin(wa2) * wr2,
        radius: 28, partnerId: 0, swirl: swirl2, label: 'Wormhole β' },
    ];

    this.all = [this.blackHole, this.pulsar, ...this.wormholes];
  }

  update(dt) {
    this.blackHole.diskAngle   += 0.4 * dt;
    this.pulsar.beamAngle      += this.pulsar.beamSpeed * dt;
    for (const w of this.wormholes) {
      w.swirl.phase  += 1.6 * dt;
      w.swirl.phase2 += 0.9 * dt;
    }
  }

  applyGravity(ship, dt) {
    const bh = this.blackHole;
    const dx = bh.x - ship.x, dy = bh.y - ship.y;
    const d2 = dx * dx + dy * dy;
    const d  = Math.sqrt(d2);
    if (d < bh.gravRange && d > 1) {
      const force = bh.gravStrength / d2;
      ship.vx += (dx / d) * force * dt;
      ship.vy += (dy / d) * force * dt;
    }
  }

  draw(ctx) {
    this._drawBlackHole(ctx, this.blackHole);
    this._drawPulsar(ctx, this.pulsar);
    for (const w of this.wormholes) this._drawWormhole(ctx, w);
  }

  _drawBlackHole(ctx, bh) {
    const { x, y, radius, diskAngle } = bh;

    // Outer gravity-lensing glow
    for (let i = 3; i >= 0; i--) {
      const gr = ctx.createRadialGradient(x, y, radius, x, y, radius * (3 + i * 1.2));
      gr.addColorStop(0, `rgba(180,100,255,${0.06 - i * 0.012})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, radius * (3 + i * 1.2), 0, Math.PI * 2); ctx.fill();
    }

    // Accretion disk (ellipse, rotating colour bands)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(diskAngle);
    for (let ring = 0; ring < 4; ring++) {
      const rInner = radius * (1.3 + ring * 0.45);
      const rOuter = rInner + radius * 0.38;
      const hue    = 20 + ring * 25;
      const rg = ctx.createRadialGradient(0, 0, rInner, 0, 0, rOuter);
      rg.addColorStop(0,   `hsla(${hue},90%,65%,0.65)`);
      rg.addColorStop(0.5, `hsla(${hue + 15},80%,55%,0.4)`);
      rg.addColorStop(1,   `hsla(${hue},70%,40%,0)`);
      ctx.strokeStyle = rg;
      ctx.lineWidth   = rOuter - rInner;
      ctx.scale(1, 0.28);
      ctx.beginPath(); ctx.arc(0, 0, (rInner + rOuter) / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.scale(1, 1 / 0.28);
    }
    ctx.restore();

    // Event horizon (pure black disk)
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();

    // Photon ring
    ctx.strokeStyle = 'rgba(255,220,120,0.6)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(x, y, radius + 2, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle  = 'rgba(200,160,255,0.65)';
    ctx.font       = '11px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText('Black Hole', x, y + radius + 28);
  }

  _drawPulsar(ctx, ps) {
    const { x, y, radius, beamAngle, beamLen } = ps;

    // Two opposing beams
    for (let b = 0; b < 2; b++) {
      const a   = beamAngle + b * Math.PI;
      const ex  = x + Math.cos(a) * beamLen;
      const ey  = y + Math.sin(a) * beamLen;
      const bg  = ctx.createLinearGradient(x, y, ex, ey);
      bg.addColorStop(0,   'rgba(180,240,255,0.7)');
      bg.addColorStop(0.15,'rgba(120,200,255,0.35)');
      bg.addColorStop(0.5, 'rgba(80,160,220,0.12)');
      bg.addColorStop(1,   'rgba(40,100,180,0)');

      const pw = 5;
      const perp = a + Math.PI / 2;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(perp) * pw, y + Math.sin(perp) * pw);
      ctx.lineTo(x - Math.cos(perp) * pw, y - Math.sin(perp) * pw);
      ctx.lineTo(ex, ey);
      ctx.closePath();
      ctx.fill();
    }

    // Star body
    const sg = ctx.createRadialGradient(x, y, 0, x, y, radius);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.4, '#c0e8ff');
    sg.addColorStop(1,   '#4090c0');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();

    // Outer glow
    const og = ctx.createRadialGradient(x, y, radius, x, y, radius * 2.5);
    og.addColorStop(0, 'rgba(140,210,255,0.3)');
    og.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(140,210,255,0.65)';
    ctx.font      = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Pulsar', x, y + radius + 22);
  }

  _drawWormhole(ctx, w) {
    const { x, y, radius, swirl } = w;

    // Outer energy ring
    const og = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 2.2);
    og.addColorStop(0, 'rgba(140,60,255,0.35)');
    og.addColorStop(0.5,'rgba(80,20,200,0.15)');
    og.addColorStop(1,  'rgba(40,0,120,0)');
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2); ctx.fill();

    // Swirling energy bands
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(swirl.phase + i * (Math.PI * 2 / 3));
      ctx.strokeStyle = `rgba(${160 + i * 30},${80 + i * 20},255,0.45)`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Dark vortex core
    const cg = ctx.createRadialGradient(x, y, 0, x, y, radius);
    cg.addColorStop(0,   'rgba(0,0,0,1)');
    cg.addColorStop(0.6, 'rgba(30,0,80,0.8)');
    cg.addColorStop(1,   'rgba(80,20,180,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();

    // Rim glow
    ctx.strokeStyle = 'rgba(180,100,255,0.7)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = 'rgba(180,120,255,0.7)';
    ctx.font      = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(w.label, x, y + radius + 22);
  }
}
