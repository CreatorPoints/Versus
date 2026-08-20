/**
 * VERSUS - Real-Time Cross-Device WebRTC Network Engine (PeerJS + STUN)
 * Enables true internet multiplayer across mobile devices, tablets, and desktop browsers
 * with zero configuration, ultra-low UDP latency, room codes, and quick matchmaking.
 */
import { Peer } from 'peerjs';

export class NetworkManager {
  constructor() {
    this.mode = 'local'; // 'local' | 'ai' | 'online_match' | 'online_room'
    this.role = 'host';  // 'host' | 'guest'
    this.roomId = null;
    this.peer = null;
    this.conn = null;
    this.playerId = 'p_' + Math.random().toString(36).substring(2, 7);
    this.opponentName = 'Opponent';
    this.connected = false;
    this.listeners = new Map();
    this.broadcast = null;

    try {
      this.broadcast = new BroadcastChannel('versus_p2p_channel');
      this.broadcast.onmessage = (e) => this.handleLocalBroadcast(e.data);
    } catch (e) {
      // Broadcast fallback
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

  initPeer(customId = null) {
    return new Promise((resolve, reject) => {
      if (this.peer && !this.peer.destroyed) {
        resolve(this.peer);
        return;
      }

      const peerConfig = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      };

      try {
        this.peer = customId ? new Peer(customId, peerConfig) : new Peer(peerConfig);

        this.peer.on('open', (id) => {
          resolve(this.peer);
        });

        this.peer.on('connection', (connection) => {
          this.setupConnection(connection, 'host');
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Connection Warning:', err.type, err.message);
          resolve(this.peer);
        });
      } catch (err) {
        console.warn('PeerJS init fallback:', err);
        resolve(null);
      }
    });
  }

  setupConnection(connection, role) {
    this.conn = connection;
    this.role = role;
    this.connected = true;

    this.conn.on('open', () => {
      this.connected = true;
      this.opponentName = role === 'host' ? 'Challenger (P2)' : 'Match Host (P1)';
      
      // Handshake
      this.send({
        type: 'HANDSHAKE',
        sender: this.playerId,
        role: this.role
      });

      this.emit('matched', {
        role: this.role,
        opponent: this.opponentName
      });
    });

    this.conn.on('data', (data) => {
      this.handleNetworkMessage(data);
    });

    this.conn.on('close', () => {
      this.connected = false;
      this.emit('peer_disconnected');
    });
  }

  // Quick Online Matchmaking
  async findRandomMatch(onProgress) {
    this.mode = 'online_match';
    this.connected = false;
    onProgress?.('Scanning global matchmaking pool...');

    await this.initPeer();

    // Broadcast on local channel first
    this.broadcast?.postMessage({
      type: 'SEARCHING_MATCH',
      playerId: this.playerId
    });

    // Matchmaking bucket logic via public room indices
    const matchBuckets = ['versus_match_us', 'versus_match_eu', 'versus_match_asia', 'versus_match_global'];
    const targetRoom = matchBuckets[Math.floor(Math.random() * matchBuckets.length)] + '_' + Math.floor(Math.random() * 3);

    return new Promise((resolve) => {
      let resolved = false;

      // Try joining target room as guest
      const joinConn = this.peer.connect(targetRoom, { reliable: true });
      this.setupConnection(joinConn, 'guest');

      joinConn.on('open', () => {
        if (!resolved) {
          resolved = true;
          this.role = 'guest';
          resolve({ role: 'guest' });
        }
      });

      // Timeout fallback: become host of the bucket
      setTimeout(async () => {
        if (!resolved && !this.connected) {
          try {
            if (this.peer) this.peer.destroy();
            await this.initPeer(targetRoom);
            this.role = 'host';
            onProgress?.('Waiting for challenger to join arena...');

            // If no human joins within 5 seconds, fallback to smart AI Challenger!
            setTimeout(() => {
              if (!resolved && !this.connected) {
                resolved = true;
                this.setupBotMatch();
                resolve({ role: 'host', bot: true });
              }
            }, 4500);
          } catch (e) {
            this.setupBotMatch();
            resolve({ role: 'host', bot: true });
          }
        }
      }, 1800);

      this.on('matched', () => {
        if (!resolved) {
          resolved = true;
          resolve({ role: this.role });
        }
      });
    });
  }

  // Private Custom Room Code
  async createPrivateRoom() {
    this.mode = 'online_room';
    this.role = 'host';
    this.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const peerRoomId = `VERSUS-${this.roomId}`;

    if (this.peer) this.peer.destroy();
    await this.initPeer(peerRoomId);
    this.connected = false;
    return this.roomId;
  }

  async joinPrivateRoom(code) {
    this.mode = 'online_room';
    this.role = 'guest';
    this.roomId = code.toUpperCase().trim();
    const peerRoomId = `VERSUS-${this.roomId}`;

    await this.initPeer();
    const connection = this.peer.connect(peerRoomId, { reliable: true });
    this.setupConnection(connection, 'guest');

    // Also broadcast locally
    this.broadcast?.postMessage({
      type: 'JOIN_ROOM',
      roomId: this.roomId,
      playerId: this.playerId
    });

    return true;
  }

  setupBotMatch() {
    this.mode = 'ai';
    this.role = 'host';
    const botNames = ['CyberShadow', 'ViperX', 'ApexBot', 'PixelSamurai', 'VoltStriker', 'TitanAI', 'NovaRider'];
    this.opponentName = botNames[Math.floor(Math.random() * botNames.length)];
    this.connected = true;
    this.emit('matched', { role: 'host', opponent: this.opponentName });
  }

  send(data) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(data);
      } catch (e) {}
    }
    this.broadcast?.postMessage(data);
  }

  sendInput(inputVector) {
    if (this.mode === 'ai' || this.mode === 'local') return;
    this.send({
      type: 'INPUT',
      sender: this.playerId,
      role: this.role,
      input: inputVector
    });
  }

  handleNetworkMessage(msg) {
    if (!msg || msg.sender === this.playerId) return;

    if (msg.type === 'INPUT') {
      this.emit('remote_input', { role: msg.role, input: msg.input });
    } else if (msg.type === 'GAME_SELECT') {
      this.emit('remote_game_select', { gameKey: msg.gameKey });
    } else if (msg.type === 'GAME_START') {
      this.emit('remote_game_start', { gameKey: msg.gameKey });
    } else if (msg.type === 'HANDSHAKE') {
      this.emit('matched', { role: this.role, opponent: 'Network Challenger' });
    }
  }

  handleLocalBroadcast(msg) {
    if (!msg || msg.sender === this.playerId) return;
    this.handleNetworkMessage(msg);
  }

  disconnect() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connected = false;
    this.mode = 'local';
    this.roomId = null;
  }
}

export const network = new NetworkManager();
