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
const DOCK_RANGE      = 120;

// Game state
let nearPlanet   = null;
let nearDerelict = null;
let nearWormhole = null;
let nearStation  = null;
let inspecting   = null;
let dockedAt     = null;   // station object while docked
let dockMenuIdx  = 0;
const DOCK_MENU  = ['REFUEL', 'SAVE', 'LEAVE'];

let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  // --- Proximity (skip most when docked) ---
  if (!dockedAt) {
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

    nearStation = null;
    for (const s of world.stations) {
      const dx = ship.x - s.x, dy = ship.y - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < DOCK_RANGE) { nearStation = s; break; }
    }
  }

  // --- Input ---
  if (dockedAt) {
    // Menu navigation
    if (keysJustPressed.has('KeyW') || keysJustPressed.has('ArrowUp'))
      dockMenuIdx = (dockMenuIdx - 1 + DOCK_MENU.length) % DOCK_MENU.length;
    if (keysJustPressed.has('KeyS') || keysJustPressed.has('ArrowDown'))
      dockMenuIdx = (dockMenuIdx + 1) % DOCK_MENU.length;
    if (keysJustPressed.has('KeyE') || keysJustPressed.has('Enter')) {
      const choice = DOCK_MENU[dockMenuIdx];
      if (choice === 'REFUEL') {
        ship.boostCharge = 1.0;
      } else if (choice === 'SAVE') {
        try {
          localStorage.setItem('spaceSave', JSON.stringify({
            x: Math.round(ship.x), y: Math.round(ship.y),
          }));
        } catch (_) {}
      } else if (choice === 'LEAVE') {
        dockedAt = null;
      }
    }
    if (keysJustPressed.has('Escape')) dockedAt = null;
  } else {
    // E key priority
    if (keysJustPressed.has('KeyE')) {
      if (inspecting) {
        inspecting = null;
      } else if (ship.orbiting) {
        ship.exitOrbit();
      } else if (nearStation) {
        ship.vx = 0; ship.vy = 0;
        dockedAt = nearStation;
        dockMenuIdx = 0;
      } else if (nearWormhole) {
        const partner = world.anomalies.wormholes[nearWormhole.partnerId];
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
  }

  // --- Update ---
  world.update(dt);
  if (!dockedAt) {
    ship.update(dt, keys);
    world.asteroids.checkCollisions(ship);
    world.anomalies.applyGravity(ship, dt);
  }
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
  if (orbitTarget && !dockedAt) {
    const label = ship.orbiting ? '[E]  Exit Orbit' : '[E]  Enter Orbit';
    const py = orbitTarget.y - orbitTarget.radius - 32;
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(label, orbitTarget.x + 1, py + 1);
    ctx.fillStyle = ship.orbiting ? 'rgba(120,255,200,0.95)' : 'rgba(200,255,140,0.9)';
    ctx.fillText(label, orbitTarget.x, py);
  }

  // Station dock prompt
  if (nearStation && !dockedAt) {
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('[E]  Dock', nearStation.x + 1, nearStation.y - 108);
    ctx.fillStyle = 'rgba(100,220,255,0.95)';
    ctx.fillText('[E]  Dock', nearStation.x, nearStation.y - 109);
  }

  // Wormhole prompt
  if (nearWormhole) {
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('[E]  Enter Wormhole', nearWormhole.x + 1, nearWormhole.y - 37);
    ctx.fillStyle = 'rgba(200,140,255,0.95)';
    ctx.fillText('[E]  Enter Wormhole', nearWormhole.x, nearWormhole.y - 38);
  }

  // Derelict inspect prompt
  if (nearDerelict && !inspecting) {
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('[E]  Inspect', nearDerelict.x + 1, nearDerelict.y - 47);
    ctx.fillStyle = 'rgba(180,210,255,0.9)';
    ctx.fillText('[E]  Inspect', nearDerelict.x, nearDerelict.y - 48);
  }

  ship.draw(ctx);
  ctx.restore();

  hud.draw(ctx, canvas, ship, camera, world);

  if (inspecting)  drawDerelictPanel(ctx, canvas, inspecting);
  if (dockedAt)    drawDockMenu(ctx, canvas, dockedAt, dockMenuIdx);

  mobile.draw(ctx);
  keysJustPressed.clear();
  requestAnimationFrame(loop);
}

function drawDerelictPanel(ctx, canvas, d) {
  const pw = 420, ph = 150;
  const px = (canvas.width - pw) / 2, py = (canvas.height - ph) / 2;
  ctx.fillStyle = 'rgba(5,10,18,0.88)'; ctx.strokeStyle = 'rgba(140,170,200,0.5)';
  ctx.lineWidth = 1; ctx.fillRect(px, py, pw, ph); ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(180,210,255,0.9)'; ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left'; ctx.fillText(`— ${d.name} —`, px + 18, py + 26);
  ctx.fillStyle = 'rgba(130,160,190,0.75)'; ctx.font = '11px monospace';
  const words = d.lore.split(' '); let line = '', lineY = py + 52;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (test.length > 52) { ctx.fillText(line, px + 18, lineY); line = word; lineY += 18; }
    else line = test;
  }
  if (line) ctx.fillText(line, px + 18, lineY);
  ctx.fillStyle = 'rgba(100,140,180,0.55)'; ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[E] or [Esc] to close', canvas.width / 2, py + ph - 12);
}

function drawDockMenu(ctx, canvas, station, idx) {
  const pw = 340, ph = 220;
  const px = (canvas.width - pw) / 2, py = (canvas.height - ph) / 2;

  // Panel
  ctx.fillStyle   = 'rgba(4,10,20,0.92)';
  ctx.strokeStyle = station.accentColor;
  ctx.lineWidth   = 1.5;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);

  // Header
  ctx.fillStyle  = station.accentColor;
  ctx.font       = 'bold 13px monospace';
  ctx.textAlign  = 'center';
  ctx.fillText(`⊞  DOCKED — ${station.name}`, canvas.width / 2, py + 28);

  ctx.strokeStyle = station.accentColor.replace(')', ',0.3)').replace('rgb', 'rgba');
  ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(px + 16, py + 40); ctx.lineTo(px + pw - 16, py + 40); ctx.stroke();

  // Menu items
  DOCK_MENU.forEach((item, i) => {
    const iy      = py + 78 + i * 44;
    const active  = i === idx;
    if (active) {
      ctx.fillStyle = `${station.accentColor}22`;
      ctx.fillRect(px + 12, iy - 18, pw - 24, 34);
      ctx.strokeStyle = station.accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 12, iy - 18, pw - 24, 34);
    }
    ctx.fillStyle  = active ? station.accentColor : 'rgba(160,180,200,0.6)';
    ctx.font       = active ? 'bold 14px monospace' : '13px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(active ? `▶  ${item}` : item, canvas.width / 2, iy);
  });

  ctx.fillStyle = 'rgba(100,130,160,0.5)'; ctx.font = '10px monospace';
  ctx.fillText('W/S navigate  ·  E select  ·  Esc leave', canvas.width / 2, py + ph - 14);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
