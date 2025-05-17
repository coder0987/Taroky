/**
 * Client represents an ongoing connection
 * Someone, somewhere, is tied to each specific client
 * gm.players is a list of Clients
 */
const RATE_LIMIT = 1; // Players must wait 1 second between messages

const SERVER = require('./logger');
const GameManager = require('./GameManager');
const gm = GameManager.INSTANCE;

const { DISCONNECT_TIMEOUT, ACTION, SENSITIVE_ACTIONS, ROOM_TYPE } = require('./enums');
const Deck = require('./deck');
const { verifyCanJoinAudience, verifyCanPlayDailyChallenge, verifyCanMakeRoom, verifyCanReturnToGame, verifyPlayerCanChangeSettings, verifyCanSendInvite, verifyCanStartGame, verifyPlayerCanTakeAction, sanitizeShuffleType, sanitizeBoolean, sanitizeCutStyle, sanitizeCutLocation, sanitizeHandChoice, sanitizeDrawTalonChoice, verifyPartnerChoice, verifyCanDiscard, verifyPlayerCanTakeContraAction, verifyPlayerCanPlayCard, verifyCredentials, verifyCanSendMessage, verifyRoomExists, verifyCanSendMessageTo, verifyCanSaveSettings } = require('./Verifier');
const { getPNFromNotation, notationToObject } = require('./notation');
const { playerPerspective } = require('./utils');
const Auth = require('./Auth');
const AdminPanel = require('./AdminPanel');
const Database = require('./database');

class Client {
    #timeLastMessageSent;
    #socket;
    #socketId;
    #disconnectTimeout;

    #pid = -1;
    #roomID = -1;
    #room = null;
    #pn = -1;

    #inAudience = false;
    #inGame = false;

    #roomsSeen = {};
    #tempDisconnect = false;

    #username = 'Guest';
    #token = -1;
    #userInfo = { avatar: 0 };

    constructor(args) {
        this.#socketId = args.id || -1;
        this.#socket = args.socket || null;
    }

