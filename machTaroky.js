const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spade',1: 'Club',2: 'Heart',3: 'Diamond',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
const cutTypes = ['Cut','1','2','3','4','6','12 Straight','12','345'];
const MESSAGE_TYPE = {POVENOST: 0, MONEY_CARDS: 1, PARTNER: 2, VALAT: 3, CONTRA: 4, IOTE: 5, LEAD: 6, PLAY: 7, WINNER: 8, PREVER_TALON: 9, PAY: 10, CONNECT: 11, DISCONNECT: 12, SETTING: 13, TRUMP_DISCARD: 14};
const BUTTON_TYPE = {PREVER: 0, VALAT: 1, CONTRA: 2, IOTE: 3, BUC: 4, PREVER_TALON: 5};
const TYPE_TABLE = {0:'Prever',1:'Valat',2:'Contra',3:'IOTE',4:'Bida or Uni',5:'Prever Talon'};
const DIFFICULTY = {RUDIMENTARY: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5};
const DIFFICULTY_TABLE = {0: 'Rudimentary', 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Ruthless'};//TODO add ai
const ACTION_TABLE = {
    'start': 'Start the Game',
    'play': 'Start the Next Round',
    'shuffle': 'Shuffle the Deck',
    'cut': 'Cut the Deck',
    'deal': 'Deal',
    'prever': 'Choose to Keep or Pass Prever',
    'passPrever': 'Chose to Pass Prever',
    'callPrever': 'Chose to Call Prever',
    'drawPreverTalon': 'Choose to Keep or Pass the Prever Talon',
    'drawTalon': 'Draw Cards from the Talon',
    'discard': 'Discard Down to 12 Cards',
    'povenostBidaUniChoice': 'Decide Whether to Call Bida/Uni as Povenost',
    'moneyCards': 'Call Money Cards',
    'partner': 'Choose a Partner Card',
    'valat': 'Call or Pass Valat',
    'preverContra': 'Call or Pass Contra',
    'preverValatContra': 'Call or Pass Contra',
    'valatContra': 'Call or Pass Contra',
    'contra': 'Call or Pass Contra',
    'iote': 'Call or Pass I on the End',
    'lead': 'Lead the Trick',
    'follow': 'Play a Card',
    'winTrick': 'Collect the Cards from the Trick',
    'countPoints': 'Count Points',
    'resetBoard': 'Reset the Board'
};
const START_TIME = Date.now();
let cardBackLoaded = false;
let ticker;
let players;
let deck;
let hand;
let partners;
let socket;
let theSettings;
let availableRooms={};
let drawnRooms=[];
let connectingToRoom = false;
let inGame = false;
let chipCount = 100;
let playerNumber = -1;
let hostNumber = -1;
let currentAction;
let baseDeck = [];
let returnTableQueue = [];
let currentTable= [];
let queued = false;
let discardingOrPlaying = true;
let timeOffset = 0;
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

function generateDeck() {
    for (let i in baseDeck) {
        let card = document.createElement('img');
        card.hidden = true;
        card.id = baseDeck[i].value + baseDeck[i].suit;
        //card.addEventListener('error', function() {this.src = '/assets/images/TarokyBack.jpg'});//Default to the Card Back in case of error
        card.src = '/assets/mach-deck-thumb/' + baseDeck[i].suit.toLowerCase() + '-' + baseDeck[i].value.toLowerCase() + '-t.png';
        card.alt = baseDeck[i].value + ' of ' + baseDeck[i].suit;
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
function clickCard() {
    if (this.style.filter == '') {
        discardThis(this.suit,this.value);
        this.removeEventListener('mouseenter',enter);
        this.removeEventListener('mouseleave',exit);
        this.removeEventListener('click',clickCard);
        this.classList.remove('image-hover-highlight');
        this.hidden=true;
    }
}
function discardThis(cardSuit,cardValue) {
    if (discardingOrPlaying) {
       addMessage('Discarding the ' + cardValue + ' of ' + cardSuit);
       socket.emit('discard',{'suit':cardSuit,'value':cardValue});
    } else {
        addMessage('Playing the ' + cardValue + ' of ' + cardSuit);
        socket.emit('lead',{'suit':cardSuit,'value':cardValue});
    }
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
        card.classList.remove('col-3');//If claimed from prever-talon
        if (withGray) {
            if (hand[i].grayed) {
                //addMessage('You cannot play the ' + hand[i].value + ' of ' + hand[i].suit);
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
            card.classList.remove('image-hover-highlight');
        }
        divHand.appendChild(card);
        card.hidden = false;
    }
}

let tableDrawnTime = Date.now();//ms since START_TIME
function drawTable() {
    if (!returnTableQueue[0] || Date.now() - tableDrawnTime < 3000) {
        //Wait min 3s before redrawing the table
        return;
    }
    tableDrawnTime = Date.now();
    table = returnTableQueue.splice(0,1)[0];
    if (table == [] || table == {} || !table[0]) {
        //hide the table
        document.getElementById('table').setAttribute('hidden','hidden');
    } else {
        //Table layout: [{'card':data,'pn':num,'lead':boolean},{'card'...}]
        //Table layout for prever talon: [{'suit':SUIT,'value':VALUE},{'suit'...}]
        //table[0].card vs table[0]
        let divTable = document.getElementById('table');
        let divDeck = document.getElementById('deck');
        let returnToDeck = divTable.children;
        for (let i=returnToDeck.length-1; i>=0; i--) {
            let child = returnToDeck[i];
            if (child.nodeName == 'IMG') {
                //Prever talon
                child.classList.remove('col-3');
                child.hidden = true;
                divDeck.appendChild(child);
            } else {
                for (let j in child.children) {
                    if (child.children[j] && child.children[j].nodeName == 'IMG') {
                        //It's a card
                        child.children[j].setAttribute('hidden','hidden');
                        divDeck.appendChild(child.children[j]);
                    }
                    if (child.children[j] && child.children[j].nodeName == 'P') {
                        //"Player N" or "Trick Leader"
                        child.children[j].setAttribute('hidden','hidden');
                    }
                }
            }
        }
        document.getElementById('leader').setAttribute('hidden','hidden');
        if (table[0].suit) {
            //Prever talon
            for (let i in table) {
                let card = document.getElementById(table[i].value + table[i].suit);
                document.getElementById('table').prepend(card);
                card.classList.add('col-3');
                card.removeAttribute('hidden');
            }
        } else {
            for (let i in table) {
                let card = document.getElementById(table[i].card.value + table[i].card.suit);
                document.getElementById('p' + (+table[i].pn+1)).appendChild(card);
                document.getElementById('p' + (+table[i].pn+1)).firstChild.removeAttribute('hidden');
                if (table[i].lead) {
                    document.getElementById('p' + (+table[i].pn+1)).appendChild(document.getElementById('leader'));
                    document.getElementById('leader').removeAttribute('hidden');
                }
                card.removeAttribute('hidden');
            }
        }
        document.getElementById('table').removeAttribute('hidden');
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

function startActionTimer() {
    if (!currentAction || isNaN(currentAction.time) || !currentAction.time || !theSettings || isNaN(theSettings.timeout) || theSettings.timeout <= 0) {
        stopActionTimer();
        return;
    }
    let theTimer = document.getElementById('timer');
    let actionTime = currentAction.time;
    let currentTime = Date.now() - timeOffset;
    let actionTimeOut = actionTime + theSettings.timeout;
    let timeLeft = actionTimeOut - currentTime;
    if (timeLeft < 0) {
        stopActionTimer;
    } else {
        if (timeLeft > theSettings.timeout) {
            //Timer is off
            socket.emit('requestTimeSync');
            timeLeft = theSettings.timeout;
        }
        let timeLeftSeconds = timeLeft / 1000;
        theTimer.innerHTML = Math.round(timeLeftSeconds);
        theTimer.hidden = false;

    }
}
function stopActionTimer() {
    document.getElementById('timer').hidden = 'hidden';
}

let refreshing;
function refresh() {
    if (!refreshing) {
        refreshing = true;
        drawnRooms = {};
        socket.emit('getRooms');
    }
}

function submitSettings(type) {
    addMessage(type + ' setting submitted');
    switch (type) {
        case 'difficulty':
            socket.emit('settings',type,document.getElementById('difficultySelector').value);
            break;
        case 'timeout':
            socket.emit('settings',type,document.getElementById('timeoutButton').value*1000);
            break;
        case 'lock':
            socket.emit('settings',type,true);
            document.getElementById('lockButton').setAttribute('hidden','hidden');
            document.getElementById('lockButtonP').setAttribute('hidden','hidden');
            break;
        default:
            addError('Unknown setting: ' + type);
    }
}

function createSettings(tools) {
    let settings = document.createElement('div');
    settings.id = 'settings';

    let difficultySelectorP = document.createElement('span');
    difficultySelectorP.innerHTML = 'Select the difficulty:\t';
    difficultySelectorP.style='display:inline-block; width: 175px';
    settings.appendChild(difficultySelectorP);

    let difficultySelector = document.createElement('select');
    difficultySelector.id ='difficultySelector';
    difficultySelector.name = 'Select Difficulty:';
    for (let i in DIFFICULTY_TABLE) {
        let difficultySelectOption = document.createElement('option');
        difficultySelectOption.selected = false;
        difficultySelectOption.value = i;
        difficultySelectOption.id = DIFFICULTY_TABLE[i];
        if (i==2) {
            difficultySelectOption.selected = 'selected';
        }
        difficultySelectOption.innerHTML = DIFFICULTY_TABLE[i];
        difficultySelector.appendChild(difficultySelectOption);
    }
    difficultySelector.setAttribute('onchange', 'submitSettings("difficulty")');
    settings.appendChild(difficultySelector);
    settings.appendChild(document.createElement('br'));

    //Create numerical input for timeout (in s, must convert to ms)

    let timeoutSelectorP = document.createElement('span');
    timeoutSelectorP.innerHTML = 'Timeout (in seconds):\t';
    timeoutSelectorP.style='display:inline-block; width: 175px';
    settings.appendChild(timeoutSelectorP);

    let timeoutButton = document.createElement('input');
    timeoutButton.setAttribute('type', 'number');
    timeoutButton.defaultValue = 30;
    timeoutButton.min = -1;//-1 or 0 mean no timeout
    timeoutButton.id = 'timeoutButton';
    timeoutButton.setAttribute('onchange', 'submitSettings("timeout")');
    settings.appendChild(timeoutButton);
    settings.appendChild(document.createElement('br'));

    //Create lock button
    let lockSelectorP = document.createElement('span');
    lockSelectorP.innerHTML = 'Prevent Joining:\t';
    lockSelectorP.style='display:inline-block; width: 175px';
    lockSelectorP.id = 'lockButtonP';//For hiding when button is clicked
    settings.appendChild(lockSelectorP);

    let lockButton = document.createElement('button');
    lockButton.innerHTML = 'Lock Room';
    lockButton.id = 'lockButton';
    lockButton.addEventListener('click', function(){
        submitSettings("lock");
    });
    settings.appendChild(lockButton);
    settings.appendChild(document.createElement('br'));
    settings.appendChild(document.createElement('br'));

    tools.appendChild(settings);
}

function debugTools() {
    //TODO: add debug tools
}

let roomHosted = false;
function hostRoom() {
    document.getElementById('host').hidden = false;
    if (roomHosted) {
        document.getElementById('lockButton').removeAttribute('hidden');
        document.getElementById('lockButtonP').removeAttribute('hidden');
        document.getElementById('timeoutButton').value = 30;
        document.getElementById(DIFFICULTY_TABLE[2]).setAttribute('selected','selected');
        return;
    }
    roomHosted = true;
    let tools = document.getElementById('host');
    let startGame = document.createElement('button');
    startGame.innerHTML = 'Start Game';
    startGame.addEventListener('click',function(){removeHostTools();addMessage('Starting...');socket.emit('startGame');});
    createSettings(tools);
    tools.appendChild(startGame);
}

function removeHostTools() {
    document.getElementById('host').hidden = true;
}

function cut() {
    let div = document.getElementById('center');
    div.removeAttribute('hidden');
    for (let i in cutTypes) {
        console.log('Cut type: ' + cutTypes[i]);
        let cutButton = document.createElement('button');
        cutButton.innerHTML = cutTypes[i];
        cutButton.id = 'cutB' + cutTypes[i];
        cutButton.addEventListener('click', function(){
            if (this.innerHTML == 'Cut') {
                //TODO: prompt user for cut location and return that with this
                //Must be 7 < cut location < 47 (7 from either end)
                socket.emit('cut',this.innerHTML,30);
            } else {
                socket.emit('cut',this.innerHTML);
            }
            hasCut();
            addMessage('You have cut the deck.');
        });
        cutButton.removeAttribute('hidden');
        div.appendChild(cutButton);
    }
}
function hasCut() {
    let div = document.getElementById('center');
    for (let i=div.children.length-1; i>=0; i--) {
        if (div.children[i].id.substring(0,4) == 'cutB') {
            div.removeChild(document.getElementById(div.children[i].id));
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

    socket.on('reload', function() {
       addMessage('Reloading...');
       window.location.reload();
    });

    socket.on('returnRooms', function(returnRooms) {
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
    socket.on('returnPlayerCount', function(playerCount) {
        document.getElementById('online').innerHTML = playerCount;
    });
    socket.on('returnHand', function(returnHand,withGray) {
        hand = returnHand;
        drawHand(withGray);
    });
    socket.on('returnTable', function(returnTable) {
        returnTableQueue.push(returnTable);
    });
    socket.on('returnDeck', function(returnDeck) {
        deck = returnDeck;
    });
    socket.on('returnChips', function(returnChips) {
        chipCount = returnChips;
        addMessage('You have ' + chipCount + ' chips');
    });
    socket.on('returnPossiblePartners', function(possiblePartners) {
        partnersReturned(possiblePartners);
    });
    socket.on('returnSettings', function(returnSettings) {
        theSettings = returnSettings;
        addBoldMessage('Playing on difficulty ' + DIFFICULTY_TABLE[returnSettings.difficulty] + ' with timeout ' + (returnSettings.timeout/1000));
    });
    socket.on('returnPN', function(returnPN, returnHostPN) {
        hostNumber = returnHostPN;
        playerNumber = returnPN;
        addMessage('You are player ' + (+returnPN+1));
    });
    socket.on('returnRoundInfo', function(theRoundInfo) {
        if (!theRoundInfo) {return;}
        //{pn,povenost,prever,preverMultiplier,valat,contra,iote,moneyCards,partnerCard}
        //null if not existent yet
        let roundInfoElement = document.getElementById('roundInfo');
        roundInfoElement.textContent = '';
        const possibleInfo = {'pn':'You are player ', 'povenost':'Povenost: ','prever':'Prever: ','valat':'Called Valat: ','iote':'Called I on the End: ','contra':'Contra Multiplier: ','preverMultiplier':'Prever Multiplier: ','partnerCard':'Povenost is Playing With the '};
        //MoneyCards are handled separately
        for (let i in possibleInfo) {
            if (theRoundInfo[i] && (i != 'contra' || theRoundInfo[i] != 1) && (i != 'preverMultiplier' || theRoundInfo[i] != 1)) {
                let theInfo = document.createElement('p');
                theInfo.innerHTML = possibleInfo[i] + (isNaN(+theRoundInfo[i]) ? theRoundInfo[i] : +theRoundInfo[i]);
                theInfo.classList.add('col');
                roundInfoElement.appendChild(theInfo);
            }
        }
        if (theRoundInfo.moneyCards) {
            for (let i in theRoundInfo.moneyCards) {
                if (theRoundInfo.moneyCards[i].length > 0) {
                    let theInfo = document.createElement('p');
                    theInfo.innerHTML = 'Player ' + (+i+1) + ' called ';
                    for (let j in theRoundInfo.moneyCards[i]) {
                        theInfo.innerHTML += theRoundInfo.moneyCards[i][j] + ' ';
                    }
                    theInfo.classList.add('col');
                    roundInfoElement.appendChild(theInfo);
                }
            }
        }
    });
    socket.on('timeSync', function(theTime) {
        timeOffset = Date.now() - theTime;
    });
    socket.on('roomConnected', function(roomConnected) {
        inGame = true;
        document.getElementById('rooms').innerHTML = '';
        connectingToRoom = false;
        addMessage('Connected to room ' + (roomConnected));
        let exitRoom = document.getElementById('refresh');
        exitRoom.innerHTML = 'Leave the Room';
        exitRoom.setAttribute('onclick','exitCurrentRoom()');
    });
    socket.on('roomNotConnected', function(roomNotConnected){
        addMessage('Failed to connect to room ' + (roomNotConnected));
        connectingToRoom = false;
        refresh();
        //toggleAvailability(true);
    });
    socket.on('debugRoomJoin', function() {
        addBoldMessage('WARNING: You have joined a debug room. This room is not meant for regular players.\nIf you did not mean to join a debug room, click "Leave the Room" then "Are You Sure?"');
        debugTools();
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
    socket.on('gameMessage', function(theMessage,theMessageType,extraInfo) {
        switch (theMessageType) {
            case MESSAGE_TYPE.POVENOST:
                if (extraInfo && extraInfo.pn == playerNumber) {
                    addBoldMessage('You are povenost');
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.PARTNER:
                addBoldMessage(theMessage);
                break;
            case MESSAGE_TYPE.TRUMP_DISCARD:
                returnTableQueue.push(extraInfo.card);
                if (extraInfo && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.MONEY_CARDS:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.VALAT:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.IOTE:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.CONTRA:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.LEAD:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.PLAY:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                break;
            case MESSAGE_TYPE.WINNER:
                if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                    addBoldMessage(extraInfo.youMessage);
                } else {
                    addBoldMessage(theMessage);
                }
                currentTable = [];
                break;
            case MESSAGE_TYPE.PREVER_TALON:
                switch (extraInfo.step) {
                    case 0:
                        //You are prever
                        addBoldMessage('Would you like to keep these cards?');
                        returnTableQueue.push(extraInfo.cards);
                        break;
                    case 1:
                    case 2:
                        if (theMessage == '') {
                            //Contains the new set of cards
                            addBoldMessage('Would you like to keep these cards?');
                            returnTableQueue.push(extraInfo.cards);
                        } else {
                            //Informing everyone of rejection
                            if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                                addBoldMessage(extraInfo.youMessage);
                                if (extraInfo.step==2) {
                                    returnTableQueue.push([]);//Clear the cards from the center
                                }
                            } else {
                                addBoldMessage(theMessage);
                                returnTableQueue.push(extraInfo.cards);
                            }
                        }
                        break;
                    case 3:
                        //Just to inform the players
                        if (extraInfo && extraInfo.youMessage && extraInfo.pn == playerNumber) {
                            addBoldMessage(extraInfo.youMessage);
                        } else {
                            addBoldMessage(theMessage);
                        }
                }
                break;
            case MESSAGE_TYPE.PAY:
                if (extraInfo) {
                    addMessage('------------------------')
                    for (let i=extraInfo.length-1; i>=0; i--) {
                        addMessage(extraInfo[i].name + ': ' + extraInfo[i].value);
                    }
                    addMessage('Point Counting:')
                    addMessage('------------------------')
                }
                addBoldMessage(theMessage);
                break;
            case MESSAGE_TYPE.CONNECT:
                addBoldMessage(theMessage);
                break;
            case MESSAGE_TYPE.DISCONNECT:
                addBoldMessage(theMessage);
                break;
            case MESSAGE_TYPE.SETTING:
                addBoldMessage(theMessage);
                break;
            default:
                addMessage('Game message of unknown type: ' + theMessageType);
                addBoldMessage(theMessage);
        }
    });
    socket.on('autoAction', function(theAction) {
        addBoldMessage('Your play timed out and was automatically completed for you');
        document.getElementById('center').innerHTML = '';//Clear buttons and whatnot from the center
        if (+document.getElementById('timer').innerHTML > 2) {
            //Timer is more than 2 seconds off
            socket.emit('requestTimeSync');
        }
    });
    socket.on('broadcast', function(theBroadcast) {
        alert(theBroadcast);
    });
    socket.on('startingGame', function(hostPN, pN, gameNumber, returnSettings) {
        hostNumber = hostPN;
        playerNumber = pN;
        theSettings = returnSettings;
        addMessage('Game ' + gameNumber + ' Beginning.')
        addMessage('You are player ' + (+pN+1));
        addBoldMessage('Playing on difficulty ' + DIFFICULTY_TABLE[returnSettings.difficulty] + ' with timeout ' + (returnSettings.timeout/1000) + 's');
    });
    socket.on('nextAction', function(action) {
        clearButtons();
        if (!inGame) {
            return; //For when the player leaves the game
        }
        currentAction = action;
        startActionTimer();
        if (theSettings && theSettings.timeout && document.getElementById('timer').innerHTML < (theSettings.timeout/1000)-0.5) {
            //Timer is off by more than 0.5s
            socket.emit('requestTimeSync');
        }
        document.getElementById('currentAction').innerHTML = ACTION_TABLE[action.action];
        if (action.player == playerNumber) {
            document.getElementById('currentPlayer').innerHTML = 'Your Move';
            switch (action.action) {
                case 'start':
                    hostRoom();
                    break;
                case 'play':
                    addMessage('A new game is beginning');
                    socket.emit('play');
                    break;
                case 'shuffle':
                    addMessage('You are shuffling.');
                    if (cardBackLoaded) {
                        document.getElementById('center').appendChild(document.getElementById('cardBack'));
                        document.getElementById('cardBack').hidden = false;
                    } else {
                        addMessage('The image has not loaded yet')
                        document.getElementById('cardBack').addEventListener('load',function() {
                            document.getElementById('center').appendChild(document.getElementById('cardBack'));
                            document.getElementById('cardBack').hidden = false;
                        });
                    }

                    document.getElementById('cardBack').addEventListener('mouseenter',function() {
                        addMessage('Shuffling...');
                    });
                    document.getElementById('cardBack').addEventListener('mousemove',function() {
                        //Shuffle the cards
                        socket.emit('shuffle',Math.floor(Math.random()*3)+1,true);
                    });
                    document.getElementById('cardBack').addEventListener('mouseleave',function() {
                        this.hidden = true;
                        let deck = document.getElementById('deck');
                        deck.appendChild(this);
                        addMessage('Shuffled!');
                        socket.emit('shuffle',0,false);
                    });
                    break;
                case 'cut':
                    cut();
                    addMessage('You are cutting the deck');
                    break;
                case 'deal':
                    addMessage('You are dealing');
                    socket.emit('deal');
                    break;
                case 'prever':
                    addBoldMessage('Would you like to go prever?');
                    createChoiceButtons(BUTTON_TYPE.PREVER);
                    break;
                case 'passPrever':
                case 'callPrever':
                    break;//For auto-reconnect
                case 'drawPreverTalon':
                    addMessage('You are drawing cards from the talon.');
                    createChoiceButtons(BUTTON_TYPE.PREVER_TALON);
                    break;
                case 'drawTalon':
                    addMessage('You are drawing cards from the talon.');
                    socket.emit('drawTalon');
                    break;
                case 'discard':
                    discardingOrPlaying = true;
                    addMessage('You are discarding. Choose a card to discard.');
                    drawHand(true);
                    break;
                case 'povenostBidaUniChoice':
                    addBoldMessage('Would you like to call Bida/Uni?');
                    createChoiceButtons(BUTTON_TYPE.BUC);
                    break;
                case 'moneyCards':
                    returnTableQueue.push([]);
                    drawTable();//To clear prever talon from the center
                    addMessage('You are calling money cards');
                    socket.emit('moneyCards');
                    break;
                case 'partner':
                    partnersReturned(action.info.possiblePartners);
                    addBoldMessage('Who would you like to play with?');
                    createPartnerButtons(partners);
                    break;
                case 'valat':
                    addBoldMessage('Would you like to call valat?');
                    createChoiceButtons(BUTTON_TYPE.VALAT);
                    break;
                case 'preverContra':
                case 'preverValatContra':
                case 'valatContra':
                case 'contra':
                    addBoldMessage('Would you like to call contra?');
                    createChoiceButtons(BUTTON_TYPE.CONTRA);
                    break;
                case 'iote':
                    addBoldMessage('Would you like to call I on the end?');
                    createChoiceButtons(BUTTON_TYPE.IOTE);
                    break;
                case 'lead':
                    addBoldMessage('You are leading the trick');
                    discardingOrPlaying = false;
                    drawHand(true);
                    break;
                case 'follow':
                    addBoldMessage('You are playing a card');
                    discardingOrPlaying = false;
                    drawHand(true);
                    break;
                case 'winTrick':
                    socket.emit('winTrick');
                    break;
                case 'countPoints':
                    addMessage('You are counting points');
                    socket.emit('countPoints');
                    break;
                case 'resetBoard':
                    addMessage('You are resetting the board');
                    resetBoardButton();
                    break;
                default:
                    addMessage('Unknown action: ' + JSON.stringify(action));
            }
        } else {
            document.getElementById('currentPlayer').innerHTML = 'Player ' + (action.player+1);
            if (action.action == 'lead' || action.action == 'follow' || action.action == 'winTrick') {
                return;//No need. Handled by room.informPlayers
            }
            addMessage('Player ' + (action.player + 1) + ' is performing the action ' + action.action);
        }
    });
    socket.on('failedDiscard',function(toDiscard) {
        addError('Failed to discard the ' + toDiscard.value + ' of ' + toDiscard.suit);
    });
    socket.on('failedPlayCard', function() {
        addError('Failed to play the card');
    });
    socket.on('disconnect', function() {
        addError('Socket Disconnected! Attempting auto-reconnect...');
        window.location.reload();
    })
    refresh();
    setInterval(tick, 200);
}

function tick() {
    startActionTimer();
    drawTable();
    if (inGame) {
        alive();//DEBUG todo fix this for real, see GitHub issue
    }
}

function romanize(num) {
    //Code copied from https://stackoverflow.com/questions/9083037/convert-a-number-into-a-roman-numeral-in-javascript
    if (isNaN(num))
        return num;
    if (num==4) {return 'IIII';}//Taroky cards have IIII instead of IV
    var digits = String(+num).split(""),
        key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
               "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
               "","I","II","III","IV","V","VI","VII","VIII","IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}

function buttonClick() {
    if (!connectingToRoom) {
        this.firstChild.innerHTML = '⟳';
        connectingToRoom=true;socket.emit('roomConnect',this.roomID);addMessage('Connecting to room ' + (this.roomID) + '...');
    } else {addError('Already connecting to a room!');}
}

function createRoomCard(elementId, simplifiedRoom, roomId) {
    const bDiv = document.createElement('div');
    bDiv.classList.add('roomcard');
    bDiv.classList.add('col-md-3');
    bDiv.classList.add('col-xs-6');
    bDiv.classList.add('white');
    bDiv.id = 'roomCard' + roomId;
    const numberDiv = document.createElement('div');
    numberDiv.classList.add('roomnum');
    numberDiv.classList.add('d-flex');
    numberDiv.classList.add('justify-content-center');
    numberDiv.innerHTML = romanize(roomId);
    numberDiv.id = 'roomNum' + roomId;
    bDiv.appendChild(numberDiv);
    const playerCountSpan = document.createElement('span');
    playerCountSpan.alt = simplifiedRoom.count + ' player' + (simplifiedRoom.count == 1 ? '' : 's');
    for (let i=0; i<4; i++) {
        if (i<simplifiedRoom.count) {
            playerCountSpan.innerHTML += '&#x25CF; ';
        } else {
            playerCountSpan.innerHTML += '&#x25CB; ';
        }
    }
    bDiv.appendChild(playerCountSpan);
    //Make it clickable
    bDiv.roomID = roomId;
    bDiv.addEventListener('click', buttonClick);
    document.getElementById('rooms').appendChild(bDiv);
}

function ping() {socket.emit('currentAction');}//Debug function

function checkRoomsEquality(a,b) {if (Object.keys(a).length != Object.keys(b).length) {return false;} for (let i in a) {if (!b[i] || (a[i].count != b[i].count)) {return false;}}return true;}

function createPartnerButtons(possiblePartners) {
    for (let i in possiblePartners) {
        const button = document.createElement('button')
        button.type = 'button';
        button.innerHTML = possiblePartners[i].value;
        button.id = possiblePartners[i].value;
        button.addEventListener('click', () => {
            partnerButtonsOnClickListenerTasks(possiblePartners[i].value, possiblePartners);
        });
        document.getElementById('center').appendChild(button);
    }
}

function partnerButtonsOnClickListenerTasks(cardValue, possiblePartners) {
    addMessage('You are playing with ' + cardValue);
    socket.emit('choosePartner', cardValue);
    for (let i in possiblePartners) {
        document.getElementById('center').removeChild(document.getElementById(possiblePartners[i].value));
    }
}

function partnersReturned(possiblePartners) {
    //TODO: displays XVII when it really means XVIII, but XIX works fine. More testing needs to be done to determine the cause
    partners = possiblePartners
    if (partners.length > 1) {
        let partnerString = '';
        for (let i in partners) { partnerString += partners[i].value + ', '; }
        addMessage('You can partner with your choice of the ' + partnerString.substring(0, partnerString.length - 2));
    } else if (partners.length==1) {
        addMessage('You are partnering with the ' + partners[0].value)
    }
}

function createChoiceButtons(buttonType) {
    const firstButton  = document.createElement('button');
    const secondButton = document.createElement('button');
    firstButton.type = 'button';
    secondButton.type = 'button';
    firstButton.id = 'go'+TYPE_TABLE[buttonType];
    secondButton.id = 'no'+TYPE_TABLE[buttonType];
    firstButton.buttonType = buttonType;
    secondButton.buttonType = buttonType;
    firstButton.go = true;
    secondButton.go = false;

    switch (buttonType) {
        case BUTTON_TYPE.PREVER:
            firstButton.innerHTML = 'Go Prever';
            secondButton.innerHTML = 'Pass Prever';
            break;
        case BUTTON_TYPE.VALAT:
            firstButton.innerHTML = 'Go Valat';
            secondButton.innerHTML = 'Pass Valat';
            break;
        case BUTTON_TYPE.CONTRA:
            firstButton.innerHTML = 'Call Contra';
            secondButton.innerHTML = 'Pass Contra';
            break;
        case BUTTON_TYPE.IOTE:
            firstButton.innerHTML = 'Call I on the end';
            secondButton.innerHTML = 'Pass';
            break;
        case BUTTON_TYPE.BUC:
            firstButton.innerHTML = 'Call Bida/Uni';
            secondButton.innerHTML = 'Pass';
            break;
        case BUTTON_TYPE.PREVER_TALON:
            firstButton.innerHTML = 'Keep';
            secondButton.innerHTML = 'Pass';
            break;
        default:
            addError('Unknown button type: ' + buttonType);
    }

    firstButton.addEventListener('click', buttonChoiceCallback);
    secondButton.addEventListener('click', buttonChoiceCallback);
    document.getElementById('center').appendChild(firstButton);
    document.getElementById('center').appendChild(secondButton);
}

function buttonChoiceCallback() {
    let buttonType = this.buttonType;
    let goOrNo = this.go;
    if (goOrNo) {
        socket.emit('go'+TYPE_TABLE[buttonType]);
    } else {
        socket.emit('no'+TYPE_TABLE[buttonType]);
    }
    document.getElementById('center').removeChild(document.getElementById('go'+TYPE_TABLE[buttonType]));
    document.getElementById('center').removeChild(document.getElementById('no'+TYPE_TABLE[buttonType]));
}

function resetBoardButton() {
    let theButton = document.createElement('button');
    theButton.innerHTML = 'Reset Board';
    theButton.id = 'resetBoard';
    theButton.type = 'button';
    theButton.addEventListener('click', () => {
        document.getElementById('center').removeChild(document.getElementById('resetBoard'));
        socket.emit('resetBoard');
    });
    document.getElementById('center').appendChild(theButton);
}

function clearButtons() {
    let center = document.getElementById('center');
    for (let i=center.children.length-1; i>=0; i--) {
        if (center.children[i] && center.children[i].nodeName == 'BUTTON') {
            center.removeChild(center.children[i])
        }
    }
}

function alive() {
    socket.emit('alive', (callback) => {
        if (!callback) {
            alert('The Socket has Disconnected. Reload page to attempt recovery');
            window.location.reload();
        }
    });
}

let exitTimeout;
function exitCurrentRoom(value) {
    if (!value) {
        document.getElementById('refresh').innerHTML = 'Are you sure?';
        document.getElementById('refresh').setAttribute('onclick','exitCurrentRoom(true)');
        exitTimeout = setTimeout(() => {
            document.getElementById('refresh').innerHTML = 'Leave the Room';
            document.getElementById('refresh').setAttribute('onclick','exitCurrentRoom()');
        }, 10000);
    } else {
        clearTimeout(exitTimeout);
        socket.emit('exitRoom');
        hand = [];
        drawHand();
        returnTableQueue = [[]];
        drawTable();
        document.getElementById('refresh').innerHTML = '&#10227; Refresh Rooms';
        document.getElementById('refresh').setAttribute('onclick','refresh()');
        theSettings={};
        availableRooms={};
        drawnRooms=[];
        drawnRooms=[];
        connectingToRoom = false;
        inGame = false;
        chipCount = 100;
        playerNumber = -1;
        hostNumber = -1;
        currentAction = null;
        discardingOrPlaying = true;
        removeHostTools();
        document.getElementById('cardBack').setAttribute('hidden','hidden');
        document.getElementById('deck').appendChild(document.getElementById('cardBack'));
        stopActionTimer();
        document.getElementById('center').innerHTML = '';//clears choice buttons
        document.getElementById('currentAction').innerHTML = '';
        document.getElementById('currentPlayer').innerHTML = '';
        clearChat();
        document.getElementById('roundInfo').textContent = '';
    }
}