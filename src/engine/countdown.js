/**
 * VERSUS - Arcade 3-2-1-GO Countdown Manager
 * Freezes game physics and plays an animated 3-second countdown before every new game & round.
 */
import { sound } from '../audio/sound.js';

export class Countdown {
  constructor() {
    this.active = false;
    this.currentText = '3';
    this.scale = 1;
    this.stage = 3; // 3, 2, 1, 0 ('GO!')
    this.onComplete = null;
    this.startTime = 0;
  }

  start(onComplete = null) {
    this.active = true;
    this.stage = 3;
    this.currentText = '3';
    this.scale = 1.6;
    this.onComplete = onComplete;
    this.startTime = performance.now();
    sound.playCountdown(440);
  }

  update() {
    if (!this.active) return;
    const elapsed = performance.now() - this.startTime;

    if (elapsed < 650) {
      if (this.stage !== 3) {
        this.stage = 3;
        this.currentText = '3';
        this.scale = 1.6;
        sound.playCountdown(440);
      }
      this.scale = Math.max(1, this.scale - 0.04);
    } else if (elapsed < 1300) {
      if (this.stage !== 2) {
        this.stage = 2;
        this.currentText = '2';
        this.scale = 1.6;
        sound.playCountdown(520);
      }
      this.scale = Math.max(1, this.scale - 0.04);
    } else if (elapsed < 1950) {
      if (this.stage !== 1) {
        this.stage = 1;
        this.currentText = '1';
        this.scale = 1.6;
        sound.playCountdown(600);
      }
      this.scale = Math.max(1, this.scale - 0.04);
    } else if (elapsed < 2550) {
      if (this.stage !== 0) {
        this.stage = 0;
        this.currentText = 'GO!';
        this.scale = 1.8;
        sound.playGo();
      }
      this.scale = Math.max(1, this.scale - 0.04);
    } else {
      this.active = false;
      if (this.onComplete) {
        const cb = this.onComplete;
        this.onComplete = null;
        cb();
      }
    }
  }

  draw(ctx, width, height) {
    if (!this.active) return;

    ctx.save();
    const cx = width / 2;
    const cy = height / 2;

    const ringColor = this.stage === 0 
      ? '#10b981' 
      : this.stage === 1 
      ? '#0ea5e9' 
      : this.stage === 2 
      ? '#f59e0b' 
      : '#f43f5e';

    // Dark glass circle badge behind number
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.arc(cx, cy, 65 * Math.min(this.scale, 1.4), 0, Math.PI * 2);
    ctx.fill();

    // Vibrant Glowing Ring
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(58 * this.scale)}px "Fredoka", sans-serif`;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(this.currentText, cx + 3, cy + 4);

    // Number fill
    ctx.fillStyle = this.stage === 0 ? '#10b981' : '#ffffff';
    ctx.fillText(this.currentText, cx, cy);

    ctx.restore();
  }
}

export const countdown = new Countdown();
