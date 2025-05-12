const Deck = require('./deck');

class GameManager {
    #returnToGame = {};
    #rooms = {};
    #players = {};
    #baseDeck = new Deck();
    #challenge;
    #SOCKET_LIST = {};

    static INSTANCE;

    constructor() {
        GameManager.INSTANCE = this;
    }

    get returnToGame() {
        return this.#returnToGame;
    }

    get rooms() {
        return this.#rooms;
    }

    get baseDeck() {
        return this.#baseDeck;
    }

    get challenge() {
        return this.#challenge;
    }

    get players() {
        return this.#players;
    }

    get SOCKET_LIST() {
        return this.#SOCKET_LIST;
    }

    set challenge(c) {
        this.#challenge = c;
    }
}

module.exports = GameManager;