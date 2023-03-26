const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { diffieHellman } = require('crypto');
const app = express();
const START_TIME = Date.now();

//Standard file-serving
const server = http.createServer((req, res) => {
    let q = url.parse(req.url, true);
    let filename = '.' + q.pathname;

    if (filename == '.') {
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

    fs.readFile(filename, function (err, data) {
        if (err || filename.indexOf('_') != -1) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end("404 Not Found");
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPE[ext] || 'text/plain' });
        res.write(data);
        return res.end();
    });
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

console.log("Listening on port 8442 (Accessible at http://localhost:8442/ )");


//helper func
function index(dict) {
    for (let key in dict) {
        dict[dict[key]] = key;
    }
}


//SOCKETS
const io = require('socket.io')(server);
const SOCKET_LIST = {};
const players = {};
const rooms = {};
const PLAYER_TYPE = { HUMAN: 0, ROBOT: 1, AI: 2, H: 0, R: 1 };

const SUIT = { 0: 'Spade', 1: 'Club', 2: 'Heart', 3: 'Diamond', 4: 'Trump' };
const RED_VALUE = { 0: 'Ace', 1: 'Two', 2: 'Three', 3: 'Four', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const BLACK_VALUE = { 0: 'Seven', 1: 'Eight', 2: 'Nine', 3: 'Ten', 4: 'Jack', 5: 'Rider', 6: 'Queen', 7: 'King' };
const TRUMP_VALUE = { 0: 'I', 1: 'II', 2: 'III', 3: 'IIII', 4: 'V', 5: 'VI', 6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII', 12: 'XIII', 13: 'XIV', 14: 'XV', 15: 'XVI', 16: 'XVII', 17: 'XVIII', 18: 'XIX', 19: 'XX', 20: 'XXI', 21: 'Skyz' };

const VALUE_REVERSE = {
    Ace: 0, Two: 1, Three: 2, Four: 3, Jack: 4, Rider: 5, Queen: 6, King: 7,
    Seven: 0, Eight: 1, Nine: 2, Ten: 3,
    I: 0, II: 1, III: 2, IIII: 3, V: 4, VI: 5, VII: 6, VIII: 7, IX: 8, X: 9, XI: 10, XII: 11, XIII: 12,
    XIV: 13, XV: 14, XVI: 15, XVII: 16, XVIII: 17, XIX: 18, XX: 19, XXI: 20, Skyz: 21
};

const DIFFICULTY = {RUDIMENTARY: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5};
const DIFFICULTY_TABLE = {0: 'Rudimentary', 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Ruthless'};//TODO add ai
const MESSAGE_TYPE = {POVENOST: 0, MONEY_CARDS: 1, PARTNER: 2, VALAT: 3, CONTRA: 4, IOTE: 5, LEAD: 6, PLAY: 7, WINNER: 8, PREVER_TALON: 9, PAY: 10, CONNECT: 11, DISCONNECT: 12, SETTING: 13};
const SENSITIVE_ACTIONS = {'povenostBidaUniChoice': true,'contra': true, 'preverContra': true, 'preverValatContra': true, 'valatContra': true, 'iote': true};

const DISCONNECT_TIMEOUT = 20 * 1000; //Number of milliseconds after disconnect before player info is deleted

const SERVER = {
    //TODO: finish transferring console logs to server
    /*
    Why use this instead of console.log()? For future additions. Eventually I want to write console logs to a file for debugging
    This system should make that easier
    Separating by room should also help because it will make individual "room history" logs
    */
    //TODO: create debug log files ^
    log: (info, rn) => {
        if (rn != undefined) {
            console.log('ROOM ' + rn + ': ' + info);
        } else {
            console.log('SERVER: ' + info);
        }
    },
    error: (info, rn) => {
        if (rn != undefined) {
            console.warn('ERROR IN ROOM ' + rn + ': ' + info);
        } else {
            console.warn('SERVER ERROR: ' + info);
        }
    },
    trace: (info, rn) => {
        if (rn != undefined) {
            console.trace('STACK TRACE FOR ROOM ' + rn + ': ' + info);
        } else {
            console.trace('SERVER STACK TRACE: ' + info);
        }
    },
    functionCall: (name, ...parameters) => {
        let paramString = '';
        parameters.map(p => {
            if (p) {paramString += p.name + ': ' + p.value;}
        });
        console.log(name + '() called | ' + paramString);
    }
};

index(SUIT);
index(RED_VALUE);
index(BLACK_VALUE);
index(TRUMP_VALUE);

let simplifiedRooms = {};
let ticking = false;
let autoActionTimeout;

function Room(name, debugRoom) {
    this.debug = debugRoom; //Either undefined or true
    this.settings = {'difficulty':DIFFICULTY.EASY, 'timeout': 30*1000, 'locked':false};
    this.name = name;
    this.host = -1;
    this.board = new Board();
    this.playerCount = 0;
    this.deck = [...baseDeck].sort(() => Math.random() - 0.5);
    this.players = [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)];
    this.autoAction = 0;
    this.informPlayers = function(message, messageType, extraInfo) {
        for (let i in this.players) {
            if (this.players[i].type == PLAYER_TYPE.HUMAN) {
                players[this.players[i].socket].socket.emit('gameMessage',message,messageType,extraInfo);
            }
        }
    }
    this.informPlayer = function(pn, message, messageType, extraInfo) {
        if (this.players[pn].type == PLAYER_TYPE.HUMAN) {
            players[this.players[pn].socket].socket.emit('gameMessage',message,messageType,extraInfo);
        }
    }
}
function Player(type) { this.type = type; this.socket = -1; this.pid = -1; this.chips = 100; this.discard = []; this.hand = []; this.tempHand = []; this.isTeamPovenost = false; }
function resetBoardForNextRound(board, players) { //setup board for next round. dealer of next round is this rounds povenost
    board.partnerCard = "";
    board.talon = [];
    board.table = [];
    board.preverTalon = [];
    board.preverTalonStep = 0;
    board.prever = -1;
    board.playingPrever = false;
    board.povenost = (board.povenost+1)%4;
    board.buc = false;
    board.leadPlayer = -1;
    board.valat = -1;
    board.trickWinCount = [0,0];
    board.hasTheI = -1;
    board.iote = -1;
    board.ioteWin = 0;
    board.cutStyle = '';
    board.moneyCards = [[], [], [], []];
    board.contra = [-1,-1];
    board.firstContraPlayer = -1;
    board.importantInfo = {};
    for (let i in players) {
        players[i].hand = [];
        players[i].discard = [];
        players[i].tempHand = [];
        players[i].isTeamPovenost = false;
    }
}
let baseDeck = createDeck();
function Board() {
    this.partnerCard = "";
    this.talon = [];
    this.table = [];
    this.preverTalon = [];
    this.preverTalonStep = 0;
    this.prever = -1;
    this.playingPrever = false;
    this.povenost = -1;
    this.buc = false;
    this.leadPlayer = -1;
    this.nextStep = { player: 0, action: 'start', time: Date.now(), info: null };
    this.cutStyle = '';
    this.moneyCards = [[], [], [], []];
    this.valat = -1;
    this.trickWinCount = [0,0];
    this.hasTheI = -1;
    this.iote = -1;
    this.ioteWin = 0;
    this.contra = [-1,-1];
    this.firstContraPlayer = -1;
    this.gameNumber = 0;
    this.importantInfo = {};
}
function createDeck() {
    let theDeck = [];
    for (let s = 0; s < 4; s++)
        for (let v = 0; v < 8; v++)
            theDeck.push({ 'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v], 'suit': SUIT[s] });
    for (let v = 0; v < 22; v++)
        theDeck.push({ 'value': TRUMP_VALUE[v], 'suit': SUIT[4] });
    return theDeck;
}
function shuffleDeck(deck, shuffleType, cutLocation) {
    let tempDeck = [...deck];
    cutLocation = cutLocation || tempDeck.length / 2;
    switch (shuffleType) {
        case 1: /*cut*/     return cutShuffle(tempDeck, cutLocation);
        case 2: /*riffle*/  return riffleShuffle(tempDeck, true);
        case 3: /*randomize*/return tempDeck.sort(() => Math.random() - 0.5);
        default: return [...tempDeck];
    }
}
function cutShuffle(deck, cutPosition) {
    if (deck.length >= cutPosition) { return deck }
    let leftSide = deck.slice(0, cutPosition);
    let rightSide = deck.slice(cutPosition + 1);
    return [...rightSide, ...leftSide];
}
function riffleShuffle(deck, isRandom) {
    let middle = deck.length / 2;
    let leftSide = deck.slice(0, middle);
    let rightSide = deck.slice(middle);
    let result = [];
    let leftSideFirst = 1;
    for (var i = 0; i < leftSide.length; i++) {
        if (isRandom) { leftSideFirst = Math.floor(Math.random() * 2); }
        if (leftSideFirst == 1) {
            result.push(leftSide[i]);
            result.push(rightSide[i]);
        }
        else {
            result.push(rightSide[i]);
            result.push(leftSide[i]);
        }
    }
    return result;
}
function sortCards(deck) {
    return deck.sort((a, b) => (SUIT[a.suit] > SUIT[b.suit]) ? 1 : (a.suit === b.suit) ? ((Number(SUIT[a.suit] > 1 ? (SUIT[a.suit] > 3 ? TRUMP_VALUE[a.value] : RED_VALUE[a.value]) : BLACK_VALUE[a.value]) > Number(SUIT[b.suit] > 1 ? (SUIT[a.suit] > 3 ? TRUMP_VALUE[b.value] : RED_VALUE[b.value]) : BLACK_VALUE[b.value])) ? 1 : -1) : -1);
}
function handContainsCard(handToCheck, cardName) {
    for (let i in handToCheck) {
        if (handToCheck[i].value == cardName) {
            return true;
        }
    }
    return false;
}
function handHasSuit(handToCheck, suitToCheck) {
    for (let i in handToCheck) {
        if (handToCheck[i].suit == suitToCheck) {
            return true;
        }
    }
    return false;
}
function handContains(handToCheck, valueToCheck, suitToCheck) {
    for (let i in handToCheck) {
        if (handToCheck[i].value == valueToCheck && handToCheck[i].suit == suitToCheck) {
            return true;
        }
    }
    return false;
}
function isCardPlayable(hand, card, leadCard) {
    if (handHasSuit(hand, leadCard.suit)) {
        return card.suit == leadCard.suit;
    } else if (leadCard.suit != 'Trump' && handHasSuit(hand, 'Trump')) {
        return card.suit == 'Trump';
    } else {
        return true;
    }
}
function pointValue(card) {
    if (card.suit == 'Trump') {
        if (card.value == 'I' || card.value == 'XXI' || card.value == 'Skyz') {
            return 5;
        }
        return 1;
    }
    switch (VALUE_REVERSE[card.value]) {
        case 0:
        case 1:
        case 2:
        case 3:
            return 1;
        case 4:
            return 2;
        case 5:
            return 3;
        case 6:
            return 4;
        case 7:
            return 5;
    }
    SERVER.trace('Illegal card. No point value for ' + card);
    return 0;
}
function findPovenost(players) {
    let value = 1; //start with the 'II' and start incrementing to next Trump if no one has it until povenost is found
    while (true) { //loop until we find povenost
        for (let i = 0; i < 4; i++) {
            if (handContainsCard(players[i].hand, TRUMP_VALUE[value])) {
                return i; //found povenost
            }
        }
        value++;
    }
}
function findTheI(players) {
   for (let i = 0; i < 4; i++) {
       if (handContainsCard(players[i].hand, TRUMP_VALUE[0])) {
           return i; //found the I
       }
   }
   SERVER.trace('ERROR: No one has the I');
   return -1;
}
function possiblePartners(hand) {
    let partners = [];
    //can always partner with XIX
    partners.push({ 'value': 'XIX', 'suit': SUIT[4] });
    //if we hold XIX we can partner with the next lowest trump we don't hold, down to the XV
    if (handContainsCard(hand, 'XIX')) {
        for (let v = 17; v >= 15; v--) {
            if (!handContains(hand, TRUMP_VALUE[v])) {
                partners.push({ 'value': TRUMP_VALUE[v - 1], 'suit': SUIT[4] });
                break;
            }
        }
    }
    return partners;
}
//Gray-Out Functions
function grayUndiscardables(hand) {
    let hasNonTrump = false;
    for (let i in hand) {
        if (hand[i].suit != 'Trump') {
            hasNonTrump = true;
            break;
        }
    }
    for (let i in hand) {
        if ((hasNonTrump && hand[i].suit == 'Trump') || hand[i].value == 'King' || hand[i].value == 'I' || hand[i].value == 'XXI' || hand[i].value == 'Skyz') {
            hand[i].grayed = true;
        } else {
            hand[i].grayed = false;
        }
    }
}
function grayUnplayables(hand, leadCard) {
    if (handHasSuit(hand, leadCard.suit)) {
        for (let i in hand) {
            if (hand[i].suit != leadCard.suit) {
                hand[i].grayed = true;
            } else {
                hand[i].grayed = false;
            }
        }
    } else if (leadCard.suit != 'Trump' && handHasSuit(hand, 'Trump')) {
        for (let i in hand) {
            if (hand[i].suit != 'Trump') {
                hand[i].grayed = true;
            } else {
                hand[i].grayed = false;
            }
        }
    } else {
        //Has neither lead suit nor trump. Can play anything
        for (let i in hand) {
            hand[i].grayed = false;
        }
    }
}
function unGrayCards(hand) {
    //Used to un-gray cards before a player leads
    for (let i in hand) {
        hand[i].grayed = false;
    }
}
function numOfSuit(hand, suit) {
    let suitCount = 0;
    for (let i in hand) {
        if (hand[i].suit == suit) {
            suitCount++;
        }
    }
    return suitCount;
}
function selectCardOfSuit(hand, suit) {
    for (let i in hand) {
        if (hand[i].suit == suit) {
            return hand[i];
        }
    }
    SERVER.warn('Illegal card selection. No cards of suit ' + suit + ' in hand ' + hand);
    return;
}
function handWithoutGray(hand) {
    let newHand = [...hand];//Not linked
    for (let i=newHand.length-1; i>=0; i--) {
        if (newHand[i].grayed) {
            newHand.splice(i,1);
        }
    }
    return newHand;
}
function highestPointValue(hand) {
    let pv = hand[0];
    for (let i in hand) {
        if (pointValue(hand[i]) > pointValue(pv)) {
            pv = hand[i];
        }
    }
    return pv;
}
function whoWon(table, leadPlayer) {
    //First card in the table belongs to the leadPlayer
    let trickLeadCard = table[0];
    let trickLeadSuit = trickLeadCard.suit;
    let highestTrump = -1;
    let currentWinner = 0;//LeadPlayer is assumed to be winning
    for (let i=0; i<4; i++) {
        if (table[i].suit == 'Trump' && VALUE_REVERSE[table[i].value] > highestTrump) {
            highestTrump = VALUE_REVERSE[table[i].value];
            currentWinner = i;
        }
    }
    if (highestTrump != -1) {
        //If a trump was played, then the highest trump wins
        return (leadPlayer+currentWinner)%4;
    }
    let highestOfLeadSuit = VALUE_REVERSE[trickLeadCard.value];
    for (let i=1; i<4; i++) {
        if (table[i].suit == trickLeadSuit && VALUE_REVERSE[table[i].value] > highestOfLeadSuit) {
            highestOfLeadSuit = VALUE_REVERSE[table[i].value];
            currentWinner = i;
        }
    }
    //No trumps means that the winner is whoever played the card of the lead suit with the highest value
    return (leadPlayer+currentWinner)%4;
}

//Robot Functions
function firstSelectableCard(hand) {
    for (let i in hand) {
        if (!hand[i].grayed) {
            return hand[i];
        }
    }
    SERVER.trace('ERROR: No cards were ungrayed. Returning first card in hand.');
    return hand[0];
}
function trumpChain(hand) {
    //Returns the number of guaranteed tricks from a hand (trump only)
    let guarantees = 0;
    let misses = 0;
    for (let i=TRUMP_VALUE.length-1; i>=0; i++) {
        if (handContainsCard(TRUMP_VALUE[i])) {
            if (misses > 0) {
                misses--;
            } else {
                guarantees++;
            }
        } else {
            misses++;
        }
    }
    return guarantees;
}
function unbrokenTrumpChain(hand) {
    let guarantees = 0;
    for (let i=TRUMP_VALUE.length-1; i>=0; i++) {
        if (handContainsCard(TRUMP_VALUE[i])) {
            guarantees++;
        } else {
            return guarantees;
        }
    }
    return guarantees;
}
function basicHandRanking(hand) {
    /*Returns a point-value estimate of how good a hand is
    Points are given for:
        -Voided suits (2pt each)
        -Trump
        -Trump again, if higher than XV
        -Trump chain, for each guaranteed win trump (Skyz, then XXI, then XX, etc)
        -Kings/5-point cards
    */
    let handRankingPoints = 0;
    handRankingPoints += trumpChain(hand);
    for (let i in hand) {
        if (hand[i].suit == 'Trump') {
            handRankingPoints++;
            if (VALUE_REVERSE(hand[i].value) >= 14) {
                handRankingPoints++;
            }
        }
        if (pointValue(hand[i]) == 5) {
            handRankingPoints++;
        }
    }
    for (let i=0; i<4; i++) {
        if (numOfSuit(SUIT[i] == 0)) {
            handRankingPoints++;
        }
    }
}
//ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
//RUDIMENTARY: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
function robotDiscard(hand, difficulty) {
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
            /*TODO: Discard cards from the suit with the least number of possible cards that does not have a king
                If tied, discard the highest point value
                This is, of course, after voiding in a suit like normal if possible
                Priorities: VOID 3 suits, VOID 2 suits, VOID a suit with the most points gained, VOID a suit, PREP a suit for voiding by discarding the higher point-value of that suit when there are only 2 cards of it
                Else, discard the highest point value*/
        case DIFFICULTY.HARD:
            //TODO: check how many suits can be discarded in povenost/prever and discard all of them
            //Also, if it is possible to void in two different suits but only one card can be discarded, discard the card with the higher point value
        case DIFFICULTY.NORMAL:
            //Return whatever card is necessary to void in a suit
            for (let i=0; i<4; i++) {
                if (numOfSuit(hand, SUIT[i]) == 1 && numOfSuit(handWithoutGray(hand), SUIT[i])) {
                    return selectCardOfSuit(hand, SUIT[i])
                }
            }
            //Fallthrough to highest point-value
        case DIFFICULTY.EASY:
            //Return highest point value card (most likely a queen)
            return highestPointValue(handWithoutGray(hand));
            break;
        case DIFFICULTY.RUDIMENTARY:
            return firstSelectableCard(hand);
        default:
            //select first discard-able
            SERVER.warn('Unknown difficulty: ' + difficulty);
            return firstSelectableCard(hand);
    }
}
function robotPartner(hand, difficulty) {
    let robotPossiblePartners = possiblePartners(hand);
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
        case DIFFICULTY.NORMAL:
            if (possiblePartners[1] && basicHandRanking(hand) >= 20) {
                return possiblePartners[1];//Play by itself
            }
        case DIFFICULTY.EASY:
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return { 'value': 'XIX', 'suit': SUIT[4] };
        default:
            //always play with XIX
            SERVER.warn('Unknown difficulty: ' + difficulty);
            return { 'value': 'XIX', 'suit': SUIT[4] };
    }
}
function robotCall(hand, difficulty) {
    //Valat
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
        case DIFFICULTY.NORMAL:
            if (unbrokenTrumpChain(hand) >= 8 && basicHandRanking(hand) >= 20) {
                return true;
            }
        case DIFFICULTY.EASY:
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return false;
        default:
            SERVER.warn('Unknown difficulty: ' + difficulty);
            return false;
    }
}
function robotIOTE(hand, difficulty) {
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
        case DIFFICULTY.NORMAL:
            if (numOfSuit(hand, SUIT[4]) >= 8) {
                return true;//Call IOTE if have tarocky or big ones
            }
        case DIFFICULTY.EASY:
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return false;
        default:
            SERVER.warn('Unknown difficulty: ' + difficulty);
            return false;
    }
}
function robotContra(hand, difficulty) {
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
            if (basicHandRanking(hand) >= 18) {
                return true;
            }
        case DIFFICULTY.NORMAL:
        case DIFFICULTY.EASY:
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return false;
        default:
            SERVER.warn('Unknown difficulty: ' + difficulty);
            return false;
    }
}
function robotPovenostBidaUniChoice(hand, difficulty) {
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
        case DIFFICULTY.NORMAL:
            return false;//Conceal so it doesn't get flecked
        case DIFFICULTY.EASY:
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return true;
        default:
            SERVER.warn('Unknown difficulty: ' + difficulty);
            return false;
    }
}
function robotLead(hand, difficulty) {
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
            //Possible strategies: run trump until almost out, play kings, reclaim control with trump
        case DIFFICULTY.NORMAL:
            //Possible strategies: run trump until out, then play kings
        case DIFFICULTY.EASY:
            if (handContainsCard(hand,'XIX')) {
                //My parents were very upset that the robots would not play the XIX
                //This is the temporary fix
                return {'suit':SUIT[4],'value':'XIX'};
            }
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return firstSelectableCard(hand);
        default:
            SERVER.warn('Unknown difficulty: ' + difficulty);
            //select first playable
            return firstSelectableCard(hand);

    }
}
function robotPlay(hand, difficulty) {
    //TODO: add context. Robots need to know: the table, if partners have been revealed, money cards, povenost, valat, contra, IOTE, etc
    switch (difficulty) {
        case DIFFICULTY.AI:
            SERVER.warn('AI not implemented yet. Defaulting to robot moves');
        case DIFFICULTY.RUTHLESS:
        case DIFFICULTY.HARD:
        case DIFFICULTY.NORMAL:
            //If last in line and no trumps have been played, play the I unless IOTE was called
            //If last in line and low on trump, play the XXI
        case DIFFICULTY.EASY:
            //Over-under. If it can beat the current highest card, play the highest one available. Otherwise, play the lowest non-I trump available
            //If last in line, play the lowest winning card
        case DIFFICULTY.RUDIMENTARY:
            //TODO: more difficulty algos
            return firstSelectableCard(hand);
        default:
            SERVER.warn('Unknown difficulty: ' + difficulty);
            //select first playable
            return firstSelectableCard(hand);
    }
}

