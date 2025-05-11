/**
 * TODO
 * This class will replace the current Robot class
 * RobotEasy
 * RobotMedium
 * etc.
 * 
 * will extend this class and be instantiated by the room
 * the methods will no longer be static
 */


class RobotPlayer extends Player {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
    static robotShuffle() {
        //Returns 'type'
        //1: cut, 2: riffle, 3: randomize. DON'T DO 3.
        return Math.random(1,3);
    }

    static robotShuffleAgain() {
        //Returns boolean
        return Math.random(0,10) > 8;
    }

    static robotCutLocation() {
        return Math.random(7,47);
    }
    
    
    static robotDiscard(hand, difficulty) {
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
                /*TODO: Discard cards from the suit with the least number of possible cards that does not have a king
                    If tied, discard the highest point value
                    This is, of course, after voiding in a suit like normal if possible
                    Priorities: VOID 3 suits, VOID 2 suits, VOID a suit with the most points gained, VOID a suit, PREP a suit for voiding by discarding the higher point-value of that suit when there are only 2 cards of it
                    Else, discard the highest point value*/
            case DIFFICULTY.HARD:
                //TODO: check how many suits can be discarded in povinnost/prever and discard all of them
                //Also, if it is possible to void in two different suits but only one card can be discarded, discard the card with the higher point value
            case DIFFICULTY.NORMAL:
                //Return whatever card is necessary to void in a suit
                for (let i=0; i<4; i++) {
                    if (Deck.numOfSuit(hand, SUIT[i]) == 1 && Deck.numOfSuit(Deck.handWithoutGray(hand), SUIT[i])) {
                        return Deck.selectCardOfSuit(hand, SUIT[i])
                    }
                }
                //Fallthrough to highest point-value
            case DIFFICULTY.EASY:
                //Return highest point value card (most likely a queen)
                if (Deck.handWithoutGray(hand).length == 0) {
                    //Oops! gotta discard a trump
                    hand = Deck.grayUndiscardables(hand);
                    if (Deck.handWithoutGray(hand).length == 0) {
                        SERVER.error('Hand has no valid cards!')
                        SERVER.error(hand);
                    }
                }
                return Deck.highestPointValue(Deck.handWithoutGray(hand));
            case DIFFICULTY.BEGINNER:
                return Deck.firstSelectableCard(hand);
            default:
                //select first discard-able
                SERVER.warn('Unknown difficulty: ' + difficulty);
                return Deck.firstSelectableCard(hand);
        }
    }
    static robotPartner(hand, difficulty) {
        let robotPossiblePartners = Deck.possiblePartners(hand);
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                if (Deck.possiblePartners[1] && Deck.basicHandRanking(hand) >= 17) {
                    return { 'value': 'XIX', 'suit': SUIT[4] };//Play by itself
                }
            case DIFFICULTY.EASY:
            case DIFFICULTY.BEGINNER:
                if (Deck.possiblePartners[1]) {
                    return Deck.possiblePartners[1];//Play with a partner
                }
                return { 'value': 'XIX', 'suit': SUIT[4] };
            default:
                //always play with XIX
                SERVER.warn('Unknown difficulty: ' + difficulty);
                return { 'value': 'XIX', 'suit': SUIT[4] };
        }
    }
    static robotPrever(hand, difficulty, room) {
        SERVER.debug('Hand ranking for hand ' + JSON.stringify(hand) + ' is ' + Deck.basicHandRanking(hand));
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                if (Deck.numOfSuit(hand, SUIT[4]) >= 6 && Deck.trumpChain(hand) >= 1 && Deck.basicHandRanking(hand) >= 15 && Deck.handContainsCard(hand, 'King')) {
                    //Must have a guaranteed trick, 6 trump, and a King
                    return 'callPrever';
                }
            case DIFFICULTY.EASY:
                if (Deck.numOfSuit(hand, SUIT[4]) >= 8 && Deck.unbrokenTrumpChain(hand) >= 3 && Deck.basicHandRanking(hand) >= 15 && Deck.handContainsCard(hand, 'King')) {
                    //Must have Skyz, XXI, XX, tarocky, and a King
                    return 'callPrever';
                }
            case DIFFICULTY.BEGINNER:
                return 'passPrever';
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                return 'passPrever';
        }
    
    }
    static robotPreverTalon(hand, difficulty, talon, room) {
        let step = room.board.preverTalonStep;
        let top = step == 1;
        let numTrump = 0;
        let highTrump = 0;
        let kings = 0;
        for (let i in talon) {
            if (talon[i].suit == 'Trump') {
                numTrump++;
                if (VALUE_REVERSE[talon[i].value] > 16) {
                    highTrump++;
                }
            } else if (talon[i].value == 'King') {
                kings++;
            }
        }
        let otherSide = 0;
        if (step == 2) {
            //Allowed to see the other set of cards
            for (let i in room.board.talon) {
                if (room.board.talon[i].suit == 'Trump') {
                    otherSide++;
                    if (VALUE_REVERSE[room.board.talon[i].value] > 16) {
                        otherSide++;
                    }
                } else if (room.board.talon[i].value == 'King') {
                    otherSide++;
                }
            }
        }
        switch (difficulty) {
            case DIFFICULTY.AI:
                SERVER.warn('AI not implemented yet. Defaulting to robot moves');
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                if (top) {
                    if (kings || highTrump || numTrump == 3) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    if (otherSide > (kings + highTrump + numTrump)) {
                        return false;
                    } else {
                        return true;
                    }
                }
            case DIFFICULTY.EASY:
            case DIFFICULTY.BEGINNER:
                return true;
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                return true;
        }
    }
    static robotCall(hand, difficulty) {
        //Valat
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                if (Deck.unbrokenTrumpChain(hand) >= 8 && Deck.basicHandRanking(hand) >= 20) {
                    return true;
                }
            case DIFFICULTY.EASY:
            case DIFFICULTY.BEGINNER:
                //TODO: more difficulty algos
                return false;
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                return false;
        }
    }
    static robotIOTE(hand, difficulty) {
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                if (Deck.numOfSuit(hand, SUIT[4]) >= 8) {
                    return true;//Call IOTE if have tarocky or big ones
                }
            case DIFFICULTY.EASY:
            case DIFFICULTY.BEGINNER:
                //TODO: more difficulty algos
                return false;
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                return false;
        }
    }
    static robotContra(hand, difficulty) {
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
                if (Deck.basicHandRanking(hand) >= 18) {
                    return true;
                }
            case DIFFICULTY.NORMAL:
                if (Deck.numOfSuit(hand, SUIT[4]) >= 7 && Deck.trumpChain(hand) >= 1 && Deck.basicHandRanking(hand) >= 17 && Deck.handContainsCard(hand, 'King')) {
                    return true;
                }
            case DIFFICULTY.EASY:
                if (Deck.basicHandRanking(hand) >= 21) {
                    return true;
                }
            case DIFFICULTY.BEGINNER:
                //TODO: more difficulty algos
                return false;
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                return false;
        }
    }
    static robotPovinnostBidaUniChoice(hand, difficulty) {
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                return false;//Conceal so it doesn't get flecked
            case DIFFICULTY.EASY:
            case DIFFICULTY.BEGINNER:
                //TODO: more difficulty algos
                return true;
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                return false;
        }
    }
    static robotLead(hand, difficulty, room) {
        let playableCards = Deck.handWithoutGray(hand);
        if (playableCards.length == 1) {
            return playableCards[0];
        }
        playableCards = Deck.grayTheI(playableCards);
        playableCards = Deck.handWithoutGray(playableCards);
        if (playableCards.length == 1) {
            return playableCards[0];
        }
        if (!Deck.handContainsCard(hand, 'Skyz') && highestUnplayedTrump(room.board.cardsPlayed).value == 'Skyz') {
            //Someone else has Skyz and has not played it
            playableCards = Deck.grayTheXXI(playableCards);
            playableCards = Deck.handWithoutGray(playableCards);
            if (playableCards.length == 1) {
                return playableCards[0];
            }
        }
    
        let pn = room.board.nextStep.player;
        let trumpCount = 0;
        let colorCount = 0;
        let hasAKing = false;
        let colorCards = [];
        let trumpCards = [];
        for (let i in playableCards) {
            if (playableCards[i].suit != 'Trump') {
                colorCards.push(playableCards[i]);
                colorCount++;
                if (playableCards[i].value == 'King') {
                    hasAKing = true;
                }
            } else {
                trumpCards.push(playableCards[i]);
                trumpCount++;
            }
        }
    
        let calledTaroky = false;
        for (let i in room.board.moneyCards) {
            for (let j in room.board.moneyCards[i]) {
                if (room.board.moneyCards[i][j] == 'Taroky' || room.board.moneyCards[i][j] == 'Tarocky') {
                    calledTaroky = true;
                }
            }
        }
        let partnerCard = room.board.partnerCard;//String
        if (hand.length == 12 && calledTaroky && room.board.prever == -1 && !Deck.handContainsCard(hand, partnerCard)) {
            //First trick. Not Prever. Povinnost called someone else. Someone has 8+ tarocks
    
            //TODO: Skyz may be played first in order to allow partner to come back with XXI and try for a valat
    
            //I is not in here
            return Deck.lowestTrump(trumpCards);
        }
    
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
                //Possible strategies: run trump until almost out, play kings, reclaim control with trump
            case DIFFICULTY.NORMAL:
                //Possible strategies: run trump until out, then play kings
                if (room.board.iote == pn) {
                    //I called IOTE
                    //2 scenarios: 1, I can bulldoze. 2, I have a lot of trump
                    if (trumpCount > 0 && VALUE_REVERSE[Deck.highestTrump(trumpCards).value] >= VALUE_REVERSE[highestUnplayedTrump(room.board.cardsPlayed)]) {
                        //I have the biggest trump
                        return Deck.highestTrump(trumpCards);
                    }
                    if (colorCount == 0 || (trumpCount > colorCount)) {
                        //Pull trump
                        return Deck.lowestTrump(trumpCards);
                    }
                    //Play color to save I for later
                    if (hasAKing) {
                        //Play the king
                        for (let i in playableCards) {
                            if (playableCards[i].value == 'King') {
                                return playableCards[i];
                            }
                        }
                    }
                    return Deck.lowestPointValue(colorCards);
                }
                if (trumpCount > colorCount && (colorCount < 5)) {
                    let biggest = Deck.highestTrump(trumpCards);
                    if (VALUE_REVERSE[biggest.value] < 14) {
                        return Deck.lowestTrump(trumpCards);
                    }
                    return biggest;
                }
                if (hasAKing) {
                    //Play the king
                    for (let i in playableCards) {
                        if (playableCards[i].value == 'King') {
                            return playableCards[i];
                        }
                    }
                }
                return Deck.lowestPointValue(colorCards);
            case DIFFICULTY.EASY:
                if (hasAKing) {
                    //Play the king
                    for (let i in playableCards) {
                        if (playableCards[i].value == 'King') {
                            return playableCards[i];
                        }
                    }
                }
                if (colorCards.length > 0) {
                    return Deck.lowestPointValue(colorCards);
                }
                return Deck.lowestTrump(playableCards);
            case DIFFICULTY.BEGINNER:
                return Deck.firstSelectableCardExceptPagat(hand);
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                //select first playable
                return Deck.firstSelectableCard(hand);
    
        }
    }
    static robotPlay(hand, difficulty, room) {
        //TODO: add context. Robots need to know: money cards, povinnost
        let playableCards = Deck.handWithoutGray(hand);

        SERVER.debug('player can play cards ' + JSON.stringify(hand), room.name);
    
        if (playableCards.length == 1) {
            return playableCards[0];
        }
    
        let pn = room.board.nextStep.player;
        let table = room.board.table;
        //{'card':card,'pn':pn,'lead':true}
        let orderedTable = [];
        for (let i in table) {
            orderedTable[orderedTable.length] = table[i].card;
        }
        let winningCard = whoIsWinning(orderedTable, room.settings.aceHigh);
        let winningPlayer = 0;
        for (let i in table) {
            if (table[i].card == winningCard) {
                winningPlayer = table[i].pn;
                break;
            }
        }
        let myTeam = room.players[pn].isTeamPovinnost;//I always know my team. boolean
        let winningTeam = room.players[winningPlayer].publicTeam;//-1, 0, or 1
        let myTeamWinning = false;
        if (winningTeam && ((!myTeam && winningTeam == -1) || (myTeam && winningTeam == 1))) {
            myTeamWinning = true;
        }
        let ioteCalled = room.board.iote != -1;
        let valatCalled = room.board.valat != -1;
        let lastPlayer = orderedTable.length == 3;
    
        let playingTrump = playableCards[0].suit == 'Trump';
        let trumped = winningCard.suit == 'Trump';
        let trumpLead = table[0].card.suit == 'Trump';
    
        let partnerCard = room.board.partnerCard;
    
        let partnerFollowsLater = false;
        let notPartnerFollowsLater = false;
        let numPlayerRemaining = 3 - orderedTable.length;
        for (let i in numPlayerRemaining) {
            let thisPlayersTeam = room.players[(pn+i)%4].publicTeam;
            if (thisPlayersTeam && ((!myTeam && thisPlayersTeam == -1) || (myTeam && thisPlayersTeam == 1))) {
                partnerFollowsLater = true;
            } else {
                notPartnerFollowsLater = true;
            }
        }
    
        let lastPlayerOrOnlyPartnersFollow = lastPlayer || !notPartnerFollowsLater;
    
        let biggestTrump = highestUnplayedTrump(room.board.cardsPlayed);
        let tempArray = [...room.board.cardsPlayed];
        for (let i in hand) {
            tempArray[Deck.cardId(hand[i])] = true;
        }
        let biggestTrumpTheyHave = highestUnplayedTrump(tempArray);
    
        let skyzIsOut = biggestTrumpTheyHave.value == 'Skyz';
    
        if (hand.length == 12 && room.board.prever == -1 && Deck.handContainsCard(hand, partnerCard)) {
            //First trick, no prever, have partner card
            if (trumpLead && VALUE_REVERSE[winningCard.value] < VALUE_REVERSE[partnerCard]) {
                //Playing trump; partner card is winning
                return {suit:'Trump', value: partnerCard};
            }
        }
    
        switch (difficulty) {
            case DIFFICULTY.AI:
            case DIFFICULTY.RUTHLESS:
            case DIFFICULTY.HARD:
            case DIFFICULTY.NORMAL:
                //If last in line and no trumps have been played, play the I unless IOTE was called
                if (playingTrump) {
                    if (ioteCalled) {
                        playableCards = Deck.grayTheI(playableCards);
                        //There will always be a card to play because if the I was forced it would have already returned at the top of the static
                        playableCards = Deck.handWithoutGray(playableCards);
                        if (playableCards.length == 1) {
                            return playableCards[0];
                        }
                    }
                    if (trumped) {
                        if (lastPlayerOrOnlyPartnersFollow && myTeamWinning) {
                            return Deck.lowestTrump(playableCards);
                        }
                        if (lastPlayerOrOnlyPartnersFollow && !myTeamWinning) {
                            if (skyzIsOut && Deck.handContainsCard(playableCards, 'XXI') && winningCard.value != 'Skyz') {
                                //Get the XXI home
                                return {suit:'Trump',value:'XXI'};
                            }
                            playableCards = Deck.grayTheI(playableCards);
                            playableCards = Deck.handWithoutGray(playableCards);
                            return Deck.lowestTrumpThatBeats(playableCards, winningCard);
                        }
                        if (myTeamWinning && VALUE_REVERSE[winningCard.value] < 12) {
                            //Partner played low
                            playableCards = Deck.grayTheXXI(playableCards);
                            playableCards = Deck.handWithoutGray(playableCards);
                            return Deck.highestTrump(playableCards);
                        } else {
                            //Partner played high
                            if (VALUE_REVERSE[winningCard.value] >= VALUE_REVERSE[biggestTrumpTheyHave.value]) {
                                //I is safe
                                return Deck.lowestTrump(playableCards);
                            }
                            playableCards = Deck.grayTheI(playableCards);
                            playableCards = Deck.handWithoutGray(playableCards);
                            return Deck.lowestTrump(playableCards);
                        }
                        //My team is losing
                        playableCards = Deck.grayTheI(playableCards);
                        playableCards = Deck.handWithoutGray(playableCards);
                        if (playableCards.length == 1) {
                            return playableCards[0];
                        }
                        if (skyzIsOut) {
                            playableCards = Deck.grayTheXXI(playableCards);
                            playableCards = Deck.handWithoutGray(playableCards);
                        }
                        if (notPartnerFollowsLater) {
                            return Deck.highestTrump(playableCards);
                        }
                        return Deck.lowestTrumpThatBeats(playableCards,winningCard);
                    } else {
                        if (lastPlayerOrOnlyPartnersFollow) {
                            return Deck.lowestTrump(playableCards);
                        }
                        if (winningCard.value == 'King') {
                            //Points on the line
                            if (skyzIsOut) {
                                playableCards = Deck.grayTheXXI(playableCards);
                                playableCards = Deck.handWithoutGray(playableCards);
                            }
                            return Deck.highestTrump(playableCards);
                        }
                        //todo if povenost follows then trumping is more likely so play higher
                        return Deck.lowestTrump(playableCards);
                    }
                } else {
                    //No trump. Playing color
                    if (trumped) {
                        //Ducking
                        if (myTeamWinning && lastPlayerOrOnlyPartnersFollow) {
                            //Throw most points
                            return Deck.highestPointValue(playableCards);
                        }
                        if (myTeamWinning && VALUE_REVERSE[winningCard.value] >= VALUE_REVERSE[biggestTrump.value]) {
                            //They can't trump my partner
                            return Deck.highestPointValue(playableCards);
                        }
                        return Deck.lowestPointValue(playableCards);
                    } else {
                        //Could win
                        let check = Deck.highestPointValue(playableCards);
                        if (check.value == 'King' && check.suit == orderedTable[0].suit) {
                            return check;
                        }
                        if (myTeamWinning && winningCard.value == 'King') {
                            return check;
                        }
                        if (!myTeamWinning && winningCard.value == 'King') {
                            return Deck.lowestPointValue(playableCards);
                        } else if (!myTeamWinning && partnerFollowsLater) {
                            return check;//Throw points to my partner
                        }
                        return Deck.lowestPointValue(playableCards);
                    }
                }
            case DIFFICULTY.EASY:
                //Over-under. If it can beat the current highest card, play the highest one available. Otherwise, play the lowest non-I trump available
                //If last in line, play the lowest winning card
                if (playingTrump) {
                    if (ioteCalled) {
                        playableCards = Deck.grayTheI(playableCards);
                        //There will always be a card to play because if the I was forced it would have already returned at the top of the static
                        playableCards = Deck.handWithoutGray(playableCards);
                        if (playableCards.length == 1) {
                            return playableCards[0];
                        }
                    }
                    if (myTeamWinning && lastPlayer) {
                        //play the one
                        if (Deck.handContainsCard(playableCards, 'I')) {
                            return {suit:'Trump',value:'I'};
                        }
                    }
                    if (myTeamWinning && VALUE_REVERSE[winningCard.value] < 12) {
                        //Partner played low
                        playableCards = Deck.grayTheXXI(playableCards);
                        playableCards = Deck.handWithoutGray(playableCards);
                        if (playableCards.length == 1) {
                            return playableCards[0];
                        }
                        playableCards = Deck.grayTheI(playableCards);
                        playableCards = Deck.handWithoutGray(playableCards);
                        return Deck.highestTrump(playableCards);
                    } else {
                        //Partner played high
                        if (VALUE_REVERSE[winningCard.value] > 18) {
                            return Deck.lowestTrump(playableCards);
                        }
                        playableCards = Deck.grayTheI(playableCards);
                        playableCards = Deck.handWithoutGray(playableCards);
                        return Deck.lowestTrump(playableCards);
                    }
                    if (!partnerFollowsLater && !lastPlayer) {
                        playableCards = Deck.grayTheXXI(playableCards);
                        playableCards = Deck.handWithoutGray(playableCards);
                        return Deck.highestTrump(playableCards);
                    }
    
                    return Deck.lowestTrumpThatBeats(playableCards, winningCard);
                } else {
                    if (trumped) {
                        return Deck.lowestPointValue(playableCards);
                    } else {
                        return Deck.highestPointValue(playableCards);
                    }
                }
            case DIFFICULTY.BEGINNER:
                return Deck.firstSelectableCardExceptPagat(hand);
            default:
                SERVER.warn('Unknown difficulty: ' + difficulty + ', ' + DIFFICULTY_TABLE[difficulty]);
                //select first playable
                return Deck.firstSelectableCard(hand);
        }
    }
    static robotChooseHand(theChoices) {
        for (let i in theChoices) {
            if (typeof theChoices[i] !== 'undefined') {
                return i;
            }
        }
    }
}

