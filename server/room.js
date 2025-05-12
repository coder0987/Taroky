const Board = require('./board.js');
const Player = require('./player.js');
const Deck = require('./deck.js');
const GamePlay = require('./GamePlay.js');
const GameManager = require('./GameManager.js');
const SERVER = require('./logger.js');
const {DIFFICULTY, PLAYER_TYPE, ROOM_TYPE, NUM_AVATARS, MESSAGE_TYPE} = require('./enums.js');
const {cardsToNotation} = require('./notation');
const {playerOffset} = require('./utils');

let iterator = 100000;

class Room {
    #gameplay;

    constructor(args) {
        let name         = args.name || 'Room';
        let settings     = args.settings || {'difficulty':DIFFICULTY.NORMAL, 'timeout': 30*1000, 'aceHigh':false, 'locked':true};
        let roomType     = args.roomType || 0;
        let logLevel     = args.logLevel || SERVER.logLevel;
        let botCutChoice = args.botCutChoice || 'Cut';
        let botCutLoc    = args.botCutLoc || 32;
        let deck         = args.deck || new Deck();
        let stop         = args.stop || false;

        this._settings = settings;
        this._name = name;
        this._joinCode = Room.createJoinCode();
        this._host = -1;
        this._board = new Board();
        this._playerCount = 0;
        this._deck = deck;
        this._players = [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)];
        this._autoAction = 0;
        this._settingsNotation = 'difficulty=2;timeout=30000;aceHigh=false;locked=false';
        this._logLevel = logLevel;//0: none, 1: errors, 2: warn, 3: info, 4: debug logs, 5: trace
        this._audience = {};
        this._audienceCount = 0;
        this._roomType = roomType;

        this._stopAtEnd = stop;
        this._botCutChoice = botCutChoice;
        this._botCutLoc = botCutLoc;

        this._players[0].avatar = Math.floor(Math.random() * NUM_AVATARS + 1);
        this._players[1].avatar = Math.floor(Math.random() * NUM_AVATARS + 1);
        this._players[2].avatar = Math.floor(Math.random() * NUM_AVATARS + 1);
        this._players[3].avatar = Math.floor(Math.random() * NUM_AVATARS + 1);

        this.#gameplay = new GamePlay(this);

