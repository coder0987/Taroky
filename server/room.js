const Board = require('./board.js');
const RobotPlayer = require('./Player/RobotPlayer.js');
const Deck = require('./deck.js');
const GamePlay = require('./GamePlay.js');
const GameManager = require('./GameManager.js');
const SERVER = require('./logger.js');
const {PLAYER_TYPE, MESSAGE_TYPE, SENSITIVE_ACTIONS} = require('./enums.js');
const {playerOffset} = require('./utils');
const {cardsToNotation} = require('./notation');
const HumanPlayer = require('./Player/HumanPlayer.js');
const Settings = require('./Settings.js');

let iterator = 100000;

class Room {
    #gameplay;

    constructor(args) {
        let name         = args.name || 'Room';
        let settings     = args.settings || new Settings();
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
        this._hostPN = -1;
        this._board = new Board();
        this._playerCount = 0;
        this._deck = deck;
        this._players = [new RobotPlayer({room: this}), new RobotPlayer({room: this}), new RobotPlayer({room: this}), new RobotPlayer({room: this})];
        this._autoAction = 0;
        this._logLevel = logLevel;//0: none, 1: errors, 2: warn, 3: info, 4: debug logs, 5: trace
        this._audience = {};
        this._audienceCount = 0;
        this._roomType = roomType;

        this._stopAtEnd = stop;
        this._botCutChoice = botCutChoice;
        this._botCutLoc = botCutLoc;

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
        this.gameplay.autoAction();
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
                if (typeof pn != 'undefined' && this._players[pn]) {
                    if (pn == i) {
                        //Handled by youMessage
                        this._players[i].messenger.emit('gameMessage','You ' + message,messageType,extraInfo);
                    } else {
                        if (this._players[i].messenger && this._players[pn].type === PLAYER_TYPE.HUMAN && this._players[pn].username != 'Guest') {
                            this._players[i].messenger.emit('gameMessage', this._players[pn].username + ' ' + message, messageType, extraInfo);
                        } else {
                            pn = +pn;
                            this._players[i].messenger.emit('gameMessage','Player ' + (pn+1) + ' ' + message, messageType, extraInfo);
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

    sendAllPlayers(messageType, message) {
        for (let i in this._players) {
            if (this._players[i].messenger) {
                this._players[i].messenger.emit(messageType, message);
            }
        }
    }

    sendAudience(messageType, message) {
        for (let i in this._audience) {
            if (this._audience[i].messenger) {
                this._audience[i].messenger.emit(messageType, message);
            }
        }
    }

    sendTable() {
        this.informTable();
    }

    notifyStartGame() {
        for (let i in this._players) {
            if (this._players[i].messenger) {
                this._players[i].messenger.emit('startingGame', this._host, i, this._board.gameNumber, this._settings.object);
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

    updateImportantMoneyCardsInfo() {
        this._board.importantInfo.chips = {
            '0': this._players[0].chips,
            '1': this._players[1].chips,
            '2': this._players[2].chips,
            '3': this._players[3].chips
        }
        this._board.importantInfo.moneyCards = this._board.moneyCards;
    }

    updateImportantUsernamesInfo() {
        this._board.importantInfo.usernames = {'0':null, '1':null, '2':null, '3':null};
        for (let i in this._players) {
            if (this._players[i].username && this._players[i].username != 'Guest') {
                this._board.importantInfo.usernames[i] = this._players[i].username;
            }
        }
    }

    updatePartnerCardInfo() {
        this._board.importantInfo.partnerCard = this._board.partnerCard;
    }

    updateImportantValatInfo() {
        this._board.importantInfo.valat = this._board.valat + 1;
    }

    updateImportantIOTEInfo() {
        this._board.importantInfo.iote = this._board.iote + 1;
    }

    updateImportantContraInfo() {
        this._board.importantInfo.contra = Math.pow(2,
                ~this._board.contra[0] ? this._board.contra[0] +
                (~this._board.contra[1] ? this._board.contra[1] : 0) : 0);
    }

    updateTrickHistory(pn) {
        this._board.trickHistory.push(
            {
                leadPlayer: this._board.leadPlayer,
                winner: pn,
                cards: [
                    {suit: this._board.table[0].suit, value: this._board.table[0].value},
                    {suit: this._board.table[1].suit, value: this._board.table[1].value},
                    {suit: this._board.table[2].suit, value: this._board.table[2].value},
                    {suit: this._board.table[3].suit, value: this._board.table[3].value}
                ]
            }
        );
    }

    payMoneyCards(pn, owedChips) {
        for (let i in this._players) {
            if (i == pn) {
                this._players[i].chips += 3 * owedChips;
            } else {
                this._players[i].chips -= owedChips;
            }
        }
    }

    payWinnings(team1Players, team2Players, chipsOwed) {
        for (let i in team1Players) {
            let tempChipsOwed = chipsOwed;
            if (team1Players.length == 1) { tempChipsOwed *= 3; }
            team1Players[i].chips += tempChipsOwed;
        }

        for (let i in team2Players) {
            let tempChipsOwed = chipsOwed;
            if (team2Players.length == 1) { tempChipsOwed *= 3; }
            team2Players[i].chips -= tempChipsOwed;
        }
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
                GameManager.INSTANCE.returnToGame[this._players[i].socket] = {notation: this._board.notation + this.settingsNotation, povinnost: this._board.povinnost, pn: i};
            }
        }
    }

    resetAutoAction() {
        if (this._autoAction) {
            clearTimeout(this._autoAction);
        }
        if (this._settings.timeout > 0) {
            this._autoAction = setTimeout(() => this.gameplay.autoAction(), this._settings.timeout);
        }
    }

    informPlayersInGame() {
        this.sendAllPlayers('returnPlayersInGame', this.playersInGame);
    }

    informSettings() {
        SERVER.debug(`Sending settings ${JSON.stringify(this._settings.object)} to players`, this._name);
        this.sendAllPlayers('returnSettings', this._settings.object);
    }

    informActionTaken() {
        this.sendAudience('returnRoundInfo', this._board.importantInfo);

        for (let i in this._players) {
            if (this._players[i].messenger) {
                this._board.importantInfo.pn = (+i+1);
                this._players[i].messenger.emit('returnHand', Deck.sortCards(this._players[i].hand, this._settings.aceHigh), false);
                this._players[i].messenger.emit('returnRoundInfo', this._board.importantInfo);
                this._board.importantInfo.pn = null;
            }
        }
    }

    informNextAction() {
        if (!this._board.nextStep.info) {
            this._board.nextStep.info = {};
        }

        const action = { ... this._board.nextStep };
        action.info = {}; // shallow copy, doesn't affect original

        if (this._board.nextStep.info.possiblePartners) {
            // Preserve possible partners
            action.info.possiblePartners = this._board.nextStep.info.possiblePartners;
        }

        if (SENSITIVE_ACTIONS[action.action]) {
            const pn = action.player;
            if (this._players[pn].messenger) {
                this._players[pn].messenger.emit('nextAction', action);
            }
            
            return;
        }

        this.sendAllPlayers('nextAction', action);
        this.sendAudience('nextAction', action);
    }

    informCutChoice(pn, cutType) {
        SERVER.debug('Cut choice: ' + cutType, this._name, this._name);
        this.informPlayers('cut by ' + cutType, MESSAGE_TYPE.CUT, { pn: pn }, pn);
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

    informFailedDiscard(pn, card) {
        if (this._players[pn].messenger) {
            this._players[pn].messenger.emit('failedDiscard', card);
        }
        if (card) {
            SERVER.warn('Player ' + pn + ' failed to discard the ' + card.value + ' of ' + card.suit, this._name);
        }
        SERVER.warn('Failed to discard. Cards in hand: ' + JSON.stringify(this._players[pn].hand), this._name);
    }

    informTrumpDiscarded(pn, card) {
        this.informPlayers('discarded the ' + card.value, MESSAGE_TYPE.TRUMP_DISCARD, {pn: pn, card: card}, pn);
        
        // I'm not really sure what this code does :)
        if (this._board.prever != -1) {
            this._board.trumpDiscarded[0].push({suit:card.suit, value:card.value});
        } else {
            this._board.trumpDiscarded[((+this._board.povinnost - +pn) + 4)%4].push({suit:card.suit, value:card.value});
        }

        // Mark it as played for the bots
        this._board.cardsPlayed[Deck.cardId(card, this._settings.aceHigh)] = true;
    }

    informMoneyCards(pn, moneyCards) {
        let theMessage = 'is calling ';
        let yourMoneyCards = 'You are calling ';
        let numCalled = 0;
        for (let i in moneyCards) {
            numCalled++;
            theMessage += ((numCalled>1 ? ', ' : '') + moneyCards[i]);
            yourMoneyCards += ((numCalled>1 ? ', ' : '') + moneyCards[i]);
        }
        if (numCalled == 0) {
            theMessage += 'nothing';
            yourMoneyCards += 'nothing';
        }
        this.informPlayers(theMessage, MESSAGE_TYPE.MONEY_CARDS, {youMessage: yourMoneyCards, pn: pn}, pn);
    }

    informCalledValat(pn) {
        this.informPlayers('called valat', MESSAGE_TYPE.VALAT, {pn: pn},pn);
    }

    informIOTECalled(pn) {
        this.informPlayers('called the I on the end', MESSAGE_TYPE.IOTE, {pn: pn},pn);
    }

    informCalledContra(pn) {
        this.informPlayers('called contra', MESSAGE_TYPE.CONTRA, {pn: pn}, pn);
    }

    informTable() {
        this.sendAllPlayers('returnTable', this._board.table);
        this.sendAudience('returnTable', this._board.table);
    }

    informPartnerCard() {
        this.informPlayers('(Povinnost) is playing with the ' + this._board.partnerCard, MESSAGE_TYPE.PARTNER, 
            {youMessage: 'You are playing with the ' + this._board.partnerCard, pn: this._board.nextStep.player}, this._board.nextStep.player);
    }

    informCardLead(pn, card) {
        this.informPlayers('lead the ' + card.value + ' of ' + card.suit, MESSAGE_TYPE.LEAD, {pn: pn, card: card}, pn);
    }

    informCardPlayed(pn, card) {
        this.informPlayers('played the ' + card.value + ' of ' + card.suit, MESSAGE_TYPE.PLAY, {pn: pn, card: card}, pn);
    }

    informWonTrick(trickWinner) {
        this.informPlayers( 'won the trick', MESSAGE_TYPE.WINNER, {pn: trickWinner},trickWinner );
    }

    informFinalPoints(team1Players, team2Players, chipsOwed, pointCountMessageTable) {
        for (let i in team1Players) {
            let tempChipsOwed = chipsOwed;
            if (team1Players.length == 1) { tempChipsOwed *= 3; }
            if (tempChipsOwed < 0) {
                this.informPlayer(team1Players[i].pn, 'Your team lost ' + (-tempChipsOwed) + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
            } else {
                this.informPlayer(team1Players[i].pn, 'Your team won ' + tempChipsOwed + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
            }
        }

        for (let i in team2Players) {
            let tempChipsOwed = chipsOwed;
            if (team2Players.length == 1) { tempChipsOwed *= 3; }
            if (tempChipsOwed < 0) {
                this.informPlayer(team2Players[i].pn, 'Your team won ' + (-tempChipsOwed) + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
            } else {
                this.informPlayer(team2Players[i].pn, 'Your team lost ' + tempChipsOwed + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
            }
        }
    }

    informGameNotation() {
        this.informPlayers(this._board.notation + this.settingsNotation, MESSAGE_TYPE.NOTATION, {povinnost: this._board.povinnost});
    }

    sendChatMessage(username, message) {
        for (let i in this._players) {
            if (this._players[i].messenger && this._players[i].username !== username) {
                this._players[i].messenger.emit('chatMessage', username, message);
            } 
        }
        for (let i in this._audience) {
            if (this._audience[i].messenger && this._audience[i].username !== username) {
                this._audience[i].messenger.emit('chatMessage', username, message);
            } 
        }
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
            if (this._players[i].client) {
                this._players[i].client.ejectFromGame();
            } else if (this._players[i].timeout) {
                this._players[i].clearTimeout();
            }
        }
    }

    removeFromAudience(socketId) {
        if (this._audience[socketId]) {
            this._audience.ejectFromGame();
            delete this._audience[socketId];
            this.audienceCount--;
        }
    }

    removeFromGame(pn) {
        if (this._players[pn].type !== PLAYER_TYPE.HUMAN) {
            return;
        }

        const wasHost = this._host == this._players[pn].socketId;

        this._players[pn] = new RobotPlayer( { room: this, old: this._players[pn] } );
        this._playerCount--;

        if (wasHost) {
            this.newHost();
        }

        this.informPlayers('left the room',MESSAGE_TYPE.DISCONNECT,{},pn);
        this.informPlayersInGame();
        if (this._board.nextStep.player === pn) {
            this.gameplay.autoAction();
        }
    }

    fillSlot(client, pn) {
        client.pn = pn;

        this._players[pn] = new HumanPlayer( { old: this._players[pn], client: client } );
        this._playerCount++;

        this.informPlayers('joined the game', MESSAGE_TYPE.CONNECT, {}, pn);

        if (this.debug) {
            client.socket.emit('debugRoomJoin');
        }

        this.informPlayersInGame();

        if (this._host === -1) {
            this._host = client.socketId;
            this._hostPN = pn;
        }
    }

    addToGame(client) {
        const pn = this.findOpenSlot();

        this.fillSlot(client, pn);
    }

    findOpenSlot() {
        for (let i in this._players) {
            if (this._players[i].type !== PLAYER_TYPE.HUMAN) {
                return i;
            }
        }
        return -1;
    }

    newHost() {
        // Find a HUMAN, and designate that player as the host
        for (let i in this._players) {
            if (this._players[i].type === PLAYER_TYPE.HUMAN) {
                this._host = this._players[i].socketId;
                this._hostPN = i;
                this._players[i].socket.emit('roomHost');
                break;
            }
        }
    }

    addToAudience( client ) {
        this._audience[client.socketId] = client;
        this._audienceCount++;
    }

    setSettingsNotation() {
        this._settings.setSettingsNotation();
    }

    settingsUpdate(message) {
        if (!message) {return;}

        SERVER.debug(message, this._name);
        this.informPlayers(message, MESSAGE_TYPE.SETTING);
    }

    promptAction() {
        this._players[this._board.nextStep.player].next();
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

    get hostPN () {
        return this._hostPN;
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
        return this._settings.settingsNotation;
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
            if (this._players[i].type == PLAYER_TYPE.HUMAN) {
                playersInGameArr[i] = {
                    'name':  this._players[i].username,
                    'avatar': this._players[i].avatar
                };
            } else {
                playersInGameArr[i] = {
                    'name':  this._players[i].type == PLAYER_TYPE.ROBOT ? 'Robot' : 'AI',
                    'avatar': this._players[i].avatar
                };
            }
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