function highestUnplayedTrump(booleanArray) {
    for (let i=53; i>=32; i--) {
        if (!booleanArray[i]) {
            //This trump has not been played
            return {suit:'Trump', value:TRUMP_VALUE[i - 32]};
        }
    }
    return {suit:'Trump', value:'I'};
}
function whoIsWinning(table, aceHigh) {
    let trickLeadCard = table[0];
    let trickLeadSuit = trickLeadCard.suit;
    let highestTrump = -1;
    let currentWinner = 0;//LeadPlayer is assumed to be winning

    let reverseEnum = aceHigh ? VALUE_REVERSE_ACE_HIGH : VALUE_REVERSE;

    for (let i=0; i<table.length; i++) {
        if (table[i].suit == 'Trump' && reverseEnum[table[i].value] > highestTrump) {
            highestTrump = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    if (highestTrump != -1) {
        //If a trump was played, then the highest trump wins
        return table[currentWinner];
    }
    let highestOfLeadSuit = reverseEnum[trickLeadCard.value];
    for (let i=1; i<table.length; i++) {
        if (table[i].suit == trickLeadSuit && reverseEnum[table[i].value] > highestOfLeadSuit) {
            highestOfLeadSuit = reverseEnum[table[i].value];
            currentWinner = i;
        }
    }
    return table[currentWinner];
}

module.exports = RobotPlayer;