const Deck = require('./deck.js');
const { DIFFICULTY, VALUE_REVERSE } = require('./enums.js');
const { shuffleArray, shuffleArraySeeded, sfc32, cyrb128 } = require('./utils.js');
const GameManager = require('./GameManager.js');

const schedule = require('node-schedule');
const Settings = require('./Settings.js');
const Database = require('./database.js');

let baseDeck = GameManager.INSTANCE.baseDeck.deck;

class Challenge {
    static _settings = new Settings({'difficulty':DIFFICULTY.RUTHLESS, 'timeout': 0, 'aceHigh':false, 'locked':true});

    constructor() {
        this._leaderboard = {};

        this._arrLead = [];

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

    getUserScore(username) {
        return this._leaderboard[username.toLowerCase()];
    }

    complete(username, points, avatar, wins) {
        if (username == 'Guest') {
            //someone signed out while completing the challenge
            return;
        }
        if (!this._leaderboard[username.toLowerCase()]) {
            this._leaderboard[username.toLowerCase()] = {'name':username, 'score': points, 'avatar': avatar, 'wins': wins};
        }
    }

    scheduleChallenge() {
        schedule.scheduleJob('0 0 * * *', () => {
            // First, save the results from the current challenge

            if (GameManager.INSTANCE.challenge._leaderboard.length > 0) {
                const top = GameManager.INSTANCE.challenge.leaderboard;
                Database.updateChallengeWins(top[0]?.name, top[1]?.name, top[2]?.name);
            }

            // Then, create a new challenge
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
        // Seeded random generator using date (MM-DD-YYYY)
        const today = new Date();
        const dateSeed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        const seed = cyrb128(dateSeed);
        const rand = sfc32(seed[0], seed[1], seed[2], seed[3]);

        

        function seededRandom() {
            return rand();
        }

        const workingPN = Math.floor(seededRandom() * 4);

        // Replace all Math.random() and shuffleArray calls with seeded versions
        let goodHandWeight = 0.7;
        let notation = '100/100/100/100/';
        let workingDeck = structuredClone(baseDeck);

        shuffleArraySeeded(workingDeck, seededRandom);

        for (let i in workingDeck) {
            workingDeck[i].weight = ((VALUE_REVERSE[workingDeck[i].value] + (workingDeck[i].value == 'I' ? 15 : 0)) * (workingDeck[i].suit == 'Trump' ? 3 : 1));
        }

        workingDeck.sort((a, b) => {
            if (Math.abs(0.5 - goodHandWeight) > Math.abs(0.5 - seededRandom())) {
                const delta = goodHandWeight < 0.5 ? a.weight - b.weight : b.weight - a.weight;
                if (delta !== 0) return delta;
            }
            return seededRandom() < 0.5 ? -1 : 1;
        });

        for (let i in workingDeck) {
            delete workingDeck[i].weight;
        }

        let mainHandNotation = Deck.cardsToNotation(workingDeck.splice(0, 12)) + '/';
        let talonNotation = Deck.cardsToNotation(workingDeck.splice(0, 6)) + '/';

        shuffleArraySeeded(workingDeck, seededRandom);

        for (let i = 0; i < 4; i++) {
            if (i != workingPN) {
                notation += Deck.cardsToNotation(workingDeck.splice(0, 12)) + '/';
            } else {
                notation += mainHandNotation;
            }
        }
        notation += talonNotation;

        for (let i in Challenge._settings.object) {
            notation += i + '=' + Challenge._settings.object[i] + ';';
        }
        notation += 'pn=' + workingPN;
        return notation;
    }

}

module.exports = Challenge;