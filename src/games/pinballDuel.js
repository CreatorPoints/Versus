/**
 * VERSUS - Pinball Duel Mini-Game
 * Bouncy bumper table, speed ramps, tilt impulse, vibrant arcade fun!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class PinballDuel {
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
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 5,
      vy: (Math.random() - 0.5) * 5,
      radius: 12,
      color: '#ffd166',
      trail: []
    };

    this.bumpers = [
      { x: this.width * 0.5, y: this.height * 0.3, radius: 24, color: '#f59e0b', pulse: 0 },
      { x: this.width * 0.5, y: this.height * 0.7, radius: 24, color: '#f59e0b', pulse: 0 },
      { x: this.width * 0.35, y: this.height * 0.5, radius: 20, color: '#0ea5e9', pulse: 0 },
      { x: this.width * 0.65, y: this.height * 0.5, radius: 20, color: '#f43f5e', pulse: 0 }
    ];

    this.p1 = {
      x: 60,
      y: this.height / 2,
      w: 16,
      h: 90,
      color: '#0ea5e9',
      speed: 6.5
    };

    this.p2 = {
      x: this.width - 76,
      y: this.height / 2,
      w: 16,
      h: 90,
      color: '#f43f5e',
      speed: 6.5
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    // Move Paddles
    this.p1.y += p1Input.y * this.p1.speed;
    this.p1.y = Math.max(this.p1.h / 2 + 10, Math.min(this.height - this.p1.h / 2 - 10, this.p1.y));

    this.p2.y += p2Input.y * this.p2.speed;
    this.p2.y = Math.max(this.p2.h / 2 + 10, Math.min(this.height - this.p2.h / 2 - 10, this.p2.y));

    // Update Ball
    if (!this.roundEnding) {
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
      if (this.ball.trail.length > 8) this.ball.trail.shift();

      // Top / Bottom Bounce
      if (this.ball.y - this.ball.radius <= 12) {
        this.ball.y = 12 + this.ball.radius;
        this.ball.vy *= -1;
        sound.playBounce();
      } else if (this.ball.y + this.ball.radius >= this.height - 12) {
        this.ball.y = this.height - 12 - this.ball.radius;
        this.ball.vy *= -1;
        sound.playBounce();
      }

      // Bumpers Collision
      for (const b of this.bumpers) {
        if (b.pulse > 0) b.pulse -= 0.05;
        const dx = this.ball.x - b.x;
        const dy = this.ball.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.radius + this.ball.radius) {
          const nx = dx / dist;
          const ny = dy / dist;
          this.ball.vx = nx * 8;
          this.ball.vy = ny * 8;
          b.pulse = 1;
          sound.playHit();
          particles.shake(6, 8);
          particles.spawnSparks(b.x, b.y, b.color, 12, 5);
        }
      }

      // P1 Paddle Collision
      if (
        this.ball.x - this.ball.radius <= this.p1.x + this.p1.w &&
        this.ball.x + this.ball.radius >= this.p1.x &&
        this.ball.y >= this.p1.y - this.p1.h / 2 &&
        this.ball.y <= this.p1.y + this.p1.h / 2
      ) {
        this.ball.vx = Math.abs(this.ball.vx) * 1.06 + 0.5;
        const offset = (this.ball.y - this.p1.y) / (this.p1.h / 2);
        this.ball.vy = offset * 7;
        sound.playBounce(true);
        particles.spawnSparks(this.ball.x, this.ball.y, this.p1.color, 8);
      }

      // P2 Paddle Collision
      if (
        this.ball.x + this.ball.radius >= this.p2.x &&
        this.ball.x - this.ball.radius <= this.p2.x + this.p2.w &&
        this.ball.y >= this.p2.y - this.p2.h / 2 &&
        this.ball.y <= this.p2.y + this.p2.h / 2
      ) {
        this.ball.vx = -Math.abs(this.ball.vx) * 1.06 - 0.5;
        const offset = (this.ball.y - this.p2.y) / (this.p2.h / 2);
        this.ball.vy = offset * 7;
        sound.playBounce(true);
        particles.spawnSparks(this.ball.x, this.ball.y, this.p2.color, 8);
      }

      // Goal scoring
      if (this.ball.x < 10) {
        this.scoreGoal(2);
      } else if (this.ball.x > this.width - 10) {
        this.scoreGoal(1);
      }
    }
  }

  scoreGoal(scorer) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    sound.playGoal();
    particles.spawnExplosion(this.ball.x, this.ball.y, scorer === 1 ? '#0ea5e9' : '#f43f5e', 30);

    if (scorer === 1) this.p1Score++;
    else this.p2Score++;

    setTimeout(() => {
      if (this.p1Score >= this.targetScore || this.p2Score >= this.targetScore) {
        this.isOver = true;
        const winner = this.p1Score > this.p2Score ? 1 : 2;
        this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score });
      } else {
        this.resetRound();
      }
    }, 1800);
  }

  computeBotInput() {
    let moveY = 0;
    if (this.ball.y < this.p2.y - 12) moveY = -1;
    if (this.ball.y > this.p2.y + 12) moveY = 1;
    return { x: 0, y: moveY, action: false };
  }

  draw() {
    this.ctx.save();

    // Clean Pinball Board Background
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Board Border
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    // Center divider
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 10);
    this.ctx.lineTo(this.width / 2, this.height - 10);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Bumpers
    for (const b of this.bumpers) {
      this.ctx.save();
      this.ctx.translate(b.x, b.y);
      const scale = 1 + (b.pulse || 0) * 0.25;
      this.ctx.scale(scale, scale);

      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Ball Trail
    for (let i = 0; i < this.ball.trail.length; i++) {
      const pt = this.ball.trail[i];
      const alpha = (i + 1) / this.ball.trail.length;
      this.ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 0.4})`;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, this.ball.radius * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Ball
    this.ctx.fillStyle = this.ball.color;
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Paddles
    this.ctx.fillStyle = this.p1.color;
    this.ctx.beginPath();
    this.ctx.roundRect(this.p1.x, this.p1.y - this.p1.h / 2, this.p1.w, this.p1.h, 8);
    this.ctx.fill();

    this.ctx.fillStyle = this.p2.color;
    this.ctx.beginPath();
    this.ctx.roundRect(this.p2.x, this.p2.y - this.p2.h / 2, this.p2.w, this.p2.h, 8);
    this.ctx.fill();

    // Score HUD
    this.ctx.font = 'bold 24px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText(`${this.p1Score}`, this.width * 0.35, 45);
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText(`VS`, this.width * 0.5, 45);
    this.ctx.fillStyle = '#e11d48';
    this.ctx.fillText(`${this.p2Score}`, this.width * 0.65, 45);

    this.ctx.restore();
  }
}
