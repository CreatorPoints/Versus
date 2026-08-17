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
import { MicroRace } from './games/microRace.js';
import { PinballDuel } from './games/pinballDuel.js';

class App {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.currentGameKey = 'tank';
    this.currentGameInstance = null;
    this.gameMode = 'ai'; // 'ai' | 'local' | 'tournament' | 'room' | 'quick_wip'
    this.difficulty = 'normal'; // 'baby' | 'normal' | 'hard' | 'demon'
    this.theme = localStorage.getItem('versus_theme') || 'light';

    // Tournament State
    this.tournamentGames = [];
    this.tournamentIndex = 0;
    this.tournamentP1Wins = 0;
    this.tournamentP2Wins = 0;

    this.allGames = [
      { 
        key: 'tank', 
        name: 'Tank Battle', 
        tag: 'Ricochet Bullets',
        desc: 'Drive your combat tank, bounce bullets off steel walls, smash obstacles, and eliminate your opponent before they hit you!',
        class: TankBattle 
      },
      { 
        key: 'hockey', 
        name: 'Glow Hockey', 
        tag: 'Smash Charge',
        desc: 'Fast-paced arcade air hockey! Deflect the puck, charge up your power smash shot, and blast goals into the opponent net.',
        class: GlowHockey 
      },
      { 
        key: 'sumo', 
        name: 'Sumo Spinners', 
        tag: 'Ring Out!',
        desc: 'Clash in a crumbling hexagon arena where edge tiles fall into the abyss over time! Boost-ram your opponent off the edge.',
        class: SumoSpinners 
      },
      { 
        key: 'draw', 
        name: 'Quick Draw', 
        tag: 'Reflex Duel',
        desc: 'Wild West reaction shootout! Wait for the official "FIRE!" cue without misfiring early, and strike with lightning reflexes.',
        class: QuickDraw 
      },
      { 
        key: 'soccer', 
        name: 'Micro Soccer', 
        tag: 'Bicycle Kick',
        desc: '1v1 physics capsule soccer. Leap into the air, flip and bicycle kick the ball into the net before time expires!',
        class: MicroSoccer 
      },
      { 
        key: 'blade', 
        name: 'Blade Clash', 
        tag: 'Parry & Strike',
        desc: 'High skill cyber warrior duel! Dash strike with your laser katana and time your parry to stun the enemy and counter-slash.',
        class: BladeClash 
      },
      { 
        key: 'race', 
        name: 'Micro Race', 
        tag: 'Kart Drift',
        desc: 'Top-down arcade kart racing! Drift tight around curves, hit max speed, and be the first to complete 3 full laps.',
        class: MicroRace 
      },
      { 
        key: 'pinball', 
        name: 'Pinball Duel', 
        tag: 'Bumper Bounce',
        desc: 'Dual-paddle pinball table with high-impulse bumpers in the center! Angle your deflection shots to slip past the opponent.',
        class: PinballDuel 
      }
    ];

