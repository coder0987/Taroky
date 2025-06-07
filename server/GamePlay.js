/**
 * GamePlay contains the game logic for the game - it's methods are called by the server and it calls Player methods
 */

const GameManager = require('./GameManager');
const gm = GameManager.INSTANCE;

const Deck = require('./deck');
const SERVER = require('./logger');
const { SUIT, ACTION, CUT_TYPE, SHUFFLE_TYPE, MONEY_CARDS, PLAYER_TYPE, TRUMP_VALUE, VALUE, ROOM_TYPE } = require('./enums');
const { nextPlayer, prevPlayer, shuffleLocation, shuffleType, findPovinnost, u, playerOffset, findTheI, whoWon } = require('./utils');
const RobotAuto = require('./Player/RobotAuto');

class GamePlay {
    #room;
    constructor(room) {
        this.#room = room;
    }

    get nextStep() {
        return this.#room.board.nextStep;
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

    get settings() {
        return this.#room.settings;
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

    get playingPrever() {
        return this.#room.board.playingPrever;
    }

    // Setters

    set action(action) {
        this.#room.board.nextStep.action = action;
    }

    set player(pn) {
        this.#room.board.nextStep.player = pn;
    }

    set time(time) {
        this.#room.board.nextStep.time = time;
    }

    set info(info) {
        this.#room.board.nextStep.info = info;
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

    nextPlayerOnTeam(team) {
        do {
            this.nextPlayer()
        } while (this.currentPlayer.isTeamPovinnost === team);
    }

    prevPlayer() {
        this.player = prevPlayer(this.player);
    }

    actionCallback() {
        // A player has made a decision and submitted the move
        SERVER.functionCall('GP.actionCallback', {name:'action', value: this.action}, {name:'Info', value: JSON.stringify(this.info)}, {name: 'pn', value: this.player});

        let actionTaken = false;

        switch (this.action) {
            case ACTION.START:
                actionTaken = this.start();
                break;
            case ACTION.PLAY:
                actionTaken = this.play();
                break;
            case ACTION.SHUFFLE:
                actionTaken = this.shuffle();
                break;
            case ACTION.CUT:
                actionTaken = this.cut();
                break;
            case ACTION.DEAL:
                actionTaken = this.deal();
                break;
            case ACTION.CHOICE:
                actionTaken = this.choice();
                break;
            case ACTION.PREVER:
                break;//ignore this, the callback is for the players
            case ACTION.DRAW_TALON:
                actionTaken = this.drawTalon();
                break;
            case ACTION.PASS_TALON:
                actionTaken = this.passTalon();
                break;
            case ACTION.PASS_PREVER:
                actionTaken = this.passPrever();
                break;
            case ACTION.CALL_PREVER:
                actionTaken = this.callPrever();
                break;
            case ACTION.DRAW_PREVER_TALON:
                actionTaken = this.drawPreverTalon();
                break;
            case ACTION.DISCARD:
                actionTaken = this.discard();
                break;
            case ACTION.POVINNOST_BIDA_UNI_CHOICE:
                this.povinnostBidaUniChoice();
                // Intentional fallthrough
            case ACTION.MONEY_CARDS:
                actionTaken = this.moneyCards();
                break;
            case ACTION.PARTNER:
                actionTaken = this.partner();
                break;
            case ACTION.VALAT:
                actionTaken = this.valat();
                break;
            case ACTION.IOTE:
                actionTaken = this.iote();
                break;
            case ACTION.PREVER_CONTRA:
                actionTaken = this.preverContra();
                break;
            case ACTION.VALAT_CONTRA:
            case ACTION.PREVER_VALAT_CONTRA:
                actionTaken = this.preverValatContra();
                break;
            case ACTION.CONTRA:
                actionTaken = this.contra();
                break;
            case ACTION.LEAD:
                actionTaken = this.lead();
                break;
            case ACTION.FOLLOW:
                actionTaken = this.follow();
                break;
            case ACTION.WIN_TRICK:
                actionTaken = this.winTrick();
                break;
            case ACTION.COUNT_POINTS:
                actionTaken = this.countPoints();
                break;
            case ACTION.RESET:
                actionTaken = this.reset();
                break;
            default:
                SERVER.warn('Unrecognized actionCallback: ' + this.action, this.#room.name);
                SERVER.trace('', this.#room.name);
        }

        this.info = {};

        if (!actionTaken) {
            return;
        }

        if (!this.currentPlayer) {
            SERVER.trace();
            SERVER.error('Illegal player in actionCallback');
            this.player = 0;
        }

        this.time = Date.now();

        this.#room.resetAutoAction();
        this.#room.updateImportantUsernamesInfo();
        this.#room.informActionTaken();

        this.currentPlayer.next();
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
        this.prevPlayer();

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

        this.player = Deck.getPlayerToDiscard(this.hands, this.povinnost);

        if (this.player === -1) {
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

    partner() {
        const possiblePartners = Deck.possiblePartners(this.currentPlayer.hand);
        if (possiblePartners.some(p => p.value === this.board.partnerCard.value)) {
            this.board.partnerCard = this.board.partnerCard.value;
        } else {
            this.board.partnerCard = "XIX";
        }

        for (let i=0; i<4; i++) {
            this.players[i].isTeamPovinnost = Deck.handContainsCard(this.players[i].hand, this.board.partnerCard);
        }

        this.currentPlayer.isTeamPovinnost = true;
        this.currentPlayer.publicTeam = 1;

        if (Deck.numOfSuit(this.currentPlayer.hand, SUIT.TRUMP) <= 2) {
            this.action = ACTION.POVINNOST_BIDA_UNI_CHOICE;
        } else {
            this.action = ACTION.MONEY_CARDS;
        }

        this.#room.informPartnerCard();
        this.#room.updatePartnerCardInfo();

        return true;
    }

    valat() {
        if (!this.info.valat) {
            this.nextPlayer();

            if (this.player === this.povinnost) {
                this.player = findTheI(this.players);
                this.action = ACTION.IOTE;

                if (this.player === -1) {
                    this.action = ACTION.PREVER_CONTRA;
                    this.player = nextPlayer(this.prever);
                    this.board.firstContraPlayer = this.player;
                }
            }

            return true;
        }

        // Called valat

        this.board.valat = this.player;

        this.#room.informCalledValat(this.player);
        this.#room.updateImportantValatInfo();

        if (this.playingPrever) {
            this.action = ACTION.PREVER_VALAT_CONTRA;

            if (this.prever != this.player) {
                // Opposing team called valat
                this.player = this.prever;
            } else {
                // Prever call valat
                this.player = nextPlayer(this.prever);
            }

            this.board.firstContraPlayer = this.player;
            return true;
        }

        this.action = ACTION.VALAT_CONTRA;

        if (this.currentPlayer.isTeamPovinnost) {
            // Povinnost's team called valat
            this.player = nextPlayer(this.povinnost);
            if (this.currentPlayer.isTeamPovinnost) {
                this.nextPlayer();
            }

            this.board.firstContraPlayer = this.player;
            return true;
        }

        // Non-povinnost team called valat
        this.player = this.povinnost;
        this.board.firstContraPlayer = this.player;
        return true;
    }

    iote() {
        if (this.info.iote) {
            this.board.iote = this.player;
            this.#room.informIOTECalled(this.player);
            this.#room.updateImportantIOTEInfo();
        }

        if (this.playingPrever) {
            this.action = ACTION.PREVER_CONTRA;
            this.player = nextPlayer(this.prever);
            this.board.firstContraPlayer = this.player;
            return true;
        }

        this.action = ACTION.CONTRA;
        this.player = nextPlayer(this.povinnost);
        if (this.currentPlayer.isTeamPovinnost) {
            this.nextPlayer();
        }

        this.board.firstContraPlayer = this.player;

        return true;
    }

    preverContra() {
        const preverIsPovinnost = this.prever === this.povinnost;

        if (this.info.contra) {
            // Someone called contra

            this.#room.informCalledContra(this.player);

            if (this.currentPlayer.isTeamPovinnost === preverIsPovinnost) {
                // Povinnost's team called rhea-contra
                this.board.contra[1] = 1;
                this.board.rheaContra = this.player;

                // Give a chance at supra-contra
                this.nextPlayerOnTeam(preverIsPovinnost);

                // Reset for the next cycle
                this.board.firstContraPlayer = this.player;

                return true;
            }

            // Non-povinnost team called contra
            if (this.board.contra[0] === -1) {
                // Contra
                this.board.contra[0] = 1;
                this.board.calledContra = this.player;

                // Give a change at rhea-contra
                this.nextPlayerOnTeam(!preverIsPovinnost);
                
                // Reset for the next cycle
                this.board.firstContraPlayer = this.player;

                return true;
            }

            // Supra-contra
            this.board.contra[0] = 2;
            this.board.supraContra = this.player;

            this.action = ACTION.LEAD;
            this.player = this.povinnost;
            this.board.leadPlayer = this.player;

            this.#room.sendTable();

            return true;
        }

        // This player did not call contra
        if (this.currentPlayer.isTeamPovinnost === preverIsPovinnost) {
            // Give another player the chance to call rhea-contra
            this.nextPlayerOnTeam(!preverIsPovinnost);

            if (this.currentPlayer !== this.board.firstContraPlayer) {
                return true;
            }

            // Everyone passed, no more contra
            this.action = ACTION.LEAD;
            this.player = this.povinnost;
            this.board.leadPlayer = this.player;

            this.#room.sendTable();

            return true;
        }

        // Chance at contra or supra-contra
        this.nextPlayerOnTeam(preverIsPovinnost);

        if (this.currentPlayer === this.board.firstContraPlayer) {
            return true;
        }

        // Everyone passed, no more contra
        this.action = ACTION.LEAD;
        this.player = this.povinnost;
        this.board.leadPlayer = this.player;

        this.#room.sendTable();

        return true;
    }

    preverValatContra() {
        const povinnostIsValat = this.players[this.board.valat].isTeamPovinnost;

        if (this.info.contra) {
            // Someone called contra during a called valat

            this.#room.informCalledContra(this.player);

            if (this.currentPlayer === povinnostIsValat) {
                // Rhea-contra
                this.board.contra[1] = 1;
                this.board.rheaContra = this.player;
                this.currentPlayer.publicTeam = 1;

                this.nextPlayerOnTeam(povinnostIsValat);

                this.board.firstContraPlayer = this.player;

                return true;
            }

            // Contra or supra-contra
            if (this.board.contra[0] === -1) {
                // Contra
                this.board.contra[0] = 1;
                this.board.calledContra = this.player;
                this.currentPlayer.publicTeam = -1;

                this.nextPlayerOnTeam(!povinnostIsValat);

                this.board.firstContraPlayer = this.player;

                return true;
            }

            // Supra-contra
            this.board.contra[0] = 2;
            this.board.supraContra = this.player;
            this.currentPlayer.publicTeam = -1;

            this.action = ACTION.LEAD;
            this.player = this.povinnost;
            this.board.leadPlayer = this.player;

            this.#room.sendTable();

            return true;
        }

        // Player did not call contra
        if (this.currentPlayer.isTeamPovinnost === povinnostIsValat) {
            this.nextPlayerOnTeam(!povinnostIsValat);

            if (this.player !== this.board.firstContraPlayer) {
                return true;
            }

            //Everyone passed
            this.action = ACTION.LEAD;
            this.player = this.povinnost;
            this.board.leadPlayer = this.player;

            this.#room.sendTable();

            return true;
        }

        // Chance to call contra or supra-contra
        this.nextPlayerOnTeam(povinnostIsValat);

        if (this.player !== this.board.firstContraPlayer) {
            return true;
        }

        //Everyone passed
        this.action = ACTION.LEAD;
        this.player = this.povinnost;
        this.board.leadPlayer = this.player;

        this.#room.sendTable();

        return true;
    }

    contra() {
        if (this.info.contra) {
            // Someone called contra
            this.#room.informCalledContra(this.player);

            if (this.currentPlayer.isTeamPovinnost) {
                // Povinnost's team called rhea-contra
                this.board.contra[1] = 1;
                this.board.rheaContra = this.player;
                this.currentPlayer.publicTeam = 1;

                this.nextPlayerOnTeam(true);

                this.board.firstContraPlayer = this.player;

                return true;
            }

            // Non-povinnost's team called contra or supra-contra
            if (this.board.contra[0] === -1) {
                // Contra
                this.board.contra[0] = 1;
                this.board.calledContra = this.player;
                this.currentPlayer.publicTeam = -1;

                this.nextPlayerOnTeam(false);

                this.board.firstContraPlayer = this.player;

                return true;
            }

            // Supra-contra
            this.board.contra[0] = 2;
            this.board.supraContra = this.player;
            this.currentPlayer.publicTeam = -1;

            this.action = ACTION.LEAD;
            this.player = this.povinnost;
            this.board.leadPlayer = this.player;

            this.#room.sendTable();

            return true;
        }

        // Contra was not called
        if (this.currentPlayer.isTeamPovinnost) {
            this.nextPlayerOnTeam(false);

            if (this.player !== this.board.firstContraPlayer) {
                return true;
            }

            // Everyone passed
            this.action = ACTION.LEAD;
            this.player = this.povinnost;
            this.board.leadPlayer = this.player;

            this.#room.sendTable();

            return true;
        }

        this.nextPlayerOnTeam(true);

        if (this.player !== this.board.firstContraPlayer) {
            return true;
        }

        // Everyone passed
        this.action = ACTION.LEAD;
        this.player = this.povinnost;
        this.board.leadPlayer = this.player;

        this.#room.sendTable();

        return true;
    }

    lead() {
        this.#room.updateImportantContraInfo(); // Why call here instead of in contra? not sure

        const lead = Deck.removeCard(this.currentPlayer.hand, this.info.card);

        if (!lead || !lead.suit || !lead.value) {
            SERVER.error('No lead card!');
            return false;
        }

        this.board.table.push( { card: lead, pn: this.player, lead: true} );
        this.board.leadCard = lead;
        
        this.trackCards(lead);

        this.#room.informCardLead(this.player, lead);

        this.action = ACTION.FOLLOW;
        this.nextPlayer();

        this.#room.sendTable();

        return true;
    }

    follow() {
        const card = Deck.removeCard(this.currentPlayer.hand, this.info.card);

        if (!card) {
            SERVER.error('Failed to follow!');
            return false;
        }

        this.board.table.push( { card: card, pn: this.player, lead: false} );

        this.nextPlayer();

        this.trackCards(card);

        this.#room.informCardPlayed(this.player, card);
        
        this.#room.sendTable();

        if (this.player !== this.board.leadPlayer) {
            return true;
        }

        // Trick finished
        this.action = ACTION.WIN_TRICK;

        const trickWinner = whoWon(this.board.table, this.board.leadPlayer, this.settings.aceHigh);

        this.player = trickWinner;

        this.#room.informWonTrick(this.player);

        return true;
    }

    winTrick() {
        this.#room.updateTrickHistory(this.player);

        const tableCards = [];

        tableCards.push(this.#room.board.table.splice(0,1)[0].card)
        tableCards.push(this.#room.board.table.splice(0,1)[0].card)
        tableCards.push(this.#room.board.table.splice(0,1)[0].card)
        tableCards.push(this.#room.board.table.splice(0,1)[0].card)

        Deck.copyCards(tableCards, this.currentPlayer.discard, 4);

        if (this.currentPlayer.isTeamPovinnost) {
            this.board.trickWinCount[0]++;
        } else {
            this.board.trickWinCount[1]++;
        }

        this.board.leadPlayer = this.player;
        this.action = ACTION.LEAD;

        this.board.table = [];
        this.#room.sendTable();

        if (this.currentPlayer.hand.length === 0) {
            this.action = ACTION.COUNT_POINTS;
            this.player = this.povinnost;

            // Also check for one on the end
            if (!Deck.handContainsCard(tableCards, VALUE.I)) {
                // One was not played
                return true;
            }

            if (Deck.numOfSuit(tableCards, SUIT.TRUMP) > 1) {
                // Another trump was played

                if (this.players[this.board.hasTheI].isTeamPovinnost) {
                    // Povinnost's team lost the I
                    this.board.ioteWin = -1;
                } else {
                    this.board.ioteWin = 1;
                }

                return true;
            }

            // the I won

            if (this.players[this.board.hasTheI].isTeamPovinnost) {
                // Povinnost's team won the I
                this.board.ioteWin = 1;
            } else {
                this.board.ioteWin = -1;
            }
        }

        return true;
    }

    countPoints() {
        const pointCountMessageTable = [];
        let chipsOwed = 0;

        let povinnostTeamDiscard = [];
        let opposingTeamDiscard = [];
        for (let i in this.players) {
            if (this.players[i].isTeamPovinnost) {
                povinnostTeamDiscard = povinnostTeamDiscard.concat(this.players[i].discard);
            } else {
                opposingTeamDiscard = opposingTeamDiscard.concat(this.players[i].discard);
            }
            this.players[i].discard = [];
        }

        if (this.board.valat !== -1) {
            // Called valat
            if (this.players[this.board.valat].isTeamPovinnost) {

                //Povinnost's team called valat
                if (this.board.trickWinCount[1] > 0) {
                    //Opposing team won a trick
                    chipsOwed = -40;
                    if (this.prever !== -1) {
                        chipsOwed = -60;
                    }
                    pointCountMessageTable.push({'name':'Failed a Called Valat', 'value':Math.abs(chipsOwed)});
                } else {
                    chipsOwed = 40;
                    if (this.playingPrever) {
                        chipsOwed = 60;
                    }
                    pointCountMessageTable.push({'name':'Won a Called Valat', 'value':chipsOwed});
                }
            } else {
                //Opposing team called valat
                if (this.board.trickWinCount[0] > 0) {
                    //Povinnost team won a trick
                    chipsOwed = 40;
                    if (this.playingPrever) {
                        chipsOwed = 60;
                    }
                    pointCountMessageTable.push({'name':'Failed a Called Valat', 'value':chipsOwed});
                } else {
                    chipsOwed = -40;
                    if (this.playingPrever) {
                        chipsOwed = -60;
                    }
                    pointCountMessageTable.push({'name':'Won a Called Valat', 'value':Math.abs(chipsOwed)});
                }
            }

            this.payChips(pointCountMessageTable, chipsOwed);
            
            this.#room.deck.deck = Deck.simulateCounting(povinnostTeamDiscard, opposingTeamDiscard);
            return true;
        }

        // No called valat

        if (this.board.trickWinCount[0] === 0) {
            chipsOwed = 20;
            if (this.playingPrever) {
                chipsOwed = 30;
            }
            pointCountMessageTable.push({'name':'Valat', 'value':chipsOwed});

            this.payChips(pointCountMessageTable, owedChips);
            
            this.#room.deck.deck = Deck.simulateCounting(povinnostTeamDiscard, opposingTeamDiscard);
            return true;
        }

        if (this.board.trickWinCount[1] === 0) {
            //Opposing team valat'd
            chipsOwed = -20;
            if (this.playingPrever) {
                chipsOwed = -30;
            }
            pointCountMessageTable.push({'name':'Valat', 'value':Math.abs(chipsOwed)});

            this.payChips(pointCountMessageTable, owedChips);
            
            this.#room.deck.deck = Deck.simulateCounting(povinnostTeamDiscard, opposingTeamDiscard);
            return true;
        }

        // No valat

        let povinnostTeamPoints = 0;
        let opposingTeamPoints = 0;
        for (let i in povinnostTeamDiscard) {
            povinnostTeamPoints += Deck.pointValue(povinnostTeamDiscard[i]);
        }
        for (let i in opposingTeamDiscard) {
            opposingTeamPoints += Deck.pointValue(opposingTeamDiscard[i]);
        }
        pointCountMessageTable.push({'name':'Povinnost Team Points', 'value':povinnostTeamPoints});
        pointCountMessageTable.push({'name':'Opposing Team Points', 'value':opposingTeamPoints});

        if (povinnostTeamPoints + opposingTeamPoints != 106) {
            // oopsie
            SERVER.error('Total points is not 106', this.#room.name);
        }

        chipsOwed = 53 - opposingTeamPoints;//Positive: opposing team pays. Negative: povinnost team pays

        pointCountMessageTable.push({'name':'Distance from 53', 'value':Math.abs(chipsOwed)});
        if (chipsOwed > 0) {
            chipsOwed += 10;
        } else {
            chipsOwed -= 10;
        }
        pointCountMessageTable.push({'name':'Add Ten', 'value':Math.abs(chipsOwed)});
        if (this.playingPrever) {
            //Multiply by 3 instead of 2
            chipsOwed *= 3;
            pointCountMessageTable.push({'name':'Triple It', 'value':Math.abs(chipsOwed)});
        } else {
            chipsOwed *= 2;
            pointCountMessageTable.push({'name':'Double It', 'value':Math.abs(chipsOwed)});
        }
        chipsOwed /= 10;
        chipsOwed = (chipsOwed < 0) ? -Math.round(Math.abs(chipsOwed)) : Math.round(chipsOwed);
        pointCountMessageTable.push({'name':'Round to Nearest Ten', 'value':Math.abs(chipsOwed)});

        if (this.playingPrever && this.players[this.prever].isTeamPovinnost == (chipsOwed < 0)) {
            //Prever lost
            chipsOwed *= this.board.preverMultiplier;//*2 for swapping down, *4 for going back up
            pointCountMessageTable.push({'name':'Double It For Each Prever-Talon Swap', 'value':Math.abs(chipsOwed)});
        }

        if (this.board.contra[0] != -1) {
            //*2 for one contra, *4 for two
            chipsOwed *= Math.pow(2, this.board.contra[0]);
            pointCountMessageTable.push({'name':'Contra', 'value':Math.abs(chipsOwed)});
        }
        if (this.board.contra[1] != -1) {
            chipsOwed *= Math.pow(2, this.board.contra[1]);
            pointCountMessageTable.push({'name':'Contra again', 'value':Math.abs(chipsOwed)});
        }

        if (this.board.iote != -1 || this.board.ioteWin != 0) {
            //IOTE payout
            if (this.board.iote != -1) {
                //I was called
                if (this.board.ioteWin == 1) {
                    //Povinnost team called and won the IOTE
                    chipsOwed += 4;
                } else if (this.board.ioteWin == -1) {
                    chipsOwed -= 4;
                } else {
                    //Nobody played the I but it was called
                    chipsOwed += (this.players[this.board.hasTheI].isTeamPovinnost ? -4 : 4);
                }
            } else {
                //Not called but played on the last trick
                if (this.board.ioteWin == -1) {
                    chipsOwed -= 2;
                } else {
                    chipsOwed += 2;
                }
            }
            pointCountMessageTable.push({'name':'I on the End', 'value':Math.abs(chipsOwed)});
        }


        this.payChips(pointCountMessageTable, chipsOwed);
            
        this.#room.deck.deck = Deck.simulateCounting(povinnostTeamDiscard, opposingTeamDiscard);
        return true;
    }

    payChips(messageTable, chipsOwed) {
        let team1Players = [];
        let team2Players = [];
        for (let i in this.players) {
            if (this.players[i].isTeamPovinnost) {
                team1Players.push(this.players[i]);
                team1Players[team1Players.length - 1].pn = i;
            } else {
                team2Players.push(this.players[i]);
                team2Players[team2Players.length - 1].pn = i;
            }
        }

        this.#room.payWinnings(team1Players, team2Players, chipsOwed);
        this.#room.informFinalPoints(team1Players, team2Players, chipsOwed, messageTable);
        this.#room.informGameNotation();
        this.#room.updateImportantInfo();

        if (this.#room.type !== ROOM_TYPE.CHALLENGE) {
            this.action = ACTION.RESET;
            return true;
        }

        for (let i in this.players) {
            if (this.players[i].type == PLAYER_TYPE.HUMAN) {
                this.player = i;
                break;
            }
        }

        this.currentPlayer.socket.emit('challengeComplete', this.currentPlayer.chips - 100);

        gm.challenge.complete(this.currentPlayer.username, this.currentPlayer.chips - 100);


        gm.sendLeaderboardToAll();

        this.action = 'retry';
    }

    reset() {
        this.nextPlayer();

        if (this.#room.stop) {
            return false;
        }

        if (this.player !== this.povinnost) {
            return true;
        }

        this.#room.resetForNextRound();
        this.player = this.povinnost;
        this.action = ACTION.PLAY;

        return true;
    }

    trackCards(card) {
        this.board.cardsPlayed[Deck.cardId(card, this.#room.settings.aceHigh)] = true;

        if (card.value === this.board.partnerCard) {
            this.currentPlayer.publicTeam = 1;
            for (let i in this.players) {
                if (this.players[i].publicTeam == 0) {
                    this.players[i].publicTeam = -1;
                }
            }
        }
    }

    autoAction() {
        if (!this.#room || !this.#room.players) {
            return; // room has been deleted
        }

        this.currentPlayer.consecutiveAutos++;

        if (this.currentPlayer.type === PLAYER_TYPE.HUMAN) {
            // Let them know
            if (this.currentPlayer.consecutiveAutos > 10) {
                this.currentPlayer.socket.disconnect();
                this.currentPlayer.client.startDisconnectTimeout();
                return;
            } else {
                this.currentPlayer.socket.emit('autoAction', this.nextStep);
            }
        }

        let fakeMoneyCards = false;

        switch (this.action) {
            case ACTION.CUT:
                this.info.cut = CUT_TYPE.CUT;
                break;
            case ACTION.CHOICE:
                this.info.choice = RobotAuto.robotChooseHand(this.board.hands);
                break;
            case ACTION.PREVER:
                this.action = ACTION.PASS_PREVER;
                break;
            case ACTION.DISCARD:
                Deck.grayUndiscardables(this.currentPlayer.hand);
                this.info.card = RobotAuto.robotDiscard(this.currentPlayer.hand);
                break;
            case ACTION.POVINNOST_BIDA_UNI_CHOICE:
                fakeMoneyCards = true;
                this.action = ACTION.MONEY_CARDS;
                room.board.buc = false;
                break;
            case ACTION.PARTNER:
                this.info.partner = RobotAuto.robotPartner(this.currentPlayer.hand);
                break;
            case ACTION.VALAT:
                this.info.valat = RobotAuto.robotCall(this.currentPlayer.hand);
                break;
            case ACTION.IOTE:
                this.info.iote = RobotAuto.robotIOTE(this.currentPlayer.hand);
                this.actionCallback();
                return;
            case ACTION.CONTRA:
            case ACTION.PREVER_CONTRA:
            case ACTION.PREVER_VALAT_CONTRA:
            case ACTION.VALAT_CONTRA:
                this.info.contra = RobotAuto.robotContra(this.currentPlayer.hand);
                this.actionCallback();
                return;
            case ACTION.LEAD:
                Deck.unGrayCards(this.currentPlayer.hand);
                this.info.card = RobotAuto.robotLead(this.currentPlayer.hand, this.#room);
                break;
            case ACTION.FOLLOW:
                Deck.grayUnplayables(this.currentPlayer.hand, this.board.leadCard);
                this.info.card = RobotAuto.robotPlay(this.currentPlayer.hand, this.#room);
                break;
            default: {}
        }

        this.#room.informNextAction();

        if (fakeMoneyCards) {
            this.action = ACTION.POVINNOST_BIDA_UNI_CHOICE;
        }

        this.actionCallback();
    }
}

module.exports = GamePlay;