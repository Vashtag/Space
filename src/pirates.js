import { createRng } from './utils.js';

const PIRATE_MAX_SPD = 190;
const PIRATE_THRUST  = 260;
const PIRATE_DRAG    = 0.982;
const CHASE_RANGE    = 900;
const SHOOT_RANGE    = 520;
const SHOOT_ALIGN    = 0.30;  // rad — must be aimed within this to fire
const BULLET_SPEED   = 640;
const SHOOT_CD       = 2.0;
const TURN_RATE      = 2.4;   // rad/s

export class PirateField {
  constructor(seed, worldRadius) {
    this.worldRadius = worldRadius;
    const rng   = createRng(Date.now() ^ seed);
    const count = 4 + Math.floor(rng() * 3);
    this.pirates = Array.from({ length: count }, () => this._spawn(rng));
  }

  _spawn(rng) {
    const angle = rng() * Math.PI * 2;
    const dist  = this.worldRadius * (0.25 + rng() * 0.55);
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: 0, vy: 0,
      angle: rng() * Math.PI * 2,
      health: 3,
      shootTimer: rng() * SHOOT_CD,
      patrolAngle: rng() * Math.PI * 2,
      patrolTimer: 3 + rng() * 5,
      state: 'patrol',
      credits: 30 + Math.floor(rng() * 50),
      alive: true,
      hitFlash: 0,
      engineGlow: 0,
    };
  }

  update(dt, ship, bullets) {
    for (const p of this.pirates) {
      if (!p.alive) continue;
      this._ai(p, dt, ship, bullets);
    }

    // Player bullets hitting pirates
    for (let bi = bullets.bullets.length - 1; bi >= 0; bi--) {
      const b = bullets.bullets[bi];
      if (!b.fromPlayer) continue;
      for (const p of this.pirates) {
        if (!p.alive) continue;
        const dx = b.x - p.x, dy = b.y - p.y;
        if (dx * dx + dy * dy < 20 * 20) {
          p.health--;
          p.hitFlash = 0.25;
          bullets.bullets.splice(bi, 1);
          if (p.health <= 0) {
            p.alive = false;
            ship.credits += p.credits;
          }
          break;
        }
      }
    }
  }

  _ai(p, dt, ship, bullets) {
    const dx   = ship.x - p.x, dy = ship.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    p.patrolTimer -= dt;
    p.shootTimer  -= dt;
    p.engineGlow   = Math.random();
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);

    if (dist < CHASE_RANGE)             p.state = 'chase';
    else if (dist > CHASE_RANGE * 1.5)  p.state = 'patrol';

    if (p.state === 'chase') {
      const target = Math.atan2(dy, dx);
      let da = target - p.angle;
      while (da >  Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      p.angle += Math.sign(da) * Math.min(Math.abs(da), TURN_RATE * dt);

      const throttle = Math.max(0, Math.min(1, (dist - 80) / 200));
      p.vx += Math.cos(p.angle) * PIRATE_THRUST * throttle * dt;
      p.vy += Math.sin(p.angle) * PIRATE_THRUST * throttle * dt;

      if (dist < SHOOT_RANGE && Math.abs(da) < SHOOT_ALIGN && p.shootTimer <= 0) {
        bullets.fire(p.x, p.y, p.angle, BULLET_SPEED, false);
        p.shootTimer = SHOOT_CD;
      }
    } else {
      if (p.patrolTimer <= 0) {
        p.patrolAngle += (Math.random() - 0.5) * 1.5;
        p.patrolTimer  = 3 + Math.random() * 5;
      }
      let da = p.patrolAngle - p.angle;
      while (da >  Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      p.angle += Math.sign(da) * Math.min(Math.abs(da), 1.6 * dt);
      p.vx += Math.cos(p.angle) * PIRATE_THRUST * 0.45 * dt;
      p.vy += Math.sin(p.angle) * PIRATE_THRUST * 0.45 * dt;
    }

    p.vx *= Math.pow(PIRATE_DRAG, dt * 60);
    p.vy *= Math.pow(PIRATE_DRAG, dt * 60);
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (spd > PIRATE_MAX_SPD) { p.vx = p.vx / spd * PIRATE_MAX_SPD; p.vy = p.vy / spd * PIRATE_MAX_SPD; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  draw(ctx) {
    for (const p of this.pirates) {
      if (p.alive) this._draw(ctx, p);
    }
  }

  _draw(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2);

    if (p.state === 'chase') {
      const fl = 9 + p.engineGlow * 8;
      const g = ctx.createLinearGradient(0, 8, 0, 8 + fl);
      g.addColorStop(0, 'rgba(255,130,30,0.85)');
      g.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-3.5, 9); ctx.lineTo(3.5, 9); ctx.lineTo(0, 9 + fl);
      ctx.closePath();
      ctx.fill();
    }

    const ht = p.hitFlash / 0.25;
    ctx.fillStyle   = ht > 0 ? `rgb(${Math.round(40 + 200 * ht)},10,10)` : '#2a0e0e';
    ctx.strokeStyle = ht > 0 ? 'rgba(255,60,40,0.9)' : 'rgba(200,50,50,0.85)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(11, 12); ctx.lineTo(5, 7); ctx.lineTo(0, 10);
    ctx.lineTo(-5, 7);  ctx.lineTo(-11, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(255,${Math.round(50 + 50 * (1 - ht))},50,0.7)`;
    ctx.beginPath();
    ctx.ellipse(0, -3, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label + health pips drawn in world space (no transform)
    ctx.fillStyle = p.state === 'chase' ? 'rgba(255,80,60,0.9)' : 'rgba(180,60,60,0.6)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HOSTILE', p.x, p.y - 30);

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < p.health ? '#ff3030' : 'rgba(60,20,20,0.5)';
      ctx.beginPath();
      ctx.arc(p.x - 8 + i * 8, p.y - 38, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
