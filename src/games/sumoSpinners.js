/**
 * VERSUS - Sumo Spinners Mini-Game
 * Crumbling arena, centrifugal spin momentum, edge knockouts!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class SumoSpinners {
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

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.resetRound();
  }

  resetRound() {
    this.arenaRadius = Math.min(this.width, this.height) * 0.42;
    this.initialRadius = this.arenaRadius;
    this.minArenaRadius = 110;
    this.shrinkSpeed = 0.04;

    this.p1 = {
      x: this.centerX - 110,
      y: this.centerY,
      vx: 0,
      vy: 0,
      radius: 22,
      color: '#00f0ff',
      spinAngle: 0,
      spinSpeed: 0.18,
      boostEnergy: 100,
      alive: true,
      fallScale: 1
    };

    this.p2 = {
      x: this.centerX + 110,
      y: this.centerY,
      vx: 0,
      vy: 0,
      radius: 22,
      color: '#ff2e63',
      spinAngle: 0,
      spinSpeed: 0.18,
      boostEnergy: 100,
      alive: true,
      fallScale: 1
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    // 1. Shrink Arena over time
    if (!this.roundEnding && this.arenaRadius > this.minArenaRadius) {
      this.arenaRadius -= this.shrinkSpeed;
    }

    // 2. Bot AI for P2
    if (isBotP2 && this.p2.alive && this.p1.alive) {
      p2Input = this.computeBotInput();
    }

    // 3. Update Players
    this.updateSpinner(this.p1, p1Input);
    this.updateSpinner(this.p2, p2Input);

    // 4. Spinner vs Spinner Collision
    if (this.p1.alive && this.p2.alive) {
      this.checkSpinnerCollision();
    }

    // 5. Check Ring Fall
    if (this.p1.alive) {
      const dist1 = Math.hypot(this.p1.x - this.centerX, this.p1.y - this.centerY);
      if (dist1 > this.arenaRadius) {
        this.eliminateSpinner(1);
      }
    }

    if (this.p2.alive) {
      const dist2 = Math.hypot(this.p2.x - this.centerX, this.p2.y - this.centerY);
      if (dist2 > this.arenaRadius) {
        this.eliminateSpinner(2);
      }
    }
  }

  updateSpinner(s, input) {
    s.spinAngle += s.spinSpeed;

    if (!s.alive) {
      s.fallScale = Math.max(0, s.fallScale - 0.04);
      s.x += s.vx * 0.5;
      s.y += s.vy * 0.5;
      return;
    }

    // Boost & Movement
    let speed = 4.8;
    if (input.action && s.boostEnergy > 10) {
      speed = 8.5;
      s.boostEnergy -= 1.4;
      s.spinSpeed = 0.35;
      particles.spawnTrail(s.x, s.y, s.color, 3);
    } else {
      s.spinSpeed = 0.18;
      s.boostEnergy = Math.min(100, s.boostEnergy + 0.4);
    }

    // Acceleration
    s.vx += input.x * speed * 0.25;
    s.vy += input.y * speed * 0.25;

    // Drag / Friction
    s.vx *= 0.94;
    s.vy *= 0.94;

    s.x += s.vx;
    s.y += s.vy;
  }

  checkSpinnerCollision() {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = this.p1.radius + this.p2.radius;

    if (dist < minDist) {
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      // Separate them
      const overlap = (minDist - dist) / 2;
      this.p1.x -= nx * overlap;
      this.p1.y -= ny * overlap;
      this.p2.x += nx * overlap;
      this.p2.y += ny * overlap;

      // Calculate rebound force
      const relVx = this.p1.vx - this.p2.vx;
      const relVy = this.p1.vy - this.p2.vy;
      const normalVelocity = relVx * nx + relVy * ny;

      if (normalVelocity > 0) {
        const impulse = normalVelocity * 1.6 + 4.5;
        this.p1.vx -= nx * impulse;
        this.p1.vy -= ny * impulse;
        this.p2.vx += nx * impulse;
        this.p2.vy += ny * impulse;

        sound.playClash();
        particles.shake(10, 10);
        const midX = (this.p1.x + this.p2.x) / 2;
        const midY = (this.p1.y + this.p2.y) / 2;
        particles.spawnSparks(midX, midY, '#ffd166', 16, 6);
      }
    }
  }

  eliminateSpinner(victim) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    const s = victim === 1 ? this.p1 : this.p2;
    s.alive = false;
    sound.playExplosion();
    particles.spawnExplosion(s.x, s.y, s.color, 30);
    particles.shake(12, 15);

    if (victim === 1) {
      this.p2Score++;
      particles.addFloatingText('RING OUT!', this.p2.x, this.p2.y - 25, '#ff2e63', 24);
    } else {
      this.p1Score++;
      particles.addFloatingText('RING OUT!', this.p1.x, this.p1.y - 25, '#00f0ff', 24);
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
    // Distance to center of arena
    const distToCenter = Math.hypot(this.p2.x - this.centerX, this.p2.y - this.centerY);
    
    // If getting close to edge, move toward center immediately
    if (distToCenter > this.arenaRadius * 0.7) {
      const dx = this.centerX - this.p2.x;
      const dy = this.centerY - this.p2.y;
      const dist = Math.hypot(dx, dy);
      return {
        x: dx / dist,
        y: dy / dist,
        action: true
      };
    }

    // Ram player 1!
    const dx = this.p1.x - this.p2.x;
    const dy = this.p1.y - this.p2.y;
    const dist = Math.hypot(dx, dy);

    return {
      x: dx / dist,
      y: dy / dist,
      action: dist < 120 && Math.random() < 0.4
    };
  }

  draw() {
    this.ctx.save();

    // Abyss background
    this.ctx.fillStyle = '#05070e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Dynamic Crumbling Arena
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.arenaRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fill();

    // Arena glowing border
    this.ctx.lineWidth = 6;
    this.ctx.strokeStyle = this.arenaRadius < 150 ? '#ef4444' : '#38bdf8';
    this.ctx.shadowColor = this.arenaRadius < 150 ? '#ef4444' : '#38bdf8';
    this.ctx.shadowBlur = 15;
    this.ctx.stroke();

    // Concentric Arena Rings
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    for (let r = 40; r < this.arenaRadius; r += 45) {
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Draw Spinners
    this.drawSpinner(this.p1);
    this.drawSpinner(this.p2);

    // Score HUD
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawSpinner(s) {
    if (s.fallScale <= 0) return;

    this.ctx.save();
    this.ctx.translate(s.x, s.y);
    this.ctx.scale(s.fallScale, s.fallScale);
    this.ctx.rotate(s.spinAngle);

    // Spinner Blades
    const bladeCount = 3;
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i * Math.PI * 2) / bladeCount;
      this.ctx.save();
      this.ctx.rotate(angle);
      this.ctx.fillStyle = s.color;
      this.ctx.shadowColor = s.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(s.radius + 10, -5);
      this.ctx.lineTo(s.radius + 14, 5);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    // Core Hub
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, s.radius * 0.65, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, s.radius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    // Boost Energy Bar
    if (s.alive) {
      this.ctx.restore();
      this.ctx.save();
      this.ctx.translate(s.x, s.y + s.radius + 12);
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(-18, 0, 36, 4);
      this.ctx.fillStyle = s.color;
      this.ctx.fillRect(-18, 0, (s.boostEnergy / 100) * 36, 4);
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
