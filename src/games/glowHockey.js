/**
 * VERSUS - Glow Air Hockey / Battle Pong
 * High tempo neon physics, power smash shots, goal celebrations!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class GlowHockey {
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

    this.goalSize = this.height * 0.45;
    this.goalY = (this.height - this.goalSize) / 2;

    this.resetRound();
  }

  resetRound() {
    this.puck = {
      x: this.width / 2,
      y: this.height / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 4.5,
      vy: (Math.random() - 0.5) * 4,
      radius: 14,
      color: '#ffffff',
      trail: [],
      maxSpeed: 14.5
    };

    this.p1 = {
      x: 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 26,
      color: '#00f0ff',
      speed: 6.5,
      charge: 0,
      isCharging: false
    };

    this.p2 = {
      x: this.width - 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 26,
      color: '#ff2e63',
      speed: 6.5,
      charge: 0,
      isCharging: false
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    // 1. Bot AI for P2
    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    // 2. Update Paddles
    this.updatePaddle(this.p1, p1Input, 20, this.width / 2 - 30);
    this.updatePaddle(this.p2, p2Input, this.width / 2 + 30, this.width - 20);

    // 3. Update Puck
    if (!this.roundEnding) {
      this.puck.x += this.puck.vx;
      this.puck.y += this.puck.vy;

      // Friction / Drag
      this.puck.vx *= 0.992;
      this.puck.vy *= 0.992;

      // Puck Trail
      this.puck.trail.push({ x: this.puck.x, y: this.puck.y });
      if (this.puck.trail.length > 12) this.puck.trail.shift();

      // Top / Bottom Wall Bounces
      if (this.puck.y - this.puck.radius <= 12) {
        this.puck.y = 12 + this.puck.radius;
        this.puck.vy *= -1;
        sound.playBounce(true);
        particles.spawnSparks(this.puck.x, this.puck.y, '#ffffff', 5);
      } else if (this.puck.y + this.puck.radius >= this.height - 12) {
        this.puck.y = this.height - 12 - this.puck.radius;
        this.puck.vy *= -1;
        sound.playBounce(true);
        particles.spawnSparks(this.puck.x, this.puck.y, '#ffffff', 5);
      }

      // Left Wall / Goal
      if (this.puck.x - this.puck.radius <= 14) {
        if (this.puck.y >= this.goalY && this.puck.y <= this.goalY + this.goalSize) {
          // GOAL FOR P2
          this.scoreGoal(2);
        } else {
          this.puck.x = 14 + this.puck.radius;
          this.puck.vx *= -1;
          sound.playBounce();
          particles.spawnSparks(this.puck.x, this.puck.y, '#00f0ff', 6);
        }
      }

      // Right Wall / Goal
      if (this.puck.x + this.puck.radius >= this.width - 14) {
        if (this.puck.y >= this.goalY && this.puck.y <= this.goalY + this.goalSize) {
          // GOAL FOR P1
          this.scoreGoal(1);
        } else {
          this.puck.x = this.width - 14 - this.puck.radius;
          this.puck.vx *= -1;
          sound.playBounce();
          particles.spawnSparks(this.puck.x, this.puck.y, '#ff2e63', 6);
        }
      }

      // Paddle Collisions
      this.checkPaddleCollision(this.p1);
      this.checkPaddleCollision(this.p2);
    }
  }

  updatePaddle(paddle, input, minX, maxX) {
    paddle.vx = input.x * paddle.speed;
    paddle.vy = input.y * paddle.speed;

    paddle.x += paddle.vx;
    paddle.y += paddle.vy;

    // Boundaries
    paddle.x = Math.max(minX + paddle.radius, Math.min(maxX - paddle.radius, paddle.x));
    paddle.y = Math.max(14 + paddle.radius, Math.min(this.height - 14 - paddle.radius, paddle.y));

    // Power smash charge
    if (input.action) {
      paddle.charge = Math.min(paddle.charge + 0.05, 1);
      paddle.isCharging = true;
    } else {
      paddle.charge = 0;
      paddle.isCharging = false;
    }
  }

  checkPaddleCollision(paddle) {
    const dx = this.puck.x - paddle.x;
    const dy = this.puck.y - paddle.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.puck.radius + paddle.radius;

    if (dist < minDist) {
      // Normal vector
      const nx = dx / dist;
      const ny = dy / dist;

      // Push puck out of paddle overlap
      this.puck.x = paddle.x + nx * minDist;
      this.puck.y = paddle.y + ny * minDist;

      // Calculate impulse
      const boost = paddle.charge > 0.5 ? 1.7 : 1.15;
      const speed = Math.max(Math.hypot(this.puck.vx, this.puck.vy), 5) * boost;
      
      this.puck.vx = (nx * speed) + (paddle.vx * 0.4);
      this.puck.vy = (ny * speed) + (paddle.vy * 0.4);

      // Clamp max speed
      const curSpeed = Math.hypot(this.puck.vx, this.puck.vy);
      if (curSpeed > this.puck.maxSpeed) {
        this.puck.vx = (this.puck.vx / curSpeed) * this.puck.maxSpeed;
        this.puck.vy = (this.puck.vy / curSpeed) * this.puck.maxSpeed;
      }

      sound.playHit();
      particles.shake(paddle.charge > 0.5 ? 8 : 4, 6);
      particles.spawnSparks(this.puck.x, this.puck.y, paddle.color, 12, 5);

      if (paddle.charge > 0.5) {
        particles.addFloatingText('SMASH!', this.puck.x, this.puck.y - 20, paddle.color, 20);
        paddle.charge = 0;
      }
    }
  }

  scoreGoal(scorer) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    sound.playGoal();
    particles.spawnExplosion(this.puck.x, this.puck.y, scorer === 1 ? '#00f0ff' : '#ff2e63', 35);
    particles.shake(14, 20);

    if (scorer === 1) {
      this.p1Score++;
      particles.addFloatingText('GOAL!', this.width * 0.25, this.height / 2, '#00f0ff', 36);
    } else {
      this.p2Score++;
      particles.addFloatingText('GOAL!', this.width * 0.75, this.height / 2, '#ff2e63', 36);
    }

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
    let targetX = this.width * 0.75;
    let targetY = this.height / 2;
    let action = false;

    // Track puck if in right half
    if (this.puck.x > this.width * 0.45) {
      targetX = this.puck.x + 10;
      targetY = this.puck.y;
      if (Math.hypot(this.puck.x - this.p2.x, this.puck.y - this.p2.y) < 60) {
        action = Math.random() < 0.3;
      }
    } else {
      // Return to defensive goal position
      targetX = this.width - 100;
      targetY = this.puck.y * 0.6 + this.height * 0.2;
    }

    const dx = targetX - this.p2.x;
    const dy = targetY - this.p2.y;
    const dist = Math.hypot(dx, dy);

    return {
      x: dist > 5 ? dx / dist : 0,
      y: dist > 5 ? dy / dist : 0,
      action
    };
  }

  draw() {
    this.ctx.save();

    // 1. Rink Background
    this.ctx.fillStyle = '#060913';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Center divider & circle
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 8]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2, 10);
    this.ctx.lineTo(this.width / 2, this.height - 10);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.arc(this.width / 2, this.height / 2, 60, 0, Math.PI * 2);
    this.ctx.stroke();

    // Goal Areas
    // Left Goal (Cyan)
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 4;
    this.ctx.fillRect(4, this.goalY, 12, this.goalSize);
    this.ctx.strokeRect(4, this.goalY, 12, this.goalSize);

    // Right Goal (Red)
    this.ctx.fillStyle = 'rgba(255, 46, 99, 0.15)';
    this.ctx.strokeStyle = '#ff2e63';
    this.ctx.lineWidth = 4;
    this.ctx.fillRect(this.width - 16, this.goalY, 12, this.goalSize);
    this.ctx.strokeRect(this.width - 16, this.goalY, 12, this.goalSize);

    // Outer Rink Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    // 2. Puck Trail
    for (let i = 0; i < this.puck.trail.length; i++) {
      const pt = this.puck.trail[i];
      const alpha = (i + 1) / this.puck.trail.length;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, this.puck.radius * alpha * 0.8, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 3. Puck
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // 4. Paddles
    this.drawPaddle(this.p1);
    this.drawPaddle(this.p2);

    // 5. Score HUD
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawPaddle(paddle) {
    this.ctx.save();
    this.ctx.shadowColor = paddle.color;
    this.ctx.shadowBlur = 14;

    // Outer ring
    this.ctx.fillStyle = paddle.color;
    this.ctx.beginPath();
    this.ctx.arc(paddle.x, paddle.y, paddle.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Inner core
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(paddle.x, paddle.y, paddle.radius * 0.55, 0, Math.PI * 2);
    this.ctx.fill();

    // Smash charge ring
    if (paddle.charge > 0) {
      this.ctx.strokeStyle = '#ffd166';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(paddle.x, paddle.y, paddle.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * paddle.charge);
      this.ctx.stroke();
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
