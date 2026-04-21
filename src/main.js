import { Starfield } from './starfield.js';
import { Ship } from './ship.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { HUD } from './hud.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// Input state
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

// Game objects
const world     = new World(42);          // seed 42
const ship      = new Ship(0, 0);
const camera    = new Camera(ship);
const starfield = new Starfield(42);
const hud       = new HUD();

let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  // Update
  ship.update(dt, keys);
  camera.update(dt, canvas);

  // Clear
  ctx.fillStyle = '#00000f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw starfield (screen-space, parallax offset from camera)
  starfield.draw(ctx, canvas, camera);

  // World-space drawing
  ctx.save();
  ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

  world.draw(ctx, camera, canvas);
  ship.draw(ctx);

  ctx.restore();

  // HUD (screen-space)
  hud.draw(ctx, canvas, ship, camera, world);

  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