        if (args.started) {
            this.jumpStart(args.povinnost);
        }
    }

    jumpStart(pov) {
        this.gameNumber = 1;
        this._board.nextStep.action = 'shuffle';
        this._board.nextStep.player = pov;//povinnost shuffles
    }

    playToEnd() {
        this._stopAtEnd = true;
        runAction(this._board.nextStep, this, this._board.nextStep.player);
    }

    resetForNextRound() {
        this._board.resetForNextRound();
        for (let i in this._players) {
            this._players[i].resetForNextRound();
        }
        if (this._deck.deck.length != 54) {
            SERVER.error("Whoops! The deck has the wrong number of cards.");
            console.log(this._deck.deck);
            this._deck = new Deck();
        }
    }

    informPlayers(message, messageType, extraInfo, pn) {
        SERVER.debug('informPlayers() called with message | ' + message + ' | messageType | ' + messageType + ' | extraInfo | ' + JSON.stringify(extraInfo) + ' | pn | ' + pn);
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
        SERVER.debug('informPlayer() called with message | ' + message + ' | messageType | ' + messageType + ' | extraInfo | ' + JSON.stringify(extraInfo) + ' | pn | ' + pn);
        if (this._players[pn].type == PLAYER_TYPE.HUMAN) {
            this._players[pn].messenger.emit('gameMessage', message, messageType, extraInfo);
        }
    }

    notifyStartGame() {
        for (let i = 0; i < 4; i++) {
            if (this._players[i].type == PLAYER_TYPE.HUMAN) {
                players[this._players[i].socket].socket.emit('startingGame', this._host, i, this._board.gameNumber, this._settings);
            }
        }
    }

    updateImportantInfo() {
        this._board.importantInfo.chips = {
            '0': this._players[0].chips,
            '1': this._players[1].chips,
            '2': this._players[2].chips,
            '3': this._players[3].chips
        };
    }

    updateImportantPreverInfo() {
        this._board.importantInfo.prever = (this._board.prever+1);
    }

    updateImportantPreverMultiplierInfo() {
        this._board.importantInfo.preverMultiplier = this._board.preverMultiplier;
    }

    updateDealNotation() {
        this._board.importantInfo.povinnost = (this._board.povinnost+1);
        this._board.notation = ''   + this._players[             this._board.povinnost].chips + '/'
                                    + this._players[playerOffset(this._board.povinnost,1)].chips + '/'
                                    + this._players[playerOffset(this._board.povinnost,2)].chips + '/'
                                    + this._players[playerOffset(this._board.povinnost,3)].chips + '/'
                                    + cardsToNotation(this._players[playerOffset(this._board.povinnost,0)].hand) + '/'
                                    + cardsToNotation(this._players[playerOffset(this._board.povinnost,1)].hand) + '/'
                                    + cardsToNotation(this._players[playerOffset(this._board.povinnost,2)].hand) + '/'
                                    + cardsToNotation(this._players[playerOffset(this._board.povinnost,3)].hand) + '/'
                                    + cardsToNotation(this._board.talon) + '/';
        
        this.setSettingsNotation(this);

        SERVER.log(this._board.notation);
    }

    prepReturnToGame() {
        for (let i in this._players) {
            if (this._players[i].socket != -1) {
                GameManager.INSTANCE.returnToGame[this._players[i].socket] = {notation: this._board.notation + this._settingsNotation, povinnost: this._board.povinnost, pn: i};
            }
        }
    }

    informPovinnost() {
        SERVER.debug('Povinnost is ' + this._board.povinnost, this._name, this._name);
        this.informPlayers('is povinnost', MESSAGE_TYPE.POVINNOST, { 'pn': this._board.povinnost }, this._board.povinnost);
    }

    informDrawTalon(pn, numCards) {
        this.informPlayer(pn, '', MESSAGE_TYPE.DRAW, {'cards': this._board.talon.slice(0,numCards)});
    }

    informPreverTalon(pn, step) {
        this.informPlayer(pn, '', MESSAGE_TYPE.PREVER_TALON,{'cards': this._players[pn].tempHand,'step':step});
    }

    informPreverKeptFirst() {
        this.informPlayers('kept the first set of cards',MESSAGE_TYPE.PREVER_TALON,{'pn':this._board.prever,'step':3},this._board.prever);
    }

    informPreverRejectedFirst() {
        this.informPlayers('rejected the first set of cards',MESSAGE_TYPE.PREVER_TALON,{'cards':this._board.publicPreverTalon,'pn':this._board.prever,'step':1},this._board.prever);
    }

    informPreverKeptSecond() {
        this.informPlayers('kept the second set of cards',MESSAGE_TYPE.PREVER_TALON,{'pn':this._board.prever,'step':3},this._board.prever);
    }

    informPreverRejectedSecond() {
        this.informPlayers('rejected the second of cards',MESSAGE_TYPE.PREVER_TALON,{'cards':this._board.publicPreverTalon.slice(3,6),'pn':this._board.prever,'step':1},this._board.prever);
    }

    establishPreverTeams() {
        if (this._board.povinnost === this._board.prever) {
            // Povinnost called prever. Everyone is against povinnost
            for (let i=0; i<4; i++) {
                this._players[i].isTeamPovinnost = false;
                this._players[i].publicTeam = -1;
            }
            this._players[this._board.prever].isTeamPovinnost = true;
            this._players[this._board.prever].publicTeam = 1;
        } else {
            // Someone besides povinnost called prever. Everyone is team povinnost
            for (let i=0; i<4; i++) {
                this._players[i].isTeamPovinnost = true;
                this._players[i].publicTeam = 1;
            }
            this._players[this._board.prever].isTeamPovinnost = false;
            this._players[this._board.prever].publicTeam = -1;
        }
    }

    markCardsAsPlayed(listOfCards) {
        for (let i in listOfCards) {
            this._board.cardsPlayed[Deck.cardId(listOfCards[i], this._settings.aceHigh)] = true;
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
        iterator += Math.floor(Math.random() * 100000)+1;
        let newCode = '';
        let tempIterator = iterator;
        while (tempIterator > 0) {
            newCode += String.fromCharCode(tempIterator % 26 + 65);
            tempIterator /= 26;
            tempIterator = Math.floor(tempIterator);
        }
        return newCode;
    }

    static settingsToNotation(settings) {
        let settingNotation = '';
        for (let i in settings) {
            settingNotation += i + '=' + settings[i] + ';';
        }
        return settingNotation.substring(0,settingNotation.length - 1);
    }

    // Getters
    get gameplay() {
        return this.#gameplay;
    }

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
            if (this._players[i].chips > this._players[highestChipsCount].chips) {
                highestChipsCount = i;
            }
        }
        return this._players[highestChipsCount];
    }

    get winnerNum() {
        //Returns the player with the most chips. If tie, ignore it
        let highestChipsCount = 0;
        for (let i in this._players) {
            if (this._players[i].chips > this._players[highestChipsCount].chips) {
                highestChipsCount = i;
            }
        }
        return highestChipsCount;
    }

    get bestHandNum() {
        //Returns the player with the highest hand ranking. If tie, ignore it
        let highestHand = 0;
        for (let i in this._players) {
            if (this._players[i].handRank > this._players[highestHand].handRank) {
                highestHand = i;
            }
        }
        return highestHand;
    }

    get playersInGame() {
        let playersInGameArr = [];
        for (let i in this._players) {
            playersInGameArr[i] = {
                'name': this._players[i].socket == -1 ? (this._players[i].type == PLAYER_TYPE.ROBOT ? 'Robot' : 'AI') : players[this._players[i].socket].username,
                'avatar': this._players[i].avatar
            };
        }
        return playersInGameArr;
    }

    get type() {
        return this._roomType;
    }

    get stop() {
        return this._stopAtEnd;
    }

    get botCutChoice() {
        return this._botCutChoice;
    }
    get botCutLoc() {
        return this._botCutLoc;
    }

    get cutter() {
        return (this.board.povinnost + 2) % 4;// Opposite of povinnost cuts
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
