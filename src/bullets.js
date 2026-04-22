export class BulletPool {
  constructor() {
    this.bullets = [];
  }

  fire(x, y, angle, speed, fromPlayer) {
    this.bullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.5,
      maxLife: 1.5,
      fromPlayer,
    });
  }

  update(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) this.bullets.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const b of this.bullets) {
      const t = b.life / b.maxLife;
      ctx.globalAlpha = Math.min(1, t * 3);
      ctx.fillStyle = b.fromPlayer ? '#a0e8ff' : '#ff9060';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.fromPlayer ? 2.5 : 2, 0, Math.PI * 2);
      ctx.fill();
      const gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.fromPlayer ? 7 : 5);
      gr.addColorStop(0, b.fromPlayer ? 'rgba(100,220,255,0.4)' : 'rgba(255,120,40,0.4)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.fromPlayer ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
