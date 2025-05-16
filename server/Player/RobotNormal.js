const Deck = require('../deck');
const { SUIT } = require('../enums');
const SERVER = require('../logger');
const RobotEasy = require('./RobotEasy');

const { whoIsWinning, highestUnplayedTrump } = require('./robotUtils');

class RobotNormal {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
    
    static robotDiscard(hand) {
        for (let i=0; i<4; i++) {
            if (Deck.numOfSuit(hand, SUIT[i]) == 1 && Deck.numOfSuit(Deck.handWithoutGray(hand), SUIT[i])) {
                return Deck.selectCardOfSuit(hand, SUIT[i])
            }
        }
        return RobotEasy.robotDiscard(hand);
    }
    
    static robotPartner(hand) {
        let robotPossiblePartners = Deck.possiblePartners(hand);
        
        if (robotPossiblePartners[1] && Deck.basicHandRanking(hand) >= 17) {
            return { 'value': 'XIX', 'suit': SUIT[4] };//Play by itself
        }
        
        return RobotEasy.robotPartner(hand);
    }

    static robotPrever(hand, room) {
        if (Deck.numOfSuit(hand, SUIT[4]) >= 6 && Deck.trumpChain(hand) >= 1 && Deck.basicHandRanking(hand) >= 15 && Deck.handContainsCard(hand, 'King')) {
            //Must have a guaranteed trick, 6 trump, and a King
            return 'callPrever';
        }

        return RobotEasy.robotPrever(hand, room);
    }

    static robotPreverTalon(hand, talon, room) {
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
    }

    static robotCall(hand) {
        //Valat
        if (Deck.unbrokenTrumpChain(hand) >= 8 && Deck.basicHandRanking(hand) >= 20) {
            return true;
        }

        return false;
    }
    static robotIOTE(hand) {
        if (Deck.numOfSuit(hand, SUIT[4]) >= 8) {
            return true;//Call IOTE if have tarocky or big ones
        }
        
        return false;
    }

    static robotContra(hand) {
        if (Deck.numOfSuit(hand, SUIT[4]) >= 7 && Deck.trumpChain(hand) >= 1 && Deck.basicHandRanking(hand) >= 17 && Deck.handContainsCard(hand, 'King')) {
            return true;
        }

        return RobotEasy.robotContra(hand);
    }

    static robotPovinnostBidaUniChoice(hand) {
        return false;
    }

    static robotLead(hand, room) {
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
    }

    static robotPlay(hand, room) {
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
    }
}


module.exports = RobotNormal;