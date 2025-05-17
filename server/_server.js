#!/usr/bin/env node


//COMMAND-LINE ARGUMENTS

//Used for non-"production" instances of the server
const DEBUG_MODE = process.argv[2] == 'debug' || process.argv[2] == 'train' || process.argv[2] == 'test';
const TEST = process.argv[4];
const LOG_LEVEL = process.argv[3] || (DEBUG_MODE ? 5 : 3);//Defaults to INFO level. No traces or debugs.
const TRAINING_MODE = process.argv[2] == 'train';

//imports
const SERVER = require('./logger.js');
SERVER.logLevel = LOG_LEVEL;

const GameManager = require('./GameManager.js');
const gm = new GameManager();

const AdminPanel = require('./AdminPanel.js');
const { Buffer } = require('node:buffer')
const {
    PLAYER_TYPE,
    ROOM_TYPE,
    ACTION,
    BOT_SPEEDS } = require('./enums.js');
const Challenge = require('./challenge.js');
const Auth = require('./Auth');
const Client = require('./Client.js');

if (DEBUG_MODE) {
    BOT_SPEEDS[0] = 0;
    BOT_SPEEDS[1] = 0;
}

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const BASE_FOLDER = __dirname.substring(0,__dirname.length - 6);

//Standard file-serving
app.use(express.static(BASE_FOLDER + 'public'));
app.use(bodyParser.urlencoded({ extended: false }))
app.post('/preferences', function (req, res) {
    if(!req.headers.authorization) {
        console.log('Sent request without username or password');
        res.writeHead(403);
        return res.end();
    }
    let username, token;
    try {
        const base64Credentials = req.headers.authorization.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        [username, token] = credentials.split(':');
    } catch (err) {
        console.log('Missing or corrupted credentials');
        res.writeHead(403);
        return res.end();
    }
    Auth.saveUserPreferencesConditional(username, token, req.body);

    res.writeHead(200);
    return res.end()
});
app.get('/preferences', function (req, res) {
    if(!req.headers.authorization) {
        console.log('Sent request without username or password');
        res.writeHead(403);
        return res.end();
    }
    let username, token;
    try {
        const base64Credentials = req.headers.authorization.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        [username, token] = credentials.split(':');
    } catch (err) {
        console.log('Missing or corrupted credentials');
        res.writeHead(403);
        return res.end();
    }

    let once = false;

    Auth.sendUserInfoConditional(res, username, token, function(e) {
        console.log('Error GET /preferences: ' + e);
        if (!once) {
            once = true;
            res.status(403);
            return res.end();
        }
    }, function(e) {
        if (!once) {
            once = true;
            return res.status(200).json(JSON.stringify(e));
        }
    });
});
const server = http.createServer(app);

//SOCKETS
const io = require('socket.io')(server);

SOCKET_LIST = gm.SOCKET_LIST;
players = gm.players;
rooms = gm.rooms;

gm.challenge = new Challenge();
gm.challenge.scheduleChallenge();

SERVER.log(`New challenge scheduled: ${gm.challenge.notation}`);

let simplifiedRooms = {};
let ticking = false;

