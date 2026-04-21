const MM_SIZE   = 160;  // minimap square size
const MM_PAD    = 16;   // padding from corner
const MM_SCALE  = MM_SIZE / 2 / 8000; // world radius → minimap

export class HUD {
  draw(ctx, canvas, ship, camera, world) {
    this._drawSpeedometer(ctx, canvas, ship);
    this._drawCoords(ctx, canvas, ship);
    this._drawMinimap(ctx, canvas, ship, world);
    this._drawControls(ctx, canvas);
  }

  _drawSpeedometer(ctx, canvas, ship) {
    const spd = Math.round(ship.speed);
    const maxSpd = 420;
    const barW = 120, barH = 8;
    const bx = 20, by = canvas.height - 44;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx - 4, by - 20, barW + 8, 34);
    ctx.strokeStyle = 'rgba(80,160,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 4, by - 20, barW + 8, 34);

    ctx.fillStyle = 'rgba(60,100,180,0.4)';
    ctx.fillRect(bx, by, barW, barH);

    const fill = (spd / maxSpd) * barW;
    const barColor = spd > maxSpd * 0.8 ? '#ff6040' : '#40c8ff';
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, fill, barH);

    ctx.fillStyle = '#aacfff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SPD  ${spd.toString().padStart(3)} / ${maxSpd}`, bx, by - 6);
  }

  _drawCoords(ctx, canvas, ship) {
    const bx = 20, by = canvas.height - 60;
    ctx.fillStyle = 'rgba(140,180,255,0.6)';
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
    const lines = ['W/↑ Thrust', 'S/↓ Brake', 'A/← D/→ Rotate'];
    const bx = canvas.width / 2;
    const by = canvas.height - 14;
    ctx.fillStyle = 'rgba(80,100,160,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lines.join('   ·   '), bx, by);
  }
}
