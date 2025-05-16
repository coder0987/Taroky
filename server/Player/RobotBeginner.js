const RobotAuto = require('./RobotAuto');
const { VALUE_REVERSE, SUIT } = require('../enums');
const Deck = require('../deck');
const SERVER = require('../logger');

const { whoIsWinning } = require('./robotUtils');

class RobotBeginner {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
    
    static robotDiscard(hand) {
        return Deck.firstSelectableCard(hand);
    }

    static robotPartner(hand) {
        let robotPossiblePartners = Deck.possiblePartners(hand);
        
        if (robotPossiblePartners[1]) {
            return robotPossiblePartners[1];//Play with a partner
        }

        return { 'value': 'XIX', 'suit': SUIT[4] };
    }

    static robotPrever(hand, room) {
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
        return false;
    }

    static robotPovinnostBidaUniChoice(hand) {
        return true;
    }

    static robotLead(hand, room) {
        return Deck.firstSelectableCardExceptPagat(hand);
    }

    static robotPlay(hand, room) {
        //TODO: add context. Robots need to know: money cards, povinnost
        let playableCards = Deck.handWithoutGray(hand);

        SERVER.debug('player can play cards ' + JSON.stringify(hand), room.name);
    
        if (playableCards.length == 1) {
            return playableCards[0];
        }
    
        let table = room.board.table;
        //{'card':card,'pn':pn,'lead':true}
        let orderedTable = [];
        for (let i in table) {
            orderedTable[orderedTable.length] = table[i].card;
        }
        let winningCard = whoIsWinning(orderedTable, room.settings.aceHigh);
        let trumpLead = table[0].card.suit == 'Trump';
    
        let partnerCard = room.board.partnerCard;
    
        if (hand.length == 12 && room.board.prever == -1 && Deck.handContainsCard(hand, partnerCard)) {
            //First trick, no prever, have partner card
            if (trumpLead && VALUE_REVERSE[winningCard.value] < VALUE_REVERSE[partnerCard]) {
                //Playing trump; partner card is winning
                return {suit:'Trump', value: partnerCard};
            }
        }
    
        return Deck.firstSelectableCardExceptPagat(hand);
    }
}

module.exports = RobotBeginner;