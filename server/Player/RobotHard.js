const RobotNormal = require('./RobotNormal');
const Deck = require('../deck');

class RobotHard {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
    
    static robotDiscard(hand) {
        return RobotNormal.robotDiscard(hand);
    }

    static robotPartner(hand) {
        return RobotNormal.robotPartner(hand);
    }

    static robotPrever(hand, room) {
        return RobotNormal.robotPrever(hand, room);
    }

    static robotPreverTalon(hand, talon, room) {
        return RobotNormal.robotPreverTalon(hand, talon, room);
    }

    static robotCall(hand) {
        return RobotNormal.robotCall(hand);
    }

    static robotIOTE(hand) {
        return RobotNormal.robotIOTE(hand);
    }

    static robotContra(hand) {
        if (Deck.basicHandRanking(hand) >= 18) {
            return true;
        }
        return RobotNormal.robotContra(hand);
    }

    static robotPovinnostBidaUniChoice(hand) {
        return RobotNormal.robotPovinnostBidaUniChoice(hand);
    }

    static robotLead(hand, room) {
        return RobotNormal.robotLead(hand, room);
    }

    static robotPlay(hand, room) {
        return RobotNormal.robotPlay(hand, room);
    }
}

module.exports = RobotHard;