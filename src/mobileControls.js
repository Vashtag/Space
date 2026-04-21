// Touch-only mobile overlay. Completely inert on desktop (active === false → no
// event listeners, draw() returns immediately).

const STICK_MAX  = 56;    // max knob travel in px
const STICK_DEAD = 16;    // dead zone in px
const LEFT_RATIO = 0.47;  // left 47% of screen = joystick zone

// Button geometry — kept above the minimap (bottom-right 176×176 block)
const BOOST_R  = 50;
const ORBIT_R  = 38;
const BTN_PAD  = 80;  // cx offset from right edge

export class MobileControls {
  constructor(canvas, keys, keysJustPressed) {
    this.canvas          = canvas;
    this.keys            = keys;
    this.keysJustPressed = keysJustPressed;

    this.active = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!this.active) return;

    this.stick        = { touchId: null, baseX: 0, baseY: 0, knobX: 0, knobY: 0 };
    this.boostTouchId = null;
    this.orbitTouchId = null;

    const o = { passive: false };
    canvas.addEventListener('touchstart',  this._onStart.bind(this), o);
    canvas.addEventListener('touchmove',   this._onMove.bind(this),  o);
    canvas.addEventListener('touchend',    this._onEnd.bind(this),   o);
    canvas.addEventListener('touchcancel', this._onEnd.bind(this),   o);
  }

  // Button centers — computed live so they adapt to canvas resize
  _boost() { return { cx: this.canvas.width - BTN_PAD, cy: this.canvas.height - 240, r: BOOST_R }; }
  _orbit() { return { cx: this.canvas.width - BTN_PAD, cy: this.canvas.height - 350, r: ORBIT_R }; }

  _hit(x, y, btn) {
    const dx = x - btn.cx, dy = y - btn.cy;
    return dx * dx + dy * dy <= btn.r * btn.r;
  }

  _onStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY, id = t.identifier;
      if (this._hit(x, y, this._boost())) {
        this.boostTouchId      = id;
        this.keys['ShiftLeft'] = true;
      } else if (this._hit(x, y, this._orbit())) {
        this.orbitTouchId = id;
        this.keysJustPressed.add('KeyE');   // one-shot, same as keyboard
      } else if (x < this.canvas.width * LEFT_RATIO && this.stick.touchId === null) {
        this.stick = { touchId: id, baseX: x, baseY: y, knobX: x, knobY: y };
      }
    }
  }

  _onMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== this.stick.touchId) continue;
      const dx  = t.clientX - this.stick.baseX;
      const dy  = t.clientY - this.stick.baseY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);
      const cl  = Math.min(len, STICK_MAX);
      this.stick.knobX = this.stick.baseX + Math.cos(ang) * cl;
      this.stick.knobY = this.stick.baseY + Math.sin(ang) * cl;

      const cx = cl * Math.cos(ang);
      const cy = cl * Math.sin(ang);
      this.keys['ArrowLeft']  = cx < -STICK_DEAD;
      this.keys['ArrowRight'] = cx >  STICK_DEAD;
      this.keys['KeyW']       = cy < -STICK_DEAD;
      this.keys['KeyS']       = cy >  STICK_DEAD;
    }
  }

  _onEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const id = t.identifier;
      if (id === this.stick.touchId) {
        this.stick.touchId     = null;
        this.keys['ArrowLeft'] = false; this.keys['ArrowRight'] = false;
        this.keys['KeyW']      = false; this.keys['KeyS']       = false;
      }
      if (id === this.boostTouchId) {
        this.boostTouchId      = null;
        this.keys['ShiftLeft'] = false;
      }
      if (id === this.orbitTouchId) this.orbitTouchId = null;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.textBaseline = 'middle';

    this.stick.touchId !== null ? this._drawActiveStick(ctx) : this._drawInactiveStick(ctx);
    this._drawBoostBtn(ctx);
    this._drawOrbitBtn(ctx);

    ctx.restore();
  }

  _drawActiveStick(ctx) {
    const { baseX: bx, baseY: by, knobX: kx, knobY: ky } = this.stick;

    // Outer ring + fill
    ctx.fillStyle   = 'rgba(30,60,120,0.28)';
    ctx.strokeStyle = 'rgba(100,170,255,0.45)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(bx, by, STICK_MAX, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dead-zone dashed ring
    ctx.strokeStyle = 'rgba(100,150,255,0.2)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(bx, by, STICK_DEAD, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Knob
    ctx.fillStyle   = 'rgba(80,150,230,0.65)';
    ctx.strokeStyle = 'rgba(140,200,255,0.85)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(kx, ky, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  _drawInactiveStick(ctx) {
    // Subtle hint in lower-left; pure guidance, very transparent
    const hx = 80, hy = this.canvas.height - 170;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#6090cc';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, STICK_MAX, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,110,190,0.22)';
    ctx.beginPath();
    ctx.arc(hx, hy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle   = '#7090bb';
    ctx.font        = '9px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('MOVE', hx, hy);
    ctx.globalAlpha = 1;
  }

  _drawBoostBtn(ctx) {
    const btn = this._boost();
    const on  = this.boostTouchId !== null;
    ctx.globalAlpha = on ? 0.92 : 0.58;
    ctx.fillStyle   = on ? 'rgba(60,120,255,0.72)' : 'rgba(20,40,110,0.48)';
    ctx.strokeStyle = on ? '#90d0ff' : '#3060a0';
    ctx.lineWidth   = on ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = on ? '#d0f0ff' : '#5080b8';
    ctx.font      = `bold ${on ? 14 : 13}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('BOOST', btn.cx, btn.cy);
    ctx.globalAlpha = 1;
  }

  _drawOrbitBtn(ctx) {
    const btn = this._orbit();
    const on  = this.orbitTouchId !== null;
    ctx.globalAlpha = on ? 0.92 : 0.52;
    ctx.fillStyle   = on ? 'rgba(60,200,130,0.72)' : 'rgba(20,70,48,0.42)';
    ctx.strokeStyle = on ? '#80ffb8' : '#306050';
    ctx.lineWidth   = on ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = on ? '#c0ffdc' : '#40a070';
    ctx.font      = `bold ${on ? 12 : 11}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('ORBIT', btn.cx, btn.cy - 7);
    ctx.fillText('[E]',   btn.cx, btn.cy + 8);
    ctx.globalAlpha = 1;
  }
}
