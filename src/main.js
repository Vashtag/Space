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

// Input: held keys + one-shot just-pressed set
const keys = {};
const keysJustPressed = new Set();
window.addEventListener('keydown', e => {
  if (!keys[e.code]) keysJustPressed.add(e.code);
  keys[e.code] = true;
  e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Game objects
const world     = new World(42);
const spawn     = world.spawnPoint;
const ship      = new Ship(spawn.x, spawn.y);
const camera    = new Camera(ship);
const starfield = new Starfield(42);
const hud       = new HUD();

const ORBIT_RANGE = 185; // px from planet edge to trigger prompt

let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // --- Proximity detection ---
  let nearPlanet = null;
  if (!ship.orbiting) {
    for (const p of world.planets) {
      const dx = ship.x - p.x, dy = ship.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < p.radius + ORBIT_RANGE) {
        nearPlanet = p;
        break;
      }
    }
  }

  // --- E key: enter/exit orbit ---
  if (keysJustPressed.has('KeyE')) {
    if (ship.orbiting) {
      ship.exitOrbit();
    } else if (nearPlanet) {
      ship.enterOrbit(nearPlanet);
    }
  }

  // --- Update ---
  ship.update(dt, keys);
  camera.update(dt, canvas);

  // --- Draw ---
  ctx.fillStyle = '#00000f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  starfield.draw(ctx, canvas, camera);

  ctx.save();
  ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

  world.draw(ctx, camera, canvas);

  // Orbit prompt in world-space (floats above planet)
  const promptTarget = ship.orbiting ? ship.orbitTarget : nearPlanet;
  if (promptTarget) {
    const label = ship.orbiting ? '[E]  Exit Orbit' : '[E]  Enter Orbit';
    const py = promptTarget.y - promptTarget.radius - 32;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    // Soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(label, promptTarget.x + 1, py + 1);
    ctx.fillStyle = ship.orbiting ? 'rgba(120,255,200,0.95)' : 'rgba(200,255,140,0.9)';
    ctx.fillText(label, promptTarget.x, py);
  }

  ship.draw(ctx);

  ctx.restore();

  hud.draw(ctx, canvas, ship, camera, world);

  // Clear one-shot keys at end of frame
  keysJustPressed.clear();

  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
