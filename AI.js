const math = require('mathjs');
const Deck = require('./deck.js');
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
let h5wasm = null;
async function importH5wasm() {
    //TODO: uncomment. For some reason H5 really likes to spam the console when the server crashes
    //if (!DEBUG_MODE) {
        return;
    //}
    h5wasm = await import("h5wasm");
    await h5wasm.ready;
    aiFromFile('latest.h5');
}
importH5wasm();

class AI {
    constructor (seed, mutate){
        if (seed) {
            //Matrix multiplication: Size[A,B] x Size[B,C] = Size[A,C]
            this.inputWeights = seed[0]; // 2k x 1k
            this.layersWeights = seed[1]; // 20 x 1k x 1k
            this.layersBias = seed[2]; // 20 x 1k x 1
            this.outputWeights = seed[3]; // 14 x 1k
            this.outputBias = seed[4]; // 14 x 1
        } else {
            this.inputWeightsSize = [2523,1000];
            this.layersWeightsSize = [20,1000,1000];
            this.layersBiasSize = [21,1000];
            this.outputWeightsSize = [1000,14];
            this.outputBiasSize = [14];

            this.inputWeights   = math.random(math.matrix([this.inputWeightsSize[0], this.inputWeightsSize[1]])); // 2k x 1k
            this.layersWeights  = math.random(math.matrix([this.layersWeightsSize[0], this.layersWeightsSize[1], this.layersWeightsSize[2]])); // 20 x 1k x 1k
            this.layersBias     = math.random(math.matrix([this.layersBiasSize[0], this.layersBiasSize[1]])); // 20 x 1k x 1
            this.outputWeights  = math.random(math.matrix([this.outputWeightsSize[1], this.outputWeightsSize[0]])); // 14 x 1k
            this.outputBias     = math.random(math.matrix([this.outputBiasSize[0]])); // 14 x 1

            mutate = 0;
        }
        if (mutate) {
            //Iterate over each and every weight and bias and add mutate * Math.random() to each
            this.inputWeights  = math.add(this.inputWeights,  math.random([2523, 1000],     -mutate, mutate));
            this.layersWeights = math.add(this.layersWeights, math.random([20, 1000, 2523], -mutate, mutate));
            this.layersBias    = math.add(this.layersBias,    math.random([21, 1000],       -mutate, mutate));
            this.outputWeights = math.add(this.outputWeights, math.random([14, 1000],       -mutate, mutate));
            this.outputBias    = math.add(this.outputBias,    math.random([14],             -mutate, mutate));
        }
    }

    evaluate(inputs, output) {
        let result = 0;

        let currentRow = math.add(math.multiply(inputs, this.inputWeights), this.layersBias.subset(math.index(math.range(0,1),math.range(0,1000))));
        for (let i=0; i<20; i++) {
            currentRow = AI.sigmoidMatrix(
                math.add(
                    math.multiply(
                        currentRow,
                        math.squeeze(
                            math.subset(
                                this.layersWeights, math.index(
                                    i,math.range(0,1000),math.range(0,1000)
                                )
                        ))),
                    math.squeeze(
                        math.subset(this.layersBias, math.index(
                            i+1,math.range(0,1000)
                    )))
                )
            );
        }
        result = AI.sigmoid(
            math.add(
                math.multiply(
                    currentRow,
                    math.squeeze(
                        math.subset(
                            this.outputWeights,
                            math.index(output, math.range(0,1000))
                    ))
                ),
                math.subset(
                    this.outputBias,
                    math.index(output)
                )
            )
        );
        return result;
    }


    static sigmoid(z) {
        if (z<-10) {return 0;}
        else if (z>10) {return 1;}
        return 1 / (1 + Math.exp(-z));
    }

    static sigmoidMatrix(m) {
        //Assumes input to be an N x 1 matrix
        return math.map(math.add(1, math.map(math.subtract(0,m), math.exp)), math.inv);
    }

    static aiFromFile(file) {
        //Note: file is a location, not an actual file
        let f;
        let latestAI;
        try {
            const seed = [];
            f = new h5wasm.File(file, "r");
            seed[0] = math.matrix(f.get('/ai/inputWeights', 'r').to_array());
            seed[1] = math.matrix(f.get('/ai/layersWeights', 'r').to_array());
            seed[2] = math.matrix(f.get('/ai/layersBias', 'r').to_array());
            seed[3] = math.matrix(f.get('/ai/outputWeights', 'r').to_array());
            seed[4] = math.matrix(f.get('/ai/outputBias', 'r').to_array());
            latestAI = new AI(seed, 0);
            SERVER.log('AI loaded successfully');
        } catch (err) {
            SERVER.error('Error reading file from disk: ' + err);
            //latestAI = new AI(false, 0);
        } finally {
            if (f) {f.close();}
        }
        return latestAI;
    }