    // Client-server interactions
    disconnect() {
        SERVER.log(`Player ${this.socketId} disconnected`);

        this.exitGame();
        this.exitAudience();

        gm.removePlayer(this.#socketId);
    }

    playerDisconnectTimeout() {
        // Runs a few seconds after a player disconnects
        if (this.tempDisconnect) {
            this.disconnect();
        } else {
            SERVER.log(`Player ${this.socketId} didn't disconnect after all`);
        }
    }

    startDisconnectTimeout() {
        this.#disconnectTimeout = setTimeout(this.playerDisconnectTimeout, DISCONNECT_TIMEOUT);
    }

    stopDisconnectTimeout() {
        clearTimeout(this.#disconnectTimeout);
    }

    autoReconnect() {
        // Gather game information and send it to the client
        this.stopDisconnectTimeout();

        const reconnectInfo = {};
        this.gatherGMInfo(reconnectInfo);
        this.gatherUserInfo(reconnectInfo);
        this.gatherAudienceInfo(reconnectInfo);
        this.gatherGameInfo(reconnectInfo);

        this.#socket.emit('autoReconnect', reconnectInfo);
    }

    gatherGMInfo( obj ) {
        obj.playerCount = gm.numOnlinePlayers;
        obj.leaderboard = gm.challenge.leaderboard;
        obj.retryLeaderboard = gm.challenge.retryLeaderboard;
    }

    gatherUserInfo( obj ) {
        if (this.#username === 'Guest') {
            return;
        }
        obj.username = this.#username;
        obj.dailyChallengeScore = gm.challenge.getUserScore(this.#username);
        obj.elo             = this.userInfo?.elo;
        obj.admin           = this.userInfo?.admin;
        obj.defaultSettings = notationToObject(this.userInfo?.settings);
        obj.chat            = this.userInfo?.chat;
        obj.avatar          = this.userInfo?.avatar;
        obj.deck            = this.userInfo?.deck;
    }

    gatherAudienceInfo( obj ) {
        if (!this.#inAudience) {
            return;
        }

        obj.audienceConnected = this.#roomID;
        obj.roundInfo = this.#room.board.importantInfo;
    }

    gatherGameInfo( obj ) {
        if (!this.#inGame) {
            return;
        }

        obj.roomConnected = this.#roomID;
        obj.pn = this.#pn;
        obj.host = {
            number: this.#room.hostPN,
            name: this.#room.name,
            joinCode: this.#room.joinCode
        };

        if (this.nextStep.player === this.#pn) {
            // My turn
            obj.withGray = false;

            if (this.nextStep.action === ACTION.DISCARD) {
                Deck.grayUndiscardables(this.player.hand);
                obj.withGray = true;
            } else if (this.nextStep.action === ACTION.FOLLOW) {
                Deck.grayUnplayables(this.player.hand, this.#room.board.leadCard);
                obj.withGray = true;
            }

            obj.hand = [...Deck.sortCards(this.player.hand, this.#room.settings.aceHigh)];
        }

        // Important info
        obj.roundInfo = structuredClone(this.#room.board.importantInfo);
        obj.roundInfo.pn = +this.#pn + 1;

        obj.settings = this.#room.settings;
        if (this.nextStep.action !== ACTION.SHUFFLE) {
            obj.table = this.#room.board.table;
        }
        if (!SENSITIVE_ACTIONS[this.nextStep.action]) {
            obj.nextAction = this.nextStep;
        }

        obj.playersInGame = this.#room.playersInGame;
        obj.povinnost = this.#room.board.povinnost;
    }

    handleReconnect() {
        gm.SOCKET_LIST[this.#socketId] = this.#socket;

        SERVER.debug(`Player ${this.#socketId} auto-reconnected`);
        this.#socket.emit('message','You have been automatically reconnected');//debug

        this.#tempDisconnect = false;
        this.autoReconnect();
    }

    handleDisconnect() {
        this.stopDisconnectTimeout();
        this.startDisconnectTimeout();

        this.#tempDisconnect = true;
        this.#roomsSeen = {};

        SERVER.debug(`Player ${this.#socketId} may have disconnected`);
    }

    handleExitRoom() {
        this.exitGame();
        this.exitAudience();
        this.#socket.emit('returnRoomInfo',{})
    }

    handleAlive(callback) {
        callback(!this.#tempDisconnect);
    }

    handleJoinAudience(roomID) {
        if (!verifyCanJoinAudience(this, roomID)) {
            this.#socket.emit('audienceNotConnected', roomID);
            return;
        }

        this.#inAudience = true;
        this.#roomID = roomID;
        this.#room = gm.rooms[roomID];
        this.#room.addToAudience(this);
        this.#socket.emit('audienceConnected', roomID);
        this.autoReconnect();
    }

    handleJoinRoom(roomID, idIsCode) {
        if (idIsCode) {
            this.handleJoinByCode(roomID);
        } else {
            this.handleJoinByID(roomID, false);
        }
    }

    handleJoinByID(roomID, isCode) {
        if (!verifyCanJoinRoom(this, roomID, isCode)) {
            socket.emit('roomNotConnected', roomID);
            return;
        }

        this.#inGame = true;
        this.#room = gm.rooms[roomID];
        this.#roomID = roomID;
        this.#room.addToGame(this);

        this.#socket.emit('roomConnected', roomID);
        this.sync();
        this.autoReconnect();
    }

    handleJoinByCode(roomCode) {
        const roomID = gm.getRoomByCode(roomCode);

        if (roomID === -1) {
            SERVER.debug('This room does not exist', roomCode);
            this.#socket.emit('roomNotConnected', roomCode);
            return;
        }

        this.handleJoinByID(roomID, true);
    }

    handleDailyChallenge() {
        if (!verifyCanPlayDailyChallenge(this)) {
            this.#socket.emit('challengeNotConnected');
            return;
        }

        const room = gm.addRoom( { roomType: ROOM_TYPE.CHALLENGE, settings: gm.challenge.settings }, 'challenge');

        const notation = gm.challenge.notation;
        
        const joined = this.joinByNotation(room, notation);

        if (!joined) {
            this.#socket.emit('challengeNotConnected');
        }

        this.#socket.emit('roomConnected', room.name);
    }

    handleNewRoom() {
        if (!verifyCanMakeRoom(this)) {
            socket.emit('roomNotConnected', roomID);
            return;
        }

        const room = gm.addRoom( { settings: this.settings }, '');

        this.#room = room;
        this.#roomID = room.name;
        this.#inGame = true;

        room.addToGame(this);

        this.#socket.emit('roomHost');
        this.#socket.emit('youStart', room.name, room.joinCode);
        this.#socket.emit('roomConnected', room.name);
        this.sync();
    }

    handleCustomRoom(notation) {
        try {
            const room = gm.addRoom( { roomType: ROOM_TYPE.CUSTOM }, 'Custom ');
            const joined = this.joinByNotation(room, notation);

            if (!joined) {
                this.#socket.emit('roomNotConnected', 'Custom');
                return;
            }

        } catch (err) {
            SERVER.debug('Notation error');
            this.#socket.emit('roomNotConnected', 'Custom');
        }
    }

    handleReturnToGame() {
        if (!verifyCanReturnToGame(this)) {
            this.#socket.emit('roomNotConnected', 'Return To Game');
            return;
        }

        try {
            const rtg = gm.returnToGame[this.#socketId];

            const notation = rtg.notation + ';pn=' + playerPerspective(rtg.pn, rtg.povinnost);

            gm.returnToGame[this.#socketId] = false;

            const room = gm.addRoom( {  }, '');
            const joined = this.joinByNotation(room, notation);

            if (!joined) {
                this.#socket.emit('roomNotConnected', 'Return To Game');
                return;
            }

        } catch (err) {
            SERVER.debug('Notation error');
            this.#socket.emit('roomNotConnected', 'Return To Game');
        }
    }

    handleCurrentAction() {
        SERVER.debug(`Player ${socketId} sent a ping`);
        this.autoReconnect();
    }

    handleChangeSettings(setting, rule) {
        if (!verifyPlayerCanChangeSettings(this, setting, rule)) {
            SERVER.debug(`Player ${this.#socketId} attempted to edit settings illegally`);
            return;
        }

        switch (setting) {
            case 'difficulty':
                this.#room.changeDifficulty(rule);
                break;
            case 'timeout':
                this.#room.changeTimeout(rule);
                break;
            case 'aceHigh':
                this.#room.changeAceHigh(rule);
                break;
            case 'lock':
                this.#room.changeLock(rule);
                break;
            default:
                SERVER.log(`Nonexistent rule: ${setting}`);
        }

        this.#room.informSettings();
    }

    handleGetPlayers() {
        this.#socket.emit('returnPlayerList', gm.getPlayerList(this.#socketId));
    }

    handleSendInvite(socketId) {
        if (!verifyCanSendInvite(this, socketId)) {
            return;
        }

        SERVER.log(`${this.#socketId} sent an invite to ${socketId}`);
        gm.players[socketId].socket.emit('invite', this.#room.joinCode, this.#username);
    }

    handleStartGame() {
        if (!verifyCanStartGame(this)) {
            this.#socket.emit('nextAction', this.nextStep);
            return;
        }

        this.room.gameplay.actionCallback();
    }

    handlePlayerTakeAction(action) {
        if (!verifyPlayerCanTakeAction(this, action)) {
            return;
        }

        this.room.gameplay.actionCallback();
    }

    handlePlayerShuffle(type, again) {
        if (!verifyPlayerCanTakeAction(this, ACTION.SHUFFLE)) {
            SERVER.debug('Shuffle rejected');
            return;
        }

        type = sanitizeShuffleType(type);
        again = sanitizeBoolean(again);

        this.nextStep.info.type = type;
        this.nextStep.info.again = again;

        this.room.gameplay.actionCallback();
    }

    handlePlayerCut(style, location) {
        if (!verifyPlayerCanTakeAction(this, ACTION.CUT)) {
            return;
        }

        style = sanitizeCutStyle(style);
        location = sanitizeCutLocation(location);

        this.nextStep.info.style = style;
        this.nextStep.info.location = location;

        this.room.gameplay.actionCallback();
    }

    handleChooseHand(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.CHOICE)) {
            return;
        }

        choice = sanitizeHandChoice(this, choice);

        this.nextStep.info.choice = choice;

        this.room.gameplay.actionCallback();
    }

    handlePrever(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.PREVER)) {
            return;
        }

        this.nextStep.action = choice ? 'callPrever' : 'passPrever';

        this.room.gameplay.actionCallback();
    }

    handleTalon(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.DRAW_TALON)) {
            return;
        }

        choice = sanitizeDrawTalonChoice(this, choice);

        this.nextStep.action = choice ? 'drawTalon' : 'passTalon';

        this.room.gameplay.actionCallback();
    }

    handleDiscard(card) {
        if (!verifyPlayerCanTakeAction(this, ACTION.DISCARD) || !verifyCanDiscard(this, card)) {
            this.socket.emit('failedDiscard', card);
            return;
        }

        this.nextStep.info.card = { suit: card.suit, value: card.value };

        this.room.gameplay.actionCallback();
    }

    handleBidaUni(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.POVINNOST_BIDA_UNI_CHOICE)) {
            return;
        }

        this.nextStep.info.choice = choice;

        this.room.gameplay.actionCallback();
    }

    handleChoosePartner(partner) {
        if (!verifyPlayerCanTakeAction(this, ACTION.DISCARD) || !verifyPartnerChoice(this, partner)) {
            return;
        }

        this.nextStep.info.partnerCard = { suit: partner.suit, value: partner.value };

        this.room.gameplay.actionCallback();
    }

    handlePreverTalon(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.DRAW_PREVER_TALON)) {
            return;
        }

        this.nextStep.info.accept = choice;

        this.room.gameplay.actionCallback();
    }

    handleValat(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.VALAT)) {
            return;
        }

        this.nextStep.info.valat = choice;

        this.room.gameplay.actionCallback();
    }

