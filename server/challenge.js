const Deck = require('./deck.js');
const { DIFFICULTY, VALUE_REVERSE } = require('./enums.js');
const { shuffleArray } = require('./utils.js');
const GameManager = require('./GameManager.js');

const schedule = require('node-schedule');

let baseDeck = GameManager.INSTANCE.baseDeck.deck;

class Challenge {
    constructor() {
        this._leaderboard = {};
        this._retryLeaderboard = {};

        this._arrLead = [];
        this._arrRetryLead = [];

        this._settings = new Settings({'difficulty':DIFFICULTY.RUTHLESS, 'timeout': 0, 'aceHigh':false, 'locked':true});
        this._notation = Challenge.generateRandomNotationSequence();

    }

    get notation() {
        return this._notation;
    }

    get settings() {
        return this._settings;
    }

    get leaderboard() {
        if (Object.keys(this._leaderboard).length != this._arrLead.length) {
            this._arrLead = [];
            for (let i in this._leaderboard) {
                this._arrLead.push(this._leaderboard[i]);
            }
        }
        return this._arrLead.sort((a,b) => {return b.score - a.score;}).slice(0,10);
    }

    get retryLeaderboard() {
        if (Object.keys(this._retryLeaderboard).length != this._arrRetryLead.length) {
            this._arrRetryLead = [];
            for (let i in this._retryLeaderboard) {
                this._arrRetryLead.push(this._retryLeaderboard[i]);
            }
        }
        this._arrRetryLead = this._arrRetryLead.sort((a,b) => {return +b.score - +a.score;});
        let temp = [];
        for (let i=0; i<10 && i<this._arrRetryLead.length; i++) {
            temp[i] = this._arrRetryLead[i];
            temp.score = temp.score + ' (' + temp.tries + ')';
        }
        return temp;
    }

    getUserScore(username) {
        return this._leaderboard[username.toLowerCase()];
    }

    complete(username, points) {
        if (username == 'Guest') {
            //someone signed out while completing the challenge
            return;
        }
        if (!this._leaderboard[username.toLowerCase()]) {
            this._leaderboard[username.toLowerCase()] = {'name':username, 'score': points};
            this._retryLeaderboard[username.toLowerCase()] = {'name':username, 'score': points, 'tries': 1};
        } else {
            this._retryLeaderboard[username.toLowerCase()].tries += 1;
            if (+this._retryLeaderboard[username.toLowerCase()].score < points) {
                this._retryLeaderboard[username.toLowerCase()].score = points;
            }
        }
    }

    scheduleChallenge() {
        schedule.scheduleJob('0 0 * * *', () => {
            GameManager.INSTANCE.challenge = new Challenge();
            for (let i in GameManager.INSTANCE.players) {
                GameManager.INSTANCE.players[i].socket.emit('challengeOver');
            }
            for (let i in GameManager.INSTANCE.rooms) {
                if (i.substring(0,9) == 'challenge') {
                    clearTimeout(GameManager.INSTANCE.rooms[i].autoAction);
                    SERVER.log('Game Ended. Closing the room.',i);
                    delete GameManager.INSTANCE.rooms[i];
                }
            }
        })
    }

    static generateRandomNotationSequence() {
       let goodHandWeight = 0.7;
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

       for (let i in this._settings.object) {
           notation += i + '=' + this._settings.object[i] + ';';
       }
       notation += 'pn=' + workingPN;
       return notation;
   }
}

module.exports = Challenge;