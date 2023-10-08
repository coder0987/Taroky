const math = require('mathjs');
const Deck = require('./deck.js');
const { Buffer } = require('node:buffer');
const { SUIT,
    SUIT_REVERSE,
    RED_VALUE,
    BLACK_VALUE,
    TRUMP_VALUE,
    VALUE_REVERSE,
    DIFFICULTY,
    DIFFICULTY_TABLE,
    MESSAGE_TYPE,
    PLAYER_TYPE } = require('./enums.js');

class AI {
    static sigmoid(z) {
        if (z<-10) {return 0;}
        else if (z>10) {return 1;}
        return 1 / (1 + Math.exp(-z));
    }

    static beginTraining() {
        throw "not ready yet";
        //Create 1 training room. Player 0 is the current winner
        let trainingRoom = new Room({'name':'TRAINING','trainingRoom':true,'logLevel':0,'settings':{'difficulty':DIFFICULTY.AI, 'timeout': 60000, 'locked':true}})
        rooms['TRAINING'] = trainingRoom;
        trainingRoom.players = [
            new Player(PLAYER_TYPE.AI, 'trainAI/latest'),
            new Player(PLAYER_TYPE.AI, 'trainAI/1'),
            new Player(PLAYER_TYPE.AI, 'trainAI/2'),
            new Player(PLAYER_TYPE.AI, 'trainAI/3')
        ];
        for (let i in trainingRoom.players) {
            trainingRoom.players[i].createAI();
        }

        //Play game

        //Reset game and rotate (do 4x)

        //Find winner
        trainingRoom.winner.win();
    }

    static generateInputs(room, pn, action, cardPrompt) {
        function vl(c,l,t) {
            if (c != l) {
                SERVER.error('Current length: ' + c + ', Should be: ' + l + ', After tally: ' + t);
            }
        }

        const thePlayers = room.players;
        const theBoard = room.board;
        let inputs = [];

        //Chips
        inputs.push(thePlayers[playerOffset(pn, 0)].chips>100?1:0);
        inputs.push(thePlayers[playerOffset(pn, 1)].chips>100?1:0);
        inputs.push(thePlayers[playerOffset(pn, 2)].chips>100?1:0);
        inputs.push(thePlayers[playerOffset(pn, 3)].chips>100?1:0);

        vl(inputs.length,4,'chips');

        //Povinnost
        let povinnostVector = new Array(4).fill(0);
        if (theBoard.povinnost != -1) {
            povinnostVector[playerPerspective(theBoard.povinnost, pn)] = 1;
        }
        inputs = inputs.concat(povinnostVector);

        vl(inputs.length,8,'povinnost');

        //Prever
        let preverVector = new Array(4).fill(0);
        if (theBoard.prever != -1) {
            preverVector[playerPerspective(theBoard.prever, pn)] = 1;
        }
        inputs = inputs.concat(preverVector);

        vl(inputs.length,12,'prever');

        //Prever talon doubling
        inputs.push(theBoard.preverTalonStep > 1 ? 1 : 0);
        inputs.push(theBoard.preverTalonStep > 2 ? 1 : 0);

        vl(inputs.length,14,'ptd');

        //Moneycards
        let moneyCardsVector = new Array(32).fill(0);
        const decodeMoneyCards = {'Uni':0,'Bida':1,'Taroky':2,'Tarocky':3,'Trul':4,'Rosa-Honery+':5,'Rosa-Honery':6,'Honery':7};
        for (let i in theBoard.moneyCards) {
            for (let j in theBoard.moneyCards[i]) {
                moneyCardsVector[decodeMoneyCards[j]*4 + playerPerspective(i,pn)];
            }
        }
        inputs = inputs.concat(moneyCardsVector);

        vl(inputs.length,46,'moneycards');

        //Valat
        let valatVector = new Array(4).fill(0);
        if (theBoard.valat != -1) {
            valatVector[playerPerspective(theBoard.valat, pn)] = 1;
        }
        inputs = inputs.concat(valatVector);

        vl(inputs.length,50,'valat');

        //I on the End
        let ioteVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            ioteVector[playerPerspective(theBoard.iote, pn)] = 1;
        }
        inputs = inputs.concat(ioteVector);

        vl(inputs.length,54,'chips');

