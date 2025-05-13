/**
 * GamePlay contains the game logic for the game - it's methods are called by the server and it calls Player methods
 */

const Deck = require('./deck');
const SERVER = require('./logger');
const { SUIT, ACTION, CUT_TYPE, SHUFFLE_TYPE, MONEY_CARDS } = require('./enums');
const { nextPlayer, prevPlayer, shuffleLocation, shuffleType, findPovinnost, u, playerOffset, findTheI } = require('./utils');

class GamePlay {
    #room;
    constructor(room) {
        this.#room = room;
    }

    get action() {
        return this.#room.board.nextStep.action;
    }

    get player() {
        return this.#room.board.nextStep.player;
    }

    get info() {
        return this.#room.board.nextStep.info;
    }

    get board() {
        return this.#room.board;
    }

    get deck() {
        return this.#room.deck;
    }

    get players() {
        return this.#room.players;
    }

    get hands() {
        return [
            this.players[0].hand,
            this.players[1].hand,
            this.players[2].hand,
            this.players[3].hand
        ];
    }

    get currentPlayer() {
        return this.players[this.player];
    }

    get currentMoneyCards() {
        return this.#room.board.moneyCards[this.player];
    }

    get povinnost() {
        return this.#room.board.povinnost;
    }

    get prever() {
        return this.#room.board.prever;
    }

    set action(action) {
        this.#room.board.nextStep.action = action;
    }

    set player(pn) {
        this.#room.board.nextStep.player = pn;
    }

    set povinnost(pn) {
        this.#room.board.povinnost = pn;
    }

    set prever(pn) {
        this.#room.board.prever = pn;
    }

    nextPlayer() {
        this.player = nextPlayer(this.player);
    }

    prevPlayer() {
        this.player = prevPlayer(this.player);
    }

    start() {
        this.board.gameNumber = 1;
        this.action = ACTION.SHUFFLE;
        //this.player = this.player; // No change, whoever called 'start' will shuffle

        this.#room.notifyStartGame();
        this.#room.updateImportantInfo();

        return true;
    }

    play() {
        this.board.gameNumber++;

        this.action = ACTION.SHUFFLE;
        this.nextPlayer();

        this.#room.updateImportantInfo();

        return true;
    }

    shuffle() {
        const type = shuffleType(this.info.type);
        const again = this.info.again;
        const location = shuffleLocation(this.info.location);

        this.deck.shuffleDeck(type, location);

        if (!again) {
            this.action = ACTION.CUT;
            this.prevPlayer();
            return true;
        }

        return false;
    }

    cut() {
        const style = this.info.style;
        const location = shuffleLocation(this.info.location);

        if (style === CUT_TYPE.CUT) {
            this.deck.shuffleDeck(SHUFFLE_TYPE.CUT, location);
        }

        this.action = ACTION.DEAL;
        this.nextPlayer();

        this.board.cutStyle = style;

        return true;
    }

    deal() {
        const style = this.board.cutStyle || CUT_TYPE.CUT;

        this.deck.dealTalon(this.board.talon);

        switch (style) {
            case CUT_TYPE.ONES:
                this.deck.dealBy(this.hands, 1);
                break;
            case CUT_TYPE.TWOS:
                this.deck.dealBy(this.hands, 2);
                break;
            case CUT_TYPE.THREES:
                this.deck.dealBy(this.hands, 3);
                break;
            case CUT_TYPE.FOURS:
                this.deck.dealBy(this.hands, 4);
                break;
            case CUT_TYPE.TWELVES:
                this.board.hands = [[],[],[],[]];
                this.deck.dealBy(this.board.hands, 12);

                this.action = ACTION.CHOICE;
                this.nextPlayer();
                return true;
            case CUT_TYPE.TWELVE_STRAIGHT:
                this.deck.dealBy(this.hands, 12);
                break;
            case CUT_TYPE.THREE_FOUR_FIVE:
                this.deck.deal345(this.hands);
                break;
            default:
                this.deck.dealBy(this.hands, 6);
        }

        if (this.povinnost === -1) {
            // First game, find povinnost
            this.povinnost = findPovinnost(this.players);
        }

        this.#room.updateDealNotation();
        this.#room.prepReturnToGame();
        this.#room.informPovinnost();

        this.action = ACTION.PREVER;
        this.player = this.povinnost;
        return true;
    }

