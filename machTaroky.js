const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spades',1: 'Clubs',2: 'Hearts',3: 'Diamonds',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const refRes = {width: 1200, height: 1200};
const WIDTH = refRes.width;
const HEIGHT = refRes.height;
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
let ticker;
let ctx;
let players;
let deck;
let canvas;
let scale;
let origin;
let socket;
let availableRooms=[];
let drawnRooms=[];
let connectingToRoom = false;
let inGame = false;
let menuScroll;

window.onload = () => {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    menuScroll = 5;
    canvas.hidden = true;
    socket = io();

    if (localStorage.getItem('tarokyInstance') == 0)
        localStorage.setItem('tarokyInstance',Math.random());

    socket.emit('instanceCheck',localStorage.getItem('tarokyInstance'));

    socket.on('returnRooms', function(returnRooms) {
        availableRooms = returnRooms;
    });
    socket.on('returnPlayers', function(returnPlayers) {
        players = returnPlayers;
    });
    socket.on('returnHand', function(returnHand) {
        hand = returnHand;
    });
    socket.on('returnDeck', function(returnDeck) {
        deck = returnDeck;
    });
    socket.on('roomConnected', function(roomConnected) {
        let inGame = true;
        canvas.hidden = false;
        document.getElementById('rooms').innerHTML = '';
        connectingToRoom = false;
        alert('Connected to room ' + roomConnected);
    });
    socket.on('roomNotConnected', function(roomNotConnected){
        alert('Failed to connect to room ' + roomNotConnected);
        connectingToRoom = false;
    });

    ticker = setInterval(tick, 1000/30.0);//30 FPS
}

function appendButton(elementId, roomNumb){
	let button = document.createElement('button');
	button.innerHTML = "Room " + (roomNumb+1);
	document.getElementById(elementId).appendChild(button);
	button.addEventListener('click', () => joinRoom(roomNumb));
	button.onclick = () => console.log('click');
}

function joinRoom(whichRoom) {
    if (!connectingToRoom) {
        connectingToRoom=true;
        socket.emit('roomConnect',roomNumb);
        alert('Connecting to room ' + roomNumb + '...');
    } else {
        console.error('Already connecting to a room!');
    }
}

function drawBoard() {
    if (inGame) {
        //Draw board for in game
        ctx.fillStyle = 'rgb(163,123,91)';
        ctx.fillRect(0,0, WIDTH, HEIGHT);
    } else {
        //Draw menu
        if ([...availableRooms] != [...drawnRooms]) {
            drawnRooms = [...availableRooms];
            document.getElementById('rooms').innerHTML = '';
            for (let i=0; i<drawnRooms.length;i++) {
                appendButton('rooms',i);
            }
        }
        if (connectingToRoom) {

        }
    }
}

function tick() {
    scale = Math.min(canvas.width / refRes.width, canvas.height / refRes.height);
    origin = {
        x: (canvas.width - refRes.width * scale) / 2,
        y: (canvas.height - refRes.height * scale) / 2
    };
    ctx.setTransform(scale, 0, 0, scale, origin.x, origin.y);
    drawBoard();
}