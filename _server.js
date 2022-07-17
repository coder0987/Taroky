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
    // maps file extension to MIME typere
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

console.log("Listening on port 8080");


//SOCKETS
const io = require('socket.io')(server);
const SOCKET_LIST = {};
const players = {};
const rooms = [];
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

io.sockets.on('connection', function(socket) {
    let socketId = Math.random()*100000000000000000;
    SOCKET_LIST[socketId] = socket;

    players[socketId] = {'id':socketId,'pid':-1,'room':-1,'pn':-1,'socket':socket};

    socket.on('instanceCheck', function(playerID) {
        if (players[socketId]) {
            let allowed = true;
            for (let i in players) {
                if (players[i].pid == playerID) {
                    socket.disconnect();
                    allowed = false;
                }
            }
            if (allowed) {
                players[socketId].pid = playerID;
            }
        } else {
            socket.emit('recheckInstance');
        }
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
                        players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost');
                        break;
                    }
                }
            }
        }
        delete players[socketId];
        delete SOCKET_LIST[socketId];
    });

    socket.on('roomConnect', function(roomNumber) {
        let connected = false;
        if (rooms[roomNumber] && rooms[roomNumber]['playerCount'] < 4 && players[socketId].room == -1) {
            for (let i=0;i<4;i++) {
                if (rooms[roomNumber]['players'][i].type == PLAYER_TYPE.ROBOT) {
                    rooms[roomNumber]['players'][i].type = PLAYER_TYPE.HUMAN;
                    rooms[roomNumber]['players'][i].socket = socketId;
                    rooms[roomNumber]['players'][i].pid = players[socketId].pid;
                    rooms[roomNumber]['playerCount'] = rooms[roomNumber]['playerCount'] + 1;
                    socket.emit('roomConnected', roomNumber);
                    connected = true;
                    players[socketId]['room'] = roomNumber;
                    players[socketId]['pn'] = i;
                    if (rooms[roomNumber]['playerCount'] == 1) {
                        rooms[roomNumber]['host'] = socketId;
                        socket.emit('roomHost');
                    }
                    break;
                }
            }
        }
        if (!connected) socket.emit('roomNotConnected',roomNumber);
    });
});

function numEmptyRooms() {
    let emptyRoomCount = 0;
    for (let i=0; i<rooms.length; i++) {
        if (rooms[i].playerCount == 0) emptyRoomCount++;
    }
    return emptyRoomCount;
}

function tick() {
    if (!ticking) {
        ticking = true;
        for (let i=rooms.length-1; i>0;i--) {
            //Operations
            if (rooms[i] && rooms[i].playerCount == 0) {
                rooms.splice(i,1);
            }
        }
        for(let i in players){
            if (!~players[i]['room']) {
                players[i]['socket'].emit('returnRooms',simplifiedRooms);
            }
        }
        if (rooms.length == 0 || numEmptyRooms() == 0) {
            rooms.push({'host':-1,'playerCount':0,'deck':[...baseDeck],'players':[new Player(PLAYER_TYPE.ROBOT),new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)]});
        }
        simplifiedRooms = [];
        for (let i=0; i<rooms.length; i++) {
            if (rooms[i]) simplifiedRooms.push(rooms[i].playerCount); else console.log('Room ' + i + ' mysteriously vanished: ' + JSON.stringify(rooms[i]));
        }
        ticking = false;
    }
}

let interval = setInterval(tick,1000/30.0);//30 FPS

//Begin listening
server.listen(8080);