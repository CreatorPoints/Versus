/**
 * VERSUS - Multiplayer Network Engine
 * Supports Online Matchmaking, Private Rooms, Cross-Tab Broadcast, and AI Bot sparring.
 */
import { db, isFirebaseAvailable } from '../firebase/config.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

export class NetworkManager {
  constructor() {
    this.mode = 'local'; // 'local' | 'online_match' | 'online_room' | 'bot'
    this.role = 'host'; // 'host' (P1) | 'guest' (P2)
    this.roomId = null;
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    this.opponentId = null;
    this.opponentName = 'Opponent';
    this.connected = false;
    this.latency = 24; // ms
    this.listeners = new Map();
    
    // Fallback broadcast channel for local cross-tab multiplayer
    this.broadcast = null;
    try {
      this.broadcast = new BroadcastChannel('versus_p2p_channel');
      this.broadcast.onmessage = (e) => this.handleBroadcastMessage(e.data);
    } catch (e) {
      console.log('BroadcastChannel not supported');
    }

    this.unsubRoom = null;
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

  // --- Matchmaking: Find random online opponent ---
  async findRandomMatch(onProgress) {
    this.mode = 'online_match';
    this.connected = false;
    onProgress?.('Searching for challengers on the network...');

    // If Firebase Firestore is configured and online:
    if (isFirebaseAvailable && db) {
      try {
        const queueRef = collection(db, 'versus_matchmaking');
        const q = query(queueRef, where('status', '==', 'waiting'));
        const snap = await getDocs(q);

        // Check for existing waiting player
        let joinedRoom = null;
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.hostId !== this.playerId && !joinedRoom) {
            joinedRoom = { id: docSnap.id, ...data };
          }
        });

        if (joinedRoom) {
          // Join as Guest (Player 2)
          this.role = 'guest';
          this.roomId = joinedRoom.id;
          this.opponentName = joinedRoom.hostName || 'Challenger';
          
          await updateDoc(doc(db, 'versus_matchmaking', joinedRoom.id), {
            guestId: this.playerId,
            guestName: 'You (P2)',
            status: 'active'
          });

          this.listenToRoom(joinedRoom.id);
          this.connected = true;
          this.emit('matched', { role: this.role, opponent: this.opponentName });
          return;
        } else {
          // Create room as Host (Player 1)
          this.role = 'host';
          this.roomId = 'match_' + Math.random().toString(36).substring(2, 8);
          await setDoc(doc(db, 'versus_matchmaking', this.roomId), {
            hostId: this.playerId,
            hostName: 'Challenger',
            status: 'waiting',
            createdAt: serverTimestamp()
          });

          this.listenToRoom(this.roomId);
        }
      } catch (err) {
        console.warn('Firestore matchmaking fallback:', err);
      }
    }

    // Fallback: Cross-tab matchmaking or Smart Bot match
    this.broadcast?.postMessage({
      type: 'SEARCHING_MATCH',
      playerId: this.playerId
    });

    // Wait up to 3.5 seconds for another player tab/client, else seamlessly pair with AI Bot!
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved && !this.connected) {
          resolved = true;
          this.setupBotMatch();
          resolve();
        }
      }, 3500);

      this.on('matched', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  // --- Setup Private Room ---
  async createPrivateRoom(customCode = null) {
    this.mode = 'online_room';
    this.role = 'host';
    this.roomId = customCode || Math.random().toString(36).substring(2, 6).toUpperCase();
    this.connected = false;

    if (isFirebaseAvailable && db) {
      try {
        await setDoc(doc(db, 'versus_rooms', this.roomId), {
          hostId: this.playerId,
          status: 'waiting',
          game: null,
          p1Score: 0,
          p2Score: 0
        });
        this.listenToRoom(this.roomId, 'versus_rooms');
      } catch (e) {
        console.warn('Room creation offline fallback', e);
      }
    }

    return this.roomId;
  }

  async joinPrivateRoom(code) {
    this.mode = 'online_room';
    this.role = 'guest';
    this.roomId = code.toUpperCase();

    if (isFirebaseAvailable && db) {
      try {
        const roomRef = doc(db, 'versus_rooms', this.roomId);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          await updateDoc(roomRef, {
            guestId: this.playerId,
            status: 'active'
          });
          this.listenToRoom(this.roomId, 'versus_rooms');
          this.connected = true;
          this.emit('matched', { role: 'guest', opponent: 'Room Host' });
          return true;
        }
      } catch (e) {
        console.warn('Room join error', e);
      }
    }

    // Cross tab / local test fallback
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
    this.emit('matched', { role: 'host', opponent: `${this.opponentName} [AI]` });
  }

  listenToRoom(roomId, collectionName = 'versus_matchmaking') {
    if (!isFirebaseAvailable || !db) return;
    if (this.unsubRoom) this.unsubRoom();

    const roomRef = doc(db, collectionName, roomId);
    this.unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      if (data.status === 'active' && !this.connected) {
        this.connected = true;
        this.opponentName = (this.role === 'host') ? (data.guestName || 'Player 2') : (data.hostName || 'Player 1');
        this.emit('matched', { role: this.role, opponent: this.opponentName });
      }

      if (data.gameState) {
        this.emit('remote_state', data.gameState);
      }
    });
  }

  sendInput(inputVector) {
    if (this.mode === 'bot' || this.mode === 'local') return;

    if (this.broadcast) {
      this.broadcast.postMessage({
        type: 'INPUT',
        sender: this.playerId,
        role: this.role,
        input: inputVector
      });
    }
  }

  sendState(state) {
    if (this.role !== 'host') return; // Only host syncs authoritative state
    if (this.broadcast) {
      this.broadcast.postMessage({
        type: 'STATE_SYNC',
        sender: this.playerId,
        state
      });
    }
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

    if (msg.type === 'STATE_SYNC') {
      this.emit('remote_state', msg.state);
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
