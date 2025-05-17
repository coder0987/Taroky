const { PLAYER_TYPE, NUM_AVATARS, SHUFFLE_TYPE, CUT_TYPE, ACTION, DIFFICULTY, BOT_SPEEDS } = require('../enums');
const Player = require('./Player');
const RobotAuto = require('./RobotAuto');
const RobotBeginner = require('./RobotBeginner');
const RobotEasy = require('./RobotEasy');
const RobotNormal = require('./RobotNormal');
const RobotHard = require('./RobotHard');
const RobotRuthless = require('./RobotRuthless');
const Deck = require('../deck');

class RobotPlayer extends Player {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5

    #difficulty;
    #logic;

    #timeout;

    constructor( args = {} ) {
        if (args.old) {
            super( args.old );
        } else {
            super(args);
        }

        this.type = PLAYER_TYPE.ROBOT;
        this.avatar = Math.floor(Math.random() * NUM_AVATARS + 1);

        this.room = args.room;

        this.updateDifficulty();
    }

    updateDifficulty() {
        this.#difficulty = this.room.settings.difficulty;
        switch (this.#difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
                this.#logic = RobotRuthless;
                break;
            case DIFFICULTY.HARD:
                this.#logic = RobotHard;
                break;
            case DIFFICULTY.NORMAL:
                this.#logic = RobotNormal;
                break;
            case DIFFICULTY.EASY:
                this.#logic = RobotEasy;
                break;
            case DIFFICULTY.BEGINNER:
                this.#logic = RobotBeginner;
                break;
            default:
                this.#logic = RobotAuto;
        }
    }

    get timeout() {
        return this.#timeout;
    }

    submit(long = 0) {
        this.#timeout = setTimeout(() => {
            if (!this.room) {
                return;
            }

            this.room.gameplay.actionCallback();
        }, BOT_SPEEDS[long]);
    }

    clearTimeout() {
        this.clearTimeout(this.#timeout);
    }
    
    start() {
        this.submit();
    }

    play() {
        this.submit();
    }

    shuffle() {
        this.info.type = Math.random(1,3);
        this.info.again = Math.random(0,10) > 8;

        if (this.info.type === SHUFFLE_TYPE.CUT) {
            this.info.location = Math.random(7,47);
        }

        this.submit();
    }

    cut() {
        this.info.style = this.room.botCutChoice;
        if (this.info.style === CUT_TYPE.CUT) {
            this.info.location = this.room.botCutLoc;
        }

        this.submit();
    }

    deal() {
        this.submit();
    }

    twelves() {
        this.info.choice = RobotAuto.robotChooseHand(this.room.board.hands);

        this.submit();
    }

    prever() {
        this.updateDifficulty()

        this.action.action = this.#logic.robotPrever(this.hand, this.room);

        this.submit();
    }

    drawPreverTalon() {
        this.info.accept = this.#logic.robotPreverTalon(this.hand, this.tempHand, this.room);

        this.submit();
    }

    drawTalon() {
        this.submit();
    }

    discardAction() {
        Deck.grayUndiscardables(this.hand);
        this.info.card = this.#logic.robotDiscard(this.hand);

        this.submit();
    }

    bidaUniChoice() {
        this.room.board.buc = this.#logic.robotPovinnostBidaUniChoice(this.hand);

        this.room.board.nextStep.action = ACTION.MONEY_CARDS;

        this.submit();

        return true;
    }
    
    moneyCards() {
        this.submit();
    }

    partner() {
        this.info.partner = this.#logic.robotPartner(this.hand);

        this.submit();
    }

    valat() {
        this.info.valat = this.#logic.robotCall(this.hand);

        this.submit();
    }

    contra() {
        this.info.contra = this.#logic.robotContra(this.hand);

        this.submit();
    }

    iote() {
        this.info.iote = this.#logic.robotIOTE(this.hand);

        this.submit();
    }

    lead() {
        Deck.unGrayCards(this.hand);

        this.info.card = this.#logic.robotLead(this.hand, this.room);

        this.submit(1);
    }

    follow() {
        Deck.grayUnplayables(this.hand, this.room.board.leadCard);

        this.info.card = this.#logic.robotPlay(this.hand, this.room);

        this.submit(1);
    }

    win() {
        this.submit(1);
    }

    count() {
        this.submit();
    }

    reset() {
        this.submit();
    }
}

module.exports = RobotPlayer;