//SEE Card Locations in codeNotes
//SEE Action Flow in codeNotes

// @PARAM nextAction, room NOT ROOMID
function autoAction(action, room, pn) {
    //This function will complete ANY action that a player is otherwise expected to complete
    //When called, this function will complete the action regardless of whether a player should be tasked with completing it
    //This is useful for player TIMEOUT, or when a player takes too long to complete an action
    //This will also be used when less than 4 players are seated at a table, or when a player leaves after the game has begun
    //Note: the game will NEVER continue after all 4 players have left. There will always be at least 1 human player seated at the table.
    if (!room || !room.players) {
        return;//Room has been deleted
    }

    if (room.players[pn] && room.players[pn].type == PLAYER_TYPE.HUMAN) {
        //Let the player know that the action was completed automatically
        SERVER.log('AutoAction: informed player ' + pn, room.name);
        SOCKET_LIST[room.players[pn].socket].emit('autoAction', action);
    } else {
        SERVER.log('AutoAction: player ' + pn + ' may have disconnected', room.name);
    }

    let hand = room['players'][pn].hand;
    let fakeMoneyCards = false;

    switch (action.action) {
        case 'play':
        case 'shuffle':
            break;
        case 'cut':
            action.info.style = 'Cut';
            break;
        case 'deal':
            break;
        case 'prever':
            action.action = 'passPrever';
            break;
        case 'drawPreverTalon':
        case 'drawTalon':
            break;
        case 'discard':
            grayUndiscardables(hand);
            action.info.card = robotDiscard(hand, DIFFICULTY.EASY);
            break;
        case 'povenostBidaUniChoice':
            fakeMoneyCards = true;
            action.action = 'moneyCards';
            room.board.buc = false;
        case 'moneyCards':
            break;
        case 'partner':
            //if povenost choose partner
            if (room['board'].povenost == pn) {
                action.info.partner = robotPartner(hand, DIFFICULTY.EASY);
            }
            break;
        case 'valat':
            action.info.valat = robotCall(hand, DIFFICULTY.EASY);
            break;
        case 'iote':
            action.info.iote = robotIOTE(hand, DIFFICULTY.EASY);
            SERVER.functionCall('autoAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
            actionCallback(action, room, pn);
            return;//Don't inform the players who has the I
        case 'contra':
        case 'preverContra':
        case 'preverValatContra':
        case 'valatContra':
            action.info.contra = robotContra(hand, DIFFICULTY.EASY);
            SERVER.functionCall('autoAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
            actionCallback(action, room, pn);
            return;
        case 'lead':
            unGrayCards(hand);
            action.info.card = robotLead(hand, DIFFICULTY.EASY);
            break;
        case 'follow':
            grayUnplayables(hand, room.board.leadCard);
            action.info.card = robotPlay(hand, DIFFICULTY.EASY);
            break;
        case 'winTrick':
            break;
        case 'countPoints':
            break;//Point counting will be added later
        case 'resetBoard':
            break;//Utilitarian, no input needed
        default:
            SERVER.warn('Unknown auto action: ' + action.action, room.name);
    }
    for (let i = 0; i < 4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            players[room['players'][i].socket].socket.emit('nextAction', action);
        }
    }
    if (fakeMoneyCards) {
        action.action = 'povenostBidaUniChoice';
    }
    SERVER.functionCall('autoAction', {name:'action', value:action.action}, {name:'pn',value:pn}, {name:'Room Number',value:room.name});
    actionCallback(action, room, pn);
}

function robotAction(action, room, pn) {

    let hand = room['players'][pn].hand;//linked. Changing one will change the other.
    let fakeMoneyCards = false;

    //Takes the action automatically IF and only IF the robot is supposed to
    if (action.player == pn) {
        switch (action.action) {
            case 'play':
            case 'shuffle':
                break;
            case 'cut':
                action.info.style = 'Cut';
                break;
            case 'deal':
                break;
            case 'prever':
                action.action = 'passPrever';
                break;
            case 'drawPreverTalon':
            case 'drawTalon':
                break;
            case 'discard':
                grayUndiscardables(hand);
                action.info.card = robotDiscard(hand, room.settings.difficulty);
                break;
            case 'povenostBidaUniChoice':
                fakeMoneyCards = true;
                action.action = 'moneyCards';
                room.board.buc = robotPovenostBidaUniChoice(hand, room.settings.difficulty);
            case 'moneyCards':
                break;
            case 'partner':
                //if povenost choose partner 
                if (room['board'].povenost == pn) {
                    action.info.partner = robotPartner(hand, room.settings.difficulty);
                }
                break;
            case 'valat':
                action.info.valat = robotCall(hand, room.settings.difficulty);
                break;
            case 'iote':
                action.info.iote = robotIOTE(hand, room.settings.difficulty)
                console.log('robotAction() called | action: ' + action.action + ' pn: ' + pn);
                actionCallback(action, room, pn);
                return;//Don't inform the players who has the I
            case 'contra':
            case 'preverContra':
            case 'preverValatContra':
            case 'valatContra':
                action.info.contra = robotContra(hand, room.settings.difficulty);
                console.log('autoAction() called | action: ' + action.action + ' pn: ' + pn);
                actionCallback(action, room, pn);
                return;
            case 'lead':
                unGrayCards(hand);
                action.info.card = robotLead(hand, room.settings.difficulty);
                break;
            case 'follow':
                grayUnplayables(hand, room.board.leadCard);
                action.info.card = robotPlay(hand, room.settings.difficulty);
                break;
            case 'winTrick':
                break;
            case 'countPoints':
                break;//Point counting will be added later
            case 'resetBoard':
                break;//Utilitarian, no input needed
            default:
                console.warn('Unknown robot action: ' + action.action);
        }
        for (let i = 0; i < 4; i++) {
            if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
        if (fakeMoneyCards) {
            action.action = 'povenostBidaUniChoice';
        }
        console.log('robotAction() called | action: ' + action.action + ' pn: ' + pn);
        actionCallback(action, room, pn);
    }
}
function playerAction(action, room, pn) {
    //Prompts the player to take an action IF and only IF the player is supposed to
    //Works closely with action callbacks

    let hand = room['players'][pn].hand;//linked. Changing one will change the other.
    let returnHandState = -1;
    let fakeMoneyCards = false;

    switch (action.action) {
        case 'play':
            break;
        case 'shuffle':
        //Do nothing, because its all taken care of by the generic action sender/informer at the end
        case 'cut':
        case 'deal':
        case 'prever':
        case 'callPrever':
        case 'passPrever':
        case 'drawPreverTalon':
        case 'drawTalon':
            break;
        case 'discard':
            grayUndiscardables(hand);
            returnHandState = 1;
            break;
        case 'povenostBidaUniChoice':
            fakeMoneyCards = true;
            action.action = 'moneyCards';
        case 'moneyCards':
            break;
        case 'partner':
            //if povenost choose partner 
            if (room['board'].povenost == pn) {
                action.info.possiblePartners = possiblePartners(hand);
            }
            break;
        case 'valat':
            break;
        case 'contra':
        case 'preverContra':
        case 'preverValatContra':
        case 'valatContra':
        case 'iote':
            console.log('playerAction() called | action: ' + action.action + ' pn: ' + pn);
            players[room['players'][pn].socket].socket.emit('nextAction', action);
            return;
        case 'lead':
            unGrayCards(hand);
            returnHandState = 0;
            break;
        case 'follow':
            grayUnplayables(hand, room.board.leadCard);
            returnHandState = 1;
            break;
        case 'winTrick':
            break;
        case 'countPoints':
            //TODO: show the player the discard pile so they can count on harder difficulties
            break;
        case 'resetBoard':
            break;
        default:
            console.log('Unknown action: ' + action.action);
            console.trace();
    }
    if (returnHandState == 0) {
        players[room['players'][pn].socket].socket.emit('returnHand', sortCards(hand), false);
    } else if (returnHandState == 1) {
        players[room['players'][pn].socket].socket.emit('returnHand', sortCards(hand), true);
    }

    for (let i = 0; i < 4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            if (fakeMoneyCards && pn == i) {
                action.action = 'povenostBidaUniChoice';
                players[room['players'][i].socket].socket.emit('nextAction', action);
                action.action = 'moneyCards';
            }
            if (!SENSITIVE_ACTIONS[action.action] || pn == i) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
    }
    console.log('playerAction() called | action: ' + action.action + ' pn: ' + pn);
}

function aiAction(action, room, pn) {
    //Uses the AI to take an action IF and only IF the AI is supposed to
    console.warn('AI not implemented yet!!');
    console.trace();

    for (let i = 0; i < 4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            players[room['players'][i].socket].socket.emit('nextAction', action);
        }
    }
}
function actionCallback(action, room, pn) {
    // an Action is {player_num,action_type,time,info}

    //This callback will transfer from one action to the next and inform the humans of the action to be taken
    //In the case that a robot or AI is the required player, this will directly call on the above action handlers
    //The action is presumed to be verified by its player takeAction function, not here
    if (!room || !action) {
        console.warn('Illegal actionCallback: ' + JSON.stringify(room) + ' \n\n ' + JSON.stringify(action) + ' \n\n ' + pn);
        console.trace();
        return;
    }
    if (!action.info) {
        action.info = {};
    }
    let currentHand = room['players'][pn].hand;//linked, not copied
    let playerType = room['players'][pn].type;
    let actionTaken = false;
    let style;
    let shouldReturnTable = false;

    console.log('Action taken: ' + action.player + ' took action ' + action.action + ' with info ' + JSON.stringify(action.info) + ' in room ' + room.name);

    switch (action.action) {
        case 'start':
            room['board'].gameNumber = 1;
            console.log('Game 1 is starting in room ' + room.name);
            action.action = 'shuffle';
            action.player = pn;//First game, host is assumed to shuffle
            for (let i = 0; i < 4; i++) {
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    //Starting the game is a special case. In all other cases, actions completed will inform the players through the take action methods
                    players[room['players'][i].socket].socket.emit('startingGame', room.host, i, room['board'].gameNumber, room.settings);//Inform the players of game beginning.
                }
            }
            actionTaken = true;
            break;
        case 'play':
            room['board'].gameNumber++;
            console.log('Game ' + room['board'].gameNumber + ' is starting in room ' + room.name);
            action.action = 'shuffle';
            action.player = (room['board'].povenost+3)%4;
            actionTaken = true;
            break;
        case 'shuffle':
            const type = action.info.type;
            const again = action.info.again;
            if (type > 0 && type < 4) {
                //1: cut, 2: riffle, 3: randomize
                room['deck'] = shuffleDeck(room['deck'], type);
            }
            if (!again) {
                action.action = 'cut';
                action.player = (pn + 3) % 4;//The player before the dealer must cut, then the dealer must deal
                actionTaken = true;
            }
            break;
        case 'cut':
            style = action.info.style;
            if (style == 'Cut') room['deck'] = shuffleDeck(room['deck'], 1, action.info.location);
            action.action = 'deal';
            action.player = (pn + 1) % 4;//The player after the cutter must deal
            room['board']['cutStyle'] = style;//For the dealer
            actionTaken = true;
            break;
        case 'deal':
            style = room['board']['cutStyle'];
            if (!style) style = 'Cut';
            for (let i = 0; i < 6; i++) room['board'].talon[i] = room['deck'].splice(0, 1)[0];
            switch (style) {
                case '1':
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '2':
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 2; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '3':
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 3; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '4':
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 4; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '12':
                    /*TODO: Deal by 12s
                    let hands = [[], [], [], []];
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 12; c++)hands[i].push(room['deck'].splice(0, 1)[0]); }
                    have players in order choose hands
                    //TODO: Create logic for players choosing hands[(0-3)]
                    break; fallthrough until 12s logic is complete*/
                case '12 Straight':
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 12; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '345':
                    for (let t = 3; t < 6; t++) {
                        for (let i = 0; i < 4; i++) {
                            for (let c = 0; c < t; c++) room['players'][i].hand.push(room['deck'].splice(0, 1)[0]);
                        }
                    }
                    break;
                default:
                    //Cases 6, Cut, or any malformed cut style. Note the deck has already been cut
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 6; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
            }
            
            if (room['board'].povenost == -1) {
                //Povenost first round chosen by cards
                room['board'].povenost = findPovenost(room['players'])
            }
            room.board.importantInfo.povenost = (room.board.povenost+1);
            //Povenost rotation is handled by the board reset function
            console.log('Server (' + room.name + '): povenost is ' + room['board'].povenost);
            room.informPlayers('Player ' + (room['board'].povenost+1) + ' is povenost', MESSAGE_TYPE.POVENOST,{'pn':room['board'].povenost});
            action.action = 'prever';
            action.player = room['board'].povenost;
            actionTaken = true;
            break;
        case 'prever':
            break;//ignore this, the callback is for the players
        case 'passPrever':
            action.player = (action.player + 1) % 4;
            if (action.player == room['board'].povenost) {
                action.action = 'drawTalon';
            } else {
                action.action = 'prever';
            }
            actionTaken = true;
            break;
        case 'drawTalon':
            if (action.player == room['board'].povenost) {
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                action.player = (action.player + 1) % 4;
                actionTaken = true;
            } else {
                room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                if (action.player == (room['board'].povenost + 2) % 4) {
                    action.player = room['board'].povenost;
                    action.action = 'discard';
                    actionTaken = true;
                } else {
                    action.player = (action.player + 1) % 4;
                    actionTaken = true;
                }
            }
            break;
        case 'callPrever':
            room['board'].playingPrever = true;
            room['board'].prever = pn;
            room['board'].preverTalonStep = 0;
            room.board.importantInfo.prever = (room.board.prever+1);
            action.action = 'drawPreverTalon';
            if (room['board'].povenost == pn) {
                for (let i=0; i<4; i++) {
                    room['players'][i].isTeamPovenost = false;
                }
                room['players'][pn].isTeamPovenost = true;
            } else {
                for (let i=0; i<4; i++) {
                    room['players'][i].isTeamPovenost = true;
                }
                room['players'][pn].isTeamPovenost = false;
            }
            //Fallthrough to inform the player
        case 'drawPreverTalon':
            if (room['board'].preverTalonStep == 0) {
                //Show the initial 3 cards to prever
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                sortCards(room['players'][action.player].tempHand);

                //Inform player of cards
                if (room.players[pn].type == PLAYER_TYPE.HUMAN) {
                    room.informPlayer(pn, '', MESSAGE_TYPE.PREVER_TALON,{'cards':room['players'][action.player].tempHand,'step':0});
                }

                actionTaken = true;
                room['board'].preverTalonStep = 1;
            } else if (room['board'].preverTalonStep == 1) {
                if (action.info.accept) {
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    //Prever is keeping the initial three cards and will not look at the other three.
                    //The other three cards now go into Povenost's discard pile, unless Prever is Povenost, in which case the cards go into the next player's discard pile
                    //The game then continues with Prever discarding down to 12 and point cards as normal
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room.informPlayers('Prever has kept the first set of cards',MESSAGE_TYPE.PREVER_TALON,{'pn':pn,'step':3,'youMessage':'You have kept the first set of cards'});
                    actionTaken = true;
                    action.action = 'discard';
                } else {
                    //Prever has rejected the first three cards and will instead take the second three
                    //The original three return to the talon and the three from the talon enter the tempHand. Other players are allowed to view the talon now
                    //The Prever loss multiplier is doubled here. Prever has a third and final choice to make before we may continue
                    let temp = [];

                    //Show first set of cards to all players
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);

                    room.informPlayers('Prever has rejected the first set of cards',MESSAGE_TYPE.PREVER_TALON,{'cards':temp,'pn':pn,'step':1,'youMessage':'You have rejected the first set of cards'});

                    //Show prever the second set of cards from the talon
                    room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);

                    //Return first set of cards to the talon
                    room['board'].talon.push(temp.splice(0,1)[0]);
                    room['board'].talon.push(temp.splice(0,1)[0]);
                    room['board'].talon.push(temp.splice(0,1)[0]);

                    //Inform prever of cards
                    if (room.players[pn].type == PLAYER_TYPE.HUMAN) {
                        room.informPlayer(pn, '', MESSAGE_TYPE.PREVER_TALON,{'cards':room['players'][action.player].tempHand,'step':1});
                    }

                    actionTaken = true;
                    room['board'].preverTalonStep = 2;
                    room['board'].preverMultiplier = 2;
                }
            } else if (room['board'].preverTalonStep == 2) {
                if (action.info.accept) {
                    //Prever has claimed the second set of cards and basically the same thing happens as if prever had accepted the first half, but the loss multiplier is doubled
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);

                    //Opposing team claims the first set of cards
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(room['board'].talon.splice(0, 1)[0]);
                    room.informPlayers('Prever has kept the second set of cards',MESSAGE_TYPE.PREVER_TALON,{'pn':pn,'step':3,'youMessage':'You have kept the second set of cards'});
                    action.action = 'discard';
                    actionTaken = true;
                } else {
                    //Prever rejected the second set and returned to the first set
                    //Prever swaps the three cards with the talon and the other players are again allowed to view which cards prever rejected
                    //Finally, the remaining cards in the talon are given to the other team, the loss multiplier is doubled again (now at 4x), and play moves on to discarding
                    let temp = [];
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);
                    temp.push(room['players'][action.player].tempHand.splice(0,1)[0]);

                    room.informPlayers('Prever has rejected the second set of cards',MESSAGE_TYPE.PREVER_TALON,{'cards':temp,'pn':pn,'step':2,'youMessage':'You have rejected the second set of cards'});

                    //Give prever the cards from the talon
                    room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['board'].talon.splice(0, 1)[0]);

                    //Give second set of cards to opposing team's discard
                    room['players'][(action.player+1)%4].discard.push(temp.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(temp.splice(0, 1)[0]);
                    room['players'][(action.player+1)%4].discard.push(temp.splice(0, 1)[0]);

                    room['board'].preverMultiplier = 4;
                    actionTaken = true;
                    action.action = 'discard';
                }
            }
            room.board.importantInfo.preverMultiplier = Math.pow(2,room['board'].preverTalonStep - 1);
            break;
        case 'discard':
            let card = action.info.card;
            let discarded = false;
            if (card && card.suit && card.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == card.suit && room['players'][pn].hand[i].value == card.value) {
                        room.players[pn].discard.push(room['players'][pn].hand.splice(i, 1)[0]);
                        discarded = true;
                        break;
                    }
                }
            }
            if (discarded) {
                actionTaken = true;
                if (room['players'][action.player].hand.length == 12) {
                    action.player = (action.player + 1) % 4;
                    if (room['players'][action.player].hand.length == 12) {
                        action.player = room['board'].povenost;
                        if (room['board'].playingPrever) {
                            //A player is going prever. No partner cards
                            action.action = 'moneyCards';
                            //Note that prever is calling Bida or Uni no matter what
                            //If prever has bida or uni, he calls bida or uni. No choice.
                        } else {
                            //No player going prever. Povenost will call a partner
                            action.action = 'partner';
                        }
                    }
                }
            } else {
                players[room['players'][pn].socket].socket.emit('failedDiscard', card);
                console.log('Player ' + pn + ' failed to discard the ' + action.info.card.value + ' of ' + action.info.card.suit);
                console.log('Cards in hand: ' + JSON.stringify(room['players'][pn].hand));
            }
            break;
        case 'povenostBidaUniChoice':
            //player is assumed to be povenost. This action is only taken if povenost has bida or uni
            room.board.buc = action.info.choice;
            action.action = 'moneyCards';//Fallthrough. Go directly to moneyCards
        case 'moneyCards':
            //Determines point which point cards the player has, starting with Povenost and rotating around. Povenost has the option to call Bida or Uni but others are called automatically
            let isPovenost = room.board.povenost == pn;
            //Needed info: trump count, 5-pointer count, trul detection
            let numTrumps = 0;
            let fiverCount = 0;
            let owedChips = 0;
            for (let i in currentHand) {
                if (currentHand[i].suit == "Trump") { numTrumps++; }
                if (currentHand[i].value == "King" || currentHand[i].value == "I" || currentHand[i].value == "XXI" || currentHand[i].value == "Skyz") { fiverCount++; }
            }
            if (numTrumps == 0) {
                if (!isPovenost || room.board.buc) {
                    //Uni
                    owedChips += 4;
                    room['board'].moneyCards[pn].push("Uni");
                }
            } else if (numTrumps <= 2) {
                if (!isPovenost || room.board.buc) {
                    //Bida
                    owedChips += 2;
                    room['board'].moneyCards[pn].push("Bida");
                }
            } else if (numTrumps >= 10) {
                //Taroky (big ones)
                owedChips += 4;
                room['board'].moneyCards[pn].push("Taroky");
            } else if (numTrumps >= 8) {
                //Tarocky (little ones)
                owedChips += 2;
                room['board'].moneyCards[pn].push("Tarocky");
            }
            if (fiverCount >= 3) {
                //Check for trul
                if (handContainsCard(currentHand, "I") && handContainsCard(currentHand, "XXI") && handContainsCard(currentHand, "Skyz")) {
                    //Trul
                    owedChips += 2;
                    room['board'].moneyCards[pn].push("Trul");
                }
                if (handContains(currentHand, "King", "Spade") && handContains(currentHand, "King", "Club") && handContains(currentHand, "King", "Heart") && handContains(currentHand, "King", "Diamond")) {
                    if (fiverCount > 4) {
                        //Rosa-Honery+
                        owedChips += 6;
                        room['board'].moneyCards[pn].push("Rosa-Honery+");
                    } else {
                        //Rosa-Honery
                        owedChips += 4;
                        room['board'].moneyCards[pn].push("Rosa-Honery");
                    }
                } else if (fiverCount >= 4) {
                    //Honery
                    owedChips += 2;
                    room['board'].moneyCards[pn].push("Honery");
                }
            }

            //Inform all players of current moneyCards
            let theMessage = 'Player ' + (pn + 1) + ' is calling ';
            let yourMoneyCards = 'You are calling ';
            let numCalled = 0;
            for (let i in room['board'].moneyCards[pn]) {
                numCalled++;
                theMessage += ((numCalled>1 ? ', ' : '') + room['board'].moneyCards[pn][i]);
                yourMoneyCards += ((numCalled>1 ? ', ' : '') + room['board'].moneyCards[pn][i]);
            }
            if (numCalled == 0) {
                theMessage += 'nothing';
                yourMoneyCards += 'nothing';
            }
            room.informPlayers(theMessage, MESSAGE_TYPE.MONEY_CARDS, {youMessage: yourMoneyCards, pn: pn});
            for (let i in room['players']) {
                if (i == pn) {
                    room['players'][i].chips += 3 * owedChips;
                } else {
                    room['players'][i].chips -= owedChips;
                }
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    SOCKET_LIST[room['players'][i].socket].emit('returnChips', room['players'][i].chips);
                }
            }
            room.board.importantInfo.moneyCards = room.board.moneyCards;
            actionTaken = true;

            action.player = (pn + 1) % 4;
            if (action.player == room['board'].povenost) {
                action.action = 'valat';
            }
            break;
        case 'partner':
            let povenostChoice = room['board'].partnerCard;
            if (!handContainsCard(currentHand, "XIX") || (handContainsCard(currentHand, "XIX") && povenostChoice == 'XIX')) {
                room['board'].partnerCard = "XIX";
            } else if (!handContainsCard(currentHand, "XVIII")) {
                room['board'].partnerCard = "XVIII";
            } else if (!handContainsCard(currentHand, "XVII")) {
                room['board'].partnerCard = "XVII";
            } else if (!handContainsCard(currentHand, "XVI")) {
                room['board'].partnerCard = "XVI";
            } else if (!handContainsCard(currentHand, "XV")) {
                room['board'].partnerCard = "XV";
            } else {
                room['board'].partnerCard = "XIX";
            }


            for (let i=0; i<4; i++) {
                room['players'][i].isTeamPovenost = handContainsCard(room['players'][i].hand, room['board'].partnerCard);
            }
            room['players'][room['board'].povenost].isTeamPovenost = true;

            let numTrumpsInHand = 0;
            for (let i in currentHand) {
                if (currentHand[i].suit == "Trump") { numTrumpsInHand++;}
            }
            if (numTrumpsInHand <= 2) {
                action.action = 'povenostBidaUniChoice';
            } else {
                action.action = 'moneyCards';
            }

            //Inform players what Povenost called
            room.informPlayers('Povenost (Player ' + (pn+1) + ') is playing with the ' + room['board'].partnerCard, MESSAGE_TYPE.PARTNER, {youMessage: 'You are playing with the ' + room['board'].partnerCard, pn: pn});
            room.board.importantInfo.partnerCard = room.board.partnerCard;
            actionTaken = true;
            break;
        case 'valat':
            if (action.info.valat) {
                //Player called valat
                room['board'].valat = pn;
                room.informPlayers('Player ' + (pn+1) + ' called valat', MESSAGE_TYPE.VALAT, {youMessage: 'You called valat', pn: pn});
                room.board.importantInfo.valat = pn+1;
                if (room.board.playingPrever) {
                    action.action = 'preverValatContra';
                    if (room.board.prever != pn) {
                        //Opposing team called valat. Prever may contra.
                        action.player = room.board.prever;
                    } else {
                        //Prever called valat. Non-prever team calls contra
                        action.player = (room.board.prever+1)%4;
                    }
                } else {
                    action.action = 'valatContra';
                    if (room.players[pn].isTeamPovenost) {
                        //Povenost team called valat. Non-povenost team calls contra
                        action.player = (room['board'].povenost+1)%4;
                        if (room.players[action.player].isTeamPovenost) {
                            action.player = (action.player+1)%4;
                        }
                    } else {
                        //Non-povenost team called valat. Povenost team calls contra
                        action.player = room['board'].povenost;
                    }
                }
                room.board.firstContraPlayer = action.player;
            } else {
                action.player = (pn + 1) % 4;
                if (action.player == room['board'].povenost) {
                    action.player = findTheI(room.players);
                    action.action = 'iote';
                }
            }
            actionTaken = true;
            //Possible variations: IOTE may still be allowed in a valat game, contra may be disallowed
            break;
        case 'iote':
            room.board.hasTheI = pn;
            if (action.info.iote) {
                room.informPlayers('Player ' + (pn+1) + ' called the I on the end', MESSAGE_TYPE.IOTE, {youMessage: 'You called the I on the end', pn: pn});
                room.board.iote = pn;
                room.board.importantInfo.iote = pn+1;
            }
            actionTaken = true;
            if (room.board.playingPrever) {
                //Non-prever team calls contra
                action.action = 'preverContra'
                action.player = (room.board.prever+1)%4;
            } else {
                //Non-povenost team calls contra
                action.action = 'contra';
                action.player = (room['board'].povenost+1)%4;
                if (room.players[action.player].isTeamPovenost) {
                    action.player = (action.player+1)%4;
                }
            }
            room.board.firstContraPlayer = action.player;
            break;
        case 'preverContra':
            let preverIsPovenost = room.board.prever == room.board.povenost;
            //If preverIsPovenost, then isTeamPovenost is isTeamPrever and no changes must be made
            //If !preverIsPovenost, then isTeamPovenost is prever and the roles must be reversed
            //(isTeamPovenost == preverIsPovenost): isTeamPrever
            //Note that contra[0] will be opposing team, not necessarily non-povenost team. Opposing team will be non-prever team in this case
            if (action.info.contra) {
                if (room.players[pn].isTeamPovenost == preverIsPovenost) {
                    //Povenost's team called rhea-contra
                    room['board'].contra[1] = 1;

                    //Swap play to opposing team
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovenost == preverIsPovenost);
                    room.board.firstContraPlayer = action.player;
                } else {
                    //Not-povenost's team called either contra or supra-contra
                    if (room.board.contra[0] == -1) {
                        //Regular contra
                        room.board.contra[0] = 1;

                        //Swap play to opposing team
                        do {
                            action.player = (action.player+1)%4;
                        } while (!(room.players[action.player].isTeamPovenost == preverIsPovenost));
                        room.board.firstContraPlayer = action.player;
                    } else {
                        //Supra-contra. No more contras can be called
                        room.board.contra[0] = 2;
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                }
                room.informPlayers('Player ' + (pn+1) + ' called contra', MESSAGE_TYPE.CONTRA, {youMessage: 'You called contra', pn: pn});
            } else {
                if (room.players[pn].isTeamPovenost == preverIsPovenost) {
                    //Chance to call rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (!(room.players[action.player].isTeamPovenost == preverIsPovenost));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                } else {
                    //Either no one has called contra or prever's team has called rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while ((room.players[action.player].isTeamPovenost == preverIsPovenost));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                }
            }
            actionTaken = true;
            break;
        case 'valatContra':
            //Fallthrough because, strangely enough, valatContra and preverValatContra have the same logic
            //This is because preverValatContra does not care who prever is, only who povenost's team is and which team called valat
        case 'preverValatContra':
            //Because why shouldn't prever call valat and then the opponents call contra?
            let povenostIsValat = room.players[room.board.valat].isTeamPovenost;
            //Note that prever would be allowed to call contra first if the opposing team for some reason called valat
            //If prever called valat, then the opposing team is allowed to call contra
            //isTeamThatDidn'tCallValat = povenostIsValat == isTeamContra
            if (action.info.contra) {
                if (room.players[pn].isTeamPovenost == povenostIsValat) {
                    //Povenost's team called rhea-contra
                    room['board'].contra[1] = 1;

                    //Swap play to opposing team
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovenost == povenostIsValat);
                    room.board.firstContraPlayer = action.player;
                } else {
                    //Not-povenost's team called either contra or supra-contra
                    if (room.board.contra[0] == -1) {
                        //Regular contra
                        room.board.contra[0] = 1;

                        //Swap play to opposing team
                        do {
                            action.player = (action.player+1)%4;
                        } while (!(room.players[action.player].isTeamPovenost == povenostIsValat));
                        room.board.firstContraPlayer = action.player;
                    } else {
                        //Supra-contra. No more contras can be called
                        room.board.contra[0] = 2;
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                }
                room.informPlayers('Player ' + (pn+1) + ' called contra', MESSAGE_TYPE.CONTRA, {youMessage: 'You called contra', pn: pn});
            } else {
                if (room.players[pn].isTeamPovenost == povenostIsValat) {
                    //Chance to call rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (!(room.players[action.player].isTeamPovenost == povenostIsValat));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                } else {
                    //Either no one has called contra or prever's team has called rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while ((room.players[action.player].isTeamPovenost == povenostIsValat));
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                }
            }
            actionTaken = true;
            break;
        case 'contra':
            if (action.info.contra) {
                if (room.players[pn].isTeamPovenost) {
                    //Povenost's team called rhea-contra
                    room['board'].contra[1] = 1;

                    //Swap play to opposing team
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovenost);
                    room.board.firstContraPlayer = action.player;
                } else {
                    //Not-povenost's team called either contra or supra-contra
                    if (room.board.contra[0] == -1) {
                        //Regular contra
                        room.board.contra[0] = 1;

                        //Swap play to opposing team
                        do {
                            action.player = (action.player+1)%4;
                        } while (!room.players[action.player].isTeamPovenost);
                        room.board.firstContraPlayer = action.player;
                    } else {
                        //Supra-contra. No more contras can be called
                        room.board.contra[0] = 2;
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                }
                room.informPlayers('Player ' + (pn+1) + ' called contra', MESSAGE_TYPE.CONTRA, {youMessage: 'You called contra', pn: pn});
            } else {
                if (room.players[pn].isTeamPovenost) {
                    //Chance to call rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (!room.players[action.player].isTeamPovenost);
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                } else {
                    //Either no one has called contra or povenost's team has called rhea-contra
                    do {
                        action.player = (action.player+1)%4;
                    } while (room.players[action.player].isTeamPovenost);
                    if (action.player == room.board.firstContraPlayer) {
                        //It has gone all the way around. No one wants to call contra
                        shouldReturnTable = true;
                        action.action = 'lead';
                        action.player = room['board'].povenost;
                        room.board.leadPlayer = room['board'].povenost;
                    }
                }
            }
            actionTaken = true;
            break;
        case 'lead':
            room.board.importantInfo.contra = Math.pow(2,
                ~room.board.contra[0] ? room.board.contra[0] +
                (~room.board.contra[1] ? room.board.contra[1] : 0) : 0);
            let cardToLead = action.info.card;
            let lead = false;
            if (cardToLead && cardToLead.suit && cardToLead.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == cardToLead.suit && room['players'][pn].hand[i].value == cardToLead.value) {
                        lead = room['players'][pn].hand.splice(i, 1)[0];
                        break;
                    }
                }
            }
            if (lead) {
                actionTaken = true;
                shouldReturnTable = true;
                action.action = 'follow';
                action.player = (action.player + 1) % 4;
                room['board'].table.push({'card':lead,'pn':pn,'lead':true});
                room['board'].leadCard = lead;
                room.informPlayers('Player ' + (pn+1) + ' lead the ' + lead.value + ' of ' + lead.suit, MESSAGE_TYPE.LEAD, {youMessage: 'You lead the ' + lead.value + ' of ' + lead.suit, pn: pn, card: lead});
            } else {
                if (room['players'][pn].type == PLAYER_TYPE.HUMAN) {
                    SOCKET_LIST[room['players'][pn].socket].emit('failedLeadCard', cardToLead);
                }
                if (cardToLead && cardToLead.suit && cardToLead.value) {console.log('Player ' + pn + ' failed to lead the ' + action.info.card.value + ' of ' + action.info.card.suit);}
                console.log('Cards in hand: ' + JSON.stringify(room['players'][pn].hand));
            }
            break;
        case 'follow':
            //Note that the card was verified playable by the socket.on function
            let cardToPlay = action.info.card;
            let played = false;
            if (cardToPlay && cardToPlay.suit && cardToPlay.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == cardToPlay.suit && room['players'][pn].hand[i].value == cardToPlay.value) {
                        played = room['players'][pn].hand.splice(i, 1)[0];
                        break;
                    }
                }
            }
            if (played) {
                actionTaken = true;
                shouldReturnTable = true;
                room['board'].table.push({'card':played,'pn':pn,'lead':false});
                action.player = (action.player + 1) % 4;
                room.informPlayers('Player ' + (pn+1) + ' played the ' + played.value + ' of ' + played.suit, MESSAGE_TYPE.PLAY, {youMessage: 'You played the ' + played.value + ' of ' + played.suit, pn: pn, card: played});
                //If all players have played a card, determine who won the trick
                if (action.player == room.board.leadPlayer) {
                    action.action = 'winTrick';
                    let trickCards = [];
                    for (let i in room.board.table) {
                        trickCards.push(room.board.table[i].card);
                    }
                    let trickWinner = whoWon(trickCards, room.board.leadPlayer);
                    action.player = trickWinner;
                    room.informPlayers('Player ' + (trickWinner+1) + ' won the trick', MESSAGE_TYPE.WINNER, {youMessage: 'You won the trick', pn: trickWinner});
                }
            } else {
                if (players[pn].type != PLAYER_TYPE.HUMAN) {
                    console.trace('Robot attempted to play illegal card');
                    console.log(JSON.stringify(cardToPlay));
                    console.log('Cards in hand: ' + JSON.stringify(room['players'][pn].hand));
                    break;
                }
                players[room['players'][pn].socket].socket.emit('failedPlayCard', cardToPlay);
                if (cardToPlay && cardToPlay.suit && cardToPlay.value) {console.log('Player ' + pn + ' failed to play the ' + action.info.card.value + ' of ' + action.info.card.suit);}
                console.log(JSON.stringify(cardToPlay));
                console.log('Cards in hand: ' + JSON.stringify(room['players'][pn].hand));
            }
            break;
        case 'winTrick':
            //Separated so the table would return separately
            actionTaken = true;
            shouldReturnTable = true;

            if (room.players[pn].hand.length == 0) {
                //Last trick. Check if the I is present
                let I = false;
                let otherTrump = false;
                for (let i in room.board.table) {
                    if (room.board.table[i].value == 'I') {
                        //IOTE
                        I = true;
                    } else if (room.board.table[i].suit == 'Trump') {
                        //I has been captured
                        otherTrump = true;
                    }
                }
                if (I) {
                    //Positive = povenost's team, negative = opposing
                    if (room.players[room.board.hasTheI].isTeamPovenost) {
                        //Povenost's team played the I
                        if (otherTrump) {
                            room.board.ioteWin = -1;
                        } else {
                            room.board.ioteWin = 1;
                        }
                    } else {
                        //Opposing team played the I
                        if (otherTrump) {
                            room.board.ioteWin = 1;
                        } else {
                            room.board.ioteWin = -1;
                        }
                    }
                }
            }

            //Transfer the table to the winner's discard
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.players[pn].discard.push(room.board.table.splice(0,1)[0].card);
            room.board.table = [];

            if (room.players[pn].isTeamPovenost) {
                room.board.trickWinCount[0]++;
            } else {
                room.board.trickWinCount[1]++;
            }
            room.board.leadPlayer = pn;
            action.action = 'lead';

            //If players have no more cards in hand, count points
            if (room.players[action.player].hand.length == 0) {
                action.action = 'countPoints';
                action.player = room.board.povenost;
            }
            break;
        case 'countPoints':
            let pointCountMessageTable = [];
            let chipsOwed = 0;
            //Called valat
            if (room.board.valat != -1) {
                //Possible settings: room.settings.valat * 2

                if (room.players[room.board.valat].isTeamPovenost) {
                    //Povenost's team called valat
                    if (room.board.trickWinCount[1] > 0) {
                        //Opposing team won a trick
                        chipsOwed = -40;
                        pointCountMessageTable.push({'name':'Failed a Called Valat', 'value':40});
                    } else {
                        chipsOwed = 40;
                        pointCountMessageTable.push({'name':'Won a Called Valat', 'value':40});
                    }
                } else {
                    //Opposing team called valat
                    if (room.board.trickWinCount[0] > 0) {
                        //Povenost team won a trick
                        chipsOwed = 40;
                        pointCountMessageTable.push({'name':'Failed a Called Valat', 'value':40});
                    } else {
                        chipsOwed = -40;
                        pointCountMessageTable.push({'name':'Won a Called Valat', 'value':40});
                    }
                }

            } else {
                //No valat called

                //Combine discard piles
                let povenostTeamDiscard = [];
                let opposingTeamDiscard = [];
                for (let i in room.players) {
                    if (room.players[i].isTeamPovenost) {
                        for (let j = room.players[i].discard.length-1; j >= 0; j--) {
                            povenostTeamDiscard.push(room.players[i].discard.splice(0,1)[0]);
                        }
                    } else {
                        for (let j = room.players[i].discard.length-1; j >= 0; j--) {
                            opposingTeamDiscard.push(room.players[i].discard.splice(0,1)[0]);
                        }
                    }
                }
                if (room.board.trickWinCount[0] == 0 || room.board.trickWinCount[1] == 0) {
                    //Uncalled valat
                    //Possible settings: room.settings.valat
                    if (room.board.trickWinCount[0] == 0) {
                        //Povenost's team valat'd
                        chipsOwed = 20;
                        pointCountMessageTable.push({'name':'Valat', 'value':20});
                    } else {
                        //Opposing team valat'd
                        chipsOwed = -20;
                        pointCountMessageTable.push({'name':'Valat', 'value':20});
                    }

                } else {
                    //No valat
                    let povenostTeamPoints = 0;
                    let opposingTeamPoints = 0;
                    for (let i in povenostTeamDiscard) {
                        povenostTeamPoints += pointValue(povenostTeamDiscard[i]);
                    }
                    for (let i in opposingTeamDiscard) {
                        opposingTeamPoints += pointValue(opposingTeamDiscard[i]);
                    }
                    pointCountMessageTable.push({'name':'Povenost Team Points', 'value':povenostTeamPoints});
                    pointCountMessageTable.push({'name':'Opposing Team Points', 'value':opposingTeamPoints});

                    //Sanity check
                    if (povenostTeamPoints + opposingTeamPoints != 106) {
                        console.log('-------------------------')
                        console.warn('Error: incorrect number of points\nPovenost team: ' + povenostTeamPoints + '\nOpposing team: ' + opposingTeamPoints);
                        console.log(JSON.stringify(povenostTeamDiscard));
                        console.log(JSON.stringify(opposingTeamDiscard));
                        //Time to search anywhere and everywhere for the missing cards
                        console.log('Hands: ')
                        for (let i in room.players) {
                            console.log(JSON.stringify(room.players[i].hand))
                        }
                        console.log('Discard: ')
                        for (let i in room.players) {
                            console.log(JSON.stringify(room.players[i].discard))
                        }
                        console.log('TempHands: ')
                        for (let i in room.players) {
                            console.log(JSON.stringify(room.players[i].tempHand))
                        }
                        console.log('Talon: ')
                        console.log(JSON.stringify(room.board.talon));
                        console.log('Prever talon:')
                        console.log(JSON.stringify(room.board.preverTalon));
                        console.log('Table: ')
                        console.log(JSON.stringify(room.board.table));
                        console.log('Deck: ')
                        console.log(JSON.stringify(room.deck) + '\n');
                        //Check which cards are missing from the team point piles
                        let combinedPointPile = [];
                        for (let c in povenostTeamDiscard) {
                            combinedPointPile.push(povenostTeamDiscard[c]);
                        }
                        for (let c in opposingTeamDiscard) {
                            combinedPointPile.push(opposingTeamDiscard[c]);
                        }
                        for (let i in baseDeck) {
                            let found = false;
                            //Find the matching card in combinedPointPile
                            for (let j in combinedPointPile) {
                                if (baseDeck[i].suit == combinedPointPile[j].suit &&
                                    baseDeck[i].value == combinedPointPile[j].value) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                console.log('Card ' + baseDeck[i].value + ' of ' + baseDeck[i].suit + ' was not found');
                                console.log('Point value: ' + pointValue(baseDeck[i]));
                            }
                        }
                        console.log('-------------------------')
                    }

                    chipsOwed = 53 - opposingTeamPoints;//Positive: opposing team pays. Negative: povenost team pays
                    pointCountMessageTable.push({'name':'Distance from 53', 'value':Math.abs(chipsOwed)});
                    if (chipsOwed > 0) {
                        chipsOwed += 10;
                    } else {
                        chipsOwed -= 10;
                    }
                    pointCountMessageTable.push({'name':'Add Ten', 'value':Math.abs(chipsOwed)});
                    if (room.board.playingPrever) {
                        //Multiply by 3 instead of 2
                        chipsOwed *= 3;
                        pointCountMessageTable.push({'name':'Triple It', 'value':Math.abs(chipsOwed)});
                        if (room.players[room.board.prever].isTeamPovenost == (chipsOwed < 0)) {
                            //Prever lost
                            chipsOwed *= Math.pow(2,preverTalonStep-1);//*2 for swapping down, *4 for going back up
                            pointCountMessageTable.push({'name':'Double It For Each Prever-Talon Swap', 'value':Math.abs(chipsOwed)});
                        }
                    } else {
                        chipsOwed *= 2;
                        pointCountMessageTable.push({'name':'Double It', 'value':Math.abs(chipsOwed)});
                    }
                    chipsOwed /= 10;
                    chipsOwed = Math.round(chipsOwed);
                    pointCountMessageTable.push({'name':'Round to Nearest Ten', 'value':Math.abs(chipsOwed)});



                    if (room.board.contra[0] != -1) {
                        //*2 for one contra, *4 for two
                        chipsOwed *= Math.pow(2,room.board.contra[0]);
                        pointCountMessageTable.push({'name':'Contra', 'value':Math.abs(chipsOwed)});
                    }
                    if (room.board.contra[1] != -1) {
                        chipsOwed *= Math.pow(2,room.board.contra[1]);
                        pointCountMessageTable.push({'name':'Contra again', 'value':Math.abs(chipsOwed)});
                    }

                    if (room.board.iote != -1 || room.board.ioteWin != 0) {
                        //IOTE payout
                        if (room.players[room.board.iote] != -1) {
                            if (room.board.ioteWin == 1) {
                                //Povenost team called and won the IOTE
                                chipsOwed += 4;
                            } else if (room.board.ioteWin == -1) {
                                chipsOwed -= 4;
                            } else {
                                //Nobody played the I but it was called
                                chipsOwed += 4 * room.player[room.board.iote].isTeamPovenost ? 1 : -1;
                            }
                        } else {
                            if (room.board.ioteWin == -1) {
                                chipsOwed -= 2;
                            } else {
                                chipsOwed += 2;
                            }
                        }
                        pointCountMessageTable.push({'name':'I on the End', 'value':Math.abs(chipsOwed)});
                    }
                }
                //Possible setting: IOTE and VALAT in the same game
            }
            let team1Players = [];
            let team2Players = [];
            for (let i in room.players) {
                if (room.players[i].isTeamPovenost) {
                    team1Players.push(room.players[i]);
                } else {
                    team2Players.push(room.players[i]);
                }
            }
            for (let i in team1Players) {
                let tempChipsOwed = chipsOwed;
                if (team1Players.length == 1) {tempChipsOwed*=3;}
                team1Players[i].chips += tempChipsOwed;
            }
            for (let i in team2Players) {
                let tempChipsOwed = chipsOwed;
                if (team2Players.length == 1) {tempChipsOwed*=3;}
                team2Players[i].chips -= tempChipsOwed;
            }
            if (room.players[0].chips + room.players[1].chips + room.players[2].chips + room.players[3].chips != 400) {
                console.warn('Incorrect chip count! Total count: ' + (room.players[0].chips + room.players[1].chips + room.players[2].chips + room.players[3].chips))
                console.log('Player 1: ' + room.players[0].chips)
                console.log('Player 2: ' + room.players[2].chips)
                console.log('Player 3: ' + room.players[3].chips)
                console.log('Player 4: ' + room.players[4].chips)
            }
            if (chipsOwed < 0) {
                /* TODO: make informing the players a bit better
                    For example, in a prever game say "Prever paid" or "Prever lost"*/
                room.informPlayers('Povenost\'s team paid ' + (-chipsOwed) + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
            } else {
                room.informPlayers('Povenost\'s team received ' + chipsOwed + ' chips', MESSAGE_TYPE.PAY, pointCountMessageTable);
            }
            for (let i in room['players']) {
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    SOCKET_LIST[room['players'][i].socket].emit('returnChips', room['players'][i].chips);
                }
            }

            actionTaken = true;
            action.action = 'resetBoard';
            break;
        case 'resetBoard':
            //Reset everything for between matches. The board's properties, the players' hands, povenost alliances, moneyCards, etc.
            //Also, iterate povenost by 1
            action.player = (action.player+1)%4;
            if (action.player == room.board.povenost) {
                resetBoardForNextRound(room['board'],room.players);
                room.deck = [...baseDeck].sort(() => Math.random() - 0.5);
                action.player = room['board'].povenost;//already iterated
                action.action = 'play';
            }
            actionTaken = true;
            break;
        default:
            console.warn('Unrecognized actionCallback: ' + action.action);
            console.trace();
    }
    console.log('Next Action: ' + action.action);
    action.info = {};

    if (shouldReturnTable) {
        for (let i=0; i<4; i++) {
            if (room.players[i].type == PLAYER_TYPE.HUMAN) {
                SOCKET_LIST[room['players'][i].socket].emit('returnTable', room.board.table);
            }
        }
    }

    if (actionTaken) {

        //Sanity Check 
        if (action.player > 3 || action.player < 0) { console.warn('Illegal player number: ' + action.player + ' during action ' + action.action); action.player %= 4; }
        if (!room['players'][action.player]) { console.warn('There is no player. PN: ' + action.player + ', Players: ' + JSON.stringify(room['players'])); }


        action.time = Date.now();
        playerType = room['players'][action.player].type;

        //Prepare for auto-action if no response is given
        if (autoActionTimeout) {clearTimeout(autoActionTimeout);}
        if (room.settings.timeout > 0) {
            autoActionTimeout = setTimeout(autoAction, room.settings.timeout, action, room, action.player);
            room.autoAction = autoActionTimeout;
        }

        for (let i in room.players) {
            if (playerType == PLAYER_TYPE.HUMAN && SOCKET_LIST[room['players'][i].socket]) {
                //Return hands
                SOCKET_LIST[room['players'][i].socket].emit('returnHand', sortCards(room['players'][i].hand), false);
                //Return important info
                room.board.importantInfo.pn = (+i+1);
                SOCKET_LIST[room['players'][i].socket].emit('returnRoundInfo',room.board.importantInfo);
                room.board.importantInfo.pn = null;
            }
        }

        //Prompt the next action
        if (playerType == PLAYER_TYPE.HUMAN) {
            playerAction(action, room, action.player);
        } else if (playerType == PLAYER_TYPE.ROBOT) {
            robotAction(action, room, action.player);
        } else if (playerType == PLAYER_TYPE.AI) {
            aiAction(action, room, action.player);
        }
    }
}

