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
    return new Promise((resolve) => {
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.id === customId || !customId) {
          resolve(this.peer);
          return;
        }
        this.peer.destroy();
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
          console.warn('PeerJS event:', err.type, err.message);
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

    this.conn.on('open', () => {
      this.connected = true;
      this.opponentName = role === 'host' ? 'Challenger (P2)' : 'Host (P1)';
      
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

    this.conn.on('error', () => {
      this.connected = false;
    });
  }

  // Quick Online Matchmaking (Real players only, zero fake bots)
  async findRandomMatch(onProgress) {
    this.mode = 'online_match';
    this.connected = false;
    onProgress?.('Connecting to Quick Play arena...');

    const quickRoomId = 'VERSUS-ROOM-GLOBAL';

    await this.initPeer();

    this.broadcast?.postMessage({
      type: 'SEARCHING_MATCH',
      playerId: this.playerId
    });

    return new Promise((resolve) => {
      // 1. Try joining GLOBAL room as guest
      const joinConn = this.peer.connect(quickRoomId, { reliable: true });
      this.setupConnection(joinConn, 'guest');

      joinConn.on('open', () => {
        this.role = 'guest';
        this.connected = true;
        resolve({ role: 'guest' });
      });

      // 2. If no host exists yet, host the GLOBAL room and wait for any player to connect
      setTimeout(async () => {
        if (!this.connected) {
          try {
            if (this.peer) this.peer.destroy();
            await this.initPeer(quickRoomId);
            this.role = 'host';
            onProgress?.('Waiting for another player to join arena...');
          } catch (e) {
            console.warn('Quick match host error:', e);
          }
        }
      }, 1200);

      this.on('matched', () => {
        resolve({ role: this.role });
      });
    });
  }

  // Private Custom Room Code
  async createPrivateRoom() {
    this.mode = 'online_room';
    this.role = 'host';
    this.roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const peerRoomId = `VERSUS-ROOM-${this.roomId}`;

    if (this.peer) this.peer.destroy();
    await this.initPeer(peerRoomId);
    this.connected = false;
    return this.roomId;
  }

  async joinPrivateRoom(code) {
    this.mode = 'online_room';
    this.role = 'guest';
    this.roomId = code.toUpperCase().replace('VERSUS-', '').replace('ROOM-', '').trim();
    const peerRoomId = `VERSUS-ROOM-${this.roomId}`;

    await this.initPeer();
    const connection = this.peer.connect(peerRoomId, { reliable: true });
    this.setupConnection(connection, 'guest');

    this.broadcast?.postMessage({
      type: 'JOIN_ROOM',
      roomId: this.roomId,
      playerId: this.playerId
    });

    return true;
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
    } else if (msg.type === 'STATE_SYNC') {
      this.emit('state_sync', { state: msg.state });
    } else if (msg.type === 'GAME_SELECT') {
      this.emit('remote_game_select', { gameKey: msg.gameKey });
    } else if (msg.type === 'GAME_START') {
      this.emit('remote_game_start', { gameKey: msg.gameKey });
    } else if (msg.type === 'ROUND_RESET') {
      this.emit('remote_round_reset');
    } else if (msg.type === 'GAME_EXIT') {
      this.emit('remote_game_exit');
    } else if (msg.type === 'CHESS_MOVE') {
      this.emit('chess_move', msg);
    } else if (msg.type === 'CHESS_RESIGN') {
      this.emit('chess_resign', msg);
    } else if (msg.type === 'TTT_MOVE') {
      this.emit('ttt_move', msg);
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
