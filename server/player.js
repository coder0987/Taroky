const Deck = require('./deck.js');
const AI = require('./AI.js');
const SERVER = require('./logger.js');
const http = require('http');

class Player {
    constructor(type, ai) {
        this._type = type;
        this._socket = -1;
        this._messenger = null;
        this._pid = -1;
        this._chips = 100;
        this._discard = [];
        this._hand = [];
        this._tempHand = [];
        this._isTeamPovenost = false;
        this._publicTeam = 0;
        this._savePoints = [];
        this._consecutiveAutos = 0;
        this._ai = ai;//AI is a string representing the AI's ID on the remote AI server
    }

    resetForNextRound() {
        this.hand = [];
        this.discard = [];
        this.tempHand = [];
        this.isTeamPovenost = false;
        this._publicTeam = 0;
    }

    createAI() {
        const options = {
            hostname: 'localhost',
            path: '/' + this._ai + '/create/',
            method: 'GET',
            protocol: 'http:',
            port: 8441
        };
        const req = http.request(options, (res) => {
            SERVER.debug('AI creation status: ' + res.statusCode);
        }).on("error", (err) => {
            SERVER.error(err);
        });
        req.end();
    }

    win() {
        const options = {
            hostname: 'localhost',
            path: '/' + this._ai + '/win/',
            method: 'GET',
            protocol: 'http:',
            port: 8441,
            headers: {
                ids: ['latest','1','2','3']
            }
        };
        const req = http.request(options, (res) => {
            SERVER.debug('AI win status: ' + res.statusCode);
        }).on("error", (err) => {
            SERVER.error(err);
        });
        req.end();
    }

    trainPersonalizedAI(room, pn, actionNumber, outputNumber, cardPrompt, value, save) {
        if (this._socket == -1 || players[this._socket].username == 'Guest') {
            return;
        }
        SERVER.debug('Training player ' +  players[this._socket].username);

        const dataToSend = AI.generateInputs(room,pn,actionNumber,cardPrompt);
        //dataToSend is already a binary buffer of 1s and 0s
        const options = {
            hostname: 'localhost',
            path: '/trainPlayer/' + players[this._socket].username,
            method: 'POST',
            protocol: 'http:',
            port: 8441,
            headers: {
                'output': outputNumber,
                'value': value
            }
        };
        if (save) {
            options.headers.save = 'true';
        }
        const req = http.request(options, (res) => {
            SERVER.debug('Personalized AI training status: ' + res.statusCode);
        }).on("error", (err) => {
            SERVER.error(err);
        });
        req.setTimeout(10000);//10 seconds max
        req.end(dataToSend);
    }

    handContainsCard(cardName) {
        for (let i in this._hand) {
            if (this._hand[i].value == cardName) {
                if (this._hand[i].suit !== 'Trump') {
                    console.trace('ERROR: Do not use Player.handContainsCard(cardName) method for checking for non-Trump suited cards. Returning false.')
                    break;
                }
                return true;
            }
        }
        return false;
    }

    handHasSuit(suitToCheck) {
        for (let i in this._hand) {
            if (this._hand[i].suit == suitToCheck) {
                return true;
            }
        }
        return false;
    }

    handContains(valueToCheck, suitToCheck) {
        for (let i in this._hand) {
            if (this._hand[i].value == valueToCheck && this._hand[i].suit == suitToCheck) {
                return true;
            }
        }
        return false;
    }

    isCardPlayable(card, leadCard) {
        if (this.handHasSuit(leadCard.suit)) {
            return card.suit == leadCard.suit;
        } else if (leadCard.suit != 'Trump' && this.handHasSuit('Trump')) {
            return card.suit == 'Trump';
        } else {
            return true;
        }
    }

