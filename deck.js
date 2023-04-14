const { SUIT,
    SUIT_REVERSE,
    RED_VALUE,
    BLACK_VALUE,
    TRUMP_VALUE,
    VALUE_REVERSE } = require('./enums.js')

class Deck {
    constructor() {
        this._baseDeck = this.createDeck();
        this._deck = this.shuffleDeck(3);
    }

    createDeck() {
        let theDeck = [];
        for (let s = 0; s < 4; s++)
            for (let v = 0; v < 8; v++)
                theDeck.push({ 'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v], 'suit': SUIT[s] });
        for (let v = 0; v < 22; v++)
            theDeck.push({ 'value': TRUMP_VALUE[v], 'suit': SUIT[4] });
        return theDeck;
    }

    shuffleDeck(shuffleType, cutLocation) {
        let tempDeck = [...this._baseDeck];
        cutLocation = cutLocation || tempDeck.length / 2;
        switch (shuffleType) {
            case 1: /*cut*/     this._deck = cutShuffle(tempDeck, cutLocation);
            case 2: /*riffle*/  this._deck = riffleShuffle(tempDeck, true);
            case 3: /*randomize*/this._deck = tempDeck.sort(() => Math.random() - 0.5);
            default: this._deck = [...tempDeck];
        }
    }

    cutShuffle(cutPosition) {
        if (this._deck.length >= cutPosition) { return }
        let leftSide = deck.slice(0, cutPosition);
        let rightSide = deck.slice(cutPosition + 1);
        this._deck = [...rightSide, ...leftSide];
    }

    riffleShuffle(isRandom) {
        let middle = this._deck.length / 2;
        let leftSide = this._deck.slice(0, middle);
        let rightSide = this._deck.slice(middle);
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
        this._deck = result;
    }

    static sortCards(deck) {
        return deck.sort((a, b) => (SUIT[a.suit] > SUIT[b.suit]) ? 1 : (a.suit === b.suit) ? ((Number(SUIT[a.suit] > 1 ? (SUIT[a.suit] > 3 ? TRUMP_VALUE[a.value] : RED_VALUE[a.value]) : BLACK_VALUE[a.value]) > Number(SUIT[b.suit] > 1 ? (SUIT[a.suit] > 3 ? TRUMP_VALUE[b.value] : RED_VALUE[b.value]) : BLACK_VALUE[b.value])) ? 1 : -1) : -1);
    }

    static pointValue(card) {
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
        console.trace('Illegal card. No point value for ' + card);
        return 0;
    }


    //Getters

    get deck() {
        return this._deck
    }


}

module.exports = Deck;