import { clamp } from './utils.js';

const THRUST       = 320;   // px/s²
const ROTATE_SPEED = 2.8;   // rad/s
const DRAG         = 0.985; // velocity multiplier per frame (inertia feel)
const MAX_SPEED    = 420;   // px/s

export class Ship {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // pointing up
    this.thrusting = false;
    this.engineFlicker = 0;
  }

  update(dt, keys) {
    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const fwd   = keys['ArrowUp']    || keys['KeyW'];
    const back  = keys['ArrowDown']  || keys['KeyS'];

    if (left)  this.angle -= ROTATE_SPEED * dt;
    if (right) this.angle += ROTATE_SPEED * dt;

    this.thrusting = false;
    if (fwd) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
      this.thrusting = true;
    }
    if (back) {
      this.vx -= Math.cos(this.angle) * THRUST * 0.5 * dt;
      this.vy -= Math.sin(this.angle) * THRUST * 0.5 * dt;
    }

    // Drag (space friction for playability)
    this.vx *= Math.pow(DRAG, dt * 60);
    this.vy *= Math.pow(DRAG, dt * 60);

    // Speed cap
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > MAX_SPEED) {
      this.vx = (this.vx / spd) * MAX_SPEED;
      this.vy = (this.vy / spd) * MAX_SPEED;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.engineFlicker = Math.random();
  }

  get speed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Engine flame
    if (this.thrusting) {
      const flameLen = 14 + this.engineFlicker * 10;
      const grad = ctx.createLinearGradient(0, 8, 0, 8 + flameLen);
      grad.addColorStop(0, 'rgba(255,200,60,0.95)');
      grad.addColorStop(0.4, 'rgba(255,100,20,0.7)');
      grad.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(4, 10);
      ctx.lineTo(0, 10 + flameLen);
      ctx.closePath();
      ctx.fill();
    }

    // Ship body (sleek triangle with details)
    ctx.strokeStyle = '#a0d8ef';
    ctx.fillStyle   = '#1a2a3a';
    ctx.lineWidth   = 1.5;

    // Main hull
    ctx.beginPath();
    ctx.moveTo(0, -16);        // nose
    ctx.lineTo(10, 10);        // right wing tip
    ctx.lineTo(6, 6);          // right wing inner
    ctx.lineTo(0, 9);          // center bottom
    ctx.lineTo(-6, 6);         // left wing inner
    ctx.lineTo(-10, 10);       // left wing tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = 'rgba(120,200,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, -4, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow
    ctx.fillStyle = this.thrusting
      ? 'rgba(255,160,40,0.9)'
      : 'rgba(60,100,180,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
