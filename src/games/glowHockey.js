/**
 * VERSUS - Glow Air Hockey Mini-Game
 * Fluid Mouse Tracking + Keyboard + Touch, Power Smash, AI Difficulties!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';
import { input } from '../engine/input.js';

export class GlowHockey {
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
      maxSpeed: 15.0
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
      speed: 7.2,
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
    if (this.onRoundReset) this.onRoundReset();
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    this.updateP1Paddle(p1Input, 20, this.width / 2 - 25);
    this.updateP2Paddle(p2Input, this.width / 2 + 25, this.width - 20);

    if (!this.roundEnding) {
      this.puck.x += this.puck.vx;
      this.puck.y += this.puck.vy;

      this.puck.vx *= 0.993;
      this.puck.vy *= 0.993;

      this.puck.trail.push({ x: this.puck.x, y: this.puck.y });
      if (this.puck.trail.length > 8) this.puck.trail.shift();

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

  updateP1Paddle(p1Input, minX, maxX) {
    const prevX = this.p1.x;
    const prevY = this.p1.y;

    const hasKeyboardMove = Math.abs(p1Input.x) > 0.1 || Math.abs(p1Input.y) > 0.1;
    const isMouseRecent = (performance.now() - input.mouse.lastMoveTime) < 3000;

    if (hasKeyboardMove || !isMouseRecent) {
      this.p1.vx = p1Input.x * this.p1.speed;
      this.p1.vy = p1Input.y * this.p1.speed;
      this.p1.x += this.p1.vx;
      this.p1.y += this.p1.vy;
    } else {
      const targetX = Math.max(minX + this.p1.radius, Math.min(maxX - this.p1.radius, input.mouse.canvasX));
      const targetY = Math.max(14 + this.p1.radius, Math.min(this.height - 14 - this.p1.radius, input.mouse.canvasY));
      
      this.p1.x += (targetX - this.p1.x) * 0.45;
      this.p1.y += (targetY - this.p1.y) * 0.45;
      this.p1.vx = this.p1.x - prevX;
      this.p1.vy = this.p1.y - prevY;
    }

    this.p1.x = Math.max(minX + this.p1.radius, Math.min(maxX - this.p1.radius, this.p1.x));
    this.p1.y = Math.max(14 + this.p1.radius, Math.min(this.height - 14 - this.p1.radius, this.p1.y));

    if (p1Input.action || input.mouse.down) {
      this.p1.charge = Math.min(this.p1.charge + 0.05, 1);
      this.p1.isCharging = true;
    } else {
      this.p1.charge = 0;
      this.p1.isCharging = false;
    }
  }

  updateP2Paddle(p2Input, minX, maxX) {
    this.p2.vx = p2Input.x * this.p2.speed;
    this.p2.vy = p2Input.y * this.p2.speed;

    this.p2.x += this.p2.vx;
    this.p2.y += this.p2.vy;

    this.p2.x = Math.max(minX + this.p2.radius, Math.min(maxX - this.p2.radius, this.p2.x));
    this.p2.y = Math.max(14 + this.p2.radius, Math.min(this.height - 14 - this.p2.radius, this.p2.y));

    if (p2Input.action) {
      this.p2.charge = Math.min(this.p2.charge + 0.05, 1);
      this.p2.isCharging = true;
    } else {
      this.p2.charge = 0;
      this.p2.isCharging = false;
    }
  }

  checkPaddleCollision(paddle) {
    const dx = this.puck.x - paddle.x;
    const dy = this.puck.y - paddle.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.puck.radius + paddle.radius;

    if (dist < minDist) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      this.puck.x = paddle.x + nx * minDist;
      this.puck.y = paddle.y + ny * minDist;

      const boost = paddle.charge > 0.5 ? 1.75 : 1.18;
      const speed = Math.max(Math.hypot(this.puck.vx, this.puck.vy), 5.8) * boost;
      
      this.puck.vx = (nx * speed) + (paddle.vx * 0.45);
      this.puck.vy = (ny * speed) + (paddle.vy * 0.45);

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
      const leadTime = 6;
      targetX = Math.min(this.width - 40, Math.max(this.width / 2 + 40, this.puck.x + this.puck.vx * leadTime));
      targetY = this.puck.y + this.puck.vy * leadTime;
      action = Math.random() < 0.65;
    } else if (this.difficulty === 'demon') {
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

  getNetworkState() {
    return {
      puck: { x: this.puck.x, y: this.puck.y, vx: this.puck.vx, vy: this.puck.vy },
      p1: { x: this.p1.x, y: this.p1.y },
      p2: { x: this.p2.x, y: this.p2.y },
      p1Score: this.p1Score,
      p2Score: this.p2Score
    };
  }

  applyNetworkState(state) {
    if (!state) return;
    if (state.puck) {
      this.puck.x = state.puck.x;
      this.puck.y = state.puck.y;
      this.puck.vx = state.puck.vx;
      this.puck.vy = state.puck.vy;
    }
    if (state.p1) {
      this.p1.x = state.p1.x;
      this.p1.y = state.p1.y;
    }
    if (state.p2) {
      this.p2.x = state.p2.x;
      this.p2.y = state.p2.y;
    }
    if (state.p1Score !== undefined) this.p1Score = state.p1Score;
    if (state.p2Score !== undefined) this.p2Score = state.p2Score;
  }
}
