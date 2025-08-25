const Deck = require('./deck');
const SERVER = require('./logger');

class GameManager {
    #returnToGame = {};
    #rooms = {};
    #players = {};
    #baseDeck = new Deck();
    #challenge;
    #SOCKET_LIST = {};
    #numOnlinePlayers = 0;

    static INSTANCE;

    constructor() {
        GameManager.INSTANCE = this;
    }

    removeRoom(roomID) {
        const room = this.#rooms[roomID];

        if (!room) {
            return;
        }

        room.ejectPlayers();
        room.ejectAudience();
        clearTimeout(room.autoAction);
        delete this.#rooms[roomID];

        SERVER.log(`Game Ended. Closing room ${roomID}`);
    }

    addRoom( args = {}, prefix = '' ) {
        const Room = require('./room'); // To avoid dependency cycle

        const id = this.getFirstOpenRoomID(prefix);

        args.name = id;

        rooms[id] = new Room(args);

        SERVER.log(`New room created: ${id}`);

        return rooms[id];
    }

    removePlayer(socketId) {
        try {
            SOCKET_LIST[socketId].disconnect();
        } catch (ignore) {}
        delete players[socketId];
        delete SOCKET_LIST[socketId];
        this.#numOnlinePlayers = Object.keys(this.#players).length;
    }

    cleanPlayers() {
        for (let i in this.#players) {
            if (!this.#players[i].socket || !this.#players[i].socket.connected) {
                SERVER.log(`GM: Removing player ${i}`);
                this.removePlayer(i);
            }
        }
    }

    addPlayer(socketId, socket, client) {
        this.#SOCKET_LIST[socketId] = socket;
        this.#players[socketId] = client;
        this.#numOnlinePlayers = Object.keys(this.#players).length;

        // Let other players know
        for (let i in this.#SOCKET_LIST) {
            this.#SOCKET_LIST[i].emit('returnPlayerCount', this.#numOnlinePlayers, this.#challenge.leaderboard, this.#challenge.retryLeaderboard);
        }

        // Handle return to game
        if (this.#returnToGame[socketId]) {
            this.#SOCKET_LIST[socketId].emit('returnToGame');
        }

        SERVER.log('Player joined with socketID ' + socketId);
        SERVER.debug('Join time: ' + Date.now());
    }

    getRoomByCode(code) {
        for (let i in rooms) {
            if (code === rooms[i].joinCode) {
                return i;
            }
        }
        return -1;
    }

    getFirstOpenRoomID(prefix) {
        let i = 1;
        for (; rooms[prefix+i]; i++) {}
        return prefix + i;
    }

    getPlayerList(socketId) {
        let playerListToSend = [];
        for (let i in this.#players) {
            if (i != socketId && this.#players[i].room != this.#players[socketId].room) {
                playerListToSend.push({
                    username: this.#players[i].username,
                    status: (this.#players[i].disconnecting ? 'Idle' : this.#players[i].room == -1 ? 'Online' : 'In Game'),
                    socket: i
                });
            }
        }
        return playerListToSend;
    }

    sendChatMessage(username, message) {
        for (let i in players) {
            if (players[i].roomID === -1 && players[i].username !== username) {
                players[i].socket.emit('chatMessage', username, message);
            }
        }
    }
    
    sendLeaderboardToAll() {
        for (let i in this.#SOCKET_LIST) {
            this.#SOCKET_LIST[i].emit('returnPlayerCount', this.#numOnlinePlayers, this.#challenge.leaderboard);
        }
    }

    get returnToGame() {
        return this.#returnToGame;
    }

    get rooms() {
        return this.#rooms;
    }

    get baseDeck() {
        return this.#baseDeck;
    }

    get challenge() {
        return this.#challenge;
    }

    get players() {
        return this.#players;
    }

    get SOCKET_LIST() {
        return this.#SOCKET_LIST;
    }

    set challenge(c) {
        this.#challenge = c;
    }
}

module.exports = GameManager;