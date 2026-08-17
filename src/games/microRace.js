/**
 * VERSUS - RACE Mini-Game
 * Variable Maps (Grand Speedway, Twin Loops, Cyber GP),
 * Precision Waypoint AI Racing Line Navigation, Drift Skids, Multi-Lap Grand Prix.
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';

export class MicroRace {
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

    // Track definitions
    this.tracks = [
      {
        name: 'GRAND SPEEDWAY',
        bgColor: '#059669',
        trackColor: '#1e293b',
        innerColor: '#047857',
        outer: { x: 45, y: 45, w: this.width - 90, h: this.height - 90, r: 50 },
        inner: { x: 180, y: 140, w: this.width - 360, h: this.height - 280, r: 35 },
        startLine: { x: this.width / 2, y: this.height - 135, w: 12, h: 90 },
        p1Start: { x: this.width / 2 - 25, y: this.height - 85, angle: Math.PI },
        p2Start: { x: this.width / 2 + 25, y: this.height - 85, angle: Math.PI },
        waypoints: [
          { x: 110, y: this.height - 90, r: 40 },
          { x: 90, y: this.height / 2, r: 40 },
          { x: 110, y: 90, r: 40 },
          { x: this.width / 2, y: 90, r: 40 },
          { x: this.width - 110, y: 90, r: 40 },
          { x: this.width - 90, y: this.height / 2, r: 40 },
          { x: this.width - 110, y: this.height - 90, r: 40 },
          { x: this.width / 2 + 20, y: this.height - 90, r: 40 }
        ]
      },
      {
        name: 'CYBER GP (TECHNICAL)',
        bgColor: '#0f172a',
        trackColor: '#334155',
        innerColor: '#1e293b',
        outer: { x: 40, y: 40, w: this.width - 80, h: this.height - 80, r: 30 },
        inner: { x: 160, y: 130, w: this.width - 320, h: this.height - 260, r: 25 },
        obstacles: [
          { x: this.width * 0.32, y: 130, w: 40, h: 100, r: 12 },
          { x: this.width * 0.62, y: this.height - 230, w: 40, h: 100, r: 12 }
        ],
        startLine: { x: this.width / 2, y: this.height - 130, w: 12, h: 90 },
        p1Start: { x: this.width / 2 - 25, y: this.height - 85, angle: Math.PI },
        p2Start: { x: this.width / 2 + 25, y: this.height - 85, angle: Math.PI },
        waypoints: [
          { x: 100, y: this.height - 85, r: 40 },
          { x: 90, y: this.height * 0.45, r: 40 },
          { x: 110, y: 90, r: 40 },
          { x: this.width * 0.4, y: 90, r: 40 },
          { x: this.width * 0.5, y: 150, r: 40 },
          { x: this.width * 0.6, y: 90, r: 40 },
          { x: this.width - 100, y: 90, r: 40 },
          { x: this.width - 90, y: this.height * 0.55, r: 40 },
          { x: this.width - 110, y: this.height - 85, r: 40 },
          { x: this.width / 2 + 20, y: this.height - 85, r: 40 }
        ]
      },
      {
        name: 'DESERT OVAL',
        bgColor: '#d97706',
        trackColor: '#78350f',
        innerColor: '#b45309',
        outer: { x: 50, y: 50, w: this.width - 100, h: this.height - 100, r: 70 },
        inner: { x: 210, y: 160, w: this.width - 420, h: this.height - 320, r: 45 },
        startLine: { x: this.width / 2, y: this.height - 150, w: 12, h: 100 },
        p1Start: { x: this.width / 2 - 25, y: this.height - 100, angle: Math.PI },
        p2Start: { x: this.width / 2 + 25, y: this.height - 100, angle: Math.PI },
        waypoints: [
          { x: 130, y: this.height - 100, r: 45 },
          { x: 100, y: this.height / 2, r: 45 },
          { x: 130, y: 100, r: 45 },
          { x: this.width / 2, y: 100, r: 45 },
          { x: this.width - 130, y: 100, r: 45 },
          { x: this.width - 100, y: this.height / 2, r: 45 },
          { x: this.width - 130, y: this.height - 100, r: 45 },
          { x: this.width / 2 + 20, y: this.height - 100, r: 45 }
        ]
      }
    ];

    this.currentTrackIndex = 0;
    this.resetRound();
  }

  resetRound() {
    this.track = this.tracks[this.currentTrackIndex];
    this.totalLaps = 3;
    this.skidMarks = [];

    let p2MaxSpeed = 6.2;
    if (this.difficulty === 'baby') p2MaxSpeed = 3.8;
    else if (this.difficulty === 'hard') p2MaxSpeed = 7.0;
    else if (this.difficulty === 'demon') p2MaxSpeed = 7.9;

    this.p1 = {
      x: this.track.p1Start.x,
      y: this.track.p1Start.y,
      angle: this.track.p1Start.angle,
      speed: 0,
      maxSpeed: 6.4,
      accel: 0.22,
      turnSpeed: 0.075,
      color: '#0ea5e9',
      laps: 0,
      size: 13,
      currentWaypoint: 0,
      passedHalfway: false
    };

    this.p2 = {
      x: this.track.p2Start.x,
      y: this.track.p2Start.y,
      angle: this.track.p2Start.angle,
      speed: 0,
      maxSpeed: p2MaxSpeed,
      accel: this.difficulty === 'demon' ? 0.28 : this.difficulty === 'hard' ? 0.24 : 0.18,
      turnSpeed: this.difficulty === 'demon' ? 0.095 : 0.075,
      color: '#f43f5e',
      laps: 0,
      size: 13,
      currentWaypoint: 0,
      passedHalfway: false
    };

    this.roundEnding = false;
    if (this.onRoundReset) this.onRoundReset();
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.resetRound();
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    if (isBotP2) {
      p2Input = this.computeBotInput();
    }

    this.updateKart(this.p1, p1Input, 1);
    this.updateKart(this.p2, p2Input, 2);

    if (this.skidMarks.length > 200) {
      this.skidMarks.splice(0, 10);
    }
  }

  updateKart(kart, input, playerNum) {
    // 1. Steering
    if (input.x < -0.15) {
      kart.angle -= kart.turnSpeed;
    } else if (input.x > 0.15) {
      kart.angle += kart.turnSpeed;
    }

    // 2. Acceleration / Reverse
    const isAccelerating = input.y < -0.15 || input.action;
    const isBraking = input.y > 0.15;

    if (isAccelerating) {
      kart.speed = Math.min(kart.speed + kart.accel, kart.maxSpeed);
      if (Math.random() < 0.3) {
        particles.spawnTrail(kart.x, kart.y, kart.color, 2.5);
      }
    } else if (isBraking) {
      kart.speed = Math.max(kart.speed - 0.32, -2.2);
    } else {
      kart.speed *= 0.96;
    }

    // 3. Movement
    kart.x += Math.cos(kart.angle) * kart.speed;
    kart.y += Math.sin(kart.angle) * kart.speed;

    // 4. Track Surface Check & Boundary Collisions
    const isOnTrack = this.isPointOnTrack(kart.x, kart.y);
    if (!isOnTrack) {
      // Grass slowdown & drifting particles
      kart.speed *= 0.88;
      if (Math.abs(kart.speed) > 2) {
        particles.spawnTrail(kart.x, kart.y, 'rgba(255, 255, 255, 0.4)', 3);
      }
    }

    // Outer wall hard bounds
    const minX = this.track.outer.x + kart.size;
    const maxX = this.track.outer.x + this.track.outer.w - kart.size;
    const minY = this.track.outer.y + kart.size;
    const maxY = this.track.outer.y + this.track.outer.h - kart.size;

    if (kart.x < minX) { kart.x = minX; kart.speed *= 0.5; }
    if (kart.x > maxX) { kart.x = maxX; kart.speed *= 0.5; }
    if (kart.y < minY) { kart.y = minY; kart.speed *= 0.5; }
    if (kart.y > maxY) { kart.y = maxY; kart.speed *= 0.5; }

    // 5. Waypoint & Checkpoint Logic
    const currentWp = this.track.waypoints[kart.currentWaypoint];
    const distToWp = Math.hypot(kart.x - currentWp.x, kart.y - currentWp.y);
    if (distToWp < currentWp.r + 20) {
      kart.currentWaypoint = (kart.currentWaypoint + 1) % this.track.waypoints.length;
      if (kart.currentWaypoint >= Math.floor(this.track.waypoints.length / 2)) {
        kart.passedHalfway = true;
      }
    }

    // Lap Completion Check across Finish Line
    const startLineX = this.track.startLine.x;
    if (
      kart.passedHalfway &&
      kart.x >= startLineX - 25 &&
      kart.x <= startLineX + 25 &&
      kart.y >= this.height - 140
    ) {
      kart.passedHalfway = false;
      kart.laps++;
      sound.playGoal();
      particles.spawnExplosion(kart.x, kart.y, kart.color, 30);
      particles.addFloatingText(`LAP ${kart.laps}/${this.totalLaps}!`, kart.x, kart.y - 30, kart.color, 24);

      if (kart.laps >= this.totalLaps) {
        this.finishRace(playerNum);
      }
    }

    // Skid marks on high-speed turns
    if (Math.abs(kart.speed) > 4 && (input.x < -0.2 || input.x > 0.2)) {
      this.skidMarks.push({ x: kart.x, y: kart.y, angle: kart.angle });
    }
  }

  isPointOnTrack(x, y) {
    const out = this.track.outer;
    const inn = this.track.inner;

    // Inside outer perimeter
    const inOuter = (
      x >= out.x && x <= out.x + out.w &&
      y >= out.y && y <= out.y + out.h
    );

    // Inside inner perimeter (the grass/island in center)
    const inInner = (
      x >= inn.x && x <= inn.x + inn.w &&
      y >= inn.y && y <= inn.y + inn.h
    );

    return inOuter && !inInner;
  }

  finishRace(winner) {
    if (this.roundEnding) return;
    this.roundEnding = true;

    if (winner === 1) this.p1Score = 3;
    else this.p2Score = 3;

    setTimeout(() => {
      this.isOver = true;
      this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score });
    }, 1600);
  }

  /**
   * Smooth, competitive AI racing line calculation (non-rigged, skill-based)
   */
  computeBotInput() {
    const waypoints = this.track.waypoints;
    const targetWp = waypoints[this.p2.currentWaypoint];
    const nextWp = waypoints[(this.p2.currentWaypoint + 1) % waypoints.length];

    // Smooth apex lookahead based on difficulty
    let targetX = targetWp.x;
    let targetY = targetWp.y;

    if (this.difficulty === 'hard' || this.difficulty === 'demon') {
      // Blend current and next waypoint for smooth racing line
      targetX = targetWp.x * 0.65 + nextWp.x * 0.35;
      targetY = targetWp.y * 0.65 + nextWp.y * 0.35;
    } else if (this.difficulty === 'baby') {
      targetX += (Math.sin(performance.now() * 0.003) * 35);
      targetY += (Math.cos(performance.now() * 0.003) * 35);
    }

    const dx = targetX - this.p2.x;
    const dy = targetY - this.p2.y;
    const targetAngle = Math.atan2(dy, dx);

    let angleDiff = targetAngle - this.p2.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    let steer = 0;
    const turnThreshold = this.difficulty === 'demon' ? 0.05 : 0.08;
    if (angleDiff > turnThreshold) steer = 1;
    else if (angleDiff < -turnThreshold) steer = -1;

    // Smart Throttle Control
    let accelerate = true;
    let brake = false;

    // Ease off throttle if approaching a sharp turn to avoid wall smashes
    if (Math.abs(angleDiff) > 0.8 && this.p2.speed > 3.8) {
      accelerate = false;
      if (Math.abs(angleDiff) > 1.4 && this.difficulty !== 'baby') {
        brake = true;
      }
    }

    return {
      x: steer,
      y: brake ? 1 : accelerate ? -1 : 0,
      action: accelerate
    };
  }

  draw() {
    this.ctx.save();

    // Background Turf
    this.ctx.fillStyle = this.track.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Outer Track Asphalt
    this.ctx.fillStyle = this.track.trackColor;
    this.ctx.beginPath();
    this.ctx.roundRect(
      this.track.outer.x, 
      this.track.outer.y, 
      this.track.outer.w, 
      this.track.outer.h, 
      this.track.outer.r
    );
    this.ctx.fill();

    // Outer Curb Stripe
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 6;
    this.ctx.setLineDash([14, 14]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Inner Infield / Island
    this.ctx.fillStyle = this.track.innerColor;
    this.ctx.beginPath();
    this.ctx.roundRect(
      this.track.inner.x, 
      this.track.inner.y, 
      this.track.inner.w, 
      this.track.inner.h, 
      this.track.inner.r
    );
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([12, 12]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Start / Finish Line Checkered Pattern
    const flX = this.track.startLine.x;
    const flY = this.height - 135;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 2; col++) {
        this.ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#0f172a';
        this.ctx.fillRect(flX + col * 8 - 8, flY + row * 10, 8, 10);
      }
    }

    // Skid marks
    for (const sm of this.skidMarks) {
      this.ctx.save();
      this.ctx.translate(sm.x, sm.y);
      this.ctx.rotate(sm.angle);
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      this.ctx.fillRect(-6, -6, 5, 2);
      this.ctx.fillRect(-6, 4, 5, 2);
      this.ctx.restore();
    }

    // Draw Karts
    this.drawKart(this.p1);
    this.drawKart(this.p2);

    // Track Name Badge & HUD
    this.ctx.font = 'bold 20px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`🏁 ${this.track.name}`, this.width / 2, 32);

    this.ctx.fillStyle = '#0ea5e9';
    this.ctx.fillText(`P1: LAP ${Math.min(this.totalLaps, this.p1.laps + 1)}/${this.totalLaps}`, this.width * 0.22, 32);

    this.ctx.fillStyle = '#f43f5e';
    this.ctx.fillText(`P2: LAP ${Math.min(this.totalLaps, this.p2.laps + 1)}/${this.totalLaps}`, this.width * 0.78, 32);

    this.ctx.restore();
  }

  drawKart(kart) {
    this.ctx.save();
    this.ctx.translate(kart.x, kart.y);
    this.ctx.rotate(kart.angle);

    // Tires
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(-kart.size - 2, -kart.size + 2, 7, 5);
    this.ctx.fillRect(kart.size - 5, -kart.size + 2, 7, 5);
    this.ctx.fillRect(-kart.size - 2, kart.size - 7, 7, 5);
    this.ctx.fillRect(kart.size - 5, kart.size - 7, 7, 5);

    // Chassis
    this.ctx.fillStyle = kart.color;
    this.ctx.beginPath();
    this.ctx.roundRect(-kart.size, -kart.size + 4, kart.size * 2, (kart.size - 4) * 2, 5);
    this.ctx.fill();

    // Spoiler
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-kart.size - 2, -kart.size + 5, 4, (kart.size - 5) * 2);

    // Driver Helmet
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}
