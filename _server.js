const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

//Standard file-serving
const server = http.createServer((req, res) => {
    let q = url.parse(req.url, true);
    let filename = '.' + q.pathname;

    if (filename=='.') {
        filename = './index.html';//Default to index.html
    }
    if (filename.lastIndexOf('/') >= filename.length - 1) {
        filename += 'index.html';//Only a directory? Default to index.html of that directory
    }
    if (filename.lastIndexOf('.') < filename.lastIndexOf('/')) {
        filename += '.html';//No file ending? Default to .html
    }

    let ext = path.parse(filename).ext;
    // maps file extension to MIME type
    let MIME_TYPE = {
        '.ico': 'image/png',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword'
    };

    fs.readFile(filename, function(err, data) {
      if (err || filename.indexOf('_') != -1) {
        res.writeHead(404, {'Content-Type': 'text/html'});
        return res.end("404 Not Found");
      } 
      res.writeHead(200, {'Content-Type': MIME_TYPE[ext] || 'text/plain'});
      res.write(data);
      return res.end();
    });
});

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

console.log("Listening on port 8080 (Accessible at http://localhost:8080/ )");


//SOCKETS
const io = require('socket.io')(server);
const SOCKET_LIST = {};
const players = {};
const rooms = {};
const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spades',1: 'Clubs',2: 'Hearts',3: 'Diamonds',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
let simplifiedRooms = [];
let ticking = false;
let baseDeck = [];
for (let s=0;s<4;s++)
    for (let v=0;v<8;v++)
        baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
for (let v=0;v<22;v++)
    baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});
function Player(type) {this.type = type;this.socket = -1;this.pid = -1;this.chips = 100;this.discard = [];this.hand = [];}
function Board() {this.talon=[];this.table=[];this.preverTalon=[];this.nextStep={player:0,action:'start',time:Date.now()};this.cutStyle='';}
function shuffleDeck(deck,shuffleType) {
    //TODO: Create actual shuffling functions
    let tempDeck=[...deck];
    switch (shuffleType) {
        case 1: /*cut*/     return tempDeck;
        case 2: /*riffle*/  return tempDeck;
        case 3: /*randomize*/return tempDeck;
        default: return [...tempDeck];
    }
}
//SEE Card Locations in codeNotes
//SEE Action Flow in codeNotes

// @PARAM nextAction, room NOT ROOMID
function autoAction(action,room,pn) {
    //This function will complete ANY action that a player is otherwise expected to complete
    //When called, this function will complete the action regardless of whether a player should be tasked with completing it
    //This is useful for player TIMEOUT, or when a player takes too long to complete an action
    //This will also be used when less than 4 players are seated at a table, or when a player leaves after the game has begun
    //Note: the game will NEVER continue after all 4 players have left. There will always be at least 1 human player seated at the table.

}

function robotAction(action,room,pn) {
    //Takes the action automatically IF and only IF the robot is supposed to
    if (action.player == pn) {

    }
}
function playerAction(action,room,pn) {
    //Prompts the player to take an action IF and only IF the player is supposed to
    //Works closely with action callbacks
}

function aiAction(action,room,pn) {
    //Uses the AI to take an action IF and only IF the AI is supposed to
}
function actionCallback(action,room,pn) {
    //This callback will transfer from one action to the next and inform the humans of the action to be taken
    //In the case that a robot or AI is the required player, this will directly call on the above action handlers
    //The action is presumed to be verified by it's player takeAction function, not here
    switch (action.action) {
        case 'start':
            console.log('Game is starting in room ' + room.name);
            action.action = 'shuffle';
            action.player = pn;//PN does not change because the same person starts and shuffles
            players[room['players'][pn].socket].socket.emit('shuffle');
            //TODO: Robot and AI interactions
            for (let i=0; i<4; i++) {
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    players[room['players'][i].socket].socket.emit('startingGame',room.host,i);//Inform the players of game beginning. Host is assumed to be shuffler.
                }
            }
            break;
    }
    action.time = Date.now();
    for (let i=0; i<4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            players[room['players'][i].socket].socket.emit('nextAction',action);
        }
    }
}

function broadcast(message) {
    for (let i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('broadcast',message);
    }
}//Debug function

