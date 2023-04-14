const Board = require('./board.js');
const Player = require('./player.js');
const Deck = require('./deck.js');
const {DIFFICULTY, PLAYER_TYPE} = require('./enums.js');

class Room {
    constructor(name) {
        this._settings = { 'difficulty': DIFFICULTY.EASY, 'timeout': 30 * 1000 };
        this._name = name;
        this._host = -1;
        this._board = new Board();
        this._playerCount = 0;
        this._deck = new Deck();
        this._players = [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)];
        this._autoAction = 0;
    }

    resetForNextRound() {
        this._board.resetForNextRound();
        for (let i in this._players) {
            this._players[i].resetForNextRound();
        }
        this._deck.shuffleDeck(3)
    }

    informPlayers(message, messageType, extraInfo) {
        for (let i in this._players) {
            if (this._players[i].type == PLAYER_TYPE.HUMAN) {
                this._players[this._players[i].socket].socket.emit('gameMessage', message, messageType, extraInfo);
            }
        }
    }

    informPlayer(pn, message, messageType, extraInfo) {
        if (this._players[pn].type == PLAYER_TYPE.HUMAN) {
            this._players[this._players[pn].socket].socket.emit('gameMessage', message, messageType, extraInfo);
        }
    }

    // Getters
    get settings() {
        return this._settings;
    }

    get name() {
        return this._name;
    }

    get host() {
        return this._host;
    }

    get board() {
        return this._board;
    }

    get playerCount() {
        return this._playerCount;
    }

    get deck() {
        return this._deck;
    }

    get players() {
        return this._players;
    }

    get autoAction() {
        return this._autoAction;
    }

    // Setters
    set settings(settings) {
        this._settings = settings;
    }

    set name(name) {
        this._name = name;
    }

    set host(host) {
        this._host = host;
    }

    set board(board) {
        this._board = board;
    }

    set playerCount(playerCount) {
        this._playerCount = playerCount;
    }

    set deck(deck) {
        this._deck = deck;
    }

    set players(players) {
        this._players = players;
    }

    set autoAction(autoAction) {
        this._autoAction = autoAction;
    }
}

module.exports = Room;
