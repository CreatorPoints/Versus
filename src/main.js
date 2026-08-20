/**
 * VERSUS - High-Performance Game Application Controller
 * Dynamic Countdown Engine, 60-120 FPS Loop, High-DPI Scaling, Lazy Imports.
 */
import { sound } from './audio/sound.js';
import { input } from './engine/input.js';
import { particles } from './engine/particles.js';
import { network } from './engine/network.js';
import { countdown } from './engine/countdown.js';

// Games
import { GlowHockey } from './games/glowHockey.js';
import { SumoSpinners } from './games/sumoSpinners.js';
import { QuickDraw } from './games/quickDraw.js';
import { MicroSoccer } from './games/microSoccer.js';
import { MicroRace } from './games/microRace.js';
import { PinballDuel } from './games/pinballDuel.js';
import { TicTacToe } from './games/ticTacToe.js';
import { ChessGame } from './games/chessGame.js';
import { HotPotato } from './games/hotPotato.js';

class App {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    
    this.currentGameKey = 'hockey';
    this.currentGameInstance = null;
    this.gameMode = 'ai';
    this.difficulty = 'normal';
    this.theme = localStorage.getItem('versus_theme') || 'light';
    this.isPlaying = false;

    // Tournament State
    this.tournamentGames = [];
    this.tournamentIndex = 0;
    this.tournamentP1Wins = 0;
    this.tournamentP2Wins = 0;

    this.allGames = [
      { 
        key: 'hockey', 
        name: 'Hockey', 
        tag: 'Mouse / Keys',
        desc: 'Fast-paced arcade air hockey! Move paddle directly with Mouse or WASD, charge power smash shots, and blast goals into the opponent net.',
        class: GlowHockey 
      },
      { 
        key: 'sumo', 
        name: 'Spinner War', 
        tag: 'Ring Out!',
        desc: 'Clash in a crumbling hexagon arena where edge tiles fall into the abyss over time! Boost-ram your opponent off the edge.',
        class: SumoSpinners 
      },
      { 
        key: 'draw', 
        name: 'Quick Shot', 
        tag: 'Reflex Duel',
        desc: 'Wild West reaction shootout! Wait for the official "FIRE!" cue without misfiring early, and strike with lightning reflexes.',
        class: QuickDraw 
      },
      { 
        key: 'soccer', 
        name: 'Soccer', 
        tag: 'Bicycle Kick',
        desc: '1v1 physics capsule soccer. Leap into the air, flip and bicycle kick the ball into the net before time expires!',
        class: MicroSoccer 
      },
      { 
        key: 'race', 
        name: 'Race Cars', 
        tag: 'Variable Maps',
        desc: 'Top-down arcade kart grand prix with variable tracks (Speedway, Cyber GP, Desert Oval)! Drift tight around curves and conquer 3 full laps.',
        class: MicroRace 
      },
      { 
        key: 'pinball', 
        name: 'Pinball', 
        tag: 'Bumper Bounce',
        desc: 'Dual-paddle pinball table with high-impulse bumpers in the center! Angle your deflection shots to slip past the opponent.',
        class: PinballDuel 
      },
      {
        key: 'tictactoe',
        name: 'Tic Tac Toe',
        tag: 'Classic Duel',
        desc: 'Fast neon 3x3 strategy! Connect 3 in a row, block opponent streaks, and test your tactics against Minimax AI.',
        class: TicTacToe
      },
      {
        key: 'chess',
        name: 'Chess',
        tag: 'Elo Ranked AI',
        desc: 'Grandmaster strategy duel! Face AI bots ranked from 400 Elo (Baby) to 2400+ Elo (Demon Alpha-Beta Master).',
        class: ChessGame
      },
      {
        key: 'hotpotato',
        name: 'Hot Potato',
        tag: 'Explosive Tag',
        desc: 'Frantic bomb-passing arena showdown! Tag your opponent before the ticking fuse reaches zero and detonates!',
        class: HotPotato
      }
    ];

    this.initTheme();
    this.initUI();
    this.initTouchControls();
    this.initNetworkListeners();
    this.selectGame('hockey');
    this.setupCanvasDPI();
    this.startLoop();
    
