const MM_SIZE   = 160;
const MM_PAD    = 16;
const MM_SCALE  = MM_SIZE / 2 / 20000;

export class HUD {
  draw(ctx, canvas, ship, camera, world) {
    this._drawStatusPanel(ctx, canvas, ship);
    this._drawMinimap(ctx, canvas, ship, world);
    this._drawControls(ctx, canvas);
    if (ship.orbiting && ship.orbitTarget) {
      this._drawOrbitStatus(ctx, canvas, ship);
    }
  }

  _drawOrbitStatus(ctx, canvas, ship) {
    const label = `⊙  ORBITING  ${ship.orbitTarget.name}`;
    const bx = canvas.width / 2;
    const by = 28;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 110, by - 16, 220, 22);
    ctx.fillStyle = 'rgba(120,255,200,0.85)';
    ctx.fillText(label, bx, by);
  }

  _drawStatusPanel(ctx, canvas, ship) {
    const barW   = 140;
    const barH   = 6;
    const bx     = 20;
    const panelT = canvas.height - 148;
    const panelH = 136;

    // Panel background
    ctx.fillStyle   = 'rgba(0,0,0,0.54)';
    ctx.strokeStyle = 'rgba(80,160,255,0.22)';
    ctx.lineWidth   = 1;
    ctx.fillRect(bx - 4, panelT, barW + 8, panelH);
    ctx.strokeRect(bx - 4, panelT, barW + 8, panelH);

    // ── Credits & Ammo ──
    const cyC = panelT + 14;
    ctx.fillStyle = 'rgba(255,210,80,0.85)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CREDITS  ${ship.credits}c`, bx, cyC);

    const ammoColor = ship.ammo === 0 ? 'rgba(255,80,60,0.85)' : 'rgba(160,220,255,0.85)';
    ctx.fillStyle = ammoColor;
    ctx.fillText(`AMMO  ${ship.ammo}`, bx, cyC + 14);

    // ── Hull bar ──
    const cyHull  = panelT + 46;
    const hullPct = ship.hull / ship.maxHull;
    const hullClr = hullPct > 0.5 ? '#40d080' : hullPct > 0.25 ? '#d0a030' : '#e03020';
    ctx.fillStyle = 'rgba(30,60,30,0.5)';
    ctx.fillRect(bx, cyHull, barW, barH);
    ctx.fillStyle = hullClr;
    ctx.fillRect(bx, cyHull, hullPct * barW, barH);
    ctx.fillStyle = 'rgba(130,190,140,0.8)';
    ctx.font      = '10px monospace';
    ctx.fillText(`HULL  ${Math.round(hullPct * 100)}%`, bx, cyHull - 4);

    // ── Boost bar ──
    const cyBoost = panelT + 74;
    const boostFill  = ship.boostCharge * barW;
    const boostColor = ship.boostCharge < 0.15
      ? '#ff3010'
      : ship.boosting ? '#80d0ff' : '#4070e0';
    ctx.fillStyle = 'rgba(40,60,140,0.4)';
    ctx.fillRect(bx, cyBoost, barW, barH);
    ctx.fillStyle = boostColor;
    ctx.fillRect(bx, cyBoost, boostFill, barH);
    ctx.fillStyle = '#8090c0';
    ctx.font      = '10px monospace';
    const pct        = Math.round(ship.boostCharge * 100);
    const boostLabel = ship.boostCharge < 0.05 ? 'BOOST  RECHARGING' : `BOOST  ${pct}%`;
    ctx.fillText(boostLabel, bx, cyBoost - 4);

    // ── Speed bar ──
    const maxSpd  = 420;
    const spd     = Math.round(ship.speed);
    const cySPD   = panelT + 102;
    const fill     = (Math.min(spd, maxSpd) / maxSpd) * barW;
    const barColor = spd > maxSpd * 0.8 ? '#ff6040' : '#40c8ff';
    ctx.fillStyle = 'rgba(60,100,180,0.4)';
    ctx.fillRect(bx, cySPD, barW, barH);
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, cySPD, fill, barH);
    ctx.fillStyle = '#aacfff';
    ctx.font      = '10px monospace';
    ctx.fillText(`SPD  ${spd}`, bx, cySPD - 4);

    // ── Coords ──
    ctx.fillStyle = 'rgba(140,180,255,0.5)';
    ctx.font      = '10px monospace';
    ctx.fillText(
      `X ${Math.round(ship.x).toString().padStart(6)}  Y ${Math.round(ship.y).toString().padStart(6)}`,
      bx, panelT + panelH - 7
    );
  }

  _drawMinimap(ctx, canvas, ship, world) {
    const mx = canvas.width  - MM_SIZE - MM_PAD;
    const my = canvas.height - MM_SIZE - MM_PAD;
    const cx = mx + MM_SIZE / 2;
    const cy = my + MM_SIZE / 2;

    // Background
    ctx.fillStyle   = 'rgba(0,5,20,0.75)';
    ctx.strokeStyle = 'rgba(60,100,200,0.5)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.rect(mx, my, MM_SIZE, MM_SIZE);
    ctx.fill();
    ctx.stroke();

    // World boundary
    ctx.strokeStyle = 'rgba(60,100,200,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, MM_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Sun
    ctx.fillStyle = '#FFC840';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Planets
    for (const p of world.planets) {
      const px = cx + p.x * MM_SCALE;
      const py = cy + p.y * MM_SCALE;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2, p.radius * MM_SCALE * 1.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // Stations
    for (const s of world.stations) {
      const sx = cx + s.x * MM_SCALE;
      const sy = cy + s.y * MM_SCALE;
      ctx.fillStyle = s.accentColor;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(sx - 3, sy - 3, 6, 6);
    }

    // Pirates (red diamonds)
    for (const p of world.pirates.pirates) {
      if (!p.alive) continue;
      const px = cx + p.x * MM_SCALE;
      const py = cy + p.y * MM_SCALE;
      ctx.fillStyle = p.state === 'chase' ? 'rgba(255,60,40,0.9)' : 'rgba(180,60,60,0.6)';
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }

    // Ship
    const sx = cx + ship.x * MM_SCALE;
    const sy = cy + ship.y * MM_SCALE;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ship.angle + Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(2.5, 3);
    ctx.lineTo(-2.5, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(100,140,220,0.7)';
    ctx.font      = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NAVIGATION', cx, my + MM_SIZE + 12);
  }

  _drawControls(ctx, canvas) {
    const hints = ['W/↑ Thrust', 'A/← D/→ Rotate', 'Shift Boost', 'Space Fire', 'E Interact', 'F Scan'];
    const bx = canvas.width / 2;
    const by = canvas.height - 14;
    ctx.fillStyle = 'rgba(80,100,160,0.5)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hints.join('   ·   '), bx, by);
  }
}
