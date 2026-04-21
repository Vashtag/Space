import { createRng } from './utils.js';

const NAMES = [
  'The Vagrant', 'MSV Broken Wing', 'Silent Protocol',
  'Iron Coffin', 'Deep Echo', 'USCSS Providence',
  'Nomad\'s End', 'The Last Rite',
];

const LORE = [
  'A decommissioned cargo hauler. Its logs mention a failed mining operation three systems over.',
  'Military survey vessel, class unknown. Hull breaches on all decks. No survivors logged.',
  'Long-range probe carrier. The probes are gone. The crew manifest lists 14 names.',
  'Prison transport. Manifest sealed. The cargo bay doors are welded shut from the inside.',
  'Deep-space research station fragment. The experiment logs are corrupted beyond recovery.',
  'Colony ship, pre-war registry. Course was set for a star that no longer exists on charts.',
  'Autonomous freighter, no pilot registered. Its cargo hold contains only a single chair.',
  'Medical frigate. All life-support systems intact. No biological material detected aboard.',
];

function makeDerelict(rng, worldRadius, index) {
  const angle = rng() * Math.PI * 2;
  const dist  = worldRadius * (0.45 + rng() * 0.45);
  const types = ['freighter', 'fighter', 'shuttle', 'fragment'];
  return {
    x:        Math.cos(angle) * dist,
    y:        Math.sin(angle) * dist,
    rotation: rng() * Math.PI * 2,
    rotSpeed: (rng() - 0.5) * 0.025,
    type:     types[Math.floor(rng() * types.length)],
    name:     NAMES[index % NAMES.length],
    lore:     LORE[index % LORE.length],
    discovered: false,
  };
}

export class DerelictField {
  constructor(seed, worldRadius) {
    const rng   = createRng(seed ^ 0xD3AD5A1E);
    const count = 5 + Math.floor(rng() * 4);
    this.derelicts = Array.from({ length: count }, (_, i) =>
      makeDerelict(rng, worldRadius, i)
    );
  }

  update(dt) {
    for (const d of this.derelicts) d.rotation += d.rotSpeed * dt;
  }

  draw(ctx) {
    for (const d of this.derelicts) this._draw(ctx, d);
  }

  _draw(ctx, d) {
    ctx.save();
    ctx.translate(d.x, d.y);

    // Ambient glow
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 55);
    g.addColorStop(0, 'rgba(100,120,140,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(d.rotation);
    ctx.fillStyle   = '#111820';
    ctx.strokeStyle = 'rgba(110,130,150,0.65)';
    ctx.lineWidth   = 1;

    switch (d.type) {
      case 'freighter': this._freighter(ctx); break;
      case 'fighter':   this._fighter(ctx);   break;
      case 'shuttle':   this._shuttle(ctx);   break;
      default:          this._fragment(ctx);  break;
    }
    ctx.restore();

    // Name label — always visible (discovered indicator added later)
    ctx.fillStyle  = d.discovered ? 'rgba(160,200,140,0.7)' : 'rgba(130,150,170,0.55)';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(d.name, d.x, d.y + 44);
  }

  _freighter(ctx) {
    ctx.beginPath(); ctx.rect(-26, -8, 52, 16); ctx.fill(); ctx.stroke();
    // Cargo pods
    ctx.fillStyle = '#0d1418';
    ctx.beginPath(); ctx.rect(-22, -15, 13, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(9,   -15, 13, 7); ctx.fill(); ctx.stroke();
    // Engine block
    ctx.beginPath(); ctx.rect(-30, 5, 9, 6);  ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect( 21, 5, 9, 6);  ctx.fill(); ctx.stroke();
    // Damage: dark slash across hull
    ctx.strokeStyle = 'rgba(60,80,100,0.8)';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(5, 8); ctx.stroke();
  }

  _fighter(ctx) {
    ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(-10, -9); ctx.lineTo(-16, 0); ctx.lineTo(-10, 9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Wings
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(-9, -22); ctx.lineTo(-15, -19); ctx.lineTo(-13, -7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 7);  ctx.lineTo(-9,  22); ctx.lineTo(-15,  19); ctx.lineTo(-13,  7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Broken cockpit
    ctx.strokeStyle = 'rgba(60,80,100,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(18, 2); ctx.stroke();
  }

  _shuttle(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0d1418';
    ctx.beginPath(); ctx.rect(-5, -16, 10, 9); ctx.fill(); ctx.stroke();
    // Cracked viewport
    ctx.strokeStyle = 'rgba(80,120,140,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(3, -1); ctx.stroke();
  }

  _fragment(ctx) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(110,130,150,0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0.3, Math.PI * 0.85);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#111820';
    ctx.beginPath(); ctx.rect(-7, -6, 14, 12); ctx.fill(); ctx.stroke();
    // Sparking light
    ctx.fillStyle = 'rgba(200,220,255,0.4)';
    ctx.beginPath(); ctx.arc(8, -14, 2, 0, Math.PI * 2); ctx.fill();
  }
}
