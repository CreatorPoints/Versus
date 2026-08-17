/**
 * VERSUS - Blade Clash Mini-Game
 * Dash strikes, perfect parry windows, metallic spark impacts, health bars!
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class BladeClash {
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

    this.groundY = this.height * 0.75;

    this.resetRound();
  }

  resetRound() {
    this.p1 = {
      x: 180,
      y: this.groundY,
      vx: 0,
      hp: 3,
      maxHp: 3,
      facing: 1,
      color: '#0ea5e9',
      state: 'IDLE',
      stateTimer: 0,
      parryWindow: 0,
      swordAngle: 0,
      alive: true
    };

    this.p2 = {
      x: this.width - 180,
      y: this.groundY,
      vx: 0,
      hp: 3,
      maxHp: 3,
      facing: -1,
      color: '#f43f5e',
      state: 'IDLE',
      stateTimer: 0,
      parryWindow: 0,
      swordAngle: 0,
      alive: true
    };

    this.roundEnding = false;
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2 && this.p2.alive && this.p1.alive) {
      p2Input = this.computeBotInput();
    }

    this.updateWarrior(this.p1, p1Input, this.p2);
    this.updateWarrior(this.p2, p2Input, this.p1);

    if (this.p1.alive && this.p2.alive) {
      this.checkCombatInteractions();
    }
  }

  updateWarrior(w, input, enemy) {
    if (!w.alive) return;

    if (w.stateTimer > 0) w.stateTimer--;

    if (w.state === 'IDLE') {
      w.facing = enemy.x > w.x ? 1 : -1;
    }

    if (w.state === 'STUN') {
      w.vx *= 0.85;
      w.x += w.vx;
      if (w.stateTimer <= 0) {
        w.state = 'IDLE';
      }
      return;
    }

    if (w.state === 'ATTACK') {
      w.x += w.vx;
      w.vx *= 0.88;
      w.swordAngle = w.facing * (Math.PI * 0.45);
      if (w.stateTimer <= 0) {
        w.state = 'IDLE';
        w.swordAngle = 0;
      }
      return;
    }

    if (w.state === 'PARRY') {
      w.swordAngle = -w.facing * (Math.PI * 0.35);
      if (w.stateTimer <= 0) {
        w.state = 'IDLE';
        w.swordAngle = 0;
      }
      return;
    }

    const speed = 5.2;
    w.vx = input.x * speed;
    w.x += w.vx;
    w.x = Math.max(50, Math.min(this.width - 50, w.x));

    if (input.justAction) {
      if (input.y > 0.4) {
        w.state = 'PARRY';
        w.stateTimer = 16;
        sound.playBounce(true);
      } else {
        w.state = 'ATTACK';
        w.stateTimer = 18;
        w.vx = w.facing * 11;
        sound.playShoot('sword');
        particles.spawnTrail(w.x, w.y - 20, w.color, 4);
      }
    }
  }

  checkCombatInteractions() {
    const dist = Math.abs(this.p1.x - this.p2.x);
    const attackRange = 75;

    if (this.p1.state === 'ATTACK' && this.p2.state === 'ATTACK' && dist < attackRange) {
      this.p1.state = 'IDLE';
      this.p2.state = 'IDLE';
      this.p1.vx = -this.p1.facing * 8;
      this.p2.vx = -this.p2.facing * 8;
      sound.playClash();
      particles.shake(10, 12);
      const midX = (this.p1.x + this.p2.x) / 2;
      particles.spawnSparks(midX, this.groundY - 25, '#f59e0b', 20, 7);
      particles.addFloatingText('CLASH!', midX, this.groundY - 60, '#1e293b', 22);
      return;
    }

    if (this.p1.state === 'ATTACK' && this.p1.stateTimer > 4 && dist < attackRange) {
      if (this.p2.state === 'PARRY') {
        this.p1.state = 'STUN';
        this.p1.stateTimer = 40;
        this.p1.vx = -this.p1.facing * 6;
        sound.playParry();
        particles.shake(12, 14);
        particles.spawnSparks(this.p2.x, this.groundY - 25, '#f59e0b', 22, 8);
        particles.addFloatingText('PERFECT PARRY!', this.p2.x, this.groundY - 60, '#f59e0b', 20);
      } else {
        this.hitWarrior(this.p2, this.p1);
      }
    }

    if (this.p2.state === 'ATTACK' && this.p2.stateTimer > 4 && dist < attackRange) {
      if (this.p1.state === 'PARRY') {
        this.p2.state = 'STUN';
        this.p2.stateTimer = 40;
        this.p2.vx = -this.p2.facing * 6;
        sound.playParry();
        particles.shake(12, 14);
        particles.spawnSparks(this.p1.x, this.groundY - 25, '#f59e0b', 22, 8);
        particles.addFloatingText('PERFECT PARRY!', this.p1.x, this.groundY - 60, '#f59e0b', 20);
      } else {
        this.hitWarrior(this.p1, this.p2);
      }
    }
  }

  hitWarrior(victim, attacker) {
    victim.hp--;
    victim.state = 'STUN';
    victim.stateTimer = 25;
    victim.vx = attacker.facing * 9;

    sound.playHit();
    particles.shake(12, 14);
    particles.spawnExplosion(victim.x, this.groundY - 25, victim.color, 20);

    if (victim.hp <= 0) {
      this.destroyWarrior(victim === this.p1 ? 1 : 2);
    }
  }

  destroyWarrior(victim) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    const w = victim === 1 ? this.p1 : this.p2;
    w.alive = false;
    sound.playExplosion();
    particles.spawnExplosion(w.x, this.groundY - 25, w.color, 40);

    if (victim === 1) {
      this.p2Score++;
      particles.addFloatingText('ROUND WIN!', this.p2.x, this.groundY - 60, '#f43f5e', 24);
    } else {
      this.p1Score++;
      particles.addFloatingText('ROUND WIN!', this.p1.x, this.groundY - 60, '#0ea5e9', 24);
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
    const dist = Math.abs(this.p1.x - this.p2.x);
    let moveX = 0;
    let action = false;
    let down = false;

    if (this.p1.state === 'ATTACK' && dist < 120 && Math.random() < 0.6) {
      action = true;
      down = true;
    } else if (dist > 90) {
      moveX = this.p1.x > this.p2.x ? 1 : -1;
    } else if (dist <= 90) {
      if (Math.random() < 0.25) {
        action = true;
      }
    }

    return {
      x: moveX,
      y: down ? 1 : 0,
      action,
      justAction: action
    };
  }

  draw() {
    this.ctx.save();

    // Clean Dojo Background
    const bg = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(0.7, '#f1f5f9');
    bg.addColorStop(1, '#e2e8f0');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Floor
    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();

    this.drawWarrior(this.p1);
    this.drawWarrior(this.p2);

    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawWarrior(w) {
    if (!w.alive) return;

    this.ctx.save();
    this.ctx.translate(w.x, w.y);
    this.ctx.scale(w.facing, 1);

    if (w.state === 'STUN') {
      this.ctx.translate((Math.random() - 0.5) * 4, 0);
    }

    // Shadow
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Body
    this.ctx.fillStyle = w.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-10, -42, 20, 42, 6);
    this.ctx.fill();

    // Visor
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(2, -36, 8, 4);

    // Blade
    this.ctx.save();
    this.ctx.translate(8, -20);
    this.ctx.rotate(w.swordAngle);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(0, -3, 34, 6);
    this.ctx.restore();

    // HP Indicators
    this.ctx.restore();
    this.ctx.save();
    this.ctx.translate(w.x, w.y - 55);
    for (let i = 0; i < w.maxHp; i++) {
      this.ctx.fillStyle = i < w.hp ? w.color : '#e2e8f0';
      this.ctx.fillRect((i - 1.5) * 12, 0, 8, 5);
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
