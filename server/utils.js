const { SHUFFLE_TYPE, TRUMP_VALUE, VALUE_REVERSE, VALUE_REVERSE_ACE_HIGH } = require('./enums')
const Deck = require('./deck');

function nextPlayer(pn) {
    return (pn + 3) % 4;
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
    let trickLeadCard = table[0];
    let trickLeadSuit = trickLeadCard.suit;
    let highestTrump = -1;
    let currentWinner = 0;//LeadPlayer is assumed to be winning

    let reverseEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;

    for (let i=0; i<4; i++) {
        if (table[i].suit == 'Trump' && reverseEnum[table[i].value] > highestTrump) {
            highestTrump = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    if (highestTrump != -1) {
        //If a trump was played, then the highest trump wins
        return (leadPlayer+currentWinner)%4;
    }
    let highestOfLeadSuit = reverseEnum[trickLeadCard.value];
    for (let i=1; i<4; i++) {
        if (table[i].suit == trickLeadSuit && reverseEnum[table[i].value] > highestOfLeadSuit) {
            highestOfLeadSuit = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    //No trumps means that the winner is whoever played the card of the lead suit with the highest value
    return (leadPlayer+currentWinner)%4;
}

function playerOffset(startingPlayer, offset) {
    return (+startingPlayer + +offset)%4;
}

function playerPerspective(originalPlace, viewpoint) {
    //Ex. if player 0 is povinnost and player 1 is AI, then from AI's view player 3 is povinnost
    return ((+originalPlace - +viewpoint) + 4)%4;
}

function u(v) {
    if (typeof v === 'undefined') {
        return true;
    }
    return false;
}

module.exports = { nextPlayer, shuffleType, shuffleLocation, u, findPovinnost, findTheI, whoWon, playerOffset, playerPerspective };