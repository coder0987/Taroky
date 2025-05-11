/**
 * GamePlay contains the game logic for the game - it's methods are called by the server and it calls Player methods
 */

const Deck = require('./deck');
const SERVER = require('./logger');
const { ACTION, CUT_TYPE, SHUFFLE_TYPE } = require('./enums');
const { nextPlayer, shuffleLocation, shuffleType, findPovinnost, u } = require('./utils');

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

    set action(action) {
        this.#room.board.nextStep.action = action;
    }

    set player(pn) {
        this.#room.board.nextStep.player = pn;
    }

    nextPlayer() {
        this.player = nextPlayer(this.player);
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
            this.nextPlayer();
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
                //TODO
            case CUT_TYPE.TWELVE_STRAIGHT:
                this.deck.dealBy(thgis.hands, 12);
                break;
            case CUT_TYPE.THREE_FOUR_FIVE:
                this.deck.deal345(this.hands);
                break;
            default:
                this.deck.dealBy(this.hands, 6);
        }

        if (this.board.povinnost === -1) {
            // First game, find povinnost
            this.board.povinnost = findPovinnost(this.players);
        }

        this.#room.updateDealNotation();
        this.#room.prepReturnToGame();
        this.#room.informPovinnost();

        this.action = ACTION.PREVER;
        this.player = this.board.povinnost;
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
        if (this.board.povinnost === -1) {
            // First game, find povinnost
            this.board.povinnost = findPovinnost(this.players);
        }

        this.#room.updateDealNotation();
        this.#room.prepReturnToGame();
        this.#room.informPovinnost();

        this.action = ACTION.PREVER;
        this.player = this.board.povinnost;
        return true;
    }
}

module.exports = GamePlay;