    handleContra(choice) {
        if (!verifyPlayerCanTakeContraAction(this)) {
            return;
        }

        this.nextStep.info.contra = choice;

        this.room.gameplay.actionCallback();
    }

    handleIOTE(choice) {
        if (!verifyPlayerCanTakeAction(this, ACTION.IOTE)) {
            return;
        }

        this.nextStep.info.iote = choice;

        this.room.gameplay.actionCallback();
    }

    handlePlayCard(card) {
        if (this.nextStep?.action === ACTION.LEAD) {
            this.handleLead(card);
        } else if (this.nextStep?.action === ACTION.FOLLOW) {
            this.handleFollow(card);
        }
    }

    handleLead(card) {
        if (!verifyPlayerCanTakeAction(this, ACTION.FOLLOW) || !verifyPlayerCanPlayCard(card)) {
            this.socket.emit('failedLead', card);
            return;
        }

        this.nextStep.info.card = { suit: card.suit, value: card.value };

        this.room.gameplay.actionCallback();
    }

    handleFollow(card) {
        if (!verifyPlayerCanTakeAction(this, ACTION.FOLLOW) || !verifyPlayerCanPlayCard(card)) {
            this.socket.emit('failedFollow', card);
            return;
        }

        this.nextStep.info.card = { suit: card.suit, value: card.value };

        this.room.gameplay.actionCallback();
    }

