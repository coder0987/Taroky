const RobotHard = require('./RobotHard');

class RobotRuthless {
    //ROBOT DIFFICULTY LAYOUT: go from hardest -> easiest so the more difficult algorithms fall back onto the less difficult ones while we haven't yet finished
    //BEGINNER: 0, EASY: 1, NORMAL: 2, HARD: 3, RUTHLESS: 4, AI: 5
    
    static robotDiscard(hand) {
        // TODO
        return RobotHard.robotDiscard(hand);
    }

    static robotPartner(hand) {
        // TODO
        return RobotHard.robotPartner(hand);
    }

    static robotPrever(hand, room) {
        // TODO
        return RobotHard.robotPrever(hand, room);    
    }

    static robotPreverTalon(hand, talon, room) {
        // TODO
        return RobotHard.robotPreverTalon(hand, talon, room);
    }

    static robotCall(hand) {
        // TODO
        return RobotHard.robotCall(hand);
    }

    static robotIOTE(hand) {
        // TODO
        return RobotHard.robotIOTE(hand);
    }

    static robotContra(hand) {
        // TODO
        return RobotHard.robotContra(hand);
    }

    static robotPovinnostBidaUniChoice(hand) {
        // TODO
        return RobotHard.robotPovinnostBidaUniChoice(hand);
    }

    static robotLead(hand, room) {
        // TODO
        return RobotHard.robotLead(hand, room);
    }

    static robotPlay(hand, room) {
        // TODO
        return RobotHard.robotPlay(hand, room);
    }
}

module.exports = RobotRuthless;