/**
 * VERSUS - Quick Shot (Reaction Duel)
 * High-stakes reflex showdown with sub-millisecond precision, human biological limit calibration,
 * reflex tier ratings, deceptive fake-out triggers, and recoil animation physics.
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class QuickDraw {
  constructor(canvas, ctx, onGameOver, difficulty = 'normal', onRoundReset = null) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onGameOver = onGameOver;
    this.difficulty = difficulty;
    this.onRoundReset = onRoundReset;
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
    this.p1Grade = null;
    this.p2Grade = null;
    this.p1Foul = false;
    this.p2Foul = false;
    this.p1Shot = false;
    this.p2Shot = false;
    this.bulletAnim = null;
    this.p1Recoil = 0;
    this.p2Recoil = 0;

    this.timer = 0;
    this.readyDelay = 70;
    // Randomized tense standoff delay (1.8s - 3.8s)
    this.drawDelay = this.readyDelay + Math.floor(Math.random() * 120 + 80);

    // Occasional deceptive fake-out (e.g. "WAIT...", "HOLD IT!", "DON'T SHOOT!")
    this.fakeSignalTime = Math.random() < 0.4 ? this.readyDelay + Math.floor(Math.random() * 40 + 25) : null;
    const fakeTexts = ['WAIT...', 'HOLD IT!', 'DON\'T SHOOT!', 'NOT YET...'];
    this.fakeText = fakeTexts[Math.floor(Math.random() * fakeTexts.length)];

    /**
     * BIOLOGICALLY CALIBRATED BOT REACTION TIMES (Accounting for 60Hz frame time + browser latency):
     * - Demon: 165ms - 195ms (Esports Pro limit / near human biological threshold)
     * - Hard:  215ms - 255ms (Fast gamer reflexes)
     * - Normal: 280ms - 345ms (Average human reaction time)
     * - Baby:  480ms - 640ms (Beginner / relaxed)
     */
    if (this.difficulty === 'baby') {
      this.botReactionTime = Math.floor(Math.random() * 160 + 480);
    } else if (this.difficulty === 'normal') {
      this.botReactionTime = Math.floor(Math.random() * 65 + 280);
    } else if (this.difficulty === 'hard') {
      this.botReactionTime = Math.floor(Math.random() * 40 + 215);
    } else if (this.difficulty === 'demon') {
      this.botReactionTime = Math.floor(Math.random() * 30 + 165);
    }

    this.botTimer = 0;
    this.roundEnding = false;
    if (this.onRoundReset) this.onRoundReset();
  }

  getReflexGrade(ms) {
    if (ms < 175) return { text: '⚡ GODLIKE', color: '#f59e0b' };
    if (ms < 215) return { text: '🔥 PRO REFLEXES', color: '#a855f7' };
    if (ms < 260) return { text: '⚡ LIGHTNING', color: '#10b981' };
    if (ms < 320) return { text: '🎯 SHARP', color: '#0ea5e9' };
    if (ms < 420) return { text: '⏱️ AVERAGE', color: '#64748b' };
    return { text: '🐢 SLEEPY', color: '#94a3b8' };
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    this.timer++;

    // Standoff phase progression
    if (this.state === 'WAITING' && this.timer > 25) {
      this.state = 'READY';
      this.signalText = 'READY...';
      sound.playCountdown(400);
    } else if (this.state === 'READY' && this.timer >= this.readyDelay) {
      this.state = 'STEADY';
      this.signalText = 'STEADY...';
      sound.playCountdown(480);
    }

    // Fake-out deceptive flash
    if (this.fakeSignalTime && this.timer === this.fakeSignalTime && this.state === 'STEADY') {
      this.signalText = this.fakeText;
      sound.playCountdown(300);
    }

    // FIRE TRIGGER!
    if (this.timer >= this.drawDelay && this.state !== 'DRAW' && this.state !== 'ROUND_OVER') {
      this.state = 'DRAW';
      this.signalText = 'FIRE!';
      this.drawTime = performance.now();
      sound.playDrawSignal();
      particles.shake(10, 12);
    }

    // Bot AI Reflex Simulation
    if (isBotP2 && !this.p2Shot && !this.p2Foul) {
      if (this.state === 'DRAW') {
        const elapsed = performance.now() - this.drawTime;
        if (elapsed >= this.botReactionTime) {
          p2Input = { justAction: true, action: true, actionTimestamp: this.drawTime + this.botReactionTime };
        }
      } else if (this.fakeSignalTime && this.timer === this.fakeSignalTime + 3) {
        // Chance of bot falling for deceptive fake-out
        const baitChance = this.difficulty === 'baby' ? 0.45 : this.difficulty === 'normal' ? 0.2 : 0.05;
        if (Math.random() < baitChance) {
          p2Input = { justAction: true, action: true, actionTimestamp: performance.now() };
        }
      }
    }

    // Player 1 Trigger
    if (p1Input.justAction && !this.p1Shot && !this.p1Foul) {
      this.p1Shot = true;
      this.p1Recoil = 14;
      if (this.state !== 'DRAW') {
        this.p1Foul = true;
        this.handleFoul(1);
      } else {
        const pressTime = p1Input.actionTimestamp || performance.now();
        this.p1Time = Math.max(1, Math.round(pressTime - this.drawTime));
        this.p1Grade = this.getReflexGrade(this.p1Time);
        this.checkDrawWinner();
      }
    }

    // Player 2 Trigger
    if (p2Input.justAction && !this.p2Shot && !this.p2Foul) {
      this.p2Shot = true;
      this.p2Recoil = 14;
      if (this.state !== 'DRAW') {
        this.p2Foul = true;
        this.handleFoul(2);
      } else {
        const pressTime = p2Input.actionTimestamp || performance.now();
        this.p2Time = Math.max(1, Math.round(pressTime - this.drawTime));
        this.p2Grade = this.getReflexGrade(this.p2Time);
        this.checkDrawWinner();
      }
    }

    // Bullet Animation
    if (this.bulletAnim) {
      this.bulletAnim.progress += 0.12;
      if (this.bulletAnim.progress >= 1) {
        this.bulletAnim.progress = 1;
      }
    }

    // Gun recoil decay
    this.p1Recoil *= 0.82;
    this.p2Recoil *= 0.82;
  }

  handleFoul(player) {
    if (this.roundEnding) return;
    this.roundEnding = true;
    this.state = 'ROUND_OVER';

    sound.playBang();
    particles.shake(14, 16);

    if (player === 1) {
      this.signalText = 'P1 EARLY FOUL!';
      this.p2Score++;
      particles.addFloatingText('EARLY SHOT! (-1)', this.width * 0.24, this.height * 0.4, '#f43f5e', 24);
    } else {
      this.signalText = 'P2 EARLY FOUL!';
      this.p1Score++;
      particles.addFloatingText('EARLY SHOT! (-1)', this.width * 0.76, this.height * 0.4, '#0ea5e9', 24);
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
      particles.spawnExplosion(this.width * 0.78, this.height * 0.55, '#f43f5e', 32);

      setTimeout(() => this.finishRound(), 2400);
    } else if (this.p2Time !== null && this.p1Time === null) {
      this.roundEnding = true;
      this.state = 'ROUND_OVER';
      this.p2Score++;
      this.signalText = `P2 FASTER! (${this.p2Time}ms)`;
      this.bulletAnim = { fromX: this.width * 0.78, toX: this.width * 0.22, progress: 0, winner: 2 };
      particles.spawnExplosion(this.width * 0.22, this.height * 0.55, '#0ea5e9', 32);

      setTimeout(() => this.finishRound(), 2400);
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

    // Western Desert Sunset Gradient
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#fef3c7');
    bgGrad.addColorStop(0.65, '#fde68a');
    bgGrad.addColorStop(1, '#fcd34d');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Ground Platform
    this.ctx.fillStyle = '#b45309';
    this.ctx.fillRect(40, this.height * 0.7, this.width - 80, 8);
    this.ctx.fillStyle = '#d97706';
    this.ctx.fillRect(40, this.height * 0.7 + 8, this.width - 80, 4);

    // Center Stage Header Signal
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let signalColor = '#1e293b';
    let fontSize = 36;
    if (this.state === 'READY') signalColor = '#d97706';
    if (this.state === 'STEADY') signalColor = '#b45309';
    if (this.state === 'DRAW') {
      signalColor = '#15803d';
      fontSize = 48;
    }
    if (this.state === 'ROUND_OVER') signalColor = '#0f172a';

    // Signal Glow on Draw
    if (this.state === 'DRAW') {
      this.ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
      this.ctx.shadowBlur = 18;
    }

    this.ctx.fillStyle = signalColor;
    this.ctx.font = `900 ${fontSize}px "Fredoka", sans-serif`;
    this.ctx.fillText(this.signalText, this.width / 2, this.height * 0.3);
    this.ctx.restore();

    // Gunslingers
    this.drawGunslinger(this.width * 0.22, this.height * 0.58, 1, '#0ea5e9', this.p1Recoil);
    this.drawGunslinger(this.width * 0.78, this.height * 0.58, -1, '#f43f5e', this.p2Recoil);

    // Laser Tracer Bullet
    if (this.bulletAnim) {
      const curX = this.bulletAnim.fromX + (this.bulletAnim.toX - this.bulletAnim.fromX) * this.bulletAnim.progress;
      this.ctx.strokeStyle = this.bulletAnim.winner === 1 ? '#0ea5e9' : '#f43f5e';
      this.ctx.lineWidth = 6;
      this.ctx.shadowColor = this.bulletAnim.winner === 1 ? '#38bdf8' : '#fb7185';
      this.ctx.shadowBlur = 14;
      this.ctx.beginPath();
      this.ctx.moveTo(this.bulletAnim.fromX, this.height * 0.54);
      this.ctx.lineTo(curX, this.height * 0.54);
      this.ctx.stroke();
    }

    // Reaction Timing & Grade Badges
    if (this.p1Time !== null) {
      this.drawReactionPill(this.width * 0.22, this.height * 0.82, this.p1Time, this.p1Grade, '#0ea5e9');
    }
    if (this.p2Time !== null) {
      this.drawReactionPill(this.width * 0.78, this.height * 0.82, this.p2Time, this.p2Grade, '#f43f5e');
    }

    // Scoreboard HUD
    this.ctx.save();
    this.ctx.font = 'bold 26px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText(`${this.p1Score}`, this.width * 0.35, 48);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText('VS', this.width * 0.5, 48);

    this.ctx.fillStyle = '#e11d48';
    this.ctx.fillText(`${this.p2Score}`, this.width * 0.65, 48);
    this.ctx.restore();

    this.ctx.restore();
  }

  drawReactionPill(x, y, ms, grade, color) {
    this.ctx.save();
    this.ctx.translate(x, y);

    // Pill Background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.roundRect(-80, -22, 160, 48, 14);
    this.ctx.fill();
    this.ctx.stroke();

    // Reaction MS
    this.ctx.font = '900 20px "Fredoka", sans-serif';
    this.ctx.fillStyle = '#0f172a';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${ms} ms`, 0, -2);

    // Reflex Grade
    if (grade) {
      this.ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.fillStyle = grade.color;
      this.ctx.fillText(grade.text, 0, 16);
    }

    this.ctx.restore();
  }

  drawGunslinger(x, y, dir, color, recoil = 0) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);

    // Recoil offset
    const recoilX = -recoil * 0.8;
    const recoilRot = -recoil * 0.04;
    this.ctx.translate(recoilX, 0);
    this.ctx.rotate(recoilRot);

    // Shadow
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 36, 20, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Cowboy Hat
    this.ctx.fillStyle = '#78350f';
    this.ctx.beginPath();
    this.ctx.ellipse(0, -32, 24, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.roundRect(-12, -45, 24, 16, 4);
    this.ctx.fill();

    // Hat Belt
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(-12, -35, 24, 3);

    // Head
    this.ctx.fillStyle = '#fde68a';
    this.ctx.beginPath();
    this.ctx.arc(0, -20, 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Bandana / Mask
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(-10, -18);
    this.ctx.lineTo(10, -18);
    this.ctx.lineTo(0, -8);
    this.ctx.closePath();
    this.ctx.fill();

    // Body Poncho
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -10);
    this.ctx.lineTo(16, 22);
    this.ctx.lineTo(-16, 22);
    this.ctx.closePath();
    this.ctx.fill();

    // Gun & Arm (Facing forward towards opponent)
    this.ctx.fillStyle = color;
    this.ctx.fillRect(2, -2, 10, 8);

    // Wooden Pistol Grip
    this.ctx.fillStyle = '#78350f';
    this.ctx.fillRect(8, 2, 5, 10);

    // Revolver Cylinder & Receiver
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(11, -1, 8, 7);

    // Gun Barrel pointing forward
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(17, 0, 14, 4);
    this.ctx.fillRect(29, -2, 2, 2); // Front sight

    // Legs
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(-8, 22, 6, 14);
    this.ctx.fillRect(2, 22, 6, 14);

    this.ctx.restore();
  }

  getNetworkState() {
    return {
      state: this.state,
      signalText: this.signalText,
      p1Score: this.p1Score,
      p2Score: this.p2Score,
      p1Shot: this.p1Shot,
      p2Shot: this.p2Shot,
      p1Foul: this.p1Foul,
      p2Foul: this.p2Foul,
      p1Time: this.p1Time,
      p2Time: this.p2Time,
      p1Grade: this.p1Grade,
      p2Grade: this.p2Grade
    };
  }

  applyNetworkState(state) {
    if (!state) return;
    this.state = state.state;
    this.signalText = state.signalText;
    if (state.p1Score !== undefined) this.p1Score = state.p1Score;
    if (state.p2Score !== undefined) this.p2Score = state.p2Score;
    this.p1Shot = state.p1Shot;
    this.p2Shot = state.p2Shot;
    this.p1Foul = state.p1Foul;
    this.p2Foul = state.p2Foul;
    this.p1Time = state.p1Time;
    this.p2Time = state.p2Time;
    this.p1Grade = state.p1Grade;
    this.p2Grade = state.p2Grade;
  }
}