    // User account tools
    handleLogin(username, token) {
        if (!verifyCredentials(username, token)) {
            return;
        }
        Auth.attemptSignIn(username, token, this.socket, this.socketId);
    }

    handleLogout() {
        this.#username = 'Guest';
        this.#token = -1;
        this.#userInfo = {};
        this.#socket.emit('logout');
        SERVER.log(`Player ${this.#socketId} has signed out`);
    }

    handleSaveSettings() {
        if (!verifyCanSaveSettings(this)) {
            return;
        }

        Database.saveSettings(this.#username, this.#room.settingsNotation);
        this.#userInfo.settings = this.#room.settingsNotation;
        this.#socket.emit('defaultSettings', notationToObject(this.#room.settingsNotation));
        SERVER.log('Default settings saved for user ' + this.#username + ': ' + this.#room.settingsNotation);
    }

    // Admin Tools
    restartServer(immediately) {
        if (!verifyIsAdmin(this)) {
            return;
        }

        SERVER.log(`Admin ${this.#username} restarted the server`);

        AdminPanel.shouldRestartServer = true;

        if (immediately) {
            AdminPanel.shutDown();
        }
    }

    reloadClients() {
        if (!verifyIsAdmin(this)) {
            return;
        }

        SERVER.log(`Admin ${this.#username} reloaded the clients`);

        AdminPanel.reloadClients();
    }

    printPlayerList() {
        if (!verifyIsAdmin(this)) {
            return;
        }

        SERVER.log(`Admin ${this.#username} fetched the client list`);

        this.#socket.emit('playerList', AdminPanel.printPlayerList());
    }

    printRoomList() {
        if (!verifyIsAdmin(this)) {
            return;
        }

        SERVER.log(`Admin ${this.#username} fetched the room list`);

        try {
            this.#socket.emit('roomList', AdminPanel.printRoomsList());
        } catch (maximumcallstacksize) {
            //too much info for one socket message
            SERVER.error('tmi');
            AdminPanel.printRoomsList(true);
        }
    }

    adminMessage(id, message) {
        if (!verifyIsAdmin(this) || !verifyCanSendMessageTo(id)) {
            return;
        }

        SERVER.log(`Admin ${this.#username} sent a message`);

        gm.players[id].socket.emit('broadcast',message);
    }

    removeRoom(id) {
        if (!verifyIsAdmin(this) || !verifyRoomExists(id)) {
            return;
        }

        SERVER.log(`Admin ${this.#username} removed a room`);

        gm.removeRoom(id);
    }

    // Chat message
    sendChat(message) {
        if (!verifyCanSendMessage(this)) {
            return;
        }

        if (this.#inGame || this.#inAudience) {
            // Send to players in local chat
            this.#room.sendChatMessage(this.#username, message);
        } else {
            // Send to lobby
            gm.sendChatMessage(this.#username, message);
        }

        this.updateLastMessageSentTime();
    }

    joinByNotation(room, notation) {
        // Assumes room was created by gm
        if (!notate(this.#room, notation)) {
            SERVER.debug('Notation error');
            gm.removeRoom(room.name);

            return false;
        }

        this.#inGame = true;
        this.#room = room;
        this.#roomID = this.#room.name;

        const pn = getPNFromNotation(notation);

        room.fillSlot(this, pn);

        this.sync();

        room.promptAction();

        this.#socket.emit('roomConnected', this.#roomID);

        return true;
    }

    exitAudience() {
        if (this.#inAudience) {
            // Player is in a room
            this.#room.removeFromAudience(this.#socketId);
            this.#inAudience = false;
            this.#room = null;
            this.#roomID = -1;
            this.#roomsSeen = {};
        }
    }

    exitGame() {
        if (this.#inGame) {
            if (this.#room.playerCount === 1) {
                gm.removeRoom(this.#roomID);
            } else {
                // Game will continue without this player
                this.#room.removeFromGame(this.#pn);
            }

            this.#inGame = false;
            this.#room = null;
            this.#roomID = -1;
            this.#pn = -1;
            this.#roomsSeen = {};
        }
    }

    sync() {
        this.#socket.emit('timeSync', Date.now());
    }

    canSendMessage() {
        return ((Date.now() - player.timeLastMessageSent) > RATE_LIMIT * 1000);
    }

    updateLastMessageSentTime() {
        this.#timeLastMessageSent = Date.now();
    }

    // Getters
    get socket() {
        return this.#socket;
    }

    get socketId() {
        return this.#socketId;
    }

    get timeLastMessageSent() {
        return this.#timeLastMessageSent;
    }

    get pid() {
        return this.#pid;
    }

    get roomID() {
        return this.#roomID;
    }

    get room() {
        return this.#room;
    }

    get inGame() {
        return this.#inGame;
    }

    get inAudience() {
        return this.#inAudience;
    }

    get pn() {
        return this.#pn;
    }

    get roomsSeen() {
        return this.#roomsSeen;
    }

    get tempDisconnect() {
        return this.#tempDisconnect;
    }

    get username() {
        return this.#username;
    }

    get token() {
        return this.#token;
    }

    get userInfo() {
        return this.#userInfo;
    }

    get player() {
        return this.#room?.players[this.#pn];
    }

    get nextStep() {
        return this.#room?.board.nextStep;
    }

    get hand() {
        return this.player?.hand;
    }

    get settings() {
        return notationToObject(this.#userInfo.settings);
    }

    // Setters
    set socket(socket) {
        this.#socket = socket;
    }

    set socketId(socketId) {
        this.#socketId = socketId;
    }

    set timeLastMessageSent(time) {
        this.#timeLastMessageSent = time;
    }

    set pid(pid) {
        this.#pid = pid;
    }

    set roomID(roomID) {
        this.#roomID = roomID;
    }

    set room(room) {
        this.#room = room;
    }

    set pn(pn) {
        this.#pn = pn;
    }

    set roomsSeen(roomsSeen) {
        this.#roomsSeen = roomsSeen;
    }

    set tempDisconnect(tempDisconnect) {
        this.#tempDisconnect = tempDisconnect;
    }

    set username(username) {
        this.#username = username;
    }

    set token(token) {
        this.#token = token;
    }

    set userInfo(userInfo) {
        this.#userInfo = userInfo;
    }
}

module.exports = Client;
