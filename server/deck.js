const { SUIT,
    SUIT_REVERSE,
    RED_VALUE,
    RED_VALUE_ACE_HIGH,
    BLACK_VALUE,
    TRUMP_VALUE,
    VALUE_REVERSE,
    VALUE_REVERSE_ACE_HIGH } = require('./enums.js')
const SERVER = require('./logger.js');

//To sort Spades, Hearts, Clubs, Diamonds, Trump and prevent similar colors from touching
const SUIT_SORT_ORDER = {
    Spade: 0, Club: 2, Heart: 1, Diamond: 3, Trump: 4
}

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

    static sortCards(toSort, aceHigh) {
        let valueEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;
        toSort = toSort.sort((a, b) => {
             if (SUIT_SORT_ORDER[a.suit] > SUIT_SORT_ORDER[b.suit]) {
                return 1;
             } else if (SUIT_SORT_ORDER[a.suit] < SUIT_SORT_ORDER[b.suit]) {
                return -1;
             }

             if (valueEnum[a.value] > valueEnum[b.value]) {
                return 1;
             } else if (valueEnum[a.value] < valueEnum[b.value]) {
                return -1;
             }
             SERVER.debug('Cards are the same: ' + JSON.stringify(a) + ' ' + JSON.stringify(b));
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

    static handContainsCard(handToCheck, cardName) {
        for (let i in handToCheck) {
            if (handToCheck[i].value == cardName) {
                return true;
            }
        }
        return false;
    }
    static handHasSuit(handToCheck, suitToCheck) {
        for (let i in handToCheck) {
            if (handToCheck[i].suit == suitToCheck) {
                return true;
            }
        }
        return false;
    }
    static handContains(handToCheck, valueToCheck, suitToCheck) {
        for (let i in handToCheck) {
            if (handToCheck[i].value == valueToCheck && handToCheck[i].suit == suitToCheck) {
                return true;
            }
        }
        return false;
    }
    static isCardPlayable(hand, card, leadCard) {
        if (Deck.handHasSuit(hand, leadCard.suit)) {
            return card.suit == leadCard.suit;
        } else if (leadCard.suit != 'Trump' && Deck.handHasSuit(hand, 'Trump')) {
            return card.suit == 'Trump';
        } else {
            return true;
        }
    }

    static cardId(card, aceHigh) {
        let valueEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;
        return VALUE_REVERSE[card.value] + SUIT_REVERSE[card.suit] * 8;
    }


    static possiblePartners(hand) {
        let partners = [];
        //can always partner with XIX
        partners.push({ 'value': 'XIX', 'suit': SUIT[4] });
        //if we hold XIX we can partner with the next lowest trump we don't hold, down to the XV
        if (Deck.handContainsCard(hand, 'XIX')) {
            for (let v = 17; v >= 14; v--) {
                //18 is XIX and 14 is XV
                if (!Deck.handContainsCard(hand, TRUMP_VALUE[v])) {
                    partners.push({ 'value': TRUMP_VALUE[v], 'suit': SUIT[4] });
                    break;
                }
            }
        }
        return partners;
    }
    static grayUndiscardables(hand) {
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
        //If everything is King and Trump, only gray 5-pointers
        for (let i in hand) {
            if (!hand[i].grayed) {
                return false;
            }
        }
        Deck.unGrayCards(hand);
        for (let i in hand) {
            if (hand[i].value == 'King' || hand[i].value == 'I' || hand[i].value == 'XXI' || hand[i].value == 'Skyz') {
                hand[i].grayed = true;
            } else {
                hand[i].grayed = false;
            }
        }
        return true;
    }
    static grayUnplayables(hand, leadCard) {
        if (Deck.handHasSuit(hand, leadCard.suit)) {
            for (let i in hand) {
                if (hand[i].suit != leadCard.suit) {
                    hand[i].grayed = true;
                } else {
                    hand[i].grayed = false;
                }
            }
        } else if (leadCard.suit != 'Trump' && Deck.handHasSuit(hand, 'Trump')) {
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
    static grayTheI(hand) {
        for (let i in hand) {
            if (hand[i].suit == 'Trump' && hand[i].value == 'I') {
                hand[i].grayed = true;
            }
        }
        return hand;//should be linked as well
    }
    static grayTheXXI(hand) {
        for (let i in hand) {
            if (hand[i].suit == 'Trump' && hand[i].value == 'XXI') {
                hand[i].grayed = true;
            }
        }
        return hand;//should be linked as well
    }
    static unGrayCards(hand) {
        //Used to un-gray cards before a player leads
        for (let i in hand) {
            hand[i].grayed = false;
        }
    }
    static numOfSuit(hand, suit) {
        let suitCount = 0;
        for (let i in hand) {
            if (hand[i].suit == suit) {
                suitCount++;
            }
        }
        return suitCount;
    }
    static selectCardOfSuit(hand, suit) {
        for (let i in hand) {
            if (hand[i].suit == suit) {
                return hand[i];
            }
        }
        SERVER.warn('Illegal card selection. No cards of suit ' + suit + ' in hand ' + hand);
        return;
    }
    static handWithoutGray(hand) {
        let newHand = [...hand];//Not linked
        for (let i=newHand.length-1; i>=0; i--) {
            if (newHand[i].grayed) {
                newHand.splice(i,1);
            }
        }
        return newHand;
    }
    static highestPointValue(hand) {
        let pv = hand[0];
        for (let i in hand) {
            if (Deck.pointValue(hand[i]) > Deck.pointValue(pv)) {
                pv = hand[i];
            }
        }
        return pv;
    }
    static lowestPointValue(hand) {
        let pv = hand[0];
        for (let i in hand) {
            if (Deck.pointValue(hand[i]) < Deck.pointValue(pv)) {
                pv = hand[i];
            }
        }
        return pv;
    }
    static lowestTrump(hand) {
        //Assuming the inserted hand is all trump
        let lowest = hand[0];
        for (let i in hand) {
            if (VALUE_REVERSE[lowest.value] > VALUE_REVERSE[hand[i].value]) {
                lowest = hand[i];
            }
        }
        return lowest;
    }
    static highestTrump(hand) {
        //Assuming the inserted hand is all trump
        let highest = hand[0];
        for (let i in hand) {
            if (VALUE_REVERSE[highest.value] < VALUE_REVERSE[hand[i].value]) {
                highest = hand[i];
            }
        }
        return highest;
    }
    static lowestTrumpThatBeats(hand, card) {
        //Assuming the inserted hand is all trump
        let lowest = Deck.highestTrump(hand);
        if (VALUE_REVERSE[card.value] > VALUE_REVERSE[lowest.value]) {
            //No cards can win
            return Deck.lowestTrump(hand);
        }
        for (let i in hand) {
            if (VALUE_REVERSE[lowest.value] > VALUE_REVERSE[hand[i].value] &&
                VALUE_REVERSE[card.value] < VALUE_REVERSE[hand[i].value]) {
                lowest = hand[i];
            }
        }
        return lowest;
    }
    static firstSelectableCard(hand) {
        for (let i in hand) {
            if (!hand[i].grayed) {
                return hand[i];
            }
        }
        SERVER.trace('ERROR: No cards were ungrayed. Returning first card in hand.');
        return hand[0];
    }
    static firstSelectableCardExceptPagat(hand) {
        for (let i in hand) {
            if (!hand[i].grayed && hand[i].value != 'I') {
                return hand[i];
            }
        }
        return {suit: 'Trump', value: 'I'};
    }
    static trumpChain(hand) {
        //Returns the number of guaranteed tricks from a hand (trump only)
        let guarantees = 0;
        let misses = 0;
        for (let i = Object.keys(TRUMP_VALUE).length - 1; i>=0; i--) {
            if (Deck.handContainsCard(hand,TRUMP_VALUE[i])) {
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
    static unbrokenTrumpChain(hand) {
        let guarantees = 0;
        for (let i=TRUMP_VALUE.length-1; i>=0; i++) {
            if (Deck.handContainsCard(hand,TRUMP_VALUE[i])) {
                guarantees++;
            } else {
                return guarantees;
            }
        }
        return guarantees;
    }
    static basicHandRanking(hand) {
        /*Returns a point-value estimate of how good a hand is
        Points are given for:
            -Voided suits (2pt each)
            -Trump
            -Trump again, if higher than XV
            -Trump chain, for each guaranteed win trump (Skyz, then XXI, then XX, etc)
            -Kings/5-point cards
        */
        let handRankingPoints = 0;
        handRankingPoints += Deck.trumpChain(hand);
        for (let i in hand) {
            if (hand[i].suit == 'Trump') {
                handRankingPoints++;
                if (VALUE_REVERSE[hand[i].value] >= 14) {
                    handRankingPoints++;
                }
            }
            if (Deck.pointValue(hand[i]) == 5) {
                handRankingPoints++;
            }
        }
        for (let i=0; i<4; i++) {
            if (Deck.numOfSuit(hand,SUIT[i]) == 0) {
                handRankingPoints+=2;
            }
        }
        return handRankingPoints;
    }

    static cardsToNotation(cards) {
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
           SERVER.error('Cards could not be notated: ' + JSON.stringify(cards) + '\n' + err);
       }
       return theNotation;
   }

    //Getters
    get deck() {
        return this._deck
    }

}

module.exports = Deck;