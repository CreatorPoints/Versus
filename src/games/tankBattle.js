/**
 * VERSUS - Tank Battle Mini-Game
 * Bouncing bullets, destructible obstacles, tank treads, AI difficulties!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class TankBattle {
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
    this.bullets = [];
    this.treadMarks = [];
    this.obstacles = [
      { x: this.width * 0.25, y: this.height * 0.25, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.75 - 40, y: this.height * 0.25, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.25, y: this.height * 0.75 - 40, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.75 - 40, y: this.height * 0.75 - 40, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.5 - 25, y: this.height * 0.5 - 25, w: 50, h: 50, hp: 4, maxHp: 4 },
      { x: this.width * 0.5 - 20, y: this.height * 0.15, w: 40, h: 40, steel: true },
      { x: this.width * 0.5 - 20, y: this.height * 0.85 - 40, w: 40, h: 40, steel: true }
    ];

    let p2MaxSpeed = 3.4;
    if (this.difficulty === 'baby') p2MaxSpeed = 2.0;
    else if (this.difficulty === 'hard') p2MaxSpeed = 4.2;
    else if (this.difficulty === 'demon') p2MaxSpeed = 5.0;

    this.p1 = {
      x: 80,
      y: this.height / 2,
      angle: 0,
      speed: 0,
      maxSpeed: 3.4,
      size: 22,
      color: '#0ea5e9',
      ammo: 5,
      reloadTime: 0,
      alive: true
    };

    this.p2 = {
      x: this.width - 80,
      y: this.height / 2,
      angle: Math.PI,
      speed: 0,
      maxSpeed: p2MaxSpeed,
      size: 22,
      color: '#f43f5e',
      ammo: 5,
      reloadTime: 0,
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

    this.updateTank(this.p1, p1Input, '#0ea5e9');
    this.updateTank(this.p2, p2Input, '#f43f5e');

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      if (Math.random() < 0.35) {
        particles.spawnTrail(b.x, b.y, b.owner === 1 ? 'rgba(14, 165, 233, 0.4)' : 'rgba(244, 63, 94, 0.4)', 2.5);
      }

      if (b.x <= 14 || b.x >= this.width - 14) {
        b.vx *= -1;
        b.bounces++;
        sound.playBounce(true);
        particles.spawnSparks(b.x, b.y, '#f59e0b', 5);
      }
      if (b.y <= 14 || b.y >= this.height - 14) {
        b.vy *= -1;
        b.bounces++;
        sound.playBounce(true);
        particles.spawnSparks(b.x, b.y, '#f59e0b', 5);
      }

      for (let j = this.obstacles.length - 1; j >= 0; j--) {
        const obs = this.obstacles[j];
        if (
          b.x >= obs.x &&
          b.x <= obs.x + obs.w &&
          b.y >= obs.y &&
          b.y <= obs.y + obs.h
        ) {
          b.bounces++;
          b.vx *= -1;
          b.vy *= -1;
          sound.playBounce(true);
          particles.spawnSparks(b.x, b.y, '#f59e0b', 6);

          if (!obs.steel) {
            obs.hp--;
            if (obs.hp <= 0) {
              particles.spawnExplosion(obs.x + obs.w / 2, obs.y + obs.h / 2, '#f59e0b', 16);
              sound.playExplosion();
              this.obstacles.splice(j, 1);
            }
          }
          break;
        }
      }

      if (this.p1.alive && Math.hypot(b.x - this.p1.x, b.y - this.p1.y) < this.p1.size + 4) {
        if (b.owner !== 1 || b.bounces > 0) {
          this.destroyTank(1);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (this.p2.alive && Math.hypot(b.x - this.p2.x, b.y - this.p2.y) < this.p2.size + 4) {
        if (b.owner !== 2 || b.bounces > 0) {
          this.destroyTank(2);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (b.life <= 0 || b.bounces >= 3) {
        particles.spawnSparks(b.x, b.y, b.owner === 1 ? '#0ea5e9' : '#f43f5e', 6);
        this.bullets.splice(i, 1);
      }
    }

    if (this.treadMarks.length > 150) {
      this.treadMarks.splice(0, 10);
    }
  }

  updateTank(tank, input, color) {
    if (!tank.alive) return;

    if (tank.reloadTime > 0) tank.reloadTime--;

    const moveX = input.x;
    const moveY = input.y;
    const isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1;

    if (isMoving) {
      const targetAngle = Math.atan2(moveY, moveX);
      let angleDiff = targetAngle - tank.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      tank.angle += angleDiff * 0.22;

      tank.speed = Math.min(tank.speed + 0.3, tank.maxSpeed);
      
      const newX = tank.x + Math.cos(tank.angle) * tank.speed;
      const newY = tank.y + Math.sin(tank.angle) * tank.speed;

      if (this.canMoveTo(newX, newY, tank.size)) {
        tank.x = newX;
        tank.y = newY;
      }

      if (Math.random() < 0.35) {
        this.treadMarks.push({
          x: tank.x,
          y: tank.y,
          angle: tank.angle,
          color: 'rgba(15, 23, 42, 0.08)'
        });
      }
    } else {
      tank.speed *= 0.8;
    }

    if (input.justAction && tank.reloadTime <= 0) {
      this.fireBullet(tank, color === '#0ea5e9' ? 1 : 2);
      let cd = 22;
      if (this.difficulty === 'baby') cd = 36;
      else if (this.difficulty === 'hard') cd = 16;
      else if (this.difficulty === 'demon') cd = 10;
      tank.reloadTime = cd;
    }
  }

  canMoveTo(x, y, radius) {
    if (x - radius < 14 || x + radius > this.width - 14) return false;
    if (y - radius < 14 || y + radius > this.height - 14) return false;

    for (const obs of this.obstacles) {
      if (
        x + radius > obs.x &&
        x - radius < obs.x + obs.w &&
        y + radius > obs.y &&
        y - radius < obs.y + obs.h
      ) {
        return false;
      }
    }
    return true;
  }

  fireBullet(tank, owner) {
    const muzzleDist = tank.size + 10;
    const bx = tank.x + Math.cos(tank.angle) * muzzleDist;
    const by = tank.y + Math.sin(tank.angle) * muzzleDist;
    const bulletSpeed = 7.5;

    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(tank.angle) * bulletSpeed,
      vy: Math.sin(tank.angle) * bulletSpeed,
      owner,
      bounces: 0,
      life: 240
    });

    sound.playShoot('tank');
    particles.spawnSparks(bx, by, tank.color, 8, 3);
    particles.shake(4, 5);
  }

  destroyTank(victim) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    const tank = victim === 1 ? this.p1 : this.p2;
    tank.alive = false;
    particles.spawnExplosion(tank.x, tank.y, tank.color, 40);
    sound.playExplosion();

    if (victim === 1) {
      this.p2Score++;
      particles.addFloatingText('Point Pink!', this.p2.x, this.p2.y - 30, '#f43f5e', 24);
    } else {
      this.p1Score++;
      particles.addFloatingText('Point Blue!', this.p1.x, this.p1.y - 30, '#0ea5e9', 24);
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
    let targetX = this.p1.x;
    let targetY = this.p1.y;

    if (this.difficulty === 'hard' || this.difficulty === 'demon') {
      targetX += (this.p1.x - 80) * 0.15;
      targetY += (this.p1.y - this.height / 2) * 0.15;
    }

    const dx = targetX - this.p2.x;
    const dy = targetY - this.p2.y;
    const dist = Math.hypot(dx, dy);
    const angleToTarget = Math.atan2(dy, dx);

    const aimDiff = Math.abs(this.p2.angle - angleToTarget);

    let shouldShoot = false;
    let moveX = Math.cos(angleToTarget);
    let moveY = Math.sin(angleToTarget);

    if (this.difficulty === 'baby') {
      shouldShoot = dist < 220 && aimDiff < 0.6 && Math.random() < 0.04;
      moveX += (Math.random() - 0.5) * 1.5;
      moveY += (Math.random() - 0.5) * 1.5;
    } else if (this.difficulty === 'normal') {
      shouldShoot = dist < 340 && aimDiff < 0.35 && Math.random() < 0.14;
    } else if (this.difficulty === 'hard') {
      shouldShoot = dist < 420 && aimDiff < 0.22 && Math.random() < 0.32;
    } else if (this.difficulty === 'demon') {
      shouldShoot = dist < 500 && (aimDiff < 0.18 || Math.random() < 0.4);
    }

    if (this.difficulty !== 'baby') {
      const dodgeThreshold = this.difficulty === 'demon' ? 180 : this.difficulty === 'hard' ? 130 : 90;
      for (const b of this.bullets) {
        if (b.owner === 1) {
          const bDist = Math.hypot(b.x - this.p2.x, b.y - this.p2.y);
          if (bDist < dodgeThreshold) {
            moveX = -b.vy * 1.8;
            moveY = b.vx * 1.8;
          }
        }
      }
    }

    return {
      x: moveX,
      y: moveY,
      action: shouldShoot,
      justAction: shouldShoot
    };
  }

  draw() {
    this.ctx.save();

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    for (const tm of this.treadMarks) {
      this.ctx.save();
      this.ctx.translate(tm.x, tm.y);
      this.ctx.rotate(tm.angle);
      this.ctx.fillStyle = tm.color;
      this.ctx.fillRect(-10, -10, 6, 3);
      this.ctx.fillRect(-10, 7, 6, 3);
      this.ctx.restore();
    }

    for (const obs of this.obstacles) {
      this.ctx.save();
      if (obs.steel) {
        this.ctx.fillStyle = '#334155';
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.strokeStyle = '#d97706';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 6);
        this.ctx.fill();
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    if (this.p1.alive) this.drawTank(this.p1);
    if (this.p2.alive) this.drawTank(this.p2);

    for (const b of this.bullets) {
      this.ctx.save();
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawTank(tank) {
    this.ctx.save();
    this.ctx.translate(tank.x, tank.y);
    this.ctx.rotate(tank.angle);

    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(-tank.size, -tank.size + 2, tank.size * 2, 6);
    this.ctx.fillRect(-tank.size, tank.size - 8, tank.size * 2, 6);

    this.ctx.fillStyle = tank.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-tank.size + 4, -tank.size + 6, (tank.size - 4) * 2, (tank.size - 6) * 2, 6);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, -3.5, tank.size + 8, 7);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = tank.color;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawScoreHUD() {
    this.ctx.save();
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

  getNetworkState() {
    return {
      p1: { x: this.p1.x, y: this.p1.y, angle: this.p1.angle, alive: this.p1.alive },
      p2: { x: this.p2.x, y: this.p2.y, angle: this.p2.angle, alive: this.p2.alive },
      bullets: this.bullets.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, color: b.color, bounces: b.bounces })),
      p1Score: this.p1Score,
      p2Score: this.p2Score
    };
  }

  applyNetworkState(state) {
    if (!state) return;
    if (state.p1) {
      this.p1.x = state.p1.x;
      this.p1.y = state.p1.y;
      this.p1.angle = state.p1.angle;
      this.p1.alive = state.p1.alive;
    }
    if (state.p2) {
      this.p2.x = state.p2.x;
      this.p2.y = state.p2.y;
      this.p2.angle = state.p2.angle;
      this.p2.alive = state.p2.alive;
    }
    if (state.bullets) {
      this.bullets = state.bullets.map((b) => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        color: b.color,
        bounces: b.bounces,
        radius: 4
      }));
    }
    if (state.p1Score !== undefined) this.p1Score = state.p1Score;
    if (state.p2Score !== undefined) this.p2Score = state.p2Score;
  }
}
