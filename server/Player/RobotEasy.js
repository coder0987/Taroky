const Deck = require('../deck');
const { SUIT, VALUE_REVERSE } = require('../enums');
const SERVER = require('../logger');
const RobotBeginner = require('./RobotBeginner');

const { whoIsWinning, highestUnplayedTrump } = require('./robotUtils');

class RobotEasy {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
    
    static robotDiscard(hand) {
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
    }

    static robotPartner(hand) {
        return RobotBeginner.robotPartner(hand);
    }

    static robotPrever(hand, room) {
        if (Deck.numOfSuit(hand, SUIT[4]) >= 8 && Deck.unbrokenTrumpChain(hand) >= 3 && Deck.basicHandRanking(hand) >= 15 && Deck.handContainsCard(hand, 'King')) {
            //Must have Skyz, XXI, XX, tarocky, and a King
            return 'callPrever';
        }

        return 'passPrever';
    }

    static robotPreverTalon(hand, talon, room) {
        return true;
    }

    static robotCall(hand) {
        return false;
    }
    
    static robotIOTE(hand) {
        return false;
    }

    static robotContra(hand) {
        if (Deck.basicHandRanking(hand) >= 21) {
            return true;
        }

        return false;
    }
    static robotPovinnostBidaUniChoice(hand) {
        return true;
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
        let lastPlayer = orderedTable.length == 3;
    
        let playingTrump = playableCards[0].suit == 'Trump';
        let trumped = winningCard.suit == 'Trump';
        let trumpLead = table[0].card.suit == 'Trump';
    
        let partnerCard = room.board.partnerCard;

        let numPlayerRemaining = 3 - orderedTable.length;
        for (let i in numPlayerRemaining) {
            let thisPlayersTeam = room.players[(pn+i)%4].publicTeam;
            if (thisPlayersTeam && ((!myTeam && thisPlayersTeam == -1) || (myTeam && thisPlayersTeam == 1))) {
                partnerFollowsLater = true;
            } else {
                notPartnerFollowsLater = true;
            }
        }
    
        let tempArray = [...room.board.cardsPlayed];
        for (let i in hand) {
            tempArray[Deck.cardId(hand[i])] = true;
        }
    
        if (hand.length == 12 && room.board.prever == -1 && Deck.handContainsCard(hand, partnerCard)) {
            //First trick, no prever, have partner card
            if (trumpLead && VALUE_REVERSE[winningCard.value] < VALUE_REVERSE[partnerCard]) {
                //Playing trump; partner card is winning
                return {suit:'Trump', value: partnerCard};
            }
        }

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
        } else {
            if (trumped) {
                return Deck.lowestPointValue(playableCards);
            } else {
                return Deck.highestPointValue(playableCards);
            }
        }
    }
}

module.exports = RobotEasy;