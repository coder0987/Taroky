const Deck = require('./deck.js');
const SERVER = require('./logger.js');
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

/* AI stuff from other classes

Player:
    // AI functions - will be replaced later
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

From _server

function aiAction(action, room, pn) {
    //Uses the AI to take an action IF and only IF the AI is supposed to
    let hand = room['players'][pn].hand;
    let fakeMoneyCards = false;
    let actionNeedsAI = false;

    if (action.player == pn) {

        switch (action.action) {
                case 'play':
                case 'shuffle':
                    break;
                case 'cut':
                    action.info.style = 'Cut';//Since this has 0 effect on gameplay, no ai necessary
                    break;
                case 'deal':
                    break;
                case '12choice':
                    action.info.choice = robotChooseHand(room.board.hands);//Again, 0 effect on gameplay
                    break;
                case 'prever':
                    actionNeedsAI = true;
                    think(8,5,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'drawPreverTalon':
                    //todo give ai choice to keep or pass prever talon cards
                case 'drawTalon':
                    break;
                case 'discard':
                    {
                    Deck.grayUndiscardables(hand);
                    let choices = Deck.handWithoutGray(hand);
                    if (choices.length == 1) {
                        action.info.card = choices[0];
                        break;
                    }
                    actionNeedsAI = true;
                    let discardPromises = [];
                    for (let i in choices) {
                        discardPromises[i] = think(0,8,action,room,pn,fakeMoneyCards,choices[i]);
                    }
                    Promise.all(discardPromises).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    }
                    break;
                case 'povinnostBidaUniChoice':
                    actionNeedsAI = true;
                    think(11,9,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                case 'moneyCards':
                    break;
                case 'partner':
                    //if povinnost choose partner
                    actionNeedsAI = true;
                    let p1 = think(12,11,action,room,pn,fakeMoneyCards);
                    let p2 = think(13,11,action,room,pn,fakeMoneyCards);
                    Promise.all([p1, p2]).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'valat':
                    actionNeedsAI = true;
                    think(9,12,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'iote':
                    actionNeedsAI = true;
                    think(10,13,action,room,pn,fakeMoneyCards).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'contra':
                case 'preverContra':
                case 'preverValatContra':
                case 'valatContra':
                    actionNeedsAI = true;
                    let myPromise;
                    if (room.board.contra == -1) {
                        //Regular contra
                        myPromise = think(5,17,action,room,pn,fakeMoneyCards);
                    } else if (room.board.rheaContra == -1) {
                        myPromise = think(6,17,action,room,pn,fakeMoneyCards);
                    } else {
                        myPromise = think(7,17,action,room,pn,fakeMoneyCards);
                    }
                    myPromise.then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    break;
                case 'lead':
                    if (hand.length == 1) {
                        action.info.card = hand[0];
                        break;
                    }
                    {
                    actionNeedsAI = true;
                    let leadPromises = [];
                    Deck.unGrayCards(hand);
                    //Rank each card
                    //think(8,5,action,room,pn,fakeMoneyCards);

                    let choices = Deck.handWithoutGray(hand);
                    for (let i in choices) {
                        leadPromises[i] = think(1,18,action,room,pn,fakeMoneyCards,choices[i]);
                    }
                    Promise.all(leadPromises).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    }
                    break;
                case 'follow':
                    let choices = Deck.handWithoutGray(hand);
                    if (choices.length == 1) {
                        action.info.card = choices[0];
                        break;
                    }
                    {
                    actionNeedsAI = true;
                    let followPromises = [];
                    //Rank each card

                    let choices = Deck.handWithoutGray(hand);
                    for (let i in choices) {
                        followPromises[i] = think(1,19,action,room,pn,fakeMoneyCards,choices[i]);
                    }
                    Promise.all(followPromises).then((result) => {
                            aiActionCallback(action, room, pn, fakeMoneyCards, result);
                        }).catch((err) => {
                            SERVER.error(err);
                            //Default to robot action
                            SERVER.warn('AI action failed. Falling back to robot action');
                            robotAction(action, room, pn);
                        });
                    }
                    break;
                case 'winTrick':
                    break;
                case 'countPoints':
                    break;//Point counting will be added later
                case 'resetBoard':
                    break;//Utilitarian, no input needed
                default:
                    SERVER.warn('Unknown ai action: ' + action.action,room.name);
            }
    }
    if (action.action == 'iote' || 'contra' || 'preverContra' ||'preverValatContra' || 'valatContra') {
        //Don't inform players of private actions
        for (let i = 0; i < 4; i++) {
            if (room['players'][i].type == PLAYER_TYPE.HUMAN) {
                players[room['players'][i].socket].socket.emit('nextAction', action);
            }
        }
        for (let i in room.audience) {
            room.audience[i].messenger.emit('nextAction', action);
        }
        if (fakeMoneyCards) {
            action.action = 'povinnostBidaUniChoice';
        }
    }
    if (!actionNeedsAI) {
        aiActionComplete(action, room, pn, fakeMoneyCards);
    }
}
function think(outputNumber, actionNumber, action, room, pn, fakeMoneyCards, cardPrompt) {
    const myPromise = new Promise((resolve, reject) => {
        const dataToSend = AI.generateInputs(room,pn,actionNumber,cardPrompt);
        //dataToSend is already a binary buffer of 1s and 0s
        const options = {
            hostname: 'localhost',
            path: '/' + room['players'][pn].ai + '/',
            method: 'POST',
            protocol: 'http:',
            port: 8441,
            headers: {
                'output': outputNumber
            }
        };
        const req = http.request(options, (res) => {
            let postData = [];
            res.on('data', function(chunk) {
                postData.push(chunk);
                //CODE REACHES HERE
            });
            function complete() {
                //postData = Buffer.concat(postData).toString();
                let stringData = '';
                for (let i in postData) {
                    stringData += postData[i];
                }
                try {
                    postData = JSON.parse(stringData)
                } catch (e) {
                    SERVER.error('JSON error: ' + e)
                }
                resolve(postData.answer);
            }
            res.on('finish', complete);
            res.on('end', complete);
            res.on('close', complete);
            SERVER.debug('AI status: ' + res.statusCode);
            if (res.statusCode === 200) {
                //Action successfully completed
            } else {
                //Action failed
                reject('AI action failed');
            }
        }).on("error", (err) => {
            //TODO: there's a really weird error that I'm ignoring here
            //reject(err);
        });
        req.setTimeout(10000);//10 seconds max
        req.end(dataToSend);
    });
    return myPromise;
}
function aiActionCallback(action, room, pn, fakeMoneyCards, result) {
    //Generate possible choices
    //If only one choice, choose it
    //Otherwise, generate inputs
    //Give the inputs and each choice to the AI and note the number returned
    //Use the highest-ranked choice

    // OUTPUTS (14 x 1)
    // 0. Discard this
    // 1. Play this
    // 2. Keep talon
    // 3. Keep talon bottom
    // 4. Keep talon top
    // 5. Contra
    // 6. Rhea-contra
    // 7. Supra-contra
    // 8. Prever
    // 9. Valat
    // 10. IOTE
    // 11. povinnost b/u choice
    // 12. Play alone (call XIX)
    // 13. Play together (call lowest)
    // Total: 14

    let hand = room['players'][pn].hand;

    switch (action.action) {
        case 'prever':
            action.action = 'passPrever';
            if (result > 0.5) {
                action.action = 'callPrever';
            }
            break;
        case 'discard':
            {
            Deck.grayUndiscardables(hand);
            let choices = Deck.handWithoutGray(hand);
            let highestRanking = 0;
            for (let i in choices) {
                if (result[i] > result[highestRanking]) {
                    highestRanking = i;
                }
            }
            action.info.card = choices[highestRanking];
            }
            break;
        case 'povinnostBidaUniChoice':
            fakeMoneyCards = true;
            action.action = 'moneyCards';
            room.board.buc = false;
            if (result > 0.5) {
                room.board.buc = true;
            }
            break;
        case 'partner':
            if (room['board'].povinnost == pn) {
                let goAloneRanking = result[0];
                let goPartnerRanking = result[1];
                if (goAloneRanking > goPartnerRanking) {
                    action.info.partner = {suit:'Trump',value:'XIX'};
                }  else {
                    //Rudimentary always plays with a partner
                    action.info.partner = robotPartner(hand, DIFFICULTY.BEGINNER);
                }
            }
            break;
        case 'valat':
            action.info.valat = false;
            if (result > 0.5) {
                action.info.valat = true;
            }
        case 'iote':
            action.info.iote = false;
            if (result > 0.5) {
                action.info.iote = true;
            }
            break;
        case 'contra':
        case 'preverContra':
        case 'preverValatContra':
        case 'valatContra':
            action.info.contra = result > 0.5;
            break;
        case 'lead':
            {
            Deck.unGrayCards(hand);
            //Rank each card
            let choices = Deck.handWithoutGray(hand);
            let highestRanking = 0;
            for (let i in choices) {
                if (result[i] > result[highestRanking]) {
                    highestRanking = i;
                }
            }
            action.info.card = choices[highestRanking];
            }
            break;
        case 'follow':
            {
            //Rank each card
            Deck.grayUnplayables(hand, room.board.leadCard);
            let choices = Deck.handWithoutGray(hand);
            let highestRanking = 0;
            for (let i in choices) {
                if (result[i] > result[highestRanking]) {
                    highestRanking = i;
                }
            }
            action.info.card = choices[highestRanking];
            }
            break;
    }
    try {
        aiActionComplete(action, room, pn, fakeMoneyCards);
    } catch (e) {
        SERVER.error(e);
    }
}
function aiActionComplete(action, room, pn, fakeMoneyCards) {
    //actionCallback() -> aiAction() -> aiActionCallback() -> ai server -> response -> aiActionComplete -> actionCallback
    //if no ai is needed: actionCallback() -> aiAction() -> robot action -> aiActionComplete() -> actionCallback()

    if (room.board.nextStep.action == action.action) {
        actionCallback(action, room, pn);
    } else {
        throw "Game moved on without me :(";
    }

}

*/

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