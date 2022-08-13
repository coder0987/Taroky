const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spade',1: 'Club',2: 'Heart',3: 'Diamond',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
let ticker;
let players;
let deck;
let socket;
let availableRooms={};
let drawnRooms=[];
let connectingToRoom = false;
let inGame = false;
let playerNumber = -1;
let hostNumber = -1;
let baseDeck = [];
for (let s=0;s<4;s++)
    for (let v=0;v<8;v++)
        baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
for (let v=0;v<22;v++)
    baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});

/** @PARAM ELEMENT (not an ID) */
function createCardBack(appendedTo) {
    if (document.getElementById(appendedTo.id + 'CardBack')) {console.error('CardBack already exists at ' + appendedTo.id + 'CardBack');return;}
    let cardBack = document.createElement('img');
    cardBack.src = '/assets/images/TarokyBack.jpg';
    cardBack.id = appendedTo.id + 'CardBack';
    appendedTo.appendChild(cardBack);
    return cardBack;
}

function generateDeck() {
    for (let i in baseDeck) {
        let card = document.createElement('img');
        card.hidden = true;
        card.id = baseDeck[i].value + baseDeck[i].suit;
        card.addEventListener('error', function() {this.src = '/assets/images/TarokyBack.jpg'});//Default to the Card Back in case of error
        card.src = '/assets/default-deck/' + baseDeck[i].suit.toLowerCase() + '-' + baseDeck[i].value.toLowerCase() + '.png';
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

function showAllCards() {
    let divDeck = document.getElementById('deck');
    let toShow = divDeck.children;
    for (let i in toShow) {
        toShow[i].hidden = false;
    }
}//Debug function

function hostRoom() {
    let tools = document.getElementById('host');
    let startGame = document.createElement('button');
    startGame.innerHTML = 'Start Game';
    startGame.addEventListener('click',function(){this.hidden=true;addMessage('Starting...');socket.emit('startGame');});
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
            drawnRooms = {...availableRooms};
            document.getElementById('rooms').innerHTML = '';
            for (let i in drawnRooms) {
                appendButton('rooms',i);
            }
        }
        if (connectingToRoom) {
            addMessage('loading...');//ADD LOADING ANIMATION
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
        addMessage('Connected to room ' + (roomConnected));
    });
    socket.on('roomNotConnected', function(roomNotConnected){
        addMessage('Failed to connect to room ' + (roomNotConnected));
        connectingToRoom = false;
    });
    socket.on('roomHost', function() {
        addMessage('You are the room host');
    });
    socket.on('youStart', function() {
        hostRoom();
    });
    socket.on('chatMessage', function(thePlayer,theMessage) {
        playerSentMessage(thePlayer,theMessage);
    });
    socket.on('message', function(theMessage) {
        addMessage(theMessage);
    });
    socket.on('startingGame', function(hostPN, pN) {
        hostNumber = hostPN;
        playerNumber = pN;
        addMessage('Game Beginning.')
        addMessage('You are player ' + (pN+1));
    });
    socket.on('nextAction', function(action) {
        addMessage('Next action: ' + JSON.stringify(action));
    });
    socket.on('shuffle', function() {
        addMessage('You are shuffling.');
        createCardBack(document.getElementById('center'));
        document.getElementById('centerCardBack').addEventListener('mouseenter',function() {
            addMessage('Shuffling...');
        });
        document.getElementById('centerCardBack').addEventListener('mousemove',function() {
            //Shuffle the cards
            addMessage('.');
            socket.emit('shuffle',Math.floor(Math.random()*3)+1,true);
        });
        document.getElementById('centerCardBack').addEventListener('mouseleave',function() {
            let toRemove = document.getElementById('centerCardBack');
            document.getElementById('center').removeChild(toRemove);
            addMessage('Shuffled!');
            socket.emit('shuffle',0,false);
        });
    });
}

function buttonClick() {
    if (!connectingToRoom) {
        connectingToRoom=true;socket.emit('roomConnect',this.roomID);addMessage('Connecting to room ' + (this.roomID) + '...');
    } else {addError('Already connecting to a room!');}
}

function appendButton(elementId, theRoomID){
    const bDiv = document.createElement('div');
	const button = document.createElement('button');
    button.type = 'button';
	button.innerHTML = 'Room ' + (theRoomID);
    button.class = 'roomSelector';
    bDiv.roomID = theRoomID;
    bDiv.addEventListener('click', buttonClick);
	document.getElementById(elementId).appendChild(bDiv);
    bDiv.appendChild(button);
}

function checkRoomsEquality(a,b) {if (Object.keys(a).length != Object.keys(b).length) {return false;} for (let i in a) {if (a[i].count != b[i].count) {return false;}}return true;}

