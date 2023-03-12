const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spade',1: 'Club',2: 'Heart',3: 'Diamond',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
const cutTypes = ['Cut','1','2','3','4','6','12 Straight','12','345'];
const MESSAGE_TYPE = {POVENOST: 0, MONEY_CARDS: 1, PARTNER: 2, VALAT: 3, CONTRA: 4, IOTE: 5, LEAD: 6, PLAY: 7, WINNER: 8};
const BUTTON_TYPE = {PREVER: 0, VALAT: 1, CONTRA: 2, IOTE: 3};
const TYPE_TABLE = {0:'Prever',1:'Valat',2:'Contra',3:'IOTE'};
const DIFFICULTY = {RUDIMENTARY: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5};
const DIFFICULTY_TABLE = {0: 'Rudimentary', 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Ruthless'};//TODO add ai
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
let discardingOrPlaying = true;
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
    //Load the card back as well (to decrease load times)
    let tempCardBack = document.createElement('img');
    tempCardBack.hidden = true;
    tempCardBack.src = '/assets/default-deck/card-back.png';
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
        }
        divHand.appendChild(card);
        card.hidden = false;
    }
}

function drawTable() {
    let divTable = document.getElementById('center');
    let divDeck = document.getElementById('deck');
    let returnToDeck = divTable.children;
    for (let i=returnToDeck.length-1; i>=0; i--) {
        let child = returnToDeck[i];
        child.hidden = true;
        divDeck.appendChild(child);
    }
    for (let i in table) {
        let card = document.getElementById(table[i].value + table[i].suit);
        card.suit = table[i].suit;
        card.value = table[i].value;
        divTable.appendChild(card);
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

function startActionTimer() {
    if (!currentAction || !currentAction.time) {
        return;
    }
    let theTimer = document.getElementById('timer');
    let actionTime = currentAction.time;
    let currentTime = Date.now();
    let actionTimeOut = actionTime + theSettings.timeout;
    let timeLeft = actionTimeOut - currentTime;
    if (timeLeft < 0) {
        stopActionTimer;
    } else {
        let timeLeftSeconds = timeLeft / 1000;
        theTimer.innerHTML = Math.round(timeLeftSeconds);
        theTimer.hidden = false;
    }
}
function stopActionTimer() {
    document.getElementById('timer').hidden = true;
}

let refreshing;
function refresh() {
    if (!refreshing) {
        refreshing = true;
        drawnRooms = {};
        socket.emit('getRooms');
        addMessage('Refreshing...');
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
        default:
            addError('Unknown setting: ' + type);
    }
}

function createSettings(tools) {
    let settings = document.createElement('div');
    settings.id = 'settings';

    let difficultySelector = document.createElement('select');
    difficultySelector.id ='difficultySelector';
    difficultySelector.name = 'Select Difficulty:';
    for (let i in DIFFICULTY_TABLE) {
        let difficultySelectOption = document.createElement('option');
        difficultySelectOption.selected = false;
        difficultySelectOption.value = i;
        difficultySelectOption.id = DIFFICULTY_TABLE[i];
        difficultySelectOption.innerHTML = DIFFICULTY_TABLE[i];
        difficultySelector.appendChild(difficultySelectOption);
    }
    difficultySelector.setAttribute('onchange', 'submitSettings("difficulty")');
    settings.appendChild(difficultySelector);

    //Create numerical input for timeout (in s, must convert to ms)
    let timeoutButton = document.createElement('input');
    timeoutButton.setAttribute('type', 'number');
    timeoutButton.defaultValue = 30;
    timeoutButton.min = -1;//-1 or 0 mean no timeout
    timeoutButton.id = 'timeoutButton';
    timeoutButton.setAttribute('onchange', 'submitSettings("timeout")');
    settings.appendChild(timeoutButton);

    tools.appendChild(settings);
}

let roomHosted = false;
function hostRoom() {
    document.getElementById('host').hidden = false;
    if (roomHosted) {
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

    socket.on('reload', function() {
       addMessage('Reloading...');
       window.location.reload();
    });

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
    socket.on('returnTable', function(returnTable) {
        table = returnTable;
        drawTable();
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
        addBoldMessage('Playing on difficulty ' + DIFFICULTY_TABLE[returnSettings.difficulty] + ' with timeout ' + returnSettings.timeout);
    });
    socket.on('returnPN', function(returnPN, returnHostPN) {
        hostNumber = returnHostPN;
        playerNumber = returnPN;
        addMessage('You are player ' + (returnPN+1));
    });
    socket.on('roomConnected', function(roomConnected) {
        inGame = true;
        document.getElementById('rooms').innerHTML = '';
        connectingToRoom = false;
        addMessage('Connected to room ' + (roomConnected));
        document.getElementById('refresh').hidden = true;
    });
    socket.on('roomNotConnected', function(roomNotConnected){
        addMessage('Failed to connect to room ' + (roomNotConnected));
        connectingToRoom = false;
        refresh();
        //toggleAvailability(true);
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
            case MESSAGE_TYPE.MONEY_CARDS:
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
                break;
            default:
                addMessage('Game message of unknown type: ' + theMessageType);
                addBoldMessage(theMessage);
        }
    });
    socket.on('autoAction', function(theAction) {
        addBoldMessage('Your play timed out and was automatically completed for you');
        document.getElementById('center').innerHTML = '';//Clear buttons and whatnot from the center
    });
    socket.on('broadcast', function(theBroadcast) {
        alert(theBroadcast);
    });
    socket.on('startingGame', function(hostPN, pN, gameNumber, returnSettings) {
        hostNumber = hostPN;
        playerNumber = pN;
        theSettings = returnSettings;
        addMessage('Game ' + gameNumber + ' Beginning.')
        addMessage('You are player ' + (pN+1));
        addBoldMessage('Playing on difficulty ' + DIFFICULTY_TABLE[returnSettings.difficulty] + ' with timeout ' + returnSettings.timeout);
    });
    socket.on('nextAction', function(action) {
        currentAction = action;
        startActionTimer();
        if (action.player == playerNumber) {
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
                    addBoldMessage('Would you like to go prever?');
                    createChoiceButtons(BUTTON_TYPE.PREVER);
                    break;
                case 'passPrever':
                case 'callPrever':
                    break;//For auto-reconnect
                case 'drawTalon':
                    addMessage('You are drawing cards from the talon.');
                    socket.emit('drawTalon');
                    break;
                case 'discard':
                    discardingOrPlaying = true;
                    addMessage('You are discarding. Choose a card to discard.');
                    drawHand(true);
                    break;
                case 'moneyCards':
                    addMessage('You are calling money cards');
                    socket.emit('moneyCards');
                    break;
                case 'partner':
                    //TODO: Completely breaks the game whenever there is more than one option. Not sure why
                    partnersReturned(action.info.possiblePartners);
                    addBoldMessage('Who would you like to play with?');
                    createPartnerButtons(partners);
                    break;
                case 'valat':
                    addBoldMessage('Would you like to call valat?');
                    createChoiceButtons(BUTTON_TYPE.VALAT);
                    break;
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
                case 'countPoints':
                    //TODO
                    break;
                case 'resetBoard':
                    //TODO
                    break;
                default:
                    addMessage('Unknown action: ' + JSON.stringify(action));
            }
        } else {
            addMessage('Player ' + (action.player + 1) + ' is performing the action ' + action.action);
        }
    });
    socket.on('failedDiscard',function(toDiscard) {
        addError('Failed to discard the ' + toDiscard.value + ' of ' + toDiscard.suit);
    });
    socket.on('failedPlayCard', function() {
        addError('Failed to play the card');
    });
    refresh();
    setInterval(() => {startActionTimer();}, 200);
}

/* For later
function toggleAvailability(boolean) {
    let tempRoomList = document.getElementById('rooms').getChildren()
    for (let i in tempRoomList) {
        if (boolean) {
            tempRoomList[i].classList.add('available');
        } else {
            tempRoomList[i].classList.remove('available');
        }
    }
}
*/
function romanize(num) {
    //Code copied from https://stackoverflow.com/questions/9083037/convert-a-number-into-a-roman-numeral-in-javascript
    if (isNaN(num))
        return num;
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
    //toggleAvailability(false);
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
    //bDiv.classList.add('available');
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
    partners = possiblePartners
    if (partners.length > 1) {
        let partnerString = '';
        for (let i in partners) { partnerString += partners[i].value + ', '; }
        addMessage('You can partner with your choice of the ' + partnerString.substring(0, handString.length - 2));
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
        addMessage('You are going ' + TYPE_TABLE[buttonType] + '!');
        socket.emit('go'+TYPE_TABLE[buttonType]);
    } else {
        addMessage('You are not going '+TYPE_TABLE[buttonType]);
        socket.emit('no'+TYPE_TABLE[buttonType]);
    }
    document.getElementById('center').removeChild(document.getElementById('go'+TYPE_TABLE[buttonType]));
    document.getElementById('center').removeChild(document.getElementById('no'+TYPE_TABLE[buttonType]));
}