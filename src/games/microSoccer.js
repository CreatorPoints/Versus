/**
 * VERSUS - Micro Soccer Mini-Game
 * Bouncy capsule physics, dynamic burst acceleration, sliding friction, aerial bicycle kicks, crowd SFX!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class MicroSoccer {
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

    let p2Speed = 6.2;
    if (this.difficulty === 'baby') p2Speed = 3.8;
    else if (this.difficulty === 'hard') p2Speed = 7.2;
    else if (this.difficulty === 'demon') p2Speed = 8.4;

    this.p1 = {
      x: 160,
      y: this.groundY - 25,
      vx: 0,
      vy: 0,
      w: 28,
      h: 46,
      radius: 14,
      color: '#0ea5e9',
      speed: 6.2,
      isGrounded: true,
      flipAngle: 0,
      isFlipping: false,
      squashX: 1,
      squashY: 1,
      tilt: 0
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
      speed: p2Speed,
      isGrounded: true,
      flipAngle: 0,
      isFlipping: false,
      squashX: 1,
      squashY: 1,
      tilt: 0
    };

    this.roundEnding = false;

    // Start looping football crowd ambience
    sound.playFootballCrowd();

    if (this.onRoundReset) this.onRoundReset();
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
        if (Math.abs(this.ball.vy) > 1.8) sound.playBallBounce();
      }

      if (this.ball.y - this.ball.radius <= 10) {
        this.ball.y = 10 + this.ball.radius;
        this.ball.vy *= -1;
        sound.playBallBounce(true);
      }

      if (this.ball.x - this.ball.radius <= this.goalWidth) {
        if (this.ball.y >= this.groundY - this.goalHeight) {
          this.scoreGoal(2);
        } else {
          this.ball.x = this.goalWidth + this.ball.radius;
          this.ball.vx = -this.ball.vx * this.ball.bounce;
          sound.playBallBounce();
        }
      }

      if (this.ball.x + this.ball.radius >= this.width - this.goalWidth) {
        if (this.ball.y >= this.groundY - this.goalHeight) {
          this.scoreGoal(1);
        } else {
          this.ball.x = this.width - this.goalWidth - this.ball.radius;
          this.ball.vx = -this.ball.vx * this.ball.bounce;
          sound.playBallBounce();
        }
      }

      this.checkPlayerBallCollision(this.p1, 1);
      this.checkPlayerBallCollision(this.p2, -1);
    }
  }

  updatePlayer(p, input, facing) {
    const maxSpeed = p.speed;
    const burstAccel = 1.35;
    const groundFriction = 0.88;
    const airFriction = 0.97;
    const jumpForce = -9.8;
    const gravity = 0.44;

    // 1. Dynamic Burst Start & Sliding Stop
    if (Math.abs(input.x) > 0.1) {
      if (Math.sign(input.x) !== Math.sign(p.vx) && Math.abs(p.vx) > 1.8) {
        // Skid turn
        p.vx += input.x * burstAccel * 1.6;
        if (p.isGrounded && Math.random() < 0.4) {
          particles.spawnSparks(p.x, this.groundY - 4, '#ffffff', 3, 2);
        }
      } else {
        // Fast burst acceleration
        p.vx += input.x * burstAccel;
      }
      p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
    } else {
      // Inertial slide on stop
      const friction = p.isGrounded ? groundFriction : airFriction;
      p.vx *= friction;

      if (p.isGrounded && Math.abs(p.vx) > 2.2 && Math.random() < 0.25) {
        particles.spawnTrail(p.x, this.groundY - 2, 'rgba(255, 255, 255, 0.4)', 2.5);
      }
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
    }

    p.x += p.vx;
    p.x = Math.max(this.goalWidth + p.radius, Math.min(this.width - this.goalWidth - p.radius, p.x));

    // 2. Jump Dynamics & Squash/Stretch
    if ((input.y < -0.5 || input.action) && p.isGrounded) {
      p.vy = jumpForce;
      p.isGrounded = false;
      p.squashX = 0.78;
      p.squashY = 1.3;
      sound.playBallKick();
      particles.spawnSparks(p.x, this.groundY, p.color, 6, 3);
    }

    // 3. Air Flip
    if (input.action && !p.isGrounded) {
      p.isFlipping = true;
      p.flipAngle += facing * 0.38;
    } else {
      p.flipAngle = 0;
      p.isFlipping = false;
    }

    p.vy += gravity;
    p.y += p.vy;

    // Ground Landing & Squash
    if (p.y >= this.groundY - p.h / 2) {
      if (!p.isGrounded && p.vy > 3) {
        p.squashX = 1.25;
        p.squashY = 0.8;
        particles.spawnSparks(p.x, this.groundY, '#ffffff', 4, 1.5);
      }
      p.y = this.groundY - p.h / 2;
      p.vy = 0;
      p.isGrounded = true;
    }

    // Recover squash & stretch
    p.squashX += (1 - p.squashX) * 0.18;
    p.squashY += (1 - p.squashY) * 0.18;

    // Dynamic tilt in sprint / skid
    const targetTilt = p.isGrounded ? (p.vx / maxSpeed) * 0.22 : 0;
    p.tilt += (targetTilt - p.tilt) * 0.25;
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

      const kickPower = p.isFlipping ? 13.0 : 8.2;
      this.ball.vx = nx * kickPower + p.vx * 0.65;
      this.ball.vy = ny * kickPower + p.vy * 0.65;

      sound.playBallKick();
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

    sound.playCheer();
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
    }, 2000);
  }

  computeBotInput() {
    let moveX = 0;
    let jump = false;
    let action = false;

    const dx = this.ball.x - this.p2.x;
    
    if (this.difficulty === 'baby') {
      if (dx < -25) moveX = -1;
      if (dx > 25) moveX = 1;
      jump = Math.random() < 0.05;
    } else if (this.difficulty === 'normal') {
      if (dx < -15) moveX = -1;
      if (dx > 15) moveX = 1;
      if (Math.abs(dx) < 60 && this.ball.y < this.p2.y - 20) {
        jump = true;
        action = Math.random() < 0.4;
      }
    } else if (this.difficulty === 'hard') {
      if (dx < -10) moveX = -1;
      if (dx > 10) moveX = 1;
      if (Math.abs(dx) < 70 && this.ball.y < this.p2.y - 15) {
        jump = true;
        action = true;
      }
    } else if (this.difficulty === 'demon') {
      const targetX = this.ball.x + this.ball.vx * 4;
      moveX = targetX > this.p2.x ? 1 : -1;
      if (Math.abs(this.ball.x - this.p2.x) < 80 && this.ball.y < this.p2.y) {
        jump = true;
        action = true;
      }
    }

    return {
      x: moveX,
      y: jump ? -1 : 0,
      action
    };
  }

  draw() {
    this.ctx.save();

    this.ctx.fillStyle = '#e0f2fe';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#22c55e';
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    this.ctx.strokeStyle = '#0ea5e9';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);
    this.ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
    this.ctx.fillRect(0, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);

    this.ctx.strokeStyle = '#f43f5e';
    this.ctx.strokeRect(this.width - this.goalWidth, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);
    this.ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    this.ctx.fillRect(this.width - this.goalWidth, this.groundY - this.goalHeight, this.goalWidth, this.goalHeight);

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

    this.drawCapsulePlayer(this.p1);
    this.drawCapsulePlayer(this.p2);

    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawCapsulePlayer(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.isFlipping ? p.flipAngle : p.tilt);
    this.ctx.scale(p.squashX, p.squashY);

    // Dynamic ground shadow
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, p.h / 2, p.w * 0.7, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Capsule body
    this.ctx.fillStyle = p.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.radius);
    this.ctx.fill();

    // Player headband / visor
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-p.w * 0.35, -p.h / 2 + 8, p.w * 0.7, 6);

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
