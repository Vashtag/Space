const MM_SIZE   = 160;  // minimap square size
const MM_PAD    = 16;   // padding from corner
const MM_SCALE  = MM_SIZE / 2 / 20000; // world radius → minimap

export class HUD {
  draw(ctx, canvas, ship, camera, world) {
    this._drawSpeedometer(ctx, canvas, ship);
    this._drawCoords(ctx, canvas, ship);
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

  _drawSpeedometer(ctx, canvas, ship) {
    const spd    = Math.round(ship.speed);
    const maxSpd = 420;
    const barW = 130, barH = 7;
    const bx = 20;
    const bySPD   = canvas.height - 32;
    const byBoost = canvas.height - 58;

    // Panel background (covers both bars)
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(bx - 4, byBoost - 18, barW + 8, 54);
    ctx.strokeStyle = 'rgba(80,160,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 4, byBoost - 18, barW + 8, 54);

    // — BOOST bar —
    ctx.fillStyle = 'rgba(40,60,140,0.4)';
    ctx.fillRect(bx, byBoost, barW, barH);
    const boostFill  = ship.boostCharge * barW;
    const boostColor = ship.boostCharge < 0.15
      ? '#ff3010'
      : ship.boosting ? '#80d0ff' : '#4070e0';
    ctx.fillStyle = boostColor;
    ctx.fillRect(bx, byBoost, boostFill, barH);
    ctx.fillStyle = '#8090c0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const pct = Math.round(ship.boostCharge * 100);
    const boostLabel = ship.boostCharge < 0.05
      ? 'BOOST  RECHARGING'
      : `BOOST ${pct.toString().padStart(3)}%  [SHIFT]`;
    ctx.fillText(boostLabel, bx, byBoost - 5);

    // — SPEED bar —
    ctx.fillStyle = 'rgba(60,100,180,0.4)';
    ctx.fillRect(bx, bySPD, barW, barH);
    const fill     = (Math.min(spd, maxSpd) / maxSpd) * barW;
    const barColor = spd > maxSpd * 0.8 ? '#ff6040' : '#40c8ff';
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, bySPD, fill, barH);
    ctx.fillStyle = '#aacfff';
    ctx.font = '10px monospace';
    ctx.fillText(`SPD  ${spd.toString().padStart(3)}`, bx, bySPD - 4);
  }

  _drawCoords(ctx, canvas, ship) {
    const bx = 20, by = canvas.height - 82;
    ctx.fillStyle = 'rgba(140,180,255,0.55)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `X ${Math.round(ship.x).toString().padStart(6)}  Y ${Math.round(ship.y).toString().padStart(6)}`,
      bx, by
    );
  }

  _drawMinimap(ctx, canvas, ship, world) {
    const mx = canvas.width  - MM_SIZE - MM_PAD;
    const my = canvas.height - MM_SIZE - MM_PAD;
    const cx = mx + MM_SIZE / 2;
    const cy = my + MM_SIZE / 2;

    // Background
    ctx.fillStyle = 'rgba(0,5,20,0.75)';
    ctx.strokeStyle = 'rgba(60,100,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(mx, my, MM_SIZE, MM_SIZE);
    ctx.fill();
    ctx.stroke();

    // World boundary circle
    ctx.strokeStyle = 'rgba(60,100,200,0.3)';
    ctx.lineWidth = 1;
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

    // Stations (small squares)
    for (const s of world.stations) {
      const sx = cx + s.x * MM_SCALE;
      const sy = cy + s.y * MM_SCALE;
      ctx.fillStyle = s.accentColor;
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx - 3, sy - 3, 6, 6);
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

    // Label
    ctx.fillStyle = 'rgba(100,140,220,0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NAVIGATION', cx, my + MM_SIZE + 12);
  }

  _drawControls(ctx, canvas) {
    const hints = ['W/↑ Thrust', 'S/↓ Brake', 'A/← D/→ Rotate', 'Shift Boost', 'E Orbit'];
    const bx = canvas.width / 2;
    const by = canvas.height - 14;
    ctx.fillStyle = 'rgba(80,100,160,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hints.join('   ·   '), bx, by);
  }
}
