export class StationManager {
  constructor(rng) {
    const a1 = rng() * Math.PI * 2;
    const a2 = rng() * Math.PI * 2;
    const r2 = 3800 + rng() * 1400;

    this.stations = [
      {
        x: Math.cos(a1) * 1500,
        y: Math.sin(a1) * 1500,
        rotation: 0,
        name: 'Station Alpha',
        accentColor: '#40b8d0',
        glowRgb: '64,184,208',
        lightPhase: 0,
      },
      {
        x: Math.cos(a2) * r2,
        y: Math.sin(a2) * r2,
        rotation: Math.PI / 4,
        name: 'Station Beta',
        accentColor: '#d08840',
        glowRgb: '208,136,64',
        lightPhase: Math.PI,
      },
    ];
  }

  get spawnPoint() {
    const s = this.stations[0];
    return { x: s.x + 110, y: s.y + 40 };
  }

  update(dt) {
    for (const s of this.stations) {
      s.rotation += 0.025 * dt;
      s.lightPhase += 2.0 * dt;
    }
  }

  draw(ctx) {
    for (const s of this.stations) {
      this._drawStation(ctx, s);
    }
  }

  _drawStation(ctx, s) {
    const { x, y, rotation, name, accentColor, glowRgb, lightPhase } = s;

    ctx.save();
    ctx.translate(x, y);

    // Ambient glow
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 95);
    glow.addColorStop(0, `rgba(${glowRgb},0.14)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();

    // Rotating structure
    ctx.rotate(rotation);

    // 4 structural arms + solar panels on 2 opposite arms
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);

      ctx.fillStyle = '#1e2e3e';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.rect(-3, 17, 6, 33);
      ctx.fill();
      ctx.stroke();

      if (i % 2 === 0) {
        // Solar panel
        ctx.fillStyle = '#0a2848';
        ctx.strokeStyle = '#1a5090';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-20, 47, 40, 8);
        ctx.fill();
        ctx.stroke();
        // Cell grid
        ctx.strokeStyle = '#0c3060';
        ctx.lineWidth = 0.5;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(-20 + k * 10, 47);
          ctx.lineTo(-20 + k * 10, 55);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-20, 51);
        ctx.lineTo(20, 51);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Docking ring
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Central hub
    const hubGrad = ctx.createRadialGradient(-4, -4, 1, 0, 0, 16);
    hubGrad.addColorStop(0, '#506070');
    hubGrad.addColorStop(1, '#141e28');
    ctx.fillStyle = hubGrad;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Blinking nav lights (red/green alternating)
    const blink = Math.sin(lightPhase) > 0;
    ctx.fillStyle = blink ? '#ff4444' : '#220000';
    ctx.beginPath();
    ctx.arc(28, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = !blink ? '#44ff44' : '#002200';
    ctx.beginPath();
    ctx.arc(-28, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Name label (fixed, not rotating)
    ctx.fillStyle = accentColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y + 94);
  }
}
