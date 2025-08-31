const GameManager = require('./GameManager');
const gm = GameManager.INSTANCE;

class AdminPanel {
    static shouldRestartServer = false;
    static reloadClients() {
        for (let i in gm.SOCKET_LIST) {
            gm.SOCKET_LIST[i].emit('reload');
        }
    }
    
    static setChallengeScore(username, points = 0, avatar = 0, wins = [0,0,0]) {
        gm.challenge.adminSetScore(username, points, avatar, wins);
    }

    static shutDown() {
        throw new Error("Shutting down the server NOW");
    }
}

module.exports = AdminPanel;
