const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spades',1: 'Clubs',2: 'Hearts',3: 'Diamonds',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
let ticker;
let players;
let deck;
let socket;
let availableRooms=[];
let drawnRooms=[];
let connectingToRoom = false;
let inGame = false;

window.onload = () => {
    socket = io();

    if (localStorage.getItem('tarokyInstance') == 0)
        localStorage.setItem('tarokyInstance',Math.random());

    socket.emit('instanceCheck',localStorage.getItem('tarokyInstance'));

    socket.on('recheckInstance', function() {
        socket.emit('instanceCheck',localStorage.getItem('tarokyInstance'));
    });
    socket.on('returnRooms', function(returnRooms) {
        availableRooms = returnRooms;
        if (!checkRoomsEquality(availableRooms,drawnRooms)) {
            drawnRooms = [...availableRooms];
            document.getElementById('rooms').innerHTML = '';
            for (let i=0; i<drawnRooms.length;i++) {
                appendButton('rooms',i);
            }
        }
        if (connectingToRoom) {
            console.log('loading...');//ADD LOADING ANIMATION
        }
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
        inGame = true;
        document.getElementById('rooms').innerHTML = '';
        connectingToRoom = false;
        alert('Connected to room ' + (roomConnected+1));
    });
    socket.on('roomNotConnected', function(roomNotConnected){
        alert('Failed to connect to room ' + (roomNotConnected+1));
        connectingToRoom = false;
    });
}

function buttonClick() {
    //Use element.click() to trigger for now
    if (!connectingToRoom) {
        connectingToRoom=true;socket.emit('roomConnect',this.roomNumber);alert('Connecting to room ' + (this.roomNumber+1) + '...');
    } else {console.log('Already connecting to a room!');}
}

function appendButton(elementId, roomNumb){
    const bDiv = document.createElement('div');
	const button = document.createElement('button');
    button.type = 'button';
	button.innerHTML = 'Room ' + (roomNumb+1);
    button.class = 'roomSelector';
    bDiv.roomNumber = roomNumb;
    bDiv.addEventListener('click', buttonClick);
	document.getElementById(elementId).appendChild(bDiv);
    bDiv.appendChild(button);
}

function checkRoomsEquality(a,b) {if (a.length != b.length) {return false;}for (let i=0;i<a.length;i++) {if (a[i] != b[i])return false;}return true;}