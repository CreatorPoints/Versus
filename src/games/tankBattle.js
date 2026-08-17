/**
 * VERSUS - Tank Battle Mini-Game
 * Bouncing bullets, destructible obstacles, tank treads, power-ups, intense arena warfare!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class TankBattle {
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
    this.bullets = [];
    this.treadMarks = [];
    this.powerups = [];
    this.obstacles = [
      { x: this.width * 0.25, y: this.height * 0.25, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.75 - 40, y: this.height * 0.25, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.25, y: this.height * 0.75 - 40, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.75 - 40, y: this.height * 0.75 - 40, w: 40, h: 40, hp: 3, maxHp: 3 },
      { x: this.width * 0.5 - 25, y: this.height * 0.5 - 25, w: 50, h: 50, hp: 4, maxHp: 4 },
      // Steel non-destructible pillars
      { x: this.width * 0.5 - 20, y: this.height * 0.15, w: 40, h: 40, steel: true },
      { x: this.width * 0.5 - 20, y: this.height * 0.85 - 40, w: 40, h: 40, steel: true }
    ];

    // Player 1 (Blue)
    this.p1 = {
      x: 80,
      y: this.height / 2,
      angle: 0,
      speed: 0,
      maxSpeed: 3.2,
      size: 22,
      color: '#00f0ff',
      ammo: 5,
      maxAmmo: 5,
      reloadTime: 0,
      shield: 0,
      tripleShot: 0,
      alive: true
    };

    // Player 2 (Red)
    this.p2 = {
      x: this.width - 80,
      y: this.height / 2,
      angle: Math.PI,
      speed: 0,
      maxSpeed: 3.2,
      size: 22,
      color: '#ff2e63',
      ammo: 5,
      maxAmmo: 5,
      reloadTime: 0,
      shield: 0,
      tripleShot: 0,
      alive: true
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    // 1. Bot AI for P2
    if (isBotP2 && this.p2.alive && this.p1.alive) {
      p2Input = this.computeBotInput();
    }

    // 2. Update Players
    this.updateTank(this.p1, p1Input, '#00f0ff');
    this.updateTank(this.p2, p2Input, '#ff2e63');

    // 3. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      // Bullet trail
      if (Math.random() < 0.4) {
        particles.spawnTrail(b.x, b.y, b.owner === 1 ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 46, 99, 0.5)', 2.5);
      }

      // Wall Ricochets
      if (b.x <= 10 || b.x >= this.width - 10) {
        b.vx *= -1;
        b.bounces++;
        sound.playBounce(true);
        particles.spawnSparks(b.x, b.y, '#ffffff', 4);
      }
      if (b.y <= 10 || b.y >= this.height - 10) {
        b.vy *= -1;
        b.bounces++;
        sound.playBounce(true);
        particles.spawnSparks(b.x, b.y, '#ffffff', 4);
      }

      // Obstacle collisions
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
          particles.spawnSparks(b.x, b.y, '#ffd166', 6);

          if (!obs.steel) {
            obs.hp--;
            if (obs.hp <= 0) {
              particles.spawnExplosion(obs.x + obs.w / 2, obs.y + obs.h / 2, '#ffd166', 15);
              sound.playExplosion();
              this.obstacles.splice(j, 1);
            }
          }
          break;
        }
      }

      // Player 1 Hit
      if (this.p1.alive && Math.hypot(b.x - this.p1.x, b.y - this.p1.y) < this.p1.size + 4) {
        if (b.owner !== 1 || b.bounces > 0) {
          this.destroyTank(1);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Player 2 Hit
      if (this.p2.alive && Math.hypot(b.x - this.p2.x, b.y - this.p2.y) < this.p2.size + 4) {
        if (b.owner !== 2 || b.bounces > 0) {
          this.destroyTank(2);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (b.life <= 0 || b.bounces >= 3) {
        particles.spawnSparks(b.x, b.y, b.owner === 1 ? '#00f0ff' : '#ff2e63', 6);
        this.bullets.splice(i, 1);
      }
    }

    // Trim old treadmarks
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
      // Smooth angle interpolation
      let angleDiff = targetAngle - tank.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      tank.angle += angleDiff * 0.22;

      tank.speed = Math.min(tank.speed + 0.3, tank.maxSpeed);
      
      const newX = tank.x + Math.cos(tank.angle) * tank.speed;
      const newY = tank.y + Math.sin(tank.angle) * tank.speed;

      // Obstacle & Wall Collision Check
      if (this.canMoveTo(newX, newY, tank.size)) {
        tank.x = newX;
        tank.y = newY;
      }

      // Add tread mark
      if (Math.random() < 0.35) {
        this.treadMarks.push({
          x: tank.x,
          y: tank.y,
          angle: tank.angle,
          color: 'rgba(255, 255, 255, 0.08)'
        });
      }
    } else {
      tank.speed *= 0.8;
    }

    // Shooting
    if (input.justAction && tank.reloadTime <= 0) {
      this.fireBullet(tank, color === '#00f0ff' ? 1 : 2);
      tank.reloadTime = 22; // cooldown
    }
  }

  canMoveTo(x, y, radius) {
    // Arena boundaries
    if (x - radius < 14 || x + radius > this.width - 14) return false;
    if (y - radius < 14 || y + radius > this.height - 14) return false;

    // Obstacles
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
      particles.addFloatingText('P2 Point!', this.p2.x, this.p2.y - 30, '#ff2e63', 24);
    } else {
      this.p1Score++;
      particles.addFloatingText('P1 Point!', this.p1.x, this.p1.y - 30, '#00f0ff', 24);
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
    const dx = this.p1.x - this.p2.x;
    const dy = this.p1.y - this.p2.y;
    const dist = Math.hypot(dx, dy);
    const angleToTarget = Math.atan2(dy, dx);

    // Aim toward player 1
    const aimDiff = Math.abs(this.p2.angle - angleToTarget);
    const shouldShoot = dist < 320 && aimDiff < 0.35 && Math.random() < 0.12;

    // Movement: strafe & dodge incoming bullets
    let moveX = Math.cos(angleToTarget);
    let moveY = Math.sin(angleToTarget);

    for (const b of this.bullets) {
      if (b.owner === 1) {
        const bDist = Math.hypot(b.x - this.p2.x, b.y - this.p2.y);
        if (bDist < 120) {
          // Dodge perpendicular to bullet trajectory
          moveX = -b.vy;
          moveY = b.vx;
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

    // 1. Arena Floor
    this.ctx.fillStyle = '#0a0d14';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Grid Lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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

    // Outer Boundary Glowing Wall
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);

    // 2. Tread marks
    for (const tm of this.treadMarks) {
      this.ctx.save();
      this.ctx.translate(tm.x, tm.y);
      this.ctx.rotate(tm.angle);
      this.ctx.fillStyle = tm.color;
      this.ctx.fillRect(-10, -10, 6, 3);
      this.ctx.fillRect(-10, 7, 6, 3);
      this.ctx.restore();
    }

    // 3. Obstacles
    for (const obs of this.obstacles) {
      this.ctx.save();
      if (obs.steel) {
        this.ctx.fillStyle = '#1e293b';
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 3;
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      } else {
        const hpPercent = obs.hp / obs.maxHp;
        this.ctx.fillStyle = `rgba(245, 158, 11, ${0.4 + hpPercent * 0.4})`;
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        this.ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
      this.ctx.restore();
    }

    // 4. Tanks
    if (this.p1.alive) this.drawTank(this.p1);
    if (this.p2.alive) this.drawTank(this.p2);

    // 5. Bullets
    for (const b of this.bullets) {
      this.ctx.save();
      this.ctx.fillStyle = b.owner === 1 ? '#00f0ff' : '#ff2e63';
      this.ctx.shadowColor = b.owner === 1 ? '#00f0ff' : '#ff2e63';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 6. Score Header
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawTank(tank) {
    this.ctx.save();
    this.ctx.translate(tank.x, tank.y);
    this.ctx.rotate(tank.angle);

    // Treads
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(-tank.size, -tank.size + 2, tank.size * 2, 6);
    this.ctx.fillRect(-tank.size, tank.size - 8, tank.size * 2, 6);

    // Body
    this.ctx.fillStyle = tank.color;
    this.ctx.shadowColor = tank.color;
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.roundRect(-tank.size + 4, -tank.size + 6, (tank.size - 4) * 2, (tank.size - 6) * 2, 4);
    this.ctx.fill();

    // Turret Barrel
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, -3.5, tank.size + 8, 7);

    // Turret Dome
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 7, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = tank.color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawScoreHUD() {
    this.ctx.save();
    this.ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
    this.ctx.textAlign = 'center';

    // P1 Score
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.fillText(`${this.p1Score}`, this.width * 0.35, 45);

    // Divider
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '16px "Outfit", sans-serif';
    this.ctx.fillText(`FIRST TO ${this.targetScore}`, this.width * 0.5, 45);

    // P2 Score
    this.ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
    this.ctx.fillStyle = '#ff2e63';
    this.ctx.fillText(`${this.p2Score}`, this.width * 0.65, 45);
    this.ctx.restore();
  }
}
