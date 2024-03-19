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
            if (this._leaderboard[i].name.toLowerCase() == username.toLowerCase()) {
                this._retryLeaderboard.push({'name':username, 'score': points});
                return;
            }
        }
        this._leaderboard.push({'name':username, 'score': points});
        this._retryLeaderboard.push({'name':username, 'score': points});
    }

    static generateRandomNotationSequence() {
       let goodHandWeight = 0.8;
       let notation = '100/100/100/100/';
       let workingDeck = [];
       for (let i in baseDeck) {
           workingDeck[i] = baseDeck[i];
       }
       shuffleArray(workingDeck);
       for (let i in workingDeck) {
           workingDeck[i].weight = ((VALUE_REVERSE[workingDeck[i].value] + (workingDeck[i].value == 'I' ? 15 : 0)) * (workingDeck[i].suit == 'Trump' ? 3 : 1));
       }


       workingDeck.sort((a,b) => {
           if (Math.abs(0.5 - goodHandWeight) > Math.abs(0.5 - Math.random())) {
               return goodHandWeight < 0.5 ? a.weight - b.weight: b.weight - a.weight;
           }
           return 0;
       });

       for (let i in workingDeck) {
           delete workingDeck[i].weight;
       }

       let workingPN = Math.floor(Math.random() * 4);

       let mainHandNotation = Deck.cardsToNotation(workingDeck.splice(0,12)) + '/';
       let talonNotation = Deck.cardsToNotation(workingDeck.splice(0,6)) + '/';

       shuffleArray(workingDeck);

       for (let i=0; i<4; i++) {
           if (i != workingPN) {
               notation += Deck.cardsToNotation(workingDeck.splice(0,12)) + '/';
           } else {
               notation += mainHandNotation;
           }
       }
       notation += talonNotation;

       for (let i in this._settings) {
           notation += i + '=' + this._settings[i] + ';';
       }
       notation += 'pn=' + workingPN;
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