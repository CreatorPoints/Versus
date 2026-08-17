/**
 * VERSUS - Main Application Controller & Game State Machine
 */
import confetti from 'canvas-confetti';
import { sound } from './audio/sound.js';
import { input } from './engine/input.js';
import { particles } from './engine/particles.js';
import { network } from './engine/network.js';

// Games
import { TankBattle } from './games/tankBattle.js';
import { GlowHockey } from './games/glowHockey.js';
import { SumoSpinners } from './games/sumoSpinners.js';
import { QuickDraw } from './games/quickDraw.js';
import { MicroSoccer } from './games/microSoccer.js';
import { BladeClash } from './games/bladeClash.js';

class App {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.currentGameKey = 'tank';
    this.currentGameInstance = null;
    this.gameMode = 'quick'; // 'quick' | 'tournament' | 'local' | 'room'
    
    // Tournament State
    this.tournamentGames = [];
    this.tournamentIndex = 0;
    this.tournamentP1Wins = 0;
    this.tournamentP2Wins = 0;

    this.allGames = [
      { key: 'tank', name: 'Tank Battle', class: TankBattle },
      { key: 'hockey', name: 'Glow Hockey', class: GlowHockey },
      { key: 'sumo', name: 'Sumo Spinners', class: SumoSpinners },
      { key: 'draw', name: 'Quick Draw', class: QuickDraw },
      { key: 'soccer', name: 'Micro Soccer', class: MicroSoccer },
      { key: 'blade', name: 'Blade Clash', class: BladeClash }
    ];

