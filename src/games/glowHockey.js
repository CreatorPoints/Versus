/**
 * VERSUS - Glow Air Hockey Mini-Game
 * High tempo arcade physics, power smash shots, AI difficulties!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class GlowHockey {
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
      color: '#1e293b',
      trail: [],
      maxSpeed: 14.5
    };

    let p2Speed = 6.8;
    if (this.difficulty === 'baby') p2Speed = 3.6;
    else if (this.difficulty === 'hard') p2Speed = 9.2;
    else if (this.difficulty === 'demon') p2Speed = 12.0;

    this.p1 = {
      x: 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 26,
      color: '#0ea5e9',
      speed: 6.8,
      charge: 0,
      isCharging: false
    };

    this.p2 = {
      x: this.width - 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 26,
      color: '#f43f5e',
      speed: p2Speed,
      charge: 0,
      isCharging: false
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    this.updatePaddle(this.p1, p1Input, 20, this.width / 2 - 30);
    this.updatePaddle(this.p2, p2Input, this.width / 2 + 30, this.width - 20);

    if (!this.roundEnding) {
      this.puck.x += this.puck.vx;
      this.puck.y += this.puck.vy;

      this.puck.vx *= 0.992;
      this.puck.vy *= 0.992;

      this.puck.trail.push({ x: this.puck.x, y: this.puck.y });
      if (this.puck.trail.length > 10) this.puck.trail.shift();

      if (this.puck.y - this.puck.radius <= 12) {
        this.puck.y = 12 + this.puck.radius;
        this.puck.vy *= -1;
        sound.playBounce(true);
        particles.spawnSparks(this.puck.x, this.puck.y, '#f59e0b', 5);
      } else if (this.puck.y + this.puck.radius >= this.height - 12) {
        this.puck.y = this.height - 12 - this.puck.radius;
        this.puck.vy *= -1;
        sound.playBounce(true);
        particles.spawnSparks(this.puck.x, this.puck.y, '#f59e0b', 5);
      }

      if (this.puck.x - this.puck.radius <= 14) {
        if (this.puck.y >= this.goalY && this.puck.y <= this.goalY + this.goalSize) {
          this.scoreGoal(2);
        } else {
          this.puck.x = 14 + this.puck.radius;
          this.puck.vx *= -1;
          sound.playBounce();
          particles.spawnSparks(this.puck.x, this.puck.y, '#0ea5e9', 6);
        }
      }

      if (this.puck.x + this.puck.radius >= this.width - 14) {
        if (this.puck.y >= this.goalY && this.puck.y <= this.goalY + this.goalSize) {
          this.scoreGoal(1);
        } else {
          this.puck.x = this.width - 14 - this.puck.radius;
          this.puck.vx *= -1;
          sound.playBounce();
          particles.spawnSparks(this.puck.x, this.puck.y, '#f43f5e', 6);
        }
      }

      this.checkPaddleCollision(this.p1);
      this.checkPaddleCollision(this.p2);
    }
  }

  updatePaddle(paddle, input, minX, maxX) {
    paddle.vx = input.x * paddle.speed;
    paddle.vy = input.y * paddle.speed;

    paddle.x += paddle.vx;
    paddle.y += paddle.vy;

    paddle.x = Math.max(minX + paddle.radius, Math.min(maxX - paddle.radius, paddle.x));
    paddle.y = Math.max(14 + paddle.radius, Math.min(this.height - 14 - paddle.radius, paddle.y));

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
      const nx = dx / dist;
      const ny = dy / dist;

      this.puck.x = paddle.x + nx * minDist;
      this.puck.y = paddle.y + ny * minDist;

      const boost = paddle.charge > 0.5 ? 1.7 : 1.15;
      const speed = Math.max(Math.hypot(this.puck.vx, this.puck.vy), 5.5) * boost;
      
      this.puck.vx = (nx * speed) + (paddle.vx * 0.4);
      this.puck.vy = (ny * speed) + (paddle.vy * 0.4);

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
    particles.spawnExplosion(this.puck.x, this.puck.y, scorer === 1 ? '#0ea5e9' : '#f43f5e', 35);
    particles.shake(14, 20);

    if (scorer === 1) {
      this.p1Score++;
      particles.addFloatingText('GOAL!', this.width * 0.25, this.height / 2, '#0ea5e9', 36);
    } else {
      this.p2Score++;
      particles.addFloatingText('GOAL!', this.width * 0.75, this.height / 2, '#f43f5e', 36);
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

    if (this.difficulty === 'baby') {
      if (this.puck.x > this.width * 0.6) {
        targetX = this.puck.x + 20;
        targetY = this.puck.y + (Math.random() - 0.5) * 40;
      } else {
        targetX = this.width - 80;
        targetY = this.height / 2;
      }
    } else if (this.difficulty === 'normal') {
      if (this.puck.x > this.width * 0.45) {
        targetX = this.puck.x + 10;
        targetY = this.puck.y;
        if (Math.hypot(this.puck.x - this.p2.x, this.puck.y - this.p2.y) < 60) {
          action = Math.random() < 0.3;
        }
      } else {
        targetX = this.width - 100;
        targetY = this.puck.y * 0.6 + this.height * 0.2;
      }
    } else if (this.difficulty === 'hard') {
      // Intercept puck trajectory
      const leadTime = 6;
      targetX = Math.min(this.width - 40, Math.max(this.width / 2 + 40, this.puck.x + this.puck.vx * leadTime));
      targetY = this.puck.y + this.puck.vy * leadTime;
      action = Math.random() < 0.65;
    } else if (this.difficulty === 'demon') {
      // Aggressive instant prediction
      targetX = Math.min(this.width - 30, Math.max(this.width / 2 + 30, this.puck.x + this.puck.vx * 4));
      targetY = this.puck.y + this.puck.vy * 4;
      action = true;
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

    this.ctx.fillStyle = '#f0f9ff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = '#bae6fd';
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

    this.ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
    this.ctx.strokeStyle = '#0ea5e9';
    this.ctx.lineWidth = 4;
    this.ctx.fillRect(4, this.goalY, 12, this.goalSize);
    this.ctx.strokeRect(4, this.goalY, 12, this.goalSize);

    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    this.ctx.strokeStyle = '#f43f5e';
    this.ctx.lineWidth = 4;
    this.ctx.fillRect(this.width - 16, this.goalY, 12, this.goalSize);
    this.ctx.strokeRect(this.width - 16, this.goalY, 12, this.goalSize);

    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    for (let i = 0; i < this.puck.trail.length; i++) {
      const pt = this.puck.trail[i];
      const alpha = (i + 1) / this.puck.trail.length;
      this.ctx.fillStyle = `rgba(30, 41, 59, ${alpha * 0.25})`;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, this.puck.radius * alpha * 0.8, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.drawPaddle(this.p1);
    this.drawPaddle(this.p2);

    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawPaddle(paddle) {
    this.ctx.save();
    this.ctx.fillStyle = paddle.color;
    this.ctx.beginPath();
    this.ctx.arc(paddle.x, paddle.y, paddle.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(paddle.x, paddle.y, paddle.radius * 0.55, 0, Math.PI * 2);
    this.ctx.fill();

    if (paddle.charge > 0) {
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(paddle.x, paddle.y, paddle.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * paddle.charge);
      this.ctx.stroke();
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
