const { SUIT,
    SUIT_REVERSE,
    RED_VALUE,
    BLACK_VALUE,
    TRUMP_VALUE,
    VALUE_REVERSE } = require('./enums.js')

class Deck {
    constructor() {
        this._baseDeck = Deck.createDeck();
        this._deck = Deck.createDeck();
        this.shuffleDeck(3);
    }

    static createDeck() {
        let theDeck = [];
        for (let s = 0; s < 4; s++)
            for (let v = 0; v < 8; v++)
                theDeck.push({ 'value': s > 1 ? RED_VALUE[v] : BLACK_VALUE[v], 'suit': SUIT[s] });
        for (let v = 0; v < 22; v++)
            theDeck.push({ 'value': TRUMP_VALUE[v], 'suit': SUIT[4] });
        return theDeck;
    }

    shuffleDeck(shuffleType, cutLocation) {
        let tempDeck = [...this._deck];
        cutLocation = cutLocation || tempDeck.length / 2;
        switch (shuffleType) {
            case 1: /*cut*/     this.cutShuffle(cutLocation);
            case 2: /*riffle*/  this.riffleShuffle(true);
            case 3: /*randomize*/this._deck = tempDeck.sort(() => Math.random() - 0.5);
            default: this._deck = [...tempDeck];
        }
    }

    cutShuffle(cutPosition) {
        if (this._deck.length >= cutPosition) { return }
        let leftSide = this._deck.slice(0, cutPosition);
        let rightSide = this._deck.slice(cutPosition + 1);
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

    splice(start, end) {
        return this._deck.splice(start, end);
    }

    static sortCards(toSort) {
        toSort = toSort.sort((a, b) => {
             if (SUIT_REVERSE[a.suit] > SUIT_REVERSE[b.suit]) {
                return 1;
             } else if (SUIT_REVERSE[a.suit] < SUIT_REVERSE[b.suit]) {
                return -1;
             }

             if (VALUE_REVERSE[a.value] > VALUE_REVERSE[b.value]) {
                return 1;
             } else if (VALUE_REVERSE[a.value] < VALUE_REVERSE[b.value]) {
                return -1;
             }
             console.log('Cards are the same: ' + JSON.stringify(a) + ' ' + JSON.stringify(b));
             return 0;//Cards are the same

             //James' sort function (which used to work but for some reason just reverses the order of the cards now?
             /*return (SUIT[a.suit] > SUIT[b.suit]) ? 1 :
            (a.suit === b.suit) ? (
                (Number(SUIT[a.suit] > 1 ? (
                    SUIT[a.suit] > 3 ?
                        TRUMP_VALUE[a.value]
                        : RED_VALUE[a.value])
                    : BLACK_VALUE[a.value]) > Number(SUIT[b.suit] > 1 ? (
                        SUIT[a.suit] > 3 ?
                            TRUMP_VALUE[b.value] :
                        RED_VALUE[b.value]) :
                    BLACK_VALUE[b.value])) ? 1 : -1) : -1;*/
        });
        //console.log(JSON.stringify(toSort));
        return toSort;
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