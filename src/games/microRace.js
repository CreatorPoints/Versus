/**
 * VERSUS - Micro Race Mini-Game
 * Fast top-down kart racing, drifting, AI difficulties!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class MicroRace {
  constructor(canvas, ctx, onGameOver, difficulty = 'normal') {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onGameOver = onGameOver;
    this.difficulty = difficulty;
    this.width = canvas.width;
    this.height = canvas.height;

    this.p1Score = 0;
    this.p2Score = 0;
    this.targetScore = 3;
    this.isOver = false;

    this.resetRound();
  }

  resetRound() {
    this.trackOuter = { x: 40, y: 40, w: this.width - 80, h: this.height - 80, r: 40 };
    this.trackInner = { x: 180, y: 140, w: this.width - 360, h: this.height - 280, r: 30 };

    let p2MaxSpeed = 6.2;
    if (this.difficulty === 'baby') p2MaxSpeed = 3.6;
    else if (this.difficulty === 'hard') p2MaxSpeed = 7.0;
    else if (this.difficulty === 'demon') p2MaxSpeed = 7.8;

    this.p1 = {
      x: this.width / 2 - 20,
      y: this.height - 80,
      angle: Math.PI,
      speed: 0,
      maxSpeed: 6.2,
      color: '#0ea5e9',
      checkpoints: [false, false, false, false],
      laps: 0,
      size: 14
    };

    this.p2 = {
      x: this.width / 2 + 20,
      y: this.height - 80,
      angle: Math.PI,
      speed: 0,
      maxSpeed: p2MaxSpeed,
      color: '#f43f5e',
      checkpoints: [false, false, false, false],
      laps: 0,
      size: 14
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    this.updateKart(this.p1, p1Input, 1);
    this.updateKart(this.p2, p2Input, 2);
  }

  updateKart(kart, input, playerNum) {
    if (input.x < -0.2) kart.angle -= 0.07;
    if (input.x > 0.2) kart.angle += 0.07;

    if (input.y < -0.2 || input.action) {
      kart.speed = Math.min(kart.speed + 0.22, kart.maxSpeed);
      if (Math.random() < 0.3) {
        particles.spawnTrail(kart.x, kart.y, kart.color, 3);
      }
    } else if (input.y > 0.2) {
      kart.speed = Math.max(kart.speed - 0.25, -2);
    } else {
      kart.speed *= 0.96;
    }

    kart.x += Math.cos(kart.angle) * kart.speed;
    kart.y += Math.sin(kart.angle) * kart.speed;

    if (kart.x < 150 && kart.y > this.height / 2) kart.checkpoints[0] = true;
    if (kart.y < 120 && kart.checkpoints[0]) kart.checkpoints[1] = true;
    if (kart.x > this.width - 150 && kart.checkpoints[1]) kart.checkpoints[2] = true;
    if (kart.y > this.height - 120 && kart.x < this.width / 2 + 10 && kart.x > this.width / 2 - 10 && kart.checkpoints[2]) {
      kart.checkpoints = [false, false, false, false];
      kart.laps++;
      sound.playGoal();
      particles.spawnExplosion(kart.x, kart.y, kart.color, 25);
      particles.addFloatingText(`LAP ${kart.laps}/3!`, kart.x, kart.y - 25, kart.color, 20);

      if (kart.laps >= 3) {
        this.finishRace(playerNum);
      }
    }
  }

  finishRace(winner) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    if (winner === 1) this.p1Score = 3;
    else this.p2Score = 3;

    setTimeout(() => {
      this.isOver = true;
      this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score });
    }, 1500);
  }

  computeBotInput() {
    let waypoints = [
      { x: 100, y: this.height - 90 },
      { x: 90, y: 100 },
      { x: this.width - 100, y: 90 },
      { x: this.width - 90, y: this.height - 90 },
      { x: this.width / 2, y: this.height - 90 }
    ];

    if (this.difficulty === 'demon' || this.difficulty === 'hard') {
      // Optimal apex curves
      waypoints = [
        { x: 80, y: this.height - 85 },
        { x: 75, y: 85 },
        { x: this.width - 80, y: 85 },
        { x: this.width - 80, y: this.height - 85 },
        { x: this.width / 2, y: this.height - 85 }
      ];
    }

    let target = waypoints[0];
    if (this.p2.checkpoints[2]) target = waypoints[4];
    else if (this.p2.checkpoints[1]) target = waypoints[3];
    else if (this.p2.checkpoints[0]) target = waypoints[2];
    else if (this.p2.x < 160) target = waypoints[1];

    if (this.difficulty === 'baby') {
      target.x += (Math.random() - 0.5) * 60;
      target.y += (Math.random() - 0.5) * 60;
    }

    const dx = target.x - this.p2.x;
    const dy = target.y - this.p2.y;
    const targetAngle = Math.atan2(dy, dx);

    let angleDiff = targetAngle - this.p2.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    return {
      x: angleDiff > 0.1 ? 1 : angleDiff < -0.1 ? -1 : 0,
      y: -1,
      action: true
    };
  }

  draw() {
    this.ctx.save();

    this.ctx.fillStyle = '#10b981';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#334155';
    this.ctx.beginPath();
    this.ctx.roundRect(this.trackOuter.x, this.trackOuter.y, this.trackOuter.w, this.trackOuter.h, this.trackOuter.r);
    this.ctx.fill();

    this.ctx.fillStyle = '#059669';
    this.ctx.beginPath();
    this.ctx.roundRect(this.trackInner.x, this.trackInner.y, this.trackInner.w, this.trackInner.h, this.trackInner.r);
    this.ctx.fill();

    const flX = this.width / 2;
    const flY = this.height - 120;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 2; col++) {
        this.ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#0f172a';
        this.ctx.fillRect(flX + col * 10 - 10, flY + row * 10, 10, 10);
      }
    }

    this.drawKart(this.p1);
    this.drawKart(this.p2);

    this.ctx.font = 'bold 22px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText(`P1: LAP ${this.p1.laps}/3`, this.width * 0.3, 35);
    this.ctx.fillStyle = '#e11d48';
    this.ctx.fillText(`P2: LAP ${this.p2.laps}/3`, this.width * 0.7, 35);

    this.ctx.restore();
  }

  drawKart(kart) {
    this.ctx.save();
    this.ctx.translate(kart.x, kart.y);
    this.ctx.rotate(kart.angle);

    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(-kart.size - 2, -kart.size + 2, 8, 5);
    this.ctx.fillRect(kart.size - 6, -kart.size + 2, 8, 5);
    this.ctx.fillRect(-kart.size - 2, kart.size - 7, 8, 5);
    this.ctx.fillRect(kart.size - 6, kart.size - 7, 8, 5);

    this.ctx.fillStyle = kart.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-kart.size, -kart.size + 4, kart.size * 2, (kart.size - 4) * 2, 6);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-kart.size - 3, -kart.size + 6, 4, (kart.size - 6) * 2);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}
