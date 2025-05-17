const Deck = require('../deck');

const { SUIT } = require('../enums');

class RobotAuto {
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
        //Valat
        return false;
    }

    static robotIOTE(hand) {
        return false;
    }

    static robotContra(hand) {
        return false;
    }

    static robotPovinnostBidaUniChoice(hand) {
        return false;
    }

    static robotLead(hand, room) {
        return Deck.firstSelectableCard(hand);
    }

    static robotPlay(hand, room) {
        return Deck.firstSelectableCard(hand);
    }

    static robotChooseHand(theChoices) {
        this.info.choice = 0;
        for (let i in theChoices) {
            if (typeof theChoices[i] !== 'undefined') {
                return i;
            }
        }
        return -1;
    }
}

module.exports = RobotAuto;