io.sockets.on('connection', function(socket) {
    let socketId = Math.random()*1000000000000000000;
    console.log('Player joined with socketID ' + socketId);
    SOCKET_LIST[socketId] = socket;

    players[socketId] = {'id':socketId,'pid':-1,'room':-1,'pn':-1,'socket':socket};

    socket.on('instanceCheck', function(playerID) {
        if (players[socketId]) {
            let allowed = true;
            for (let i in players) {
                if (players[i].pid == playerID) {socket.disconnect();allowed = false;}}
            if (allowed) {players[socketId].pid = playerID;}
        } else {socket.emit('recheckInstance');}
    });

    socket.on('disconnect', function() {
        if (~players[socketId].room) {
            rooms[players[socketId].room]['players'][players[socketId].pn].type = PLAYER_TYPE.ROBOT;
            rooms[players[socketId].room]['players'][players[socketId].pn].socket = -1;
            rooms[players[socketId].room]['players'][players[socketId].pn].pid = -1;
            rooms[players[socketId].room]['playerCount'] = rooms[players[socketId].room]['playerCount'] - 1;
            if (rooms[players[socketId].room]['playerCount']==1 && rooms[players[socketId].room]['host'] == socketId) {
                for (let i in rooms[players[socketId].room]['players']) {
                    if (rooms[players[socketId].room]['players'][i].pn == PLAYER_TYPE.HUMAN) {
                        rooms[players[socketId].room]['host'] = rooms[players[socketId].room]['players'][i].socket;
                        players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost');break;
                    }
                }
            }
        }
        delete players[socketId];
        delete SOCKET_LIST[socketId];
    });

    socket.on('roomConnect', function(roomID) {
        let connected = false;
        if (rooms[roomID] && rooms[roomID]['playerCount'] < 4 && players[socketId].room == -1) {
            for (let i=0;i<4;i++) {
                if (rooms[roomID]['players'][i].type == PLAYER_TYPE.ROBOT) {
                    rooms[roomID]['players'][i].type = PLAYER_TYPE.HUMAN;
                    rooms[roomID]['players'][i].socket = socketId;
                    rooms[roomID]['players'][i].pid = players[socketId].pid;
                    rooms[roomID]['playerCount'] = rooms[roomID]['playerCount'] + 1;
                    socket.emit('roomConnected', roomID);
                    connected = true;
                    players[socketId]['room'] = roomID;
                    players[socketId]['pn'] = i;
                    if (rooms[roomID]['playerCount'] == 1) {
                        rooms[roomID]['host'] = socketId;
                        socket.emit('roomHost');
                        console.log('New room host in room ' + roomID);
                        if (rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
                            socket.emit('youStart');
                        } else {
                            socket.emit('nextAction',rooms[players[socketId].room]['board']['nextStep']);
                        }
                    } else {
                        socket.emit('nextAction',rooms[players[socketId].room]['board']['nextStep']);
                    }
                    break;
                }
            }
        } else {
            console.log('Invalid attempt to connect to room ' + roomID);
        }
        if (!connected) socket.emit('roomNotConnected',roomID);
    });
    socket.on('startGame',function(){
        if (rooms[players[socketId].room]['host']==socketId && rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
            //Start the game
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], players[socketId].pn);
        } else {
            console.warn('Failed attempt to start the game in room ' + players[socketId].room + ' by player ' + socketId);
            if (rooms[players[socketId].room]['host']==socketId) {
                //Player is host but game was already started
                console.warn('Player is host but game was already started. Informing host of the next step');
                socket.emit('nextAction',rooms[players[socketId].room]['board']['nextStep']);
            } else {
                console.warn('Player is not the host. The host is ' + rooms[players[socketId].room]['host']);
                console.warn('Player info: ' + JSON.stringify(rooms[players[socketId].room][players[socketId].pn]));
            }
        }
    });
    socket.on('shuffle', function(type, again) {
        //TODO: USE THE ACTION CALLBACK RATHER THAN AN ACTION-SPECIFIC INTERFACE
        if (!rooms[players[socketId].room]) {return;}
        if (rooms[players[socketId].room]['board']['nextStep'].action=='shuffle' && rooms[players[socketId].room]['board']['nextStep'].player==players[socketId]['pn']) {
            if (type > 0 && type < 4) {
                //1: cut, 2: riffle, 3: randomize
                rooms[players[socketId].room]['deck'] = shuffleDeck(rooms[players[socketId].room]['deck'],type);
            }
            if (!again) {
                rooms[players[socketId].room]['board']['nextStep'].action='cut';
                rooms[players[socketId].room]['board']['nextStep'].player=(players[socketId]['pn']+3)%4;//The player before the dealer must cut, then the dealer must deal
                rooms[players[socketId].room]['board']['nextStep'].time=Date.now();
                for (let i=0; i<4; i++) {
                    if (rooms[players[socketId].room]['players'][i].type == PLAYER_TYPE.HUMAN) {
                        players[rooms[players[socketId].room]['players'][i].socket].socket.emit('nextAction',rooms[players[socketId].room]['board']['nextStep']);
                    } else if (rooms[players[socketId].room]['players'][i].type == PLAYER_TYPE.ROBOT && rooms[players[socketId].room]['board']['nextStep'].player == i) {
                        //TODO: Robot and AI interactions
                    }

                }
            }
        } else {
            console.warn('Illegal shuffle attempt in room ' + players[socketId].room + ' by player ' + socketId);
        }
    });
    socket.on('cut', function(style) {
        //TODO: USE THE ACTION CALLBACK RATHER THAN AN ACTION-SPECIFIC INTERFACE
        if (!rooms[players[socketId].room]) {return;}
            if (rooms[players[socketId].room]['board']['nextStep'].action=='cut' && rooms[players[socketId].room]['board']['nextStep'].player==players[socketId]['pn']) {
                if (style=='Cut') rooms[players[socketId].room]['deck'] = shuffleDeck(rooms[players[socketId].room]['deck'],1);

                rooms[players[socketId].room]['board']['nextStep'].action='deal';
                rooms[players[socketId].room]['board']['nextStep'].player=(players[socketId]['pn']+1)%4;//The player after the cutter must deal
                rooms[players[socketId].room]['board']['nextStep'].time=Date.now();
                rooms[players[socketId].room]['board']['cutStyle'] = style;//For the dealer
                for (let i=0; i<4; i++) {
                    if (rooms[players[socketId].room]['players'][i].type == PLAYER_TYPE.HUMAN) {
                        players[rooms[players[socketId].room]['players'][i].socket].socket.emit('nextAction',rooms[players[socketId].room]['board']['nextStep']);
                    } else if (rooms[players[socketId].room]['players'][i].type == PLAYER_TYPE.ROBOT && rooms[players[socketId].room]['board']['nextStep'].player == i) {
                        //TODO: Robot and AI interactions
                    }
                }
            }
    });
});