    static aiToFile(ai, fileName) {
        let saveFile;
        try {
            saveFile = new h5wasm.File(fileName,'w');
            saveFile.create_group('ai');

            let tempInputWeights = [];
            let inputWeightsShape = ai.inputWeightsSize;
            ai.inputWeights.forEach(function (value, index, matrix) {
                tempInputWeights.push(value);//Lines up the 2d array into 1 dimension
            });
            saveFile.get('ai').create_dataset('inputWeights', tempInputWeights, inputWeightsShape, '<f');

            let tempLayersWeights = [];
            let layersWeightsShape = ai.layersWeightsSize;
            ai.layersWeights.forEach(function (value, index, matrix) {
                tempLayersWeights.push(value);//Lines up the 2d array into 1 dimension
            });
            saveFile.get('ai').create_dataset('layersWeights', tempLayersWeights, layersWeightsShape, '<f');

            let tempLayersBias = [];
            let layersBiasShape = ai.layersBiasSize;
            ai.layersBias.forEach(function (value, index, matrix) {
                tempLayersBias.push(value);//Lines up the 2d array into 1 dimension
            });
            saveFile.get('ai').create_dataset('layersBias', tempLayersBias, layersBiasShape, '<f');

            let tempOutputWeights = [];
            let outputWeightsShape = ai.outputWeightsSize;
            ai.outputWeights.forEach(function (value, index, matrix) {
                tempOutputWeights.push(value);//Lines up the 2d array into 1 dimension
            });
            saveFile.get('ai').create_dataset('outputWeights', tempOutputWeights, outputWeightsShape, '<f');

            let tempOutputBias = [];
            let outputBiasShape = ai.outputBiasSize;
            ai.outputBias.forEach(function (value, index, matrix) {
                tempOutputBias.push(value);//Lines up the 2d array into 1 dimension
            });
            saveFile.get('ai').create_dataset('outputBias', tempOutputBias, outputBiasShape, '<f');

            SERVER.log('Saved the latest ai ' + Date.now());
        } catch (err) {
            SERVER.error('Error writing file: ' + err);
        } finally {
            if (saveFile) {saveFile.close();}
        }
    }

//AI

/*
    AI theory
    Taroky is a complicated game. There are two main ways we could possibly implement AI
    1. Action-base. Give the AI what action is currently happening and let it select a choice
    2. Prompt-based. Look at all possible options and prompt the AI with each one. The AI will rank each option from 0-1 and the highest rank wins
    In this project, I'm going to use the second model.
    Here's how it looks (note that player numbers are using 0 as current player, +1 as player to the right, etc.):
    Every single value is between 0 and 1. S is for sigmoid
    INPUTS  (2k x 1)            HIDDEN LAYERS  (1k x 20)        OUTPUTS (14 x 1)
    0-3   S(chips/100)          Inputs is already the           Discard this
    4-7   isPovinnost           absolutely ludicrous            Play this
    8-11  isPrever              2k parameters. How many         Keep talon
    12    preverTalon           Hidden layers do we need?       Keep talon bottom
    13-44 8 types of            Honestly 20 should be           Keep talon top
          moneyCards            More than plenty.               Contra
    45-48 valat                 If hidden layers are 2kx20      Rhea-contra
    49-52 iote                  That means each layer has       Supra-contra
    53-56 contra                2k x 2k = 4m parameters,        Prever
    57    someoneIsValat        x20 layers = 80m parameters     Valat
    58    someoneIsContra       Which is insane.                IOTE
    59    someoneIsIOTE                                         povinnost b/u choice
    60    IAmValat              I'll test it out.               Play alone (call XIX)
    61    IAmIOTE               If it seems really slow         Play together (call lowest)
    62    IAmPrever             then I'll chop off 1k           Total: 14
    63-68 PartnerCard           1k x 1k = 1m parameters
          XIX, then XVIII       x20 = 20m total, much
          etc                   nicer on my computer.

    CURRENT TRICK INFORMATION
    69-72 TrickLeader
    73-76 myPositionInTrick
    +28   firstCard
    +28   secondCard
    +28   thirdCard

    TRICK HISTORY
    +1    hasBeenPlayed
    +4    whoLead
    +4    myPosition
    +4    whoWon
    +28   firstCard
    +28   secondCard
    +28   thirdCard
    +28   fourthCard
    x11   tricks

    MY HAND
    +28   card
    x16   Max num cards in hand

    PREVER TALON
    +28   Card
    x3    num cards in talon

    PARTNER INFORMATION
    -Only information the AI should know-
    +3    isMyPartner

    TRUMP DISCARD
    +28   card
    x4    max

    CURRENT CARD/ACTION
    +28   card
    +25   number of actions

    Roughly 2k inputs total

    Matrix layout

    Matrix {
        INPUTS {0,1,0,0... 2k}
        INPUT_ROW {
            w, w, w, w... 2k
            w, w, w, w... 2k
            ...
            2k
        }
        INPUT_BIAS {b, b, b... 2k}
        LAYER 1 {0.75, 0.23, 0.01... 2k}
        L1 = I x IR + IB;
        2kx1 = 2kx1 x 2kx2k + 2kx1; //Checks out
        HIDDEN_LAYER_1_ROW {
            w, w, w, w... 2k
            w, w, w, w... 2k
            ...
            2k
        }... 20x

        LAYER 20 {0.75, 0.23, 0.01... 2k}

        HIDDEN_LAYER_20_ROW {
            -------> 2k
            -------> 2k
            ...
            14
        }
        L20B = {b, b, b... 14}
        OUTPUT ROW = L20 x L20R + L20B;
        1x14 = 1x2k x 2kx14 + 1x14; //Checks out

        Actual matrix:
        in      = new matrix [2k, 1k]
        layers  = new matrix [20, 1k, 1k]
        layersB = new matrix [20, 1k]
        out     = new matrix [1k, 14]
        outB    = new matrix [14]

        Note that layers has an extra dimension because there are n layers (n=20) and always 1 in and 1 out
        B has 1 less layer than w because N = O x W + B means that preservation of matrix size requires W to be O-width wide and high, whereas B needs to be O-width wide but only 1 tall

        Also, only the required output must be calculated
    }
*/