io.sockets.on('connection', function (socket) {
    let socketId = socket.handshake.auth.token;
    if (socketId === undefined || isNaN(socketId) || socketId == 0 || socketId == null) {
        socket.disconnect();//Illegal socket
        return;
    }
    if (!SOCKET_LIST[socketId]) {
        gm.addPlayer(socketId, socket, new Client( { id: socketId, socket: socket } ));

        if (socket.handshake.auth.username && socket.handshake.auth.signInToken) {
            Auth.attemptSignIn(socket.handshake.auth.username, socket.handshake.auth.signInToken, socket, socketId)
        }
    }

    const client = players[socketId];

    if (!client) {
        SERVER.log(`Client ${socketId} is null`);
        return;
    }

    if (client.tempDisconnect) {
        client.socket = socket;
        client.handleReconnect();
    }

    const log = (event) => SERVER.debug(`Received socket event: '${event}' from player ${socketId}`);

    socket.on('reconnect', () => {
        log('reconnect');
        client.socket = socket;
        client.handleReconnect();
    });

    socket.on('disconnect', () => {
        log('disconnect');
        client.handleDisconnect();
    });

    socket.on('exitRoom', () => {
        log('exitRoom');
        client.handleExitRoom();
    });

    socket.on('alive', (callback) => {
        //log('alive');
        client.handleAlive(callback);
    });

    socket.on('joinAudience', (roomID) => {
        log('joinAudience');
        client.handleJoinAudience(roomID);
    });

    socket.on('roomConnect', (roomID, idIsCode) => {
        log('roomConnect');
        client.handleJoinRoom(roomID, idIsCode);
    });

    socket.on('dailyChallenge', () => {
        log('dailyChallenge');
        client.handleDailyChallenge();
    });

    socket.on('newRoom', () => {
        log('newRoom');
        client.handleNewRoom();
    });

    socket.on('customRoom', (notation) => {
        log('customRoom');
        client.handleCustomRoom(notation);
    });

    socket.on('returnToGame', () => {
        log('returnToGame');
        client.handleReturnToGame();
    });

    socket.on('requestTimeSync', () => {
        log('requestTimeSync');
        client.sync();
    });

    socket.on('currentAction', () => {
        log('currentAction');
        client.handleCurrentAction();
    });

    socket.on('getRooms', () => {
        log('getRooms');
        if (socket) socket.emit('returnRooms', simplifiedRooms);
    });

    socket.on('settings', (setting, rule) => {
        log('settings');
        client.handleChangeSettings(setting, rule);
    });

    socket.on('getPlayerList', () => {
        log('getPlayerList');
        client.handleGetPlayers();
    });

    socket.on('invite', (socketId) => {
        log('invite');
        client.handleSendInvite(socketId);
    });

    socket.on('startGame', () => {
        log('startGame');
        client.handleStartGame();
    });

    socket.on('play', () => {
        log('play');
        client.handlePlayerTakeAction(ACTION.PLAY);
    });

    socket.on('shuffle', () => {
        log('shuffle');
        client.handlePlayerShuffle();
    });

    socket.on('cut', (style, location) => {
        log('cut');
        client.handlePlayerCut(style, location);
    });

    socket.on('deal', () => {
        log('deal');
        client.handlePlayerTakeAction(ACTION.DEAL);
    });

    socket.on('chooseHand', (choice) => {
        log('chooseHand');
        client.handleChooseHand(choice);
    });

    socket.on('goPrever', () => {
        log('goPrever');
        client.handlePrever(true);
    });

    socket.on('noPrever', () => {
        log('noPrever');
        client.handlePrever(false);
    });

    socket.on('goTalon', () => {
        log('goTalon');
        client.handleTalon(true);
    });

    socket.on('noTalon', () => {
        log('noTalon');
        client.handleTalon(false);
    });

    socket.on('discard', (card) => {
        log('discard');
        client.handleDiscard(card);
    });

    socket.on('goBida or Uni', () => {
        log('goBida or Uni');
        client.handleBidaUni(true);
    });

    socket.on('noBida or Uni', () => {
        log('noBida or Uni');
        client.handleBidaUni(false);
    });

    socket.on('moneyCards', () => {
        log('moneyCards');
        client.handlePlayerTakeAction(ACTION.MONEY_CARDS);
    });

    socket.on('choosePartner', (partner) => {
        log('choosePartner');
        client.handleChoosePartner(partner);
    });

    socket.on('goPrever Talon', () => {
        log('goPrever Talon');
        client.handlePreverTalon(true);
    });

    socket.on('noPrever Talon', () => {
        log('noPrever Talon');
        client.handlePreverTalon(false);
    });

    socket.on('goValat', () => {
        log('goValat');
        client.handleValat(true);
    });

    socket.on('noValat', () => {
        log('noValat');
        client.handleValat(false);
    });

    socket.on('goContra', () => {
        log('goContra');
        client.handleContra(true);
    });

    socket.on('noContra', () => {
        log('noContra');
        client.handleContra(false);
    });

    socket.on('goIOTE', () => {
        log('goIOTE');
        client.handleIOTE(true);
    });

    socket.on('noIOTE', () => {
        log('noIOTE');
        client.handleIOTE(false);
    });

    socket.on('lead', (card) => {
        log('lead');
        client.handlePlayCard(card);
    });

    socket.on('winTrick', () => {
        log('winTrick');
        client.handlePlayerTakeAction(ACTION.WIN_TRICK);
    });

    socket.on('countPoints', () => {
        log('countPoints');
        client.handlePlayerTakeAction(ACTION.COUNT_POINTS);
    });

    socket.on('resetBoard', () => {
        log('resetBoard');
        client.handlePlayerTakeAction(ACTION.RESET);
    });

    /*
    socket.on('createSavePoint', function() {
        if (players[socketId] && rooms[players[socketId].room] && rooms[players[socketId].room].board.notation.length > 0 && players[socketId].savePoints[players[socketId].savePoints.length - 1] != rooms[players[socketId].room].board.notation + rooms[players[socketId].room].settingsNotation) {
            players[socketId].savePoints.push(rooms[players[socketId].room].board.notation + room.settingsNotation);
        }
    });
    */

    //User account tools
    socket.on('login', (username, token) => {
        log('login');
        client.handleLogin(username, token);
    });

    socket.on('logout', () => {
        log('logout');
        client.handleLogout();
    });

    socket.on('saveSettings', () => {
        log('saveSettings');
        client.handleSaveSettings();
    });

    //Admin tools
    socket.on('restartServer', (immediately) => {
        log('restartServer');
        client.restartServer(immediately);
    });

    socket.on('reloadClients', () => {
        log('reloadClients');
        client.reloadClients();
    });

    socket.on('printPlayerList', () => {
        log('printPlayerList');
        client.printPlayerList();
    });

    socket.on('printRoomList', () => {
        log('printRoomList');
        client.printRoomList();
    });

    socket.on('adminMessage', (id, message) => {
        log('adminMessage');
        client.adminMessage(id, message);
    });

    socket.on('adminSignIn', (username) => {
        log('adminSignIn');
        if (DEBUG_MODE && players[socketId]) {
            gm.players[socketId].username = username;
            gm.players[socketId].userInfo = { admin: true, elo: 2000, avatar: 1, chat: true,  };
            socket.emit('loginSuccess', username);
            socket.emit('elo', 2000);
            socket.emit('avatar', 1);
            socket.emit('admin', true);
        }
    });

    socket.on('removeRoom', (id) => {
        log('removeRoom');
        client.removeRoom(id);
    });

    socket.on('broadcastMessage', (name, message) => {
        log('broadcastMessage');
        client.sendChat(message);
    });
});