function numEmptyRooms() {let emptyRoomCount = 0;for (let i in rooms) {if (rooms[i].playerCount == 0) emptyRoomCount++;}return emptyRoomCount;}

function tick() {
    if (!ticking) {
        ticking = true;
        for (let i in rooms) {
            //Operations
            if (rooms[i] && rooms[i].playerCount == 0 && rooms[i]['board']['nextStep']['action'] != 'start') {
                delete rooms[i];
                console.log('Stopped empty game in room ' + i);
            }
        }
        for(let i in players){
            if (!~players[i]['room']) {
                players[i]['socket'].emit('returnRooms',simplifiedRooms);
            }
        }
        if (Object.keys(rooms).length == 0) {
            rooms['Main'] = {'name':'Main','host':-1,'board': new Board(),'playerCount':0,'deck':[...baseDeck],'players':[new Player(PLAYER_TYPE.ROBOT),new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)]};
        } else if (numEmptyRooms() == 0) {
            rooms[Object.keys(rooms).length] = {'name':Object.keys(rooms).length,'host':-1,'board': new Board(),'playerCount':0,'deck':[...baseDeck],'players':[new Player(PLAYER_TYPE.ROBOT),new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)]};
        }
        simplifiedRooms = {};
        for (let i in rooms) {
            if (rooms[i]) simplifiedRooms[i] = {'count':rooms[i].playerCount}; else console.log('Room ' + i + ' mysteriously vanished: ' + JSON.stringify(rooms[i]));
        }
        ticking = false;
    }
}

let interval = setInterval(tick,1000/30.0);//30 FPS

//Begin listening
server.listen(8080);