    static generateInputs(room, pn, action, cardPrompt) {
        const thePlayers = room.players;
        const theBoard = room.board;
        let inputs = [];

        //Chips
        inputs.push(AI.sigmoid(thePlayers[playerOffset(pn, 0)].chips/100));
        inputs.push(AI.sigmoid(thePlayers[playerOffset(pn, 1)].chips/100));
        inputs.push(AI.sigmoid(thePlayers[playerOffset(pn, 2)].chips/100));
        inputs.push(AI.sigmoid(thePlayers[playerOffset(pn, 3)].chips/100));

        //Povinnost
        let povinnostVector = new Array(4).fill(0);
        if (theBoard.povinnost != -1) {
            povinnostVector[playerPerspective(theBoard.povinnost, pn)] = 1;
        }
        inputs = inputs.concat(povinnostVector);

        //Prever
        let preverVector = new Array(4).fill(0);
        if (theBoard.prever != -1) {
            preverVector[playerPerspective(theBoard.prever, pn)] = 1;
        }
        inputs = inputs.concat(preverVector);

        //Prever talon doubling
        inputs.push(theBoard.preverTalonStep > 1 ? 1 : 0);
        inputs.push(theBoard.preverTalonStep > 2 ? 1 : 0);

        //Moneycards
        let moneyCardsVector = new Array(32).fill(0);
        const decodeMoneyCards = {'Uni':0,'Bida':1,'Taroky':2,'Tarocky':3,'Trul':4,'Rosa-Honery+':5,'Rosa-Honery':6,'Honery':7};
        for (let i in theBoard.moneyCards) {
            for (let j in theBoard.moneyCards[i]) {
                moneyCardsVector[decodeMoneyCards[j]*4 + playerPerspective(i,pn)];
            }
        }
        inputs = inputs.concat(moneyCardsVector);

        //Valat
        let valatVector = new Array(4).fill(0);
        if (theBoard.valat != -1) {
            valatVector[playerPerspective(theBoard.valat, pn)] = 1;
        }
        inputs = inputs.concat(valatVector);

        //I on the End
        let ioteVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            ioteVector[playerPerspective(theBoard.iote, pn)] = 1;
        }
        inputs = inputs.concat(ioteVector);

        //Contra
        let contraVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            contraVector[playerPerspective(theBoard.calledContra, pn)] = 1;
        }
        inputs = inputs.concat(contraVector);

        //Rhea-Contra
        let rheaContraVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            rheaContraVector[playerPerspective(theBoard.rheaContra, pn)] = 1;
        }
        inputs = inputs.concat(rheaContraVector);

        //Supra-contra
        let supraContraVector = new Array(4).fill(0);
        if (theBoard.iote != -1) {
            supraContraVector[playerPerspective(theBoard.supraContra, pn)] = 1;
        }
        inputs = inputs.concat(supraContraVector);

        //PartnerCard
        inputs.push(theBoard.partnerCard == 'XIX' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XVIII' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XVII' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XVI' ? 1 : 0);
        inputs.push(theBoard.partnerCard == 'XV' ? 1 : 0);
        inputs.push(Deck.handContains(thePlayers[pn].hand,theBoard.partnerCard) ? 1 : 0);

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
                inputs = inputs.concat(new Array(129).fill(0));
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

        if (inputs.length != 2523) {
            SERVER.error('Inputs is incorrect length: ' + inputs.length);
        }

        return inputs;

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

    get seed() {
        let theSeed = [];
        theSeed.push(this.inputWeights);
        theSeed.push(this.layersWeights);
        theSeed.push(this.layersBias);
        theSeed.push(this.outputWeights);
        theSeed.push(this.outputBias);
        return theSeed;
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