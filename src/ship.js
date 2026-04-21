const THRUST        = 320;   // px/s²
const BOOST_THRUST  = 900;   // px/s² while boosting
const ROTATE_SPEED  = 2.8;   // rad/s
const DRAG          = 0.985;
const MAX_SPEED     = 420;   // px/s normal cap
const MAX_BOOST_SPD = 950;   // px/s during boost
const BOOST_DRAIN   = 1 / 2.5; // depletes in 2.5s of continuous use
const BOOST_REGEN   = 1 / 6.0; // fully recharges in 6s from empty

export class Ship {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // pointing up
    this.thrusting  = false;
    this.boosting   = false;
    this.boostCharge = 1.0;    // 0–1, starts full
    this.engineFlicker = 0;

    // Orbit state
    this.orbiting     = false;
    this.orbitTarget  = null;
    this.orbitRadius  = 0;
    this.orbitAngle   = 0;
    this.orbitSpeed   = 0;
  }

  enterOrbit(planet) {
    const dx = this.x - planet.x;
    const dy = this.y - planet.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    this.orbiting    = true;
    this.orbitTarget = planet;
    this.orbitRadius = Math.max(planet.radius + 65, d);
    this.orbitAngle  = Math.atan2(dy, dx);
    this.orbitSpeed  = 80 / this.orbitRadius; // rad/s (Kepler-ish)
    this.vx = 0;
    this.vy = 0;
  }

  exitOrbit() {
    if (!this.orbiting) return;
    // Kick off with tangential velocity
    const linSpd = Math.min(this.orbitSpeed * this.orbitRadius, 280);
    this.vx = -Math.sin(this.orbitAngle) * linSpd;
    this.vy =  Math.cos(this.orbitAngle) * linSpd;
    this.orbiting    = false;
    this.orbitTarget = null;
  }

  update(dt, keys) {
    // --- Orbit mode ---
    if (this.orbiting && this.orbitTarget) {
      const fwd  = keys['ArrowUp']   || keys['KeyW'];
      const back = keys['ArrowDown'] || keys['KeyS'];
      if (fwd || back) {
        this.exitOrbit(); // thrust breaks orbit, fall through
      } else {
        this.orbitAngle += this.orbitSpeed * dt;
        this.x = this.orbitTarget.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = this.orbitTarget.y + Math.sin(this.orbitAngle) * this.orbitRadius;
        this.angle = this.orbitAngle + Math.PI / 2;
        this.thrusting = false;
        this.boosting  = false;
        this.engineFlicker = 0;
        return;
      }
    }

    // --- Normal flight ---
    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const fwd   = keys['ArrowUp']    || keys['KeyW'];
    const back  = keys['ArrowDown']  || keys['KeyS'];
    const boost = (keys['ShiftLeft'] || keys['ShiftRight']) && this.boostCharge > 0;

    if (left)  this.angle -= ROTATE_SPEED * dt;
    if (right) this.angle += ROTATE_SPEED * dt;

    this.thrusting = false;
    this.boosting  = false;

    if (boost) {
      this.vx += Math.cos(this.angle) * BOOST_THRUST * dt;
      this.vy += Math.sin(this.angle) * BOOST_THRUST * dt;
      this.boostCharge = Math.max(0, this.boostCharge - BOOST_DRAIN * dt);
      this.boosting  = true;
      this.thrusting = true;
    } else {
      if (this.boostCharge < 1) {
        this.boostCharge = Math.min(1, this.boostCharge + BOOST_REGEN * dt);
      }
      if (fwd) {
        this.vx += Math.cos(this.angle) * THRUST * dt;
        this.vy += Math.sin(this.angle) * THRUST * dt;
        this.thrusting = true;
      }
      if (back) {
        this.vx -= Math.cos(this.angle) * THRUST * 0.5 * dt;
        this.vy -= Math.sin(this.angle) * THRUST * 0.5 * dt;
      }
    }

    // Drag
    this.vx *= Math.pow(DRAG, dt * 60);
    this.vy *= Math.pow(DRAG, dt * 60);

    // Speed cap (higher during boost)
    const cap = this.boosting ? MAX_BOOST_SPD : MAX_SPEED;
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > cap) {
      this.vx = (this.vx / spd) * cap;
      this.vy = (this.vy / spd) * cap;
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
      const isBoost  = this.boosting;
      const flameLen = isBoost ? 30 + this.engineFlicker * 18 : 14 + this.engineFlicker * 10;
      const flameW   = isBoost ? 7 : 4;
      const grad = ctx.createLinearGradient(0, 8, 0, 8 + flameLen);
      if (isBoost) {
        grad.addColorStop(0,   'rgba(200,230,255,0.98)');
        grad.addColorStop(0.3, 'rgba(100,180,255,0.85)');
        grad.addColorStop(0.7, 'rgba(60,100,255,0.5)');
        grad.addColorStop(1,   'rgba(20,40,220,0)');
      } else {
        grad.addColorStop(0,   'rgba(255,200,60,0.95)');
        grad.addColorStop(0.4, 'rgba(255,100,20,0.7)');
        grad.addColorStop(1,   'rgba(255,50,0,0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-flameW, 10);
      ctx.lineTo(flameW, 10);
      ctx.lineTo(0, 10 + flameLen);
      ctx.closePath();
      ctx.fill();
    }

    // Hull
    ctx.strokeStyle = '#a0d8ef';
    ctx.fillStyle   = '#1a2a3a';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 10);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 9);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = 'rgba(120,200,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, -4, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow
    ctx.fillStyle = this.boosting
      ? 'rgba(100,180,255,0.95)'
      : this.thrusting
        ? 'rgba(255,160,40,0.9)'
        : 'rgba(60,100,180,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
