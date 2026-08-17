/**
 * VERSUS - High-Performance Particle Engine (Zero-Allocation Pool)
 * Reuses particle objects to eliminate GC pauses and maintain 60-120 FPS.
 */

class ParticlePool {
  constructor(maxSize = 300) {
    this.maxSize = maxSize;
    this.particles = [];
    this.activeCount = 0;
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.shakeOffset = { x: 0, y: 0 };
    this.floatingTexts = [];

    for (let i = 0; i < maxSize; i++) {
      this.particles.push({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        color: '#fff',
        size: 0, maxSize: 0,
        life: 0, maxLife: 0,
        drag: 0.96,
        type: 'spark'
      });
    }
  }

  shake(amount = 8, duration = 12) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  update() {
    if (this.shakeDuration > 0) {
      this.shakeDuration--;
      this.shakeOffset.x = (Math.random() * 2 - 1) * this.shakeAmount;
      this.shakeOffset.y = (Math.random() * 2 - 1) * this.shakeAmount;
      this.shakeAmount *= 0.9;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
      this.shakeAmount = 0;
    }

    for (let i = 0; i < this.maxSize; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life--;
      p.size *= 0.96;

      if (p.life <= 0 || p.size < 0.3) {
        p.active = false;
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life--;
      ft.opacity = Math.max(0, ft.life / ft.maxLife);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  getFreeParticle() {
    for (let i = 0; i < this.maxSize; i++) {
      if (!this.particles[i].active) {
        return this.particles[i];
      }
    }
    return this.particles[0]; // fallback
  }

  spawnSparks(x, y, color = '#0ea5e9', count = 10, speed = 4) {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * speed;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.color = color;
      p.size = Math.random() * 3 + 2;
      p.life = Math.floor(Math.random() * 12 + 10);
      p.maxLife = p.life;
      p.drag = 0.94;
      p.type = 'spark';
    }
  }

  spawnExplosion(x, y, primaryColor = '#f43f5e', count = 20) {
    this.shake(10, 14);

    // Shockwave
    const sw = this.getFreeParticle();
    sw.active = true;
    sw.x = x;
    sw.y = y;
    sw.vx = 0;
    sw.vy = 0;
    sw.color = primaryColor;
    sw.size = 8;
    sw.maxSize = 55;
    sw.life = 16;
    sw.maxLife = 16;
    sw.drag = 1;
    sw.type = 'shockwave';

    const colors = [primaryColor, '#f59e0b', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 1.5;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.color = colors[i % colors.length];
      p.size = Math.random() * 5 + 2.5;
      p.life = Math.floor(Math.random() * 18 + 12);
      p.maxLife = p.life;
      p.drag = 0.92;
      p.type = 'smoke';
    }
  }

  spawnTrail(x, y, color = 'rgba(14, 165, 233, 0.4)', size = 3.5) {
    const p = this.getFreeParticle();
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 0.3;
    p.vy = (Math.random() - 0.5) * 0.3;
    p.color = color;
    p.size = size;
    p.life = 10;
    p.maxLife = 10;
    p.drag = 0.9;
    p.type = 'trail';
  }

  addFloatingText(text, x, y, color = '#1e293b', size = 20) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.2,
      color,
      size,
      life: 40,
      maxLife: 40,
      opacity: 1
    });
  }

  draw(ctx) {
    ctx.save();
    for (let i = 0; i < this.maxSize; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      if (p.type === 'shockwave') {
        const progress = 1 - (p.life / p.maxLife);
        const radius = p.size + (p.maxSize - p.size) * progress;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3.5 * (1 - progress));
        ctx.globalAlpha = 1 - progress;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.opacity;
      ctx.font = `bold ${ft.size}px "Fredoka", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  clear() {
    for (let i = 0; i < this.maxSize; i++) {
      this.particles[i].active = false;
    }
    this.floatingTexts = [];
    this.shakeAmount = 0;
    this.shakeDuration = 0;
  }
}

export const particles = new ParticlePool(250);
