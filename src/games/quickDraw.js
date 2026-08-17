/**
 * VERSUS - Quick Draw / Reaction Duel
 * High stakes reflex showdown, deceptive cues, millisecond timing, slow-mo gunshot!
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
    this.state = 'WAITING'; // 'WAITING' | 'READY' | 'STEADY' | 'DRAW' | 'ROUND_OVER'
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
    this.drawDelay = this.readyDelay + Math.floor(Math.random() * 140 + 100); // 2-4 seconds

    // Fake signals to bait players
    this.fakeSignalTime = Math.random() < 0.45 ? this.readyDelay + Math.floor(Math.random() * 50 + 30) : null;
    this.fakeText = Math.random() < 0.5 ? 'WAIT...' : 'DON\'T SHOOT!';

    this.botReactionTime = Math.floor(Math.random() * 120 + 210); // 210ms - 330ms
    this.botTimer = 0;

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    this.timer++;

    // 1. State Progression
    if (this.state === 'WAITING' && this.timer > 30) {
      this.state = 'READY';
      this.signalText = 'READY...';
      sound.playCountdown(400);
    } else if (this.state === 'READY' && this.timer >= this.readyDelay) {
      this.state = 'STEADY';
      this.signalText = 'STEADY...';
      sound.playCountdown(480);
    }

    // Fake bait signal
    if (this.fakeSignalTime && this.timer === this.fakeSignalTime && this.state === 'STEADY') {
      this.signalText = this.fakeText;
      sound.playCountdown(300);
    }

    // DRAW SIGNAL!
    if (this.timer >= this.drawDelay && this.state !== 'DRAW' && this.state !== 'ROUND_OVER') {
      this.state = 'DRAW';
      this.signalText = 'FIRE!';
      this.drawTime = performance.now();
      sound.playDrawSignal();
      particles.shake(8, 10);
    }

    // 2. Bot AI Reaction
    if (isBotP2 && !this.p2Shot && !this.p2Foul) {
      if (this.state === 'DRAW') {
        this.botTimer++;
        if (performance.now() - this.drawTime >= this.botReactionTime) {
          p2Input = { justAction: true, action: true };
        }
      } else if (this.fakeSignalTime && this.timer === this.fakeSignalTime + 4 && Math.random() < 0.15) {
        // Bot fell for bait!
        p2Input = { justAction: true, action: true };
      }
    }

    // 3. Process P1 Trigger
    if (p1Input.justAction && !this.p1Shot && !this.p1Foul) {
      this.p1Shot = true;
      if (this.state !== 'DRAW') {
        // Early Foul!
        this.p1Foul = true;
        this.handleFoul(1);
      } else {
        this.p1Time = Math.round(performance.now() - this.drawTime);
        this.checkDrawWinner();
      }
    }

    // 4. Process P2 Trigger
    if (p2Input.justAction && !this.p2Shot && !this.p2Foul) {
      this.p2Shot = true;
      if (this.state !== 'DRAW') {
        // Early Foul!
        this.p2Foul = true;
        this.handleFoul(2);
      } else {
        this.p2Time = Math.round(performance.now() - this.drawTime);
        this.checkDrawWinner();
      }
    }

    // 5. Update Bullet Animation
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
      this.signalText = 'P1 MISFIRE! FOUL!';
      this.p2Score++;
      particles.addFloatingText('EARLY SHOT!', this.width * 0.25, this.height * 0.4, '#ff2e63', 24);
    } else {
      this.signalText = 'P2 MISFIRE! FOUL!';
      this.p1Score++;
      particles.addFloatingText('EARLY SHOT!', this.width * 0.75, this.height * 0.4, '#00f0ff', 24);
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

    // If P1 fired first
    if (this.p1Time !== null && this.p2Time === null) {
      this.roundEnding = true;
      this.state = 'ROUND_OVER';
      this.p1Score++;
      this.signalText = `P1 FASTER! (${this.p1Time}ms)`;
      this.bulletAnim = { fromX: this.width * 0.22, toX: this.width * 0.78, progress: 0, winner: 1 };
      particles.spawnExplosion(this.width * 0.78, this.height * 0.55, '#ff2e63', 30);

      setTimeout(() => this.finishRound(), 2200);
    } 
    // If P2 fired first
    else if (this.p2Time !== null && this.p1Time === null) {
      this.roundEnding = true;
      this.state = 'ROUND_OVER';
      this.p2Score++;
      this.signalText = `P2 FASTER! (${this.p2Time}ms)`;
      this.bulletAnim = { fromX: this.width * 0.78, toX: this.width * 0.22, progress: 0, winner: 2 };
      particles.spawnExplosion(this.width * 0.22, this.height * 0.55, '#00f0ff', 30);

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

    // High noon desert cyber background
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#100c1e');
    bgGrad.addColorStop(0.65, '#29142d');
    bgGrad.addColorStop(1, '#0e0b16');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Duel Ground Platform
    this.ctx.fillStyle = '#1e1628';
    this.ctx.fillRect(40, this.height * 0.7, this.width - 80, 8);

    // Big Center Signal Display
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let signalColor = '#ffffff';
    if (this.state === 'READY') signalColor = '#f59e0b';
    if (this.state === 'STEADY') signalColor = '#eab308';
    if (this.state === 'DRAW') signalColor = '#22c55e';
    if (this.state === 'ROUND_OVER') signalColor = '#ffd166';

    this.ctx.fillStyle = signalColor;
    this.ctx.shadowColor = signalColor;
    this.ctx.shadowBlur = 20;
    this.ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    this.ctx.fillText(this.signalText, this.width / 2, this.height * 0.32);
    this.ctx.shadowBlur = 0;
    this.ctx.restore();

    // Gunslinger Characters
    this.drawGunslinger(this.width * 0.22, this.height * 0.58, 1, '#00f0ff');
    this.drawGunslinger(this.width * 0.78, this.height * 0.58, -1, '#ff2e63');

    // Bullet Laser Line Animation
    if (this.bulletAnim) {
      const curX = this.bulletAnim.fromX + (this.bulletAnim.toX - this.bulletAnim.fromX) * this.bulletAnim.progress;
      this.ctx.strokeStyle = this.bulletAnim.winner === 1 ? '#00f0ff' : '#ff2e63';
      this.ctx.lineWidth = 5;
      this.ctx.shadowColor = this.ctx.strokeStyle;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.moveTo(this.bulletAnim.fromX, this.height * 0.54);
      this.ctx.lineTo(curX, this.height * 0.54);
      this.ctx.stroke();
    }

    // Reaction times display
    if (this.p1Time) {
      this.ctx.fillStyle = '#00f0ff';
      this.ctx.font = '16px "Press Start 2P"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${this.p1Time} ms`, this.width * 0.22, this.height * 0.82);
    }
    if (this.p2Time) {
      this.ctx.fillStyle = '#ff2e63';
      this.ctx.font = '16px "Press Start 2P"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${this.p2Time} ms`, this.width * 0.78, this.height * 0.82);
    }

    // Score HUD
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawGunslinger(x, y, dir, color) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);

    // Body Cloak
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.moveTo(-12, 35);
    this.ctx.lineTo(12, 35);
    this.ctx.lineTo(6, -10);
    this.ctx.lineTo(-6, -10);
    this.ctx.closePath();
    this.ctx.fill();

    // Head Hat
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(0, -22, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // Hat brim
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(-18, -22, 36, 4);

    // Gun Holster / Extended Gun
    this.ctx.fillStyle = '#ffffff';
    if (this.state === 'DRAW' || this.state === 'ROUND_OVER') {
      // Extended Gun
      this.ctx.fillRect(8, -5, 22, 6);
      this.ctx.fillRect(12, -2, 6, 10);
    } else {
      // Hand on Holster
      this.ctx.fillRect(4, 8, 12, 6);
    }

    this.ctx.restore();
  }

  drawScoreHUD() {
    this.ctx.save();
    this.ctx.font = 'bold 24px "Press Start 2P", monospace, sans-serif';
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#00f0ff';
    this.ctx.fillText(`${this.p1Score}`, this.width * 0.35, 48);

    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '16px "Outfit", sans-serif';
    this.ctx.fillText(`FIRST TO ${this.targetScore}`, this.width * 0.5, 48);

    this.ctx.font = 'bold 24px "Press Start 2P", monospace, sans-serif';
    this.ctx.fillStyle = '#ff2e63';
    this.ctx.fillText(`${this.p2Score}`, this.width * 0.65, 48);
    this.ctx.restore();
  }
}
