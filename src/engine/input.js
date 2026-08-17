/**
 * VERSUS - Unified Input Manager
 * Handles Keyboard, Mouse (with precise canvas relative coords), Gamepad, and Virtual Touch.
 */

class InputManager {
  constructor() {
    this.keys = {};
    this.p1 = { x: 0, y: 0, action: false, action2: false, justAction: false };
    this.p2 = { x: 0, y: 0, action: false, action2: false, justAction: false };
    
    this.mouse = {
      active: false,
      down: false,
      canvasX: 0,
      canvasY: 0,
      lastMoveTime: 0
    };

    this.touchP1 = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, action: false };
    this.touchP2 = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, action: false };

    this.virtualEnabled = false;
    this.isLocal2P = false;

    this.initKeyboard();
    this.initMouse();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  initMouse() {
    const updateMousePos = (e) => {
      const canvas = document.getElementById('gameCanvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      this.mouse.canvasX = (e.clientX - rect.left) * scaleX;
      this.mouse.canvasY = (e.clientY - rect.top) * scaleY;
      this.mouse.active = true;
      this.mouse.lastMoveTime = performance.now();
    };

    window.addEventListener('mousemove', (e) => {
      updateMousePos(e);
    });

    window.addEventListener('mousedown', (e) => {
      const canvas = document.getElementById('gameCanvas');
      if (canvas && e.target === canvas) {
        this.mouse.down = true;
        updateMousePos(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
  }

  initTouch() {
    window.addEventListener('touchstart', () => {
      if (!this.virtualEnabled) {
        this.virtualEnabled = true;
      }
    }, { passive: true });
  }

  setLocal2P(isLocal) {
    this.isLocal2P = isLocal;
  }

  update() {
    // 1. Process P1 (WASD + Space / F / Touch 1 / Mouse click)
    let p1X = 0;
    let p1Y = 0;
    if (this.keys['KeyA'] || this.keys['a']) p1X -= 1;
    if (this.keys['KeyD'] || this.keys['d']) p1X += 1;
    if (this.keys['KeyW'] || this.keys['w']) p1Y -= 1;
    if (this.keys['KeyS'] || this.keys['s']) p1Y += 1;

    // Virtual Touch P1
    if (this.touchP1.active) {
      const dx = this.touchP1.curX - this.touchP1.startX;
      const dy = this.touchP1.curY - this.touchP1.startY;
      const dist = Math.hypot(dx, dy);
      const maxR = 40;
      if (dist > 5) {
        const clampedDist = Math.min(dist, maxR) / maxR;
        p1X = (dx / dist) * clampedDist;
        p1Y = (dy / dist) * clampedDist;
      }
    }

    const p1Action = Boolean(
      this.keys['Space'] || 
      this.keys['KeyF'] || 
      this.keys['f'] || 
      this.touchP1.action ||
      this.mouse.down
    );

    this.p1.justAction = p1Action && !this.p1.action;
    this.p1.action = p1Action;
    this.p1.x = p1X;
    this.p1.y = p1Y;

    // 2. Process P2 (Arrows + Enter / L / Touch 2)
    let p2X = 0;
    let p2Y = 0;
    if (this.keys['ArrowLeft']) p2X -= 1;
    if (this.keys['ArrowRight']) p2X += 1;
    if (this.keys['ArrowUp']) p2Y -= 1;
    if (this.keys['ArrowDown']) p2Y += 1;

    if (this.touchP2.active) {
      const dx = this.touchP2.curX - this.touchP2.startX;
      const dy = this.touchP2.curY - this.touchP2.startY;
      const dist = Math.hypot(dx, dy);
      const maxR = 40;
      if (dist > 5) {
        const clampedDist = Math.min(dist, maxR) / maxR;
        p2X = (dx / dist) * clampedDist;
        p2Y = (dy / dist) * clampedDist;
      }
    }

    const p2Action = Boolean(
      this.keys['Enter'] || 
      this.keys['NumpadEnter'] || 
      this.keys['KeyL'] || 
      this.keys['l'] || 
      this.keys['Slash'] ||
      this.touchP2.action
    );

    this.p2.justAction = p2Action && !this.p2.action;
    this.p2.action = p2Action;
    this.p2.x = p2X;
    this.p2.y = p2Y;

    // 3. Process Gamepad
    this.pollGamepads();
  }

  pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepads[0]) {
      const gp = gamepads[0];
      const stickX = gp.axes[0];
      const stickY = gp.axes[1];
      const deadzone = 0.18;
      if (Math.abs(stickX) > deadzone || Math.abs(stickY) > deadzone) {
        this.p1.x = Math.abs(stickX) > deadzone ? stickX : 0;
        this.p1.y = Math.abs(stickY) > deadzone ? stickY : 0;
      }
      if (gp.buttons[0] && gp.buttons[0].pressed) {
        this.p1.action = true;
      }
    }

    if (gamepads[1]) {
      const gp = gamepads[1];
      const stickX = gp.axes[0];
      const stickY = gp.axes[1];
      const deadzone = 0.18;
      if (Math.abs(stickX) > deadzone || Math.abs(stickY) > deadzone) {
        this.p2.x = Math.abs(stickX) > deadzone ? stickX : 0;
        this.p2.y = Math.abs(stickY) > deadzone ? stickY : 0;
      }
      if (gp.buttons[0] && gp.buttons[0].pressed) {
        this.p2.action = true;
      }
    }
  }
}

export const input = new InputManager();