function broadcast(message) {
    for (let i in SOCKET_LIST) {
        SOCKET_LIST[i].emit('broadcast', message);
    }
}//Debug function

function disconnectPlayerTimeout(socketId) {
    if (players[socketId] && players[socketId].tempDisconnect) {
        if (!players[socketId]) { return; }
        console.log('Player ' + socketId + ' disconnected');
        if (~players[socketId].room) {
            rooms[players[socketId].room]['players'][players[socketId].pn].type = PLAYER_TYPE.ROBOT;
            rooms[players[socketId].room]['players'][players[socketId].pn].socket = -1;
            rooms[players[socketId].room]['players'][players[socketId].pn].pid = -1;
            rooms[players[socketId].room]['playerCount'] = rooms[players[socketId].room]['playerCount'] - 1;
            if (rooms[players[socketId].room]['playerCount'] > 0 && rooms[players[socketId].room]['host'] == socketId) {
                for (let i in rooms[players[socketId].room]['players']) {
                    if (rooms[players[socketId].room]['players'][i].pn == PLAYER_TYPE.HUMAN) {
                        rooms[players[socketId].room]['host'] = rooms[players[socketId].room]['players'][i].socket;
                        players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost'); break;
                    }
                }
            }
            if (rooms[players[socketId].room]['playerCount'] == 0) {
                //Delete the room
                clearTimeout(rooms[players[socketId].room].autoAction);
                delete rooms[players[socketId].room];
                console.log('Stopped empty game in room ' + players[socketId].room);
            } else {
                rooms[players[socketId].room].informPlayers('Player ' + (players[socketId].pn+1) + ' disconnected',MESSAGE_TYPE.DISCONNECT);
                if (rooms[players[socketId].room].board.nextStep.player == players[socketId].pn) {
                    //Player was supposed to take an action
                    autoAction(rooms[players[socketId].room].board.nextStep, rooms[players[socketId].room], players[socketId].pn)
                }
            }
        }
        try {
            SOCKET_LIST[socketId].disconnect();
        } catch (ignore) {}
        delete players[socketId];
        delete SOCKET_LIST[socketId];

    } else {
        console.log('Player ' + socketId + ' didn\'t disconnect after all');
    }
}