    this.initTheme();
    this.initUI();
    this.initTouchControls();
    this.initNetworkListeners();
    this.selectGame('tank');
    this.startLoop();
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
      if (isDark) {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      }
    }

    const optLight = document.getElementById('optThemeLight');
    const optDark = document.getElementById('optThemeDark');
    if (optLight && optDark) {
      if (isDark) {
        optLight.classList.remove('active');
        optDark.classList.add('active');
      } else {
        optLight.classList.add('active');
        optDark.classList.remove('active');
      }
    }
  }

  initUI() {
    // Quick Theme Toggle
    document.getElementById('btnQuickTheme').addEventListener('click', () => {
      sound.playClick();
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    });

    // Sound Quick Toggle
    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      this.updateSoundUI(isMuted);
    });

    // Settings Modal
    document.getElementById('btnOpenSettings').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('settingsModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseSettingsModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('settingsModal').classList.add('hidden');
    });

    // Settings Modal Options
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

    // WIP Modal Close
    document.getElementById('btnCloseWipModal').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('wipModal').classList.add('hidden');
    });

    // Game Picker Cards (4 in a row)
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        sound.playClick();
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectGame(card.dataset.game);
      });
    });

    // Mode Selection Pills in Side Panel
    const modePills = document.querySelectorAll('.mode-pill');
    modePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        sound.playClick();
        const mode = pill.dataset.mode;
        
        if (mode === 'quick_wip') {
          document.getElementById('wipModal').classList.remove('hidden');
          return;
        }

        modePills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.gameMode = mode;

        // Toggle AI difficulty section visibility
        const aiSec = document.getElementById('aiDifficultySection');
        if (mode === 'ai') {
          aiSec.style.display = 'flex';
        } else {
          aiSec.style.display = 'none';
        }
      });
    });

    // AI Difficulty Buttons
    const diffButtons = document.querySelectorAll('.diff-btn');
    diffButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        diffButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.diff;
      });
    });

    // Play Button in Side Panel
    document.getElementById('btnPlayNow').addEventListener('click', () => {
      sound.playClick();
      this.handlePlayAction();
    });

    // Private Room Modal Buttons
    document.getElementById('btnCreateRoom').addEventListener('click', async () => {
      sound.playClick();
      const code = await network.createPrivateRoom();
      document.getElementById('roomCodeInput').value = code;
      this.showRadarScreen(`Room: ${code}`);
      document.getElementById('radarStatus').textContent = 'Waiting for friend to enter code...';
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

    // Matchmaking Cancel
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

    // Detect Touch Screen
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.getElementById('mobileControls').classList.remove('hidden');
    }
  }

  updateSoundUI(isMuted) {
    const onSvg = document.getElementById('soundSvgOn');
    const offSvg = document.getElementById('soundSvgOff');
    if (onSvg && offSvg) {
      if (isMuted) {
        onSvg.classList.add('hidden');
        offSvg.classList.remove('hidden');
      } else {
        onSvg.classList.remove('hidden');
        offSvg.classList.add('hidden');
      }
    }

    const optOn = document.getElementById('optSoundOn');
    const optOff = document.getElementById('optSoundOff');
    if (optOn && optOff) {
      if (isMuted) {
        optOn.classList.remove('active');
        optOff.classList.add('active');
      } else {
        optOn.classList.add('active');
        optOff.classList.remove('active');
      }
    }
  }

  selectGame(gameKey) {
    this.currentGameKey = gameKey;
    const gameDef = this.allGames.find((g) => g.key === gameKey) || this.allGames[0];

    document.getElementById('panelGameTitle').textContent = gameDef.name;
    document.getElementById('panelGameTag').textContent = gameDef.tag;
    document.getElementById('panelGameDesc').textContent = gameDef.desc;

    // Clone and display preview SVG in side panel
    const selectedCard = document.querySelector(`.game-card[data-game="${gameKey}"]`);
    const previewContainer = document.getElementById('panelPreviewContainer');
    if (selectedCard && previewContainer) {
      const svg = selectedCard.querySelector('svg');
      if (svg) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(svg.cloneNode(true));
      }
    }

    // Animate side panel
    const panel = document.getElementById('gameSidePanel');
    panel.classList.remove('collapsed');
  }

  handlePlayAction() {
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

    actionBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      input.touchP1.action = true;
      actionBtn.style.transform = 'scale(0.92)';
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
      particles.addFloatingText('MATCH FOUND!', this.canvas.width / 2, this.canvas.height / 2, '#0ea5e9', 32);
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
    const shuffled = [...this.allGames].sort(() => Math.random() - 0.5);
    this.tournamentGames = shuffled.slice(0, 5);
    this.tournamentIndex = 0;
    this.tournamentP1Wins = 0;
    this.tournamentP2Wins = 0;
    this.launchTournamentGame();
  }

  launchTournamentGame() {
    const current = this.tournamentGames[this.tournamentIndex];
    document.getElementById('matchInfoBadge').textContent = `TOURNAMENT: ${current.name.toUpperCase()} (${this.tournamentIndex + 1}/5)`;
    this.launchGame(current.key);
  }

  launchGame(gameKey) {
    const gameDef = this.allGames.find((g) => g.key === gameKey) || this.allGames[0];
    this.currentGameKey = gameDef.key;

    if (this.gameMode !== 'tournament') {
      let modeLabel = 'LOCAL 2P';
      if (this.gameMode === 'ai') {
        modeLabel = `VS AI [${this.difficulty.toUpperCase()}]`;
      } else if (this.gameMode === 'room') {
        modeLabel = 'PRIVATE ROOM';
      }
      document.getElementById('matchInfoBadge').textContent = `${gameDef.name.toUpperCase()} - ${modeLabel}`;
    }

    this.showScreen('gameScreen');
    particles.clear();

    const GameClass = gameDef.class;
    this.currentGameInstance = new GameClass(this.canvas, this.ctx, (winner, score) => {
      this.handleGameOver(winner, score);
    }, this.difficulty);
  }

  handleGameOver(winner, score) {
    sound.playVictory();

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: winner === 1 ? ['#0ea5e9', '#38bdf8', '#ffffff', '#f59e0b'] : ['#f43f5e', '#fb7185', '#ffffff', '#f59e0b']
      });
    } catch (e) {
      // ignore
    }

    if (this.gameMode === 'tournament') {
      if (winner === 1) this.tournamentP1Wins++;
      else this.tournamentP2Wins++;

      if (this.tournamentP1Wins >= 3 || this.tournamentP2Wins >= 3 || this.tournamentIndex >= 4) {
        const tourneyWinner = this.tournamentP1Wins > this.tournamentP2Wins ? 1 : 2;
        const winnerName = tourneyWinner === 1 ? 'PLAYER 1' : 'AI BOT';
        document.getElementById('winnerText').textContent = `🏆 ${winnerName} WINS!`;
        document.getElementById('modalScoreText').innerHTML = `
          <span style="color: var(--p1-blue);">${this.tournamentP1Wins}</span>
          <span style="color: #cbd5e1;">-</span>
          <span style="color: var(--p2-pink);">${this.tournamentP2Wins}</span>
        `;
        document.getElementById('winnerModal').classList.remove('hidden');
      } else {
        this.tournamentIndex++;
        setTimeout(() => this.launchTournamentGame(), 1500);
      }
    } else {
      let winnerName = winner === 1 ? 'PLAYER 1' : 'PLAYER 2';
      if (this.gameMode === 'ai' && winner === 2) {
        winnerName = `BOT [${this.difficulty.toUpperCase()}]`;
      }
      const winnerColor = winner === 1 ? 'var(--p1-blue)' : 'var(--p2-pink)';
      document.getElementById('winnerText').textContent = `${winnerName} WINS!`;
      document.getElementById('winnerText').style.color = winnerColor;
      document.getElementById('modalScoreText').innerHTML = `
        <span style="color: var(--p1-blue);">${score.p1}</span>
        <span style="color: #cbd5e1;">-</span>
        <span style="color: var(--p2-pink);">${score.p2}</span>
      `;
      document.getElementById('winnerModal').classList.remove('hidden');
    }
  }

  startLoop() {
    const loop = () => {
      input.update();

      if (network.connected && network.mode !== 'bot') {
        const myInput = network.role === 'host' ? input.p1 : input.p2;
        network.sendInput(myInput);
      }

      if (this.currentGameInstance && !document.getElementById('gameScreen').classList.contains('hidden')) {
        const isBot = this.gameMode === 'ai' || this.gameMode === 'tournament';
        this.currentGameInstance.update(input.p1, input.p2, isBot);
        particles.update();

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