    choice() {
        const choice = Number(this.info.choice)
        const chosenHand = this.board.hands[choice];
        if (u(chosenHand) || chosenHand === null) {
            SERVER.log('Illegal hand chosen: ' + choice + '\nLegal options: ' + Object.keys(this.board.hands));
            SERVER.log(JSON.stringify(Object.values(this.board.hands)));
            return false;
        }

        Deck.dealHand(chosenHand, this.currentPlayer.hand);

        this.board.hands[choice] = null;

        if (this.board.hands[0] || this.board.hands[1] || this.board.hands[2] || this.board.hands[3]) {
            // More players left to choose
            this.nextPlayer();
            return true;
        }

        // Done choosing, move on to Prever
        if (this.povinnost === -1) {
            // First game, find povinnost
            this.povinnost = findPovinnost(this.players);
        }

        this.#room.updateDealNotation();
        this.#room.prepReturnToGame();
        this.#room.informPovinnost();

        this.action = ACTION.PREVER;
        this.player = this.povinnost;
        return true;
    }

    drawTalon() {
        let numToDraw = 1;

        if (this.player === this.povinnost) {
            numToDraw = 4;
        }

        this.#room.informDrawTalon(this.player, numToDraw);
        Deck.dealCards(this.board.talon, this.currentPlayer.hand, numToDraw);

        this.nextPlayer();

        if (this.board.talon.length === 0) {
            this.action = ACTION.DISCARD;
            this.player = this.povinnost;
        }

        return true;
    }

    passTalon() {
        if (this.player !== playerOffset(this.povinnost, 3)) {
            // Player who would draw wants to pass to the player who normally would not draw
            this.player = playerOffset(this.povinnost, 3);
            this.action = ACTION.DRAW_TALON;
            return true;
        }

        // Player +3 has rejected the extra card (very rare)
        if (this.board.talon.length == 2) {
            // Player directly after povinnost passed and got rebuffed
            this.player = playerOffset(this.povinnost, 1);
            this.#room.informDrawTalon(this.player, 1);
            Deck.dealCards(this.board.talon, this.currentPlayer.hand, 1);
        }

        // Player across from povinnost gets the remaining card always
        this.player = playerOffset(this.povinnost, 2);
        this.#room.informDrawTalon(this.player, 1);
        Deck.dealCards(this.board.talon, this.currentPlayer.hand, 1);

        this.player = this.povinnost;
        this.action = ACTION.DISCARD;
        return true;
    }

    passPrever() {
        this.nextPlayer();

        if (this.player === this.povinnost) {
            if (this.prever !== -1) {
                this.action = ACTION.DRAW_PREVER_TALON;
                this.player = this.prever;
                this.#room.establishPreverTeams();

                this.drawPreverTalonStep1();

                return true;
            }

            this.action = ACTION.DRAW_TALON;
            return true;
        }

        this.action = ACTION.PREVER;
        return true;
    }

    callPrever() {
        this.board.playingPrever = true;
        this.prever = this.player;
        this.board.preverTalonStep = 0;
        this.#room.updateImportantPreverInfo();
        
        this.nextPlayer();
        this.action = ACTION.PREVER;
        
        if (this.player === this.povinnost) {
            // Last player called prever
            this.#room.establishPreverTeams();

            this.prevPlayer();
            this.action = ACTION.DRAW_PREVER_TALON;

            this.drawPreverTalonStep1();
        }

        return true;
    }

    drawPreverTalon() {
        if (this.board.preverTalonStep === 0) {
            this.drawPreverTalonStep1();
        } else if (this.board.preverTalonStep === 1) {
            this.drawPreverTalonStep2();
        } else if (this.board.preverTalonStep === 2) {
            this.drawPreverTalonStep3();
        }

        this.#room.updateImportantPreverMultiplierInfo();
        return true;
    }

