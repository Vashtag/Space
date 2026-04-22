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
let dockedAt     = null;
let dockMenuIdx  = 0;
let dockMenu     = [];
let dockMessage  = '';
let dockMsgTimer = 0;

// Planet scanning
const SCAN_TIME  = 3.0;
let scanTarget   = null;
let scanProgress = 0;

const RESOURCES = {
  rocky:    ['Iron Ore', 'Silicates', 'Rare Earth'],
  oceanic:  ['Water Ice', 'Organic Compounds', 'Hydrogen'],
  gas:      ['Helium-3', 'Ammonia', 'Methane'],
  frozen:   ['Water Ice', 'Carbon', 'Nitrogen'],
  volcanic: ['Iron', 'Sulfur', 'Titanium'],
  jungle:   ['Organic Compounds', 'Oxygen', 'Biomass'],
  desert:   ['Silicon', 'Iron Oxide', 'Rare Earth'],
};
const DANGERS = ['Safe', 'Moderate', 'Hostile', 'Extreme'];

// ── Dock menu helpers ─────────────────────────────────────────────────────────

function cargoTotal() {
  return Object.values(ship.cargo).reduce((a, b) => a + b, 0);
}

function showDockMsg(msg) { dockMessage = msg; dockMsgTimer = 1.8; }

