class GameManager {
    #returnToGame = {};
    #rooms = {};

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
}

module.exports = GameManager;