    // Fun initial splash loading screen
    this.showLoading("Loading VERSUS Party Games...", 550);
  }

  showLoading(customMessage = null, duration = 400, onDone = null) {
    const overlay = document.getElementById('loadingOverlay');
    const tipText = document.getElementById('loadingTipText');
    if (!overlay) {
      if (onDone) onDone();
      return;
    }

    const tips = [
      "🏆 Polishing the championship trophy...",
      "⚽ Inflating the capsule soccer ball...",
      "🏎️ Tuning up the turbo drift engines...",
      "🛡️ Loading bouncy tank armor shells...",
      "🤠 Calibrating high-noon reflex timers...",
      "🏒 Waxing the glow hockey ice rink...",
      "⚔️ Sharpening plasma laser katanas...",
      "🎯 Installing high-impulse pinball bumpers...",
      "🎮 Syncing controller inputs & joysticks...",
      "🤖 Preparing smart AI challengers..."
    ];

    tipText.textContent = customMessage || tips[Math.floor(Math.random() * tips.length)];
    overlay.classList.remove('hidden');

    setTimeout(() => {
      overlay.classList.add('hidden');
      if (onDone) onDone();
    }, duration);
  }

  setupCanvasDPI() {
    this.canvas.width = 800;
    this.canvas.height = 500;
  }

  initTheme() {
    document.documentElement.dataset.theme = this.theme;
    this.updateThemeUI();
  }

  setTheme(newTheme) {
    this.theme = newTheme;
    localStorage.setItem('versus_theme', this.theme);
    document.documentElement.dataset.theme = this.theme;
    this.updateThemeUI();
  }

  updateThemeUI() {
    const isDark = this.theme === 'dark';
    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');
    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('hidden', isDark);
      moonIcon.classList.toggle('hidden', !isDark);
    }

    const optLight = document.getElementById('optThemeLight');
    const optDark = document.getElementById('optThemeDark');
    if (optLight && optDark) {
      optLight.classList.toggle('active', !isDark);
      optDark.classList.toggle('active', isDark);
    }
  }

  initUI() {
    document.getElementById('btnQuickTheme').addEventListener('click', () => {
      sound.playClick();
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    });

    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.updateSoundUI(isMuted);
    });

    document.getElementById('btnOpenSettings').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('settingsModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseSettingsModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('settingsModal').classList.add('hidden');
    });

    document.getElementById('optThemeLight').addEventListener('click', () => {
      sound.playClick();
      this.setTheme('light');
    });
    document.getElementById('optThemeDark').addEventListener('click', () => {
      sound.playClick();
      this.setTheme('dark');
    });

    document.getElementById('optSoundOn').addEventListener('click', () => {
      if (sound.muted) sound.toggleMute();
      this.updateSoundUI(false);
    });
    document.getElementById('optSoundOff').addEventListener('click', () => {
      if (!sound.muted) sound.toggleMute();
      this.updateSoundUI(true);
    });

    document.getElementById('btnCloseWipModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('wipModal').classList.add('hidden');
    });

    const pickerGrid = document.getElementById('gamePickerGrid');
    pickerGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.game-card');
      if (!card) return;
      sound.playClick();
      document.querySelectorAll('.game-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      this.selectGame(card.dataset.game);
    });

    const modePillsList = document.querySelector('.mode-pills-list');
    modePillsList.addEventListener('click', (e) => {
      const pill = e.target.closest('.mode-pill');
      if (!pill) return;
      sound.playClick();
      const mode = pill.dataset.mode;

      document.querySelectorAll('.mode-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      this.gameMode = mode;

      const aiSec = document.getElementById('aiDifficultySection');
      aiSec.style.display = mode === 'ai' ? 'flex' : 'none';
    });

    const diffGrid = document.querySelector('.difficulty-grid');
    diffGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.diff-btn');
      if (!btn) return;
      sound.playClick();
      document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.difficulty = btn.dataset.diff;
    });

    document.getElementById('btnPlayNow').addEventListener('click', () => {
      sound.playClick();
      this.showLoading(null, 320, () => {
        this.handlePlayAction();
      });
    });

    document.getElementById('btnCreateRoom').addEventListener('click', async () => {
      sound.playClick();
      document.getElementById('roomModal').classList.add('hidden');
      const code = await network.createPrivateRoom();
      document.getElementById('roomCodeInput').value = code;
      this.showRadarScreen(`Room: ${code}`);
      document.getElementById('radarStatus').textContent = `Room Code: VERSUS-${code} • Share with friend to connect!`;
    });

    document.getElementById('btnJoinRoom').addEventListener('click', async () => {
      sound.playClick();
      const code = document.getElementById('roomCodeInput').value.trim();
      if (code) {
        document.getElementById('roomModal').classList.add('hidden');
        this.showRadarScreen(`Joining Room ${code}...`);
        await network.joinPrivateRoom(code);
      }
    });

    document.getElementById('btnCloseRoomModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('roomModal').classList.add('hidden');
    });

    document.getElementById('btnCancelMatch').addEventListener('click', () => {
      sound.playClick();
      network.disconnect();
      this.showScreen('lobbyScreen');
    });

    document.getElementById('btnExitGame').addEventListener('click', () => {
      sound.playClick();
      sound.stopFootballCrowd();
      if (network.connected) {
        network.send({ type: 'GAME_EXIT' });
      }
      this.showLoading("Returning to game lobby...", 400, () => {
        network.disconnect();
        this.isPlaying = false;
        countdown.active = false;
        this.showScreen('lobbyScreen');
      });
    });

    document.getElementById('btnChessResign').addEventListener('click', () => {
      if (this.currentGameInstance && typeof this.currentGameInstance.resign === 'function') {
        sound.playClick();
        this.currentGameInstance.resign(1);
      }
    });

    document.getElementById('btnCopyPgn').addEventListener('click', async () => {
      const pgnText = document.getElementById('analysisPgnContent').textContent;
      const copyBtn = document.getElementById('btnCopyPgn');
      try {
        await navigator.clipboard.writeText(pgnText);
        copyBtn.textContent = 'Copied! ✓';
        copyBtn.classList.add('copied');
        sound.playClick();
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy PGN';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = pgnText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyBtn.textContent = 'Copied! ✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy PGN';
          copyBtn.classList.remove('copied');
        }, 2000);
      }
    });

    document.getElementById('btnCopyAnalysisPng').addEventListener('click', async () => {
      const copyBtn = document.getElementById('btnCopyAnalysisPng');
      const origText = copyBtn.textContent;
      copyBtn.textContent = '📸 Generating...';

      try {
        const { snapshotAnalysisCard } = await import('./engine/cardSnapshot.js');
        const data = this.latestChessAnalysis || {
          title: document.getElementById('analysisResultTitle').textContent,
          subtitle: document.getElementById('analysisSubtitle').textContent,
          p1Name: document.getElementById('analysisP1Name').textContent,
          p2Name: document.getElementById('analysisP2Name').textContent,
          p1Elo: document.getElementById('analysisP1Elo').textContent.replace('ELO: ', ''),
          p2Elo: document.getElementById('analysisP2Elo').textContent.replace('ELO: ', ''),
          p1Acc: document.getElementById('analysisP1Acc').textContent.replace('%', ''),
          p2Acc: document.getElementById('analysisP2Acc').textContent.replace('%', ''),
          p1Perf: document.getElementById('analysisP1Perf').textContent.replace('Perf: ', ''),
          p2Perf: document.getElementById('analysisP2Perf').textContent.replace('Perf: ', ''),
          p1Stats: {
            brilliant: +document.getElementById('p1Brilliant').textContent,
            great: +document.getElementById('p1Great').textContent,
            best: +document.getElementById('p1Best').textContent,
            inaccuracy: +document.getElementById('p1Inaccuracy').textContent,
            mistake: +document.getElementById('p1Mistake').textContent,
            blunder: +document.getElementById('p1Blunder').textContent
          },
          p2Stats: {
            brilliant: +document.getElementById('p2Brilliant').textContent,
            great: +document.getElementById('p2Great').textContent,
            best: +document.getElementById('p2Best').textContent,
            inaccuracy: +document.getElementById('p2Inaccuracy').textContent,
            mistake: +document.getElementById('p2Mistake').textContent,
            blunder: +document.getElementById('p2Blunder').textContent
          },
          pgn: document.getElementById('analysisPgnContent').textContent
        };

        const { blob, canvas } = await snapshotAnalysisCard(data);

        // Attempt Clipboard write
        let copiedToClipboard = false;
        if (navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            copiedToClipboard = true;
          } catch (clipErr) {
            copiedToClipboard = false;
          }
        }

        if (copiedToClipboard) {
          sound.playVictory();
          copyBtn.textContent = 'PNG Copied! ✓';
        } else {
          // Reliable Download Fallback
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.download = 'versus-chess-analysis.png';
          a.href = dataUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          sound.playVictory();
          copyBtn.textContent = 'PNG Saved! 📥';
        }

        setTimeout(() => {
          copyBtn.textContent = origText;
        }, 2200);
      } catch (err) {
        copyBtn.textContent = 'Error Capturing';
        setTimeout(() => {
          copyBtn.textContent = origText;
        }, 2000);
      }
    });

    document.getElementById('btnAnalysisRematch').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('chessAnalysisModal').classList.add('hidden');
      this.launchGame('chess');
    });

    document.getElementById('btnAnalysisLobby').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('chessAnalysisModal').classList.add('hidden');
      this.showLoading("Returning to game lobby...", 400, () => {
        network.disconnect();
        this.isPlaying = false;
        countdown.active = false;
        this.showScreen('lobbyScreen');
      });
    });

    document.getElementById('btnRestartRound').addEventListener('click', () => {
      sound.playClick();
      if (this.currentGameInstance) {
        this.currentGameInstance.resetRound();
        countdown.start();
        if (network.connected) {
          network.send({ type: 'ROUND_RESET' });
        }
      }
    });

    document.getElementById('btnRematch').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('winnerModal').classList.add('hidden');
      if (this.gameMode === 'tournament') {
        this.startTournament();
      } else {
        this.launchGame(this.currentGameKey);
      }
    });

    document.getElementById('btnModalLobby').addEventListener('click', () => {
      sound.playClick();
      sound.stopFootballCrowd();
      document.getElementById('winnerModal').classList.add('hidden');
      this.showLoading("Returning to game lobby...", 400, () => {
        network.disconnect();
        this.isPlaying = false;
        countdown.active = false;
        this.showScreen('lobbyScreen');
      });
    });

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.getElementById('mobileControls').classList.remove('hidden');
    }
  }

  updateSoundUI(isMuted) {
    const onSvg = document.getElementById('soundSvgOn');
    const offSvg = document.getElementById('soundSvgOff');
    if (onSvg && offSvg) {
      onSvg.classList.toggle('hidden', isMuted);
      offSvg.classList.toggle('hidden', !isMuted);
    }

    const optOn = document.getElementById('optSoundOn');
    const optOff = document.getElementById('optSoundOff');
    if (optOn && optOff) {
      optOn.classList.toggle('active', !isMuted);
      optOff.classList.toggle('active', isMuted);
    }
  }

  selectGame(gameKey, isRemote = false) {
    this.currentGameKey = gameKey;
    if (!isRemote && network.connected && network.role === 'host') {
      network.send({ type: 'GAME_SELECT', gameKey });
    }
    const gameDef = this.allGames.find((g) => g.key === gameKey) || this.allGames[0];

    document.getElementById('panelGameTitle').textContent = gameDef.name;
    document.getElementById('panelGameTag').textContent = gameDef.tag;
    document.getElementById('panelGameDesc').textContent = gameDef.desc;

    const selectedCard = document.querySelector(`.game-card[data-game="${gameKey}"]`);
    const previewContainer = document.getElementById('panelPreviewContainer');
    if (selectedCard && previewContainer) {
      const svg = selectedCard.querySelector('svg');
      if (svg) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(svg.cloneNode(true));
      }
    }
  }

  async handlePlayAction() {
    if (this.gameMode === 'ai') {
      network.disconnect();
      input.setLocal2P(false);
      this.launchGame(this.currentGameKey);
    } else if (this.gameMode === 'local') {
      network.disconnect();
      input.setLocal2P(true);
      this.launchGame(this.currentGameKey);
    } else if (this.gameMode === 'tournament') {
      this.startTournament();
    } else if (this.gameMode === 'room') {
      document.getElementById('roomModal').classList.remove('hidden');
    } else if (this.gameMode === 'online') {
      this.showRadarScreen('Scanning Global Matchmaking...');
      await network.findRandomMatch((status) => {
        document.getElementById('radarStatus').textContent = status;
      });
    }
  }

  initTouchControls() {
    const stickZone = document.getElementById('touchStick');
    const stickThumb = document.getElementById('touchThumb');
    const actionBtn = document.getElementById('touchAction');

    let touchId = null;

    stickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = stickZone.getBoundingClientRect();
      input.touchP1.active = true;
      input.touchP1.startX = rect.left + rect.width / 2;
      input.touchP1.startY = rect.top + rect.height / 2;
      input.touchP1.curX = touch.clientX;
      input.touchP1.curY = touch.clientY;
      this.updateThumbPos(stickThumb, input.touchP1);
    }, { passive: false });

    stickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId) {
          input.touchP1.curX = touch.clientX;
          input.touchP1.curY = touch.clientY;
          this.updateThumbPos(stickThumb, input.touchP1);
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          input.touchP1.active = false;
          touchId = null;
          stickThumb.style.transform = 'translate3d(0, 0, 0)';
        }
      }
    };

    stickZone.addEventListener('touchend', endTouch);
    stickZone.addEventListener('touchcancel', endTouch);

    actionBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      input.touchP1.action = true;
      actionBtn.style.transform = 'scale(0.92)';
    }, { passive: false });

    actionBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      input.touchP1.action = false;
      actionBtn.style.transform = 'scale(1)';
    }, { passive: false });
  }

  updateThumbPos(thumb, touchData) {
    const dx = touchData.curX - touchData.startX;
    const dy = touchData.curY - touchData.startY;
    const dist = Math.hypot(dx, dy);
    const maxR = 38;
    if (dist > maxR) {
      thumb.style.transform = `translate3d(${(dx / dist) * maxR}px, ${(dy / dist) * maxR}px, 0)`;
    } else {
      thumb.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  }

  initNetworkListeners() {
    network.on('matched', (data) => {
      sound.playGo();
      particles.addFloatingText('CONNECTED!', this.canvas.width / 2, this.canvas.height / 2, '#0ea5e9', 32);
      if (network.role === 'host') {
        setTimeout(() => {
          this.launchGame(this.currentGameKey, false);
        }, 600);
      }
    });

    network.on('remote_game_start', (data) => {
      sound.playGo();
      this.currentGameKey = data.gameKey;
      this.launchGame(data.gameKey, true);
    });

    network.on('remote_game_select', (data) => {
      this.selectGame(data.gameKey, true);
    });

    network.on('remote_round_reset', () => {
      if (this.currentGameInstance && typeof this.currentGameInstance.resetRound === 'function') {
        this.currentGameInstance.resetRound();
        countdown.start();
      }
    });

    network.on('remote_game_exit', () => {
      sound.stopFootballCrowd();
      this.isPlaying = false;
      countdown.active = false;
      this.showScreen('lobbyScreen');
    });

    network.on('chess_move', (data) => {
      if (this.currentGameInstance && typeof this.currentGameInstance.executeMove === 'function') {
        this.currentGameInstance.executeMove(data.fromRow, data.fromCol, data.toRow, data.toCol, true);
      }
    });

    network.on('chess_resign', (data) => {
      if (this.currentGameInstance && typeof this.currentGameInstance.resign === 'function') {
        this.currentGameInstance.resign(data.playerResigning, true);
      }
    });

    network.on('ttt_move', (data) => {
      if (this.currentGameInstance && typeof this.currentGameInstance.playMove === 'function') {
        this.currentGameInstance.playMove(data.index, true);
      }
    });

    network.on('state_sync', (data) => {
      if (network.role === 'guest' && this.currentGameInstance && typeof this.currentGameInstance.applyNetworkState === 'function') {
        this.currentGameInstance.applyNetworkState(data.state);
      }
    });

    network.on('remote_input', (data) => {
      if (data.role === 'host') {
        input.p1 = data.input;
      } else {
        input.p2 = data.input;
      }
    });

    network.on('peer_disconnected', () => {
      particles.addFloatingText('OPPONENT DISCONNECTED', this.canvas.width / 2, this.canvas.height / 2, '#f43f5e', 24);
    });
  }

  showScreen(screenId) {
    const screens = ['lobbyScreen', 'radarScreen', 'gameScreen'];
    screens.forEach((id) => {
      const el = document.getElementById(id);
      el.classList.toggle('hidden', id !== screenId);
    });
  }

  showRadarScreen(title) {
    document.getElementById('radarTitle').textContent = title;
    this.showScreen('radarScreen');
  }

  startTournament() {
    const shuffled = [...this.allGames].sort(() => Math.random() - 0.5);
    this.tournamentGames = shuffled.slice(0, 5);
    this.tournamentIndex = 0;
    this.tournamentP1Wins = 0;
    this.tournamentP2Wins = 0;
    this.tournamentHistory = [];
    this.launchTournamentGame();
  }

  launchTournamentGame() {
    const current = this.tournamentGames[this.tournamentIndex];
    document.getElementById('matchInfoBadge').textContent = `TOURNAMENT: ${current.name.toUpperCase()} (${this.tournamentIndex + 1}/5)`;
    this.launchGame(current.key, false);
  }

  updateBottomPanel() {
    if (!this.isPlaying || !this.currentGameInstance) return;

    // Red User (P1) vs Blue Opponent (P2)
    const userScore = this.currentGameInstance.p1Score !== undefined ? this.currentGameInstance.p1Score : 0;
    const oppScore = this.currentGameInstance.p2Score !== undefined ? this.currentGameInstance.p2Score : 0;

    const userScoreEl = document.getElementById('bottomUserScore');
    const oppScoreEl = document.getElementById('bottomOpponentScore');
    if (userScoreEl) userScoreEl.textContent = userScore;
    if (oppScoreEl) oppScoreEl.textContent = oppScore;

    // Player Names / Tags
    const userNameEl = document.getElementById('bottomUserName');
    const oppNameEl = document.getElementById('bottomOpponentName');
    
    if (this.gameMode === 'ai') {
      if (userNameEl) userNameEl.textContent = 'YOU (RED)';
      if (oppNameEl) oppNameEl.textContent = `AI [${this.difficulty.toUpperCase()}] (BLUE)`;
    } else if (this.gameMode === 'local') {
      if (userNameEl) userNameEl.textContent = 'PLAYER 1 (RED)';
      if (oppNameEl) oppNameEl.textContent = 'PLAYER 2 (BLUE)';
    } else if (this.gameMode === 'tournament') {
      if (userNameEl) userNameEl.textContent = `YOU [${this.tournamentP1Wins} W]`;
      if (oppNameEl) oppNameEl.textContent = `AI BOT [${this.tournamentP2Wins} W]`;
    } else {
      if (userNameEl) userNameEl.textContent = network.role === 'host' ? 'YOU (RED / HOST)' : 'YOU (RED / GUEST)';
      if (oppNameEl) oppNameEl.textContent = network.opponentName || 'OPPONENT (BLUE)';
    }

    // Center Tournament Tracker
    const badgeEl = document.getElementById('bottomTourneyBadge');
    const dotsEl = document.getElementById('bottomTourneyDots');
    const statusEl = document.getElementById('bottomMatchStatus');

    if (this.gameMode === 'tournament') {
      if (badgeEl) badgeEl.textContent = '⚔️ TOURNAMENT SERIES';
      if (dotsEl) {
        dotsEl.style.display = 'flex';
        const dots = dotsEl.querySelectorAll('.tourney-dot');
        dots.forEach((dot, idx) => {
          dot.classList.remove('active', 'won-red', 'won-blue');
          if (idx === this.tournamentIndex) {
            dot.classList.add('active');
          }
          if (this.tournamentHistory && idx < this.tournamentHistory.length) {
            const winner = this.tournamentHistory[idx];
            if (winner === 1) dot.classList.add('won-red');
            else if (winner === 2) dot.classList.add('won-blue');
          }
        });
      }
      if (statusEl) {
        statusEl.textContent = `MATCH ${this.tournamentIndex + 1} OF 5 • FIRST TO 3 WINS`;
      }
    } else {
      const gameDef = this.allGames.find((g) => g.key === this.currentGameKey);
      if (badgeEl) badgeEl.textContent = gameDef ? gameDef.name.toUpperCase() : 'VERSUS BATTLE';
      if (dotsEl) dotsEl.style.display = 'none';
      if (statusEl) {
        const target = this.currentGameInstance.targetScore || 1;
        statusEl.textContent = target === 1 ? '1 POINT SUDDEN DEATH' : `FIRST TO ${target} POINTS WINS`;
      }
    }
  }

  launchGame(gameKey, isRemote = false) {
    const gameDef = this.allGames.find((g) => g.key === gameKey) || this.allGames[0];
    this.currentGameKey = gameDef.key;

    if (!isRemote && network.connected && network.role === 'host') {
      network.send({ type: 'GAME_START', gameKey });
    }

    if (this.gameMode !== 'tournament') {
      let modeLabel = 'LOCAL 2P';
      if (this.gameMode === 'ai') {
        modeLabel = `VS AI [${this.difficulty.toUpperCase()}]`;
      } else if (this.gameMode === 'room') {
        modeLabel = 'PRIVATE ROOM';
      } else if (this.gameMode === 'online') {
        modeLabel = 'ONLINE DUEL';
      }
      document.getElementById('matchInfoBadge').textContent = `${gameDef.name.toUpperCase()} - ${modeLabel}`;
    }

    // Toggle Resign button visibility for Chess
    const btnResign = document.getElementById('btnChessResign');
    if (btnResign) {
      btnResign.classList.toggle('hidden', gameKey !== 'chess');
    }

    this.isPlaying = true;
    this.showScreen('gameScreen');
    particles.clear();

    const GameClass = gameDef.class;
    this.currentGameInstance = new GameClass(
      this.canvas, 
      this.ctx, 
      (winner, score, analysisData) => {
        this.handleGameOver(winner, score, analysisData);
      }, 
      this.difficulty,
      () => {
        // Trigger 3-2-1 countdown on every round reset
        countdown.start();
      }
    );

    // Trigger 3-2-1 countdown on game start
    countdown.start();
  }

  async handleGameOver(winner, score, analysisData = null) {
    sound.playVictory();

    try {
      const { default: confetti } = await import('canvas-confetti');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: winner === 1 ? ['#0ea5e9', '#38bdf8', '#ffffff', '#f59e0b'] : ['#f43f5e', '#fb7185', '#ffffff', '#f59e0b']
      });
    } catch (e) {
      // ignore
    }

    // If Chess game review is available, show Lichess-style analysis modal!
    if (analysisData) {
      this.latestChessAnalysis = analysisData;
      let winTitle = `${analysisData.winner === 1 ? 'White' : 'Black'} Won by ${analysisData.reason}`;
      if (analysisData.reason === 'White Resigned') {
        winTitle = 'Black Won (White Resigned)';
      } else if (analysisData.reason === 'Black Resigned') {
        winTitle = 'White Won (Black Resigned)';
      } else if (analysisData.reason === 'King Captured') {
        winTitle = `${analysisData.winner === 1 ? 'White' : 'Black'} Won (King Captured)`;
      } else if (analysisData.reason === 'Checkmate') {
        winTitle = `${analysisData.winner === 1 ? 'White' : 'Black'} Won by Checkmate`;
      } else if (analysisData.reason === 'Stalemate') {
        winTitle = 'Draw by Stalemate';
      }

      this.latestChessAnalysis.title = winTitle;
      this.latestChessAnalysis.subtitle = `${analysisData.fullMoves} Full Moves (${analysisData.totalPlies} Plies) • Lichess-Grade Game Review`;
      this.latestChessAnalysis.p1Name = 'Player 1 (White)';
      this.latestChessAnalysis.p2Name = this.gameMode === 'ai' ? `AI Bot [${this.difficulty.toUpperCase()}]` : 'Player 2 (Black)';

      document.getElementById('analysisResultTitle').textContent = winTitle;
      document.getElementById('analysisSubtitle').textContent = this.latestChessAnalysis.subtitle;
      
      document.getElementById('analysisP1Name').textContent = this.latestChessAnalysis.p1Name;
      document.getElementById('analysisP2Name').textContent = this.latestChessAnalysis.p2Name;
      
      document.getElementById('analysisP1Elo').textContent = `ELO: ${analysisData.p1Elo}`;
      document.getElementById('analysisP2Elo').textContent = `ELO: ${analysisData.p2Elo}`;
      
      document.getElementById('analysisP1Acc').textContent = `${analysisData.p1Acc}%`;
      document.getElementById('analysisP2Acc').textContent = `${analysisData.p2Acc}%`;
      
      document.getElementById('analysisP1Perf').textContent = `Perf: ${analysisData.p1Perf}`;
      document.getElementById('analysisP2Perf').textContent = `Perf: ${analysisData.p2Perf}`;
      
      document.getElementById('p1Brilliant').textContent = analysisData.p1Stats.brilliant;
      document.getElementById('p2Brilliant').textContent = analysisData.p2Stats.brilliant;
      document.getElementById('p1Great').textContent = analysisData.p1Stats.great;
      document.getElementById('p2Great').textContent = analysisData.p2Stats.great;
      document.getElementById('p1Best').textContent = analysisData.p1Stats.best;
      document.getElementById('p2Best').textContent = analysisData.p2Stats.best;
      document.getElementById('p1Inaccuracy').textContent = analysisData.p1Stats.inaccuracy;
      document.getElementById('p2Inaccuracy').textContent = analysisData.p2Stats.inaccuracy;
      document.getElementById('p1Mistake').textContent = analysisData.p1Stats.mistake;
      document.getElementById('p2Mistake').textContent = analysisData.p2Stats.mistake;
      document.getElementById('p1Blunder').textContent = analysisData.p1Stats.blunder;
      document.getElementById('p2Blunder').textContent = analysisData.p2Stats.blunder;

      document.getElementById('analysisPgnContent').textContent = analysisData.pgn;
      document.getElementById('chessAnalysisModal').classList.remove('hidden');
      return;
    }

    if (this.gameMode === 'tournament') {
      if (!this.tournamentHistory) this.tournamentHistory = [];
      this.tournamentHistory.push(winner);

      if (winner === 1) this.tournamentP1Wins++;
      else if (winner === 2) this.tournamentP2Wins++;

      if (this.tournamentP1Wins >= 3 || this.tournamentP2Wins >= 3 || this.tournamentIndex >= 4) {
        const tourneyWinner = this.tournamentP1Wins > this.tournamentP2Wins ? 1 : 2;
        const winnerName = tourneyWinner === 1 ? 'PLAYER 1 (YOU)' : 'AI BOT';
        document.getElementById('winnerText').textContent = `🏆 ${winnerName} WINS THE TOURNAMENT!`;
        document.getElementById('modalScoreText').innerHTML = `
          <span style="color: var(--p2-pink);">${this.tournamentP1Wins}</span>
          <span style="color: #cbd5e1;">-</span>
          <span style="color: var(--p1-blue);">${this.tournamentP2Wins}</span>
        `;
        document.getElementById('winnerModal').classList.remove('hidden');
      } else {
        this.tournamentIndex++;
        setTimeout(() => this.launchTournamentGame(), 1500);
      }
    } else {
      let winnerName = winner === 1 ? 'PLAYER 1 (YOU)' : 'PLAYER 2';
      if (this.gameMode === 'ai' && winner === 2) {
        winnerName = `BOT [${this.difficulty.toUpperCase()}]`;
      }
      const winnerColor = winner === 1 ? 'var(--p2-pink)' : 'var(--p1-blue)';
      document.getElementById('winnerText').textContent = `${winnerName} WINS!`;
      document.getElementById('winnerText').style.color = winnerColor;
      document.getElementById('modalScoreText').innerHTML = `
        <span style="color: var(--p2-pink);">${score.p1}</span>
        <span style="color: #cbd5e1;">-</span>
        <span style="color: var(--p1-blue);">${score.p2}</span>
      `;
      document.getElementById('winnerModal').classList.remove('hidden');
    }
  }

  startLoop() {
    const loop = () => {
      if (this.isPlaying && this.currentGameInstance) {
        input.update();

        if (network.connected && network.mode !== 'ai' && network.mode !== 'local') {
          if (network.role === 'guest') {
            // Guest sends their local input (input.p1) to Host
            network.sendInput(input.p1);
          }
        }

        // 1. Process countdown if active
        if (countdown.active) {
          countdown.update();
        } else {
          // 2. Normal active game updates
          const isBot = this.gameMode === 'ai' || this.gameMode === 'tournament';
          
          if (network.connected && network.role === 'guest' && typeof this.currentGameInstance.applyNetworkState === 'function') {
            // Guest updates visual animations; physics state is updated via STATE_SYNC RPC
          } else {
            this.currentGameInstance.update(input.p1, input.p2, isBot);
          }

          // Authoritative Host broadcasts 60fps state snapshot to Guest
          if (network.connected && network.role === 'host' && typeof this.currentGameInstance.getNetworkState === 'function') {
            network.send({
              type: 'STATE_SYNC',
              state: this.currentGameInstance.getNetworkState()
            });
          }
        }

        particles.update();

        // 3. Render Canvas
        this.ctx.save();
        if (particles.shakeOffset.x !== 0 || particles.shakeOffset.y !== 0) {
          this.ctx.translate(particles.shakeOffset.x, particles.shakeOffset.y);
        }
        this.currentGameInstance.draw();
        particles.draw(this.ctx);

        // 4. Render Countdown Overlay on top
        if (countdown.active) {
          countdown.draw(this.ctx, this.canvas.width, this.canvas.height);
        }

        this.ctx.restore();

        // 5. Update Bottom Scoreboard & Tournament Panel
        this.updateBottomPanel();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