    this.initUI();
    this.initTouchControls();
    this.initNetworkListeners();
    this.startLoop();
  }

  initUI() {
    // Sound Toggle Button
    const btnSound = document.getElementById('btnToggleSound');
    btnSound.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      document.getElementById('soundIcon').textContent = isMuted ? '🔇' : '🔊';
      document.getElementById('soundText').textContent = isMuted ? 'Sound OFF' : 'Sound ON';
    });

    // Controls Guide Modal
    document.getElementById('btnControlsGuide').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('guideModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseGuideModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('guideModal').classList.add('hidden');
    });

    // Game Picker Chips
    const chips = document.querySelectorAll('.game-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        sound.playClick();
        chips.forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
        this.currentGameKey = chip.dataset.game;
      });
    });

    // Quick Match Button (Online 1v1 Challenger)
    document.getElementById('btnQuickMatch').addEventListener('click', async () => {
      sound.playClick();
      this.gameMode = 'quick';
      this.showRadarScreen('Finding Internet Challenger...');
      await network.findRandomMatch((status) => {
        document.getElementById('radarStatus').textContent = status;
      });
    });

    // Tournament Mode Button (Best of 5 Rotation)
    document.getElementById('btnTournament').addEventListener('click', () => {
      sound.playClick();
      this.gameMode = 'tournament';
      this.startTournament();
    });

    // Local 2-Player Button (Same Device)
    document.getElementById('btnLocal2P').addEventListener('click', () => {
      sound.playClick();
      this.gameMode = 'local';
      input.setLocal2P(true);
      this.launchGame(this.currentGameKey);
    });

    // Private Room Modal
    document.getElementById('btnPrivateRoom').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('roomModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseRoomModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('roomModal').classList.add('hidden');
    });

    document.getElementById('btnCreateRoom').addEventListener('click', async () => {
      sound.playClick();
      const code = await network.createPrivateRoom();
      document.getElementById('roomCodeInput').value = code;
      this.showRadarScreen(`Room Created: ${code}`);
      document.getElementById('radarStatus').textContent = 'Waiting for opponent to enter code...';
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

    // Cancel Matchmaking
    document.getElementById('btnCancelMatch').addEventListener('click', () => {
      sound.playClick();
      network.disconnect();
      this.showScreen('lobbyScreen');
    });

    // In-game Exit Button
    document.getElementById('btnExitGame').addEventListener('click', () => {
      sound.playClick();
      network.disconnect();
      this.showScreen('lobbyScreen');
    });

    // In-game Restart Round
    document.getElementById('btnRestartRound').addEventListener('click', () => {
      sound.playClick();
      if (this.currentGameInstance) {
        this.currentGameInstance.resetRound();
      }
    });

    // Rematch & Modal Lobby Buttons
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
      document.getElementById('winnerModal').classList.add('hidden');
      network.disconnect();
      this.showScreen('lobbyScreen');
    });

    // Detect Touch Screen to show virtual controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.getElementById('mobileControls').classList.remove('hidden');
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
    });

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
    });

    const endTouch = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          input.touchP1.active = false;
          touchId = null;
          stickThumb.style.transform = 'translate(0px, 0px)';
        }
      }
    };

    stickZone.addEventListener('touchend', endTouch);
    stickZone.addEventListener('touchcancel', endTouch);

    // Action button
    actionBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      input.touchP1.action = true;
      actionBtn.style.transform = 'scale(0.9)';
    });

    actionBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      input.touchP1.action = false;
      actionBtn.style.transform = 'scale(1)';
    });
  }

  updateThumbPos(thumb, touchData) {
    const dx = touchData.curX - touchData.startX;
    const dy = touchData.curY - touchData.startY;
    const dist = Math.hypot(dx, dy);
    const maxR = 38;
    if (dist > maxR) {
      thumb.style.transform = `translate(${(dx / dist) * maxR}px, ${(dy / dist) * maxR}px)`;
    } else {
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }

  initNetworkListeners() {
    network.on('matched', (data) => {
      sound.playGo();
      particles.addFloatingText('MATCH FOUND!', this.canvas.width / 2, this.canvas.height / 2, '#00f0ff', 28);
      setTimeout(() => {
        this.launchGame(this.currentGameKey);
      }, 500);
    });

    network.on('remote_input', (data) => {
      if (data.role === 'host') {
        input.p1 = data.input;
      } else {
        input.p2 = data.input;
      }
    });
  }

  showScreen(screenId) {
    const screens = ['lobbyScreen', 'radarScreen', 'gameScreen'];
    screens.forEach((id) => {
      const el = document.getElementById(id);
      if (id === screenId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  showRadarScreen(title) {
    document.getElementById('radarTitle').textContent = title;
    this.showScreen('radarScreen');
  }

  startTournament() {
    // Shuffle all 6 games for best of 5
    const shuffled = [...this.allGames].sort(() => Math.random() - 0.5);
    this.tournamentGames = shuffled.slice(0, 5);
    this.tournamentIndex = 0;
    this.tournamentP1Wins = 0;
    this.tournamentP2Wins = 0;
    this.launchTournamentGame();
  }

  launchTournamentGame() {
    const current = this.tournamentGames[this.tournamentIndex];
    document.getElementById('matchInfoBadge').textContent = `TOURNAMENT: ${current.name} (MATCH ${this.tournamentIndex + 1}/5)`;
    this.launchGame(current.key);
  }

  launchGame(gameKey) {
    const gameDef = this.allGames.find((g) => g.key === gameKey) || this.allGames[0];
    this.currentGameKey = gameDef.key;

    if (this.gameMode !== 'tournament') {
      const modeLabel = this.gameMode === 'quick' ? '1v1 QUICK DUEL' : this.gameMode === 'local' ? 'LOCAL 2P' : 'PRIVATE ROOM';
      document.getElementById('matchInfoBadge').textContent = `${gameDef.name.toUpperCase()} - ${modeLabel}`;
    }

    this.showScreen('gameScreen');
    particles.clear();

    const GameClass = gameDef.class;
    this.currentGameInstance = new GameClass(this.canvas, this.ctx, (winner, score) => {
      this.handleGameOver(winner, score);
    });
  }

  handleGameOver(winner, score) {
    sound.playVictory();

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: winner === 1 ? ['#00f0ff', '#ffffff', '#38bdf8'] : ['#ff2e63', '#ffffff', '#ff6b6b']
      });
    } catch (e) {
      // ignore
    }

    if (this.gameMode === 'tournament') {
      if (winner === 1) this.tournamentP1Wins++;
      else this.tournamentP2Wins++;

      if (this.tournamentP1Wins >= 3 || this.tournamentP2Wins >= 3 || this.tournamentIndex >= 4) {
        // Tournament Winner!
        const tourneyWinner = this.tournamentP1Wins > this.tournamentP2Wins ? 1 : 2;
        const winnerName = tourneyWinner === 1 ? 'PLAYER 1' : (network.mode === 'bot' ? network.opponentName : 'PLAYER 2');
        document.getElementById('winnerText').textContent = `🏆 ${winnerName} WINS TOURNAMENT!`;
        document.getElementById('modalScoreText').innerHTML = `
          <span style="color: var(--p1-cyan);">${this.tournamentP1Wins}</span>
          <span style="color: rgba(255,255,255,0.4);">-</span>
          <span style="color: var(--p2-red);">${this.tournamentP2Wins}</span>
        `;
        document.getElementById('winnerModal').classList.remove('hidden');
      } else {
        // Next tournament round
        this.tournamentIndex++;
        setTimeout(() => this.launchTournamentGame(), 1500);
      }
    } else {
      const winnerName = winner === 1 ? 'PLAYER 1' : (network.mode === 'bot' ? network.opponentName : 'PLAYER 2');
      const winnerColor = winner === 1 ? 'var(--p1-cyan)' : 'var(--p2-red)';
      document.getElementById('winnerText').textContent = `${winnerName} WINS!`;
      document.getElementById('winnerText').style.color = winnerColor;
      document.getElementById('modalScoreText').innerHTML = `
        <span style="color: var(--p1-cyan);">${score.p1}</span>
        <span style="color: rgba(255,255,255,0.4);">-</span>
        <span style="color: var(--p2-red);">${score.p2}</span>
      `;
      document.getElementById('winnerModal').classList.remove('hidden');
    }
  }

  startLoop() {
    const loop = () => {
      // 1. Update Input
      input.update();

      // 2. Broadcast local inputs if online
      if (network.connected && network.mode !== 'bot') {
        const myInput = network.role === 'host' ? input.p1 : input.p2;
        network.sendInput(myInput);
      }

      // 3. Update Current Game
      if (this.currentGameInstance && !document.getElementById('gameScreen').classList.contains('hidden')) {
        const isBot = (this.gameMode === 'quick' && network.mode === 'bot') || this.gameMode === 'tournament';
        this.currentGameInstance.update(input.p1, input.p2, isBot);
        particles.update();

        // 4. Render Game with screen shake transform
        this.ctx.save();
        this.ctx.translate(particles.shakeOffset.x, particles.shakeOffset.y);
        this.currentGameInstance.draw();
        particles.draw(this.ctx);
        this.ctx.restore();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
