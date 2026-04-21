import { lerp } from './utils.js';

const SMOOTHING = 8; // higher = snappier follow

export class Camera {
  constructor(target) {
    this.target = target;
    this.x = target.x;
    this.y = target.y;
  }

  update(dt, canvas) {
    // Lead the camera slightly in the direction of travel
    const lead = 60;
    const spd = this.target.speed;
    const leadX = spd > 10 ? (this.target.vx / spd) * lead : 0;
    const leadY = spd > 10 ? (this.target.vy / spd) * lead : 0;

    const targetX = this.target.x + leadX;
    const targetY = this.target.y + leadY;

    const t = 1 - Math.pow(1 - Math.min(SMOOTHING * dt, 0.99), 1);
    this.x = lerp(this.x, targetX, t);
    this.y = lerp(this.y, targetY, t);
  }
}
