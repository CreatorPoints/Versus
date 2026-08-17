/**
 * VERSUS - Quick Draw / Reaction Duel
 * High stakes reflex showdown, deceptive cues, millisecond timing!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class QuickDraw {
  constructor(canvas, ctx, onGameOver) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onGameOver = onGameOver;
    this.width = canvas.width;
    this.height = canvas.height;

    this.p1Score = 0;
    this.p2Score = 0;
    this.targetScore = 3;
    this.isOver = false;

    this.resetRound();
  }

  resetRound() {
    this.state = 'WAITING';
    this.signalText = 'GET READY...';
    this.drawTime = 0;
    this.p1Time = null;
    this.p2Time = null;
    this.p1Foul = false;
    this.p2Foul = false;
    this.p1Shot = false;
    this.p2Shot = false;
    this.bulletAnim = null;

    this.timer = 0;
    this.readyDelay = 80;
    this.drawDelay = this.readyDelay + Math.floor(Math.random() * 140 + 100);

    this.fakeSignalTime = Math.random() < 0.45 ? this.readyDelay + Math.floor(Math.random() * 50 + 30) : null;
    this.fakeText = Math.random() < 0.5 ? 'WAIT...' : 'DON\'T SHOOT!';

    this.botReactionTime = Math.floor(Math.random() * 120 + 210);
    this.botTimer = 0;

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    this.timer++;

    if (this.state === 'WAITING' && this.timer > 30) {
      this.state = 'READY';
      this.signalText = 'READY...';
      sound.playCountdown(400);
    } else if (this.state === 'READY' && this.timer >= this.readyDelay) {
      this.state = 'STEADY';
      this.signalText = 'STEADY...';
      sound.playCountdown(480);
    }

    if (this.fakeSignalTime && this.timer === this.fakeSignalTime && this.state === 'STEADY') {
      this.signalText = this.fakeText;
      sound.playCountdown(300);
    }

    if (this.timer >= this.drawDelay && this.state !== 'DRAW' && this.state !== 'ROUND_OVER') {
      this.state = 'DRAW';
      this.signalText = 'FIRE!';
      this.drawTime = performance.now();
      sound.playDrawSignal();
      particles.shake(8, 10);
    }

    if (isBotP2 && !this.p2Shot && !this.p2Foul) {
      if (this.state === 'DRAW') {
        this.botTimer++;
        if (performance.now() - this.drawTime >= this.botReactionTime) {
          p2Input = { justAction: true, action: true };
        }
      } else if (this.fakeSignalTime && this.timer === this.fakeSignalTime + 4 && Math.random() < 0.15) {
        p2Input = { justAction: true, action: true };
      }
    }

    if (p1Input.justAction && !this.p1Shot && !this.p1Foul) {
      this.p1Shot = true;
      if (this.state !== 'DRAW') {
        this.p1Foul = true;
        this.handleFoul(1);
      } else {
        this.p1Time = Math.round(performance.now() - this.drawTime);
        this.checkDrawWinner();
      }
    }

    if (p2Input.justAction && !this.p2Shot && !this.p2Foul) {
      this.p2Shot = true;
      if (this.state !== 'DRAW') {
        this.p2Foul = true;
        this.handleFoul(2);
      } else {
        this.p2Time = Math.round(performance.now() - this.drawTime);
        this.checkDrawWinner();
      }
    }

    if (this.bulletAnim) {
      this.bulletAnim.progress += 0.08;
      if (this.bulletAnim.progress >= 1) {
        this.bulletAnim.progress = 1;
      }
    }
  }

  handleFoul(player) {
    if (this.roundEnding) return;
    this.roundEnding = true;
    this.state = 'ROUND_OVER';

    sound.playBang();
    particles.shake(12, 14);

    if (player === 1) {
      this.signalText = 'P1 EARLY FOUL!';
      this.p2Score++;
      particles.addFloatingText('EARLY SHOT!', this.width * 0.25, this.height * 0.4, '#f43f5e', 24);
    } else {
      this.signalText = 'P2 EARLY FOUL!';
      this.p1Score++;
      particles.addFloatingText('EARLY SHOT!', this.width * 0.75, this.height * 0.4, '#0ea5e9', 24);
    }

    setTimeout(() => {
      if (this.p1Score >= this.targetScore || this.p2Score >= this.targetScore) {
        this.isOver = true;
        const winner = this.p1Score > this.p2Score ? 1 : 2;
        this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score });
      } else {
        this.resetRound();
      }
    }, 2200);
  }

  checkDrawWinner() {
    if (this.roundEnding) return;

    sound.playBang();
    particles.shake(16, 20);

    if (this.p1Time !== null && this.p2Time === null) {
      this.roundEnding = true;
      this.state = 'ROUND_OVER';
      this.p1Score++;
      this.signalText = `P1 FASTER! (${this.p1Time}ms)`;
      this.bulletAnim = { fromX: this.width * 0.22, toX: this.width * 0.78, progress: 0, winner: 1 };
      particles.spawnExplosion(this.width * 0.78, this.height * 0.55, '#f43f5e', 30);

      setTimeout(() => this.finishRound(), 2200);
    } else if (this.p2Time !== null && this.p1Time === null) {
      this.roundEnding = true;
      this.state = 'ROUND_OVER';
      this.p2Score++;
      this.signalText = `P2 FASTER! (${this.p2Time}ms)`;
      this.bulletAnim = { fromX: this.width * 0.78, toX: this.width * 0.22, progress: 0, winner: 2 };
      particles.spawnExplosion(this.width * 0.22, this.height * 0.55, '#0ea5e9', 30);

      setTimeout(() => this.finishRound(), 2200);
    }
  }

  finishRound() {
    if (this.p1Score >= this.targetScore || this.p2Score >= this.targetScore) {
      this.isOver = true;
      const winner = this.p1Score > this.p2Score ? 1 : 2;
      this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score });
    } else {
      this.resetRound();
    }
  }

  draw() {
    this.ctx.save();

    // Warm desert cartoon background
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#fef3c7');
    bgGrad.addColorStop(0.7, '#fde68a');
    bgGrad.addColorStop(1, '#fef08a');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Duel Ground Platform
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(40, this.height * 0.7, this.width - 80, 8);

    // Big Center Signal Display
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let signalColor = '#1e293b';
    if (this.state === 'READY') signalColor = '#d97706';
    if (this.state === 'STEADY') signalColor = '#b45309';
    if (this.state === 'DRAW') signalColor = '#15803d';
    if (this.state === 'ROUND_OVER') signalColor = '#0f172a';

    this.ctx.fillStyle = signalColor;
    this.ctx.font = 'bold 36px "Fredoka", sans-serif';
    this.ctx.fillText(this.signalText, this.width / 2, this.height * 0.32);
    this.ctx.restore();

    this.drawGunslinger(this.width * 0.22, this.height * 0.58, 1, '#0ea5e9');
    this.drawGunslinger(this.width * 0.78, this.height * 0.58, -1, '#f43f5e');

    if (this.bulletAnim) {
      const curX = this.bulletAnim.fromX + (this.bulletAnim.toX - this.bulletAnim.fromX) * this.bulletAnim.progress;
      this.ctx.strokeStyle = this.bulletAnim.winner === 1 ? '#0ea5e9' : '#f43f5e';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.bulletAnim.fromX, this.height * 0.54);
      this.ctx.lineTo(curX, this.height * 0.54);
      this.ctx.stroke();
    }

    if (this.p1Time) {
      this.ctx.fillStyle = '#0ea5e9';
      this.ctx.font = 'bold 18px "Fredoka"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${this.p1Time} ms`, this.width * 0.22, this.height * 0.82);
    }
    if (this.p2Time) {
      this.ctx.fillStyle = '#f43f5e';
      this.ctx.font = 'bold 18px "Fredoka"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${this.p2Time} ms`, this.width * 0.78, this.height * 0.82);
    }

    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawGunslinger(x, y, dir, color) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(-12, 35);
    this.ctx.lineTo(12, 35);
    this.ctx.lineTo(6, -10);
    this.ctx.lineTo(-6, -10);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(0, -22, 10, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(-18, -22, 36, 4);

    this.ctx.fillStyle = '#0f172a';
    if (this.state === 'DRAW' || this.state === 'ROUND_OVER') {
      this.ctx.fillRect(8, -5, 22, 6);
      this.ctx.fillRect(12, -2, 6, 10);
    } else {
      this.ctx.fillRect(4, 8, 12, 6);
    }

    this.ctx.restore();
  }

  drawScoreHUD() {
    this.ctx.save();
    this.ctx.font = 'bold 24px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText(`${this.p1Score}`, this.width * 0.35, 48);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(`VS`, this.width * 0.5, 48);

    this.ctx.fillStyle = '#e11d48';
    this.ctx.fillText(`${this.p2Score}`, this.width * 0.65, 48);
    this.ctx.restore();
  }
}
