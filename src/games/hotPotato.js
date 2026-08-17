/**
 * VERSUS - Hot Potato Mini-Game
 * Ticking fuse bomb, frantic arena chase, collision tag & throw passing, sudden explosion knockouts!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class HotPotato {
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

    this.bumpers = [
      { x: this.width * 0.3, y: this.height * 0.35, r: 24, pulse: 0 },
      { x: this.width * 0.7, y: this.height * 0.35, r: 24, pulse: 0 },
      { x: this.width * 0.5, y: this.height * 0.5, r: 30, pulse: 0 },
      { x: this.width * 0.3, y: this.height * 0.65, r: 24, pulse: 0 },
      { x: this.width * 0.7, y: this.height * 0.65, r: 24, pulse: 0 }
    ];

    this.resetRound();
  }

  resetRound() {
    this.bombHolder = Math.random() > 0.5 ? 1 : 2;
    this.fuseTime = 420; // ~7 seconds at 60fps
    this.maxFuseTime = 420;
    this.tagCooldown = 0; // prevent instant re-tags
    this.flyingBomb = null; // { x, y, vx, vy, life }

    let p2Speed = 4.8;
    if (this.difficulty === 'baby') p2Speed = 2.8;
    else if (this.difficulty === 'hard') p2Speed = 5.8;
    else if (this.difficulty === 'demon') p2Speed = 6.8;

    this.p1 = {
      x: 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      speed: 4.8,
      r: 22,
      color: '#0ea5e9',
      alive: true
    };

    this.p2 = {
      x: this.width - 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      speed: p2Speed,
      r: 22,
      color: '#f43f5e',
      alive: true
    };

    this.roundEnding = false;
    if (this.onRoundReset) this.onRoundReset();
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2 && this.p2.alive && this.p1.alive) {
      p2Input = this.computeBotInput();
    }

    if (this.tagCooldown > 0) this.tagCooldown--;

    this.updatePlayer(this.p1, p1Input, 1);
    this.updatePlayer(this.p2, p2Input, 2);

    if (!this.roundEnding) {
      // Fuse countdown
      this.fuseTime--;

      // Spitting fuse sparks
      const holder = this.bombHolder === 1 ? this.p1 : this.p2;
      if (Math.random() < 0.45) {
        particles.spawnSparks(holder.x, holder.y - 30, '#f59e0b', 3, 2);
      }

      // Faster ticks as fuse runs out
      if (this.fuseTime % Math.max(8, Math.floor(this.fuseTime / 8)) === 0) {
        sound.playCountdown(400 + (1 - this.fuseTime / this.maxFuseTime) * 600);
        if (this.fuseTime < 120) {
          particles.shake(3, 4);
        }
      }

      // Detonation!
      if (this.fuseTime <= 0) {
        this.detonateBomb();
      }

      // Collision Tagging
      this.checkTagCollision();
    }
  }

  updatePlayer(p, input, playerNum) {
    if (!p.alive) return;

    p.vx = input.x * p.speed;
    p.y += input.y * p.speed;
    p.x += p.vx;

    // Arena Bounds
    p.x = Math.max(30 + p.r, Math.min(this.width - 30 - p.r, p.x));
    p.y = Math.max(30 + p.r, Math.min(this.height - 30 - p.r, p.y));

    // Bumper Collisions
    for (const b of this.bumpers) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < p.r + b.r) {
        const nx = dx / (dist || 1);
        const ny = dy / (dist || 1);
        p.x = b.x + nx * (p.r + b.r);
        p.y = b.y + ny * (p.r + b.r);
        b.pulse = 1;
        sound.playBounce(true);
        particles.spawnSparks(b.x, b.y, '#f59e0b', 8, 4);
      }
    }

    // Action Dash Tag / Throw
    if (input.justAction && this.bombHolder === playerNum && this.tagCooldown <= 0) {
      p.x += (playerNum === 1 ? 1 : -1) * 20;
      sound.playShoot('laser');
      particles.spawnTrail(p.x, p.y, '#f59e0b', 4);
    }
  }

  checkTagCollision() {
    if (this.tagCooldown > 0) return;

    const dx = this.p1.x - this.p2.x;
    const dy = this.p1.y - this.p2.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.p1.r + this.p2.r + 6) {
      // Pass the hot potato!
      this.bombHolder = this.bombHolder === 1 ? 2 : 1;
      this.tagCooldown = 40; // 0.6s grace period

      sound.playHit();
      sound.playShoot('tank');
      particles.shake(8, 10);
      particles.spawnExplosion((this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2, '#f59e0b', 18);
      particles.addFloatingText('TAGGED!', (this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2 - 25, '#f59e0b', 24);
    }
  }

  detonateBomb() {
    if (this.roundEnding) return;
    this.roundEnding = true;

    const victim = this.bombHolder === 1 ? this.p1 : this.p2;
    victim.alive = false;

    sound.playExplosion();
    particles.shake(20, 25);
    particles.spawnExplosion(victim.x, victim.y, '#ef4444', 50);

    if (this.bombHolder === 1) {
      this.p2Score++;
      particles.addFloatingText('KABOOM! PINK WINS ROUND!', this.width / 2, this.height * 0.25, '#f43f5e', 28);
    } else {
      this.p1Score++;
      particles.addFloatingText('KABOOM! BLUE WINS ROUND!', this.width / 2, this.height * 0.25, '#0ea5e9', 28);
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

  computeBotInput() {
    const isHolder = this.bombHolder === 2;
    let targetX = this.p1.x;
    let targetY = this.p1.y;

    if (isHolder) {
      // Chase player to pass the bomb!
      if (this.difficulty === 'demon') {
        targetX += this.p1.vx * 4;
      }
    } else {
      // Run away from player!
      targetX = this.p2.x + (this.p2.x - this.p1.x) * 2;
      targetY = this.p2.y + (this.p2.y - this.p1.y) * 2;

      // Keep bot inside safe arena zone
      targetX = Math.max(80, Math.min(this.width - 80, targetX));
      targetY = Math.max(80, Math.min(this.height - 80, targetY));
    }

    if (this.difficulty === 'baby') {
      targetX += (Math.random() - 0.5) * 80;
      targetY += (Math.random() - 0.5) * 80;
    }

    const dx = targetX - this.p2.x;
    const dy = targetY - this.p2.y;
    const dist = Math.hypot(dx, dy);

    return {
      x: dist > 10 ? dx / dist : 0,
      y: dist > 10 ? dy / dist : 0,
      action: isHolder && dist < 70
    };
  }

  draw() {
    this.ctx.save();

    // Background
    this.ctx.fillStyle = '#fef2f2';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Arena Perimeter
    this.ctx.strokeStyle = '#fca5a5';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(20, 20, this.width - 40, this.height - 40);

    // Bumpers
    for (const b of this.bumpers) {
      if (b.pulse > 0) b.pulse -= 0.04;
      const scale = 1 + (b.pulse || 0) * 0.2;
      this.ctx.save();
      this.ctx.translate(b.x, b.y);
      this.ctx.scale(scale, scale);

      this.ctx.fillStyle = '#f59e0b';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, b.r * 0.45, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Players
    if (this.p1.alive) this.drawPlayer(this.p1, 1);
    if (this.p2.alive) this.drawPlayer(this.p2, 2);

    // Fuse Timer Bar
    const fuseRatio = Math.max(0, this.fuseTime / this.maxFuseTime);
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillRect(this.width / 2 - 120, 28, 240, 10);
    this.ctx.fillStyle = fuseRatio < 0.3 ? '#ef4444' : fuseRatio < 0.6 ? '#f59e0b' : '#10b981';
    this.ctx.fillRect(this.width / 2 - 120, 28, 240 * fuseRatio, 10);

    // Score HUD
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawPlayer(p, playerNum) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);

    // Player Circle
    this.ctx.fillStyle = p.color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, p.r * 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    // Hot Potato Bomb on Holder
    if (this.bombHolder === playerNum) {
      const bobY = Math.sin(performance.now() * 0.01) * 4;
      this.ctx.translate(0, -p.r - 18 + bobY);

      // Bomb Sphere
      this.ctx.fillStyle = '#1e293b';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.fill();

      // Glowing Danger Aura
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // Fuse & Spark
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -14);
      this.ctx.quadraticCurveTo(8, -24, 4, -28);
      this.ctx.stroke();

      this.ctx.fillStyle = '#fbbf24';
      this.ctx.beginPath();
      this.ctx.arc(4, -28, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawScoreHUD() {
    this.ctx.save();
    this.ctx.font = 'bold 24px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText(`P1: ${this.p1Score}`, this.width * 0.2, 38);

    this.ctx.fillStyle = '#e11d48';
    this.ctx.fillText(`P2: ${this.p2Score}`, this.width * 0.8, 38);
    this.ctx.restore();
  }
}
