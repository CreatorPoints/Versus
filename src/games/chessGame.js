/**
 * VERSUS - Chess Mini-Game with Lichess-Style Game Analysis & Elo Engine
 * Tracks move quality (Brilliant, Great, Best, Inaccuracy, Mistake, Blunder),
 * accuracy percentage, and provides in-depth post-game review.
 */
import { sound } from '../audio/sound.js';
import { particles } from '../engine/particles.js';
import { input } from '../engine/input.js';

export class ChessGame {
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

    this.boardSize = 8;
    this.tileSize = 52;
    this.boardX = (this.width - this.boardSize * this.tileSize) / 2;
    this.boardY = (this.height - this.boardSize * this.tileSize) / 2 + 10;

    this.PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    this.resetRound();
  }

  resetRound() {
    this.board = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    this.turn = 'white';
    this.selectedTile = null;
    this.validMoves = [];
    this.cursor = { col: 4, row: 6 };
    this.prevInput = { x: 0, y: 0, action: false };
    this.roundEnding = false;
    this.moveHistory = [];
    this.botMoveScheduled = false;

    const eloMap = { baby: 400, normal: 1100, hard: 1700, demon: 2400 };
    this.botElo = eloMap[this.difficulty] || 1100;
    this.p1Elo = 1500;
    this.statusText = `WHITE TO MOVE (P1) | BOT ELO: ${this.botElo}`;

    if (this.onRoundReset) this.onRoundReset();
  }

  resign(playerResigning = 1) {
    if (this.roundEnding || this.isOver) return;
    const winner = playerResigning === 1 ? 2 : 1;
    const reason = playerResigning === 1 ? 'White Resigned' : 'Black Resigned';
    this.finishGame(winner, reason);
  }

  update(p1Input, p2Input, isBotP2 = false) {
    if (this.isOver || this.roundEnding) return;

    const curInput = this.turn === 'white' ? p1Input : p2Input;

    if (this.turn === 'black' && isBotP2 && !this.roundEnding) {
      if (!this.botMoveScheduled) {
        this.botMoveScheduled = true;
        const thinkTime = this.difficulty === 'demon' ? 450 : this.difficulty === 'hard' ? 350 : 250;
        setTimeout(() => {
          if (!this.roundEnding && !this.isOver && this.turn === 'black') {
            this.makeBotMove();
          }
          this.botMoveScheduled = false;
        }, thinkTime);
      }
      return;
    }

    if (curInput.x > 0.5 && this.prevInput.x <= 0.5) this.cursor.col = Math.min(7, this.cursor.col + 1);
    if (curInput.x < -0.5 && this.prevInput.x >= -0.5) this.cursor.col = Math.max(0, this.cursor.col - 1);
    if (curInput.y > 0.5 && this.prevInput.y <= 0.5) this.cursor.row = Math.min(7, this.cursor.row + 1);
    if (curInput.y < -0.5 && this.prevInput.y >= -0.5) this.cursor.row = Math.max(0, this.cursor.row - 1);

    if (curInput.justAction) {
      this.handleSquareSelect(this.cursor.row, this.cursor.col);
    }

    if (input.mouse.down && !this.prevMouseDown) {
      const mx = input.mouse.canvasX;
      const my = input.mouse.canvasY;
      if (
        mx >= this.boardX &&
        mx < this.boardX + this.boardSize * this.tileSize &&
        my >= this.boardY &&
        my < this.boardY + this.boardSize * this.tileSize
      ) {
        const col = Math.floor((mx - this.boardX) / this.tileSize);
        const row = Math.floor((my - this.boardY) / this.tileSize);
        this.cursor.col = col;
        this.cursor.row = row;
        this.handleSquareSelect(row, col);
      }
    }

    this.prevInput.x = curInput.x;
    this.prevInput.y = curInput.y;
    this.prevMouseDown = input.mouse.down;
  }

  handleSquareSelect(row, col) {
    if (this.roundEnding) return;
    const piece = this.board[row][col];
    const isWhiteTurn = this.turn === 'white';

    if (this.selectedTile) {
      const move = this.validMoves.find((m) => m.toRow === row && m.toCol === col);
      if (move) {
        this.executeMove(this.selectedTile.row, this.selectedTile.col, row, col);
        this.selectedTile = null;
        this.validMoves = [];
        return;
      }
    }

    if (piece && ((isWhiteTurn && piece === piece.toUpperCase()) || (!isWhiteTurn && piece === piece.toLowerCase()))) {
      this.selectedTile = { row, col };
      this.validMoves = this.generatePieceMoves(this.board, row, col);
      sound.playClick();
    } else {
      this.selectedTile = null;
      this.validMoves = [];
    }
  }

  executeMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const captured = this.board[toRow][toCol];
    const evalBefore = this.evaluateBoard(this.board);

    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    if (piece === 'P' && toRow === 0) this.board[toRow][toCol] = 'Q';
    if (piece === 'p' && toRow === 7) this.board[toRow][toCol] = 'q';

    const evalAfter = this.evaluateBoard(this.board);
    const evalDiff = this.turn === 'white' ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

    // Classify move
    let classification = 'best';
    if (captured && piece.toLowerCase() !== 'q' && captured.toLowerCase() === 'q') {
      classification = 'brilliant';
    } else if (evalDiff >= 150) {
      classification = 'great';
    } else if (evalDiff >= -30) {
      classification = 'best';
    } else if (evalDiff >= -100) {
      classification = 'inaccuracy';
    } else if (evalDiff >= -250) {
      classification = 'mistake';
    } else {
      classification = 'blunder';
    }

    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const san = `${piece.toUpperCase() !== 'P' ? piece.toUpperCase() : ''}${cols[fromCol]}${8 - fromRow}➔${cols[toCol]}${8 - toRow}`;

    this.moveHistory.push({
      player: this.turn,
      san,
      classification,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol }
    });

    const cx = this.boardX + toCol * this.tileSize + this.tileSize / 2;
    const cy = this.boardY + toRow * this.tileSize + this.tileSize / 2;

    if (captured) {
      sound.playHit();
      particles.shake(6, 6);
      particles.spawnSparks(cx, cy, this.turn === 'white' ? '#0ea5e9' : '#f43f5e', 14, 5);
      if (captured.toLowerCase() === 'k') {
        this.finishGame(this.turn === 'white' ? 1 : 2, 'King Captured');
        return;
      }
    } else {
      sound.playShoot('laser');
    }

    this.turn = this.turn === 'white' ? 'black' : 'white';
    this.statusText = this.turn === 'white' ? "WHITE'S TURN (P1)" : `BLACK'S TURN [ELO: ${this.botElo}]`;

    const allOpponentMoves = this.getAllLegalMoves(this.board, this.turn);
    if (allOpponentMoves.length === 0) {
      this.finishGame(this.turn === 'white' ? 2 : 1, 'Checkmate');
    }
  }

  generateGameAnalysis(winner, reason) {
    const p1Moves = this.moveHistory.filter((m) => m.player === 'white');
    const p2Moves = this.moveHistory.filter((m) => m.player === 'black');

    const countClass = (moves, cls) => moves.filter((m) => m.classification === cls).length;

    const p1Stats = {
      brilliant: countClass(p1Moves, 'brilliant'),
      great: countClass(p1Moves, 'great'),
      best: countClass(p1Moves, 'best'),
      inaccuracy: countClass(p1Moves, 'inaccuracy'),
      mistake: countClass(p1Moves, 'mistake'),
      blunder: countClass(p1Moves, 'blunder')
    };

    const p2Stats = {
      brilliant: countClass(p2Moves, 'brilliant'),
      great: countClass(p2Moves, 'great'),
      best: countClass(p2Moves, 'best'),
      inaccuracy: countClass(p2Moves, 'inaccuracy'),
      mistake: countClass(p2Moves, 'mistake'),
      blunder: countClass(p2Moves, 'blunder')
    };

    const calcAcc = (stats, total) => {
      if (!total) return 85.0;
      const penalty = (stats.blunder * 14 + stats.mistake * 7 + stats.inaccuracy * 3) / total;
      return Math.max(35.0, Math.min(99.4, +(95.0 - penalty * 10).toFixed(1)));
    };

    const p1Acc = calcAcc(p1Stats, p1Moves.length);
    const p2Acc = calcAcc(p2Stats, p2Moves.length);

    // Performance ratings
    const p1Perf = Math.round(this.botElo * (p1Acc / 100) + (winner === 1 ? 250 : -150));
    const p2Perf = Math.round(this.p1Elo * (p2Acc / 100) + (winner === 2 ? 250 : -150));

    let pgnStr = '';
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const w = this.moveHistory[i] ? this.moveHistory[i].san : '';
      const b = this.moveHistory[i + 1] ? this.moveHistory[i + 1].san : '';
      pgnStr += `${moveNum}. ${w} ${b}  `;
    }

    return {
      winner,
      reason,
      totalMoves: this.moveHistory.length,
      p1Elo: this.p1Elo,
      p2Elo: this.botElo,
      p1Acc,
      p2Acc,
      p1Perf,
      p2Perf,
      p1Stats,
      p2Stats,
      pgn: pgnStr.trim() || '1. e4 e5 2. Nf3 Nc6'
    };
  }

  finishGame(winner, reason = 'Checkmate') {
    if (this.roundEnding) return;
    this.roundEnding = true;
    this.isOver = true;

    sound.playVictory();
    sound.playCheer();

    if (winner === 1) {
      this.p1Score = 1;
      particles.addFloatingText(`${reason.toUpperCase()}! P1 WINS!`, this.width / 2, this.height * 0.2, '#0ea5e9', 32);
    } else {
      this.p2Score = 1;
      particles.addFloatingText(`${reason.toUpperCase()}! P2 WINS!`, this.width / 2, this.height * 0.2, '#f43f5e', 32);
    }

    const analysis = this.generateGameAnalysis(winner, reason);

    setTimeout(() => {
      this.onGameOver(winner, { p1: this.p1Score, p2: this.p2Score }, analysis);
    }, 1600);
  }

  generatePieceMoves(board, row, col) {
    const piece = board[row][col];
    if (!piece) return [];

    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const type = piece.toLowerCase();

    const addMove = (r, c) => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const target = board[r][c];
      if (!target) {
        moves.push({ toRow: r, toCol: c });
        return true;
      }
      const targetIsWhite = target === target.toUpperCase();
      if (isWhite !== targetIsWhite) {
        moves.push({ toRow: r, toCol: c });
      }
      return false;
    };

    if (type === 'p') {
      const dir = isWhite ? -1 : 1;
      const startRow = isWhite ? 6 : 1;
      if (row + dir >= 0 && row + dir <= 7 && !board[row + dir][col]) {
        moves.push({ toRow: row + dir, toCol: col });
        if (row === startRow && !board[row + dir * 2][col]) {
          moves.push({ toRow: row + dir * 2, toCol: col });
        }
      }
      for (const dc of [-1, 1]) {
        const tr = row + dir;
        const tc = col + dc;
        if (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
          const tgt = board[tr][tc];
          if (tgt && (isWhite ? tgt === tgt.toLowerCase() : tgt === tgt.toUpperCase())) {
            moves.push({ toRow: tr, toCol: tc });
          }
        }
      }
    }

    if (type === 'n') {
      const kOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of kOffsets) {
        addMove(row + dr, col + dc);
      }
    }

    if (type === 'b' || type === 'q') {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of dirs) {
        let r = row + dr;
        let c = col + dc;
        while (addMove(r, c)) {
          r += dr;
          c += dc;
        }
      }
    }

    if (type === 'r' || type === 'q') {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        let r = row + dr;
        let c = col + dc;
        while (addMove(r, c)) {
          r += dr;
          c += dc;
        }
      }
    }

    if (type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) addMove(row + dr, col + dc);
        }
      }
    }

    return moves;
  }

  getAllLegalMoves(board, color) {
    const allMoves = [];
    const isWhite = color === 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && (isWhite ? piece === piece.toUpperCase() : piece === piece.toLowerCase())) {
          const pieceMoves = this.generatePieceMoves(board, r, c);
          for (const m of pieceMoves) {
            allMoves.push({ fromRow: r, fromCol: c, toRow: m.toRow, toCol: m.toCol });
          }
        }
      }
    }
    return allMoves;
  }

  makeBotMove() {
    const legalMoves = this.getAllLegalMoves(this.board, 'black');
    if (legalMoves.length === 0) return;

    let chosenMove = null;

    if (this.difficulty === 'baby') {
      const captures = legalMoves.filter((m) => this.board[m.toRow][m.toCol] !== null);
      if (captures.length > 0 && Math.random() < 0.25) {
        chosenMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    } else if (this.difficulty === 'normal') {
      let bestScore = -Infinity;
      for (const m of legalMoves) {
        const captured = this.board[m.toRow][m.toCol];
        let score = (captured ? this.PIECE_VALUES[captured.toLowerCase()] : 0) + (Math.random() * 20);
        if (m.toRow >= 3 && m.toRow <= 4 && m.toCol >= 3 && m.toCol <= 4) score += 15;
        if (score > bestScore) {
          bestScore = score;
          chosenMove = m;
        }
      }
    } else {
      const depth = this.difficulty === 'demon' ? 3 : 2;
      let bestScore = -Infinity;
      for (const m of legalMoves) {
        const origTarget = this.board[m.toRow][m.toCol];
        const origPiece = this.board[m.fromRow][m.fromCol];

        this.board[m.toRow][m.toCol] = origPiece;
        this.board[m.fromRow][m.fromCol] = null;

        const score = -this.alphaBeta(this.board, depth - 1, -Infinity, Infinity, 'white');

        this.board[m.fromRow][m.fromCol] = origPiece;
        this.board[m.toRow][m.toCol] = origTarget;

        if (score > bestScore) {
          bestScore = score;
          chosenMove = m;
        }
      }
    }

    if (chosenMove) {
      this.executeMove(chosenMove.fromRow, chosenMove.fromCol, chosenMove.toRow, chosenMove.toCol);
    }
  }

  alphaBeta(board, depth, alpha, beta, color) {
    if (depth === 0) return this.evaluateBoard(board);

    const moves = this.getAllLegalMoves(board, color);
    if (moves.length === 0) return -10000;

    let bestScore = -Infinity;
    for (const m of moves) {
      const origTarget = board[m.toRow][m.toCol];
      const origPiece = board[m.fromRow][m.fromCol];

      board[m.toRow][m.toCol] = origPiece;
      board[m.fromRow][m.fromCol] = null;

      const nextColor = color === 'black' ? 'white' : 'black';
      const score = -this.alphaBeta(board, depth - 1, -beta, -alpha, nextColor);

      board[m.fromRow][m.fromCol] = origPiece;
      board[m.toRow][m.toCol] = origTarget;

      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return bestScore;
  }

  evaluateBoard(board) {
    let evalScore = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const val = this.PIECE_VALUES[piece.toLowerCase()] || 0;
        const isBlack = piece === piece.toLowerCase();

        let posBonus = 0;
        if (r >= 2 && r <= 5 && c >= 2 && c <= 5) posBonus = 12;

        if (isBlack) evalScore += val + posBonus;
        else evalScore -= val + posBonus;
      }
    }
    return evalScore;
  }

  draw() {
    this.ctx.save();

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.roundRect(this.boardX - 12, this.boardY - 12, this.boardSize * this.tileSize + 24, this.boardSize * this.tileSize + 24, 20);
    this.ctx.fill();
    this.ctx.stroke();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        const x = this.boardX + c * this.tileSize;
        const y = this.boardY + r * this.tileSize;

        this.ctx.fillStyle = isLight ? '#f1f5f9' : '#94a3b8';
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

        if (this.selectedTile && this.selectedTile.row === r && this.selectedTile.col === c) {
          this.ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
          this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        }

        const isMove = this.validMoves.some((m) => m.toRow === r && m.toCol === c);
        if (isMove) {
          this.ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
          this.ctx.beginPath();
          this.ctx.arc(x + this.tileSize / 2, y + this.tileSize / 2, 8, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    if (!this.roundEnding) {
      const curX = this.boardX + this.cursor.col * this.tileSize;
      const curY = this.boardY + this.cursor.row * this.tileSize;
      this.ctx.strokeStyle = this.turn === 'white' ? '#0ea5e9' : '#f43f5e';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(curX + 2, curY + 2, this.tileSize - 4, this.tileSize - 4);
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece) {
          this.drawPiece(piece, this.boardX + c * this.tileSize, this.boardY + r * this.tileSize);
        }
      }
    }

    this.ctx.font = 'bold 20px "Fredoka", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.turn === 'white' ? '#0ea5e9' : '#f43f5e';
    this.ctx.fillText(this.statusText, this.width / 2, 34);

    this.ctx.restore();
  }

  drawPiece(piece, x, y) {
    const isWhite = piece === piece.toUpperCase();
    const type = piece.toLowerCase();
    const symbols = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const sym = symbols[type] || '';

    this.ctx.save();
    this.ctx.font = '36px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const cx = x + this.tileSize / 2;
    const cy = y + this.tileSize / 2 + 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.fillText(sym, cx + 2, cy + 2);

    this.ctx.fillStyle = isWhite ? '#0284c7' : '#e11d48';
    this.ctx.fillText(sym, cx, cy);

    this.ctx.restore();
  }
}
