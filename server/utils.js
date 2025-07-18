const { SHUFFLE_TYPE, TRUMP_VALUE, VALUE_REVERSE, VALUE_REVERSE_ACE_HIGH } = require('./enums')
const Deck = require('./deck');

function nextPlayer(pn) {
    return (pn + 1) % 4;
}

function prevPlayer(pn) {
    return (pn + 3) % 4;
}

function playerOffset(startingPlayer, offset) {
    return (+startingPlayer + +offset)%4;
}

function playerPerspective(originalPlace, viewpoint) {
    //Ex. if player 0 is povinnost and player 1 is AI, then from AI's view player 3 is povinnost
    return ((+originalPlace - +viewpoint) + 4)%4;
}

function shuffleType(givenType) {
    if (u(givenType)) {
        return SHUFFLE_TYPE.RANDOM;
    }

    return givenType > 0 && givenType < 4 ? givenType : SHUFFLE_TYPE.RANDOM;
}

function shuffleLocation(givenLocation) {
    if (u(givenLocation)) {
        return 32;
    }
    return givenLocation >= 7 && givenLocation <= 47 ? givenLocation : 32;
}


function findPovinnost(players) {
    let value = 1; //start with the 'II' and start incrementing to next Trump if no one has it until povinnost is found
    while (true) { //loop until we find povinnost
        for (let i = 0; i < 4; i++) {
            if (Deck.handContainsCard(players[i].hand, TRUMP_VALUE[value])) {
                return i; //found povinnost
            }
        }
        value++;
    }
}

function findTheI(players) {
   for (let i = 0; i < 4; i++) {
       if (Deck.handContainsCard(players[i].hand, TRUMP_VALUE[0])) {
           return i; //found the I
       }
   }

   // The I was in the prever talon and was rejected
   return -1;
}

function whoWon(table, leadPlayer, aceHigh) {
    //First card in the table belongs to the leadPlayer
    let trickLeadCard = table[0].card;
    let trickLeadSuit = trickLeadCard.suit;
    let highestTrump = -1;
    let currentWinner = 0;//LeadPlayer is assumed to be winning

    let reverseEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;

    for (let i=0; i<4; i++) {
        if (table[i].card.suit == 'Trump' && reverseEnum[table[i].card.value] > highestTrump) {
            highestTrump = reverseEnum[table[i].card.value];
            currentWinner = i;
        }
    }
    if (highestTrump != -1) {
        //If a trump was played, then the highest trump wins
        return (leadPlayer+currentWinner)%4;
    }
    let highestOfLeadSuit = reverseEnum[trickLeadCard.value];
    for (let i=1; i<4; i++) {
        if (table[i].card.suit == trickLeadSuit && reverseEnum[table[i].card.value] > highestOfLeadSuit) {
            highestOfLeadSuit = reverseEnum[table[i].card.value];
            currentWinner = i;
        }
    }
    //No trumps means that the winner is whoever played the card of the lead suit with the highest value
    return (leadPlayer+currentWinner)%4;
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

function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

function shuffleArraySeeded(array, randFn) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(randFn() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

module.exports = { prevPlayer, nextPlayer, shuffleType, shuffleLocation, u, findPovinnost, findTheI, whoWon, playerOffset, playerPerspective, shuffleArray, shuffleArraySeeded, sfc32, cyrb128 };