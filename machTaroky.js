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
let baseDeck = [];
for (let s=0;s<4;s++)
    for (let v=0;v<8;v++)
        baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
for (let v=0;v<22;v++)
    baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});

function createCardBack(appendedTo) {
    let cardBack = document.createElement('img');
    cardBack.src = '/assets/images/TarokyBack.jpg';
    cardBack.id = appendedTo + 'CardBack';
    document.getElementById(appendedTo).appendChild(card);
    return cardBack;
}

function generateDeck() {
    for (let i in baseDeck) {
        let card = document.createElement('img');
        card.src = '/assets/images/TarokyBack.jpg';
        card.hidden = true;
        card.id = baseDeck[i].value + baseDeck[i].suit;
        //card.src = '/assets/images/' + card.id;
        document.getElementById('deck').appendChild(card);
    }
}

function isInHand(element) {
    if (element) {
        for (let i in hand) {
            if (element.id == hand[i].value + hand[i].suit) return true;
        }
    }
    return false;
}

function drawHand() {
    let divHand = document.getElementById('hand');
    let divDeck = document.getElementById('deck');
    let returnToDeck = divHand.children;
    for (let i=returnToDeck.length-1; i>=0; i--) {
        let child = returnToDeck[i];
        if (!isInHand(child)) {child.hidden = true;divDeck.appendChild(child);}
    }
    for (let i in hand) {
        let card = document.getElementById(hand[i].value + hand[i].suit);
        divHand.appendChild(card);
        card.hidden = false;
    }
}

function hostRoom() {
    let tools = document.getElementById('host');
    let startGame = document.createElement('button');
    startGame.innerHTML = 'Start Game';
    startGame.addEventListener('click',function(){this.hidden=true;alert('Starting...');socket.emit('startGame');});
    tools.appendChild(startGame);
}

window.onload = () => {
    generateDeck();
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
        drawHand();
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
    socket.on('roomHost', function() {
        hostRoom();
        alert('You are the room host');
    });
}

function buttonClick() {
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