const GameManager = require('./GameManager');
const gm = GameManager.INSTANCE;

class AdminPanel {
    static shouldRestartServer = false;
    static reloadClients() {
        for (let i in gm.SOCKET_LIST) {
            gm.SOCKET_LIST[i].emit('reload');
        }
    }
    static printPlayerList(printToConsole) {
        const playerListObject = [];
        for (let i in gm.players) {
            if (printToConsole) {console.log('Player ' + i + ':');}
            playerListObject.push({});
            for (let p in gm.players[i]) {
                if (p != 'socket' && p != 'token') {
                    playerListObject[playerListObject.length - 1][p] = gm.players[i][p];
                    if (printToConsole) {
                        console.log('\t' + p + ': ' + gm.players[i][p]);
                    }
                }
            }
            //players[socketId] = { 'id': socketId, 'pid': -1, 'room': -1, 'pn': -1, 'socket': socket, 'roomsSeen': {}, tempDisconnect: false, username: 'Guest', token: -1 }
        }
        return playerListObject;
    }
    static printRoomsList(printToConsole) {
        const roomListObject = [];
        for (let i in gm.rooms) {
            if (printToConsole) {console.log('Room ' + i + ':');}
            roomListObject.push({});
            for (let r in gm.rooms[i]) {
                if (r != '_deck' && r != '_playerList' && r != '_players' && r != '_trainingGoal'
                        && r != '_settings' && r != '_audience' && r != '_board') {
                    //todo: players, audience, and board have useful information that needs to be extracted and sent
                    roomListObject[roomListObject.length - 1][r] = gm.rooms[i][r];
                    if (printToConsole) {
                        console.log('\t' + r + ': ' + gm.rooms[i][r]);
                    }
                }
            }
        }
        return roomListObject;
    }

    static shutDown() {
        throw new Error("Shutting down the server NOW");
    }
}

module.exports = AdminPanel;
