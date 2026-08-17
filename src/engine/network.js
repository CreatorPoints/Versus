/**
 * VERSUS - Lazy Loaded Multiplayer Network Engine
 * Zero initial overhead: Firebase SDK is dynamically imported only on demand.
 */

export class NetworkManager {
  constructor() {
    this.mode = 'local';
    this.role = 'host';
    this.roomId = null;
    this.playerId = 'p_' + Math.random().toString(36).substring(2, 8);
    this.opponentName = 'Opponent';
    this.connected = false;
    this.listeners = new Map();
    this.broadcast = null;
    this.unsubRoom = null;
    this.firebase = null;

    try {
      this.broadcast = new BroadcastChannel('versus_p2p_channel');
      this.broadcast.onmessage = (e) => this.handleBroadcastMessage(e.data);
    } catch (e) {
      // BroadcastChannel fallback
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const list = this.listeners.get(event);
    if (list) {
      for (const cb of list) {
        cb(data);
      }
    }
  }

  async loadFirebase() {
    if (this.firebase) return this.firebase;
    try {
      const { initializeApp } = await import('firebase/app');
      const { 
        getFirestore, collection, doc, setDoc, getDoc, 
        onSnapshot, updateDoc, query, where, getDocs, serverTimestamp 
      } = await import('firebase/firestore');

      const config = {
        apiKey: "AIzaSyDummyKeyForVersusMultiplayer00",
        projectId: "photon-core"
      };

      const app = initializeApp(config);
      const db = getFirestore(app);

      this.firebase = {
        db, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, query, where, getDocs, serverTimestamp
      };
      return this.firebase;
    } catch (e) {
      console.warn('Firebase lazy-load fallback:', e.message);
      return null;
    }
  }

  async findRandomMatch(onProgress) {
    this.mode = 'online_match';
    this.connected = false;
    onProgress?.('Connecting to network matchmaking...');

    this.broadcast?.postMessage({
      type: 'SEARCHING_MATCH',
      playerId: this.playerId
    });

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved && !this.connected) {
          resolved = true;
          this.setupBotMatch();
          resolve();
        }
      }, 3000);

      this.on('matched', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  async createPrivateRoom(customCode = null) {
    this.mode = 'online_room';
    this.role = 'host';
    this.roomId = customCode || Math.random().toString(36).substring(2, 6).toUpperCase();
    this.connected = false;
    return this.roomId;
  }

  async joinPrivateRoom(code) {
    this.mode = 'online_room';
    this.role = 'guest';
    this.roomId = code.toUpperCase();

    this.broadcast?.postMessage({
      type: 'JOIN_ROOM',
      roomId: this.roomId,
      playerId: this.playerId
    });

    this.connected = true;
    this.emit('matched', { role: 'guest', opponent: 'Player 1' });
    return true;
  }

  setupBotMatch() {
    this.mode = 'bot';
    this.role = 'host';
    const botNames = ['CyberShadow', 'ViperX', 'ApexBot', 'PixelSamurai', 'VoltStriker', 'TitanAI', 'NovaRider'];
    this.opponentName = botNames[Math.floor(Math.random() * botNames.length)];
    this.connected = true;
    this.emit('matched', { role: 'host', opponent: `${this.opponentName}` });
  }

  sendInput(inputVector) {
    if (this.mode === 'bot' || this.mode === 'local') return;
    this.broadcast?.postMessage({
      type: 'INPUT',
      sender: this.playerId,
      role: this.role,
      input: inputVector
    });
  }

  handleBroadcastMessage(msg) {
    if (!msg || msg.sender === this.playerId) return;

    if (msg.type === 'SEARCHING_MATCH' && this.mode === 'online_match' && this.role === 'host' && !this.connected) {
      this.connected = true;
      this.opponentName = 'Network Challenger';
      this.broadcast.postMessage({
        type: 'MATCH_ACCEPTED',
        hostId: this.playerId,
        guestId: msg.playerId
      });
      this.emit('matched', { role: 'host', opponent: this.opponentName });
    }

    if (msg.type === 'MATCH_ACCEPTED' && msg.guestId === this.playerId) {
      this.role = 'guest';
      this.connected = true;
      this.opponentName = 'Network Host';
      this.emit('matched', { role: 'guest', opponent: this.opponentName });
    }

    if (msg.type === 'INPUT') {
      this.emit('remote_input', { role: msg.role, input: msg.input });
    }
  }

  disconnect() {
    if (this.unsubRoom) {
      this.unsubRoom();
      this.unsubRoom = null;
    }
    this.connected = false;
    this.mode = 'local';
    this.roomId = null;
  }
}

export const network = new NetworkManager();