    //Gray-Out Functions
    grayUndiscardables() {
        let hasNonTrump = false;
        for (let i in this._hand) {
            if (this._hand[i].suit != 'Trump') {
                hasNonTrump = true;
                break;
            }
        }
        for (let i in this._hand) {
            if ((hasNonTrump && this._hand[i].suit == 'Trump') || this._hand[i].value == 'King' || this._hand[i].value == 'I' || this._hand[i].value == 'XXI' || this._hand[i].value == 'Skyz') {
                this._hand[i].grayed = true;
            } else {
                this._hand[i].grayed = false;
            }
        }
    }
    grayUnplayables(leadCard) {
        if (this.handHasSuit(leadCard.suit)) {
            for (let i in this._hand) {
                if (this._hand[i].suit != leadCard.suit) {
                    this._hand[i].grayed = true;
                } else {
                    this._hand[i].grayed = false;
                }
            }
        } else if (leadCard.suit != 'Trump' && this.handHasSuit( 'Trump')) {
            for (let i in this._hand) {
                if (this._hand[i].suit != 'Trump') {
                    this._hand[i].grayed = true;
                } else {
                    this._hand[i].grayed = false;
                }
            }
        } else {
            //Has neither lead suit nor trump. Can play anything
            for (let i in this._hand) {
                this._hand[i].grayed = false;
            }
        }
    }
    unGrayCards() {
        //Used to un-gray cards before a player leads
        for (let i in this._hand) {
            this._hand[i].grayed = false;
        }
    }
    numOfSuit(suit) {
        let suitCount = 0;
        for (let i in this._hand) {
            if (this._hand[i].suit == suit) {
                suitCount++;
            }
        }
        return suitCount;
    }
    selectCardOfSuit(suit) {
        for (let i in this._hand) {
            if (this._hand[i].suit == suit) {
                return this._hand[i];
            }
        }
        console.warn('Illegal card selection. No cards of suit ' + suit + ' in hand ' + this._hand);
        return;
    }
    handWithoutGray() {
        let newHand = [...this._hand];//Not linked
        for (let i = newHand.length - 1; i >= 0; i--) {
            if (newHand[i].grayed) {
                newHand.splice(i, 1);
            }
        }
        return newHand;
    }

    highestPointValueCard() {
        let highest = this._hand[0];
        for (let i in this._hand) {
            if (Deck.pointValue(this._hand[i]) > Deck.pointValue(highest)) {
                highest = this._hand[i];
            }
        }
        return highest;
    }

    possiblePartners() {
        let partners = [];
        //can always partner with XIX
        partners.push({ 'value': 'XIX', 'suit': SUIT[4] });
        //if we hold XIX we can partner with the next lowest trump we don't hold, down to the XV
        if (this.handContainsCard( 'XIX')) {
            for (let v = 17; v >= 15; v--) {
                if (!this.handContains( TRUMP_VALUE[v])) {
                    partners.push({ 'value': TRUMP_VALUE[v]-1, 'suit': SUIT[4] });
                    break;
                }
            }
        }
        return partners;
    }

    //Returns the number of guaranteed tricks from a hand (trump only)
    trumpChain(hand) {
        
        let guarantees = 0;
        let misses = 0;
        for (let i = TRUMP_VALUE.length - 1; i >= 0; i++) {
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

    unbrokenTrumpChain(hand) {
        let guarantees = 0;
        for (let i = TRUMP_VALUE.length - 1; i >= 0; i++) {
            if (handContainsCard(TRUMP_VALUE[i])) {
                guarantees++;
            } else {
                return guarantees;
            }
        }
        return guarantees;
    }

    basicHandRanking() {
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
        for (let i in this._hand) {
            if (hand[i].suit == 'Trump') {
                handRankingPoints++;
                if (VALUE_REVERSE(this._hand[i].value) >= 14) {
                    handRankingPoints++;
                }
            }
            if (pointValue(this._hand[i]) == 5) {
                handRankingPoints++;
            }
        }
        for (let i = 0; i < 4; i++) {
            if (numOfSuit(SUIT[i] == 0)) {
                handRankingPoints++;
            }
        }
        return handRankingPoints;
    }

    //Setters
    set type(type) {
        this._type = type;
    }

    set socket(socket) {
        this._socket = socket;
    }

    set pid(pid) {
        this._pid = pid;
    }

    set chips(chips) {
        this._chips = chips;
    }

    set discard(discard) {
        this._discard = discard;
    }

    set hand(hand) {
        this._hand = hand;
    }

    set tempHand(tempHand) {
        this._tempHand = tempHand;
    }

    set isTeamPovenost(isTeamPovenost) {
        this._isTeamPovenost = isTeamPovenost;
    }

    set publicTeam(publicTeam) {
        this._publicTeam = publicTeam;
    }

    set ai(ai) {
        this._ai = ai;
    }

    set messenger(messenger) {
        this._messenger = messenger;
    }

    //Getters
    get type() {
        return this._type;
    }

    get socket() {
        return this._socket;
    }

    get pid() {
        return this._pid;
    }

    get chips() {
        return this._chips;
    }

    get discard() {
        return this._discard;
    }

    get hand() {
        return this._hand;
    }

    get tempHand() {
        return this._tempHand;
    }

    get isTeamPovenost() {
        return this._isTeamPovenost;
    }

    get publicTeam() {
        return this._publicTeam;
    }

    get ai() {
        return this._ai;
    }

    get messenger() {
        return this._messenger;
    }
}

module.exports = Player;