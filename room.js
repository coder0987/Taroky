const Board = require('./board.js');
const Player = require('./player.js');
const Deck = require('./deck.js');
const {DIFFICULTY, PLAYER_TYPE} = require('./enums.js');

class Room {
    constructor(name, debugRoom, logLevel, playerList) {
        this._settings = {'difficulty':DIFFICULTY.NORMAL, 'timeout': 30*1000, 'locked':false};
        this._name = name;
        this._host = -1;
        this._board = new Board();
        this._playerCount = 0;
        this._deck = new Deck();
        this._players = [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)];
        this._autoAction = 0;
        this._debug = debugRoom; //Either undefined or true
        this._settingsNotation = 'difficulty=2;timeout=30000;locked=false';
        this._logLevel = logLevel || 3;//0: none, 1: errors, 2: warn, 3: info, 4: debug logs, 5: trace
        this._playerList = playerList;
    }

    resetForNextRound() {
        this._board.resetForNextRound();
        for (let i in this._players) {
            this._players[i].resetForNextRound();
        }
        this._deck = new Deck();
    }

    informPlayers(message, messageType, extraInfo, pn) {
        for (let i in this.players) {
            if (this._players[i].type == PLAYER_TYPE.HUMAN) {
                if (typeof pn != 'undefined') {
                    if (pn == i) {
                        //Handled by youMessage
                        this._players[i].messenger.emit('gameMessage','You ' + message,messageType,extraInfo);
                    } else {
                        if (pn != -1 && this._players[pn].socket != -1 && this._playerList[this._players[pn].socket].username != 'Guest') {
                            this._players[i].messenger.emit('gameMessage', this._playerList[this._players[pn].socket].username + ' ' + message,messageType,extraInfo);
                        } else {
                            pn = +pn;
                            this._players[i].messenger.emit('gameMessage','Player ' + (pn+1) + ' ' + message,messageType,extraInfo);
                        }
                    }
                } else {
                    this._players[i].messenger.emit('gameMessage',message,messageType,extraInfo);
                }
            }
        }
    }

    informPlayer(pn, message, messageType, extraInfo) {
        if (this._players[pn].type == PLAYER_TYPE.HUMAN) {
            this._players[pn].messenger.emit('gameMessage', message, messageType, extraInfo);
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

    get debug() {
        return this._debug;
    }

    get settingsNotation() {
        return this._settingsNotation;
    }

    get logLevel() {
        return this._logLevel;
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

    set debug(debug) {
        this._debug = debug;
    }

    set settingsNotation(sn) {
        this._settingsNotation = sn;
    }

    set logLevel(ll) {
        this._logLevel = ll;
    }
}

module.exports = Room;
