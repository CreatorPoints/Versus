/**
 * VERSUS - Particle & Juice Engine
 * Screen shake, spark bursts, smoke, trails, shockwaves, floating text.
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.shakeOffset = { x: 0, y: 0 };
    this.floatingTexts = [];
  }

  shake(amount = 8, duration = 12) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  update() {
    // Screen shake decay
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

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag || 0.98;
      p.vy *= p.drag || 0.98;
      if (p.gravity) p.vy += p.gravity;
      if (p.spin) p.angle = (p.angle || 0) + p.spin;
      p.life--;
      p.size = Math.max(0, p.size * (p.shrink || 0.96));

      if (p.life <= 0 || p.size <= 0.2) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
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

  spawnSparks(x, y, color = '#00f0ff', count = 14, speed = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: Math.random() * 3.5 + 2,
        life: Math.floor(Math.random() * 15 + 12),
        drag: 0.94,
        type: 'spark'
      });
    }
  }

  spawnExplosion(x, y, primaryColor = '#ff2e63', count = 28) {
    this.shake(12, 16);
    // Shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: primaryColor,
      size: 8,
      maxSize: 65,
      life: 18,
      maxLife: 18,
      type: 'shockwave'
    });

    // Debris / Fire
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 1.5;
      const colors = [primaryColor, '#ffd166', '#ffffff', '#ff6b6b'];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        life: Math.floor(Math.random() * 22 + 15),
        drag: 0.92,
        type: 'smoke'
      });
    }
  }

  spawnTrail(x, y, color = 'rgba(0, 240, 255, 0.4)', size = 4) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      color,
      size,
      life: 12,
      shrink: 0.92,
      type: 'trail'
    });
  }

  addFloatingText(text, x, y, color = '#ffffff', size = 20) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.2,
      color,
      size,
      life: 45,
      maxLife: 45,
      opacity: 1
    });
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      if (p.type === 'shockwave') {
        const progress = 1 - (p.life / p.maxLife);
        const radius = p.size + (p.maxSize - p.size) * progress;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 4 * (1 - progress));
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

    // Draw floating text
    for (const ft of this.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.opacity;
      ctx.font = `bold ${ft.size}px "Outfit", "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeAmount = 0;
    this.shakeDuration = 0;
  }
}

export const particles = new ParticleSystem();