    drawPreverTalonStep1() {
        Deck.dealCards(this.board.talon, this.currentPlayer.tempHand, 3);
        Deck.sortCards(this.currentPlayer.tempHand, this.#room.settings.aceHigh);

        this.#room.informPreverTalon(this.player, 0);

        this.board.preverTalonStep = 1;
        this.board.preverMultiplier = 1;
    }

    drawPreverTalonStep2() {
        if (this.info.accept) {
            Deck.dealCards(this.currentPlayer.tempHand, this.currentPlayer.hand, 3);
            Deck.dealCards(this.board.talon, this.#room.players[nextPlayer(this.player)].discard, 3);

            this.#room.informPreverKeptFirst();
            
            this.action = ACTION.DISCARD;
            return;
        }

        // Prever rejected the first set of cards
        Deck.copyCards(this.currentPlayer.tempHand, this.board.publicPreverTalon, 3);

        this.#room.informPreverRejectedFirst();

        Deck.dealCards(this.currentPlayer.tempHand, this.board.talon, 3);
        Deck.dealCards(this.board.talon, this.currentPlayer.tempHand, 3);

        this.#room.informPreverTalon(this.player, 1);

        this.board.preverTalonStep = 2;
        this.board.preverMultiplier = 2;
    }

    drawPreverTalonStep3() {
        if (this.info.accept) {
            // Prever has accepted the second set of 3 cards
            Deck.dealCards(this.currentPlayer.tempHand, this.currentPlayer.hand, 3);

            this.#room.markCardsAsPlayed(this.board.talon);
            this.#room.informPreverKeptSecond();

            Deck.dealCards(this.board.talon, this.#room.players[nextPlayer(this.player)].discard, 3);

            this.action = ACTION.DISCARD;
            return;
        }

        // Prever has rejected the second set of cards and will instead return to the first set
        Deck.copyCards(this.currentPlayer.tempHand, this.board.publicPreverTalon, 3);

        this.#room.informPreverRejectedSecond();

        // Move the first set of 3 from the talon to prever's hand, and the second set to an opponent's discard pile
        Deck.dealCards(this.board.talon, this.currentPlayer.hand, 3);
        Deck.dealCards(this.currentPlayer.tempHand, this.#room.players[nextPlayer(this.player)].discard, 3);

        this.#room.markCardsAsPlayed(this.board.publicPreverTalon.slice(3,6));

        this.board.preverMultiplier = 4;
        this.action = ACTION.DISCARD;
    }

    discard() {
        const card = this.info.card;

        if (!card || !Deck.moveCard(this.currentPlayer.hand, this.currentPlayer.discard, card.suit, card.value)) {
            this.#room.informFailedDiscard(this.player, card);
            return false;
        }

        if (card.suit == SUIT.TRUMP) {
            this.#room.informTrumpDiscarded(this.player, card);
        }

        if (this.currentPlayer.hand.length === 12) {
            this.nextPlayer();
        }

        if (this.currentPlayer.hand.length === 12) {
            // All players have discarded
            this.player = this.povinnost;

            if (this.board.playingPrever) {
                // Prever - no need to call partners
                this.action = ACTION.MONEY_CARDS;
            } else {
                // No prever - Povinnost will call a partner
                this.action = ACTION.PARTNER;
            }
        }

        return true;
    }

    povinnostBidaUniChoice() {
        // Player is assumed to be povinnost. This action is only taken if povinnost has bida or uni and no one is prever
        this.board.buc = this.info.choice;
        this.action = ACTION.MONEY_CARDS;
    }

    moneyCards() {
        const currentHand = this.currentPlayer.hand;
        this.currentPlayer.handRank = Deck.basicHandRanking(currentHand);

        const skipUniBida = (this.player === this.povinnost && !this.board.playingPrever && !this.board.povinnostBidaUniChoice);

        const numTrump = Deck.numOfSuit(currentHand, SUIT.TRUMP);
        const num5Count = Deck.num5Count(currentHand);
        let owedChips = 0;

        // Trump-based money cards
        if (numTrump === 0 && !skipUniBida) {
            owedChips += 4;
            this.currentMoneyCards.push(MONEY_CARDS.UNI);
        } else if (numTrump <= 2 && !skipUniBida) {
            owedChips += 2;
            this.currentMoneyCards.push(MONEY_CARDS.BIDA);
        } else if (numTrump >= 10) {
            owedChips += 4;
            this.currentMoneyCards.push(MONEY_CARDS.TAROKY);
        } else if (numTrump >= 8) {
            owedChips += 2;
            this.currentMoneyCards.push(MONEY_CARDS.TAROCKY);
        }

        // 5-count based money cards
        if (Deck.handContainsTrul(currentHand)) {
            owedChips += 2;
            this.currentMoneyCards.push(MONEY_CARDS.TRUL);
        }

        if (Deck.handContainsRosaPane(currentHand)) {
            if (num5Count > 4) {
                owedChips += 6;
                this.currentMoneyCards.push(MONEY_CARDS.ROSA_PANE_PLUS);
            } else {
                owedChips += 4;
                this.currentMoneyCards.push(MONEY_CARDS.ROSA_PANE);
            }
        } else if (num5Count >= 4) {
            owedChips += 2;
            this.currentMoneyCards.push(MONEY_CARDS.PANE);
        }

        this.#room.informMoneyCards(this.player, this.currentMoneyCards);
        this.#room.payMoneyCards(this.player, owedChips);
        this.#room.updateImportantMoneyCardsInfo();

        this.nextPlayer();
        if (this.player === this.povinnost) {
            this.action = ACTION.VALAT;
            this.board.hasTheI = findTheI(this.players);
        }

        return true;
    }
}

module.exports = GamePlay;