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
    ACTION } = require('./enums.js');
const Challenge = require('./challenge.js');
const Auth = require('./Auth');
const Client = require('./Client.js');

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

    socket.on('reconnect', function() {
        client.socket = socket;
        client.handleReconnect();
    });

    socket.on('disconnect', client.handleDisconnect);

    socket.on('exitRoom', client.handleExitRoom);

    socket.on('alive', client.handleAlive);

    socket.on('joinAudience', client.handleJoinAudience);

    socket.on('roomConnect', client.handleJoinRoom);

    socket.on('dailyChallenge', client.handleDailyChallenge);

    socket.on('newRoom', client.handleNewRoom);

    socket.on('customRoom', client.handleCustomRoom);

    socket.on('returnToGame', client.handleReturnToGame);

    socket.on('requestTimeSync', client.sync);

    socket.on('currentAction', client.handleCurrentAction);

    socket.on('getRooms', function () {
        if (socket) {
            socket.emit('returnRooms', simplifiedRooms);
        }
    });
    
    socket.on('settings', client.handleChangeSettings);

    socket.on('getPlayerList', client.handleGetPlayers);
    
    socket.on('invite', client.handleSendInvite);

    socket.on('startGame', client.handleStartGame);

    socket.on('play', function () {
        client.handlePlayerTakeAction(ACTION.PLAY);
    });

    socket.on('shuffle', client.handlePlayerShuffle);

    socket.on('cut', client.handlePlayerCut);

    socket.on('deal', function () {
        client.handlePlayerTakeAction(ACTION.DEAL);
    });

    socket.on('chooseHand', client.handleChooseHand);

    socket.on('goPrever', function () {
        client.handlePrever(true);
    });

    socket.on('noPrever', function () {
        client.handlePrever(false);
    });

    socket.on('goTalon', function () {
        client.handleTalon(true);
    });

    socket.on('noTalon', function () {
        client.handleTalon(false);
    });

    socket.on('discard', client.handleDiscard);

    socket.on('goBida or Uni', function () {
        client.handleBidaUni(true);
    });

    socket.on('noBida or Uni', function () {
        client.handleBidaUni(false);
    });

    socket.on('moneyCards', function () {
        client.handlePlayerTakeAction(ACTION.MONEY_CARDS);
    });

    socket.on('choosePartner', client.handlePartnerCard);

    socket.on('goPrever Talon', function () {
        client.handlePreverTalon(true);
    });

    socket.on('noPrever Talon', function () {
        client.handlePreverTalon(false);
    });

    socket.on('goValat', function () {
        client.handleValat(true);
    });

    socket.on('noValat', function () {
        client.handleValat(false);
    });

    socket.on('goContra', function () {
        client.handleContra(true);
    });

    socket.on('noContra', function () {
        client.handleContra(false);
    });

    socket.on('goIOTE', function () {
        client.handleIOTE(true);
    });

    socket.on('noIOTE', function () {
        client.handleIOTE(false);
    });

    socket.on('lead', client.handlePlayCard);

    socket.on('winTrick', function () {
        client.handlePlayerTakeAction(ACTION.WIN_TRICK);
    });

    socket.on('countPoints', function () {
        client.handlePlayerTakeAction(ACTION.COUNT_POINTS);
    });

    socket.on('resetBoard', function () {
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
    socket.on('login', client.handleLogin);

    socket.on('logout', function() {
        if (players[socketId]) {
            players[socketId].username = 'Guest';
            players[socketId].token = -1;
            players[socketId].userInfo = null;
            socket.emit('logout');
            SERVER.log('Player ' + socketId + ' has signed out');
        }
    });
    socket.on('saveSettings', client.handleLogout);

    //Admin tools
    socket.on('restartServer', client.restartServer);
    socket.on('reloadClients', client.reloadClients);
    socket.on('printPlayerList', client.printPlayerList);
    socket.on('printRoomList', client.printRoomList);
    socket.on('adminMessage', client.adminMessage);
    socket.on('adminSignIn', function(username) {
        //debug function
        if (DEBUG_MODE && players[socketId]) {
            players[socketId].username = username;
            players[socketId].userInfo = {admin:true,elo:2000};
            socket.emit('loginSuccess', username);
            socket.emit('admin',true);
        }
    });
    socket.on('removeRoom', client.removeRoom);
    socket.on('broadcastMessage', (name, message) => {client.sendChat(message)});
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