const {DIFFICULTY, ROOM_TYPE} = require('../enums.js');
const Room = require('../room.js');
const Deck = require('../deck.js');
const SERVER = require('../logger.js');

let styles = ['1','2','3','4','6','12','345'];
let numsTo54 = [12,18,24,30,36,42];

const HEADER = '"1","2","3","4","6","12","345","Cut 12","Cut 18","Cut 24","Cut 30","Cut 36","Cut 42"';
let winnersMatrix = Array.from({ length: 4 }, () => Array(13).fill(0));

class ShuffleTest {
    constructor() {}

    initiateTest() {
        /*this.runTest();
        console.log(winnersMatrix);
        return;*/
        for (let i=0; i<10000; i++) {
            try {
                this.runTest();
                SERVER.error(i)
            } catch (ignore) {}
        }
        this.printWinners();
    }

    printWinners() {
        console.log(HEADER)
        console.log(winnersMatrix[0].join(','))
        console.log(winnersMatrix[1].join(','))
        console.log(winnersMatrix[2].join(','))
        console.log(winnersMatrix[3].join(','))
    }

    runTest() {
        let {deck, winner} = this.getPlayedDeck();
        //console.log(deck);
        //return;
        for (let i in styles) {
            let adeck = new Deck(deck);
            winnersMatrix[winner][i] += this.getScoreWithDeck(styles[i],32,adeck);
        }
        for (let i in numsTo54) {
            let adeck = new Deck(deck);
            winnersMatrix[winner][+i + 7] += this.getScoreWithDeck('Cut',numsTo54[i],adeck);
        }
    }


    getPlayedDeck() {
        let theSettings = {'difficulty':DIFFICULTY.RUTHLESS, 'timeout': 5, 'aceHigh':false, 'locked':true};
        let theRoom;
        {
            let i = 1;
            for (; rooms[i]; i++) { }
            rooms[i] = new Room({'name': i, 'settings': theSettings, 'roomType': ROOM_TYPE.TEST, 'stop': true});
            theRoom = rooms[i];
        }
        theRoom['playerCount'] = 4;

        theRoom.playToEnd();
        
        let deck = theRoom.deck;
        let winner = theRoom.winnerNum - theRoom.board.povinnost + 4;//Povinnost will always be 2
        winner %= 4;
        
        /*
        console.log('Players, Povinnost, WinnerNum, winner offset from pov')
        console.log(theRoom.players);
        console.log(theRoom.board.povinnost)
        console.log(theRoom.winnerNum)
        console.log(winner);
        */

        //Kill the room
        clearTimeout(rooms[theRoom.name].autoAction);
        delete rooms[theRoom.name];

        return {deck: deck, winner: winner};
    }

    getScoreWithDeck(cutChoice, cutLoc, deck) {
        let theSettings = {'difficulty':DIFFICULTY.RUTHLESS, 'timeout': 5, 'aceHigh':false, 'locked':true};
        let theRoom;
        {
            let i = 1;
            for (; rooms[i]; i++) { }
            rooms[i] = new Room({'name': i, 'settings': theSettings, 'roomType': ROOM_TYPE.TEST, 'botCutChoice': cutChoice, 'botCutLoc': cutLoc, 'deck': deck, 'povinnost': 0, 'started': true, 'stop': true});
            theRoom = rooms[i];
        }
        theRoom['playerCount'] = 4;
        theRoom.playToEnd();
        let chips = theRoom.players[2].chips;

        //Kill the room
        clearTimeout(rooms[theRoom.name].autoAction);
        delete rooms[theRoom.name];
        
        return chips;
    }
}

module.exports = ShuffleTest;