function autoReconnect(socketId) {
    if (rooms[players[socketId].room]) {
        SOCKET_LIST[socketId].emit('roomConnected',players[socketId].room);
        SOCKET_LIST[socketId].emit('returnPN', players[socketId].pn, rooms[players[socketId].room].host);
        if (rooms[players[socketId].room]['board']['nextStep'].action == 'discard' ||
            rooms[players[socketId].room]['board']['nextStep'].action == 'follow') {
            SOCKET_LIST[socketId].emit('returnHand', sortCards(rooms[players[socketId].room].players[players[socketId].pn].hand), true);
        } else {
            SOCKET_LIST[socketId].emit('returnHand', sortCards(rooms[players[socketId].room].players[players[socketId].pn].hand), false);
        }
        if (!SENSITIVE_ACTIONS[rooms[players[socketId].room]['board']['nextStep'].action]) {
            SOCKET_LIST[socketId].emit('nextAction', rooms[players[socketId].room]['board']['nextStep']);
        }
        rooms[players[socketId].room]['board'].importantInfo = players[socketId].pn;
        SOCKET_LIST[socketId].emit('returnRoundInfo',rooms[players[socketId].room]['board'].importantInfo);
        rooms[players[socketId].room]['board'].importantInfo.pn = null;
        SOCKET_LIST[socketId].emit('returnSettings', rooms[players[socketId].room].settings);
        if (rooms[players[socketId].room].board.nextStep.action != 'shuffle') {
            SOCKET_LIST[socketId].emit('returnTable', rooms[players[socketId].room].board.table);
        }
        if (!isNaN(rooms[players[socketId].room].povenost)) {
            rooms[players[socketId].room].informPlayer(players[socketId].pn, 'Player ' + (rooms[players[socketId].room].povenost+1) + ' is povenost', MESSAGE_TYPE.POVENOST,{'pn':rooms[players[socketId].room].povenost});
        }
    }
}

