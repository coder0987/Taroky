const Deck = require('./deck.js');
const {DIFFICULTY} = require('./enums.js');

let baseDeck = Deck.createDeck();

class Challenge {
    constructor() {
        this._leaderboard = [];
        this._retryLeaderboard = [];
        this._settings = {'difficulty':DIFFICULTY.RUTHLESS, 'timeout': 0, 'aceHigh':false, 'locked':true};
        this._notation = Challenge.generateRandomNotationSequence();

    }

    get notation() {
        return this._notation;
    }

    get settings() {
        return this._settings;
    }

    get leaderboard() {
        return this._leaderboard.sort((a,b) => {return b.score - a.score;}).slice(0,10);
    }

    get retryLeaderboard() {
        return this._retryLeaderboard.sort((a,b) => {return b.score - a.score;}).slice(0,10);
    }

    complete(username, points) {
        if (username == 'Guest') {
            //someone signed out while completing the challenge
            return;
        }
        for (let i in this._leaderboard) {
            if (this._leaderboard[i].name == username) {
                this._retryLeaderboard.push({'name':username, 'score': points});
                return;
            }
        }
        this._leaderboard.push({'name':username, 'score': points});
        this._retryLeaderboard.push({'name':username, 'score': points});
    }

    static generateRandomNotationSequence() {
        let notation = '100/100/100/100/';
        let workingDeck = [];
        for (let i in baseDeck) {
            workingDeck[i] = baseDeck[i];
        }
        shuffleArray(workingDeck);

        for (let i=0; i<4; i++) {
            notation += Deck.cardsToNotation(workingDeck.splice(0,12)) + '/';
        }

        let talonNotation = Deck.cardsToNotation(workingDeck.splice(0,6)) + '/';
        notation += talonNotation;

        for (let i in this._settings) {
            notation += i + '=' + this._settings[i] + ';';
        }
        notation += 'pn=' + Math.floor((4*Math.random()));
        return notation;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

module.exports = Challenge;