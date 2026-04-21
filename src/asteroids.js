import { createRng } from './utils.js';

const ROCK_COLORS = ['#3a3528', '#4a4038', '#28251e', '#40382e', '#352c24'];

function makeRock(rng, beltRadius, beltWidth) {
  const angle    = rng() * Math.PI * 2;
  const r        = beltRadius + (rng() - 0.5) * beltWidth;
  const size     = 4 + rng() * 13;
  const rotation = rng() * Math.PI * 2;
  const rotSpeed = (rng() - 0.5) * 0.5;
  const vCount   = 6 + Math.floor(rng() * 5);
  const verts    = [];
  for (let v = 0; v < vCount; v++) {
    const a  = (v / vCount) * Math.PI * 2;
    const rv = size * (0.65 + rng() * 0.7);
    verts.push([Math.cos(a) * rv, Math.sin(a) * rv]);
  }
  return {
    x:        Math.cos(angle) * r,
    y:        Math.sin(angle) * r,
    rotation,
    rotSpeed,
    verts,
    color: ROCK_COLORS[Math.floor(rng() * ROCK_COLORS.length)],
  };
}

// Belt configs: [orbitRadius, beltWidth, rockCount]
const BELT_CONFIGS = [
  [2100, 280, 30],
  [3700, 320, 38],
  [5600, 260, 26],
];

export class AsteroidField {
  constructor(seed) {
    const rng    = createRng(seed ^ 0xBEEF9876);
    this.belts   = BELT_CONFIGS.map(([radius, width, count]) =>
      Array.from({ length: count }, () => makeRock(rng, radius, width))
    );
  }

  update(dt) {
    for (const belt of this.belts) {
      for (const rock of belt) {
        rock.rotation += rock.rotSpeed * dt;
      }
    }
  }

  draw(ctx) {
    for (const belt of this.belts) {
      for (const rock of belt) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.rotation);
        ctx.fillStyle = rock.color;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(rock.verts[0][0], rock.verts[0][1]);
        for (let i = 1; i < rock.verts.length; i++) {
          ctx.lineTo(rock.verts[i][0], rock.verts[i][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