function checkRoomsEquality(a, b) {
    if (Object.keys(a).length != Object.keys(b).length) { return false; }
    for (let i in a) {
        if (!b[i] || a[i].count != b[i].count) {
            return false;
        }
    }
    return true;
}

function tick() {
    if (!ticking) {
        ticking = true;
        for (let i in rooms) {
            //Operations
            if (rooms[i] && rooms[i].playerCount == 0) {
                clearTimeout(rooms[i].autoAction);
                rooms[i].ejectAudience();
                delete rooms[i];
                SERVER.log('Stopped empty game',i);
            }
        }

        simplifiedRooms = {};
        for (let i in rooms) {
            if (rooms[i] && !rooms[i].settings.locked && rooms[i].type != ROOM_TYPE.CHALLENGE) {
                let theUsernames = [];
                for (let p in rooms[i].players) {
                    if (rooms[i].players[p].type == PLAYER_TYPE.HUMAN && players[rooms[i].players[p].socket]) {
                        theUsernames.push(players[rooms[i].players[p].socket].username);
                    }
                }
                simplifiedRooms[i] = { 'count': rooms[i].playerCount, 'usernames': theUsernames, 'audienceCount': rooms[i].audienceCount };
            } else {
                if (!rooms[i]) {
                    SERVER.warn('A room disappeared');
                } else {
                    //Locked or challenge
                }
            }
        }
        for (let i in players) {
            if (!~players[i]['room'] && !players[i].tempDisconnect && !checkRoomsEquality(players[i].roomsSeen, simplifiedRooms)) {
                players[i]['socket'].emit('returnRooms', simplifiedRooms);
                players[i].roomsSeen = { ...simplifiedRooms };
            }
        }
        if (Object.keys(players).length == 0 && AdminPanel.shouldRestartServer) {
            AdminPanel.shutDown();
        }
        ticking = false;
    }
}

if (!TRAINING_MODE) {
    //AI in training won't use normal room operations
    setInterval(tick, 1000);//once each second
    setInterval(Auth.checkAllUsers, 5*60*1000);
}

//Begin listening
if (DEBUG_MODE) {
    console.log("DEBUG MODE ACTIVATED");
    console.log("Listening on port 8448 (Accessible at http://localhost:8448/ )")
    server.listen(8448);
} else {
    console.log("Server running in production mode. For debug mode, run \nnode _server.js debug")
    console.log("Listening on port 8442 (Accessible at http://localhost:8442/ )");
    server.listen(8442);
}
console.log("Log level: " + LOG_LEVEL);

if (TEST) {
    const ShuffleTest = require('./Tests/shuffle.js');
    if (!ShuffleTest) {
        console.log('Unknown test: ' + TEST);
        return;
    }
    let test = new ShuffleTest();
    test.initiateTest();
}