io.sockets.on('connection', function (socket) {
    let socketId = socket.handshake.auth.token;
    if (socketId === undefined || isNaN(socketId) || socketId == 0 || socketId == null) {
        socket.disconnect();//Illegal socket
        return;
    }
    if (!SOCKET_LIST[socketId]) {
        SOCKET_LIST[socketId] = socket;
        players[socketId] = { 'id': socketId, 'pid': -1, 'room': -1, 'pn': -1, 'socket': socket, 'roomsSeen': {}, tempDisconnect: false };
        console.log('Player joined with socketID ' + socketId);
        console.log('Join time: ' + Date.now());
    }
    if (players[socketId] && players[socketId].tempDisconnect) {
        SOCKET_LIST[socketId] = socket;
        players[socketId].socket = socket;
        console.log('Player ' + socketId + ' auto-reconnected');
        players[socketId].tempDisconnect = false;
        socket.emit('message','You have been automatically reconnected');//debug
        autoReconnect(socketId);
    }

    socket.on('disconnect', function() {
        if (players[socketId] && !players[socketId].tempDisconnect) {
            players[socketId].tempDisconnect = true;
            players[socketId].roomsSeen = {};
            console.log('Player ' + socketId + ' may have disconnected');
            setTimeout(disconnectPlayerTimeout, DISCONNECT_TIMEOUT, socketId);
        }
    });

    socket.on('exitRoom', function() {
        if (players[socketId]) {
            if (~players[socketId].room) {
                console.log('Player ' + socketId + ' left room ' + players[socketId].room);
                rooms[players[socketId].room]['players'][players[socketId].pn].type = PLAYER_TYPE.ROBOT;
                rooms[players[socketId].room]['players'][players[socketId].pn].socket = -1;
                rooms[players[socketId].room]['players'][players[socketId].pn].pid = -1;
                rooms[players[socketId].room]['playerCount'] = rooms[players[socketId].room]['playerCount'] - 1;
                if (rooms[players[socketId].room]['playerCount'] > 0 && rooms[players[socketId].room]['host'] == socketId) {
                    for (let i in rooms[players[socketId].room]['players']) {
                        if (rooms[players[socketId].room]['players'][i].pn == PLAYER_TYPE.HUMAN) {
                            rooms[players[socketId].room]['host'] = rooms[players[socketId].room]['players'][i].socket;
                            players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost'); break;
                        }
                    }
                }
                if (rooms[players[socketId].room]['playerCount'] == 0) {
                    //Delete the room if no one is left in it
                    clearTimeout(rooms[players[socketId].room].autoAction);
                    delete rooms[players[socketId].room];
                    console.log('Stopped empty game in room ' + players[socketId].room);
                } else {
                    rooms[players[socketId].room].informPlayers('Player ' + (players[socketId].pn+1) + ' left the room',MESSAGE_TYPE.DISCONNECT);
                    if (rooms[players[socketId].room].board.nextStep.player == players[socketId].pn) {
                        //Player was supposed to take an action
                        autoAction(rooms[players[socketId].room].board.nextStep, rooms[players[socketId].room], players[socketId].pn)
                    }
                }
            }
            SOCKET_LIST[socketId].emit('returnRoomInfo',{});
            players[socketId]['room'] = -1;
            players[socketId]['pn'] = -1;
            players[socketId]['roomsSeen'] = {};
        }
    });

    socket.on('alive', function(callback) {
        if (players[socketId]) {
            callback(!players[socketId].tempDisconnect);//true for connected, false for disconnected
        }
    });

    socket.on('roomConnect', function (roomID) {
        let connected = false;
        if (rooms[roomID] && rooms[roomID]['playerCount'] < 4 && !rooms[roomID].settings.locked && players[socketId] && players[socketId].room == -1) {
            for (let i = 0; i < 4; i++) {
                if (rooms[roomID]['players'][i].type == PLAYER_TYPE.ROBOT) {
                    rooms[roomID].informPlayers('A new player connected: player ' + (i+1), MESSAGE_TYPE.CONNECT);
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
                            autoReconnect(socketId);
                            console.warn('ERROR: Player joined empty room with no host that was started');
                        }
                    } else {
                        autoReconnect(socketId);
                    }
                    socket.emit('timeSync', Date.now());
                    break;
                }
            }
        } else {
            console.log('Invalid attempt to connect to room ' + roomID);
            if (rooms[roomID]) {
                console.log('Room contains ' + rooms[roomID]['playerCount']);
                if (rooms[roomID].locked) {
                    console.log('Room is locked');
                }
            } else {
                console.log('Room ' + roomID + ' does not exist');
            }
            if (players[socketId]) {
                console.log('Player is in room ' + players[socketId].room);
            } else {
                console.log('Player ' + socketId + ' does not exist');
            }
        }
        if (!connected) socket.emit('roomNotConnected', roomID);
    });
    socket.on('requestTimeSync', function() {
        socket.emit('timeSync', Date.now());
    });
    socket.on('currentAction', function () {
        if (players[socketId] && rooms[players[socketId].room]) {
            console.log('Player ' + socketId + ' sent a ping');
            autoReconnect(socketId);
        }
    });
    socket.on('getRooms', function () {
        socket.emit('returnRooms', simplifiedRooms);
    });
    socket.on('settings', function (setting, rule) {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['host'] == socketId && rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
            //Update the game rules
            switch (setting) {
                case 'difficulty':
                    if (DIFFICULTY_TABLE[rule]) {
                        rooms[players[socketId].room].settings.difficulty = rule;
                        console.log('Difficulty in room ' + players[socketId].room + ' is set to ' + DIFFICULTY_TABLE[rule]);
                        rooms[players[socketId].room].informPlayers('Setting ' + setting + ' updated to ' + rule, MESSAGE_TYPE.SETTING);
                    }
                    break;
                case 'timeout':
                    if (!isNaN(rule)) {
                        if (rule <= 0) {
                            rule = 0;//No timeout for negatives
                        } else if (rule <= 20000) {
                            rule = 20000;//20 second min
                        } else if (rule >= 3600000) {
                            rule = 3600000;//One hour max
                        }
                        rooms[players[socketId].room].settings.timeout = rule;
                        console.log('Timeout in room ' + players[socketId].room + ' is set to ' + (rule/1000) + 's');
                        rooms[players[socketId].room].informPlayers('Setting ' + setting + ' updated to ' + (rule/1000) + 's', MESSAGE_TYPE.SETTING);
                    }
                    break;
                case 'lock':
                    if (rule) {
                        //Room may be locked but not unlocked
                        rooms[players[socketId].room].settings.locked = true;
                        SERVER.log('This room has been locked by the host', players[socketId].room);
                        rooms[players[socketId].room].informPlayers('The room has been locked. No more players may join', MESSAGE_TYPE.SETTING);
                    }
                    break;
            }
        }
    });
    socket.on('startGame', function () {
        if (!players[socketId]) {return;}
        if (!rooms[players[socketId].room]) { console.log('Player failed to start game'); return; }
        if (rooms[players[socketId].room]['host'] == socketId && rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], players[socketId].pn);
        } else {
            console.warn('Failed attempt to start the game in room ' + players[socketId].room + ' by player ' + socketId);
            if (rooms[players[socketId].room]['host'] == socketId) {
                //Player is host but game was already started
                console.warn('Player is host but game was already started. Informing host of the next step');
                socket.emit('nextAction', rooms[players[socketId].room]['board']['nextStep']);
            } else {
                console.warn('Player is not the host. The host is ' + rooms[players[socketId].room]['host']);
            }
        }
    });
    socket.on('play', function () {
        if (!rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action === 'play' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        } else {
            console.warn('Illegal game play attempt in room ' + players[socketId].room + ' by player ' + socketId);
        }
    });
    socket.on('shuffle', function (type, again) {
        if (!rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action === 'shuffle' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info = { type: type, again: again };
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        } else {
            console.warn('Illegal shuffle attempt in room ' + players[socketId].room + ' by player ' + socketId);
        }
    });
    socket.on('cut', function (style, location) {
        if (!rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action == 'cut' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.style = style;
            if (location && !isNaN(location) && location > 7 && location < 47) {
                rooms[players[socketId].room]['board']['nextStep'].info.location = location;
            }
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('deal', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'deal' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goPrever', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'prever' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].action = 'callPrever';
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noPrever', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'prever' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].action = 'passPrever';
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('drawTalon', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'drawTalon' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('discard', function (toDiscard) {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'discard' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            let discarded = false;
            for (let i in rooms[players[socketId].room]['players'][players[socketId]['pn']].hand) {
                if (!rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].grayed && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].suit == toDiscard.suit && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].value == toDiscard.value) {
                    rooms[players[socketId].room]['board']['nextStep'].info.card = toDiscard;
                    discarded = true;
                    actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
                }
            }
            if (!discarded) {
                players[rooms[players[socketId].room]['players'][players[socketId]['pn']].socket].socket.emit('failedDiscard', toDiscard);
            }
        }
    });
    socket.on('goBida or Uni', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'povenostBidaUniChoice' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.choice = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noBida or Uni', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'povenostBidaUniChoice' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.choice = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('moneyCards', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'moneyCards' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('choosePartner', function (partner) {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'partner' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board'].partnerCard = partner;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goPrever Talon', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'drawPreverTalon' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.accept = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noPrever Talon', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'drawPreverTalon' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.accept = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goValat', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'valat' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.valat = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noValat', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'valat' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.valat = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goContra', function () {
        if (rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'contra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'valatContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverValatContra') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.contra = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noContra', function () {
        if (rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'contra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'valatContra' || rooms[players[socketId].room]['board']['nextStep'].action == 'preverValatContra') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.contra = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('goIOTE', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'iote' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.iote = true;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('noIOTE', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'iote' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.iote = false;
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('lead', function (toPlay) {
        if (rooms[players[socketId].room] && (rooms[players[socketId].room]['board']['nextStep'].action == 'lead' || rooms[players[socketId].room]['board']['nextStep'].action == 'follow') && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            let played = false;
            for (let i in rooms[players[socketId].room]['players'][players[socketId]['pn']].hand) {
                if (!rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].grayed && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].suit == toPlay.suit && rooms[players[socketId].room]['players'][players[socketId]['pn']].hand[i].value == toPlay.value) {
                    rooms[players[socketId].room]['board']['nextStep'].info.card = toPlay;
                    played = true;
                    actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
                    break;
                }
            }
            if (!played) {
                players[rooms[players[socketId].room]['players'][players[socketId]['pn']].socket].socket.emit('failedLead', toPlay);
                console.log('Player failed to play card in room ' + players[socketId].room + ': ' + JSON.stringify(toPlay));
            }
        } else {
            console.log('Illegal card play attempt in room '  + players[socketId].room);
        }
    });
    socket.on('winTrick', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'winTrick' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('countPoints', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'countPoints' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
    socket.on('resetBoard', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'resetBoard' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
});

function numEmptyRooms() { let emptyRoomCount = 0; for (let i in rooms) { if (rooms[i].playerCount == 0 && !rooms[i].debug) emptyRoomCount++; } return emptyRoomCount; }
function checkRoomsEquality(a, b) { if (Object.keys(a).length != Object.keys(b).length) { return false; } for (let i in a) { if (a[i].count != b[i].count) { return false; } } return true; }

function tick() {
    if (!ticking) {
        ticking = true;
        for (let i in rooms) {
            //Operations
            if (rooms[i] && rooms[i].playerCount == 0 && rooms[i]['board']['nextStep']['action'] != 'start') {
                clearTimeout(rooms[i].autoAction);
                delete rooms[i];
                console.log('Stopped empty game in room ' + i);
            }
        }
        if (Object.keys(rooms).length == 0) {
            rooms['Debug'] = new Room('Debug',true);
            rooms['Main'] = new Room('Main');
        } else if (numEmptyRooms() == 0) {
            let i = 1;
            for (; rooms[i]; i++) { }
            rooms[i] = new Room(i);
        }
        simplifiedRooms = {};
        for (let i in rooms) {
            if (rooms[i] && !rooms[i].settings.locked) {
                simplifiedRooms[i] = { 'count': rooms[i].playerCount };
            }
        }
        for (let i in players) {
            if (!~players[i]['room'] && !players[i].tempDisconnect && !checkRoomsEquality(players[i].roomsSeen, simplifiedRooms)) {
                //console.log(JSON.stringify(players[i].roomsSeen) + '\n' + JSON.stringify(simplifiedRooms) + '\n' + checkRoomsEquality(players[i].roomsSeen,simplifiedRooms));
                players[i]['socket'].emit('returnRooms', simplifiedRooms);
                players[i].roomsSeen = { ...simplifiedRooms };
            }
        }
        ticking = false;
    }
}

let interval = setInterval(tick, 1000 / 60.0);//60 FPS

//Begin listening
server.listen(8442);