        //Contra
        let contraVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            contraVector[playerPerspective(theBoard.calledContra, pn)] = 1;
        }
        inputs = inputs.concat(contraVector);

        vl(inputs.length,58,'contra');

        //Rhea-Contra
        let rheaContraVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            rheaContraVector[playerPerspective(theBoard.rheaContra, pn)] = 1;
        }
        inputs = inputs.concat(rheaContraVector);

        vl(inputs.length,62,'rhea-contra');

        //Supra-contra
        let supraContraVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            supraContraVector[playerPerspective(theBoard.supraContra, pn)] = 1;
        }
        inputs = inputs.concat(supraContraVector);

        vl(inputs.length,66,'supra-contra');

        //PartnerCard
        inputs.push(theBoard.partnerCard == 'XIX' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XVIII' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XVII' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XVI' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XV' ? 1 : 0);
        inputs.push(Deck.handContains(thePlayers[pn].hand,theBoard.partnerCard) ? 1 : 0);

        vl(inputs.length,72,'partnercard');

        //CURRENT TRICK INFORMATION
        let leaderVector = new Array(4).fill(0);
        if (theBoard.leadPlayer != -1) {
            leaderVector[theBoard.leadPlayer] = 1;
        }
        inputs = inputs.concat(leaderVector);
        let myPositionInTrickVector = new Array(4).fill(0);
        if (theBoard.leadPlayer != -1) {
            myPositionInTrickVector[playerPerspective(theBoard.leadPlayer,pn)] = 1;
        }
        inputs = inputs.concat(myPositionInTrickVector);
        inputs = inputs.concat(cardToVector(theBoard.table[0]));
        inputs = inputs.concat(cardToVector(theBoard.table[1]));
        inputs = inputs.concat(cardToVector(theBoard.table[2]));

        //TRICK HISTORY
        for (let i = 0; i<12; i++) {
            if (theBoard.trickHistory[i]) {
                inputs.push(1);
                let trickLeaderVector = new Array(4).fill(0);
                trickLeaderVector[theBoard.trickHistory[i].leadPlayer] = 1;
                inputs = inputs.concat(trickLeaderVector);

                let myPositionInHistoryTrickVector = new Array(4).fill(0);
                myPositionInHistoryTrickVector[playerPerspective(theBoard.trickHistory[i].leadPlayer,pn)] = 1;
                inputs = inputs.concat(myPositionInHistoryTrickVector);

                let trickWinnerVector = new Array(4).fill(0);
                trickWinnerVector[theBoard.trickHistory[i].winner] = 1;
                inputs = inputs.concat(trickWinnerVector);

                inputs = inputs.concat(cardToVector(theBoard.trickHistory[i].cards[0]));
                inputs = inputs.concat(cardToVector(theBoard.trickHistory[i].cards[1]));
                inputs = inputs.concat(cardToVector(theBoard.trickHistory[i].cards[2]));
                inputs = inputs.concat(cardToVector(theBoard.trickHistory[i].cards[3]));
            } else {
                inputs = inputs.concat(new Array(121).fill(0));
            }
        }

        //MY HAND
        for (let i=0; i<16; i++) {
            inputs = inputs.concat(cardToVector(thePlayers[pn].hand[i]));
        }

        //PREVER TALON
        for (let i=0; i<6; i++) {
            inputs = inputs.concat(cardToVector(theBoard.publicPreverTalon[i]));
        }
        inputs.push(theBoard.preverTalonStep > 0 ? 0 : 1);
        inputs.push(theBoard.preverTalonStep > 1 ? 0 : 1);
        inputs.push(theBoard.preverTalonStep > 2 ? 0 : 1);

        //PARTNER INFORMATION
        //-Only information the AI should know-
        inputs.push(
            (thePlayers[playerOffset(pn,1)].publicTeam != -1) ? thePlayers[playerOffset(pn,1)].publicTeam == thePlayers[pn].publicTeam ? 1 : 0 : 0.5
        );
        inputs.push(
            (thePlayers[playerOffset(pn,2)].publicTeam != -1) ? thePlayers[playerOffset(pn,1)].publicTeam == thePlayers[pn].publicTeam ? 1 : 0 : 0.5
        );
        inputs.push(
            (thePlayers[playerOffset(pn,3)].publicTeam != -1) ? thePlayers[playerOffset(pn,1)].publicTeam == thePlayers[pn].publicTeam ? 1 : 0 : 0.5
        );

        //TRUMP DISCARD
        for (let i=0; i<4; i++) {
            //Povinnost or Prever
            inputs = inputs.concat(cardToVector(theBoard.trumpDiscarded[0][i]));
        }
        inputs = inputs.concat(cardToVector(theBoard.trumpDiscarded[1][0]));
        inputs = inputs.concat(cardToVector(theBoard.trumpDiscarded[2][0]));

        //CURRENT CARD/ACTION
        inputs = inputs.concat(cardToVector(cardPrompt));
        let actionVector = new Array(25).fill(0);
        actionVector[action] = 1;
        inputs = inputs.concat(actionVector);

        if (inputs.length != 2427) {
            SERVER.error('Inputs is incorrect length: ' + inputs.length);
        }

        //TODO: stop using inputs altogether and just use buffer
        let buffer = Buffer.from(inputs);

        return buffer;

        /*Room
        room['board'] = {the board}
        room['players'] = [player1, ... player4]
        */


        /*Board
        this.partnerCard = "";
        this.talon = [];
        this.table = [];
        this.preverTalon = [];
        this.preverTalonStep = 0;
        this.prever = -1;
        this.playingPrever = false;
        this.povinnost = -1;
        this.buc = false;
        this.leadPlayer = -1;
        this.leadCard = null;
        this.nextStep = { player: 0, action: 'start', time: Date.now(), info: null };
        this.cutStyle = '';
        this.moneyCards = [[], [], [], []];
        this.valat = -1;
        this.trickWinCount = [0,0];
        this.hasTheI = -1;
        this.iote = -1;
        this.ioteWin = 0;
        this.contra = [-1,-1];
        this.calledContra = -1;
        this.rheaContra = -1;
        this.supraContra = -1;
        this.firstContraPlayer = -1;
        this.gameNumber = 0;
        this.importantInfo = {};
        */

       /*Player
       this.type = PLAYER_TYPE.HUMAN/ROBOT/AI
       this.socket = -1
       this.pid = -1
       this.chips = 100
       this.discard = []
       this.hand = []
       this.tempHand = []
       this.isTeamPovinnost = bool
       */
    }
}

//Helper functions
function playerOffset(startingPlayer, offset) {
    return (+startingPlayer + +offset)%4;
}

function playerPerspective(originalPlace, viewpoint) {
    //Ex. if player 0 is povinnost and player 1 is AI, then from AI's view player 3 is povinnost
    return ((+originalPlace - +viewpoint) + 4)%4;
}

function cardToVector(card) {
    //Should return a 1x27 vector. First 5 elements are suit, next 22 are value. 0 or 1
    let cardVector = new Array(27).fill(0);
    if (card) {
        cardVector[SUIT[card.suit]] = 1;
        cardVector[VALUE_REVERSE[card.value]+5] = 1;
    }
    return cardVector;
}

module.exports = AI;