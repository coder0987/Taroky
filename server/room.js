const Board = require('./board.js');
const Player = require('./player.js');
const Deck = require('./deck.js');
const {DIFFICULTY, PLAYER_TYPE} = require('./enums.js');

let iterator = 100000;

class Room {
    constructor(args) {
        let name         = args.name || 'Room';
        let settings     = args.settings || {'difficulty':DIFFICULTY.NORMAL, 'timeout': 30*1000, 'aceHigh':false, 'locked':true};
        let trainingRoom = args.trainingRoom || false;
        let debugRoom    = args.debugRoom || false;
        let logLevel     = args.logLevel || 3;

        this._settings = settings;
        this._name = name;
        this._joinCode = Room.createJoinCode();
        this._host = -1;
        this._board = new Board();
        this._playerCount = 0;
        this._deck = new Deck();
        this._players = [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)];
        this._autoAction = 0;
        this._debug = debugRoom; //Either undefined or true
        this._settingsNotation = 'difficulty=2;timeout=30000;aceHigh=false;locked=false';
        this._logLevel = logLevel;//0: none, 1: errors, 2: warn, 3: info, 4: debug logs, 5: trace
        this._audience = {};
        this._audienceCount = 0;
        this._trainingRoom = trainingRoom;
        this._trainingGoal = trainingRoom ? 100 : -1;
    }

    resetForNextRound() {
        this._board.resetForNextRound();
        for (let i in this._players) {
            this._players[i].resetForNextRound();
        }
        this._deck = new Deck();
    }

    informPlayers(message, messageType, extraInfo, pn) {
        for (let i in this._players) {
            if (this._players[i].type == PLAYER_TYPE.HUMAN) {
                if (typeof pn != 'undefined') {
                    if (pn == i) {
                        //Handled by youMessage
                        this._players[i].messenger.emit('gameMessage','You ' + message,messageType,extraInfo);
                    } else {
                        if (pn != -1 && this._players[pn].socket != -1 && players[this._players[pn].socket].username != 'Guest') {
                            this._players[i].messenger.emit('gameMessage', players[this._players[pn].socket].username + ' ' + message,messageType,extraInfo);
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
        for (let i in this._audience) {
            if (typeof pn != 'undefined') {
                if (pn != -1 && this._players[pn].socket != -1 && players[this._players[pn].socket].username != 'Guest') {
                    this._audience[i].messenger.emit('gameMessage', players[this._players[pn].socket].username + ' ' + message,messageType,extraInfo);
                } else {
                    pn = +pn;
                    this._audience[i].messenger.emit('gameMessage','Player ' + (pn+1) + ' ' + message,messageType,extraInfo);
                }
            } else {
                this._audience[i].messenger.emit('gameMessage',message,messageType,extraInfo);
            }
        }
    }

    informPlayer(pn, message, messageType, extraInfo) {
        if (this._players[pn].type == PLAYER_TYPE.HUMAN) {
            this._players[pn].messenger.emit('gameMessage', message, messageType, extraInfo);
        }
    }

    ejectAudience() {
        for (let i in this._audience) {
            this._audience[i].messenger.emit('gameEnded');
        }
    }

    ejectPlayers() {
        for (let i in this._players) {
            if (this._players[i].messenger) {
                players[this._players[i].socket]['room'] = -1;
                players[this._players[i].socket]['pn'] = -1;
                players[this._players[i].socket]['roomsSeen'] = {};
                this._players[i].messenger.emit('gameEnded');
            }
        }
    }

    setSettingsNotation() {
        let settingNotation = '';
        for (let i in this._settings) {
            settingNotation += i + '=' + this._settings[i] + ';';
        }
        this._settingsNotation = settingNotation.substring(0,settingNotation.length - 1);
    }

    static createJoinCode() {
        iterator += Math.ceil(Math.random() * 100000);
        let newCode = '';
        let tempIterator = iterator;
        while (tempIterator > 0) {
            newCode += String.fromCharCode(tempIterator % 26 + 65);
            tempIterator /= 26;
            tempIterator = Math.floor(tempIterator);
        }
        return newCode;
    }

    // Getters
    get settings() {
        return this._settings;
    }

    get name() {
        return this._name;
    }

    get joinCode() {
        return this._joinCode;
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

    get audience() {
        return this._audience;
    }

    get audienceCount() {
        return this._audienceCount;
    }

    get trainingRoom() {
        return this._trainingRoom;
    }

    get trainingGoal() {
        return this._trainingGoal;
    }

    get winner() {
        //Returns the player with the most chips. If tie, ignore it
        let highestChipsCount = 0;
        for (let i in this._players) {
            if (this._players[i].chips > this._players[0].chips) {
                highestChipsCount = i;
            }
        }
        return this._players[highestChipsCount];
    }

    get playersInGame() {
        let playersInGameArr = [];
        for (let i in this._players) {
            playersInGameArr[i] = this._players[i].socket == -1 ? (this._players[i].type == PLAYER_TYPE.ROBOT ? 'Robot' : 'AI') : players[this._players[i].socket].username;
        }
        return playersInGameArr;
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

    set audience(audience) {
        this._audience = audience;
    }

    set audienceCount(audienceCount) {
        this._audienceCount = audienceCount;
    }

    set trainingRoom(trainingRoom) {
        this._trainingRoom = trainingRoom;
    }

    set trainingGoal(trainingGoal) {
        this._trainingGoal = trainingGoal;
    }
}

module.exports = Room;
