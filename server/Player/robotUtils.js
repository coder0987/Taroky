const { TRUMP_VALUE, VALUE_REVERSE_ACE_HIGH, VALUE_REVERSE } = require("../enums");

function highestUnplayedTrump(booleanArray) {
    for (let i=53; i>=32; i--) {
        if (!booleanArray[i]) {
            //This trump has not been played
            return {suit:'Trump', value:TRUMP_VALUE[i - 32]};
        }
    }
    return {suit:'Trump', value:'I'};
}
function whoIsWinning(table, aceHigh) {
    let trickLeadCard = table[0];
    let trickLeadSuit = trickLeadCard.suit;
    let highestTrump = -1;
    let currentWinner = 0;//LeadPlayer is assumed to be winning

    let reverseEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;

    for (let i=0; i<table.length; i++) {
        if (table[i].suit == 'Trump' && reverseEnum[table[i].value] > highestTrump) {
            highestTrump = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    if (highestTrump != -1) {
        //If a trump was played, then the highest trump wins
        return table[currentWinner];
    }
    let highestOfLeadSuit = reverseEnum[trickLeadCard.value];
    for (let i=1; i<table.length; i++) {
        if (table[i].suit == trickLeadSuit && reverseEnum[table[i].value] > highestOfLeadSuit) {
            highestOfLeadSuit = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    return table[currentWinner];
}

module.exports = {
    highestUnplayedTrump,
    whoIsWinning
}