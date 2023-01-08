const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { diffieHellman } = require('crypto');
const app = express();

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
let simplifiedRooms = {};
let ticking = false;
let baseDeck = createDeck();
function Player(type) {this.type = type;this.socket = -1;this.pid = -1;this.chips = 100;this.discard = [];this.hand = [];this.tempHand=[];}
function Board() { this.partnerCard = ""; this.talon = []; this.table = []; this.preverTalon = []; this.preverTalonStep = 0; this.prever = -1; this.playingPrever = false; this.povenost = -1; this.nextStep = { player: 0, action: 'start', time: Date.now(), info: null }; this.cutStyle = ''; this.moneyCards = [[], [], [], []]; }
function createDeck() {
    let baseDeck = [];
    for (let s = 0; s < 4; s++)
        for (let v = 0; v < 8; v++)
            baseDeck.push({ 'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v], 'suit': SUIT[s] });
    for (let v = 0; v < 22; v++)
        baseDeck.push({ 'value': TRUMP_VALUE[v], 'suit': SUIT[4] });
    return baseDeck;
}
function shuffleDeck(deck,shuffleType) {
    let tempDeck=[...deck];
    switch (shuffleType) {
        case 1: /*cut*/     return cutShuffle(tempDeck,tempDeck.length/2);
        case 2: /*riffle*/  return riffleShuffle(tempDeck,true);
        case 3: /*randomize*/return tempDeck.sort(() => Math.random() - 0.5);
        default: return [...tempDeck];
    }
}
function cutShuffle(deck, cutPosition) {
    if (deck.length >= cutPosition) {return deck}
    let leftSide = deck.slice(0, cutPosition);
    let rightSide = deck.slice(cutPosition + 1);
    return [...rightSide, ...leftSide];
}
function riffleShuffle(deck, isRandom) {
    let middle = deck.length / 2;
    let leftSide = deck.slice(0, Math.floor(deck.length / 2));
    let rightSide = deck.slice(middle + 1);
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
function sortHand(hand) {
    return hand.sort((a, b) => (a.suit > b.suit) ? 1 : (a.suit === b.suit) ? ((a.value > b.value) ? 1 : -1) : -1);
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
function findPovenost(players) {
    let value = 1; //start with the 'II' and start incrementing to next Trump if no one has it until povenost is found
    while(true){ //loop until we find povenost
        for(let i = 0; i < 4; i++) {
            if (handContainsCard(players[i].hand, TRUMP_VALUE[value])) {
                return i; //found povenost
            }
        }
        value++;
    }
}
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
            }
        }
    } else if (leadCard.suit != 'Trump' && handHasSuit(hand, 'Trump')) {
        for (let i in hand) {
            if (hand[i].suit != 'Trump') {
                hand[i].grayed = true;
            }
        }
    }
}
function firstSelectableCard(hand) {
    for (let i in hand) {
        if (!hand[i].grayed) {
            return hand[i];
        }
    }
}
function robotDiscard(hand, difficulty) {
    switch (difficulty) {
        case 0:
            //TODO: more difficulty algos
            break;
        default:
            //select first discardable
            return firstSelectableCard(hand);
    }
}
function robotCall(difficulty) {
    switch (difficulty) {
        case 0:
            //TODO: more difficulty algos
            break;
        default:
            //select first discardable
            return;
    }
}
function robotLead(hand, difficulty) {
    switch(difficulty) {
        case 0:
            //TODO: more difficulty algos
            break;
        default:
            return firstSelectableCard(hand);
            
    }
}
function robotPlay(hand, difficulty) {
    switch (difficulty) {
        case 0:
            //TODO: more difficulty algos
            break;
        default:
            //select first selectable
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

}

function robotAction(action, room, pn) {

    let hand = room['players'][pn].hand;//linked. Changing one will change the other.

    //Takes the action automatically IF and only IF the robot is supposed to
    if (action.player == pn) {
        switch (action.action) {
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
            case 'drawTalon':
                break;
            case 'discard':
                grayUndiscardables(hand);
                action.info.card = robotDiscard(hand);
                break;
            case 'moneyCards':
                break;
            case 'moneyCardCallback':
                return;//Do nothing for this one. Don't prep for the next action. Don't remind the server. Nothing.
            case 'call':
                action.info.call = robotCall();
                break;
            case 'lead':
                action.info.card = robotLead(hand);
                break;
            case 'play':
                grayUnplayables(hand);
                action.info.card = robotPlay(hand);
                break;
            default:
                console.warn('Unknown robot action: ' + action.action);
        }
        for (let i = 0; i < 4; i++) {
            if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
        actionCallback(action, room, pn);
    }
}
function playerAction(action, room, pn) {
    //Prompts the player to take an action IF and only IF the player is supposed to
    //Works closely with action callbacks

    let hand = room['players'][pn].hand;//linked. Changing one will change the other.

    switch (action.action) {
        case 'shuffle':
        //Do nothing, because its all taken care of by the generic action sender/informer at the end
        case 'cut':
            //TODO: Should add ability to choose cut position by adding a way to select
            //      Also add ability to 'knock' and choose how cards dealt
        case 'deal':
        case 'prever':
        case 'callPrever':
        case 'passPrever':
        case 'drawTalon':
            break;
        case 'discard':
            grayUndiscardables(hand);
            players[room['players'][pn].socket].socket.emit('returnHand',hand,true);
            break;
        case 'moneyCards':
        case 'moneyCardCallback':
            break;
        case 'partner':
            //TODO: choose partner if povenost
            break;
        case 'call':
            //TODO: call something if we want
            break;
        case 'lead':
            //TODO: play card first
            break;
        case 'play':
            //TODO: play a card after someone else has lead
            grayUnplayables(hand);
            players[room['players'][pn].socket].socket.emit('returnHand', hand, true);
            break;
        default:
            console.log('Unknown action: ' + action.action);
            console.trace();
    }
    for (let i = 0; i < 4; i++) {
        if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
            players[room['players'][i].socket].socket.emit('nextAction', action);
        }
    }
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
    //The action is presumed to be verified by it's player takeAction function, not here
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

    console.log('Action taken: ' + action.player + ' took action ' + action.action + ' with info ' + JSON.stringify(action.info) + ' in room ' + room.name);

    switch (action.action) {
        case 'start':
            console.log('Game ' + room['board'].gameNumber + ' is starting in room ' + room.name);
            action.action = 'shuffle';
            action.player = pn;//PN does not change because the same person starts and shuffles
            for (let i = 0; i < 4; i++) {
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    //Starting the game is a special case. In all other cases, actions completed will inform the players through the take action methods
                    players[room['players'][i].socket].socket.emit('startingGame', room.host, i, room['board'].gameNumber);//Inform the players of game beginning. Host is assumed to be shuffler.
                }
            }
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
            if (style == 'Cut') room['deck'] = shuffleDeck(room['deck'], 1);
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
                case '12 Straight':
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 12; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                    break;
                case '12':
                    //TODO: Deal by 12s
                    let hands = [[],[],[],[]];
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 12; c++)hands[i].push(room['deck'].splice(0, 1)[0]); }
                    //have players in order choose hands
                    //TODO: Create logic for players choosing hands[(0-3)]
                    break;
                case '345':
                    for (let t = 3; t < 6; t++) {
                        for (let i = 0; i < 4; i++) {
                            for (let c = 0; c < t; c++) room['players'][i].hand.push(room['deck'].splice(0, 1)[0]);
                        }
                    }
                    break;
                default:
                    for (let i = 0; room['deck'][0]; i = (i + 1) % 4) { for (let c = 0; c < 6; c++)room['players'][i].hand.push(room['deck'].splice(0, 1)[0]); }
                //Cases 6, Cut, or any malformed cut style. Note the deck has already been cut
            }
            //sort players hands
            for (let i = 0; i < 4; i++) { room['players'][i].hand = sortHand(room['players'][i].hand) }

            if (room['board'].povenost == -1) {
                room['board'].povenost = findPovenost(room['players'])
            } else {
                room['board'].povenost = (room['board'].povenost + 1) % 4;
            }
            action.action = 'prever';
            action.player = room['board'].povenost;
            actionTaken = true;
            break;
        case 'prever':
            break;//ignore this, the callback is for the players
        case 'callPrever':
            room['board'].playingPrever = true;
            room['board'].prever = pn;
            room['board'].preverTalonStep = 0;
            action.action = 'drawPreverTalon';
            actionTaken = true;
            break;
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
        case 'drawPreverTalon':
            if (room['board'].preverTalonStep == 0) {
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                room['players'][action.player].tempHand.push(room['board'].talon.splice(0, 1)[0]);
                actionTaken = true;
                room['board'].preverTalonStep = 1;
            } else if (room['board'].preverTalonStep == 1) {
                if (action.info.accept) {
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    room['players'][action.player].hand.push(room['players'][action.player].tempHand.splice(0, 1)[0]);
                    //Prever is keeping the intial three cards and will not look at the other three.
                    //The other three cards now go into Povenost's discard pile, unless Preve is Povenost, in which case the cards go into the next player's discard pile
                    //The game then continues with Prever discarding down to 12 and point cards as normal
                    //TODO: Place talon in discard, set up next action
                } else {
                    //Prever has rejected the first three cards and will instead take the second three
                    //The original three return to the talon and the three from the talon enter the temphand. Other players are allowed to view the talon now
                    //The Prever loss multiplier is doubled here. Prever has a third and final choice to make before we may continue
                    //TODO: finish this
                }
            } else if (room['board'].preverTalonStep == 2) {
                if (action.info.accept) {
                    //Prever has claimed the second set of cards and basically the same thing happens as if prever had accepted the first half, but the loss multipler is doubled
                } else {
                    //Prever rejected the second set and returned to the first set
                    //Prever swaps the three cards with the talon and the other players are again allowed to view which cards prever rejected
                    //Finally, the remaining cards in the talon are given to the other team, the loss multiplier is doubled again (now at 4x), and play moves on to discarding
                }
            }
            break;
        case 'discard':
            let card = action.info.card;
            let discarded = false;
            if (card && card.suit && card.value) {
                for (let i in room['players'][pn].hand) {
                    if (room['players'][pn].hand[i].suit == card.suit && room['players'][pn].hand[i].value == card.value) {
                        room['players'][pn].hand.splice(i, 1);
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
                        action.action = 'moneyCards';
                    }
                }
            } else {
                players[room['players'][pn].socket].socket.emit('failedDiscard', card);
                console.log('Player ' + pn + ' failed to discard the ' + action.info.card.value + ' of ' + action.info.card.suit);
                console.log('Cards in hand: ' + JSON.stringify(room['players'][pn].hand));
            }
            break;
        case 'moneyCards':
            //Determines point which point cards the player has, starting with Povenost and rotating around. Povenost has the option to call Bida or Uni but others are called automatically

            //Needed info: trump count, 5-pointer count, trul detection
            let numTrumps = 0;
            let fiverCount = 0;
            let owedChips = 0;
            for (let i in currentHand) {
                if (currentHand[i].suit == "Trump") { numTrumps++; }
                if (currentHand[i].value == "King" || currentHand[i].value == "I" || currentHand[i].value == "XXI" || currentHand[i].value == "Skyz") { fiverCount++; }
            }
            if (numTrumps == 0) {
                //Uni
                owedChips += 4;
                room['board'].moneyCards[pn].push("Uni");
                //TODO: add choice for povenost
            } else if (numTrumps <= 2) {
                //Bida
                owedChips += 2;
                room['board'].moneyCards[pn].push("Bida");
                //TODO: add choice for povenost
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
            //Inform all players of current moneycards
            for (let i in room['players']) {
                if (i == pn) {
                    room['players'][i].chips += 3 * owedChips;
                } else {
                    room['players'][i].chips -= owedChips;
                }
                if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                    SOCKET_LIST[room['players'][i].socket].emit('returnChips', room['players'][i].chips);
                    playerAction({ 'action': 'moneyCardCallback', 'player': i, 'whoCalled': pn, 'info': room['board'].moneyCards[pn] }, room, action.player);
                } else if (room['players'][i].type == PLAYER_TYPE.ROBOT) {
                    robotAction({ 'action': 'moneyCardCallback', 'player': pn, 'info': room['board'].moneyCards[pn] }, room, action.player);
                } else if (room['players'][i].type == PLAYER_TYPE.AI) {
                    aiAction({ 'action': 'moneyCardCallback', 'player': pn, 'info': room['board'].moneyCards[pn] }, room, action.player);
                }
            }
            if (action.player == room['board'].povenost && !room['board'].playingPrever) {
                //Call for partner
                action.action = 'partner';
            }
            actionTaken = true;

            action.player = (pn + 1) % 4;
            if (action.player == room['board'].povenost) {
                action.action = 'call';
            }
            break;
        case 'partner':
            //TODO: If Povenost has the XIX, povenost may choice to call the XIX and play alone
            if (!handContainsCard(currentHand, "XIX") || (handContainsCard(currentHand, "XIX") && action.info.callXIX)) {
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
            action.action = 'moneyCards';
            action.player = (pn + 1) % 4;
            actionTaken = true;
            break;
        case 'moneyCardCallback':
            //Extra action just for informing the players. Server does not need to do anything
            break;
        case 'call':
            switch (action.info.call) {
                //TODO: call
                case 'contra':
                    room['board'].contraCount++;
                    break;
                case 'valat':
                    break;
                case 'Iote'://I on the End
                    break;
                //Pass
            }
            //Inform all players of the call, then pass to the next in line UNLESS povenost is up next, in which case move on to the first trick
        case 'lead':
            break;
        case 'play':
            break;
        case 'nextRound':
            resetBoardForNextRound(room['board']);
            action.action = 'start';
            break;
        default:
            console.warn('Unrecognized actionCallback: ' + action.action);
            console.trace();
    }
    action.info = {};
    if (actionTaken) {

        //Sanity Check 
        if (action.player > 3 || action.player < 0) { console.warn('Illegal player number: ' + action.player + ' during action ' + action.action); action.player %= 4; }
        if (!room['players'][action.player]) { console.warn('There is no player. PN: ' + action.player + ', Players: ' + JSON.stringify(room['players'])); }

        action.time = Date.now();
        playerType = room['players'][action.player].type;

        //Prompt the next action
        if (playerType == PLAYER_TYPE.HUMAN) {
            players[room['players'][action.player].socket].socket.emit('returnHand', room['players'][action.player].hand, false);
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

io.sockets.on('connection', function (socket) {
    let socketId = socket.handshake.auth.token;
    if (socketId === undefined || isNaN(socketId) || socketId == 0 || socketId == null) {
        socket.disconnect();//Illegal socket
        return;
    }
    if (!SOCKET_LIST[socketId]) {
        SOCKET_LIST[socketId] = socket;
        players[socketId] = { 'id': socketId, 'pid': -1, 'room': -1, 'pn': -1, 'socket': socket, 'roomsSeen': {} };
        console.log('Player joined with socketID ' + socketId);
    }

    socket.on('disconnect', function () {
        if (!players[socketId]) { return; }
        console.log('Player ' + socketId + ' disconnected');
        if (~players[socketId].room) {
            rooms[players[socketId].room]['players'][players[socketId].pn].type = PLAYER_TYPE.ROBOT;
            rooms[players[socketId].room]['players'][players[socketId].pn].socket = -1;
            rooms[players[socketId].room]['players'][players[socketId].pn].pid = -1;
            rooms[players[socketId].room]['playerCount'] = rooms[players[socketId].room]['playerCount'] - 1;
            if (rooms[players[socketId].room]['playerCount'] == 1 && rooms[players[socketId].room]['host'] == socketId) {
                for (let i in rooms[players[socketId].room]['players']) {
                    if (rooms[players[socketId].room]['players'][i].pn == PLAYER_TYPE.HUMAN) {
                        rooms[players[socketId].room]['host'] = rooms[players[socketId].room]['players'][i].socket;
                        players[rooms[players[socketId].room]['players'][i].socket].socket.emit('roomHost'); break;
                    }
                }
            }
            if (rooms[players[socketId].room]['playerCount'] == 0) {
                //Delete the room
                delete rooms[players[socketId].room];
                console.log('Stopped empty game in room ' + players[socketId].room);
            }
        }
        delete players[socketId];
        delete SOCKET_LIST[socketId];
    });

    socket.on('roomConnect', function (roomID) {
        let connected = false;
        if (rooms[roomID] && rooms[roomID]['playerCount'] < 4 && players[socketId].room == -1) {
            for (let i = 0; i < 4; i++) {
                if (rooms[roomID]['players'][i].type == PLAYER_TYPE.ROBOT) {
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
                            socket.emit('nextAction', rooms[players[socketId].room]['board']['nextStep']);
                        }
                    } else {
                        socket.emit('nextAction', rooms[players[socketId].room]['board']['nextStep']);
                    }
                    break;
                }
            }
        } else {
            console.log('Invalid attempt to connect to room ' + roomID);
        }
        if (!connected) socket.emit('roomNotConnected', roomID);
    });
    socket.on('currentAction', function () {
        if (rooms[players[socketId].room]) {
            socket.emit('nextAction', rooms[players[socketId].room]['board']['nextStep']);
        }
    });
    socket.on('getRooms', function () {
        socket.emit('returnRooms', simplifiedRooms);
    });
    socket.on('settings', function (setting, rule) {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['host'] == socketId && rooms[players[socketId].room]['board']['nextStep'].action == 'start') {
            //Update the game rules
        }
    });
    socket.on('startGame', function () {
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
    socket.on('shuffle', function (type, again) {
        if (!rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action === 'shuffle' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info = { type: type, again: again };
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        } else {
            console.warn('Illegal shuffle attempt in room ' + players[socketId].room + ' by player ' + socketId);
        }
    });
    socket.on('cut', function (style) {
        if (!rooms[players[socketId].room]) { return; }
        if (rooms[players[socketId].room]['board']['nextStep'].action == 'cut' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            rooms[players[socketId].room]['board']['nextStep'].info.style = style;
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
    socket.on('moneyCards', function () {
        if (rooms[players[socketId].room] && rooms[players[socketId].room]['board']['nextStep'].action == 'moneyCards' && rooms[players[socketId].room]['board']['nextStep'].player == players[socketId]['pn']) {
            actionCallback(rooms[players[socketId].room]['board']['nextStep'], rooms[players[socketId].room], rooms[players[socketId].room]['board']['nextStep'].player);
        }
    });
});

function numEmptyRooms() { let emptyRoomCount = 0; for (let i in rooms) { if (rooms[i].playerCount == 0) emptyRoomCount++; } return emptyRoomCount; }
function checkRoomsEquality(a, b) { if (Object.keys(a).length != Object.keys(b).length) { return false; } for (let i in a) { if (a[i].count != b[i].count) { return false; } } return true; }

function tick() {
    if (!ticking) {
        ticking = true;
        for (let i in rooms) {
            //Operations
            if (rooms[i] && rooms[i].playerCount == 0 && rooms[i]['board']['nextStep']['action'] != 'start') {
                delete rooms[i];
                console.log('Stopped empty game in room ' + i);
            }
        }
        if (Object.keys(rooms).length == 0) {
            rooms['Main'] = { 'name': 'Main', 'host': -1, 'board': new Board(), 'playerCount': 0, 'deck': [...baseDeck].sort(() => Math.random() - 0.5), 'players': [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)] };
        } else if (numEmptyRooms() == 0) {
            let i = 1;
            for (; rooms[i]; i++) { }
            rooms[i] = { 'name': Object.keys(rooms).length, 'host': -1, 'board': new Board(), 'playerCount': 0, 'deck': [...baseDeck].sort(() => Math.random() - 0.5), 'players': [new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT), new Player(PLAYER_TYPE.ROBOT)] };
        }
        simplifiedRooms = {};
        for (let i in rooms) {
            if (rooms[i]) simplifiedRooms[i] = { 'count': rooms[i].playerCount }; else console.log('Room ' + i + ' mysteriously vanished: ' + JSON.stringify(rooms[i]));
        }
        for (let i in players) {
            if (!~players[i]['room'] && !checkRoomsEquality(players[i].roomsSeen, simplifiedRooms)) {
                //console.log(JSON.stringify(players[i].roomsSeen) + '\n' + JSON.stringify(simplifiedRooms) + '\n' + checkRoomsEquality(players[i].roomsSeen,simplifiedRooms));
                players[i]['socket'].emit('returnRooms', simplifiedRooms);
                players[i].roomsSeen = { ...simplifiedRooms };
            }
        }
        ticking = false;
    }
}

let interval = setInterval(tick,1000/60.0);//60 FPS

//Begin listening
server.listen(8442);