function buildDockMenu(station) {
  const items = [];

  items.push({
    label: 'REFUEL + REPAIR', note: 'FREE',
    action() { ship.boostCharge = 1.0; ship.hull = ship.maxHull; showDockMsg('Refuelled & repaired.'); },
  });

  items.push({
    label: 'BUY AMMO  ×10', note: '50c',
    disabled: ship.credits < 50,
    action() {
      if (ship.credits < 50) { showDockMsg('Not enough credits!'); return; }
      ship.credits -= 50; ship.ammo += 10; showDockMsg('+10 ammo');
    },
  });

  // Station sells → player buys
  for (const item of station.sells) {
    items.push({
      label: `BUY ${item.name}`, note: `${item.price}c`,
      disabled: ship.credits < item.price || cargoTotal() >= ship.CARGO_MAX,
      action() {
        if (ship.credits < item.price) { showDockMsg('Not enough credits!'); return; }
        if (cargoTotal() >= ship.CARGO_MAX) { showDockMsg('Cargo hold full!'); return; }
        ship.credits -= item.price; ship.cargo[item.key]++;
        showDockMsg(`Bought ${item.name}.`);
      },
    });
  }

  // Station buys → player sells
  for (const item of station.buys) {
    const qty = ship.cargo[item.key] || 0;
    items.push({
      label: `SELL ${item.name}`,
      note: qty > 0 ? `+${item.price}c  ×${qty}` : `+${item.price}c`,
      disabled: qty === 0,
      action() {
        if ((ship.cargo[item.key] || 0) <= 0) { showDockMsg('Nothing to sell!'); return; }
        ship.credits += item.price; ship.cargo[item.key]--;
        showDockMsg(`Sold ${item.name}  +${item.price}c`);
      },
    });
  }

  items.push({
    label: 'SAVE', note: '',
    action() {
      try {
        localStorage.setItem('spaceSave', JSON.stringify({
          x: Math.round(ship.x), y: Math.round(ship.y),
        }));
      } catch (_) {}
      showDockMsg('Game saved.');
    },
  });

  items.push({ label: 'LEAVE', note: '', action() { dockedAt = null; } });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────

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
    dockMenu = buildDockMenu(dockedAt);
    dockMenuIdx = Math.min(dockMenuIdx, dockMenu.length - 1);
    dockMsgTimer = Math.max(0, dockMsgTimer - dt);
    if (dockMsgTimer <= 0) dockMessage = '';

    if (keysJustPressed.has('KeyW') || keysJustPressed.has('ArrowUp'))
      dockMenuIdx = (dockMenuIdx - 1 + dockMenu.length) % dockMenu.length;
    if (keysJustPressed.has('KeyS') || keysJustPressed.has('ArrowDown'))
      dockMenuIdx = (dockMenuIdx + 1) % dockMenu.length;
    if (keysJustPressed.has('KeyE') || keysJustPressed.has('Enter'))
      dockMenu[dockMenuIdx]?.action?.();
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
        dockMenu = buildDockMenu(nearStation);
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

    // Shoot (Space — held, rate-limited inside ship.shoot)
    if (keys['Space'] && !inspecting) ship.shoot(world.bullets);
  }

  // --- Planet scanning (hold F) ---
  const scanning = (keys['KeyF'] || keys['F']) && nearPlanet && !dockedAt && !ship.orbiting;
  if (scanning) {
    if (scanTarget !== nearPlanet) { scanTarget = nearPlanet; scanProgress = 0; }
    scanProgress = Math.min(1, scanProgress + dt / SCAN_TIME);
    if (scanProgress >= 1 && !nearPlanet.scanData) {
      const seed = Math.abs(Math.round(nearPlanet.x * 7 + nearPlanet.y * 13)) % 4;
      const res  = RESOURCES[nearPlanet.type] || RESOURCES.rocky;
      nearPlanet.scanData = {
        resources: res.slice(0, 2 + (seed % 2)),
        danger:    DANGERS[seed],
        temp:      Math.round(-200 + (nearPlanet.orbitRadius / 20000) * 600) + '°C',
      };
    }
  } else {
    if (scanTarget && scanTarget !== nearPlanet) { scanTarget = null; scanProgress = 0; }
  }

  // --- Update ---
  world.update(dt, ship);
  if (!dockedAt) {
    ship.update(dt, keys);
    world.asteroids.checkCollisions(ship);
    world.anomalies.applyGravity(ship, dt);

    // Pirate bullets hitting player
    for (let bi = world.bullets.bullets.length - 1; bi >= 0; bi--) {
      const b = world.bullets.bullets[bi];
      if (b.fromPlayer) continue;
      const dx = b.x - ship.x, dy = b.y - ship.y;
      if (dx * dx + dy * dy < 22 * 22) {
        ship.hull = Math.max(0, ship.hull - 15);
        ship.hitFlash = 0.35;
        world.bullets.bullets.splice(bi, 1);
        if (ship.hull <= 0) {
          const st = world.stations[0];
          ship.x = st.x + 150; ship.y = st.y;
          ship.vx = 0; ship.vy = 0;
          ship.hull = Math.floor(ship.maxHull / 2);
          ship.credits = Math.max(0, Math.floor(ship.credits / 2));
          camera.x = ship.x; camera.y = ship.y;
        }
        break;
      }
    }
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

  // Scan ring (world-space, around planet)
  if (scanTarget && scanProgress < 1) {
    const p = scanTarget;
    const ringR = p.radius + 22;
    ctx.strokeStyle = 'rgba(80,255,180,0.7)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, -Math.PI / 2, -Math.PI / 2 + scanProgress * Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,255,180,0.2)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle  = 'rgba(80,255,180,0.9)';
    ctx.font       = '11px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(`SCANNING  ${Math.round(scanProgress * 100)}%`, p.x, p.y - p.radius - 18);
  }
  if (nearPlanet && !nearPlanet.scanData && !(scanTarget === nearPlanet && scanProgress > 0)) {
    ctx.fillStyle = 'rgba(80,200,140,0.7)';
    ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('[F] Scan', nearPlanet.x, nearPlanet.y + nearPlanet.radius + 32);
  }

  ship.draw(ctx);
  ctx.restore();

  hud.draw(ctx, canvas, ship, camera, world);

  if (inspecting)  drawDerelictPanel(ctx, canvas, inspecting);
  if (dockedAt)    drawDockMenu(ctx, canvas, dockedAt, dockMenuIdx, dockMenu, dockMessage);
  if (nearPlanet && nearPlanet.scanData) drawScanResults(ctx, canvas, nearPlanet);

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

function drawDockMenu(ctx, canvas, station, idx, menu, message) {
  const ITEM_H = 34;
  const pw     = 380;
  const ph     = 52 + menu.length * ITEM_H + (message ? 26 : 4) + 24;
  const px     = (canvas.width  - pw) / 2;
  const py     = (canvas.height - ph) / 2;

  // Derive rgba from hex accent color
  const hex = station.accentColor;
  const n   = parseInt(hex.slice(1), 16);
  const ar  = (n >> 16) & 0xff, ag = (n >> 8) & 0xff, ab = n & 0xff;
  const accent = `rgba(${ar},${ag},${ab},`;

  ctx.fillStyle   = 'rgba(4,10,20,0.93)';
  ctx.strokeStyle = hex;
  ctx.lineWidth   = 1.5;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);

  // Header
  ctx.fillStyle = hex;
  ctx.font      = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`⊞  DOCKED — ${station.name}`, canvas.width / 2, py + 26);

  ctx.strokeStyle = `${accent}0.25)`;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(px + 16, py + 36); ctx.lineTo(px + pw - 16, py + 36); ctx.stroke();

  // Cargo indicator
  const cargoUsed = Object.values(ship.cargo).reduce((a, b) => a + b, 0);
  ctx.fillStyle = 'rgba(140,160,180,0.55)';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Credits: ${ship.credits}c   Cargo: ${cargoUsed}/${ship.CARGO_MAX}   Ammo: ${ship.ammo}`, px + pw - 14, py + 26);

  // Menu items
  menu.forEach((item, i) => {
    const iy     = py + 48 + i * ITEM_H;
    const active = i === idx;

    if (active) {
      ctx.fillStyle   = `${accent}0.12)`;
      ctx.fillRect(px + 10, iy - 13, pw - 20, ITEM_H - 2);
      ctx.strokeStyle = `${accent}0.7)`;
      ctx.lineWidth   = 1;
      ctx.strokeRect(px + 10, iy - 13, pw - 20, ITEM_H - 2);
    }

    ctx.fillStyle = item.disabled
      ? 'rgba(70,80,90,0.55)'
      : active ? hex : 'rgba(155,175,200,0.7)';
    ctx.font      = active && !item.disabled ? 'bold 13px monospace' : '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(active ? `▶  ${item.label}` : `   ${item.label}`, px + 14, iy);

    if (item.note) {
      ctx.textAlign = 'right';
      ctx.fillStyle = item.disabled ? 'rgba(70,80,90,0.55)' : active ? hex : 'rgba(130,155,175,0.65)';
      ctx.fillText(item.note, px + pw - 14, iy);
    }
  });

  // Status message
  if (message) {
    const my = py + 48 + menu.length * ITEM_H + 6;
    ctx.fillStyle = 'rgba(120,255,180,0.85)';
    ctx.font      = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, my);
  }

  // Footer
  ctx.fillStyle = 'rgba(90,115,145,0.55)';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('W/S navigate   ·   E select   ·   Esc leave', canvas.width / 2, py + ph - 10);
}

function drawScanResults(ctx, canvas, p) {
  const d   = p.scanData;
  const pw  = 240, ph = 110;
  const px  = canvas.width - pw - 200, py = 16;
  ctx.fillStyle   = 'rgba(4,12,8,0.88)';
  ctx.strokeStyle = 'rgba(80,220,150,0.5)';
  ctx.lineWidth   = 1;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(80,220,150,0.9)'; ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`◉  ${p.name} — SCANNED`, px + 12, py + 20);
  ctx.fillStyle = 'rgba(140,200,170,0.75)'; ctx.font = '11px monospace';
  ctx.fillText(`Type:       ${p.type}`,            px + 12, py + 40);
  ctx.fillText(`Temp:       ${d.temp}`,             px + 12, py + 56);
  ctx.fillText(`Danger:     ${d.danger}`,           px + 12, py + 72);
  ctx.fillText(`Resources:  ${d.resources.join(', ')}`, px + 12, py + 88);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
