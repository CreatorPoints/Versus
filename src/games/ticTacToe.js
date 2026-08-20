/**
 * VERSUS - Tic Tac Toe Mini-Game
 * Sleek neon board, animated X/O drawing strokes, winning line slashes, Minimax AI.
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';
import { input } from '../engine/input.js';
import { network } from '../engine/network.js';

export class TicTacToe {
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
    this.targetScore = 1;
    this.isOver = false;

    this.gridSize = 3;
    this.cellSize = 110;
    this.boardX = (this.width - this.gridSize * this.cellSize) / 2;
    this.boardY = (this.height - this.gridSize * this.cellSize) / 2 + 15;

    this.resetRound();
  }

  resetRound() {
    this.board = Array(9).fill(null); // 'X' or 'O'
    this.turn = 'X'; // X is P1 (Blue), O is P2 (Pink)
    this.cursor = { x: 1, y: 1 };
    this.prevInput = { x: 0, y: 0, action: false };
    this.winningLine = null; // [startIdx, endIdx]
    this.animProgress = Array(9).fill(1);
    this.roundEnding = false;
    this.statusText = "PLAYER 1'S TURN (X)";

    if (this.onRoundReset) this.onRoundReset();
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver) return;

    // Enforce Online Turn Authorization
    if (network.connected && network.mode !== 'ai' && network.mode !== 'local') {
      if (network.role === 'host' && this.turn !== 'X') return;
      if (network.role === 'guest' && this.turn !== 'O') return;
    }

    const curInput = this.turn === 'X' ? p1Input : p2Input;

    // Bot turn
    if (this.turn === 'O' && isBotP2 && !this.roundEnding) {
      if (!this.botMoveScheduled) {
        this.botMoveScheduled = true;
        const delay = this.difficulty === 'demon' ? 250 : this.difficulty === 'hard' ? 400 : 600;
        setTimeout(() => {
          if (!this.roundEnding && !this.isOver && this.turn === 'O') {
            this.makeBotMove();
          }
          this.botMoveScheduled = false;
        }, delay);
      }
      return;
    }

    // Keyboard cursor navigation
    if (curInput.x > 0.5 && this.prevInput.x <= 0.5) this.cursor.x = (this.cursor.x + 1) % 3;
    if (curInput.x < -0.5 && this.prevInput.x >= -0.5) this.cursor.x = (this.cursor.x + 2) % 3;
    if (curInput.y > 0.5 && this.prevInput.y <= 0.5) this.cursor.y = (this.cursor.y + 1) % 3;
    if (curInput.y < -0.5 && this.prevInput.y >= -0.5) this.cursor.y = (this.cursor.y + 2) % 3;

    if (curInput.justAction) {
      const idx = this.cursor.y * 3 + this.cursor.x;
      this.playMove(idx, false);
    }

    // Mouse click handling
    if (input.mouse.down && !this.prevMouseDown) {
      const mx = input.mouse.canvasX;
      const my = input.mouse.canvasY;
      if (
        mx >= this.boardX &&
        mx < this.boardX + this.gridSize * this.cellSize &&
        my >= this.boardY &&
        my < this.boardY + this.gridSize * this.cellSize
      ) {
        const col = Math.floor((mx - this.boardX) / this.cellSize);
        const row = Math.floor((my - this.boardY) / this.cellSize);
        const idx = row * 3 + col;
        this.cursor.x = col;
        this.cursor.y = row;
        this.playMove(idx, false);
      }
    }

    this.prevInput.x = curInput.x;
    this.prevInput.y = curInput.y;
    this.prevMouseDown = input.mouse.down;
  }

  playMove(idx, isRemote = false) {
    if (this.board[idx] !== null || this.roundEnding) return false;

    if (!isRemote && network.connected && network.mode !== 'ai' && network.mode !== 'local') {
      network.send({ type: 'TTT_MOVE', index: idx });
    }

    this.board[idx] = this.turn;
    sound.playShoot(this.turn === 'X' ? 'laser' : 'sword');

    const cellCol = idx % 3;
    const cellRow = Math.floor(idx / 3);
    const cx = this.boardX + cellCol * this.cellSize + this.cellSize / 2;
    const cy = this.boardY + cellRow * this.cellSize + this.cellSize / 2;
    particles.spawnSparks(cx, cy, this.turn === 'X' ? '#0ea5e9' : '#f43f5e', 12, 4);

    const winResult = this.checkWin(this.board);
    if (winResult) {
      this.handleRoundWin(winResult.winner, winResult.line);
      return true;
    }

    if (this.board.every((c) => c !== null)) {
      this.handleDraw();
      return true;
    }

    this.turn = this.turn === 'X' ? 'O' : 'X';
    this.statusText = this.turn === 'X' ? "PLAYER 1'S TURN (X)" : "PLAYER 2'S TURN (O)";
    return true;
  }

  handleRoundWin(winnerSymbol, line) {
    this.roundEnding = true;
    this.winningLine = line;

    if (winnerSymbol === 'X') {
      this.p1Score++;
      this.statusText = 'POINT BLUE (X)!';
      sound.playCheer();
      particles.addFloatingText('WINNER X!', this.width / 2, this.height * 0.22, '#0ea5e9', 30);
    } else {
      this.p2Score++;
      this.statusText = 'POINT PINK (O)!';
      sound.playCheer();
      particles.addFloatingText('WINNER O!', this.width / 2, this.height * 0.22, '#f43f5e', 30);
    }

    setTimeout(() => {
      if (this.p1Score >= this.targetScore || this.p2Score >= this.targetScore) {
        this.isOver = true;
        const winner = this.p1Score > this.p2Score ? 1 : 2;
        this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score });
      } else {
        this.resetRound();
      }
    }, 2000);
  }

  handleDraw() {
    this.roundEnding = true;
    this.statusText = 'DRAW ROUND!';
    sound.playBounce(true);
    particles.addFloatingText('STALEMATE!', this.width / 2, this.height * 0.22, '#f59e0b', 28);

    setTimeout(() => {
      this.resetRound();
    }, 1800);
  }

  checkWin(board) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return null;
  }

  makeBotMove() {
    const emptyIndices = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) emptyIndices.push(i);
    }
    if (emptyIndices.length === 0) return;

    let chosenIdx = null;

    if (this.difficulty === 'baby') {
      // 85% random, 15% win/block
      if (Math.random() < 0.85) {
        chosenIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      }
    } else if (this.difficulty === 'normal') {
      // Look for immediate win or block, otherwise random
      for (const idx of emptyIndices) {
        const testBoard = [...this.board];
        testBoard[idx] = 'O';
        if (this.checkWin(testBoard)) { chosenIdx = idx; break; }
      }
      if (chosenIdx === null) {
        for (const idx of emptyIndices) {
          const testBoard = [...this.board];
          testBoard[idx] = 'X';
          if (this.checkWin(testBoard) && Math.random() < 0.7) { chosenIdx = idx; break; }
        }
      }
    }

    if (chosenIdx === null) {
      // Minimax
      chosenIdx = this.getBestMinimaxMove();
    }

    if (chosenIdx !== null) {
      this.cursor.x = chosenIdx % 3;
      this.cursor.y = Math.floor(chosenIdx / 3);
      this.playMove(chosenIdx);
    }
  }

  getBestMinimaxMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) {
        this.board[i] = 'O';
        const score = this.minimax(this.board, 0, false);
        this.board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }

  minimax(board, depth, isMaximizing) {
    const win = this.checkWin(board);
    if (win) {
      return win.winner === 'O' ? 10 - depth : depth - 10;
    }
    if (board.every((c) => c !== null) || depth >= 5) {
      return 0;
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'O';
          const evalScore = this.minimax(board, depth + 1, false);
          board[i] = null;
          maxEval = Math.max(maxEval, evalScore);
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          const evalScore = this.minimax(board, depth + 1, true);
          board[i] = null;
          minEval = Math.min(minEval, evalScore);
        }
      }
      return minEval;
    }
  }

  draw() {
    this.ctx.save();

    // Background
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Board Backdrop Card
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.roundRect(this.boardX - 16, this.boardY - 16, this.gridSize * this.cellSize + 32, this.gridSize * this.cellSize + 32, 24);
    this.ctx.fill();
    this.ctx.stroke();

    // Grid Lines
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';

    for (let c = 1; c < 3; c++) {
      const x = this.boardX + c * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.boardY);
      this.ctx.lineTo(x, this.boardY + this.gridSize * this.cellSize);
      this.ctx.stroke();
    }

    for (let r = 1; r < 3; r++) {
      const y = this.boardY + r * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX, y);
      this.ctx.lineTo(this.boardX + this.gridSize * this.cellSize, y);
      this.ctx.stroke();
    }

    // Cursor Highlight
    if (!this.roundEnding) {
      const curX = this.boardX + this.cursor.x * this.cellSize;
      const curY = this.boardY + this.cursor.y * this.cellSize;
      this.ctx.fillStyle = this.turn === 'X' ? 'rgba(14, 165, 233, 0.12)' : 'rgba(244, 63, 94, 0.12)';
      this.ctx.beginPath();
      this.ctx.roundRect(curX + 6, curY + 6, this.cellSize - 12, this.cellSize - 12, 14);
      this.ctx.fill();
    }

    // Render Markers (X & O)
    for (let i = 0; i < 9; i++) {
      const val = this.board[i];
      if (!val) continue;

      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = this.boardX + col * this.cellSize + this.cellSize / 2;
      const cy = this.boardY + row * this.cellSize + this.cellSize / 2;

      if (val === 'X') {
        this.ctx.strokeStyle = '#0ea5e9';
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'round';
        const rad = 28;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - rad, cy - rad);
        this.ctx.lineTo(cx + rad, cy + rad);
        this.ctx.moveTo(cx + rad, cy - rad);
        this.ctx.lineTo(cx - rad, cy + rad);
        this.ctx.stroke();
      } else {
        this.ctx.strokeStyle = '#f43f5e';
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    // Winning Strike Line
    if (this.winningLine) {
      const [startIdx, , endIdx] = this.winningLine;
      const c1 = startIdx % 3;
      const r1 = Math.floor(startIdx / 3);
      const c2 = endIdx % 3;
      const r2 = Math.floor(endIdx / 3);

      const x1 = this.boardX + c1 * this.cellSize + this.cellSize / 2;
      const y1 = this.boardY + r1 * this.cellSize + this.cellSize / 2;
      const x2 = this.boardX + c2 * this.cellSize + this.cellSize / 2;
      const y2 = this.boardY + r2 * this.cellSize + this.cellSize / 2;

      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 12;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    // Turn / Status Text
    this.ctx.font = 'bold 22px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.turn === 'X' ? '#0ea5e9' : '#f43f5e';
    this.ctx.fillText(this.statusText, this.width / 2, 40);

    // Score HUD
    this.drawScoreHUD();

    this.ctx.restore();
  }

  drawScoreHUD() {
    this.ctx.save();
    this.ctx.font = 'bold 24px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';

    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText(`P1 (X): ${this.p1Score}`, this.width * 0.2, 45);

    this.ctx.fillStyle = '#e11d48';
    this.ctx.fillText(`P2 (O): ${this.p2Score}`, this.width * 0.8, 45);
    this.ctx.restore();
  }
}
