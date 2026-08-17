/**
 * VERSUS - Micro Soccer Mini-Game
 * Bouncy capsule physics, aerial jumps, flip kicks, goal celebrations!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class MicroSoccer {
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

    this.groundY = this.height * 0.82;
    this.goalWidth = 45;
    this.goalHeight = 110;

    this.resetRound();
  }

  resetRound() {
    this.ball = {
      x: this.width / 2,
      y: this.groundY - 140,
      vx: (Math.random() - 0.5) * 3,
      vy: -4,
      radius: 16,
      gravity: 0.32,
      bounce: 0.78,
      rotation: 0
    };

    this.p1 = {
      x: 160,
      y: this.groundY - 25,
      vx: 0,
      vy: 0,
      w: 28,
      h: 46,
      radius: 14,
      color: '#0ea5e9',
      isGrounded: true,
      flipAngle: 0,
      isFlipping: false
    };

    this.p2 = {
      x: this.width - 160,
      y: this.groundY - 25,
      vx: 0,
      vy: 0,
      w: 28,
      h: 46,
      radius: 14,
      color: '#f43f5e',
      isGrounded: true,
      flipAngle: 0,
      isFlipping: false
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    this.updatePlayer(this.p1, p1Input, 1);
    this.updatePlayer(this.p2, p2Input, -1);

    if (!this.roundEnding) {
      this.ball.vy += this.ball.gravity;
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;
      this.ball.vx *= 0.99;
      this.ball.rotation += this.ball.vx * 0.08;

      if (this.ball.y + this.ball.radius >= this.groundY) {
        this.ball.y = this.groundY - this.ball.radius;
        this.ball.vy = -this.ball.vy * this.ball.bounce;
        if (Math.abs(this.ball.vy) > 2) sound.playBounce();
      }

      if (this.ball.y - this.ball.radius <= 10) {
        this.ball.y = 10 + this.ball.radius;
        this.ball.vy *= -1;
      }

      if (this.ball.x - this.ball.radius <= this.goalWidth) {
        if (this.ball.y >= this.groundY - this.goalHeight) {
          this.scoreGoal(2);
        } else {
          this.ball.x = this.goalWidth + this.ball.radius;
          this.ball.vx = -this.ball.vx * this.ball.bounce;
          sound.playBounce();
        }
      }

      if (this.ball.x + this.ball.radius >= this.width - this.goalWidth) {
        if (this.ball.y >= this.groundY - this.goalHeight) {
          this.scoreGoal(1);
        } else {
          this.ball.x = this.width - this.goalWidth - this.ball.radius;
          this.ball.vx = -this.ball.vx * this.ball.bounce;
          sound.playBounce();
        }
      }

      this.checkPlayerBallCollision(this.p1, 1);
      this.checkPlayerBallCollision(this.p2, -1);
    }
  }

  updatePlayer(p, input, facing) {
    const moveSpeed = 4.8;
    const jumpForce = -9.2;
    const gravity = 0.42;

    p.vx = input.x * moveSpeed;
    p.x += p.vx;

    p.x = Math.max(this.goalWidth + p.radius, Math.min(this.width - this.goalWidth - p.radius, p.x));

    if ((input.y < -0.5 || input.action) && p.isGrounded) {
      p.vy = jumpForce;
      p.isGrounded = false;
      sound.playShoot();
      particles.spawnSparks(p.x, p.y + p.h / 2, p.color, 4);
    }

    if (input.action && !p.isGrounded) {
      p.isFlipping = true;
      p.flipAngle += facing * 0.35;
    } else {
      p.flipAngle = 0;
      p.isFlipping = false;
    }

    p.vy += gravity;
    p.y += p.vy;

    if (p.y >= this.groundY - p.h / 2) {
      p.y = this.groundY - p.h / 2;
      p.vy = 0;
      p.isGrounded = true;
    }
  }

  checkPlayerBallCollision(p, facing) {
    const dx = this.ball.x - p.x;
    const dy = this.ball.y - p.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.ball.radius + p.radius;

    if (dist < minDist) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      this.ball.x = p.x + nx * minDist;
      this.ball.y = p.y + ny * minDist;

      const kickPower = p.isFlipping ? 12 : 7.5;
      this.ball.vx = nx * kickPower + p.vx * 0.6;
      this.ball.vy = ny * kickPower + p.vy * 0.6;

      sound.playHit();
      particles.shake(p.isFlipping ? 8 : 4, 6);
      particles.spawnSparks(this.ball.x, this.ball.y, p.color, 8, 4);

      if (p.isFlipping) {
        particles.addFloatingText('BICYCLE KICK!', p.x, p.y - 25, p.color, 18);
      }
    }
  }

  scoreGoal(scorer) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    sound.playGoal();
    particles.spawnExplosion(this.ball.x, this.ball.y, scorer === 1 ? '#0ea5e9' : '#f43f5e', 35);
    particles.shake(14, 20);

    if (scorer === 1) {
      this.p1Score++;
      particles.addFloatingText('GOAL!', this.width * 0.3, this.height * 0.4, '#0ea5e9', 36);
    } else {
      this.p2Score++;
      particles.addFloatingText('GOAL!', this.width * 0.7, this.height * 0.4, '#f43f5e', 36);
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
    let moveX = 0;
    let jump = false;

    const dx = this.ball.x - this.p2.x;
    if (dx < -15) moveX = -1;
    if (dx > 15) moveX = 1;

    if (Math.abs(dx) < 60 && this.ball.y < this.p2.y - 20) {
      jump = true;
    }

    return {
      x: moveX,
      y: jump ? -1 : 0,
      action: jump && Math.random() < 0.4
    };
  }

  draw() {
    this.ctx.save();

    // Stadium Sky
    this.ctx.fillStyle = '#e0f2fe';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Lush Green Pitch
    this.ctx.fillStyle = '#22c55e';
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    // Goal Posts
    this.ctx.strokeStyle = '#0ea5e9';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);
    this.ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
    this.ctx.fillRect(0, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);

    this.ctx.strokeStyle = '#f43f5e';
    this.ctx.strokeRect(this.width - this.goalWidth, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);
    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    this.ctx.fillRect(this.width - this.goalWidth, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);

    // Ball
    this.ctx.save();
    this.ctx.translate(this.ball.x, this.ball.y);
    this.ctx.rotate(this.ball.rotation);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fill();
    for (let a = 0; a < 5; a++) {
      const ang = (a * Math.PI * 2) / 5;
      this.ctx.fillRect(Math.cos(ang) * 9 - 2, Math.sin(ang) * 9 - 2, 4, 4);
    }
    this.ctx.restore();

    // Players
    this.drawCapsulePlayer(this.p1);
    this.drawCapsulePlayer(this.p2);

    // Score HUD
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawCapsulePlayer(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.flipAngle);

    this.ctx.fillStyle = p.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.radius);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-6, -p.h / 2 + 8, 12, 6);

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
