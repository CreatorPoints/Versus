/**
 * VERSUS - 6KRO / NKRO Multi-Key Rollover Input Manager
 * Features directional stacks (SOCD priority): pressing another key while holding an existing key
 * will never break or drop the initial held key state when released.
 */

class InputManager {
  constructor() {
    this.activeCodes = new Set();

    // Directional stacks preserving key press order
    this.p1StackX = [];
    this.p1StackY = [];
    this.p2StackX = [];
    this.p2StackY = [];

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
    const preventCodes = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    window.addEventListener('keydown', (e) => {
      if (preventCodes.includes(e.code)) {
        e.preventDefault();
      }

      this.activeCodes.add(e.code);

      // Track P1 Directional Stacks
      if (e.code === 'KeyA' || e.code === 'KeyD') {
        this.p1StackX = this.p1StackX.filter((c) => c !== e.code);
        this.p1StackX.push(e.code);
      }
      if (e.code === 'KeyW' || e.code === 'KeyS') {
        this.p1StackY = this.p1StackY.filter((c) => c !== e.code);
        this.p1StackY.push(e.code);
      }

      // Track P2 Directional Stacks
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        this.p2StackX = this.p2StackX.filter((c) => c !== e.code);
        this.p2StackX.push(e.code);
      }
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        this.p2StackY = this.p2StackY.filter((c) => c !== e.code);
        this.p2StackY.push(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.activeCodes.delete(e.code);

      // Remove from stacks while keeping older held keys active
      this.p1StackX = this.p1StackX.filter((c) => c !== e.code);
      this.p1StackY = this.p1StackY.filter((c) => c !== e.code);
      this.p2StackX = this.p2StackX.filter((c) => c !== e.code);
      this.p2StackY = this.p2StackY.filter((c) => c !== e.code);
    });

    // Clear on blur so keys never get stuck
    window.addEventListener('blur', () => {
      this.activeCodes.clear();
      this.p1StackX = [];
      this.p1StackY = [];
      this.p2StackX = [];
      this.p2StackY = [];
      this.mouse.down = false;
    });
  }

  isCodeActive(codeList) {
    for (let i = 0; i < codeList.length; i++) {
      if (this.activeCodes.has(codeList[i])) return true;
    }
    return false;
  }

  getStackVector(stack, negCode, posCode) {
    for (let i = stack.length - 1; i >= 0; i--) {
      const code = stack[i];
      if (this.activeCodes.has(code)) {
        if (code === negCode) return -1;
        if (code === posCode) return 1;
      }
    }
    if (this.activeCodes.has(negCode) && !this.activeCodes.has(posCode)) return -1;
    if (this.activeCodes.has(posCode) && !this.activeCodes.has(negCode)) return 1;
    return 0;
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
    // 1. Process P1 (WASD + Space / F / E / J + Touch + Mouse)
    let p1X = this.getStackVector(this.p1StackX, 'KeyA', 'KeyD');
    let p1Y = this.getStackVector(this.p1StackY, 'KeyW', 'KeyS');

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
      this.isCodeActive(['Space', 'KeyF', 'KeyE', 'KeyJ']) ||
      this.touchP1.action ||
      this.mouse.down
    );

    const now = performance.now();
    this.p1.justAction = p1Action && !this.p1.action;
    if (this.p1.justAction) {
      this.p1.actionTimestamp = now;
    }
    this.p1.action = p1Action;
    this.p1.x = p1X;
    this.p1.y = p1Y;

    // 2. Process P2 (Arrows + Enter / KeyK / KeyL / Numpad0 + Touch)
    let p2X = this.getStackVector(this.p2StackX, 'ArrowLeft', 'ArrowRight');
    let p2Y = this.getStackVector(this.p2StackY, 'ArrowUp', 'ArrowDown');

    // Virtual Touch P2
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
      this.isCodeActive(['Enter', 'Numpad0', 'KeyK', 'KeyL', 'Slash']) ||
      this.touchP2.action
    );

    this.p2.justAction = p2Action && !this.p2.action;
    if (this.p2.justAction) {
      this.p2.actionTimestamp = now;
    }
    this.p2.action = p2Action;
    this.p2.x = p2X;
    this.p2.y = p2Y;
  }
}

export const input = new InputManager();
