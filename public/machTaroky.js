const PLAYER_TYPE = {HUMAN: 0,ROBOT: 1,AI: 2,H: 0,R: 1};
const SUIT = {0: 'Spade',1: 'Club',2: 'Heart',3: 'Diamond',4: 'Trump'};
const RED_VALUE = {0: 'Ace',1: 'Two',2: 'Three',3: 'Four',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const BLACK_VALUE = {0: 'Seven',1: 'Eight',2: 'Nine',3: 'Ten',4: 'Jack',5: 'Rider',6: 'Queen',7: 'King'};
const TRUMP_VALUE = {0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz'};
const ERR_FONT = '24px Arial';
const INFO_FONT = '24px Arial';
const cutTypes = ['Cut','1','2','3','4','6','12 Straight','12','345'];
const MESSAGE_TYPE = {POVINNOST: 0, MONEY_CARDS: 1, PARTNER: 2, VALAT: 3, CONTRA: 4, IOTE: 5, LEAD: 6, PLAY: 7, WINNER: 8, PREVER_TALON: 9, PAY: 10, CONNECT: 11, DISCONNECT: 12, SETTING: 13, TRUMP_DISCARD: 14, NOTATION: 15, DRAW: 16};
const BUTTON_TYPE = {PREVER: 0, VALAT: 1, CONTRA: 2, IOTE: 3, BUC: 4, PREVER_TALON: 5, DRAW_TALON: 6};
const TYPE_TABLE = {0:'Prever',1:'Valat',2:'Contra',3:'IOTE',4:'Bida or Uni',5:'Prever Talon',6:'Talon'};
const DIFFICULTY = {RUDIMENTARY: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5};
const DIFFICULTY_TABLE = {0: 'Rudimentary', 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Ruthless', 5: 'AI'};
const ACTION_TABLE = {
    'start': 'Start the Game',
    'play': 'Start the Next Round',
    'shuffle': 'Shuffle the Deck',
    'cut': 'Cut the Deck',
    'deal': 'Deal',
    '12choice': 'Choose a hand',
    'prever': 'Choose to Keep or Pass Prever',
    'passPrever': 'Chose to Pass Prever',
    'callPrever': 'Chose to Call Prever',
    'drawPreverTalon': 'Choose to Keep or Pass the Prever Talon',
    'drawTalon': 'Draw Cards from the Talon',
    'discard': 'Discard Down to 12 Cards',
    'povinnostBidaUniChoice': 'Decide Whether to Call Bida/Uni as Povinnost',
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
const VALUE_REVERSE = {
    Ace: 0, Two: 1, Three: 2, Four: 3, Jack: 4, Rider: 5, Queen: 6, King: 7,
    Seven: 0, Eight: 1, Nine: 2, Ten: 3,
    I: 0, II: 1, III: 2, IIII: 3, V: 4, VI: 5, VII: 6, VIII: 7, IX: 8, X: 9, XI: 10, XII: 11, XIII: 12,
    XIV: 13, XV: 14, XVI: 15, XVII: 16, XVIII: 17, XIX: 18, XX: 19, XXI: 20, Skyz: 21
};
const SUIT_SORT_ORDER = {
    Spade: 0, Club: 2, Heart: 1, Diamond: 3, Trump: 4
}
const START_TIME = Date.now();
const SHOW_TOUR = true;
let inTour = false;
let cardBackLoaded = false;
let ticker;
let players;
let deck;
let hand;
let numCardsSelected;
let partners;
let handChoices;
let socket;
let theSettings;
let returnToGameAvailable = false;
let availableRooms={};
let drawnRooms=[];
let connectingToRoom = false;
let inGame = false;
let chipCount = 100;
let playerNumber = -1;
let povinnostNumber = -1;
let hostNumber = -1;
let currentAction;
let baseDeck = [];
let returnTableQueue = [];
let currentTable = [];
let drawnCards = [];
let queued = false;
let discardingOrPlaying = true;
let timeOffset = 0;
let elo;
let admin;
let defaultSettings = {'timeout':30000,'difficulty':2};
let activeUsername;
let activeUsernames = {'0':null, '1':null, '2':null, '3':null};
for (let s=0;s<4;s++)
    for (let v=0;v<8;v++)
        baseDeck.push({'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v] ,'suit':SUIT[s]});
for (let v=0;v<22;v++)
    baseDeck.push({'value':TRUMP_VALUE[v],'suit':SUIT[4]});

function moveDeckToDeck() {
    let deckDiv = document.getElementById('deck');
    for (let i in baseDeck) {
        let child = document.getElementById(baseDeck[i].value + baseDeck[i].suit );
        child.classList.remove('drew');
        child.classList.remove('col-md-1');
        child.classList.remove('col-xs-3');
        child.hidden = true;
        child.removeEventListener('mouseenter',enter);
        child.removeEventListener('mouseleave',exit);
        child.removeEventListener('click',clickCard);
        child.removeEventListener('click',discardClickListener);
        child.removeEventListener('click',swapCardsClickListener);
        child.title='';
        child.classList.remove('image-hover-highlight');
        child.classList.remove('selected');
        child.classList.remove('grayed');
        deckDiv.appendChild(child);
    }
}

/** navbar */
function includeHTML() {
    let z, i, elmnt, file, xhttp;
    /* Loop through a collection of all HTML elements: */
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
      elmnt = z[i];
      /*search for elements with a certain atrribute:*/
      file = elmnt.getAttribute("w3-include-html");
      if (file) {
        /* Make an HTTP request using the attribute value as the file name: */
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if (this.readyState == 4) {
            if (this.status == 200) {elmnt.innerHTML = this.responseText;}
            if (this.status == 404) {elmnt.innerHTML = "Page not found.";}
            /* Remove the attribute, and call this function once more: */
            elmnt.removeAttribute("w3-include-html");
            includeHTML();
            loaded();
          }
        }
        xhttp.open("GET", file, true);
        xhttp.send();
        /* Exit the function: */
        return;
      }
    }
  }

function loaded() {
    if (SHOW_TOUR && document.getElementById('tour')) {
        document.getElementById('tour').removeAttribute('hidden');
    }
}

let fullscreenMode = false;
function fullscreen() {
    fullscreenMode = !fullscreenMode;
    try {
        if (!fullscreenMode) {
            //disable fullscreen
            if (document.fullscreenElement) {
                closeFullscreen();
            }
            document.getElementById('navbar').classList.remove('hidden');
            document.getElementById('footer').classList.remove('hidden');
        } else {
            //enable fullscreen
            if (!document.fullscreenElement) {
                openFullscreen();
            }
            document.getElementById('navbar').classList.add('hidden');
            document.getElementById('footer').classList.add('hidden');
        }
    } catch (footerMightNotExist) {}
}

//Interface with officially supported functions
function openFullscreen() {
    if (document.body.requestFullscreen) {
      document.body.requestFullscreen();
    } else if (document.body.webkitRequestFullscreen) { /* Safari */
      document.body.webkitRequestFullscreen();
    } else if (document.body.msRequestFullscreen) { /* IE11 */
      document.body.msRequestFullscreen();
    }
}

/* Close fullscreen */
function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
  }
}

function keyListener(e) {
    //TODO add hotkeys
    switch (e.code) {
        case 'Escape':
            if (fullscreenMode) {
                fullscreen();
            }
            break;
    }
}

function fullscreenChangeEvent(e) {
    if (fullscreenMode) {
        //should be in fullscreen
        if (!document.fullscreenElement) {
            fullscreen();
        }
    } else {
        //shouldn't be in fullscreen
        if (document.fullscreenElement) {
            fullscreen();
        }
    }
}

    /**loader */
$(document).ready(function() {

    onLoad();
    setTimeout(function(){
        $('body').addClass('loaded');
        let element = document.getElementById("navbar");
        element.classList.add("fixed-top");
    }, 3000);
 
});

/**load button */
function loadButton() {

    $('body').addClass('loaded');
    let element = document.getElementById("navbar");
    element.classList.add("fixed-top");
};

function playerPerspective(originalPlace, viewpoint) {
    //Ex. if player 0 is povinnost and player 1 is AI, then from AI's view player 3 is povinnost
    return ((+originalPlace - +viewpoint) + 4)%4;
}

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

function numTrumpInHand() {
    let num = 0;
    for (let i in hand) {
        if (hand[i].suit == 'Trump') {
            num++;
        }
    }
    return num;
}

function enter() {if (this.style.filter == '') {this.classList.add('image-hover-highlight');this.title='Click to choose';} else {this.title='You cannot choose this card.';}}
function exit() {this.classList.remove('image-hover-highlight');this.title='';}
function clickCard() {
    if (this.style.filter == '') {
        discardThis(this.suit,this.value);
        this.removeEventListener('mouseenter',enter);
        this.removeEventListener('mouseleave',exit);
        this.removeEventListener('click',clickCard);
        this.removeEventListener('click',discardClickListener);
        this.title='';
        this.classList.remove('image-hover-highlight');
        this.hidden=true;
    }
}

function discardClickListener() {
    //If already selected, unselect
    if (this.classList.contains('selected')) {
        this.classList.remove('selected');
        numCardsSelected--;
        document.getElementById('discard_info').innerHTML = 'Select ' + (hand.length - numCardsSelected - 12) + ' more cards';
    } else if (this.style.filter == '') {
        //Not selected. If not enough cards are already selected, select this card
        if (hand.length - numCardsSelected > 12) {
            numCardsSelected++;
            if (hand.length - numCardsSelected != 12) {
                document.getElementById('discard_info').innerHTML = 'Select ' + (hand.length - numCardsSelected - 12) + ' more cards';
            } else {
                document.getElementById('discard_info').innerHTML = 'Press Confirm to discard';
            }
            this.classList.add('selected');
        }
    }
    updateDiscardGray();
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
        if (!isInHand(child)) {
            child.classList.remove('drew');
            child.classList.remove('col-md-1');
            child.classList.remove('col-xs-3');
            child.hidden = true;
            divDeck.appendChild(child);
            child.removeEventListener('mouseenter',enter);
            child.removeEventListener('mouseleave',exit);
            child.removeEventListener('click',clickCard);
            child.removeEventListener('click',discardClickListener);
            child.title='';
            child.classList.remove('image-hover-highlight');
            child.classList.remove('selected');
            child.classList.remove('grayed');
        }
    }
    numCardsSelected = 0;
    if (document.getElementById('discard_info')) {
        document.getElementById('discard_info').innerHTML = 'Select ' + (hand.length - numCardsSelected - 12) + ' more cards';
    }
    for (let i in hand) {
        let card = document.getElementById(hand[i].value + hand[i].suit);
        card.suit = hand[i].suit;
        card.value = hand[i].value;
        card.classList.add('col-md-1');
        card.classList.add('col-xs-3');
        card.classList.remove('col-2'); //If claimed from prever-talon
        if (withGray) {
            if (hand[i].grayed) {
                //addMessage('You cannot play the ' + hand[i].value + ' of ' + hand[i].suit);
                card.style.filter = 'grayscale(1)';
                card.classList.add('grayed');
            } else {
                card.style.filter = '';
                card.classList.remove('grayed');
            }
            card.classList.remove('selected');
            card.removeEventListener('mouseenter',enter);//don't want to double-up on events
            card.removeEventListener('mouseleave',exit);
            card.removeEventListener('click',clickCard);
            card.removeEventListener('click',discardClickListener);
            card.addEventListener('mouseenter', enter);
            card.addEventListener('mouseleave', exit);
            if (discardingOrPlaying) {
                card.addEventListener('click',discardClickListener);
            } else {
                card.addEventListener('click',clickCard);
            }
        } else {
            card.style.filter = '';
            card.removeEventListener('mouseenter',enter);
            card.removeEventListener('mouseleave',exit);
            card.removeEventListener('click',clickCard);
            card.removeEventListener('click',discardClickListener);
            card.classList.remove('grayed');
            card.classList.remove('selected');
            card.title = '';
            card.classList.remove('image-hover-highlight');
        }
        if (drawnCards.some(
            (theCard) => {
                return theCard.suit == hand[i].suit && theCard.value == hand[i].value;
            }
        )) {
            card.classList.add('drew');
            divHand.insertBefore(card, divHand.firstChild);
        } else {
            card.classList.remove('drew');
            divHand.appendChild(card);
        }

        card.hidden = false;
    }
}

function moveCardsToDiv(theCards, toDiv, cardClickListener) {
    for (let i in theCards) {
        let card = document.getElementById(theCards[i].value + theCards[i].suit);
        card.suit = theCards[i].suit;
        card.value = theCards[i].value;
        card.classList.add('col-md-1');
        card.classList.add('col-xs-3');
        card.classList.remove('col-2'); //If claimed from prever-talon
        card.style.filter = '';
        card.removeEventListener('mouseenter',enter);
        card.removeEventListener('mouseleave',exit);
        card.removeEventListener('click',clickCard);
        card.removeEventListener('click',discardClickListener);
        card.classList.remove('grayed');
        card.classList.remove('selected');
        card.title = '';
        card.classList.remove('image-hover-highlight');
        if (cardClickListener) {
            card.addEventListener('click', cardClickListener);
        }
        toDiv.appendChild(card);
        card.hidden = false;
    }
}

let tableDrawnTime = Date.now();//ms since START_TIME
function drawTable() {
    if (!returnTableQueue[0]) {
        //Wait min 3s before redrawing the table
        //TODO: prevent user from taking an action while the table is still being drawn
        return;
    }
    let currentNumberOfCardsOnTable = 0;
    if (!document.getElementById('table').hidden) {
        let divTable = document.getElementById('table');
        let returnToDeck = divTable.children;
        for (let i=returnToDeck.length-1; i>=0; i--) {
            for (let j in returnToDeck[i].children) {
                if (returnToDeck[i].children[j] && returnToDeck[i].children[j].nodeName == 'IMG') {
                    currentNumberOfCardsOnTable++;
                }
            }
        }
    }
    if (Date.now() - tableDrawnTime < 3000 && currentNumberOfCardsOnTable >= 4) {
        //Timeout only matters if the table is at full capacity
        console.log('full');
        return;
    } else if (Date.now() - tableDrawnTime < 1000) {
        console.log('partial');
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
                child.classList.remove('col-2');
                child.style.filter = '';
                child.removeEventListener('mouseenter',enter);
                child.removeEventListener('mouseleave',exit);
                child.removeEventListener('click',clickCard);
                child.title = '';
                child.classList.remove('image-hover-highlight');
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
                card.classList.add('col-2');
                card.style.filter = '';
                card.removeAttribute('hidden');
            }
        } else {
            for (let i in table) {
                let card = document.getElementById(table[i].card.value + table[i].card.suit);
                card.style.filter = '';
                document.getElementById('p' + (+table[i].pn+1)).appendChild(card);
                let playerName = activeUsernames[+table[i].pn] ? activeUsernames[+table[i].pn] : 'Player ' + (+table[i].pn+1);
                document.getElementById('p' + (+table[i].pn+1)).firstChild.innerHTML = playerName;
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

function displayRoundInfo(theRoundInfo) {
    if (!theRoundInfo) {return;}
    //{pn,povinnost,prever,preverMultiplier,valat,contra,iote,moneyCards,partnerCard}
    //null if not existent yet
    let roundInfoElement = document.getElementById('roundInfo');
    roundInfoElement.textContent = '';
    const possibleInfo = {'contra':'Contra Multiplier: ','preverMultiplier':'Prever Multiplier: '};
    const possiblePlayerNumbers = {'povinnost':'Povinnost','prever':'Prever','valat':'Called Valat','iote':'Called I on the End'};
    let playerDivs = [];
    for (let i=0; i<4; i++) {
        playerDivs[i] = document.createElement('div');
        playerDivs[i].classList.add('col');
        roundInfoElement.appendChild(playerDivs[i]);
        let theInfo = document.createElement('p');
        theInfo.innerHTML = 'Player ' + (+i + 1);
        if (theRoundInfo.pn - 1 == i) {theInfo.innerHTML += ' (You)';}
        playerDivs[i].appendChild(theInfo);
    }
    if (theRoundInfo.chips) {
        for (let i in theRoundInfo.chips) {
            if (theRoundInfo.chips[i]) {
                let theInfo = document.createElement('p');
                theInfo.innerHTML = theRoundInfo.chips[i];
                playerDivs[i].appendChild(theInfo);
            }
        }
    }
    if (theRoundInfo.usernames) {
        for (let i in theRoundInfo.usernames) {
            activeUsernames[i] = theRoundInfo.usernames[i];//null values are set as well
            if (theRoundInfo.usernames[i]) {
                let theInfo = document.createElement('p');
                theInfo.innerHTML = theRoundInfo.usernames[i];
                playerDivs[i].appendChild(theInfo);
            }
        }
    }
    for (let i in possibleInfo) {
        if (theRoundInfo[i] && (i != 'contra' || theRoundInfo[i] != 1) && (i != 'preverMultiplier' || theRoundInfo[i] != 1)) {
            let theInfo = document.createElement('p');
            theInfo.innerHTML = possibleInfo[i] + (isNaN(+theRoundInfo[i]) ? theRoundInfo[i] : +theRoundInfo[i]);
            theInfo.classList.add('col');
            roundInfoElement.appendChild(theInfo);
        }
    }
    for (let i in possiblePlayerNumbers) {
        if (theRoundInfo[i] && (i != 'contra' || theRoundInfo[i] != 1) && (i != 'preverMultiplier' || theRoundInfo[i] != 1)) {
            let theInfo = document.createElement('p');
            theInfo.innerHTML = possiblePlayerNumbers[i];
            playerDivs[theRoundInfo[i] - 1].appendChild(theInfo);
        }
        if (i == 'povinnost' && theRoundInfo[i] && theRoundInfo['partnerCard']) {
            let theInfo = document.createElement('p');
            theInfo.innerHTML = 'Playing with the ' + theRoundInfo['partnerCard'];
            playerDivs[theRoundInfo[i] - 1].appendChild(theInfo);
        }
    }
    if (theRoundInfo.moneyCards) {
        for (let i in theRoundInfo.moneyCards) {
            if (theRoundInfo.moneyCards[i].length > 0) {
                let theInfo = document.createElement('p');
                for (let j in theRoundInfo.moneyCards[i]) {
                    theInfo.innerHTML += theRoundInfo.moneyCards[i][j] + ' ';
                }
                theInfo.classList.add('col');
                playerDivs[i].appendChild(theInfo);
            }
        }
    }
}

function displayRoomConnected(roomConnected) {
    inGame = true;
    document.getElementById('rooms').innerHTML = '';
    connectingToRoom = false;
    addMessage('Connected to room ' + (roomConnected));
    let exitRoom = document.getElementById('refresh');
    exitRoom.innerHTML = 'Leave the Room';
    exitRoom.setAttribute('onclick','exitCurrentRoom()');
}

function displayAudienceConnected(audienceConnected) {
    inGame = true;
    document.getElementById('rooms').innerHTML = '';
    connectingToRoom = false;
    addMessage('Joined audience in room ' + (audienceConnected));
    let exitRoom = document.getElementById('refresh');
    exitRoom.innerHTML = 'Leave the Room';
    exitRoom.setAttribute('onclick','exitCurrentRoom()');
}

function displayNextAction(action) {
    clearButtons();
    if (!inGame) {
        return; //For when the player leaves the game
    }
    currentAction = action;
    if (action.action != 'start') {
        startActionTimer();
        document.getElementById('currentAction').innerHTML = ACTION_TABLE[action.action];
    }
    if (theSettings && theSettings.timeout && document.getElementById('timer').innerHTML < (theSettings.timeout/1000)-0.5) {
        //Timer is off by more than 0.5s
        socket.emit('requestTimeSync');
    }
    if (action.player == playerNumber) {
        if (action.action != 'start') {
            document.getElementById('currentPlayer').innerHTML = 'Your Move';
        }
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

                let shuffleButton;
                try {
                    shuffleButton = document.getElementById('shuffleButton');
                } catch (ignore) {}
                if (!shuffleButton) {
                    shuffleButton = document.createElement('button');
                    shuffleButton.id = 'shuffleButton';
                    shuffleButton.innerHTML = 'Shuffle';
                    shuffleButton.addEventListener('click',function() {
                        this.hidden = true;
                        let deck = document.getElementById('deck');
                        document.getElementById('cardBack').hidden = true;
                        deck.appendChild(document.getElementById('cardBack'));
                        addMessage('Shuffled!');
                        socket.emit('shuffle',0,false);
                    });
                    document.getElementById('center').appendChild(document.createElement('br'));
                    document.getElementById('center').appendChild(shuffleButton);
                } else {
                    shuffleButton.removeAttribute('hidden');
                }


                document.getElementById('cardBack').addEventListener('mouseenter',function() {
                    addMessage('Shuffling...');
                });
                document.getElementById('cardBack').addEventListener('mousemove',function() {
                    //Shuffle the cards
                    socket.emit('shuffle',Math.floor(Math.random()*3)+1,true);
                });
                document.getElementById('cardBack').addEventListener('mouseleave',function() {
                    document.getElementById('shuffleButton').hidden = true;
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
            case '12choice':
                addMessage('You are deciding which hand to keep');
                if (handChoices) {
                    createTwelvesChoiceButton(handChoices);
                }
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
            case 'passTalon':
                addMessage('You are drawing cards from the talon.');
                if (povinnostNumber != playerNumber && numTrumpInHand() <= 2) {
                    createChoiceButtons(BUTTON_TYPE.DRAW_TALON);
                } else {
                    socket.emit('goTalon');
                }
                break;
            case 'discard':
                discardingOrPlaying = true;
                createConfirmButton();
                addMessage('You are discarding. Choose a card to discard.');
                drawHand(true);
                numCardsSelected = 0;
                break;
            case 'povinnostBidaUniChoice':
                addBoldMessage('Would you like to call Bida/Uni?');
                createChoiceButtons(BUTTON_TYPE.BUC);
                break;
            case 'moneyCards':
                drawnCards = [];//Clear the drawn cards to remove the highlight
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
        let playerName = activeUsernames[action.player] ? activeUsernames[action.player] : 'Player ' + (action.player+1);
        document.getElementById('currentPlayer').innerHTML = playerName;
        if (action.action == 'lead' || action.action == 'follow' || action.action == 'winTrick') {
            return;//No need. Handled by room.informPlayers
        }
        //addMessage('Player ' + (action.player + 1) + ' is performing the action ' + action.action);
    }
}

function emptyHand() {
    let divHand = document.getElementById('hand');
    let divDeck = document.getElementById('deck');
    let returnToDeck = divHand.children;
    for (let i=returnToDeck.length-1; i>=0; i--) {
        let child = returnToDeck[i];
        child.classList.remove('col-2');
        child.style.filter = '';
        child.removeEventListener('mouseenter',enter);
        child.removeEventListener('mouseleave',exit);
        child.removeEventListener('click',clickCard);
        child.title = '';
        child.classList.remove('image-hover-highlight');
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
    if (inTour) {return;}
    if (!currentAction || currentAction == 'start' || !document.getElementById('host').hidden || isNaN(currentAction.time) || !currentAction.time || !theSettings || isNaN(theSettings.timeout) || theSettings.timeout <= 0) {
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
        case 'save':
            socket.emit('saveSettings');
            break;
        default:
            addError('Unknown setting: ' + type);
    }
}

function createSettings(tools, roomSettings) {
    let settings = document.createElement('div');
    settings.id = 'settings';

    roomSettings = roomSettings || defaultSettings;

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
        if (i==roomSettings.difficulty) {
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
    timeoutButton.defaultValue = roomSettings.timeout / 1000;
    timeoutButton.setAttribute('value',roomSettings.timeout / 1000);
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

    //Create save button only if user is signed in
    if (typeof activeUsername !== 'undefined' && activeUsername != '') {
        settings.appendChild(document.createElement('br'));
        let saveButtonP = document.createElement('span');
        saveButtonP.innerHTML = 'Save Settings:\t';
        saveButtonP.style='display:inline-block; width: 175px';
        settings.appendChild(saveButtonP);

        let saveButton = document.createElement('button');
        saveButton.innerHTML = 'Save';
        saveButton.addEventListener('click', function(){
            submitSettings("save");
        });
        settings.appendChild(saveButton);
        settings.appendChild(document.createElement('br'));
    }

    settings.appendChild(document.createElement('br'));

    tools.appendChild(settings);
}

function debugTools() {
    //TODO: add debug tools
}

let roomHosted = false;
function hostRoom(roomSettings) {
    roomSettings = roomSettings || defaultSettings;
    document.getElementById('host').hidden = false;
    if (roomHosted) {
        document.getElementById('lockButton').removeAttribute('hidden');
        document.getElementById('lockButtonP').removeAttribute('hidden');
        document.getElementById(DIFFICULTY_TABLE[roomSettings.difficulty]).setAttribute('selected','selected');
        document.getElementById('timeoutButton').setAttribute('value',roomSettings.timeout / 1000);
        document.getElementById('timeoutButton').value = roomSettings.timeout / 1000;
        return;
    }
    roomHosted = true;
    let tools = document.getElementById('host');
    let startGame = document.createElement('button');
    startGame.innerHTML = 'Start Game';
    startGame.addEventListener('click',function(){removeHostTools();addMessage('Starting...');socket.emit('startGame');});
    createSettings(tools, roomSettings);
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

window.addEventListener('message', (event) => {
    if (event.origin !== 'https://sso.smach.us' && event.origin !== 'https://sso.samts.us') {console.log(event.origin); return;}
    if (event.data != 'signOut') {
        let [username,token,signUp] = event.data.split(':');
        if (signUp == 'new') {
            startTour();
        }
        addMessage('Attempting to sign in as ' + username +'...');
        socket.emit('login',username,token);
        document.cookie = 'username=' + username + ';secure';
        document.cookie = 'token=' + token + ';secure';
    } else {
        addMessage('Signing out...');
        socket.emit('logout');
    }
}, false);

function onLoad() {
    generateDeck();
    document.addEventListener('keydown', keyListener);
    document.addEventListener("fullscreenchange", fullscreenChangeEvent);
    document.addEventListener("mozfullscreenchange", fullscreenChangeEvent);
    document.addEventListener("webkitfullscreenchange", fullscreenChangeEvent);
    document.addEventListener("msfullscreenchange", fullscreenChangeEvent);

    if (!localStorage.getItem('tarokyInstance')) {
        do {
            localStorage.setItem('tarokyInstance',Math.random()*1000000000000000000);
        } while (localStorage.getItem('tarokyInstance') == 0);
    }

    socket = io({auth: {token: localStorage.getItem('tarokyInstance')}});

    {
        //Auto sign-in using cookies
        let theUsername = getCookie('username');
        let theToken = getCookie('token');
        if (theUsername && theToken) {
            socket.emit('login',theUsername,theToken);
        }
    }

    //Create initial room cards
    drawRooms();

    socket.on('reload', function() {
       addMessage('Reloading...');
       window.location.reload();
    });

    socket.on('loginSuccess', function(username) {
        addBoldMessage('You successfully signed in as ' + username);
        activeUsername = username;
        displaySignOut(username);
    });

    socket.on('loginFail', function() {
        addBoldMessage('Authentication failure');
        displaySignIn();
        document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });

    socket.on('loginExpired', function() {
        addBoldMessage('Your login session has expired. Please sign in again.');
        activeUsername = '';
        defaultSettings = {'timeout':30000,'difficulty':2};
        delete elo;
        displaySignIn();
    });

    socket.on('logout', function() {
        addBoldMessage('Successfully logged out');
        activeUsername = '';
        defaultSettings = {'timeout':30000,'difficulty':2};
        delete elo;
        displaySignIn();
    });

    socket.on('autoReconnect', function(data) {
        /* playerCount, audienceConnected, roomConnected,
        roundInfo, pn, host, hand, withGray, settings, table,
        nextAction, povinnost, username, elo, admin, defaultSettings */
        console.log(data);
        if (typeof data.username !== 'undefined') {
            activeUsername = data.username;
            displaySignOut(data.username);
        } else {
            activeUsername = '';
        }
        if (typeof data.defaultSettings !== 'undefined') {
            defaultSettings = data.defaultSettings;
        }
        if (typeof data.playerCount !== 'undefined') {
            document.getElementById('online').innerHTML = data.playerCount;
        }
        if (typeof data.povinnost !== 'undefined') {
            povinnostNumber = data.povinnost;
        }
        if (typeof data.hand !== 'undefined') {
            hand = data.hand;
            drawHand(data.withGray);
        }
        if (typeof data.table !== 'undefined') {
            returnTableQueue.push(data.table);
        }
        if (typeof data.chips !== 'undefined') {
            chipCount = data.chips;
        }
        if (typeof data.settings !== 'undefined') {
            theSettings = data.settings;
            addBoldMessage('Playing on difficulty ' + DIFFICULTY_TABLE[data.settings.difficulty] + ' with timeout ' + (data.settings.timeout/1000));
        }
        if (typeof data.pn !== 'undefined') {
            playerNumber = data.pn;
            addMessage('You are player ' + (+data.pn+1));
        }
        if (typeof data.host !== 'undefined') {
            hostNumber = data.host;
            if (playerNumber == hostNumber && data.nextAction && data.nextAction.action == 'start') {
                hostRoom(data.settings);
            }
        }
        if (typeof data.roundInfo !== 'undefined') {
            if (data.nextAction.action != 'start') {
                displayRoundInfo(data.roundInfo);
            }
        }
        if (typeof data.roomConnected !== 'undefined') {
            displayRoomConnected(data.roomConnected);
        }
        if (typeof data.audienceConnected !== 'undefined') {
            displayAudienceConnected(data.audienceConnected)
        }
        if (typeof data.nextAction !== 'undefined' && data.nextAction.action != 'start') {
            displayNextAction(data.nextAction);
        }
        if (typeof data.elo !== 'undefined') {
            elo = data.elo;
        }
        if (data.admin) {
            admin = data.admin;
            document.getElementById('adminHandler').removeAttribute('hidden');
        }
    });

    socket.on('returnRooms', function(returnRooms) {
        availableRooms = returnRooms;
        refreshing = false;
        if (!inGame && !checkRoomsEquality(availableRooms,drawnRooms)) {
            drawRooms();
        }
        if (connectingToRoom) {
            addMessage('loading...');//ADD LOADING ANIMATION
        }
    });
    socket.on('returnToGame', function() {
        returnToGameAvailable = true;
        drawRooms();
    });
    //TODO save points and return save points
    socket.on('returnPlayers', function(returnPlayers) {
        players = returnPlayers;
    });
    socket.on('returnPovinnost', function(returnPovinnost) {
        povinnostNumber = returnPovinnost;
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
        displayRoundInfo(theRoundInfo);
    });
    socket.on('timeSync', function(theTime) {
        timeOffset = Date.now() - theTime;
    });
    socket.on('roomConnected', function(roomConnected) {
        displayRoomConnected(roomConnected);
    });
    socket.on('roomNotConnected', function(roomNotConnected){
        addMessage('Failed to connect to room ' + (roomNotConnected));
        connectingToRoom = false;
        refresh();
        //toggleAvailability(true);
    });
    socket.on('audienceConnected', function(audienceConnected) {
        displayAudienceConnected(audienceConnected);
    });
    socket.on('audienceNotConnected', function(audienceNotConnected){
        addMessage('Failed to join audience in room ' + (audienceNotConnected));
        connectingToRoom = false;
        refresh();
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
    socket.on('12choice', function(theChoices) {
        addBoldMessage('Please choose a hand to keep');
        clearButtons();
        createTwelvesChoiceButton(theChoices);
        handChoices = theChoices;
    });
    socket.on('chatMessage', function(thePlayer,theMessage) {
        playerSentMessage(thePlayer,theMessage);
    });
    socket.on('message', function(theMessage) {
        addMessage(theMessage);
    });
    socket.on('gameMessage', function(theMessage,theMessageType,extraInfo) {
        switch (theMessageType) {
            case MESSAGE_TYPE.POVINNOST:
                if (extraInfo && extraInfo.pn == playerNumber) {
                    addBoldMessage('You are povinnost');
                } else {
                    addBoldMessage(theMessage);
                }
                povinnostNumber = extraInfo.pn;
                break;
            case MESSAGE_TYPE.DRAW:
                //Player drew certain cards. These should be highlighted until after discarding
                //This message is received before the cards appear, so store the information until they arrive
                drawnCards = extraInfo.cards;
                break;
            case MESSAGE_TYPE.PARTNER:
                addBoldMessage(theMessage);
                break;
            case MESSAGE_TYPE.TRUMP_DISCARD:
                returnTableQueue.push([extraInfo.card]);
                if (extraInfo && extraInfo.pn == playerNumber && extraInfo.youMessage) {
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
            case MESSAGE_TYPE.NOTATION:
                addMessage('Game save code: ' + theMessage + ';pn=' + playerPerspective(playerNumber, extraInfo.povinnost));
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
        displayNextAction(action);
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
    });
    socket.on('gameEnded', function() {
        exitCurrentRoom(true);
    });
    socket.on('elo', function(returnElo) {
        elo = returnElo;
    });
    socket.on('admin', function(returnAdmin) {
        if (returnAdmin) {
            admin = returnAdmin;
            document.getElementById('adminHandler').removeAttribute('hidden');
        }
    });
    socket.on('defaultSettings', function(returnSettings) {
        if (defaultSettings) {
            defaultSettings = returnSettings;
            addBoldMessage('Settings loaded');
        }
    });

    socket.emit('reconnect');

    refresh();
    setInterval(tick, 200);
}

function tick() {
    startActionTimer();
    drawTable();
    if (inGame) {
        alive();
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

function joinAudience(event) {
    event.preventDefault();//Stop the right-click menu from appearing
    if (!connectingToRoom) {
        this.firstChild.innerHTML = '⟳';
        connectingToRoom=true;socket.emit('joinAudience',this.roomID);addMessage('Joining audience in room ' + (this.roomID) + '...');
    } else {addError('Already connecting to a room!');}
}

function buttonClick() {
    if (!connectingToRoom) {
        this.firstChild.innerHTML = '⟳';
        connectingToRoom=true;socket.emit('roomConnect',this.roomID);addMessage('Connecting to room ' + (this.roomID) + '...');
    } else {addError('Already connecting to a room!');}
}

function returnToGameRoomClick() {
    if (!connectingToRoom) {
        connectingToRoom=true;
        socket.emit('returnToGame');
        addMessage('Connecting...');
        returnToGameAvailable = false;
    } else {addError('Already connecting to a room!');}
}

function customRoomClick() {
    /*TODO: instead of prompt, create a "Custom Room" page
        At the top, include a text input for room codes - DONE
        Add individual player adjustments (+ make available for other players to join)
         - AI / AI Personalities / Robot on various difficulties
        Add custom room options such as face-up cards for all players & AI input on various choices
        */

    if (!connectingToRoom) {
        clearScreen();
        let theCenter = document.getElementById('center');

        //Generate notation
        let generateNotationP = document.createElement('span');
        generateNotationP.innerHTML = 'Generate a custom room code:';
        theCenter.appendChild(generateNotationP);
        theCenter.appendChild(document.createElement('br'));

        let sliderContainerDiv = document.createElement('div');
        sliderContainerDiv.classList.add('sliderContainer');

        let theSliderP = document.createElement('span');
        theSliderP.innerHTML = 'Adjust how good your hand will be:';
        theCenter.appendChild(theSliderP);

        let theSlider = document.createElement('input');
        theSlider.type = 'range';
        theSlider.min = 0;
        theSlider.max = 100;
        theSlider.value = 50;
        theSlider.classList.add('slider');
        theSlider.id = 'notationWeightSlider';
        sliderContainerDiv.appendChild(theSlider);

        theCenter.appendChild(sliderContainerDiv);
        theCenter.appendChild(document.createElement('br'));

        let generateNotationButton = document.createElement('button');
        generateNotationButton.setAttribute('type', 'button');
        generateNotationButton.id = 'generateNotationButton';
        generateNotationButton.innerHTML = 'Generate Notation';
        generateNotationButton.addEventListener('click', () => {
            document.getElementById('notationInputField').value = generateRandomNotationSequence(document.getElementById('notationWeightSlider').value / 100);
        });
        theCenter.appendChild(generateNotationButton);
        theCenter.appendChild(document.createElement('br'));

        //Notation input
        let notationInputFieldP = document.createElement('span');
        notationInputFieldP.innerHTML = 'Room Notation (Press the ⟳ symbol to edit the hand before beginning):';
        notationInputFieldP.style='display:inline-block';
        theCenter.appendChild(notationInputFieldP);
        theCenter.appendChild(document.createElement('br'));

        let notationInputField = document.createElement('input');
        notationInputField.setAttribute('type', 'text');
        notationInputField.defaultValue = '';
        notationInputField.id = 'notationInputField';
        notationInputField.style.width = '90%';
        theCenter.appendChild(notationInputField);

        let notationInputLoadIn = document.createElement('button');
        notationInputLoadIn.setAttribute('type', 'button');
        notationInputLoadIn.id = 'notationInputLoadIn';
        notationInputLoadIn.style.width = '5%';
        notationInputLoadIn.innerHTML = '⟳';
        notationInputLoadIn.addEventListener('click',loadCardsFromRoomCode);
        theCenter.appendChild(notationInputLoadIn);

        theCenter.appendChild(document.createElement('br'));

        let playerNumberAlert = document.createElement('p');
        playerNumberAlert.id = 'pna';
        playerNumberAlert.style = 'font-size:large; font-weight: bold';
        theCenter.appendChild(playerNumberAlert);
        //TODO: add a player number switcher so players can choose what number they want to be easily

        for (let i=0; i<4; i++) {
            let currentCards = document.createElement('div');
            currentCards.id = 'customHand' + i;
            let currentCardsInner = document.createElement('div');
            currentCardsInner.id = 'customHandInner' + i;
            currentCards.appendChild(currentCardsInner);
            theCenter.appendChild(currentCards);
        }
        let talonCards = document.createElement('div');
        talonCards.id = 'customTalon';
        let talonInner = document.createElement('div');
        talonInner.id = 'talonInner';
        talonCards.appendChild(talonInner);
        theCenter.appendChild(talonCards);
        theCenter.appendChild(document.createElement('br'));

        let notationSubmitButton = document.createElement('button');
        notationSubmitButton.setAttribute('type', 'button');
        notationSubmitButton.id = 'notationSubmitButton';
        notationSubmitButton.innerHTML = 'Create Room';
        notationSubmitButton.addEventListener('click', notationSubmitButtonClickEvent);
        theCenter.appendChild(notationSubmitButton);
        theCenter.appendChild(document.createElement('br'));
        notationSubmitButton.generated = false;

        let exitRoom = document.getElementById('refresh');
        exitRoom.innerHTML = 'Leave the Room';
        exitRoom.setAttribute('onclick','exitCurrentRoom()');
    }
}

let currentlySelectedCard = {hand:-1,cardElement:null};

function loadCardsFromRoomCode() {
    if (!connectingToRoom) {
        document.getElementById('notationSubmitButton').generated = true;
        let notation = document.getElementById('notationInputField').value;
        console.log(notation);
        let theNotationSplit = notation.split('/');
        let theNotationSettings = theNotationSplit[theNotationSplit.length - 1].split(';');
        let thePN = theNotationSettings[theNotationSettings.length - 1].split('=')[1];
        document.getElementById('pna').innerHTML = 'You are player ' + (+thePN + 1) + '. Player 1 is Povinnost.';
        let theHands = [];
        for (let i=0; i<4; i++) {
            let currentDiv = document.getElementById('customHand' + i)
            let playerDescription = document.createElement('p');
            playerDescription.innerHTML = 'Player ' + (i + 1);
            if (i == +thePN) {
                playerDescription.innerHTML += ' (You)';
            }
            currentDiv.appendChild(document.createElement('br'));
            currentDiv.prepend(playerDescription);
            theHands[i] = notationToCards(theNotationSplit[i+4]);
            theHands[i] = sortCards(theHands[i]);
            moveCardsToDiv(theHands[i], document.getElementById('customHandInner' + i), swapCardsClickListener);
            currentDiv.appendChild(document.createElement('br'));
        }
        let theTalonDiv = document.getElementById('customTalon');
        let talonDescription = document.createElement('p');
        talonDescription.innerHTML = 'Talon';
        theTalonDiv.appendChild(document.createElement('br'));
        theTalonDiv.prepend(talonDescription);
        let theTalon = notationToCards(theNotationSplit[8]);
        moveCardsToDiv(theTalon, document.getElementById('talonInner'), swapCardsClickListener);

    }
}

function swapCardsClickListener() {
    if (currentlySelectedCard.hand == -1) {
        currentlySelectedCard.hand = this.parentElement;
        currentlySelectedCard.cardElement = this;
        this.classList.add('selected');
    } else {
        let temp = currentlySelectedCard.cardElement.nextSibling;
        this.parentNode.insertBefore(currentlySelectedCard.cardElement, this);
        currentlySelectedCard.cardElement.classList.remove('selected');
        sortImageDiv(this.parentElement);
        currentlySelectedCard.hand.insertBefore(this, temp);//If temp is null, it will be inserted at the end
        sortImageDiv(currentlySelectedCard.hand);
        currentlySelectedCard = {hand:-1,cardElement:null};
    }
}

function u(v) {
    if (typeof v === 'undefined') {
        return true;
    }
    return false;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function generateRandomNotationSequence(goodHandWeight) {
    goodHandWeight = u(goodHandWeight) ? 0.5 : goodHandWeight;
    let notation = '100/100/100/100/';
    let workingDeck = [];
    for (let i in baseDeck) {
        workingDeck[i] = baseDeck[i];
    }
    shuffleArray(workingDeck);
    for (let i in workingDeck) {
        workingDeck[i].weight = ((VALUE_REVERSE[workingDeck[i].value] + (workingDeck[i].value == 'I' ? 15 : 0)) * (workingDeck[i].suit == 'Trump' ? 3 : 1));
    }


    workingDeck.sort((a,b) => {
        if (Math.abs(0.5 - goodHandWeight) > Math.abs(0.5 - Math.random())) {
            return goodHandWeight < 0.5 ? a.weight - b.weight: b.weight - a.weight;
        }
        return 0;
    });

    for (let i in workingDeck) {
        delete workingDeck[i].weight;
    }

    let workingPN = Math.floor(Math.random() * 4);

    let mainHandNotation = cardsToNotation(workingDeck.splice(0,12)) + '/';
    let talonNotation = cardsToNotation(workingDeck.splice(0,6)) + '/';

    shuffleArray(workingDeck);

    for (let i=0; i<4; i++) {
        if (i != workingPN) {
            notation += cardsToNotation(workingDeck.splice(0,12)) + '/';
        } else {
            notation += mainHandNotation;
        }
    }
    notation += talonNotation;

    for (let i in defaultSettings) {
        notation += i + '=' + defaultSettings[i] + ';';
    }
    notation += 'pn=' + workingPN;
    return notation;
}

function notationToCards(notatedCards) {
    try {
        let cards = [];
        const SUIT_NOTATION = {S:SUIT[0],C:SUIT[1],H:SUIT[2],D:SUIT[3],T:SUIT[4]};
        const VALUE_NOTATION = {'1':0,'2':1,'3':2,'4':3,'J':4,'R':5,'Q':6,'K':7};

        while (notatedCards.length >= 2) {
            let suit = SUIT_NOTATION[notatedCards.substring(0,1)];
            notatedCards = notatedCards.substring(1);
            if (u(suit)) {
                return false;
            }
            if (suit === SUIT[4]) {
                let value = TRUMP_VALUE[+notatedCards.substring(0,2)-1];
                notatedCards = notatedCards.substring(2);
                if (u(value)) {
                    return false;
                }
                cards.push({'value':value, 'suit': SUIT[4]});
            } else {
                let value = VALUE_NOTATION[notatedCards.substring(0,1)];
                notatedCards = notatedCards.substring(1);
                value = (suit === SUIT[0] || suit === SUIT[1]) ? BLACK_VALUE[value] : RED_VALUE[value];
                if (u(value)) {
                    return false;
                }
                cards.push({ 'value': value, 'suit': suit });
            }
        }
        return cards;
    } catch (err) {
        console.log(err);
        return false;
    }
}
function sortImageDiv(divWithImgs) {
    if (divWithImgs.id == 'talonInner') {return;}
    let theElements = divWithImgs.children;
    let cards = [];
    for (let i=0; i<theElements.length; i++) {
        cards.push({suit: theElements[i].suit, value: theElements[i].value});
    }
    cards = sortCards(cards);
    moveCardsToDiv(cards,divWithImgs);
}
function imageCollectionToNotation(divWithImgs) {
    let theElements = divWithImgs.children;
    let cards = [];
    for (let i=0; i<theElements.length; i++) {
        cards.push({suit: theElements[i].suit, value: theElements[i].value});
    }
    return cardsToNotation(cards);
}
function cardsToNotation(cards) {
    let theNotation = '';
    const SUIT_TO_NOTATION = {'Spade': 'S', 'Club': 'C', 'Heart': 'H', 'Diamond': 'D', 'Trump': 'T'};
    try {
        for (let i in cards) {
            theNotation += SUIT_TO_NOTATION[cards[i].suit];
            if (cards[i].suit == SUIT[4]) {
                //Trump
                let temp = +VALUE_REVERSE[cards[i].value] + 1;
                if (temp < 10) {
                    temp = '0' + temp;
                }
                theNotation += temp;
            } else {
                switch (cards[i].value) {
                    case 'Ace':
                    case 'Seven':
                        theNotation += '1';
                        break;
                    case 'Two':
                    case 'Eight':
                        theNotation += '2';
                        break;
                    case 'Three':
                    case 'Nine':
                        theNotation += '3';
                        break;
                    case 'Four':
                    case 'Ten':
                        theNotation += '4';
                        break;
                    default:
                        theNotation += cards[i].value.substring(0,1);
                }
            }
        }
    } catch (err) {
        console.log(err);
        return false;
    }
    return theNotation;
}

function notationSubmitButtonClickEvent() {
    if (!connectingToRoom) {
        let notation;
        if (document.getElementById('notationSubmitButton').generated) {
            //Retrieve room code from the cards in the hands and talon
            notation = document.getElementById('notationInputField').value;
            let splitNotation = notation.split('/');
            for (let i=0; i<4; i++) {
                splitNotation[i+4] = imageCollectionToNotation(document.getElementById('customHandInner' + i));
            }
            splitNotation[8] = imageCollectionToNotation(document.getElementById('talonInner'));
            notation = '';
            for (let i in splitNotation) {
                notation += '/' + splitNotation[i];
            }
            notation = notation.substring(1);
        } else {
            notation = document.getElementById('notationInputField').value;
        }
        console.log(notation);
        if (notation.length < 10) {
            return;
        }
        moveDeckToDeck();
        clearScreen();
        connectingToRoom=true;
        socket.emit('customRoom',notation);
        addMessage('Creating custom room...');
    }
}

function newRoomClick() {
    if (!connectingToRoom) {
        connectingToRoom=true;
        socket.emit('newRoom');
        addMessage('Creating new room...');
    } else {addError('Already connecting to a room!');}
}

function drawRooms() {
    drawnRooms = [];
    document.getElementById('rooms').innerHTML = '';
    createNewRoomCard();
    for (let i in availableRooms) {
        createRoomCard(availableRooms[i],i);
        drawnRooms.push(availableRooms[i]);
    }
    createCustomRoomCard();
    if (returnToGameAvailable) {
        createReturnToGameRoomCard();
    }
}

function createRoomCard(simplifiedRoom, roomId) {
    const bDiv = document.createElement('div');
    bDiv.classList.add('roomcard');
    bDiv.classList.add('col-md-3');
    bDiv.classList.add('col-xs-6');
    bDiv.classList.add('white');
    bDiv.id = 'roomCard' + roomId;
    let theTitle = '';
    for (let i in simplifiedRoom.usernames) {
        theTitle += simplifiedRoom.usernames[i] + '\n';
    }
    if (simplifiedRoom.audienceCount > 0) {
        theTitle += simplifiedRoom.audienceCount + ' Audience member' + (simplifiedRoom.audienceCount == 1 ? 's\n': '\n');
    }
    theTitle += 'Click to play\nRight click to join audience';
    bDiv.title = theTitle;
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
    if (simplifiedRoom.count > 0) {
        bDiv.addEventListener('contextmenu',joinAudience);
    }
    bDiv.addEventListener('click', buttonClick);
    document.getElementById('rooms').appendChild(bDiv);
}
function createReturnToGameRoomCard() {
    const bDiv = document.createElement('div');
    bDiv.classList.add('roomcard');
    bDiv.classList.add('col-md-3');
    bDiv.classList.add('col-xs-6');
    bDiv.classList.add('white');
    bDiv.id = 'roomCardReturnToGame';
    const numberDiv = document.createElement('div');
    numberDiv.classList.add('roomnum');
    numberDiv.classList.add('d-flex');
    numberDiv.classList.add('justify-content-center');
    numberDiv.innerHTML = 'Continue';
    numberDiv.id = 'roomNumReturnToGame';
    bDiv.appendChild(numberDiv);
    const playerCountSpan = document.createElement('span');
    for (let i=0; i<4; i++) {
        playerCountSpan.innerHTML += '&#x25CB; ';
    }
    bDiv.appendChild(playerCountSpan);
    //Make it clickable
    bDiv.addEventListener('click', returnToGameRoomClick);
    document.getElementById('rooms').appendChild(bDiv);
}


function createCustomRoomCard() {
    const bDiv = document.createElement('div');
    bDiv.classList.add('roomcard');
    bDiv.classList.add('col-md-3');
    bDiv.classList.add('col-xs-6');
    bDiv.classList.add('white');
    bDiv.id = 'roomCardCustom';
    const numberDiv = document.createElement('div');
    numberDiv.classList.add('roomnum');
    numberDiv.classList.add('d-flex');
    numberDiv.classList.add('justify-content-center');
    numberDiv.innerHTML = 'Custom';
    numberDiv.id = 'roomNumCustom';
    bDiv.appendChild(numberDiv);
    const playerCountSpan = document.createElement('span');
    for (let i=0; i<4; i++) {
        playerCountSpan.innerHTML += '&#x25CB; ';
    }
    bDiv.appendChild(playerCountSpan);
    //Make it clickable
    bDiv.addEventListener('click', customRoomClick);
    document.getElementById('rooms').appendChild(bDiv);
}

function createNewRoomCard() {
    const bDiv = document.createElement('div');
    bDiv.classList.add('roomcard');
    bDiv.classList.add('col-md-3');
    bDiv.classList.add('col-xs-6');
    bDiv.classList.add('white');
    bDiv.id = 'roomCardNew';
    const numberDiv = document.createElement('div');
    numberDiv.classList.add('roomnum');
    numberDiv.classList.add('d-flex');
    numberDiv.classList.add('justify-content-center');
    numberDiv.innerHTML = 'New';
    numberDiv.id = 'roomNumNew';
    bDiv.appendChild(numberDiv);
    const playerCountSpan = document.createElement('span');
    for (let i=0; i<4; i++) {
        playerCountSpan.innerHTML += '&#x25CB; ';
    }
    bDiv.appendChild(playerCountSpan);
    //Make it clickable
    bDiv.addEventListener('click', newRoomClick);
    document.getElementById('rooms').appendChild(bDiv);
}

function ping() {socket.emit('currentAction');}//Debug function

function checkRoomsEquality(a,b) {if (Object.keys(a).length != Object.keys(b).length) {return false;} for (let i in a) {if (!b[i] || (a[i].count != b[i].count)) {return false;}}return true;}

function createTwelvesChoiceButton(choices) {
    for (let i in choices) {
        if (typeof choices[i] !== 'undefined') {
            const button = document.createElement('button');
            button.type = 'button';
            button.innerHTML = choices[i];
            button.id = 'twelvesChoice'+choices[i];
            button.addEventListener('click', () => {
                twelvesChoiceButtonsOnClickListenerTasks(choices[i]);
            });
            document.getElementById('center').appendChild(button);
        }
    }
}

function twelvesChoiceButtonsOnClickListenerTasks(theChoice) {
    addMessage('You chose hand number ' + theChoice);
    socket.emit('chooseHand', theChoice);
    document.getElementById('center').innerHTML = '';
}

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
    partners = possiblePartners;
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
        case BUTTON_TYPE.DRAW_TALON:
            firstButton.innerHTML = 'Draw';
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

function updateDiscardGray() {
    let allowTrumps = true;
    for (let i in hand) {
        let card = document.getElementById(hand[i].value + hand[i].suit);
        if (hand[i].suit == 'Trump' || hand[i].value == 'King') {
            card.style.filter = 'grayscale(1)';
            card.classList.add('grayed');
            hand[i].grayed = true;
        } else {
            card.style.filter = '';
            card.classList.remove('grayed');
            hand[i].grayed = false;
        }
        if (!card.classList.contains('selected') && hand[i].grayed == false) {
            //This card can be selected and is not grayed out
            allowTrumps = false;
        }
    }
    if (allowTrumps) {
        for (let i in hand) {
            let card = document.getElementById(hand[i].value + hand[i].suit);
            if (hand[i].value == 'King' || hand[i].value == 'I' || hand[i].value == 'XXI' || hand[i].value == 'Skyz') {
                card.style.filter = 'grayscale(1)';
                card.classList.add('grayed');
                hand[i].grayed = true;
            } else {
                card.style.filter = '';
                card.classList.remove('grayed');
                hand[i].grayed = false;
            }
        }
    }
}

function createConfirmButton() {
    const confirmButton = document.createElement('button');
    const sortButton = document.createElement('button');
    const displayInfoSpan = document.createElement('span');
    confirmButton.type = 'button';
    displayInfoSpan.type = 'span';
    sortButton.type = 'button';
    confirmButton.id = 'confirm_discard_button';
    displayInfoSpan.id = 'discard_info';
    sortButton.id = 'sortButton'

    displayInfoSpan.classList.add('left-margin');

    confirmButton.innerHTML = 'Confirm Discard';
    sortButton.innerHTML = 'Sort Hand';
    displayInfoSpan.innerHTML = 'Select ' + (hand.length - numCardsSelected - 12) + ' more cards';
    updateDiscardGray();

    confirmButton.addEventListener('click',confirmButtonCallback);
    sortButton.addEventListener('click',function() {
        drawnCards = [];
        drawHand(true);
        this.remove();
    });
    if (drawnCards.length > 0) {
        document.getElementById('center').appendChild(sortButton);
    }
    document.getElementById('center').appendChild(confirmButton);
    document.getElementById('center').appendChild(displayInfoSpan);
}

function confirmButtonCallback() {
    let selectedCards = $('.selected');
    console.log(selectedCards);
    if (hand.length - numCardsSelected == 12) {
        //Working so far
        for (let i=0; i<selectedCards.length; i++) {
            discardThis(selectedCards[i].suit,selectedCards[i].value);
            selectedCards[i].removeEventListener('mouseenter',enter);
            selectedCards[i].removeEventListener('mouseleave',exit);
            selectedCards[i].removeEventListener('click',clickCard);
            selectedCards[i].removeEventListener('click',discardClickListener);
            selectedCards[i].title='';
            selectedCards[i].classList.remove('image-hover-highlight');
            selectedCards[i].hidden=true;
            numCardsSelected--;
        }
        document.getElementById('discard_info').remove();
        document.getElementById('confirm_discard_button').remove();
    } else {
        addMessage('Please select ' + (hand.length - numCardsSelected - 12) + ' more card' + ((hand.length - numCardsSelected - 12) == 1 ? '' : 's'));
    }
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
    if (document.getElementById('discard_info')) {
        document.getElementById('discard_info').remove();
    }
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
        drawnCards=[];
        connectingToRoom = false;
        inGame = false;
        chipCount = 100;
        playerNumber = -1;
        povinnostNumber = -1;
        hostNumber = -1;
        currentAction = null;
        discardingOrPlaying = true;
        removeHostTools();
        if (document.getElementById('cardBack')) {
            document.getElementById('cardBack').setAttribute('hidden','hidden');
            document.getElementById('deck').appendChild(document.getElementById('cardBack'));
        } else {
            let card = document.createElement('img');
            card.hidden = true;
            card.id = 'cardBack';
            card.src = '/assets/mach-deck-thumb/card-back-t.png';
            card.alt = 'The back of a card';
            document.getElementById('deck').appendChild(card);
        }
        stopActionTimer();
        document.getElementById('center').innerHTML = '';//clears choice buttons
        document.getElementById('currentAction').innerHTML = '';
        document.getElementById('currentPlayer').innerHTML = '';
        clearChat();
        document.getElementById('roundInfo').textContent = '';
        drawRooms();
    }
}

function clearScreen() {
    returnTableQueue = [[]];
    hand = [];
    drawHand();
    document.getElementById('refresh').innerHTML = '&#10227; Refresh Rooms';
    document.getElementById('refresh').setAttribute('onclick','refresh()');
    stopActionTimer();
    document.getElementById('rooms').innerHTML = '';
    document.getElementById('center').innerHTML = '';
    document.getElementById('currentAction').innerHTML = '';
    document.getElementById('currentPlayer').innerHTML = '';
    clearChat();
    document.getElementById('roundInfo').textContent = '';
    removeHostTools();
    if (document.getElementById('cardBack')) {
        document.getElementById('cardBack').setAttribute('hidden','hidden');
        document.getElementById('deck').appendChild(document.getElementById('cardBack'));
    } else {
        let card = document.createElement('img');
        card.hidden = true;
        card.id = 'cardBack';
        card.src = '/assets/mach-deck-thumb/card-back-t.png';
        card.alt = 'The back of a card';
        document.getElementById('deck').appendChild(card);
    }
}

function sortCards(toSort) {
    toSort = toSort.sort((a, b) => {
         if (SUIT_SORT_ORDER[a.suit] > SUIT_SORT_ORDER[b.suit]) {
            return 1;
         } else if (SUIT_SORT_ORDER[a.suit] < SUIT_SORT_ORDER[b.suit]) {
            return -1;
         }

         if (VALUE_REVERSE[a.value] > VALUE_REVERSE[b.value]) {
            return 1;
         } else if (VALUE_REVERSE[a.value] < VALUE_REVERSE[b.value]) {
            return -1;
         }
         return 0;
    });
    return toSort;
}

function displaySignIn() {
    let accHandler = document.getElementById('accountHandler');
    accHandler.innerHTML = 'Sign In';
    accHandler.href = 'https://sso.smach.us/?redirect=https://machtarok.com/';
}

function displaySignOut(withName) {
    let accHandler = document.getElementById('accountHandler');
    if (!withName) {
        accHandler.innerHTML = 'Sign Out';
    } else {
        accHandler.innerHTML = 'Sign Out (' + withName + ')';
    }
    accHandler.href = 'https://sso.smach.us/?signOut=true&redirect=https://machtarok.com/';
    accHandler.addEventListener('click',signOut);
}

function signOut() {
    let accHandler = document.getElementById('accountHandler');
   document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
   document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
   accHandler.removeEventListener('click',signOut);
}

//thanks w3 schools
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}