const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spade',1: 'Club',2: 'Heart',3: 'Diamond',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
const cutTypes = ['Cut','1','2','3','4','6','12 Straight','12','345'];
let ticker;
let players;
let deck;
let socket;
let availableRooms={};
let drawnRooms=[];
let connectingToRoom = false;
let inGame = false;
let chipCount = 100;
let playerNumber = -1;
let hostNumber = -1;
let currentAction;
let baseDeck = [];
for (let s=0;s<4;s++)
    for (let v=0;v<8;v++)
        baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
for (let v=0;v<22;v++)
    baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});

/**loader */
$(document).ready(function() {

    onLoad();
    setTimeout(function(){
        $('body').addClass('loaded');
        var element = document.getElementById("navbar");
        element.classList.add("fixed-top");
    }, 3000);
 
});

/**load button */
function loadButton() {

    $('body').addClass('loaded');
    var element = document.getElementById("navbar");
    element.classList.add("fixed-top");
};

/** @PARAM ELEMENT (not an ID) */
function createCardBack(appendedTo) {
    if (document.getElementById(appendedTo.id + 'CardBack')) {console.error('CardBack already exists at ' + appendedTo.id + 'CardBack');return;}
    let cardBack = document.createElement('img');
    cardBack.src = '/assets/default-deck/card-back.png';
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

function enter() {if (this.style.filter == '') {this.classList.add('image-hover-highlight');this.title='Click to choose';} else {this.title='You cannot choose this card.';}}
function exit() {this.classList.remove('image-hover-highlight');}
function clickCard() {if (this.style.filter == '') {discardThis(this.suit,this.value);this.hidden=true;}}
function discardThis(cardSuit,cardValue) {
    addMessage('Discarding the ' + cardValue + ' of ' + cardSuit);
   socket.emit('discard',{'suit':cardSuit,'value':cardValue});
}

function drawHand(withGray) {
    let divHand = document.getElementById('hand');
    let divDeck = document.getElementById('deck');
    let returnToDeck = divHand.children;
    for (let i=returnToDeck.length-1; i>=0; i--) {
        let child = returnToDeck[i];
        if (!isInHand(child)) {child.hidden = true;divDeck.appendChild(child);}
    }
    for (let i in hand) {
        let card = document.getElementById(hand[i].value + hand[i].suit);
        card.suit = hand[i].suit;
        card.value = hand[i].value;
        if (withGray) {
            if (hand[i].grayed) {
                addMessage('You cannot play the ' + hand[i].value + ' of ' + hand[i].suit);
                card.style.filter = 'grayscale(1)';
            } else {
                card.style.filter = '';
            }
            card.removeEventListener('mouseenter',enter);//don't want to double-up on events
            card.removeEventListener('mouseleave',exit);
            card.removeEventListener('click',clickCard);
            card.addEventListener('mouseenter', enter);
            card.addEventListener('mouseleave', exit);
            card.addEventListener('click',clickCard);
        } else {
            card.style.filter = '';
            card.removeEventListener('mouseenter',enter);
            card.removeEventListener('mouseleave',exit);
            card.removeEventListener('click',clickCard);
            card.title = '';
        }
        divHand.appendChild(card);
        card.hidden = false;
    }
}

function emptyHand() {
    let divHand = document.getElementById('hand');
    let divDeck = document.getElementById('deck');
    let returnToDeck = divHand.children;
    for (let i=returnToDeck.length-1; i>=0; i--) {
        let child = returnToDeck[i];
        child.hidden = true;
        divDeck.appendChild(child);
    }
}

function showAllCards() {
    let divDeck = document.getElementById('deck');
    let toShow = divDeck.children;
    for (let i in toShow) {
        toShow[i].hidden = false;
    }
}//Debug function
let refreshing;
function refresh() {
    if (!refreshing) {
        refreshing = true;
        drawnRooms = {};
        socket.emit('getRooms');
        addMessage('Refreshing...');
    }
}

function hostRoom() {
    let tools = document.getElementById('host');
    let startGame = document.createElement('button');
    startGame.innerHTML = 'Start Game';
    startGame.addEventListener('click',function(){removeHostTools();addMessage('Starting...');socket.emit('startGame');});
    let settings = document.createElement('p');
    settings.innerHTML = 'Settings (coming soon...)';
    tools.appendChild(startGame);
    tools.appendChild(settings);
}

function removeHostTools() {
    document.getElementById('host').hidden = true;
}

function cut() {
    let div = document.getElementById('center');
    for (let i in cutTypes) {
        let cutButton = document.createElement('button');
        cutButton.innerHTML = i;
        cutButton.id = 'cutB' + i;
        cutButton.addEventListener('click', function(){
            socket.emit('cut',this.innerHTML);
            hasCut();
            addMessage('You have cut the deck.');
        });
    }
}
function hasCut() {
    let div = document.getElementById('center');
    for (let i in div.children) {
        if (i.id.substring(0,4) == 'cutB') {
            div.removeChild(i);
        }
    }
}

function onLoad() {
    generateDeck();

    if (!localStorage.getItem('tarokyInstance')) {
        do {
            localStorage.setItem('tarokyInstance',Math.random()*1000000000000000000);
        } while (localStorage.getItem('tarokyInstance') == 0);
    }

    socket = io({auth: {token: localStorage.getItem('tarokyInstance')}});

    socket.on('returnRooms', function(returnRooms) {
        addMessage('refreshed');
        availableRooms = returnRooms;
        refreshing = false;
        if (!inGame && !checkRoomsEquality(availableRooms,drawnRooms)) {
            drawnRooms = [];
            document.getElementById('rooms').innerHTML = '';
            for (let i in availableRooms) {
                createRoomCard('rooms',availableRooms[i],i);
                drawnRooms.push(availableRooms[i]);
            }
        }
        if (connectingToRoom) {
            addMessage('loading...');//ADD LOADING ANIMATION
        }
    });
    socket.on('returnPlayers', function(returnPlayers) {
        players = returnPlayers;
    });
    socket.on('returnHand', function(returnHand,withGray) {
        hand = returnHand;
        if (hand.length > 0) {
            let handString = '';
            for (let i in hand) {handString += hand[i].value + ' of ' + hand[i].suit + ', ';}
            addMessage('Your hand is: ' + handString.substring(0,handString.length - 2));
        }
        drawHand(withGray);
    });
    socket.on('returnDeck', function(returnDeck) {
        deck = returnDeck;
    });
    socket.on('returnChips', function(returnChips) {
        chipCount = returnChips;
        addMessage('You have ' + chipCount + ' chips');
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
    socket.on('broadcast', function(theBroadcast) {
        alert(theBroadcast);
    });
    socket.on('startingGame', function(hostPN, pN) {
        hostNumber = hostPN;
        playerNumber = pN;
        addMessage('Game Beginning.')
        addMessage('You are player ' + (pN+1));
    });
    socket.on('nextAction', function(action) {
        currentAction = action;
        if (action.player == playerNumber) {
            switch (action.action) {
                case 'shuffle':
                    addMessage('You are shuffling.');
                    createCardBack(document.getElementById('center'));
                    document.getElementById('centerCardBack').addEventListener('mouseenter',function() {
                        addMessage('Shuffling...');
                    });
                    document.getElementById('centerCardBack').addEventListener('mousemove',function() {
                        //Shuffle the cards
                        socket.emit('shuffle',Math.floor(Math.random()*3)+1,true);
                    });
                    document.getElementById('centerCardBack').addEventListener('mouseleave',function() {
                        let toRemove = document.getElementById('centerCardBack');
                        document.getElementById('center').removeChild(toRemove);
                        addMessage('Shuffled!');
                        socket.emit('shuffle',0,false);
                    });
                    break;
                case 'cut':
                    cut();
                    break;
                case 'deal':
                    addMessage('You are dealing');
                    socket.emit('deal');
                    break;
                case 'prever':
                    addMessage('Would you like to go prever?');
                    const goPrever = document.createElement('button');
                    const noPrever = document.createElement('button');
                    goPrever.type = 'button';
                    noPrever.type = 'button';
                    goPrever.innerHTML = 'Go Prever';
                    noPrever.innerHTML = 'Pass Prever';
                    goPrever.id = 'goPrever';
                    noPrever.id = 'noPrever';
                    goPrever.addEventListener('click', ()=>{addMessage('You are going prever!');    socket.emit('goPrever');document.getElementById('center').removeChild(document.getElementById('goPrever'));document.getElementById('center').removeChild(document.getElementById('noPrever'));});
                    noPrever.addEventListener('click', ()=>{addMessage('You are not going prever'); socket.emit('noPrever');document.getElementById('center').removeChild(document.getElementById('goPrever'));document.getElementById('center').removeChild(document.getElementById('noPrever'));});
                    document.getElementById('center').appendChild(goPrever);
                    document.getElementById('center').appendChild(noPrever);
                    break;
                case 'drawTalon':
                    addMessage('You are drawing cards from the talon.');
                    socket.emit('drawTalon');
                    break;
                case 'discard':
                    addMessage('You are discarding. Choose a card to discard.');
                    break;
                case 'moneyCards':
                    addMessage('You are calling money cards');
                    socket.emit('moneyCards');
                    break;
                case 'moneyCardCallback':
                    let calledSomething = false;
                    for (let i in action.info) {
                        addMessage('Player ' + action.whoCalled + ' is calling ' + action.info[i]);
                        calledSomething = true;
                    }
                    if (!calledSomething) {
                        addMessage('Player ' + action.whoCalled + ' is calling nothing');
                    }
                    break;
                default:
                    addMessage('Unknown action: ' + JSON.stringify(action));
            }
        } else {
            addMessage('Player ' + action.player + ' is performing the action ' + action.action);
        }
    });
    socket.on('failedDiscard',function(toDiscard) {
        addError('Failed to discard the ' + toDiscard.value + ' of ' + toDiscard.suit);
    });
}

function buttonClick() {
    if (!connectingToRoom) {
        connectingToRoom=true;socket.emit('roomConnect',this.roomID);addMessage('Connecting to room ' + (this.roomID) + '...');
    } else {addError('Already connecting to a room!');}
}

function createRoomCard(elementId, simplifiedRoom, roomId) {
    const bDiv = document.createElement('div');
    bDiv.classList.add('roomCard');
    if (simplifiedRoom.count > 3) {
        bDiv.backgroundColor = 'rgba(255,200,200,0.5)';
    } else {
        bDiv.backgroundColor = 'rgba(200,255,200,0.5)';
    }
    bDiv.id = 'roomCard' + roomId;
    const roomCardText = document.createElement('p');
    bDiv.appendChild(roomCardText);
    roomCardText.innerHTML = roomId + ' | ' + simplifiedRoom.count + '/4';
    document.getElementById('rooms').appendChild(bDiv);
    appendButton('roomCard' + roomId,roomId);
}

function appendButton(elementId, theRoomID){
    //const bDiv = document.createElement('div');
	const button = document.createElement('button');
    button.type = 'button';
	button.innerHTML = 'Room ' + (theRoomID);
    button.class = 'roomSelector';
    button.roomID = theRoomID;
    button.addEventListener('click', buttonClick);
	document.getElementById(elementId).appendChild(button);
    //bDiv.appendChild(button);
}

function ping() {socket.emit('currentAction');}//Debug function

function checkRoomsEquality(a,b) {if (Object.keys(a).length != Object.keys(b).length) {return false;} for (let i in a) {if (a[i].count != b[i].count) {return false;}}return true;}

