import { Starfield } from './starfield.js';
import { Ship } from './ship.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { HUD } from './hud.js';
import { MobileControls } from './mobileControls.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const keys = {};
const keysJustPressed = new Set();
window.addEventListener('keydown', e => {
  if (!keys[e.code]) keysJustPressed.add(e.code);
  keys[e.code] = true;
  e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

const world     = new World(42);
const spawn     = world.spawnPoint;
const ship      = new Ship(spawn.x, spawn.y);
const camera    = new Camera(ship);
const starfield = new Starfield(42);
const hud       = new HUD();
const mobile    = new MobileControls(canvas, keys, keysJustPressed);

const ORBIT_RANGE     = 185;
const DERELICT_RANGE  = 220;
const WORMHOLE_RANGE  = 80;

// Game state
let nearPlanet   = null;
let nearDerelict = null;
let nearWormhole = null;
let inspecting   = null;

let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // --- Proximity detection ---
  nearPlanet = null;
  if (!ship.orbiting) {
    for (const p of world.planets) {
      const dx = ship.x - p.x, dy = ship.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < p.radius + ORBIT_RANGE) { nearPlanet = p; break; }
    }
  }

  nearDerelict = null;
  for (const d of world.derelicts.derelicts) {
    const dx = ship.x - d.x, dy = ship.y - d.y;
    if (Math.sqrt(dx * dx + dy * dy) < DERELICT_RANGE) { nearDerelict = d; break; }
  }

  nearWormhole = null;
  for (const w of world.anomalies.wormholes) {
    const dx = ship.x - w.x, dy = ship.y - w.y;
    if (Math.sqrt(dx * dx + dy * dy) < WORMHOLE_RANGE) { nearWormhole = w; break; }
  }

  // --- E key interactions (priority order) ---
  if (keysJustPressed.has('KeyE')) {
    if (inspecting) {
      inspecting = null;
    } else if (ship.orbiting) {
      ship.exitOrbit();
    } else if (nearWormhole) {
      const partner = world.anomalies.wormholes[nearWormhole.partnerId];
      // Offset exit so ship doesn't immediately re-trigger
      const exitAngle = Math.atan2(partner.y, partner.x) + Math.PI;
      ship.x = partner.x + Math.cos(exitAngle) * 100;
      ship.y = partner.y + Math.sin(exitAngle) * 100;
      ship.vx *= 0.3; ship.vy *= 0.3;
      camera.x = ship.x; camera.y = ship.y;
    } else if (nearDerelict) {
      nearDerelict.discovered = true;
      inspecting = nearDerelict;
    } else if (nearPlanet) {
      ship.enterOrbit(nearPlanet);
    }
  }

  if (keysJustPressed.has('Escape')) inspecting = null;

  // --- Update ---
  world.update(dt);
  ship.update(dt, keys);
  world.asteroids.checkCollisions(ship);
  world.anomalies.applyGravity(ship, dt);
  camera.update(dt, canvas);

  // --- Draw ---
  ctx.fillStyle = '#00000f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  starfield.draw(ctx, canvas, camera);

  ctx.save();
  ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

  world.draw(ctx, camera, canvas);

  // Orbit prompt
  const orbitTarget = ship.orbiting ? ship.orbitTarget : nearPlanet;
  if (orbitTarget) {
    const label = ship.orbiting ? '[E]  Exit Orbit' : '[E]  Enter Orbit';
    const py = orbitTarget.y - orbitTarget.radius - 32;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(label, orbitTarget.x + 1, py + 1);
    ctx.fillStyle = ship.orbiting ? 'rgba(120,255,200,0.95)' : 'rgba(200,255,140,0.9)';
    ctx.fillText(label, orbitTarget.x, py);
  }

  // Wormhole enter prompt
  if (nearWormhole) {
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('[E]  Enter Wormhole', nearWormhole.x + 1, nearWormhole.y - 37);
    ctx.fillStyle = 'rgba(200,140,255,0.95)';
    ctx.fillText('[E]  Enter Wormhole', nearWormhole.x, nearWormhole.y - 38);
  }

  // Derelict inspect prompt
  if (nearDerelict && !inspecting) {
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('[E]  Inspect', nearDerelict.x + 1, nearDerelict.y - 47);
    ctx.fillStyle = 'rgba(180,210,255,0.9)';
    ctx.fillText('[E]  Inspect', nearDerelict.x, nearDerelict.y - 48);
  }

  ship.draw(ctx);
  ctx.restore();

  hud.draw(ctx, canvas, ship, camera, world);

  // Derelict info panel (screen-space overlay)
  if (inspecting) drawDerelictPanel(ctx, canvas, inspecting);

  mobile.draw(ctx);
  keysJustPressed.clear();
  requestAnimationFrame(loop);
}

function drawDerelictPanel(ctx, canvas, d) {
  const pw = 420, ph = 150;
  const px = (canvas.width  - pw) / 2;
  const py = (canvas.height - ph) / 2;

  ctx.fillStyle   = 'rgba(5,10,18,0.88)';
  ctx.strokeStyle = 'rgba(140,170,200,0.5)';
  ctx.lineWidth   = 1;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);

  ctx.fillStyle = 'rgba(180,210,255,0.9)';
  ctx.font      = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`— ${d.name} —`, px + 18, py + 26);

  ctx.fillStyle = 'rgba(130,160,190,0.75)';
  ctx.font      = '11px monospace';
  // Wrap lore text at ~55 chars
  const words = d.lore.split(' ');
  let line = '', lineY = py + 52;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (test.length > 52) {
      ctx.fillText(line, px + 18, lineY);
      line = word; lineY += 18;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, px + 18, lineY);

  ctx.fillStyle = 'rgba(100,140,180,0.55)';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[E] or [Esc] to close', canvas.width / 2, py + ph - 12);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
